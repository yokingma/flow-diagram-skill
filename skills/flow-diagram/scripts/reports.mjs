/** Append-only diagram revisions. Each invocation owns one atomically allocated version directory. */
import { mkdir, readdir, readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { ToolError } from "./runtime.mjs";

/** Reserve a fresh revision; failed and interrupted revisions keep their numbers. */
export async function allocateRevision(outputRoot, name, parent = null) {
  if (!name || name === "." || name === ".." || /[<>:"/\\|?*\x00-\x1f]/u.test(name) || /[. ]$/u.test(name) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu.test(name)) {
    throw new ToolError("save", "DIAGRAM_NAME", "Diagram name is not a portable directory name", "Use a nonempty name without path separators or reserved filename characters.", "name");
  }
  const directory = resolve(outputRoot, name);
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory);
  let number = Math.max(0, ...entries.map((entry) => /^v\d+$/u.test(entry) ? Number(entry.slice(1)) : 0)) + 1;
  while (true) {
    const id = `v${String(number).padStart(3, "0")}`;
    const versionDirectory = join(directory, id);
    try { await mkdir(versionDirectory); return { id, number, directory: versionDirectory, parent }; }
    catch (error) { if (error.code !== "EEXIST") throw error; number += 1; }
  }
}

/** Create the shared structured report; later stages append only facts actually observed. */
export function createReport(command, revision, input) {
  return {
    schemaVersion: 1, toolVersion: "0.1.0", command, status: "pending", stage: "save",
    revision, theme: null, completion: { delivery: "not-requested", quality: "incomplete", requested: [], completed: [] }, sources: [{ path: resolve(input), kind: "diagram-json" }], sdk: null,
    checks: { validation: "not-run", compilation: "not-run", layout: "not-run", visual: "not-run", html: "not-run" },
    diagnostics: [], artifacts: [], exports: [], artifactEvidence: { status: "not-requested", items: [] }, visual: { status: "not-run", viewedFrames: [], artifactReviews: [] },
    provenance: { parent: null, originalIssues: [] }, userDecisions: [], samples: []
  };
}

/** Preserve the input bytes before environment preparation or parsing. */
export async function saveDraft(report, input) {
  const bytes = await readFile(input);
  const path = join(report.revision.directory, "diagram.json");
  await writeFile(path, bytes, { flag: "wx" });
  report.artifacts.push({ kind: "json", path });
  report.input = { path: resolve(input), sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
  if (report.completion.requested.includes("json") && !report.completion.completed.includes("json")) report.completion.completed.push("json");
  return bytes.toString("utf8");
}

/** Translate errors to the machine-readable diagnostic contract. */
export function recordFailure(report, error) {
  if (["pending", "complete"].includes(report.completion?.delivery)) report.completion.delivery = "incomplete";
  report.status = error.name === "AbortError" ? "cancelled" : "failed";
  report.stage = error.stage || report.stage;
  report.diagnostics.push({
    severity: "error", stage: report.stage, code: error.code || "OPERATION_FAILED", location: error.location || "$",
    reason: error.message || String(error), nextStep: error.nextStep || "Review the saved draft and diagnostic; retry in a new revision after resolving the cause."
  });
}

/** Persist JSON as the factual source and derive the readable report from the same record. */
export async function saveReport(report) {
  const directory = report.revision.directory;
  const jsonPath = join(directory, "report.json");
  const markdownPath = join(directory, "report.md");
  report.artifacts = [...report.artifacts.filter((artifact) => !["report-json", "report-markdown"].includes(artifact.kind)),
    { kind: "report-json", path: jsonPath }, { kind: "report-markdown", path: markdownPath }];
  const lines = ["# FlowSVG authoring report", "", `Status: ${report.status}`, `Stage: ${report.stage}`,
    `Revision: ${report.revision.id}`, `Theme: ${report.theme ?? "not resolved"}`, `Parent: ${report.revision.parent ?? "none"}`,
    `SDK: ${report.sdk ? `${report.sdk.version} (${report.sdk.source})` : "not loaded"}`, "", "## Completion", "",
    `- delivery: ${report.completion.delivery}`, `- quality: ${report.completion.quality}`,
    `- requested: ${report.completion.requested.join(", ") || "none"}`,
    `- completed: ${report.completion.completed.join(", ") || "none"}`, "", "## Sources", ""];
  for (const source of report.sources) lines.push(`- ${source.kind}: ${source.reference ?? source.path}${source.scope ? ` (scope: ${source.scope})` : ""}${source.description ? ` — ${source.description}` : ""}`);
  if (report.input) lines.push(`Input SHA-256: ${report.input.sha256}`);
  lines.push("", "## Checks", "");
  for (const [check, status] of Object.entries(report.checks)) lines.push(`- ${check}: ${status}`);
  lines.push("", "## Diagnostics", "");
  for (const diagnostic of report.diagnostics) {
    lines.push(`- ${diagnostic.severity} / ${diagnostic.stage} / ${diagnostic.code} / ${diagnostic.location}${diagnostic.timeMs === undefined ? "" : ` / ${diagnostic.timeMs}ms`}: ${diagnostic.reason} Next: ${diagnostic.nextStep}`);
    if (diagnostic.issueId) lines.push(`  Source: ${diagnostic.sourceRevision}; issueId: ${diagnostic.issueId}; warningKey: ${diagnostic.warningKey}; context: ${JSON.stringify(diagnostic.issueContext)}`);
    if (diagnostic.impact) lines.push(`  Impact: ${diagnostic.impact}`);
    if (diagnostic.candidates) lines.push(`  Candidates: ${diagnostic.candidates.join("; ")}`);
  }
  if (report.layout) lines.push("", "## Layout coverage", "", `Method: ${report.layout.method}; continuous coverage: ${report.layout.continuousCoverage}`,
    ...report.layout.samples.map((sample) => `- ${sample.timeMs}ms; focus: ${sample.focusTarget ?? "full view"}`),
    ...(report.layout.warningGroups?.length ? ["", "### Warning groups", "", ...report.layout.warningGroups.map((group) => `- ${group.code} / ${group.objectId}: ${group.count} records; ${group.records.map((record) => `${record.timeMs}ms ${record.issueId ?? "no issueId"}`).join(", ")}`)] : []));
  if (report.qualityCoverage) {
    lines.push("", "## Required quality coverage", "", `Status: ${report.qualityCoverage.status}`);
    for (const item of report.qualityCoverage.required) lines.push(`- ${item.id}: ${item.status}${item.reason ? ` — ${item.reason}` : ""}`);
  }
  if (!report.diagnostics.length) lines.push("No diagnostics recorded.");
  lines.push("", "## Visual coverage", "", `Status: ${report.visual.status}`,
    `Captured frames: ${report.visual.capturedFrames?.length ?? 0}`, `Viewed frames: ${report.visual.viewedFrames.length}`);
  if (report.visual.reason) lines.push(`Reason: ${report.visual.reason}`);
  if (report.visual.plan) {
    lines.push(`Preview scope: ${report.visual.plan.mode ?? "unspecified"}`, report.visual.plan.coverage, report.visual.plan.overviewProjection, `Omitted candidates: ${report.visual.plan.omitted.length}`);
    for (const point of report.visual.plan.points) lines.push(`- planned ${point.id}: ${point.view} at ${point.timeMs} ms (${point.reasons.join(", ")})`);
    for (const point of report.visual.plan.omitted) lines.push(`- omitted: ${point.view} at ${point.timeMs} ms (${point.reasons.join(", ")})`);
  }
  for (const frame of report.visual.capturedFrames || []) lines.push(`- captured ${frame.id}: ${frame.path} at ${frame.timeMs} ms; SHA-256 ${frame.sha256}; font ready: ${frame.fonts.ready}; glyph coverage: ${frame.fonts.glyphCoverage}; font issues: ${frame.fonts.issues.join(", ") || "none observed"}`);
  if (report.visual.review) lines.push(`Reviewer: ${report.visual.review.reviewer}`, `Source report: ${report.visual.review.sourceReport}`, report.visual.review.scope);
  for (const frame of report.visual.viewedFrames) lines.push(`- viewed ${frame.id}: ${frame.path} at ${frame.timeMs} ms; SHA-256 ${frame.sha256}; ${JSON.stringify(frame.observations)}`);
  if (report.htmlPage) lines.push("", "## HTML page", "", `Source HTML SHA-256: ${report.htmlPage.source.sha256}`,
    `Delivered HTML SHA-256: ${report.htmlPage.outputSha256}`, `Diagram SHA-256: ${report.htmlPage.inputSha256}`,
    `Playback HTML SHA-256: ${report.htmlPage.playerSha256}`);
  if (report.htmlInspection) {
    lines.push("", "## HTML inspection", "", `Status: ${report.htmlInspection.status}`, `Source revision: ${report.htmlInspection.sourceRevision}`,
      `HTML SHA-256: ${report.htmlInspection.file?.sha256 ?? "not recorded"}`, `Display: ${JSON.stringify(report.htmlInspection.display ?? {})}`);
    if (report.htmlInspection.reason) lines.push(`Reason: ${report.htmlInspection.reason}`);
    if (report.htmlInspection.plan) lines.push(`Inspection scope: ${report.htmlInspection.plan.coverage}`);
    if (report.htmlInspection.coverage) lines.push(`Coverage: requested ${report.htmlInspection.coverage.requested}; viewed ${report.htmlInspection.coverage.viewed}; unviewed ${report.htmlInspection.coverage.unviewed}`);
    for (const state of report.htmlInspection.states ?? []) lines.push(`- captured ${state.id}: ${state.timeMs}ms; paused ${state.paused}; offline ${state.offline}; SHA-256 ${state.sha256}`);
    for (const state of report.htmlInspection.viewedStates ?? []) lines.push(`- viewed ${state.id}: ${state.timeMs}ms; SHA-256 ${state.sha256}; ${JSON.stringify(state.observations)}`);
    if (report.htmlInspection.review) lines.push(`Reviewer: ${report.htmlInspection.review.reviewer}`, report.htmlInspection.review.scope);
  }
  if (report.exportManifest) lines.push("", "## Export manifest", "", `Status: ${report.exportManifest.status}`,
    `Original source: ${report.exportManifest.source}`, `Saved bytes: ${report.exportManifest.path}`,
    `Manifest SHA-256: ${report.exportManifest.sha256}`, `Settings: ${JSON.stringify(report.exportManifest.settings ?? {})}`,
    `Parsed manifest: ${JSON.stringify(report.exportManifest.manifest ?? null)}`);
  for (const item of report.provenance.exportManifests ?? []) lines.push(`Historical manifest: ${item.revision}; ${item.source}; SHA-256 ${item.sha256}; ${item.status}`);
  lines.push("", "## Static exports", "");
  for (const item of report.exports) lines.push(`- ${item.name}.${item.format}: ${item.status}; ${item.timeMs}ms; background ${item.background}; ${item.width ?? "?"} x ${item.height ?? "?"}; ${item.artifactId ?? "no artifact"}; path ${item.path ?? "not assigned"}${item.error ? `; ${item.error.code}: ${item.error.reason}` : ""}`);
  lines.push("", "## Artifact evidence", "", `Status: ${report.artifactEvidence.status}`);
  if (report.artifactEvidence.reason) lines.push(`Reason: ${report.artifactEvidence.reason}`);
  for (const item of report.artifactEvidence.items) lines.push(`- ${item.evidenceId ?? "not generated"}: ${item.status}; artifact ${item.artifactId} from ${item.artifactSourceRevision}; evidence revision ${item.evidenceRevision}; ${item.displayWidth} x ${item.displayHeight}; backdrop ${item.backdrop}; artifact SHA-256 ${item.artifactSha256}; evidence SHA-256 ${item.sha256 ?? "none"}`);
  for (const item of report.visual.artifactReviews ?? []) lines.push(`- viewed artifact evidence ${item.evidenceId}: artifact from ${item.artifactSourceRevision}; evidence from ${item.evidenceRevision}; reviewer ${item.reviewer}; ${JSON.stringify(item.observations)}`);
  if (report.artifactEvidenceCoverage) lines.push(`Target-size surfaces requested: ${report.artifactEvidenceCoverage.requested}; viewed: ${report.artifactEvidenceCoverage.viewed}; unviewed: ${report.artifactEvidenceCoverage.unviewed}`);
  lines.push("", "## Original parent issues", "");
  for (const issue of report.provenance.originalIssues) lines.push(`- ${issue.revision} / ${issue.code} / ${issue.location}: ${issue.reason}${issue.issueId ? `; issueId: ${issue.issueId}; warningKey: ${issue.warningKey}` : ""}`);
  lines.push("", "## User decisions", "");
  for (const decision of report.userDecisions) lines.push(`- ${decision.recordedIn} / ${decision.sourceRevision ? `${decision.sourceRevision} / ${decision.issueId}` : decision.issue}: ${decision.decision} — ${decision.reason}${decision.issueContext ? `; context: ${JSON.stringify(decision.issueContext)}` : ""}`);
  lines.push("", "## Saved artifacts", "");
  for (const artifact of report.artifacts) lines.push(`- ${artifact.kind}: ${basename(artifact.path)}`);
  await writeFile(`${markdownPath}.tmp`, lines.join("\n") + "\n");
  await rename(`${markdownPath}.tmp`, markdownPath);
  await writeFile(`${jsonPath}.tmp`, JSON.stringify(report, null, 2) + "\n");
  await rename(`${jsonPath}.tmp`, jsonPath);
}
