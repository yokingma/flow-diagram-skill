/** Read-only author-time content measurement through the isolated public SDK, without layout or browser metrics. */
import { readFile } from "node:fs/promises";
import { publishDraftCopy } from "./atomic-draft.mjs";
import { resolve } from "node:path";
import { importSdk, prepareRuntime, ToolError } from "./runtime.mjs";
import { recordFailure } from "./reports.mjs";
import { LABEL_ESTIMATE_METHOD, measureLabel } from "./label-measurement.mjs";

const MEASUREMENT_FIELDS = ["kind", "width", "content", "label", "typography"];

/** Return height recommendations for one input, a batch, or one input with several content versions. */
export async function measureContent(options, signal) {
  const result = { schemaVersion: 1, toolVersion: "0.1.0", command: "measure", status: "pending", stage: "measurement",
    sources: [{ path: resolve(options.input), kind: "content-measurement" }], diagnostics: [], artifacts: [], sdk: null };
  try {
    const text = await readFile(options.input, "utf8");
    let input;
    try { input = JSON.parse(text); }
    catch (cause) { throw new ToolError("measurement", "JSON_SYNTAX", cause.message, "Correct the measurement JSON syntax.", "$", cause); }
    result.stage = "environment";
    const runtime = await prepareRuntime(signal);
    result.sdk = runtime.sdk;
    const sdk = await importSdk(runtime);
    signal?.throwIfAborted();
    result.stage = "measurement";
    const draft = isDiagramDraft(input);
    if (draft) result.sources = [{ path: resolve(options.input), kind: "diagram-draft" }];
    result.measurement = draft
      ? await measureDraft(sdk, input, options, signal)
      : Array.isArray(input)
      ? { items: input.map((item, index) => measureBatchItem(sdk, item, index)), method: "sdk-content-estimate", units: "diagram" }
      : measureOne(sdk, input);
    result.status = "measured";
  } catch (error) {
    recordFailure(result, error);
    if (Array.isArray(error.issues)) result.diagnostics = error.issues.map((issue) => issue.code
      ? { severity: "error", stage: "measurement", code: issue.code, location: issue.location || issue.path || "$", reason: issue.reason || issue.message,
        nextStep: issue.nextStep || "Resolve the reported draft measurement issue before retrying.", ...(issue.objectId ? { objectId: issue.objectId } : {}) }
      : { severity: "error", stage: "measurement", code: "MEASUREMENT_INVALID", location: issue.path, reason: issue.message,
        nextStep: "Review node kind, positive width and content versions; choose any content or width change with the user." });
  }
  return result;
}

/** Measure initial labels and structured content versions in a complete diagram while preserving the source draft. */
async function measureDraft(sdk, draft, options, signal) {
  const issues = sdk.validateDocument(draft);
  if (issues.length) throw new DraftMeasurementError(issues.map((issue) => ({ path: issue.path, message: issue.message })));
  const nodes = draft.nodes;
  const dynamicSizes = findAnimatedSizeChanges(draft);
  if (dynamicSizes.length) throw new DraftMeasurementError(dynamicSizes.map((objectId) => ({ code: "MEASUREMENT_SIZE_ANIMATION", objectId,
    location: `nodes.${objectId}`, reason: `Node ${objectId} changes width or height during animation; automatic height backfill is unsafe.`,
    nextStep: "Measure the affected states separately and adjust this node with the existing authoring workflow." })));
  const measurements = nodes.flatMap((node) => {
    const versions = contentVersionsForNode(draft, node.id, node.content);
    const label = typeof node.label === "string" && node.label.length > 0 ? node.label : undefined;
    if (!versions.length && label === undefined) return [];
    const contentMeasurement = versions.length ? measureStructuredNode(sdk, node, versions, draft.typography) : null;
    const labelMeasurement = label === undefined ? null : measureLabel(sdk, { ...node, typography: draft.typography });
    const requiredHeight = Math.max(contentMeasurement?.requiredHeight ?? 0, labelMeasurement?.requiredHeight ?? 0);
    const diagnostics = contentMeasurement?.diagnostics ?? [];
    return [{ nodeId: node.id, kind: node.kind, width: node.width, currentHeight: node.height, requiredHeight,
      recommendedHeight: requiredHeight, heightChange: Math.max(0, requiredHeight - node.height),
      ...(contentMeasurement ? { contentVersions: versions.length, perContent: contentMeasurement.perContent } : {}), diagnostics,
      estimatedLineCount: Math.max(contentMeasurement?.estimatedLineCount ?? 0, labelMeasurement?.estimatedLineCount ?? 0),
      estimatedLineCountMethod: LABEL_ESTIMATE_METHOD }];
  });
  const diagnostics = measurements.flatMap((item) => item.diagnostics.map((diagnostic) => ({ ...diagnostic, objectId: item.nodeId })));
  if (diagnostics.length) throw new DraftMeasurementError(diagnostics.map((diagnostic) => ({ code: "MEASUREMENT_DIAGNOSTIC", objectId: diagnostic.objectId,
    location: `nodes.${diagnostic.objectId}.content`, reason: diagnostic.message,
    nextStep: "Resolve width or fixed graph overflow before applying automatic height backfill." })));
  const measurement = { kind: "draft", method: "sdk-content-estimate", units: "diagram", nodes: measurements, output: options.output ? resolve(options.output) : null };
  if (!options.output) return measurement;
  const filled = {
    ...draft,
    nodes: nodes.map((node) => {
      const measured = measurements.find((item) => item.nodeId === node.id);
      return measured && measured.recommendedHeight > node.height ? { ...node, height: measured.recommendedHeight } : { ...node };
    })
  };
  signal?.throwIfAborted();
  await writeDraftCopy(options.output, JSON.stringify(filled, null, 2) + "\n", signal);
  return measurement;
}

function measureStructuredNode(sdk, node, versions, typography) {
  const input = { kind: node.kind, width: node.width, content: versions, ...(typography ? { typography } : {}) };
  const measurement = sdk.measureNodeContent(input);
  const perContent = versions.map((content, index) => ({ index, ...sdk.measureNodeContent({ ...input, content }),
    ...estimateContent(sdk, { ...input, content }) }));
  return { requiredHeight: measurement.height, diagnostics: measurement.diagnostics, perContent,
    estimatedLineCount: Math.max(...perContent.map((item) => item.estimatedLineCount), 0) };
}

class DraftMeasurementError extends Error {
  constructor(issues) {
    super("Draft measurement could not be completed");
    this.name = "DraftMeasurementError";
    this.stage = "measurement";
    this.code = "MEASUREMENT_DRAFT_FAILED";
    this.issues = issues;
  }
}

async function writeDraftCopy(path, text, signal) {
  try { await publishDraftCopy(path, text, signal); }
  catch (error) {
    if (error.name === "AbortError") throw error;
    if (error.code === "EEXIST") throw new DraftMeasurementError([{ code: "MEASUREMENT_OUTPUT_EXISTS", location: path,
      reason: "The requested output draft already exists; refusing to overwrite it.", nextStep: "Choose a new output path and retry." }]);
    throw new DraftMeasurementError([{ code: "MEASUREMENT_OUTPUT_WRITE_FAILED", location: path,
      reason: error.message, nextStep: "Choose a writable output path and retry." }]);
  }
}

function isDiagramDraft(input) {
  return input && typeof input === "object" && !Array.isArray(input) && input.version !== undefined && Array.isArray(input.nodes);
}

function contentVersionsForNode(draft, nodeId, initialContent) {
  const versions = [];
  if (initialContent !== undefined && initialContent !== null) versions.push(...(Array.isArray(initialContent) ? initialContent : [initialContent]));
  for (const scene of draft.scenes) for (const beat of scene.beats) for (const action of beat.actions) {
    if (action.type === "updateNode" && action.target === nodeId && action.value?.content !== undefined && action.value.content !== null) {
      versions.push(...(Array.isArray(action.value.content) ? action.value.content : [action.value.content]));
    }
  }
  return versions;
}

function findAnimatedSizeChanges(draft) {
  const sizes = new Map(draft.nodes.map((node) => [node.id, { width: node.width, height: node.height }]));
  const ids = new Set();
  for (const scene of draft.scenes) for (const beat of scene.beats) for (const action of beat.actions) {
    if (action.type !== "updateNode" || !action.value || typeof action.value !== "object") continue;
    const size = sizes.get(action.target);
    if (!size) continue;
    for (const field of ["width", "height"]) {
      if (action.value[field] === undefined) continue;
      if (action.value[field] !== size[field]) ids.add(action.target);
      size[field] = action.value[field];
    }
  }
  return [...ids];
}

function measureBatchItem(sdk, item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ToolError("measurement", "MEASUREMENT_BATCH_ITEM", `Measurement item ${index} must be an object.`, "Use one measurement object per array item.", `items[${index}]`);
  }
  const { label, ...input } = item;
  if (label !== undefined && typeof label !== "string") {
    throw new ToolError("measurement", "MEASUREMENT_BATCH_ITEM", `Measurement item ${index} label must be a string.`, "Remove the label or provide a string label.", `items[${index}].label`);
  }
  try {
    return { index, ...(label === undefined ? {} : { label }), ...measureOne(sdk, input) };
  } catch (error) {
    if (Array.isArray(error?.issues)) error.issues = error.issues.map((issue) => ({ ...issue,
      path: issue.path === "$" ? `items[${index}]` : `items[${index}].${issue.path}` }));
    throw error;
  }
}

function measureOne(sdk, input) {
  const { label, ...contentInput } = input ?? {};
  const unknownField = label === undefined ? undefined : Object.keys(input).find((key) => !MEASUREMENT_FIELDS.includes(key));
  if (unknownField) throw new ToolError("measurement", "MEASUREMENT_INVALID", "Unknown measurement field.",
    "Use kind, width, label, content and typography fields only.", unknownField);
  const content = contentInput.content === undefined && label !== undefined ? null : measureStructuredInput(sdk, contentInput);
  if (label === undefined) return content;
  if (typeof label !== "string" || label.length === 0) throw new ToolError("measurement", "MEASUREMENT_INVALID",
    "A measurement label must be a nonempty string.", "Supply label text or omit the label field.", "label");
  const measuredLabel = measureLabel(sdk, { kind: input.kind, width: input.width, label, typography: input.typography });
  const requiredHeight = Math.max(content?.height ?? 0, measuredLabel.requiredHeight);
  return { ...content, height: requiredHeight, requiredHeight, diagnostics: content?.diagnostics ?? [],
    estimatedLineCount: Math.max(content?.estimatedLineCount ?? 0, measuredLabel.estimatedLineCount),
    estimatedLineCountMethod: LABEL_ESTIMATE_METHOD, method: "sdk-content-estimate", units: "diagram" };
}

function measureStructuredInput(sdk, input) {
  const shared = sdk.measureNodeContent(input);
  const versions = Array.isArray(input.content) ? input.content : null;
  if (!versions) return { ...shared, ...estimateContent(sdk, input), method: "sdk-content-estimate", units: "diagram" };
  const perContent = versions.map((content, index) => ({ index, ...sdk.measureNodeContent({ ...input, content }),
    ...estimateContent(sdk, { ...input, content }) }));
  const drivenBy = perContent.reduce((largest, current) => current.height > perContent[largest].height ? current.index : largest, 0);
  return { ...shared, perContent, drivenBy, estimatedLineCount: Math.max(...perContent.map((item) => item.estimatedLineCount), 0),
    estimatedLineCountMethod: LABEL_ESTIMATE_METHOD, method: "sdk-content-estimate", units: "diagram" };
}

/** Estimate structural text rows from public SDK baseline positions; this is not a browser pixel measurement. */
function estimateContent(sdk, input) {
  if (!input?.content || !input.kind || !Number.isFinite(input.width)) return { estimatedLineCount: 0, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD };
  const height = Math.max(1, sdk.measureNodeContent(input).height);
  const document = { version: 1, viewport: { width: input.width, height }, typography: input.typography,
    nodes: [{ id: "measurement", kind: input.kind, x: 0, y: 0, width: input.width, height, content: input.content }], edges: [], scenes: [] };
  const frame = sdk.createDiagram(document).evaluateAt(0);
  const lines = frame.nodes[0]?.contentLayout?.lines ?? [];
  return { estimatedLineCount: new Set(lines.map((line) => line.y)).size, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD };
}
