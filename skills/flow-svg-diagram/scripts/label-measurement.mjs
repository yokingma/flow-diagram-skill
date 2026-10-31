/** Shared ordinary-label estimates from public SDK frames; no private SDK state or browser metrics are read. */
export const LABEL_ESTIMATE_METHOD = "public-sdk-baseline-y-estimate";
// The pinned SDK reserves 12 diagram units on each side of ordinary labels.
const SDK_LABEL_VERTICAL_PADDING = 24;
const PROBE_HEIGHT = 1;
const CALIBRATION_LABEL = "A\nB";

/** Measure the initial label at one width; public frames retain all wrapped lines even when the probe overflows. */
export function measureLabel(sdk, { kind, width, label, typography }) {
  const frame = evaluateLabel(sdk, { kind, width, label, typography });
  const calibration = evaluateLabel(sdk, { kind, width, label: CALIBRATION_LABEL, typography });
  const lineHeight = calibration.labelBoxes[1].y - calibration.labelBoxes[0].y;
  const estimatedLineCount = frame.labelLines.length;
  return { requiredHeight: estimatedLineCount * lineHeight + SDK_LABEL_VERTICAL_PADDING,
    estimatedLineCount, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD };
}

function evaluateLabel(sdk, input) {
  const document = { version: 1, viewport: { width: input.width, height: PROBE_HEIGHT },
    ...(input.typography ? { typography: input.typography } : {}),
    nodes: [{ id: "measurement", kind: input.kind, x: 0, y: 0, width: input.width, height: PROBE_HEIGHT, label: input.label }],
    edges: [], scenes: [] };
  return sdk.createDiagram(document).evaluateAt(0).nodes[0];
}
