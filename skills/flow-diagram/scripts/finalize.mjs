/** Collapse a finished task into portable final files, then remove only its scoped temporary workspace. */
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { digest, readArtifact, scopedFile } from "./artifact-identity.mjs";
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
  await mkdir(lock).catch((cause) => { throw invalid("FINALIZE_BUSY", `Cannot reserve final delivery: ${cause.message}`); });
  let staging;
  try {
    const records = await readSavedRevisions(join(workspace, "history", options.name), options.from);
    const selected = records[0].report;
    const checksPassed = selected.checks?.validation === "passed" && selected.checks?.compilation === "passed";
    const qualityGapOnly = selected.status === "failed" && checksPassed && selected.completion?.delivery === "complete";
    if (selected.command !== "author" || (selected.status !== "delivered" && !qualityGapOnly) || selected.completion?.delivery !== "complete") {
      throw invalid("FINALIZE_INCOMPLETE", "Select a successful authoring revision before finalizing.");
    }
    const files = await collectFiles(records, signal);
    if (selected.htmlInspection?.file?.sha256 && files.find((file) => file.kind === "html")?.sha256 !== selected.htmlInspection.file.sha256) {
      throw invalid("FINALIZE_SOURCE", "Selected HTML bytes changed after authoring or inspection.");
    }
    const requested = [...new Set(records.flatMap(({ report }) => report.completion?.requested ?? []))].filter((kind) => kind !== "exports");
    if (requested.some((kind) => !files.some((file) => file.kind === kind))) {
      throw invalid("FINALIZE_INCOMPLETE", "A requested export is missing; complete it before finalizing.");
    }
    staging = await mkdtemp(join(root, `.${options.name}-publish-`));
    const independent = await loadReviewRecords(records);
    const evidence = await loadEvidenceProjection(records);
    const projection = aggregateReviews(records, independent, { htmlSha256: files.find((file) => file.kind === "html").sha256, evidence });
    const projectedRecords = [{ ...records[0], report: projection }, ...records.slice(1)];
    const summary = deliverySummary(projection, projectedRecords, files, requested, workspace);
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
      completion: summary.completion, cleanup, diagnostics: [] };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

async function taskWorkspace(options) {
  if (!options.workspace || !options.name || !REVISION_ID.test(options.from ?? "")) {
    throw invalid("FINALIZE_WORKSPACE", "finalize requires --workspace, --name and --from <revision>.");
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
    sdk: { version: selected.sdk.version, integrity: selected.sdk.integrity }, theme: selected.theme,
    completion: { delivery: "complete", quality: reviewIssues.length ? "needs-user-decision" : selected.completion.quality, requested, completed: requested },
    reviewRecords: selected.reviewRecords,
    evidenceRecords: selected.evidenceRecords,
    checks: selected.checks, qualityCoverage: selected.qualityCoverage ?? null, sources,
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
    visual: { scope: "Only the recorded frames and display surfaces were reviewed; intermediate image files are temporary.",
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
  return ["# FlowSVG delivery", "", `Delivery: ${report.completion.delivery}`, `Quality: ${report.completion.quality}`,
    `Selected revision: ${report.selectedRevision}`, `Source SHA-256: ${report.inputSha256}`, "", "## Files", "",
    ...report.artifacts.map((item) => `- [${item.path.replaceAll("[", "\\[").replaceAll("]", "\\]")}](<${item.path}>)${item.sha256 ? ` — SHA-256 ${item.sha256}` : ""}`),
    "", "## Checks", "", ...Object.entries(report.checks).map(([key, value]) => `- ${key}: ${value}`),
    "", "## Required quality coverage", "", `Status: ${report.qualityCoverage?.status ?? report.completion.quality}`,
    ...(report.qualityCoverage?.required ?? []).map((item) => `- ${item.id}: ${item.status}${item.reason ? ` — ${item.reason}` : ""}`),
    "", "## HTML inspection", "", `Status: ${report.htmlInspection?.status ?? "not-run"}`,
    `HTML states viewed: ${report.htmlInspection?.coverage?.viewed ?? 0}/${report.htmlInspection?.coverage?.requested ?? 0}`,
    "", "## Unresolved issues", "", ...report.diagnostics.map((item) => `- ${item.code}: ${item.reason}`),
    ...[...new Set([...report.visual.frames, ...report.visual.surfaces].flatMap((item) => item.issues.map((issue) => issue.reason)))].map((reason) => `- Visual review: ${reason}`),
    "", `Reviewed frames: ${report.visual.frames.length}; reviewed display surfaces: ${report.visual.surfaces.length}.`,
    report.visual.scope, ""].join("\n");
}

async function replaceDelivery(staging, destination) {
  let backup;
  try {
    const existing = await lstat(destination);
    if (!existing.isDirectory() || existing.isSymbolicLink()) throw invalid("FINALIZE_DESTINATION", "Final destination must be a real directory.");
    const report = JSON.parse(await readFile(join(destination, "report.json"), "utf8"));
    const inputHash = report.command === "finalize" ? report.inputSha256 : report.input?.sha256;
    if (!["author", "finalize"].includes(report.command) || report.status !== "delivered" || !/^[a-f0-9]{64}$/u.test(inputHash ?? "")) {
      throw invalid("FINALIZE_DESTINATION", "Existing directory is not a FlowSVG final delivery.");
    }
    backup = `${staging}-previous`;
    await rename(destination, backup);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  try { await rename(staging, destination); }
  catch (error) { if (backup) await rename(backup, destination); throw error; }
  if (backup) await rm(backup, { recursive: true, force: true });
}

async function cleanupWorkspace(workspace, keep) {
  if (keep) return { status: "retained", reason: "Explicit --keep-work request." };
  try { await rm(workspace, { recursive: true }); return { status: "removed" }; }
  catch (error) { return { status: "failed", reason: error.message }; }
}

function invalid(code, reason) {
  return new ToolError("finalize", code, reason, "Keep the task workspace and previous delivery; resolve the reported cause before retrying.");
}
