import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "..");
const repositories: string[] = [];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createReleaseRepository() {
  const directory = await mkdtemp(join(tmpdir(), "workbuddy release test "));
  repositories.push(directory);
  await mkdir(join(directory, "scripts"), { recursive: true });
  await mkdir(join(directory, "skills/flow-diagram/references"), { recursive: true });
  await mkdir(join(directory, "skills/flow-diagram/runtime"), { recursive: true });
  await writeFile(join(directory, "scripts/package-workbuddy-skill.mjs"),
    await readFile(join(root, "scripts/package-workbuddy-skill.mjs")));
  await writeFile(join(directory, "scripts/workbuddy-release.json"), JSON.stringify({
    display_name: "测试技能",
    display_name_en: "Test Skill",
    description_zh: "测试技能说明",
    description_en: "A test skill description",
    author: "test-author",
  }));
  await writeFile(join(directory, "package.json"), JSON.stringify({ version: "1.2.3" }));
  await writeFile(join(directory, "skills/flow-diagram/LICENSE"), "Test license.\n");
  await writeFile(join(directory, "skills/flow-diagram/SKILL.md"), [
    "---",
    "name: flow-diagram",
    "description: Test source description",
    "---",
    "# Test Skill",
    "",
    "[Guide](references/guide.md).",
    "",
  ].join("\n"));
  await writeFile(join(directory, "skills/flow-diagram/references/guide.md"), "Committed guide.\n");
  await writeFile(join(directory, "skills/flow-diagram/runtime/manifest.json"), JSON.stringify({ sdk: { version: "0.4.2" } }));

  execFileSync("git", ["init", "--quiet"], { cwd: directory });
  execFileSync("git", ["config", "user.name", "Release Test"], { cwd: directory });
  execFileSync("git", ["config", "user.email", "release-test@example.invalid"], { cwd: directory });
  execFileSync("git", ["add", "."], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "test release candidate"], { cwd: directory });
  return directory;
}

function runPackager(directory: string, output: string, extraArgs: string[] = []) {
  return spawnSync(process.execPath, [join(directory, "scripts/package-workbuddy-skill.mjs"), ...extraArgs, "--output", output], {
    cwd: directory,
    encoding: "utf8",
  });
}

function readStoredZipEntries(zip: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const size = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = zip.toString("utf8", nameStart, nameStart + nameLength);
    entries.set(name, zip.subarray(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return entries;
}

test("WorkBuddy package is built from a clean committed installation tree", async () => {
  const directory = await createReleaseRepository();
  const output = join(directory, "output");
  const result = runPackager(directory, output);
  expect(result.status, result.stderr).toBe(0);

  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  const candidate = execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
  const zip = await readFile(join(output, manifest.package));
  const entries = readStoredZipEntries(zip);
  expect(manifest.candidateCommit).toBe(candidate);
  expect(manifest.sha256).toBe(createHash("sha256").update(zip).digest("hex"));
  expect(manifest.sizeBytes).toBe(zip.length);
  expect(manifest.fileCount).toBe(entries.size);
  const packagerHash = createHash("sha256")
    .update(await readFile(join(directory, "scripts/package-workbuddy-skill.mjs")))
    .digest("hex");
  expect(manifest.packagerSha256).toBe(packagerHash);
  expect([...entries.keys()].sort()).toEqual([
    "flow-diagram/SKILL.md",
    "flow-diagram/LICENSE",
    "flow-diagram/references/guide.md",
    "flow-diagram/runtime/manifest.json",
  ].sort());
  expect(entries.get("flow-diagram/references/guide.md")?.toString()).toBe("Committed guide.\n");
  expect(await readFile(join(output, "SKILL.md"), "utf8")).toBe(entries.get("flow-diagram/SKILL.md")?.toString());
  expect(entries.get("flow-diagram/SKILL.md")?.toString()).toContain("[Guide](references/guide.md). @references/guide.md");
  expect(await readFile(join(directory, "skills/flow-diagram/SKILL.md"), "utf8")).toContain("[Guide](references/guide.md).");
});

test("WorkBuddy package rejects untracked files in the install unit", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, "skills/flow-diagram/unreviewed.txt"), "Unreviewed content.\n");
  const output = join(directory, "output");
  const result = runPackager(directory, output);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("skills/flow-diagram/unreviewed.txt");
  expect(existsSync(join(output, "flow-diagram-skill-1.2.3.zip"))).toBe(false);
});

test("WorkBuddy package rejects modified tracked files in the install unit", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, "skills/flow-diagram/references/guide.md"), "Modified content.\n");
  const result = runPackager(directory, join(directory, "output"));

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("skills/flow-diagram/references/guide.md");
});

test("WorkBuddy package allows unrelated working-tree edits outside its release inputs", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, "README.md"), "Unrelated working copy change.\n");
  const output = join(directory, "output");
  const result = runPackager(directory, output);

  expect(result.status, result.stderr).toBe(0);
  expect(await readFile(join(output, "release-manifest.json"), "utf8")).toContain("candidateCommit");
});

test("WorkBuddy package rejects changed release metadata inputs", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, "scripts/workbuddy-release.json"), JSON.stringify({ author: "unconfirmed-author" }));
  const result = runPackager(directory, join(directory, "output"));

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("scripts/workbuddy-release.json");
});

test("WorkBuddy package allows comment-only release-config edits", async () => {
  const directory = await createReleaseRepository();
  const configPath = join(directory, "scripts/workbuddy-release.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  await writeFile(configPath, JSON.stringify({ ...config, $comment: "Updated maintenance note." }));
  const result = runPackager(directory, join(directory, "output"));

  expect(result.status, result.stderr).toBe(0);
});

test("WorkBuddy package version remains authoritative over the config", async () => {
  const directory = await createReleaseRepository();
  const configPath = join(directory, "scripts/workbuddy-release.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  await writeFile(configPath, JSON.stringify({ ...config, version: "9.9.9" }));
  execFileSync("git", ["add", "scripts/workbuddy-release.json"], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "set conflicting release version"], { cwd: directory });
  const output = join(directory, "output");
  const result = runPackager(directory, output);

  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  const entries = readStoredZipEntries(await readFile(join(output, manifest.package)));
  expect(manifest.skillDistributionVersion).toBe("1.2.3");
  expect(entries.get("flow-diagram/SKILL.md")?.toString()).toContain('version: "1.2.3"');
});

test("WorkBuddy package rejects a config skill name that differs from the install unit", async () => {
  const directory = await createReleaseRepository();
  const configPath = join(directory, "scripts/workbuddy-release.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  await writeFile(configPath, JSON.stringify({ ...config, name: "other-skill" }));
  execFileSync("git", ["add", "scripts/workbuddy-release.json"], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "set conflicting skill name"], { cwd: directory });
  const result = runPackager(directory, join(directory, "output"));

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("release config name must match source Skill name: flow-diagram");
});

test("WorkBuddy package uses an explicit version without reading a dirty package.json", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, "package.json"), JSON.stringify({ version: "9.9.9" }));
  const output = join(directory, "output");
  const result = runPackager(directory, output, ["--version", "2.0.0"]);

  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8")).skillDistributionVersion).toBe("2.0.0");
});

test("WorkBuddy package rejects a version that could escape the output directory", async () => {
  const directory = await createReleaseRepository();
  const output = join(directory, "output");
  const result = runPackager(directory, output, ["--version", "../../escape"]);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("version must be a valid semantic version");
  expect(existsSync(join(directory, "escape.zip"))).toBe(false);
});

test("WorkBuddy package rejects ignored, untracked metadata configs", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, ".gitignore"), "ignored-config.json\n");
  execFileSync("git", ["add", ".gitignore"], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "ignore local release config"], { cwd: directory });
  const config = join(directory, "ignored-config.json");
  await writeFile(config, JSON.stringify({ author: "untracked-author" }));
  const result = spawnSync(process.execPath, [join(directory, "scripts/package-workbuddy-skill.mjs"), "--config", config,
    "--output", join(directory, "output")], { cwd: directory, encoding: "utf8" });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("must be committed");
});

test("WorkBuddy package rejects symlinks in the committed install tree", async () => {
  const directory = await createReleaseRepository();
  const guide = join(directory, "skills/flow-diagram/references/guide.md");
  await rm(guide);
  await writeFile(join(directory, "README.md"), "External link target.\n");
  await symlink("../../../README.md", guide);
  execFileSync("git", ["add", "-A"], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "add install symlink"], { cwd: directory });
  const result = runPackager(directory, join(directory, "output"));

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("symlink");
  expect(result.stderr).toContain("skills/flow-diagram/references/guide.md");
});
