import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const REPOSITORIES: string[] = [];
const NOTES = "## 中文\n\n发布说明。\n\n## English\n\nRelease notes.\n";

afterEach(async () => {
  await Promise.all(REPOSITORIES.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function git(directory: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
}

async function createRepository() {
  const directory = await mkdtemp(join(tmpdir(), "github release test "));
  REPOSITORIES.push(directory);
  await mkdir(join(directory, "scripts"));
  await mkdir(join(directory, "docs/releases"), { recursive: true });
  await mkdir(join(directory, "skills/flow-diagram/runtime"), { recursive: true });
  await mkdir(join(directory, "skills/flow-diagram/scripts"));
  await writeFile(join(directory, "scripts/package-github-skill.mjs"),
    await readFile(join(ROOT, "scripts/package-github-skill.mjs")));
  await writeFile(join(directory, "scripts/verify-github-package.mjs"),
    await readFile(join(ROOT, "scripts/verify-github-package.mjs")));
  await writeFile(join(directory, "package.json"), '{"version":"1.2.3"}');
  await writeFile(join(directory, "docs/releases/v1.2.3.md"), NOTES);
  await writeFile(join(directory, "skills/flow-diagram/SKILL.md"), "---\nname: flow-diagram\ndescription: Test skill\n---\n");
  await writeFile(join(directory, "skills/flow-diagram/LICENSE"), "Test license.\n");
  await writeFile(join(directory, "skills/flow-diagram/runtime/manifest.json"), '{"sdk":{"version":"0.4.2"}}');
  await writeFile(join(directory, "skills/flow-diagram/runtime/package-lock.json"), "{}\n");
  await writeFile(join(directory, "skills/flow-diagram/scripts/flowsvg.mjs"), "console.log('test fixture');\n");
  git(directory, "init", "--quiet", "--initial-branch=main");
  git(directory, "config", "user.name", "Release Test");
  git(directory, "config", "user.email", "release-test@example.invalid");
  git(directory, "add", ".");
  git(directory, "commit", "--quiet", "-m", "release candidate");
  git(directory, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(directory, "tag", "-a", "v1.2.3", "-m", "Release 1.2.3");
  return directory;
}

function runPackage(directory: string, ...args: string[]) {
  return spawnSync(process.execPath, ["scripts/package-github-skill.mjs", "--tag", "v1.2.3", ...args], {
    cwd: directory, encoding: "utf8",
  });
}

function commitCandidate(directory: string) {
  git(directory, "add", ".");
  git(directory, "commit", "--quiet", "-m", "update candidate");
  git(directory, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(directory, "tag", "--force", "v1.2.3");
}

test("GitHub release preflight accepts an annotated stable tag on main with bilingual committed notes", async () => {
  const directory = await createRepository();
  const result = runPackage(directory, "--check");
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: "ready", tag: "v1.2.3", version: "1.2.3", commit: git(directory, "rev-parse", "HEAD"),
  });
  expect(existsSync(join(directory, "outputs"))).toBe(false);
});

test("GitHub package verification rejects changed ZIP bytes before executing the installed CLI", async () => {
  const directory = await createRepository();
  const output = join(directory, "output");
  expect(runPackage(directory, "--output", output).status).toBe(0);
  await writeFile(join(output, "flow-diagram-skill-1.2.3.zip"), "corrupted zip");
  const result = spawnSync(process.execPath, ["scripts/verify-github-package.mjs", "--tag", "v1.2.3", "--directory", output], {
    cwd: directory, encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("checksum");
});

test("GitHub package verification completes the real extracted installation through finalize", async () => {
  const directory = await createRepository();
  await rm(join(directory, "skills/flow-diagram"), { recursive: true });
  await cp(join(ROOT, "skills/flow-diagram"), join(directory, "skills/flow-diagram"), { recursive: true });
  commitCandidate(directory);
  const output = join(directory, "output");
  const built = runPackage(directory, "--output", output);
  expect(built.status, built.stderr).toBe(0);
  const result = spawnSync(process.execPath, ["scripts/verify-github-package.mjs", "--tag", "v1.2.3", "--directory", output], {
    cwd: directory, encoding: "utf8", timeout: 180_000,
  });
  expect(result.status, result.stderr).toBe(0);
  const evidence = JSON.parse(await readFile(join(output, "verification.json"), "utf8"));
  expect(evidence).toMatchObject({ status: "passed", author: "delivered", finalize: "delivered", actualViewing: "not-performed" });
}, 180_000);

test("GitHub release rejects a symbolic link before writing any output", async () => {
  const directory = await createRepository();
  await symlink("LICENSE", join(directory, "skills/flow-diagram/linked-license"));
  commitCandidate(directory);
  const output = join(directory, "output");
  const result = runPackage(directory, "--output", output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("regular installation file");
  expect(existsSync(output)).toBe(false);
});

test("GitHub release rejects an output directory inside the installation source", async () => {
  const directory = await createRepository();
  const output = join(directory, "skills/flow-diagram/output");
  const result = runPackage(directory, "--output", output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("output directory");
  expect(existsSync(output)).toBe(false);
});

test("GitHub release rejects an incomplete installation unit before packaging", async () => {
  const directory = await createRepository();
  await rm(join(directory, "skills/flow-diagram/LICENSE"));
  commitCandidate(directory);
  const output = join(directory, "output");
  const result = runPackage(directory, "--output", output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("LICENSE");
  expect(existsSync(output)).toBe(false);
});

test.each(["v1.2.3-beta.1", "v01.2.3", "1.2.3", "v1.2.4"])("GitHub preflight rejects invalid or mismatched version %s", async (tag) => {
  const directory = await createRepository();
  if (tag.startsWith("v")) git(directory, "tag", tag);
  const result = runPackage(directory, "--tag", tag, "--check");
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/stable vX.Y.Z|tag version must match/);
});

test.each(["missing", "empty English"])("GitHub preflight rejects %s release notes even if repaired locally", async (condition) => {
  const directory = await createRepository();
  const notes = join(directory, "docs/releases/v1.2.3.md");
  if (condition === "missing") await rm(notes);
  else await writeFile(notes, "## 中文\n\n发布说明。\n\n## English\n\n");
  commitCandidate(directory);
  await writeFile(notes, NOTES);
  const result = runPackage(directory, "--check");
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("docs/releases/v1.2.3.md");
});

test("GitHub preflight rejects a tag outside main history", async () => {
  const directory = await createRepository();
  await writeFile(join(directory, "feature.txt"), "feature candidate");
  git(directory, "add", ".");
  git(directory, "commit", "--quiet", "-m", "unmerged feature");
  git(directory, "tag", "--force", "v1.2.3");
  expect(runPackage(directory, "--check").status).not.toBe(0);
});

test("GitHub preflight rejects a tag pointing at a different commit from HEAD", async () => {
  const directory = await createRepository();
  await writeFile(join(directory, "later.txt"), "later commit");
  git(directory, "add", ".");
  git(directory, "commit", "--quiet", "-m", "later work");
  git(directory, "update-ref", "refs/remotes/origin/main", "HEAD");
  const result = runPackage(directory, "--check");
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("HEAD must match");
});

test("GitHub package preserves committed Skill bytes and excludes repository files and local changes", async () => {
  const directory = await createRepository();
  await mkdir(join(directory, "skills/flow-diagram/examples"));
  const binary = Buffer.from([0, 255, 13, 10, 128]);
  await writeFile(join(directory, "skills/flow-diagram/examples/data.bin"), binary);
  git(directory, "add", ".");
  git(directory, "commit", "--quiet", "-m", "add binary resource");
  git(directory, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(directory, "tag", "--force", "v1.2.3");
  await writeFile(join(directory, "skills/flow-diagram/examples/private.txt"), "Uncommitted private input.");
  await writeFile(join(directory, "skills/flow-diagram/LICENSE"), "Uncommitted change.");
  const output = join(directory, "output with spaces");
  const result = runPackage(directory, "--output", output);
  expect(result.status, result.stderr).toBe(0);
  const archive = join(output, "flow-diagram-skill-1.2.3.zip");
  const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => !name.endsWith("/"));
  expect(entries.sort()).toEqual([
    "flow-diagram/LICENSE", "flow-diagram/SKILL.md", "flow-diagram/examples/data.bin",
    "flow-diagram/runtime/manifest.json", "flow-diagram/runtime/package-lock.json", "flow-diagram/scripts/flowsvg.mjs",
  ]);
  expect(execFileSync("unzip", ["-p", archive, "flow-diagram/examples/data.bin"])).toEqual(binary);
  expect(execFileSync("unzip", ["-p", archive, "flow-diagram/LICENSE"], { encoding: "utf8" })).toBe("Test license.\n");
  expect(await readFile(join(output, "release-notes.md"), "utf8")).toBe(NOTES);
  const sha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
  expect(await readFile(join(output, "SHA256SUMS"), "utf8")).toBe(`${sha256}  flow-diagram-skill-1.2.3.zip\n`);
});
