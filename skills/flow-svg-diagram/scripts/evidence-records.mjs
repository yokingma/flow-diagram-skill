/** Independent evidence metadata and image identities; all source revisions stay real and immutable. */
import { lstat, mkdir, readdir, realpath } from "node:fs/promises";
import { loadArtifactEvidenceSource, verifyArtifactReviewEntries } from "./artifact-review-source.mjs";
import { basename, dirname, join } from "node:path";
import { digest, inspectImage, readArtifact, scopedFile } from "./artifact-identity.mjs";
import { canonicalJson } from "./review-records.mjs";
import { loadReviewSource } from "./review-preflight.mjs";
import { CAPTURE_CONTEXT } from "./artifact-capture.mjs";
import { publishDraftCopy } from "./atomic-draft.mjs";
import { ToolError } from "./runtime.mjs";

export const EVIDENCE_RECORD_ID = /^evidence-[a-f0-9-]{36}$/u;
const ARTIFACT_CONTEXT_KEYS = ["sourceSha256", "sdk", "timeMs", "theme", "reducedMotion", "background", "camera", "intrinsicWidth", "intrinsicHeight", "viewBox"];

/** Independent screenshot identity includes its own source namespace, exact rendering conditions and bytes. */
export function independentEvidenceIdentity(item) {
  return digest(canonicalJson(["flowsvg-artifact-evidence-v2", item.evidenceSource, item.artifactId, item.artifactSourceRevision,
    item.artifactSha256, ...ARTIFACT_CONTEXT_KEYS.map((key) => item[key] ?? null), item.displayWidth, item.displayHeight,
    item.backdrop, item.relativePath, item.sha256, item.captureContext, item.fonts, item.browser]));
}

/** Surface identity excludes capture history, so one valid capture can satisfy the same exact request. */
export function surfaceKey(item) {
  return canonicalJson([item.artifactId, item.displayWidth, item.displayHeight, item.backdrop?.toLowerCase()]);
}

/** Reserve a dedicated record directory only after read-only input planning succeeds. */
export async function evidenceDirectory(series, create = false) {
  let parent = await realpath(series);
  for (const name of ["records", "evidence"]) {
    const path = join(parent, name);
    if (create) await mkdir(path).catch((cause) => { if (cause.code !== "EEXIST") throw cause; });
    let canonical;
    try { canonical = await realpath(path); }
    catch (cause) { if (!create && cause.code === "ENOENT") return null; throw cause; }
    if (canonical !== path || !(await lstat(path)).isDirectory()) throw invalid("Evidence records escape the selected diagram series.", path);
    parent = canonical;
  }
  return parent;
}

/** Publish terminal operation facts once, including partial/not-run/cancelled outcomes; never overwrite history. */
export async function saveEvidenceRecord(directory, record) {
  const payload = { ...record, contentSha256: digest(canonicalJson(record)) };
  await publishDraftCopy(join(directory, "record.json"), JSON.stringify(payload, null, 2) + "\n");
  return payload;
}

/** Resolve one named evidence operation without synthesizing a diagram revision or trusting a stored passed status. */
export async function loadIndependentEvidenceSource(subject, selection) {
  const id = typeof selection === "string" ? selection : selection?.id;
  if (!EVIDENCE_RECORD_ID.test(id ?? "")) throw invalid("Explicit evidence record ID is invalid.", id);
  const root = await evidenceDirectory(dirname(subject.parent.directory));
  if (!root) throw invalid("Evidence record directory is missing.", id);
  const directory = join(root, id);
  if (await realpath(directory) !== directory || (await lstat(directory)).isSymbolicLink()) throw invalid("Evidence record escapes its diagram series.", id);
  const file = await scopedFile(directory, join(directory, "record.json"));
  const record = JSON.parse(file.bytes.toString("utf8"));
  const { contentSha256, ...payload } = record;
  if (record.schemaVersion !== 1 || record.kind !== "evidence" || record.id !== id || digest(canonicalJson(payload)) !== contentSha256
    || canonicalJson(record.captureContext) !== canonicalJson(CAPTURE_CONTEXT) || !Array.isArray(record.requested) || !record.requested.length
    || !Array.isArray(record.items) || record.items.length !== record.requested.length) throw invalid("Evidence record identity or rendering conditions changed.", id);
  const context = await verifySource(subject, record);
  const locator = { kind: "evidence-record", id, sourceRevision: record.subject.sourceRevision, reportSha256: digest(file.bytes) };
  if (typeof selection !== "string" && Object.keys(locator).some((key) => selection[key] !== locator[key])) throw invalid("Evidence source record bytes changed.", id);
  return { ...context, directory, record, locator, source: { ...context.source,
    artifactEvidence: { status: record.status, settings: { items: record.requested }, items: record.items } } };
}

async function verifySource(subject, record) {
  const sourceRevision = record.subject?.sourceRevision;
  const series = dirname(subject.parent.directory);
  const context = await loadReviewSource({ from: sourceRevision, output: dirname(series), name: basename(series) });
  const file = await scopedFile(context.parent.directory, join(context.parent.directory, "report.json"));
  const expected = { sourceRevision, inputSha256: context.source.input.sha256, sdk: { version: context.source.sdk.version,
    integrity: context.source.sdk.integrity }, theme: context.source.theme, reducedMotion: false };
  if (canonicalJson(record.subject) !== canonicalJson(expected) || record.source?.revision !== sourceRevision
    || record.source.reportSha256 !== digest(file.bytes) || context.source.input.sha256 !== subject.source.input.sha256
    || context.source.theme !== subject.source.theme || canonicalJson(expected.sdk) !== canonicalJson({ version: subject.source.sdk.version, integrity: subject.source.sdk.integrity })) {
    throw invalid("Evidence original source or complete subject context changed.", record.id);
  }
  return context;
}

/** Verify one own captured image or explicit reused source, preserving the original screenshot and review identity. */
export async function verifyIndependentEvidence(subject, evidenceContext, evidence, seen = new Set()) {
  if (!evidence || evidence.status !== "captured" || !evidence.evidenceId) throw invalid("Evidence is not a complete captured image.", evidenceContext.locator.id);
  const { record, directory } = evidenceContext;
  const requested = record.requested.find((item) => surfaceKey(item) === surfaceKey(evidence));
  if (!requested) throw invalid("Evidence surface was not requested by its registered operation.", evidence.evidenceId);
  if (evidence.operationStatus === "reused") {
    // Distinct operations can reuse one original image; only a repeated operation/entry is a cycle.
    const key = `${evidenceContext.locator.id}/${evidence.evidenceId}`;
    if (seen.has(key)) throw invalid("Cyclic reused evidence source.", key);
    seen.add(key);
    const original = await loadArtifactEvidenceSource(subject, evidence.reuseSource);
    const item = original.source.artifactEvidence.items.find((candidate) => candidate.evidenceId === evidence.evidenceId);
    if (original.locator.kind === "revision") await verifyArtifactReviewEntries({ ...subject, artifactEvidenceSource: original }, { items: [{ evidenceId: item.evidenceId, sha256: item.sha256 }] });
    else await verifyIndependentEvidence(subject, original, item, seen);
    if (canonicalJson(stripOperation({ ...item, ...(original.locator.kind === "revision" ? { evidenceSource: original.locator } : {}) })) !== canonicalJson(stripOperation(evidence))) throw invalid("Reused evidence differs from its original registration.", key);
    return evidence;
  }
  const { artifact } = await readArtifact(subject.report, evidence.artifactSourceRevision, evidence.artifactId);
  if (ARTIFACT_CONTEXT_KEYS.some((key) => canonicalJson(evidence[key] ?? null) !== canonicalJson(artifact[key] ?? null))
    || evidence.artifactSha256 !== artifact.sha256 || independentEvidenceIdentity(evidence) !== evidence.evidenceId
    || evidence.evidenceSource?.kind !== "evidence-record" || evidence.evidenceSource.id !== record.id
    || evidence.evidenceSource.sourceRevision !== record.subject.sourceRevision
    || canonicalJson(evidence.captureContext) !== canonicalJson(CAPTURE_CONTEXT)) throw invalid("Evidence source, artifact or capture context changed.", evidence.evidenceId);
  if (!/^evidence-\d+\.png$/u.test(evidence.relativePath ?? "") || evidence.path !== join(directory, evidence.relativePath)) throw invalid("Evidence image path differs from its original registration.", evidence.evidenceId);
  try {
    const file = await scopedFile(directory, join(directory, evidence.relativePath));
    const size = inspectImage("png", file.bytes);
    if (digest(file.bytes) !== evidence.sha256 || size.intrinsicWidth !== evidence.displayWidth || size.intrinsicHeight !== evidence.displayHeight) throw new Error("Evidence screenshot bytes or dimensions changed.");
  } catch (cause) {
    if (cause.message.includes("escapes")) throw cause;
    throw new ToolError("evidence", "EVIDENCE_IMAGE_INVALID", cause.message, "Keep its immutable record; recapture the affected surface and independently review the replacement.", evidence.evidenceId, cause);
  }
  return evidence;
}

/** List metadata for all explicitly associated operations; incomplete images remain visible as coverage gaps. */
export async function loadEvidenceRecords(records) {
  const subject = { parent: { id: records[0].report.revision.id, directory: records[0].directory }, source: records[0].report, report: records[0].report };
  const directory = await evidenceDirectory(dirname(subject.parent.directory));
  if (!directory) return [];
  const allowed = new Set(records.map(({ report }) => report.revision.id));
  const loaded = [];
  for (const id of (await readdir(directory)).sort()) {
    if (!EVIDENCE_RECORD_ID.test(id)) continue;
    const path = join(directory, id);
    if (await realpath(path) !== path) throw invalid("Evidence record directory escapes its series.", id);
    const metadata = JSON.parse((await scopedFile(path, join(path, "record.json"))).bytes.toString("utf8"));
    if (!allowed.has(metadata.subject?.sourceRevision)) continue;
    loaded.push(await loadIndependentEvidenceSource(subject, id));
  }
  return loaded;
}
function stripOperation(item) {
  const { operationStatus, reuseSource, ...original } = item;
  return original;
}
function invalid(reason, location, cause) {
  return new ToolError("evidence", "EVIDENCE_RECORD_INVALID", reason, "Keep original artifacts and records; restore source identity or recapture the affected surface before reviewing it.", location, cause);
}
