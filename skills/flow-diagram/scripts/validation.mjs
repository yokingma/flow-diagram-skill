/** Read-only validation reports exact consumed bytes; it never allocates design history or artifacts. */
import { readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { createReport, recordFailure } from "./reports.mjs";
import { prepareRuntime, importSdk, ToolError } from "./runtime.mjs";
import { checkDocument } from "./document-checks.mjs";
import { diagnoseLayout } from "./diagnostics.mjs";
import { digest, scopedFile } from "./artifact-identity.mjs";

/** Run public field, compilation and finite layout checks without saving or changing the input. */
export async function validateInput(options, signal) {
  const report = createReport("validate", null, options.input || options.from);
  report.validation = { snapshotCreated: false, sourceRevision: null };
  try {
    report.stage = "input";
    const { path, bytes, sourceRevision } = await readValidationSource(options);
    report.validation.sourceRevision = sourceRevision;
    report.sources = [{ path, kind: "diagram-json" }];
    report.input = { path, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
    signal?.throwIfAborted();
    report.stage = "environment";
    const runtime = await prepareRuntime(signal);
    report.sdk = runtime.sdk;
    report.environment = { ...runtime.environment, reused: runtime.reused };
    const sdk = await importSdk(runtime);
    const checked = checkDocument(report, sdk, bytes.toString("utf8"), options);
    if (!checked) return report;
    diagnoseLayout(report, { ...checked, sdk }, options);
    report.status = "validated";
  } catch (cause) {
    const error = report.stage === "input" && cause.name !== "AbortError" && !(cause instanceof ToolError)
      ? new ToolError("input", "INPUT_UNREADABLE", cause.message, "Supply a readable diagram JSON; the source remains unchanged.", options.input, cause)
      : cause;
    recordFailure(report, error);
  }
  return report;
}

/** Saved-source selection verifies canonical scope and bytes without inventing a new revision. */
async function readValidationSource(options) {
  if (options.from && options.input) throw invalidSource("Choose --input or --from, not both.");
  if (!options.from) return { path: resolve(options.input), bytes: await readFile(options.input), sourceRevision: null };
  if (!/^v\d{3,}$/u.test(options.from) || !options.name || /[/\\]/u.test(options.name) || [".", ".."].includes(options.name)) {
    throw invalidSource("--from requires an explicit revision ID and diagram --name.");
  }
  try {
    const history = resolve(options.output || resolve(".diagrams", ".history"));
    const root = join(history, options.name);
    const directory = join(root, options.from);
    const [canonicalHistory, canonicalRoot, canonicalDirectory] = await Promise.all([realpath(history), realpath(root), realpath(directory)]);
    if (dirname(canonicalRoot) !== canonicalHistory || dirname(canonicalDirectory) !== canonicalRoot) throw new Error("Saved source escapes the selected history or diagram.");
    const file = await scopedFile(directory, join(directory, "diagram.json"));
    const record = JSON.parse((await scopedFile(directory, join(directory, "report.json"))).bytes.toString("utf8"));
    if (record.revision?.id !== options.from || record.input?.sha256 !== digest(file.bytes)) throw new Error("Saved input no longer matches its registered revision identity.");
    return { ...file, sourceRevision: options.from };
  } catch (cause) { throw invalidSource(cause.message, cause); }
}

function invalidSource(reason, cause) {
  return new ToolError("input", "VALIDATION_SOURCE_INVALID", reason,
    "Choose an unchanged saved revision under the explicit history/name, or validate a separate draft with --input.", "from", cause);
}
