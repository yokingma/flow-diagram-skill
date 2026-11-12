/** Project saved authoring reports onto stdout; detailed rendering state stays in its registered file. */
import { access } from "node:fs/promises";
import { constants } from "node:fs";

/** Preserve inline operation data when no matching full report exists; projection never writes files. */
export async function commandResult(result) {
  if (result.command === "author") return authoringResult(result);
  if (result.command === "review") return reviewResult(result);
  const detailsPath = result.record?.path ?? result.artifacts?.find((item) => ["report-json", "review-template"].includes(item.kind))?.path;
  if (detailsPath) return { ...result, ...await readableDetails(detailsPath) };
  return result;
}

async function authoringResult(report) {
  const artifact = report.artifacts?.find((item) => item.kind === "report-json");
  if (!artifact && !report.revision) return report;
  const details = await readableDetails(artifact?.path);
  return {
    schemaVersion: report.schemaVersion, toolVersion: report.toolVersion,
    command: report.command, status: report.status, stage: report.stage,
    input: report.input, theme: report.theme,
    sdk: report.sdk ? { version: report.sdk.version, integrity: report.sdk.integrity } : null,
    ...(report.workingDraft ? { workingDraft: report.workingDraft } : { revision: report.revision }),
    ...details, checks: report.checks, completion: report.completion,
    exports: report.exports,
    ...(report.formalReview ? { formalReview: report.formalReview } : {}),
    diagnostics: report.diagnostics?.map(actionableDiagnostic) ?? [],
    artifacts: report.artifacts?.map(({ kind, path, artifactId, sha256 }) => ({ kind, path, artifactId, sha256 })) ?? [],
    ...(report.finalDelivery ? { finalDelivery: report.finalDelivery } : {})
  };
}

async function reviewResult(report) {
  const details = await readableDetails(report.record?.path);
  const { htmlInspection, visual, ...operation } = report;
  return { ...operation, ...details,
    ...(visual ? { visual: { status: visual.status, viewedFrames: visual.viewedFrames, artifactReviews: visual.artifactReviews } } : {}),
    ...(htmlInspection ? { htmlInspection: {
    status: htmlInspection.status, sourceRevision: htmlInspection.sourceRevision,
    file: htmlInspection.file, display: htmlInspection.display, coverage: htmlInspection.coverage,
    reason: htmlInspection.reason, review: htmlInspection.review
  } } : {}) };
}

function actionableDiagnostic({ severity, stage, code, location, objectId, reason, nextStep, issueId }) {
  return { severity, stage, code, location, objectId, reason, nextStep, issueId };
}

async function readableDetails(path) {
  if (!path) return {};
  try {
    await access(path, constants.R_OK);
    return { detailsPath: path };
  } catch (error) {
    return { detailsUnavailable: { path, reason: error.message } };
  }
}
