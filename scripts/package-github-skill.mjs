#!/usr/bin/env node
/**
 * Build a generic Skill release from an exact stable tag, never from working files.
 * Preflight requires HEAD to equal the tag, origin/main ancestry, the matching
 * package version and committed bilingual notes. --check writes no artifacts.
 * WorkBuddy metadata adaptation belongs to its independent packager.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const REPO_ROOT = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const STABLE_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_GIT_OUTPUT = 32 * 1024 * 1024;
const REQUIRED_INSTALLATION_FILES = [
  "SKILL.md", "LICENSE", "scripts/flowsvg.mjs", "runtime/manifest.json", "runtime/package-lock.json",
];

function git(...args) {
  return execFileSync("git", ["-C", REPO_ROOT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readCommittedFile(commit, path) {
  return execFileSync("git", ["-C", REPO_ROOT, "show", `${commit}:${path}`], { maxBuffer: MAX_GIT_OUTPUT });
}

function readCandidate(tag) {
  assert.ok(typeof tag === "string" && STABLE_TAG.test(tag), "tag must be a stable vX.Y.Z version");
  const commit = git("rev-parse", `refs/tags/${tag}^{commit}`);
  assert.equal(commit, git("rev-parse", "HEAD"), "HEAD must match the release tag");
  git("merge-base", "--is-ancestor", commit, "refs/remotes/origin/main");
  const version = JSON.parse(git("show", `${commit}:package.json`)).version;
  assert.equal(tag, `v${version}`, "tag version must match package.json");
  const notesPath = `docs/releases/${tag}.md`;
  const notes = readCommittedFile(commit, notesPath).toString("utf8");
  for (const language of ["中文", "English"]) {
    const section = notes.match(new RegExp(`^## ${language}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m"));
    assert.ok(section?.[1].trim(), `${notesPath} must contain a nonempty ## ${language} section`);
  }
  const tree = git("ls-tree", "-r", "-z", commit, "--", "skills/flow-diagram");
  const entries = tree.split("\0").filter(Boolean);
  for (const entry of entries) {
    assert.match(entry, /^100(?:644|755) blob /, `expected a regular installation file: ${entry}`);
  }
  const paths = new Set(entries.map((entry) => entry.slice(entry.indexOf("\t") + 1)));
  for (const file of REQUIRED_INSTALLATION_FILES) {
    assert.ok(paths.has(`skills/flow-diagram/${file}`), `installation unit is missing ${file}`);
  }
  return { tag, version, commit, notesPath };
}

/** Canonicalize existing ancestors so symlink aliases cannot write into sources. */
function outputDirectory(path) {
  const pending = [];
  let ancestor = resolve(path);
  while (!existsSync(ancestor)) {
    pending.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
  const output = resolve(realpathSync(ancestor), ...pending);
  const source = join(REPO_ROOT, "skills/flow-diagram");
  assert.ok(output !== source && !output.startsWith(source + sep), "output directory must be outside the installation source");
  return output;
}

function buildPackage(candidate, output) {
  const archiveName = `flow-diagram-skill-${candidate.version}.zip`;
  const archive = execFileSync("git", ["-C", REPO_ROOT, "archive", "--format=zip", "--prefix=flow-diagram/",
    `${candidate.commit}:skills/flow-diagram`], { maxBuffer: MAX_GIT_OUTPUT });
  const sha256 = createHash("sha256").update(archive).digest("hex");
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, archiveName), archive);
  writeFileSync(join(output, "SHA256SUMS"), `${sha256}  ${archiveName}\n`);
  writeFileSync(join(output, "release-notes.md"), readCommittedFile(candidate.commit, candidate.notesPath));
  return { archive: join(output, archiveName), sha256 };
}

try {
  const { values } = parseArgs({ options: {
    tag: { type: "string" }, check: { type: "boolean" }, output: { type: "string" },
  } });
  const candidate = readCandidate(values.tag);
  const output = outputDirectory(values.output ?? join(REPO_ROOT, "outputs/github-release", candidate.version));
  const artifacts = values.check ? {} : buildPackage(candidate, output);
  console.log(JSON.stringify({ status: values.check ? "ready" : "built", ...candidate, ...artifacts }));
} catch (error) {
  console.error(`package-github-skill: ${error.message}`);
  process.exitCode = 1;
}
