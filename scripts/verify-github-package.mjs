#!/usr/bin/env node
/**
 * Verify the final generic ZIP, then exercise its extracted public CLI in isolation.
 * Compare archive membership and bytes with the tag, including generic SKILL.md.
 * Record checksum/doctor/author/finalize evidence; this performs no visual review.
 * Requires Git, unzip and npm. Its temporary installation is removed on completion.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_OUTPUT = 32 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 180_000;

function execute(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8", maxBuffer: MAX_OUTPUT, timeout: COMMAND_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"], ...options,
  });
}

function verifyArchive(candidate, directory, temporary) {
  const name = `flow-diagram-skill-${candidate.version}.zip`;
  const archive = join(directory, name);
  const sha256 = createHash("sha256").update(readFileSync(archive)).digest("hex");
  assert.equal(readFileSync(join(directory, "SHA256SUMS"), "utf8"), `${sha256}  ${name}\n`, "archive checksum mismatch");
  const files = execute("git", ["-C", REPO_ROOT, "ls-tree", "-r", "--name-only", "-z",
    `${candidate.commit}:skills/flow-diagram`]).split("\0").filter(Boolean);
  const names = execute("unzip", ["-Z1", archive]).trim().split("\n").filter((name) => !name.endsWith("/"));
  assert.deepEqual(names.sort(), files.map((file) => `flow-diagram/${file}`).sort(), "archive membership differs from tag");
  execute("unzip", ["-q", archive, "-d", temporary]);
  for (const file of files) {
    const extracted = join(temporary, "flow-diagram", file);
    assert.ok(lstatSync(extracted).isFile(), `extracted resource must be a regular file: ${file}`);
    const source = execFileSync("git", ["-C", REPO_ROOT, "show", `${candidate.commit}:skills/flow-diagram/${file}`], { maxBuffer: MAX_OUTPUT });
    assert.deepEqual(readFileSync(extracted), source, `archive content differs from tag: ${file}`);
  }
  return { sha256, files: files.length };
}

function exerciseInstallation(temporary) {
  const skill = join(temporary, "flow-diagram");
  const consumer = join(temporary, "consumer");
  const workspace = join(consumer, ".diagrams/.work/release-check/package");
  mkdirSync(consumer);
  const env = { ...process.env, FLOWSVG_CACHE_DIR: join(temporary, "cache") };
  const command = (...args) => JSON.parse(execute(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], { cwd: consumer, env }));
  const doctor = command("doctor");
  const author = command("author", "--input", join(skill, "examples/complete-project-architecture.json"),
    "--name", "release-check", "--output", join(workspace, "history"), "--browser", "none", "--svg");
  assert.equal(author.completion.delivery, "complete");
  assert.deepEqual([...author.completion.completed].sort(), ["html", "json", "svg"]);
  const finalized = command("finalize", "--workspace", workspace, "--name", "release-check");
  assert.equal(finalized.status, "delivered");
  for (const name of ["diagram.json", "diagram.html", "diagram.svg", "report.json", "report.md"]) {
    assert.ok(readFileSync(join(finalized.directory, name)).length > 0, `missing delivered ${name}`);
  }
  return { doctor: doctor.status, author: author.status, finalize: finalized.status };
}

const evidence = { status: "failed", actualViewing: "not-performed" };
let temporary;
let directory;
try {
  const { values } = parseArgs({ options: { tag: { type: "string" }, directory: { type: "string" } } });
  assert.ok(values.tag && values.directory, "--tag and --directory are required");
  directory = resolve(values.directory);
  const candidate = JSON.parse(execute(process.execPath, [join(REPO_ROOT, "scripts/package-github-skill.mjs"), "--tag", values.tag, "--check"]));
  temporary = realpathSync(mkdtempSync(join(tmpdir(), "github-skill-verification-")));
  Object.assign(evidence, { tag: candidate.tag, commit: candidate.commit }, verifyArchive(candidate, directory, temporary));
  Object.assign(evidence, exerciseInstallation(temporary), { status: "passed" });
} catch (error) {
  evidence.reason = error.message;
  console.error(`verify-github-package: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
  if (directory) writeFileSync(join(directory, "verification.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence));
}
