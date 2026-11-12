/** Coordinate current drafts and explicit checkpoints through SDK checks, rendering and recoverable publication. */
import { allocateWorkingDraft, bindWorkingArtifacts, finishWorkingDraft, releaseWorkingDraft, reserveDraftOperation } from "./working-draft.mjs";
import { configureFormalReview, hasFormalReviewRequest } from "./formal-review.mjs";
import { readHtmlPage, inheritHtmlPage } from "./html-page.mjs";
import { preflightReviews } from "./review-preflight.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { prepareRuntime, importSdk, ToolError } from "./runtime.mjs";
import { allocateRevision, assertDiagramName, createReport, saveDraft, recordFailure, saveReport } from "./reports.mjs";
import { resolveRevisionInput, inheritRevision, inheritDeliveryContext } from "./revisions.mjs";
import { checkDocument } from "./document-checks.mjs";
import { diagnoseLayout } from "./diagnostics.mjs";
import { inheritExportRequest } from "./export-request.mjs";
import { deliverManifest } from "./export-manifest.mjs";
import { deliverStatic } from "./delivery.mjs";
import { deliverGif } from "./gif-delivery.mjs";
import { capturePreviews } from "./previews.mjs";
import { inspectDeliveredHtml, recordHtmlReview } from "./html-inspection.mjs";
import { recordVisualReview } from "./visual-review.mjs";
import { captureArtifactEvidence } from "./artifact-evidence.mjs";
import { recordArtifactReview } from "./artifact-review.mjs";
import { updateQualityCoverage } from "./quality-coverage.mjs";
import { publishFinalDelivery } from "./final-delivery.mjs";

/** Author one selected source; default runs replace current while explicit checkpoints remain immutable. */
export async function runRevision(options, signal, command = "author") {
  const report = createReport(command, null, options.input || options.from);
  if (command === "author") report.completion = { delivery: "pending", quality: "incomplete",
    requested: ["json", "html", ...(options.svg ? ["svg"] : []), ...(options.png ? ["png"] : []), ...(options.gif ? ["gif"] : []), ...(options["export-manifest"] ? ["exports"] : [])], completed: [] };
  let operation;
  let checkpointLock;
  configureFormalReview(report, options);
  try {
    const selectedHtmlPage = await readHtmlPage(options.html);
    await preflightReviews(options, { authoring: true, htmlPage: selectedHtmlPage });
    if (options.checkpoint || hasFormalReviewRequest(report)) {
      assertDiagramName(options.name || "diagram");
      const series = resolve(options.output || resolve(".diagrams", ".history"), options.name || "diagram");
      await mkdir(series, { recursive: true });
      checkpointLock = await reserveDraftOperation(series);
      report.revision = await allocateRevision(options.output || resolve(".diagrams", ".history"), options.name || "diagram",
        /^v\d{3,}$/u.test(options.from || options.parent || "") ? options.from || options.parent : null);
    }
    else {
      operation = await allocateWorkingDraft(options.output || resolve(".diagrams", ".history"), options.name || "diagram");
      report.revision = operation.revision;
      report.workingDraft = { id: "current", directory: operation.current };
    }
    const sourceOptions = operation?.previous && !options.from && !options.parent ? { ...options, parent: "current" } : options;
    const input = await resolveRevisionInput(report, sourceOptions);
    report.stage = "save";
    report.sources = [{ path: resolve(input), kind: "diagram-json" }];
    const text = await saveDraft(report, input);
    if (report.workingDraft && !options.from) report.workingDraft.editableSource = { path: report.input.path, sha256: report.input.sha256 };
    const parent = await inheritRevision(report, sourceOptions);
    if (command === "author") options = await inheritExportRequest(report, parent, options);
    const htmlPage = command === "author" ? await inheritHtmlPage(report, selectedHtmlPage) : null;
    if (options["sync-html"] && !htmlPage) throw new ToolError("html-page", "HTML_PAGE_INVALID", "--sync-html requires an explicit or inherited Agent HTML page.", "Select --html or a parent with an Agent page.", "sync-html");
    await saveReport(report);
    await saveSources(report, options.sources);
    signal?.throwIfAborted();
    report.stage = "environment";
    const runtime = await prepareRuntime(signal);
    report.sdk = runtime.sdk;
    report.environment = { ...runtime.environment, reused: runtime.reused };
    const sdk = await importSdk(runtime);
    const checked = checkDocument(report, sdk, text, options);
    if (!checked) return report;
    inheritDeliveryContext(report, parent, options);
    diagnoseLayout(report, { ...checked, sdk }, options);
    report.status = "validated";
    if (command === "author") {
      const context = { ...checked, runtime, options, signal, htmlPage };
      await deliverStatic(report, context);
      if (options["export-manifest"]) await deliverManifest(report, context);
      await deliverOptionalStages(report, context);
    }
  } catch (error) {
    const failure = report.stage === "save" && !(error instanceof ToolError)
      ? new ToolError("save", "DRAFT_SAVE_FAILED", error.message, "Check input readability, destination permissions and disk space; retry using a writable output directory.", options.output || options.input, error)
      : error;
    recordFailure(report, failure);
  } finally {
    try {
      if (report.workingDraft) await bindWorkingArtifacts(report);
      await finishReport(report);
      await finishWorkingDraft(report, operation);
      await publishFinalDelivery(report, options);
    }
    catch (error) {
      recordFailure(report, new ToolError("save", "FINAL_DELIVERY_FAILED", error.message, "Review the saved revision and retry the current draft or final delivery.", "finalDelivery", error));
      if (!operation || report.revision?.directory === operation.current) await finishReport(report);
    } finally { await releaseWorkingDraft(operation || (checkpointLock ? { lock: checkpointLock } : null)); }
  }
  return report;
}

/** Independent optional stages retain separate diagnostics; cancellation stops subsequent browser work. */
async function deliverOptionalStages(report, context) {
  let failureStage = report.exportFailureStage;
  const stages = [() => deliverGif(report, context), () => inspectDeliveredHtml(report, context), () => capturePreviews(report, context),
    () => recordVisualReview(report, context.options), () => recordHtmlReview(report, context.options), () => captureArtifactEvidence(report, context),
    () => recordArtifactReview(report, context.options)];
  for (const stage of stages) {
    try { await stage(); }
    catch (error) {
      if (context.signal?.aborted || error.name === "AbortError") throw error;
      recordFailure(report, error);
      failureStage = report.stage;
    }
  }
  delete report.exportFailureStage;
  if (failureStage) report.stage = failureStage;
  else report.status = "delivered";
}

/** Derive file completion independently of optional visual stages; report-write failure remains an explicit failure. */
async function finishReport(report) {
  if (!report.revision) return;
  if (report.completion.requested.length) report.completion.delivery = report.completion.requested
    .every((kind) => report.completion.completed.includes(kind)) ? "complete" : "incomplete";
  if (report.command === "author") updateQualityCoverage(report);
  try { await saveReport(report); }
  catch (error) {
    recordFailure(report, new ToolError("save", "REPORT_SAVE_FAILED", error.message, "Check destination permissions and free disk space; use another output directory."));
    report.artifacts = report.artifacts.filter((artifact) => !artifact.kind.startsWith("report-"));
  }
}

/** Source metadata records the author's evidence; the tool never opens referenced source files or URLs. */
async function saveSources(report, sourcePath) {
  if (!sourcePath) return;
  report.stage = "sources";
  let sources;
  try { sources = JSON.parse(await readFile(sourcePath, "utf8")); }
  catch (cause) { throw new ToolError("sources", "SOURCE_METADATA", cause.message, "Supply a readable JSON array of source records.", sourcePath, cause); }
  const kinds = ["prompt", "file", "url", "repository"];
  if (!Array.isArray(sources) || sources.some((source) => !source || typeof source !== "object" || Array.isArray(source)
    || !kinds.includes(source.kind) || typeof source.reference !== "string" || !source.reference.trim()
    || Object.keys(source).some((key) => !["kind", "reference", "description", "scope"].includes(key))
    || ["scope", "description"].some((key) => source[key] !== undefined && typeof source[key] !== "string"))) {
    throw new ToolError("sources", "SOURCE_METADATA", "Sources must contain kind, reference and optional description/scope strings",
      "Use prompt, file, url or repository records and retain the user-designated scope.", sourcePath);
  }
  const path = join(report.revision.directory, "sources.json");
  await writeFile(path, JSON.stringify(sources, null, 2) + "\n", { flag: "wx" });
  report.sources = [...report.sources, ...sources];
  report.artifacts.push({ kind: "sources", path });
}
