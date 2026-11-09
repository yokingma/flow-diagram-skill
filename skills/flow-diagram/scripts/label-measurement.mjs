/** Shape-safe label heights and line estimates through public SDK APIs; no browser metrics are read. */
export const LABEL_ESTIMATE_METHOD = "public-sdk-baseline-y-estimate";
const PRESET_LABEL_KINDS = new Set(["diamond", "parallelogram", "document", "predefinedProcess"]);
// The pinned SDK reserves 12 diagram units on each side of ordinary labels.
const SDK_LABEL_VERTICAL_PADDING = 24;
const PROBE_HEIGHT = 1;
const CALIBRATION_LABEL = "A\nB";

/** Identify kinds whose label height and unresolved width issues belong to the SDK measurement API. */
export function isPresetLabelKind(kind) { return PRESET_LABEL_KINDS.has(kind); }

/** Include every preset replacement label; ordinary labels retain their initial-only measurement contract. */
export function measurementLabelForNode(document, node) {
  if (!isPresetLabelKind(node.kind)) return typeof node.label === "string" && node.label.length > 0 ? node.label : undefined;
  const replacements = document.scenes.flatMap((scene) => scene.beats.flatMap((beat) => beat.actions
    .filter((action) => action.type === "updateNode" && action.target === node.id && typeof action.value?.label === "string")
    .map((action) => action.value.label)));
  return [node.label ?? "", ...replacements];
}

/** Preserve preset width diagnostics; public frames supply line counts even when text paint is clipped. */
export function measureLabel(sdk, { kind, width, label, typography }) {
  if (isPresetLabelKind(kind)) {
    const input = { kind, width, label, ...(typography ? { typography } : {}) };
    const measurement = sdk.measureNodeLabel(input);
    const versions = Array.isArray(label) ? label : [label];
    const estimatedLineCount = versions.reduce((largest, text) => Math.max(largest,
      evaluateLabel(sdk, { ...input, label: text, height: measurement.height }).labelLines.length), 0);
    return { requiredHeight: measurement.height, diagnostics: measurement.diagnostics,
      estimatedLineCount, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD };
  }
  const frame = evaluateLabel(sdk, { kind, width, label, typography });
  const calibration = evaluateLabel(sdk, { kind, width, label: CALIBRATION_LABEL, typography });
  const lineHeight = calibration.labelBoxes[1].y - calibration.labelBoxes[0].y;
  const estimatedLineCount = frame.labelLines.length;
  return { requiredHeight: estimatedLineCount * lineHeight + SDK_LABEL_VERTICAL_PADDING,
    estimatedLineCount, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD };
}

function evaluateLabel(sdk, input) {
  const height = input.height ?? PROBE_HEIGHT;
  const document = { version: 1, viewport: { width: input.width, height },
    ...(input.typography ? { typography: input.typography } : {}),
    nodes: [{ id: "measurement", kind: input.kind, x: 0, y: 0, width: input.width, height, label: input.label }],
    edges: [], scenes: [] };
  return sdk.createDiagram(document).evaluateAt(0).nodes[0];
}
