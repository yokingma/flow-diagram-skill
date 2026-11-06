/** Record model-supplied inspection evidence in a new revision without changing historical reports. */
import { readFile, realpath, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, sep } from "node:path";
import { ToolError } from "./runtime.mjs";

import { validateReviewInput } from "./review-contract.mjs";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Validate image identity and unchanged rendering inputs; the submitting model attests to actual viewing. */
export async function recordVisualReview(report, options) {
  if (!options["visual-review"]) return;
  report.stage = "visual-review";
  try {
    const parent = report.provenance?.parent;
    if (!parent) throw new Error("Visual review requires an explicit --from or --parent source revision.");
    const source = JSON.parse(await readFile(join(parent.directory, "report.json"), "utf8"));
    if (source.input?.sha256 !== report.input.sha256 || source.theme !== report.theme
      || source.sdk?.version !== report.sdk.version || source.sdk?.integrity !== report.sdk.integrity) {
      throw new Error("The reviewed source must use the same saved input, theme and SDK baseline as this revision.");
    }
    const bytes = await readFile(options["visual-review"]);
    const review = JSON.parse(bytes.toString("utf8"));
    validateReviewInput(review, "visual");
    const viewedFrames = [];
    for (const reviewed of review.frames) viewedFrames.push(await validateFrame(parent, source, reviewed));
    const path = join(report.revision.directory, "visual-review.json");
    await writeFile(path, bytes, { flag: "wx" });
    report.artifacts.push({ kind: "visual-review", path });
    report.visual = { ...report.visual, status: "review-recorded", viewedFrames,
      review: { reviewer: review.reviewer, sourceRevision: parent.id, sourceReport: join(parent.directory, "report.json"),
        recordedAt: new Date().toISOString(), attestation: "The submitting model states it actually viewed the identified source images.",
        scope: "Only listed source images were viewed. Newly generated images and other times remain unviewed." } };
    report.checks.visual = "reviewed";
    for (const frame of viewedFrames) for (const issue of frame.issues) report.diagnostics.push({ severity: "warning", stage: "visual-review", code: "VISUAL_REVIEW_ISSUE",
      location: `${parent.id}/${frame.id}`, timeMs: frame.timeMs, reason: issue.reason, nextStep: `${issue.nextStep} Wait for the user's decision before changing the diagram.` });
    if (viewedFrames.some((frame) => frame.issues.length)) report.completion.quality = "needs-user-decision";
    else if (source.visual?.capturedFrames?.length > 0
      && viewedFrames.length === source.visual.capturedFrames.length
      && source.artifactEvidence?.status !== "awaiting-review") report.completion.quality = "passed";
  } catch (cause) {
    throw new ToolError("visual-review", "VISUAL_REVIEW_INVALID", cause.message,
      "View the actual source screenshots and provide their hashes and observations; record valid evidence in a new revision with the explicit source parent.", options["visual-review"], cause);
  }
}

/** A nonempty explicit attestation is required; arbitrary filenames alone are not inspection evidence. */


/** Retain original capture paths and timing so a new review cannot imply new images were viewed. */
export async function validateFrame(parent, source, reviewed) {
  const captured = source.visual?.capturedFrames?.find((frame) => frame.id === reviewed.id);
  if (!captured || captured.sha256 !== reviewed.sha256) throw new Error(`Frame ${reviewed.id} does not match a captured source image.`);
  const [directory, path] = await Promise.all([realpath(parent.directory), realpath(captured.path)]);
  if (!path.startsWith(directory + sep)) throw new Error(`Frame ${reviewed.id} is outside the explicit source revision.`);
  if (digest(await readFile(path)) !== reviewed.sha256) throw new Error(`Frame ${reviewed.id} bytes changed after capture.`);
  return { id: captured.id, path, timeMs: captured.timeMs, view: captured.view, sha256: captured.sha256,
    sourceRevision: parent.id, observations: reviewed.observations, issues: reviewed.issues };
}
