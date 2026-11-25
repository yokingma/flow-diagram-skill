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
  expect(manifest.releaseInputs).toMatchObject({ source: "working-tree", hasUncommittedChanges: false, changes: [] });
  const inputFiles = manifest.releaseInputs.files as Array<{ path: string; sizeBytes: number; sha256: string }>;
  for (const input of inputFiles) {
    const data = await readFile(join(directory, input.path));
    expect(input.sizeBytes).toBe(data.length);
    expect(input.sha256).toBe(createHash("sha256").update(data).digest("hex"));
  }
  expect(manifest.releaseInputs.sha256).toBe(createHash("sha256").update(JSON.stringify(inputFiles)).digest("hex"));
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

test("WorkBuddy packages new and modified working files, omits deleted files and ignores local caches", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, ".gitignore"), "skills/flow-diagram/cache/\n");
  await mkdir(join(directory, "skills/flow-diagram/cache"));
  await writeFile(join(directory, "skills/flow-diagram/cache/local.txt"), "Private cache.\n");
  await writeFile(join(directory, "skills/flow-diagram/new.txt"), "New content.\n");
  await writeFile(join(directory, "skills/flow-diagram/references/guide.md"), "Modified content.\n");
  await rm(join(directory, "skills/flow-diagram/LICENSE"));
  const output = join(directory, "output");
  const result = runPackager(directory, output);
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  const entries = readStoredZipEntries(await readFile(join(output, manifest.package)));
  expect(entries.get("flow-diagram/new.txt")?.toString()).toBe("New content.\n");
  expect(entries.get("flow-diagram/references/guide.md")?.toString()).toBe("Modified content.\n");
  expect(entries.has("flow-diagram/LICENSE")).toBe(false);
  expect([...entries.keys()].some((path) => path.includes("cache"))).toBe(false);
  expect(manifest.releaseInputs.hasUncommittedChanges).toBe(true);
  expect(manifest.releaseInputs.changes).toEqual(expect.arrayContaining([
    { status: "??", path: "skills/flow-diagram/new.txt" },
    { status: " M", path: "skills/flow-diagram/references/guide.md" },
    { status: " D", path: "skills/flow-diagram/LICENSE" },
  ]));
  for (const sourcePath of ["new.txt", "references/guide.md"]) {
    expect(manifest.releaseInputs.files).toContainEqual(expect.objectContaining({
      path: `skills/flow-diagram/${sourcePath}`,
      sha256: createHash("sha256").update(await readFile(join(directory, "skills/flow-diagram", sourcePath))).digest("hex"),
    }));
  }
});

test("WorkBuddy ignores unrelated working-tree edits when reporting release input changes", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, "README.md"), "Unrelated working copy change.\n");
  const output = join(directory, "output");
  const result = runPackager(directory, output);
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  expect(manifest.releaseInputs.hasUncommittedChanges).toBe(false);
  expect(manifest.releaseInputs.files.some((file: { path: string }) => file.path === "README.md")).toBe(false);
});

test("WorkBuddy packages uncommitted metadata and reports its actual identity without changing Git state", async () => {
  const directory = await createReleaseRepository();
  const configPath = join(directory, "scripts/workbuddy-release.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  await writeFile(configPath, JSON.stringify({ ...config, examples_zh: ["案例一", "案例二"], examples_en: ["Example one", "Example two"] }));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" });
  const before = execFileSync("git", ["status", "--porcelain"], { cwd: directory, encoding: "utf8" });
  const output = join(tmpdir(), `release-metadata-${directory.split(/[\\/]/).pop()}`);
  repositories.push(output);
  const result = runPackager(directory, output);
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  const entries = readStoredZipEntries(await readFile(join(output, manifest.package)));
  expect(entries.get("flow-diagram/SKILL.md")?.toString()).toContain('examples_zh:\n- "案例一"\n- "案例二"');
  expect(manifest.releaseInputs.hasUncommittedChanges).toBe(true);
  expect(manifest.releaseInputs.changes).toContainEqual({ status: " M", path: "scripts/workbuddy-release.json" });
  expect(manifest.releaseInputs.files).toContainEqual(expect.objectContaining({
    path: "scripts/workbuddy-release.json", sha256: createHash("sha256").update(await readFile(configPath)).digest("hex"),
  }));
  expect(execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" })).toBe(head);
  expect(execFileSync("git", ["status", "--porcelain"], { cwd: directory, encoding: "utf8" })).toBe(before);
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

test.each([false, true])("WorkBuddy packages a new explicit config and records its identity (ignored: %s)", async (ignored) => {
  const directory = await createReleaseRepository();
  const config = JSON.parse(await readFile(join(directory, "scripts/workbuddy-release.json"), "utf8"));
  if (ignored) {
    await mkdir(join(directory, ".local-release"));
    await writeFile(join(directory, ".gitignore"), ".local-release/\n");
  }
  const configFile = ignored ? ".local-release/new-config.json" : "new-config.json";
  const configPath = join(directory, configFile);
  await writeFile(configPath, JSON.stringify({ ...config, author: "selected-author" }));
  const output = join(directory, "output");
  const result = runPackager(directory, output, ["--config", configPath]);
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  expect(manifest.releaseInputs.hasUncommittedChanges).toBe(true);
  expect(manifest.releaseInputs.changes).toContainEqual({ status: ignored ? "!!" : "??", path: configFile });
  expect(await readFile(join(output, "SKILL.md"), "utf8")).toContain('author: "selected-author"');
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

test("WorkBuddy preserves flat example paths, Markdown and provenance bytes", async () => {
  const directory = await createReleaseRepository();
  const skill = join(directory, "skills/flow-diagram");
  await mkdir(join(skill, "examples"));
  await mkdir(join(skill, "resources"));
  const diagram = '{"version":1,"nodes":[],"edges":[],"scenes":[]}\n';
  const note = "[JSON](complete-story.json) · [Guide](../references/guide.md#run)\n";
  const index = '[Story](complete-story.md)\nnode "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/complete-story.json"\n';
  const sources = JSON.stringify([
    { kind: "prompt", reference: "Fixture", scope: "examples/complete-story.json", description: "Keep source identity." },
  ]);
  await Promise.all([
    writeFile(join(skill, "examples/complete-story.json"), diagram),
    writeFile(join(skill, "examples/complete-story.md"), note),
    writeFile(join(skill, "examples/README.md"), index),
    writeFile(join(skill, "resources/teaching-sources.json"), sources),
    writeFile(join(skill, "references/guide.md"), "[Story](../examples/complete-story.md#purpose)\n"),
  ]);
  execFileSync("git", ["add", "skills"], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "add flat teaching examples"], { cwd: directory });
  const output = join(directory, "output");
  const result = runPackager(directory, output);
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  const entries = readStoredZipEntries(await readFile(join(output, manifest.package)));
  expect([...entries.keys()].filter((path) => path.split("/").length > 3)).toEqual([]);
  for (const file of manifest.files as Array<{ path: string; sourcePath: string }>) {
    expect(file.path).toBe(`flow-diagram/${file.sourcePath}`);
    if (file.sourcePath === "SKILL.md") continue;
    expect(entries.get(file.path)).toEqual(await readFile(join(skill, file.sourcePath)));
  }
  expect(entries.get("flow-diagram/examples/complete-story.json")?.toString()).toBe(diagram);
  expect(entries.get("flow-diagram/examples/complete-story.md")?.toString()).toBe(note);
  expect(entries.get("flow-diagram/examples/README.md")?.toString()).toBe(index);
  expect(entries.get("flow-diagram/resources/teaching-sources.json")?.toString()).toBe(sources);
});

test("WorkBuddy rejects nested source directories before writing release outputs", async () => {
  const directory = await createReleaseRepository();
  const examples = join(directory, "skills/flow-diagram/examples");
  await mkdir(join(examples, "complete"), { recursive: true });
  await writeFile(join(examples, "complete/story.json"), "{}\n");
  execFileSync("git", ["add", "skills"], { cwd: directory });
  execFileSync("git", ["commit", "--quiet", "-m", "add unsupported nested source"], { cwd: directory });
  const output = join(directory, "output");
  const result = runPackager(directory, output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("directory depth");
  expect(result.stderr).toContain("examples/complete/story.json");
  expect(existsSync(output)).toBe(false);
});

test("WorkBuddy uses an uncommitted default package version and records changed packager input", async () => {
  const directory = await createReleaseRepository();
  await writeFile(join(directory, "package.json"), JSON.stringify({ version: "2.3.4" }));
  const script = join(directory, "scripts/package-workbuddy-skill.mjs");
  await writeFile(script, (await readFile(script, "utf8")) + "\n// Local build input.\n");
  const output = join(directory, "output");
  const result = runPackager(directory, output);
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(await readFile(join(output, "release-manifest.json"), "utf8"));
  expect(manifest.skillDistributionVersion).toBe("2.3.4");
  expect(manifest.releaseInputs.changes).toEqual(expect.arrayContaining([
    { status: " M", path: "package.json" },
    { status: " M", path: "scripts/package-workbuddy-skill.mjs" },
  ]));
});

test.each(["examples_zh", "examples_en"])("WorkBuddy enforces the three-example limit for %s", async (field) => {
  const directory = await createReleaseRepository();
  const configPath = join(directory, "scripts/workbuddy-release.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  await writeFile(configPath, JSON.stringify({ ...config, [field]: ["One", "Two", "Three"] }));
  const output = join(directory, "output");
  const accepted = runPackager(directory, output);
  expect(accepted.status, accepted.stderr).toBe(0);
  await rm(output, { recursive: true });
  await writeFile(configPath, JSON.stringify({ ...config, [field]: ["One", "Two", "Three", "Four"] }));
  const rejected = runPackager(directory, output);
  expect(rejected.status).not.toBe(0);
  expect(rejected.stderr).toContain(`${field} supports at most 3 examples`);
  expect(existsSync(output)).toBe(false);
});

test("WorkBuddy rejects an output directory inside the installation source", async () => {
  const directory = await createReleaseRepository();
  const output = join(directory, "skills/flow-diagram/output");
  const result = runPackager(directory, output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("output directory");
  expect(existsSync(output)).toBe(false);
});
