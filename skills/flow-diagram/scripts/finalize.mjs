/** Collapse a finished task into portable final files, then remove only its scoped temporary workspace. */
import { hasFormalReviewRequest } from "./formal-review.mjs";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { digest, readArtifact, scopedFile } from "./artifact-identity.mjs";
import { replaceDelivery } from "./delivery-publication.mjs";
import { readCurrentDraft, reserveDraftOperation, releaseWorkingDraft } from "./working-draft.mjs";
import { readSavedRevisions } from "./saved-revisions.mjs";
import { loadReviewRecords } from "./review-records.mjs";
import { loadEvidenceProjection } from "./evidence-projection.mjs";
import { aggregateReviews } from "./review-projection.mjs";
import { ToolError } from "./runtime.mjs";

const OUTPUT_KINDS = new Set(["json", "html", "svg", "png", "gif"]);
const REVISION_ID = /^v\d{3,}$/u;

/** Publish checked files and a self-contained summary; failures retain the task for recovery. */
export async function finalizeTask(options, signal) {
  const workspace = await taskWorkspace(options);
  const root = resolve(".diagrams");
  const destination = join(root, options.name);
  const lock = `${destination}.lock`;
  const series = join(workspace, "history", options.name);
  const operationLock = await reserveDraftOperation(series);
  let staging;
  let destinationReserved = false;
  try {
    await mkdir(lock).catch((cause) => { throw invalid("FINALIZE_BUSY", `Cannot reserve final delivery: ${cause.message}`); });
    destinationReserved = true;
    const current = !options.from || options.from === "current";
    const records = current ? [await readCurrentDraft(series)] : await readSavedRevisions(series, options.from);
    const selected = records[0].report;
    const checksPassed = selected.checks?.validation === "passed" && selected.checks?.compilation === "passed";
    const qualityGapOnly = selected.status === "failed" && checksPassed && selected.completion?.delivery === "complete";
    if (selected.command !== "author" || (selected.status !== "delivered" && !qualityGapOnly) || selected.completion?.delivery !== "complete") {
      throw invalid("FINALIZE_INCOMPLETE", "Select a successful authoring revision before finalizing.");
    }
    if (current) await verifyEditableSource(selected.workingDraft.editableSource, workspace);
    const files = current ? await collectCurrentFiles(records[0], signal) : await collectFiles(records, signal);
    if (selected.htmlInspection?.file?.sha256 && files.find((file) => file.kind === "html")?.sha256 !== selected.htmlInspection.file.sha256) {
      throw invalid("FINALIZE_SOURCE", "Selected HTML bytes changed after authoring or inspection.");
    }
    const requested = [...new Set(records.flatMap(({ report }) => report.completion?.requested ?? []))].filter((kind) => kind !== "exports");
    if (requested.some((kind) => !files.some((file) => file.kind === kind))) {
      throw invalid("FINALIZE_INCOMPLETE", "A requested export is missing; complete it before finalizing.");
    }
    staging = await mkdtemp(join(root, `.${options.name}-publish-`));
    const independent = current ? null : await loadReviewRecords(records);
    const evidence = current ? null : await loadEvidenceProjection(records);
    const projection = current ? selected : aggregateReviews(records, independent, { htmlSha256: files.find((file) => file.kind === "html").sha256, evidence });
    const projectedRecords = [{ ...records[0], report: projection }, ...records.slice(1)];
    const summary = deliverySummary(projection, projectedRecords, files, requested, workspace);
    if (options.notes) summary.agentNotes = await readFile(resolve(options.notes), "utf8");
    for (const file of files) {
      signal?.throwIfAborted();
      await mkdir(dirname(join(staging, file.path)), { recursive: true });
      await writeFile(join(staging, file.path), file.bytes, { flag: "wx" });
    }
    await writeFile(join(staging, "report.json"), JSON.stringify(summary, null, 2) + "\n");
    await writeFile(join(staging, "report.md"), readableSummary(summary));
    signal?.throwIfAborted();
    await replaceDelivery(staging, destination);
    staging = null;
    const cleanup = await cleanupWorkspace(workspace, options["keep-work"]);
    return { status: "delivered", stage: "finalize", command: "finalize", directory: destination,
      artifacts: summary.artifacts.map((item) => ({ ...item, path: join(destination, item.path) })),
      completion: summary.completion, formalReview: summary.formalReview, cleanup, diagnostics: [] };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    if (destinationReserved) await rm(lock, { recursive: true, force: true });
    await releaseWorkingDraft({ lock: operationLock });
  }
}

/** A capture resume retains the consumed editable source even when input.path names generated JSON. */
async function verifyEditableSource(source, workspace) {
  if (!source?.path || !source.path.startsWith(workspace + sep)) return;
  try {
    if (await realpath(source.path) === source.path && digest(await readFile(source.path)) === source.sha256) return;
  } catch (cause) {
    throw invalid("FINALIZE_SOURCE", `Cannot verify the editable task source: ${cause.message}. Preserve the draft and regenerate current outputs.`);
  }
  throw invalid("FINALIZE_SOURCE", "The editable task source changed after authoring; regenerate current outputs before finalizing.");
}

async function taskWorkspace(options) {
  if (!options.workspace || !options.name || options.from && options.from !== "current" && !REVISION_ID.test(options.from)) {
    throw invalid("FINALIZE_WORKSPACE", "finalize requires --workspace and --name; select current or an explicit checkpoint with --from.");
  }
  const workspace = resolve(options.workspace);
  const parent = resolve(".diagrams", ".work", options.name);
  // Canonical equality rejects symlinks in any ancestor before a recursive cleanup is authorized.
  if (dirname(workspace) !== parent || dirname(parent) !== resolve(".diagrams", ".work")
    || basename(parent) !== options.name || options.name.startsWith(".")
    || await realpath(workspace) !== workspace || !(await lstat(workspace)).isDirectory()) {
    throw invalid("FINALIZE_WORKSPACE", "Workspace must be one real task directory under .diagrams/.work/<name>/.");
  }
  return workspace;
}

async function collectFiles(records, signal) {
  const files = new Map();
  for (const [index, { directory, report }] of records.entries()) {
    // A rejected manifest has no known format set; only a later successful batch resolves that request.
    if (report.completion?.requested?.includes("exports")
      && !records.slice(0, index).some((record) => record.report.exportManifest?.status === "succeeded")) {
      throw invalid("FINALIZE_INCOMPLETE", "A requested batch has no successful replacement.");
    }
    for (const item of report.exports ?? []) {
      const path = item.path ? relative(directory, item.path) : `diagram.${item.format}`;
      if (item.status !== "succeeded" && !files.has(path)) throw invalid("FINALIZE_INCOMPLETE", "A selected export did not finish successfully.");
    }
    for (const artifact of report.artifacts ?? []) {
      if (!OUTPUT_KINDS.has(artifact.kind)) continue;
      signal?.throwIfAborted();
      const path = relative(directory, artifact.path);
      if (!/^(diagram\.(json|html|svg|png|gif)|exports\/[^/\\]+\.(svg|png))$/u.test(path.split(sep).join("/"))) {
        throw invalid("FINALIZE_SOURCE", "Unrecognized final artifact path.");
      }
      if (files.has(path)) continue;
      const { bytes } = ["svg", "png"].includes(artifact.kind)
        ? await readArtifact(report, report.revision.id, artifact.artifactId)
        : await scopedFile(directory, artifact.path);
      files.set(path, { kind: artifact.kind, path, bytes, sha256: digest(bytes), sourceRevision: report.revision.id,
        ...(artifact.timeMs === undefined ? {} : { timeMs: artifact.timeMs }) });
    }
  }
  if (!files.has("diagram.json") || !files.has("diagram.html")) throw invalid("FINALIZE_INCOMPLETE", "JSON and HTML are required.");
  return [...files.values()];
}

async function collectCurrentFiles({ directory, report }, signal) {
  const manifest = JSON.parse(await readFile(new URL("../runtime/manifest.json", import.meta.url), "utf8"));
  if (report.sdk?.version !== manifest.sdk.version || report.sdk?.integrity !== manifest.sdk.integrity) {
    throw invalid("FINALIZE_SOURCE", "Current SDK identity differs from the installed baseline; regenerate current outputs.");
  }
  const files = [];
  for (const artifact of report.artifacts.filter((item) => OUTPUT_KINDS.has(item.kind))) {
    signal?.throwIfAborted();
    const path = relative(directory, artifact.path).split(sep).join("/");
    if (!/^(diagram\.(json|html|svg|png|gif)|exports\/[^/\\]+\.(svg|png))$/u.test(path)) throw invalid("FINALIZE_SOURCE", "Unrecognized current artifact path.");
    const { bytes } = await scopedFile(directory, artifact.path);
    if (digest(bytes) !== artifact.sha256 || artifact.sourceSha256 !== report.input.sha256
      || artifact.theme !== report.theme || artifact.sdk?.version !== report.sdk.version || artifact.sdk?.integrity !== report.sdk.integrity) {
      throw invalid("FINALIZE_SOURCE", "Current artifact bytes or source context changed after authoring.");
    }
    files.push({ kind: artifact.kind, path, bytes, sha256: artifact.sha256, sourceRevision: "current",
      ...(artifact.timeMs === undefined ? {} : { timeMs: artifact.timeMs }) });
  }
  if (!files.some((item) => item.kind === "json") || !files.some((item) => item.kind === "html")) throw invalid("FINALIZE_INCOMPLETE", "Current JSON and HTML are required.");
  return files;
}

function deliverySummary(selected, records, files, requested, workspace) {
  const frames = uniqueReviews(records.flatMap(({ report }) => report.visual?.viewedFrames ?? [])
    .map(({ id, timeMs, view, sha256, observations, issues, sourceRevision, reviewer, reviewRecord, attestations }) => ({ id, timeMs, view, sha256, observations, issues, sourceRevision, reviewer, reviewRecord, attestations })));
  const surfaces = uniqueReviews((selected.visual?.artifactReviews ?? []).map(({ path, ...surface }) => surface));
  const reviewIssues = [...frames, ...surfaces].flatMap((item) => item.issues);
  const sources = [...new Map(records.flatMap(({ report }) => report.sources ?? [])
    .filter((item) => item.kind !== "diagram-json")
    .map((item) => [JSON.stringify(item), item])).values()];
  const summary = { schemaVersion: 1, toolVersion: selected.toolVersion, command: "finalize", status: "delivered",
    selectedRevision: selected.revision.id, inputSha256: selected.input.sha256,
    ...(selected.workingDraft ? { workingDraft: { id: "current", inputSha256: selected.input.sha256 } } : {}),
    sdk: { version: selected.sdk.version, integrity: selected.sdk.integrity }, theme: selected.theme,
    completion: { delivery: "complete", ...(hasFormalReviewRequest(selected) ? { quality: reviewIssues.length ? "unresolved-issues" : selected.completion.quality } : {}), requested, completed: requested },
    formalReview: selected.formalReview ?? { status: "not-requested" },
    reviewRecords: selected.reviewRecords,
    evidenceRecords: selected.evidenceRecords,
    checks: selected.checks, ...(hasFormalReviewRequest(selected) ? { qualityCoverage: selected.qualityCoverage } : {}), sources,
    ...(selected.htmlPage ? { htmlPage: selected.htmlPage } : {}),
    htmlInspection: selected.htmlInspection ? {
      status: selected.htmlInspection.status, sourceRevision: selected.htmlInspection.sourceRevision,
      fileSha256: selected.htmlInspection.file?.sha256, display: selected.htmlInspection.display,
      coverage: selected.htmlInspection.coverage, playback: selected.htmlInspection.playback,
      states: selected.htmlInspection.states?.map(({ path, ...state }) => state) ?? [],
      viewedStates: selected.htmlInspection.viewedStates?.map(({ path, ...state }) => state) ?? []
    } : null,
    diagnostics: selected.diagnostics.filter((item) => item.severity !== "info"),
    provenance: { originalIssues: selected.provenance.originalIssues },
    visual: { scope: hasFormalReviewRequest(selected)
      ? "Only the recorded frames and display surfaces were reviewed; intermediate image files are temporary."
      : "Formal review was not requested. Actual viewing is described by the author; capture does not establish viewing.",
      frames, surfaces },
    userDecisions: selected.userDecisions,
    artifacts: [...files.map(({ bytes, ...file }) => file), { kind: "report-json", path: "report.json" }, { kind: "report-markdown", path: "report.md" }] };
  // Keep facts and hashes rather than dangling pointers into disposable task data.
  return JSON.parse(JSON.stringify(summary).replaceAll(workspace, "[temporary task workspace]"));
}

function uniqueReviews(reviews) {
  return [...new Map(reviews.map((item) => [JSON.stringify(item), item])).values()];
}

function readableSummary(report) {
  return ["# FlowSVG delivery", "", `Delivery: ${report.completion.delivery}`,
    `Formal review: ${report.formalReview.status}`,
    ...(hasFormalReviewRequest(report) ? [`Formal review coverage: ${report.completion.quality}`] : []),
    `Selected revision: ${report.selectedRevision}`, `Source SHA-256: ${report.inputSha256}`, "", "## Files", "",
    ...report.artifacts.map((item) => `- [${item.path.replaceAll("[", "\\[").replaceAll("]", "\\]")}](<${item.path}>)${item.sha256 ? ` — SHA-256 ${item.sha256}` : ""}`),
    "", "## Checks", "", ...Object.entries(report.checks).map(([key, value]) => `- ${key}: ${value}`),
    ...(hasFormalReviewRequest(report) ? ["", "## Required quality coverage", "", `Status: ${report.qualityCoverage?.status ?? report.completion.quality}`,
      ...(report.qualityCoverage?.required ?? []).map((item) => `- ${item.id}: ${item.status}${item.reason ? ` — ${item.reason}` : ""}`)] : []),
    "", "## HTML inspection", "", `Status: ${report.htmlInspection?.status ?? "not-run"}`,
    ...(hasFormalReviewRequest(report) ? [`HTML states viewed: ${report.htmlInspection?.coverage?.viewed ?? 0}/${report.htmlInspection?.coverage?.requested ?? 0}`] : []),
    "", "## Unresolved issues", "", ...report.diagnostics.map((item) => `- ${item.code}: ${item.reason}`),
    ...[...new Set([...report.visual.frames, ...report.visual.surfaces].flatMap((item) => item.issues.map((issue) => issue.reason)))].map((reason) => `- Visual review: ${reason}`),
    ...(hasFormalReviewRequest(report) ? ["", `Reviewed frames: ${report.visual.frames.length}; reviewed display surfaces: ${report.visual.surfaces.length}.`] : []),
    report.visual.scope, ...(report.agentNotes ? ["", "## Agent-authored notes", "", report.agentNotes] : []), ""].join("\n");
}


async function cleanupWorkspace(workspace, keep) {
  if (keep) return { status: "retained", reason: "Explicit --keep-work request." };
  try { await rm(workspace, { recursive: true }); return { status: "removed" }; }
  catch (error) { return { status: "failed", reason: error.message }; }
}

function invalid(code, reason) {
  return new ToolError("finalize", code, reason, "Keep the task workspace and previous delivery; resolve the reported cause before retrying.");
}
