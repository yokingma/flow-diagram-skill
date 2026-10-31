/** Immutable review records live beside design revisions; their IDs never masquerade as revision IDs. */
import { lstat, mkdir, readdir, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { publishDraftCopy } from "./atomic-draft.mjs";
import { validateReviewInput } from "./review-contract.mjs";
import { loadReviewSource, verifyReviewEntries } from "./review-preflight.mjs";
import { loadArtifactEvidenceSource, verifyArtifactReviewEntries } from "./artifact-review-source.mjs";
import { ToolError } from "./runtime.mjs";

const RECORD_ID = /^review-[a-f0-9]{64}$/u;

/** Stable semantic serialization ignores object field order; entry order is normalized by the review builder. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

/** Describe the real source and accepted forms; timestamp is metadata outside the semantic record ID. */
export async function buildReviewRecord(context) {
  const { parent, source, materials } = context;
  const reportFile = await scopedFile(parent.directory, join(parent.directory, "report.json"));
  const normalized = {};
  for (const kind of ["visual", "html", "artifact"]) {
    if (!materials[kind]) continue;
    const field = kind === "visual" ? "frames" : kind === "html" ? "states" : "items";
    const id = kind === "artifact" ? "evidenceId" : "id";
    normalized[kind] = { ...(kind === "artifact" ? { source: context.artifactEvidenceSource.locator } : {}), review: { ...materials[kind].review,
      [field]: [...materials[kind].review[field]].sort((left, right) => left[id].localeCompare(right[id])) } };
  }
  const payload = { schemaVersion: 1, kind: "review", subject: { sourceRevision: parent.id, inputSha256: source.input.sha256,
    sdk: { version: source.sdk.version, integrity: source.sdk.integrity }, theme: source.theme, reducedMotion: false },
    source: { revision: parent.id, reportSha256: digest(reportFile.bytes) }, materials: normalized };
  return { ...payload, id: recordIdentity(payload), recordedAt: new Date().toISOString() };
}

/** Publish a complete record once; identical requests reuse it after byte/context verification. */
export async function appendReviewRecord(context, record, signal) {
  signal?.throwIfAborted();
  const directory = await reviewDirectory(dirname(context.parent.directory), true);
  const path = join(directory, `${record.id}.json`);
  try {
    await publishDraftCopy(path, JSON.stringify(record, null, 2) + "\n", signal);
    return { id: record.id, path, reused: false };
  } catch (cause) {
    if (cause.code !== "EEXIST") throw cause;
    const existing = await readRecord(directory, `${record.id}.json`);
    if (recordIdentity(existing) !== record.id) throw invalid("Existing review record does not match the accepted request.", path);
    return { id: record.id, path, reused: true };
  }
}

/** Reverify applicable real ancestry; return records and invalid saved observations as explicit independent facts. */
export async function loadReviewRecords(records) {
  const savedInvalid = await verifySavedArtifactReviews(records);
  const selected = records[0];
  const series = dirname(selected.directory);
  const directory = await reviewDirectory(series, false);
  if (!directory) return { records: [], savedInvalid };
  const allowed = new Set(records.map(({ report }) => report.revision.id));
  const results = [];
  for (const filename of (await readdir(directory)).filter((name) => name.endsWith(".json")).sort()) {
    const record = await readRecord(directory, filename);
    if (!allowed.has(record.subject.sourceRevision)) continue;
    const context = await verifyRecord(record, series);
    results.push({ record, context, invalid: context.invalidEntries.length ? context.invalidEntries : undefined });
  }
  return { records: results, savedInvalid };
}

/** Recheck a stored attestation against actual source bytes, current locked baseline and exact evidence. */
export async function verifyRecord(record, series) {
  try {
    const context = await loadReviewSource({ output: dirname(series), name: basename(series), from: record.subject.sourceRevision });
    const sourceFile = await scopedFile(context.parent.directory, join(context.parent.directory, "report.json"));
    const subject = record.subject;
    if (digest(sourceFile.bytes) !== record.source.reportSha256 || record.source.revision !== context.parent.id
      || subject.inputSha256 !== context.source.input.sha256 || subject.theme !== context.source.theme || subject.reducedMotion !== false
      || subject.sdk.version !== context.source.sdk.version || subject.sdk.integrity !== context.source.sdk.integrity) throw new Error("Review source report or complete identity context changed.");
    const materials = {};
    const invalidEntries = [];
    for (const [kind, material] of Object.entries(record.materials)) {
      validateReviewInput(material.review, kind);
      if (kind === "artifact") {
        if (!material.source) throw new Error("Formal-image review material requires its explicit evidence source locator.");
        context.artifactEvidenceSource = await loadArtifactEvidenceSource(context, material.source);
      }
      const verified = await verifyMaterial(context, kind, material);
      materials[kind] = { ...material, entries: verified.entries };
      invalidEntries.push(...verified.invalidEntries);
    }
    return { ...context, materials, invalidEntries };
  } catch (cause) { throw invalid(cause.message, record.id, cause); }
}

/** Formal-image damage invalidates one observation only; source and registration failures still reject the record. */
async function verifyMaterial(context, kind, material) {
  const field = kind === "artifact" ? "items" : kind === "html" ? "states" : "frames";
  const entries = [];
  const invalidEntries = [];
  for (const entry of material.review[field]) {
    try {
      entries.push(...await verifyReviewEntries(context, kind, { ...material.review, [field]: [entry] }));
    } catch (cause) {
      if (cause.code !== "EVIDENCE_IMAGE_INVALID") throw cause;
      invalidEntries.push({ kind, id: entry.evidenceId ?? entry.id, code: cause.code, reason: cause.message, entry });
    }
  }
  return { entries, invalidEntries };
}

/** Canonical containment applies to each record-directory level, including pre-existing symlinks. */
async function reviewDirectory(series, create) {
  let parent = await realpath(series);
  for (const name of ["records", "reviews"]) {
    const path = join(parent, name);
    if (create) await mkdir(path).catch((cause) => { if (cause.code !== "EEXIST") throw cause; });
    let canonical;
    try { canonical = await realpath(path); }
    catch (cause) { if (!create && cause.code === "ENOENT") return null; throw cause; }
    if (canonical !== path || !(await lstat(path)).isDirectory()) throw invalid("Review records escape the selected diagram series.", path);
    parent = canonical;
  }
  return parent;
}

async function readRecord(directory, filename) {
  try {
    const id = filename.slice(0, -5);
    const path = join(directory, filename);
    if (!RECORD_ID.test(id) || (await lstat(path)).isSymbolicLink()) throw invalid("Invalid review record path.", path);
    const record = JSON.parse((await scopedFile(directory, path)).bytes.toString("utf8"));
    if (record.schemaVersion !== 1 || record.kind !== "review" || record.id !== id || recordIdentity(record) !== id
      || !/^v\d{3,}$/u.test(record.subject?.sourceRevision ?? "") || !record.materials || !Object.keys(record.materials).length
      || Object.keys(record.materials).some((kind) => !["visual", "html", "artifact"].includes(kind))) throw invalid("Review record identity or schema changed.", path);
    return record;
  } catch (cause) {
    if (cause instanceof ToolError) throw cause;
    throw invalid(`Cannot read review record: ${cause.message}`, join(directory, filename), cause);
  }
}
function recordIdentity(record) {
  const { id, recordedAt, ...payload } = record;
  return `review-${digest(canonicalJson(payload))}`;
}
function invalid(reason, location, cause) {
  return new ToolError("review", "REVIEW_RECORD_INVALID", reason, "Keep the original task and records; restore or regenerate the invalid source evidence before retrying.", location, cause);
}

/** Saved authoring observations remain facts only while their registered original images still verify. */
async function verifySavedArtifactReviews(records) {
  const invalidImages = [];
  for (const { directory, report } of records) {
    for (const review of report.visual?.artifactReviews ?? []) {
      const context = await loadReviewSource({ output: dirname(dirname(directory)), name: basename(dirname(directory)), from: report.revision.id });
      context.artifactEvidenceSource = await loadArtifactEvidenceSource(context, review.evidenceRevision);
      try {
        await verifyArtifactReviewEntries(context, { items: [{ evidenceId: review.evidenceId, sha256: review.sha256,
          observations: review.observations, issues: review.issues }] });
      } catch (cause) {
        if (cause.code !== "EVIDENCE_IMAGE_INVALID") throw cause;
        invalidImages.push({ sourceRevision: report.revision.id, evidenceId: review.evidenceId, reason: cause.message, review });
      }
    }
  }
  return invalidImages;
}
