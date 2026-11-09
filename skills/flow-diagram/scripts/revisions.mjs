/** Explicit parent selection and append-only provenance; later tasks never write into a prior revision. */
import { readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { saveDecisions } from "./decision-records.mjs";
import { ToolError } from "./runtime.mjs";

/** Resolve only an explicitly selected revision under the chosen output/name, never an inferred latest. */
export async function resolveRevisionInput(report, options) {
  report.stage = "revision";
  if (options.from && options.input) throw revisionError("Choose --from or --input, not both.");
  if (options.from && options.parent && options.from !== options.parent) throw revisionError("--from and --parent must identify the same revision.");
  const parent = options.from || options.parent;
  if (parent && !/^v\d{3,}$/u.test(parent)) throw revisionError("Parent must be an explicit revision ID such as v001.");
  const directory = parent ? join(dirname(report.revision.directory), parent) : null;
  if (directory === report.revision.directory) throw revisionError("The new revision cannot be its own parent.");
  if (options.from) await checkParentScope(directory, dirname(report.revision.directory));
  return options.from ? join(directory, "diagram.json") : options.input;
}

/** Retain parent diagnostics and decisions as history even when the new draft resolves the problem. */
export async function inheritRevision(report, options) {
  report.stage = "revision";
  const parent = options.from || options.parent;
  if (!parent) {
    if (options.decisions) throw revisionError("User decisions require an explicit --parent or --from revision.");
    if (basename(report.input.path) === "diagram.json" && /^v\d{3,}$/u.test(basename(dirname(report.input.path)))) {
      throw revisionError("Input belongs to a historical revision; select its explicit --parent or use --from.");
    }
    return;
  }
  const directory = join(dirname(report.revision.directory), parent);
  await checkParentScope(directory, dirname(report.revision.directory));
  if (basename(report.input.path) === "diagram.json" && /^v\d{3,}$/u.test(basename(dirname(report.input.path)))
    && await realpath(dirname(report.input.path)) !== await realpath(directory)) {
    throw revisionError("Historical input does not match the selected parent; use --from for that revision or a separate revised draft.");
  }
  let record;
  let bytes;
  try {
    [record, bytes] = await Promise.all([readFile(join(directory, "report.json"), "utf8").then(JSON.parse), options.from ? Promise.resolve(null) : readFile(join(directory, "diagram.json"))]);
  } catch (cause) {
    throw new ToolError("revision", "PARENT_UNAVAILABLE", `Cannot read selected parent ${parent}: ${cause.message}`,
      "Select a revision with a readable diagram.json and report.json, or import a separate JSON with its known provenance.", "parent", cause);
  }
  if (record.revision?.id !== parent || !Array.isArray(record.diagnostics) || !Array.isArray(record.userDecisions)) throw revisionError("Selected parent does not contain a valid authoring report.");
  const inputSha256 = options.from ? report.input.sha256 : createHash("sha256").update(bytes).digest("hex");
  report.provenance = { parent: { id: parent, directory, inputSha256, recordedInputSha256: record.input?.sha256 ?? null,
    externallyModified: record.input?.sha256 !== inputSha256 }, originalIssues: [...(record.provenance?.originalIssues ?? []),
      ...record.diagnostics.map((issue) => ({ ...issue, revision: parent }))] };
  report.provenance.exportManifests = [...(record.provenance?.exportManifests ?? []),
    ...(record.exportManifest ? [{ ...record.exportManifest, revision: parent }] : [])];
  report.sources = [...report.sources, ...(record.sources ?? [])];
  report.userDecisions = [...record.userDecisions];
  if (report.command === "author" && options.from && report.input.sha256 === record.input?.sha256) {
    report.completion.requested = [...new Set([...(report.completion.requested ?? []), ...(record.completion?.requested ?? [])])];
  }
  if (options.decisions) await saveDecisions(report, options.decisions);
  return record;
}

/** Adopt completed files only after validation establishes the actual source, theme and runtime SDK identity. */
export function inheritDeliveryContext(report, record, options) {
  if (!record || report.command !== "author" || !options.from || report.input.sha256 !== record.input?.sha256
    || report.theme !== record.theme || report.sdk.version !== record.sdk?.version || report.sdk.integrity !== record.sdk?.integrity) return;
  report.completion.completed = [...new Set([...(report.completion.completed ?? []), ...(record.completion?.completed ?? [])])];
  // Review-only parents can already carry original files from an earlier source revision.
  report.inheritedArtifacts = [...(record.artifacts ?? []), ...(record.inheritedArtifacts ?? [])].filter((artifact) => ["svg", "png"].includes(artifact.kind));
  report.inheritedExports = [...(record.exports ?? []), ...(record.inheritedExports ?? [])];
  report.artifactEvidence = record.artifactEvidence ?? report.artifactEvidence;
}

function revisionError(message) { return new ToolError("revision", "PARENT_SELECTION", message, "Confirm the intended parent with the user, then start a new revision with an explicit selection.", "parent"); }

async function checkParentScope(directory, root) {
  let canonicalDirectory;
  let canonicalRoot;
  try { [canonicalDirectory, canonicalRoot] = await Promise.all([realpath(directory), realpath(root)]); }
  catch (cause) { throw new ToolError("revision", "PARENT_UNAVAILABLE", cause.message, "Select an existing parent revision.", "parent", cause); }
  if (dirname(canonicalDirectory) !== canonicalRoot) throw revisionError("Parent revision must remain inside the selected diagram directory.");
}
