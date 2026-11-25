#!/usr/bin/env node
/**
 * Build the WorkBuddy platform release package for the installed Flow Diagram Skill.
 *
 * The source install unit (skills/flow-diagram/) keeps its generic-host SKILL.md
 * frontmatter by contract (docs/releasing.md §5.1). This tool produces a release
 * copy: it injects the WorkBuddy-required frontmatter fields from
 * scripts/workbuddy-release.json, packages the unit as a deterministic zip whose
 * root is `flow-diagram/`. Source paths must already fit WorkBuddy's
 * root/subdirectory/file limit; deeper paths fail before output creation.
 * Resource paths and bytes are preserved; only SKILL.md metadata and reference
 * directives are adapted. The manifest records paths, commit, sizes and sha256.
 * Inputs come from one in-memory working-tree snapshot. The manifest records
 * per-input hashes and uncommitted state; candidateCommit is the Git baseline.
 * It never modifies source files, the Git index or commit history.
 *
 * Usage: node scripts/package-workbuddy-skill.mjs [--config <json>] [--output <dir>]
 *        [--version <x.y.z>] [--skill-dir <path>]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const defaultSkillDir = join(repoRoot, "skills", "flow-diagram");
const defaultConfigPath = join(repoRoot, "scripts", "workbuddy-release.json");

/** Official required frontmatter order (open.workbuddy.cn/docs/skill). */
const FIELD_ORDER = [
  "name",
  "display_name",
  "display_name_en",
  "description",
  "description_zh",
  "description_en",
  "examples_zh",
  "examples_en",
  "version",
  "author",
  "allowed-tools",
];
const REQUIRED_FIELDS = [
  "name",
  "display_name",
  "display_name_en",
  "description",
  "description_zh",
  "description_en",
  "version",
  "author",
];
const LIST_FIELDS = new Set(["examples_zh", "examples_en", "allowed-tools"]);
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const MAX_PACKAGE_PATH_PARTS = 3;
const MAX_EXAMPLES_PER_LANGUAGE = 3;

function fail(message) {
  console.error(`package-workbuddy-skill: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) fail(`unknown argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`missing value for --${key}`);
    options[key] = value;
    i += 1;
  }
  return options;
}

/** Minimal frontmatter reader for the flat `key: value` pairs this repo authors. */
function readFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) fail("source SKILL.md has no frontmatter block");
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon < 0) fail(`unparsable frontmatter line: ${line}`);
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return { fields, body: markdown.slice(match[0].length) };
}

/** Preserve Markdown navigation while exposing WorkBuddy's reference loader syntax. */
function addWorkBuddyReferenceDirectives(markdown) {
  return markdown.replace(/\]\((references\/[^)\s]+)\)([.,!?;:，。；：！？])?/g, (link, target, punctuation = "") => {
    const reference = target.split("#", 1)[0];
    const markdownLink = link.slice(0, link.length - punctuation.length);
    return `${markdownLink}${punctuation} @${reference}`;
  });
}

function yamlScalar(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function emitFrontmatter(fields) {
  const ordered = [...FIELD_ORDER, ...Object.keys(fields).filter((k) => !FIELD_ORDER.includes(k))];
  const lines = ["---"];
  for (const key of ordered) {
    if (fields[key] === undefined || fields[key] === "") continue;
    const value = fields[key];
    if (LIST_FIELDS.has(key)) {
      const items = Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim()).filter(Boolean);
      if (key === "allowed-tools") {
        lines.push(`${key}: ${items.map(yamlScalar).join(", ")}`);
      } else {
        lines.push(`${key}:`);
        for (const item of items) lines.push(`- ${yamlScalar(item)}`);
      }
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

function runGit(args) {
  try {
    return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" });
  } catch {
    fail(`git ${args[0]} failed; run from a repository with a HEAD commit`);
  }
}

function repositoryPath(file) {
  const path = relative(repoRoot, file).split(sep).join("/");
  if (!path || path === ".." || path.startsWith("../")) fail(`release input must be inside the repository: ${file}`);
  return path;
}

/** Resolve existing ancestors so aliases cannot place outputs inside the source. */
function resolveOutputDirectory(path) {
  const pending = [];
  let ancestor = resolve(path);
  while (!lstatSync(ancestor, { throwIfNoEntry: false })) {
    pending.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
  return resolve(realpathSync(ancestor), ...pending);
}

/** Include current tracked and non-ignored new files; deleted paths do not ship. */
function listSkillFiles(skillDir) {
  const prefix = repositoryPath(skillDir);
  const listed = runGit(["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", prefix]);
  const files = [...new Set(listed.split("\0").filter(Boolean))].filter((file) => {
    const stat = lstatSync(join(repoRoot, file), { throwIfNoEntry: false });
    if (!stat) return false;
    if (!stat.isFile()) fail(`unsupported symlink or non-regular installation file: ${file}`);
    return true;
  }).sort();
  if (!files.length) fail(`no files found under ${prefix}`);
  if (!files.includes(`${prefix}/SKILL.md`)) fail("install unit has no SKILL.md");
  return files;
}

/** Reject symlink ancestors as well as symlink files before reading any input. */
function readRegularInput(path) {
  const parts = path.split("/");
  for (let index = 1; index <= parts.length; index += 1) {
    const component = parts.slice(0, index).join("/");
    const stat = lstatSync(join(repoRoot, component), { throwIfNoEntry: false });
    if (!stat || (index === parts.length ? !stat.isFile() : !stat.isDirectory())) {
      fail(`release input must be a regular file with no symlink ancestors: ${path}`);
    }
  }
  return readFileSync(join(repoRoot, path));
}

function snapshotReleaseInputs(files, configPath, usesPackageVersion) {
  const paths = [...new Set([
    ...files, repositoryPath(configPath), repositoryPath(fileURLToPath(import.meta.url)),
    ...(usesPackageVersion ? ["package.json"] : []),
  ])].sort();
  return new Map(paths.map((path) => [path, readRegularInput(path)]));
}

function hashBytes(data) {
  return createHash("sha256").update(data).digest("hex");
}

/** Git state describes only selected inputs; hashes identify the bytes actually used. */
function describeReleaseInputs(snapshot, skillDir, usesPackageVersion) {
  const prefix = repositoryPath(skillDir);
  const status = runGit([
    "status", "--porcelain=v1", "--no-renames", "--untracked-files=all", "--ignored=traditional", "-z",
    "--", prefix, ...snapshot.keys(),
  ]);
  const changes = status.split("\0").filter(Boolean)
    .map((record) => ({ status: record.slice(0, 2), path: record.slice(3) }))
    .filter((change) => snapshot.has(change.path) ||
      (change.status.includes("D") && change.path.startsWith(`${prefix}/`)));
  const files = [...snapshot].map(([path, data]) => ({ path, sizeBytes: data.length, sha256: hashBytes(data) }));
  return {
    source: "working-tree",
    versionSource: usesPackageVersion ? "package.json" : "--version",
    hasUncommittedChanges: changes.length > 0,
    changes,
    sha256: hashBytes(JSON.stringify(files)),
    files,
  };
}

function validateExamples(fields) {
  for (const language of ["zh", "en"]) {
    const key = `examples_${language}`;
    const examples = fields[key];
    if (examples === undefined) continue;
    if (!Array.isArray(examples) || examples.some((item) => typeof item !== "string" || !item.trim())) {
      fail(`${key} must be an array of nonempty strings`);
    }
    if (examples.length > MAX_EXAMPLES_PER_LANGUAGE) fail(`${key} supports at most ${MAX_EXAMPLES_PER_LANGUAGE} examples`);
  }
}

/** Every relative path target referenced by the packaged SKILL.md must ship. */
function validateSkillLinks(markdown, shippedPaths, skillDir) {
  const problems = [];
  for (const match of markdown.matchAll(/\]\(([^)\s]+?)(#[^)]*)?\)/g)) {
    const target = match[1];
    if (target.startsWith("http") || target.startsWith("mailto") || target === "#" || !target) continue;
    const resolved = resolve(skillDir, target);
    if (!shippedPaths.has(resolved)) problems.push(target);
  }
  if (problems.length) fail(`SKILL.md references paths missing from the package: ${[...new Set(problems)].join(", ")}`);
}

function validateWorkBuddyReferences(markdown, shippedPaths, skillDir) {
  const missing = [];
  for (const match of markdown.matchAll(/@references\/([^\s]+)/g)) {
    const target = match[1].replace(/[.,!?;:，。；：！？）】]+$/u, "");
    if (!shippedPaths.has(resolve(skillDir, `references/${target}`))) missing.push(target);
  }
  if (missing.length) fail(`WorkBuddy reference directives point to files missing from the package: ${[...new Set(missing)].join(", ")}`);
}

/** Package source paths unchanged so tests exercise the published layout. */
function createReleaseEntries(files, skillDir, skillName, skillMarkdown, snapshot) {
  return files.map((file) => {
    const sourcePath = relative(skillDir, resolve(repoRoot, file)).split(sep).join("/");
    const name = `${skillName}/${sourcePath}`;
    if (name.split("/").length > MAX_PACKAGE_PATH_PARTS) {
      fail(`source directory depth exceeds root/subdirectory/file: ${sourcePath}`);
    }
    const data = sourcePath === "SKILL.md" ? Buffer.from(skillMarkdown, "utf8") : snapshot.get(file);
    return { name, sourcePath, data };
  });
}

function validateReleaseEntries(entries) {
  const names = new Set(entries.map((entry) => entry.name));
  for (const entry of entries.filter((item) => item.name.endsWith(".md"))) {
    for (const match of entry.data.toString("utf8").matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(target)) continue;
      const resolved = posix.normalize(posix.join(posix.dirname(entry.name), target.split("#", 1)[0]));
      if (!names.has(resolved)) fail(`packaged Markdown link target missing: ${entry.name} -> ${target}`);
    }
  }
}

/* ---- minimal store-only ZIP writer (no dependency, UTF-8 names) ---- */
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function dosDateTime() {
  // Fixed stamp keeps the zip reproducible: identical input yields identical sha256.
  return { time: 0, date: ((1980 - 1980) << 9) | (1 << 5) | 1 };
}
function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const stamp = dosDateTime();
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralStart = offset;
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const skillInputPath = resolve(options["skill-dir"] ?? defaultSkillDir);
  if (!lstatSync(skillInputPath).isDirectory()) fail(`skill directory must be a regular directory: ${skillInputPath}`);
  const skillDir = realpathSync(skillInputPath);
  const configInputPath = resolve(options.config ?? defaultConfigPath);
  if (!existsSync(configInputPath)) fail(`config not found: ${configInputPath}`);
  if (!lstatSync(configInputPath).isFile()) fail(`release config must be a regular file: ${configInputPath}`);
  const configPath = realpathSync(configInputPath);
  const usesPackageVersion = options.version === undefined;
  repositoryPath(skillDir);
  const files = listSkillFiles(skillDir);
  const snapshot = snapshotReleaseInputs(files, configPath, usesPackageVersion);
  const version = options.version ?? JSON.parse(snapshot.get("package.json").toString("utf8")).version;
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    fail(`version must be a valid semantic version: ${version}`);
  }
  const outputDir = resolveOutputDirectory(options.output ?? join(repoRoot, "outputs", "workbuddy-release", version));

  if (outputDir === skillDir || outputDir.startsWith(skillDir + sep)) {
    fail("output directory must be outside the installation source");
  }
  const config = JSON.parse(snapshot.get(repositoryPath(configPath)).toString("utf8"));
  delete config.$comment;

  const sourcePath = join(skillDir, "SKILL.md");
  const { fields: sourceFields, body } = readFrontmatter(snapshot.get(repositoryPath(sourcePath)).toString("utf8"));
  const skillName = sourceFields.name;
  if (skillName !== basename(skillDir)) {
    fail(`source Skill name must match its install directory: ${basename(skillDir)}`);
  }
  if (config.name !== undefined && config.name !== sourceFields.name) {
    fail(`release config name must match source Skill name: ${sourceFields.name}`);
  }
  const merged = { ...sourceFields, ...config, version };
  const missing = REQUIRED_FIELDS.filter((key) => !merged[key]);
  if (missing.length) fail(`missing required WorkBuddy fields: ${missing.join(", ")} (set them in ${relative(repoRoot, configPath)})`);

  validateExamples(merged);
  const workbuddyBody = addWorkBuddyReferenceDirectives(body);
  const rewritten = emitFrontmatter(merged) + workbuddyBody;
  const shipped = new Set(files.map((f) => resolve(repoRoot, f)));
  validateSkillLinks(rewritten, shipped, skillDir);
  validateWorkBuddyReferences(rewritten, shipped, skillDir);

  const entries = createReleaseEntries(files, skillDir, skillName, rewritten, snapshot);
  validateReleaseEntries(entries);
  const packagedSkill = entries.find((entry) => entry.sourcePath === "SKILL.md").data;
  const zip = buildZip(entries);
  const sha256 = hashBytes(zip);
  const commit = runGit(["rev-parse", "HEAD"]).trim();
  const runtime = JSON.parse(snapshot.get(repositoryPath(join(skillDir, "runtime/manifest.json"))).toString("utf8"));
  const packagerSha256 = hashBytes(snapshot.get(repositoryPath(fileURLToPath(import.meta.url))));
  const releaseInputs = describeReleaseInputs(snapshot, skillDir, usesPackageVersion);

  mkdirSync(outputDir, { recursive: true });
  const zipName = `${skillName}-skill-${version}.zip`;
  writeFileSync(join(outputDir, zipName), zip);
  writeFileSync(join(outputDir, "SKILL.md"), packagedSkill);
  writeFileSync(join(outputDir, "release-manifest.json"), JSON.stringify({
    package: zipName,
    candidateCommit: commit,
    releaseInputs,
    skillDistributionVersion: version,
    sdkBaseline: runtime.sdk?.version ?? null,
    packagerSha256,
    config: relative(repoRoot, configPath),
    fileCount: entries.length,
    sizeBytes: zip.length,
    sha256,
    files: entries.map((e) => ({ path: e.name, sourcePath: e.sourcePath, sizeBytes: e.data.length, sha256: hashBytes(e.data) })),
    builtAt: new Date().toISOString(),
  }, null, 2));

  console.log(JSON.stringify({
    status: "ok",
    zip: relative(repoRoot, join(outputDir, zipName)),
    files: entries.length,
    sizeBytes: zip.length,
    sha256,
    candidateCommit: commit,
    hasUncommittedInputs: releaseInputs.hasUncommittedChanges,
  }, null, 2));
}

main();
