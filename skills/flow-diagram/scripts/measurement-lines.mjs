/** Project public SDK text layouts into optional source-bound estimates; no wrapping or visibility judgement lives here. */
import { isPresetLabelKind, measureLabel } from "./label-measurement.mjs";

/** Return ordered, unclipped text records for the caller's existing content and label version scope. */
export function estimateMeasurementLines(sdk, input, contentSources, labelSources) {
  const label = isPresetLabelKind(input.kind) ? labelSources.map((source) => source.value) : labelSources[0]?.value;
  const labelHeight = labelSources.length ? measureLabel(sdk, { ...input, label }).requiredHeight : 0;
  return [...contentSources.flatMap((source, versionIndex) => contentLines(sdk, input, source, versionIndex)),
    ...labelSources.flatMap((source, versionIndex) => {
      const frame = evaluateNode(sdk, input, { label: source.value }, labelHeight);
      return frame.labelLines.map((text) => ({ text, sourcePath: source.sourcePath, versionIndex }));
    })];
}

function contentLines(sdk, input, source, versionIndex) {
  const content = source.value;
  const height = sdk.measureNodeContent({ kind: input.kind, width: input.width, content, typography: input.typography }).height;
  const lines = evaluateNode(sdk, input, { content }, height).contentLayout?.lines ?? [];
  return lines.filter((line) => content.blocks[line.blockIndex].type !== "graph").map((line) => ({
    text: line.text, sourcePath: contentLinePath(source.sourcePath, content, line), versionIndex,
    blockIndex: line.blockIndex, role: line.role,
    ...(line.itemIndex === undefined ? {} : { itemIndex: line.itemIndex }),
    ...(line.tagIndex === undefined ? {} : { tagIndex: line.tagIndex })
  }));
}

function contentLinePath(sourcePath, content, line) {
  const blockPath = `${sourcePath}.blocks[${line.blockIndex}]`;
  if (content.blocks[line.blockIndex].type !== "list") return `${blockPath}.text`;
  if (line.role === "marker") return `${blockPath}.marker`;
  const itemPath = `${blockPath}.items[${line.itemIndex}]`;
  return line.tagIndex === undefined ? `${itemPath}.${line.role}` : `${itemPath}.tags[${line.tagIndex}].text`;
}

function evaluateNode(sdk, input, text, height) {
  const safeHeight = Math.max(1, height);
  return sdk.createDiagram({ version: 1, viewport: { width: input.width, height: safeHeight }, typography: input.typography,
    nodes: [{ id: "measurement", kind: input.kind, x: 0, y: 0, width: input.width, height: safeHeight, ...text }],
    edges: [], scenes: [] }).evaluateAt(0).nodes[0];
}
