/** Source-bound static layout through the isolated public SDK; no author revision or quality approval is created. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { importSdk, prepareRuntime, ToolError } from "./runtime.mjs";
import { digest } from "./artifact-identity.mjs";
import { recordFailure } from "./reports.mjs";
import { validateLayoutPlan } from "./layout-plan.mjs";
import { getLayoutMeasurementInputs, layoutDraft } from "./layout-geometry.mjs";
import { diagnoseLayout } from "./diagnostics.mjs";
import { publishDraftCopy } from "./atomic-draft.mjs";
import { LABEL_ESTIMATE_METHOD, measureLabel } from "./label-measurement.mjs";

const PRESERVED_SEMANTIC_FIELDS = ["nodes.id", "nodes.kind", "nodes.parentId", "nodes.content", "nodes.label", "nodes array order", "edges.id", "edges.from", "edges.to", "edges array order", "scenes"];
const DRAFT_WARNING_NEXT_STEP = "Run author on this draft to create a source revision before recording any warning decision.";

/** Return one layout report; only a complete, checked new draft can be published. */
export async function layoutContent(options, signal) {
  const result = { schemaVersion: 1, toolVersion: "0.1.0", command: "layout", status: "pending", stage: "layout-input", revision: null,
    diagnostics: [], artifacts: [], sdk: null, checks: { validation: "not-run", plan: "not-run", measurement: "not-run", compilation: "not-run", layout: "not-run" } };
  try {
    checkOutputPath(options);
    const [input, plan] = await Promise.all([readLayoutJson(options.input, "input"), readLayoutJson(options.plan, "plan")]);
    result.input = input.identity;
    result.plan = plan.identity;
    result.stage = "environment";
    const runtime = await prepareRuntime(signal);
    result.sdk = runtime.sdk;
    const sdk = await importSdk(runtime);
    validateInputs(result, sdk, input.document, plan.document);
    signal?.throwIfAborted();
    result.stage = "measurement";
    result.checks.measurement = "failed";
    const measurements = measurePlannedNodes(sdk, input.document, plan.document);
    result.checks.measurement = "passed";
    result.stage = "layout";
    const geometry = layoutDraft(input.document, plan.document, measurements);
    const { document, ...details } = geometry;
    Object.assign(result, details);
    result.checks.outputValidation = "failed";
    checkDiagram(sdk, document, "layout-output");
    result.checks.outputValidation = "passed";
    result.stage = "compilation";
    result.checks.compilation = "failed";
    const diagram = sdk.createDiagram(document);
    result.checks.compilation = "passed";
    const text = JSON.stringify(document, null, 2) + "\n";
    result.output = { path: resolve(options.output), sha256: digest(text), bytes: Buffer.byteLength(text) };
    diagnoseOutput(result, document, diagram, sdk);
    result.stage = "layout-output";
    await publishLayoutDraft(options.output, text, signal);
    result.artifacts = [{ kind: "diagram-draft", ...result.output }];
    result.preservedSemanticFields = PRESERVED_SEMANTIC_FIELDS;
    result.warningDecisionScope = DRAFT_WARNING_NEXT_STEP;
    result.status = "laid-out";
  } catch (error) {
    const failure = error.nextStep ? error : new ToolError(error.stage ?? result.stage, error.code ?? "LAYOUT_FAILED", error.message,
      "Review this layout diagnostic and retry using a new output draft path.", error.location ?? "$", error);
    if (error.name === "AbortError") failure.name = "AbortError";
    const failedCheck = { validation: "validation", "layout-plan": "plan", measurement: "measurement", compilation: "compilation", "layout-output": "outputValidation", layout: "layout" }[failure.stage];
    if (failedCheck) result.checks[failedCheck] = "failed";
    recordFailure(result, failure);
    if (Array.isArray(error.diagnostics)) result.diagnostics = [...result.diagnostics.slice(0, -1), ...error.diagnostics];
  }
  return result;
}

function checkOutputPath(options) {
  const output = resolve(options.output);
  if ([options.input, options.plan].some((path) => resolve(path) === output)) throw new ToolError("layout-output", "LAYOUT_OUTPUT_CONFLICT",
    "The layout output must differ from both input files.", "Choose a new output draft path; preserve the input draft and layout plan.", output);
}

async function publishLayoutDraft(path, text, signal) {
  try { await publishDraftCopy(path, text, signal); }
  catch (cause) {
    if (cause.name === "AbortError") throw cause;
    const exists = cause.code === "EEXIST";
    throw new ToolError("layout-output", exists ? "LAYOUT_OUTPUT_EXISTS" : "LAYOUT_OUTPUT_WRITE_FAILED",
      exists ? "The requested output draft already exists; refusing to overwrite it." : cause.message,
      "Choose a new writable output draft path and retry.", path, cause);
  }
}

async function readLayoutJson(path, kind) {
  let bytes;
  try { bytes = await readFile(path); }
  catch (cause) { throw new ToolError("layout-input", kind === "plan" ? "LAYOUT_PLAN_READ_FAILED" : "LAYOUT_INPUT_READ_FAILED",
    cause.message, "Provide a readable JSON file at this path and rerun layout.", resolve(path), cause); }
  try { return { document: JSON.parse(bytes.toString("utf8")), identity: { path: resolve(path), sha256: digest(bytes), bytes: bytes.length } }; }
  catch (cause) { throw new ToolError("layout-input", "JSON_SYNTAX", cause.message, "Correct this JSON file and retry using a new output path.", path, cause); }
}

function validateInputs(result, sdk, draft, plan) {
  result.stage = "validation";
  result.checks.validation = "failed";
  checkDiagram(sdk, draft, "validation");
  result.checks.validation = "passed";
  const checked = validateLayoutPlan(draft, plan);
  result.checks.plan = checked.valid ? "passed" : "failed";
  if (!checked.valid) throw new LayoutDiagnosticsError(checked.diagnostics);
}

function checkDiagram(sdk, document, stage) {
  const issues = sdk.validateDocument(document);
  if (!issues.length) return;
  throw new LayoutDiagnosticsError(issues.map((issue) => ({ severity: "error", stage, code: "DOCUMENT_INVALID", location: issue.path,
    reason: issue.message, nextStep: "Correct the named draft field without changing source semantics, then retry." })));
}

function measurePlannedNodes(sdk, draft, plan) {
  return getLayoutMeasurementInputs(draft, plan).map(({ nodeId, ...input }) => {
    const node = draft.nodes.find((candidate) => candidate.id === nodeId);
    const contentInput = { kind: input.kind, width: input.width, ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.typography ? { typography: input.typography } : {}) };
    const contentMeasurement = input.content === undefined ? null : sdk.measureNodeContent(contentInput);
    const labelMeasurement = input.label === undefined ? null : measureLabel(sdk, input);
    const requiredHeight = Math.max(contentMeasurement?.height ?? 0, labelMeasurement?.requiredHeight ?? 0);
    const diagnostics = [...(contentMeasurement?.diagnostics ?? []), ...(labelMeasurement?.diagnostics ?? [])];
    if (diagnostics.length) throw new LayoutDiagnosticsError(diagnostics.map((issue) => ({ severity: "error", stage: "measurement",
      code: "LAYOUT_MEASUREMENT_DIAGNOSTIC", location: `nodes[${draft.nodes.findIndex((node) => node.id === nodeId)}].${issue.path?.startsWith("label") ? "label" : "content"}`, objectId: nodeId,
      reason: issue.message, nextStep: "Resolve the reported measurement issue at its final planned width before rerunning layout." })));
    return { nodeId, width: input.width, currentHeight: node.height, requiredHeight, recommendedHeight: requiredHeight,
      heightChange: Math.max(0, requiredHeight - node.height),
      ...(labelMeasurement ? { estimatedLineCount: labelMeasurement.estimatedLineCount, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD, labelOnly: input.content === undefined } : {}), diagnostics };
  });
}

function diagnoseOutput(result, document, diagram, sdk) {
  // Draft warnings bind the output bytes. A null source revision cannot be used as an author-history decision target.
  const diagnosticReport = { ...result, revision: { id: null }, input: result.output,
    theme: document.theme ?? "light", reducedMotion: false, checks: { ...result.checks }, diagnostics: [] };
  try { diagnoseLayout(diagnosticReport, { document, diagram, sdk }); }
  finally {
    result.theme = diagnosticReport.theme;
    result.reducedMotion = false;
    result.checks = diagnosticReport.checks;
    result.layout = diagnosticReport.layout;
    result.diagnostics.push(...diagnosticReport.diagnostics.map((item) => ({ ...item, nextStep: `${DRAFT_WARNING_NEXT_STEP} ${item.nextStep}` })));
  }
}

class LayoutDiagnosticsError extends Error {
  constructor(diagnostics) {
    super("The draft or layout plan is invalid.");
    this.name = "LayoutDiagnosticsError";
    this.stage = diagnostics[0]?.stage ?? "layout";
    this.code = "LAYOUT_INVALID";
    this.nextStep = "Correct the reported fields and rerun layout with a new output draft path.";
    this.diagnostics = diagnostics;
  }
}
