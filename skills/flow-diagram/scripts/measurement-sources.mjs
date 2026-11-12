/** Map public SDK measurement versions back to caller-owned JSON fields without interpreting node IDs as paths. */
import { isPresetLabelKind } from "./label-measurement.mjs";

/** Preserve source order and distinguish a single value from a version array. Paths use input array indices. */
export function sourcesForValue(value, sourcePath) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value)
    ? value.map((version, index) => ({ value: version, sourcePath: `${sourcePath}[${index}]` }))
    : [{ value, sourcePath }];
}

/** Include initial and animated content in the same order used by SDK measurement. */
export function contentSourcesForNode(draft, node, nodeIndex) {
  return [...sourcesForValue(node.content, `nodes[${nodeIndex}].content`), ...replacementSources(draft, node.id, "content")];
}

/** Ordinary labels retain initial-only scope; preset labels include their default empty initial version. */
export function labelSourcesForNode(draft, node, nodeIndex) {
  const sourcePath = `nodes[${nodeIndex}].label`;
  if (!isPresetLabelKind(node.kind)) return typeof node.label === "string" && node.label.length > 0
    ? [{ value: node.label, sourcePath }] : [];
  return [{ value: node.label ?? "", sourcePath }, ...replacementSources(draft, node.id, "label")];
}

function replacementSources(draft, nodeId, field) {
  return draft.scenes.flatMap((scene, sceneIndex) => scene.beats.flatMap((beat, beatIndex) => beat.actions.flatMap((action, actionIndex) => {
    if (action.type !== "updateNode" || action.target !== nodeId) return [];
    const value = action.value?.[field];
    if (field === "label" && typeof value !== "string") return [];
    return sourcesForValue(value, `scenes[${sceneIndex}].beats[${beatIndex}].actions[${actionIndex}].value.${field}`);
  })));
}

/** Keep SDK paths/version/dimension/message intact and add actionable original-input locations. */
export function mapMeasurementDiagnostics(diagnostics, sources) {
  return diagnostics.map((diagnostic) => {
    const source = sources[diagnostic.versionIndex];
    const suffix = diagnostic.path.replace(/^(?:content|label)(?:\[\d+\])?/u, "");
    return { ...diagnostic, sourcePath: `${source.sourcePath}${suffix}`, nextStep: measurementNextStep(diagnostic, source.value) };
  });
}

function measurementNextStep(diagnostic, value) {
  if (diagnostic.dimension === "height") return "Check the graph block's fixed height and graph-local coordinates, including negative extents. Increasing the outer node height does not enlarge the fixed block; a larger block height alone cannot correct negative extents.";
  const blockIndex = Number(/\.blocks\[(\d+)\]/u.exec(diagnostic.path)?.[1]);
  const graph = value?.blocks?.[blockIndex]?.type === "graph";
  return graph
    ? "Check node width, the content safe area and graph-local coordinates. Increasing the outer node height cannot fix horizontal or graph-local overflow."
    : "Check node width, the content or label safe area and text sizing. Increasing the outer node height cannot fix width overflow.";
}
