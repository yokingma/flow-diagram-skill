/** Verify exact historical warning references before saving new user decisions. Old records remain opaque history. */
import { readFile, realpath, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { createIssueContext, computeIssueId } from "./issue-identity.mjs";
import { ToolError } from "./runtime.mjs";

const DECISION_FIELDS = ["sourceRevision", "issueId", "decision", "reason"];
const REVISION_ID = /^v\d{3,}$/u;

/** Verify against actual source reports in the explicit parent's ancestry, never code/object fallback or flattened history alone. */
export async function saveDecisions(report, path) {
  let decisions;
  try { decisions = JSON.parse(await readFile(path, "utf8")); }
  catch (cause) { throw decisionError(cause.message, path, cause); }
  if (!Array.isArray(decisions) || !decisions.length || decisions.some((item) => !isDecision(item))) {
    throw decisionError("Each decision requires only sourceRevision, issueId, decision (intentional/revise/defer) and a nonempty reason.", path);
  }
  const references = decisions.map((item) => JSON.stringify([item.sourceRevision, item.issueId]));
  if (new Set(references).size !== references.length) throw decisionError("Submit each sourceRevision + issueId only once.", path);
  const verified = [];
  for (const decision of decisions) {
    const issue = await verifySourceIssue(report, decision, path);
    verified.push({ ...decision, issueContext: issue.issueContext, code: issue.code, objectId: issue.objectId,
      relatedObjectIds: issue.relatedObjectIds ?? [], location: issue.location, timeMs: issue.timeMs,
      parent: report.revision.parent, recordedIn: report.revision.id });
  }
  const savedPath = join(report.revision.directory, "decisions.json");
  await writeFile(savedPath, JSON.stringify(decisions, null, 2) + "\n", { flag: "wx" });
  report.artifacts.push({ kind: "decisions", path: savedPath });
  report.userDecisions = [...report.userDecisions, ...verified];
}

function isDecision(item) {
  return item && typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === DECISION_FIELDS.length
    && Object.keys(item).every((key) => DECISION_FIELDS.includes(key)) && REVISION_ID.test(item.sourceRevision)
    && typeof item.issueId === "string" && /^sha256-[a-f0-9]{64}$/u.test(item.issueId)
    && ["intentional", "revise", "defer"].includes(item.decision) && typeof item.reason === "string" && Boolean(item.reason.trim());
}

async function verifySourceIssue(report, decision, path) {
  const root = dirname(report.revision.directory);
  const source = await findAncestorReport(root, report.revision.parent, decision.sourceRevision, path);
  const recorded = Array.isArray(source.diagnostics) ? source.diagnostics.find((issue) => issue.issueId === decision.issueId) : null;
  const historical = report.provenance.originalIssues.find((issue) => issue.revision === decision.sourceRevision && issue.issueId === decision.issueId);
  if (!recorded || !historical || recorded.sourceRevision !== decision.sourceRevision || recorded.stage !== "layout" || recorded.severity !== "warning") {
    throw decisionError("The selected parent's real issue history does not contain that sourceRevision + issueId. Historical issues without IDs need a new diagnostic revision first.", path);
  }
  const bytes = await readScopedFile(root, decision.sourceRevision, "diagram.json", path);
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  const context = createIssueContext(source, recorded.timeMs, recorded.warningKey);
  if (actualSha256 !== source.input?.sha256 || recorded.issueId !== computeIssueId(context)
    || !sameIdentityContext(recorded.issueContext, context) || !sameIdentityContext(historical.issueContext, context)
    || !sameWarningLocation(historical, recorded) || !hasWarningScope(recorded)) {
    throw decisionError("The source issue's bytes or full identity context no longer match its registered issueId.", path);
  }
  return recorded;
}

/** Follow real parent records so an unrelated sibling or fabricated flattened entry cannot grant authority. */
async function findAncestorReport(root, parent, sourceRevision, path) {
  const visited = new Set();
  let cursor = parent;
  while (cursor && REVISION_ID.test(cursor) && !visited.has(cursor)) {
    visited.add(cursor);
    let record;
    try { record = JSON.parse(await readScopedFile(root, cursor, "report.json", path)); }
    catch (cause) { throw decisionError(`Cannot verify source history: ${cause.message}`, path, cause); }
    if (record.revision?.id !== cursor) throw decisionError("Historical report revision does not match its directory.", path);
    if (cursor === sourceRevision) return record;
    cursor = record.revision.parent;
  }
  throw decisionError("sourceRevision must belong to the explicit parent's actual ancestry.", path);
}

/** Scope both directory and file realpaths; reports and diagram files may themselves be redirected symlinks. */
async function readScopedFile(root, revision, filename, path) {
  try {
    const canonicalRoot = await realpath(root);
    const directory = await realpath(join(root, revision));
    const file = await realpath(join(directory, filename));
    if (dirname(directory) !== canonicalRoot || dirname(file) !== directory) throw new Error("Historical source path escapes its revision directory.");
    return await readFile(file);
  } catch (cause) { throw decisionError(cause.message, path, cause); }
}

/** The hashed key must describe the displayed code, primary field and related participants. */
function hasWarningScope(issue) {
  let key;
  try { key = JSON.parse(issue.warningKey); }
  catch { return false; }
  if (!Array.isArray(key) || key[1] !== 1 || key[2] !== issue.code || !Array.isArray(key[3])) return false;
  const related = issue.relatedObjectIds ?? [];
  if (!Array.isArray(related)) return false;
  if (key[0] === "flowsvg-layout-warning") {
    return key[3][1] === issue.objectId && key[3][3] === issue.location
      && related.length === 1 && Array.isArray(key[4]) && key[4][1] === related[0];
  }
  return key[0] === "flowsvg-skill-layout-warning" && key[3][0] === issue.objectId && key[3][1] === issue.location
    && key.length === related.length + 4 && related.every((id, index) => Array.isArray(key[index + 4]) && key[index + 4][0] === id);
}

function sameWarningLocation(left, right) {
  return JSON.stringify([left.code, left.objectId, left.relatedObjectIds ?? [], left.location, left.timeMs, left.warningKey])
    === JSON.stringify([right.code, right.objectId, right.relatedObjectIds ?? [], right.location, right.timeMs, right.warningKey]);
}

function sameIdentityContext(left, right) {
  return computeIssueId(left) !== null && computeIssueId(left) === computeIssueId(right)
    && left.warningKey === right.warningKey;
}
function decisionError(message, path, cause) {
  return new ToolError("revision", "USER_DECISIONS", message,
    "Record the user's actual choice for a verified sourceRevision + issueId; create a fresh diagnostic revision for old issues without IDs. Original warnings remain unchanged.", path, cause);
}
