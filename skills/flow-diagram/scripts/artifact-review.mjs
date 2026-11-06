/** Later model attestations bind explicit evidence revisions to unchanged original static files. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ToolError } from "./runtime.mjs";
import { digest, inspectImage, loadArtifactRevision, readArtifact, saveComplete, scopedFile } from "./artifact-identity.mjs";
import { evidenceIdentity, updateArtifactCoverage } from "./artifact-evidence.mjs";

import { validateReviewInput } from "./review-contract.mjs";

/** Attest only to listed existing evidence; other sizes, previews and new exports remain unviewed. */
export async function recordArtifactReview(report, options) {
  const path = options["artifact-review"];
  if (!path) return;
  report.stage = "artifact-review";
  try {
    const parent = report.provenance?.parent;
    if (!parent) throw new Error("Artifact review requires its explicit evidence revision as parent.");
    const { directory, source } = await loadArtifactRevision(report, parent.id);
    const bytes = await readFile(path);
    const review = JSON.parse(bytes.toString("utf8"));
    validateReviewInput(review, "artifact");
    const settingsFile = await scopedFile(directory, join(directory, "artifact-preview-settings.json"));
    if (digest(settingsFile.bytes) !== source.artifactEvidence?.settingsSha256
      || JSON.stringify(JSON.parse(settingsFile.bytes.toString("utf8"))) !== JSON.stringify(source.artifactEvidence.settings)) throw new Error("Saved artifact evidence settings changed after capture.");
    const reviewed = [];
    for (const item of review.items) {
      const evidence = source.artifactEvidence?.items?.find((candidate) => candidate.evidenceId === item.evidenceId);
      await validateEvidence(report, parent.id, directory, source, evidence, item);
      reviewed.push({ ...evidence, reviewer: review.reviewer, reviewedIn: report.revision.id,
        observations: item.observations, issues: item.issues });
    }
    const savedPath = join(report.revision.directory, "artifact-review.json");
    await saveComplete(savedPath, bytes);
    report.artifacts.push({ kind: "artifact-review", path: savedPath, sha256: digest(bytes) });
    report.visual.artifactReviews = [...(report.visual.artifactReviews ?? []), ...reviewed];
    report.artifactEvidence = { ...report.artifactEvidence, status: source.artifactEvidence.status, settings: source.artifactEvidence.settings,
      settingsSha256: source.artifactEvidence.settingsSha256, items: source.artifactEvidence.items };
    report.checks.artifactVisual = "reviewed";
    report.visual.artifactReview = { reviewer: review.reviewer, evidenceRevision: parent.id,
      scope: "Only identified target-size evidence images were attested as viewed; sampled frames and other surfaces remain unviewed." };
    updateArtifactCoverage(report, [...source.artifactEvidence.items, ...report.artifactEvidence.items]);
    for (const item of reviewed) for (const issue of item.issues) report.diagnostics.push({ severity: "warning", stage: "artifact-review",
      code: "ARTIFACT_VISUAL_ISSUE", location: item.evidenceId, timeMs: item.timeMs, reason: issue.reason,
      nextStep: `${issue.nextStep} Wait for the user's decision before changing the diagram.` });
    if (reviewed.some((item) => item.issues.length)) report.completion.quality = "needs-user-decision";
  } catch (cause) {
    throw new ToolError("artifact-review", "ARTIFACT_REVIEW_INVALID", cause.message,
      "Actually view registered evidence and submit its exact IDs, hashes and observations with the evidence revision as parent.", path, cause);
  }
}



/** Check both revision scopes, original artifact context, captured bytes and registered display settings. */
export async function validateEvidence(report, parentId, directory, source, evidence, reviewed) {
  if (!evidence || evidence.status !== "captured" || evidence.evidenceRevision !== parentId || evidence.sha256 !== reviewed.sha256
    || evidenceIdentity(evidence) !== evidence.evidenceId) throw new Error("Evidence is unregistered, changed, or belongs to another evidence parent.");
  const { artifact } = await readArtifact(report, evidence.artifactSourceRevision, evidence.artifactId);
  for (const key of ["sourceSha256", "sdk", "timeMs", "theme", "reducedMotion", "background", "camera", "intrinsicWidth", "intrinsicHeight", "viewBox"]) {
    if (JSON.stringify(evidence[key]) !== JSON.stringify(artifact[key])) throw new Error(`Evidence ${key} differs from the original artifact.`);
  }
  if (artifact.sha256 !== evidence.artifactSha256 || !source.artifactEvidence.settings?.items?.some((item) => item.artifactId === evidence.artifactId
    && item.displayWidth === evidence.displayWidth && item.backdrop === evidence.backdrop)) throw new Error("Evidence display settings differ from its registered request.");
  if (!source.artifacts?.some((item) => item.kind === "artifact-preview" && item.evidenceId === evidence.evidenceId
    && item.path === evidence.path && item.sha256 === evidence.sha256)) throw new Error("Evidence image is not registered in its original report.");
  try {
    const file = await scopedFile(directory, evidence.path);
    const dimensions = inspectImage("png", file.bytes);
    if (digest(file.bytes) !== evidence.sha256 || dimensions.intrinsicWidth !== evidence.displayWidth || dimensions.intrinsicHeight !== evidence.displayHeight) throw new Error("Evidence image bytes or display dimensions changed after capture.");
  } catch (cause) {
    if (cause.message.includes("escapes")) throw cause;
    throw new ToolError("artifact-review", "EVIDENCE_IMAGE_INVALID", cause.message,
      "Keep the immutable evidence registration; recapture and actually review the affected surface.", evidence.evidenceId, cause);
  }
}
