/** Compute required checks from the files and display surfaces selected for this delivery. */
import { hasFormalReviewRequest } from "./formal-review.mjs";
import { surfaceKey } from "./evidence-records.mjs";
import { stateMatchesPoint } from "./review-contract.mjs";

const STATIC_FORMATS = new Set(["svg", "png"]);
const THEME_BACKDROPS = { light: "#ffffff", dark: "#111827" };

/** Update the factual coverage and independent quality result after all authoring stages. */
export function updateQualityCoverage(report) {
  if (!hasFormalReviewRequest(report)) {
    report.formalReview = { status: "not-requested" };
    delete report.completion.quality;
    delete report.qualityCoverage;
    return;
  }
  const required = [
    structuralCheck("validation", report.checks.validation),
    structuralCheck("compilation", report.checks.compilation)
  ];
  const historicalIssues = [...invalidReviewIssues(report), ...(report.visual?.viewedFrames ?? []).flatMap((frame) =>
    (frame.issues ?? []).map((issue) => ({ ...issue, sourceRevision: frame.sourceRevision, id: frame.id, kind: "visual" })))];
  if (historicalIssues.length) required.push({ id: "review-issues", kind: "review", status: "unresolved-issues", issues: historicalIssues });
  if (report.completion.requested.includes("html")) required.push(htmlCheck(report));
  for (const format of STATIC_FORMATS) if (report.completion.requested.includes(format)) {
    required.push(...staticChecks(report, format));
  }
  if (report.completion.requested.includes("exports")) {
    const exports = [...report.exports, ...(report.inheritedExports ?? [])].filter((item) => STATIC_FORMATS.has(item.format));
    for (const format of STATIC_FORMATS) if (exports.some((item) => item.format === format)) required.push(...staticChecks(report, format));
    if (!exports.length) required.push({ id: "exports", kind: "artifact", status: "incomplete", reason: "The requested named static exports were not produced." });
  }
  const status = summarize(required);
  report.qualityCoverage = {
    schemaVersion: 1, status, required,
    completed: required.filter((item) => item.status === "passed").map((item) => item.id),
    incomplete: required.filter((item) => item.status === "incomplete").map((item) => item.id),
    unresolvedIssues: required.filter((item) => item.status === "unresolved-issues").map((item) => item.id)
  };
  report.completion.quality = status;
  report.formalReview = { ...report.formalReview, status: required.filter((item) => item.kind !== "review").every((item) => item.coverageComplete ?? item.status === "passed") ? "complete" : "incomplete",
    meaning: "Registered viewing and coverage only; design conclusions belong to the viewer." };
}

/** Image failure cannot resolve an observed issue, even when that image no longer contributes viewing coverage. */
function invalidReviewIssues(report) {
  const saved = (report.reviewRecords?.invalidSaved ?? []).flatMap((item) => (item.review.issues ?? [])
    .map((issue) => ({ ...issue, sourceRevision: item.sourceRevision, evidenceId: item.evidenceId, kind: "artifact" })));
  const independent = (report.reviewRecords?.records ?? []).flatMap((record) => (record.invalid ?? []).flatMap((item) => item.entry.issues
    .map((issue) => ({ ...issue, sourceRevision: record.subject.sourceRevision, reviewRecord: record.id, id: item.id, kind: item.kind }))));
  return [...saved, ...independent];
}

function structuralCheck(id, checkStatus) {
  return { id, kind: "structural", status: checkStatus === "passed" ? "passed" : "incomplete", check: checkStatus };
}

function htmlCheck(report) {
  const inspection = report.htmlInspection;
  if (!inspection) return { id: "html", kind: "html", status: "incomplete", reason: "The actual diagram.html file was not inspected." };
  const states = inspection.states ?? [];
  const viewed = inspection.viewedStates ?? [];
  const issues = viewed.flatMap((state) => state.issues ?? []);
  const requiredPoints = inspection.plan?.points;
  const requiredStates = requiredPoints?.length ?? states.length;
  const coveredStates = requiredPoints ? requiredPoints.filter((point) => viewed.some((state) => stateMatchesPoint(state, point))).length
    : states.filter((state) => viewed.some((entry) => entry.id === state.id && entry.timeMs === state.timeMs)).length;
  const complete = report.checks.html === "reviewed" && coveredStates >= requiredStates && !issues.length;
  return { id: "html", kind: "html", status: issues.length ? "unresolved-issues" : complete ? "passed" : "incomplete",
    coverageComplete: report.checks.html === "reviewed" && coveredStates >= requiredStates,
    fileSha256: inspection.file?.sha256, sourceRevision: inspection.sourceRevision,
    requestedStates: requiredStates, viewedStates: coveredStates, display: inspection.display,
    reason: complete ? undefined : inspection.reason ?? "Actual HTML states are not fully viewed." };
}

function staticChecks(report, format) {
  const artifacts = [...report.artifacts, ...(report.inheritedArtifacts ?? [])].filter((item, index, all) => item.kind === format
    && all.findIndex((candidate) => candidate.kind === format && candidate.relativePath === item.relativePath) === index);
  if (!artifacts.length) return [{ id: `artifact-${format}`, kind: "artifact", format, status: "incomplete", reason: `Requested ${format.toUpperCase()} was not produced.` }];
  return artifacts.flatMap((artifact) => {
    const evidence = (report.artifactEvidence?.items ?? []).filter((item) => item.artifactId === artifact.artifactId);
    const surfaces = evidence.length ? evidence : [{
      artifactId: artifact.artifactId, artifactSha256: artifact.sha256,
      displayWidth: artifact.intrinsicWidth, displayHeight: artifact.intrinsicHeight,
      backdrop: THEME_BACKDROPS[report.theme] ?? THEME_BACKDROPS.light, status: "not-run"
    }];
    const groups = new Map();
    for (const surface of surfaces) {
      const key = surfaceKey(surface);
      groups.set(key, [...(groups.get(key) ?? []), surface]);
    }
    return [...groups.values()].map((candidates, index) => {
      const surface = candidates.find((item) => item.status === "captured")
        ?? candidates.find((item) => item.operationStatus === "invalid") ?? candidates[0];
      const reviews = (report.visual.artifactReviews ?? []).filter((item) => candidates.some((candidate) => candidate.status === "captured"
        && typeof candidate.evidenceId === "string" && item.evidenceId === candidate.evidenceId));
      const issues = reviews.flatMap((review) => review.issues ?? []);
      return { id: `artifact-${format}-${artifact.artifactId}-${index + 1}`, kind: "artifact", format,
        artifactId: artifact.artifactId, artifactSha256: artifact.sha256, displayWidth: surface.displayWidth,
        displayHeight: surface.displayHeight, backdrop: surface.backdrop, status: issues.length ? "unresolved-issues" : reviews.length ? "passed" : "incomplete",
        coverageComplete: reviews.length > 0,
        evidenceId: surface.evidenceId ?? null, evidenceStatus: ["invalid", "not-verified"].includes(surface.operationStatus)
          ? surface.operationStatus : surface.status,
        reason: reviews.length ? undefined : artifactReason(report, artifact, surface) };
    });
  });
}

/** Describe the missing capture or viewing step for the exact required display surface. */
function artifactReason(report, artifact, surface) {
  const description = `Artifact ${artifact.artifactId} at ${surface.displayWidth} x ${surface.displayHeight} CSS pixels on backdrop ${surface.backdrop}`;
  const settings = JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: surface.displayWidth, backdrop: surface.backdrop }] });
  if (surface.operationStatus === "invalid") return `${description} has invalid evidence: ${surface.reason} Recapture this surface: save display settings ${settings}; run evidence --from ${report.revision?.id ?? artifact.artifactSourceRevision} --name <same-name> --output <same-history-root> --artifact-preview-settings <settings.json> --browser <prepared-executable>, then view and independently review the replacement PNG.`;
  if (surface.status === "captured" && surface.evidenceId) return `${description} has captured evidence ${surface.evidenceId}, but that evidence has not been viewed. Open the saved evidence PNG and submit --artifact-review with its exact evidenceId, SHA-256 and observations.`;
  const hasPreview = (report.visual.capturedFrames?.length ?? 0) + (report.visual.viewedFrames?.length ?? 0) > 0;
  const viewport = report.visual.viewport;
  const preview = hasPreview ? ` Ordinary preview${viewport ? ` ${viewport.width} x ${viewport.height}` : ""} samples SDK frames and does not cover this actual artifact surface; it is not artifact evidence.` : "";
  return `${description} has no captured artifact evidence.${preview} Save explicit settings ${settings}; run evidence --from ${report.revision?.id ?? artifact.artifactSourceRevision} --name <same-name> --artifact-preview-settings <settings.json> --browser <prepared-executable>, view the saved evidence PNG, then submit --artifact-review.`;
}

function summarize(required) {
  if (required.some((item) => item.status === "unresolved-issues")) return "unresolved-issues";
  return required.every((item) => item.status === "passed") ? "passed" : "incomplete";
}
