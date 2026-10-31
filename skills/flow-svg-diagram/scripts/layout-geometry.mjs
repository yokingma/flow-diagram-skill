/** Deterministic skill-only geometry. Inputs are SDK-valid static drafts and validated layout plans; no I/O occurs here. */
const NODE_FIELDS = ["x", "y", "width", "height"];
const EDGE_FIELDS = ["route", "fromPort", "toPort"];
const DEFAULT_GAP = 0;
const DEFAULT_CANVAS_PADDING = 0;
const DEFAULT_GROUP_PADDING = 16;
const DEFAULT_HEADING_HEIGHT = 32;

/**
 * Return planned text-bearing nodes at their final widths, in document order.
 * Expanded group widths are derived from child bounds before measuring their labels; heights cannot affect widths.
 * Strip nodeId before calling the public SDK measurement API. Override-only nodes are not measured.
 */
export function getLayoutMeasurementInputs(draft, plan) {
  const ids = new Set([...plan.layers.flatMap(primitiveIds), ...(plan.sidebar ? primitiveIds(plan.sidebar.layout) : [])]);
  const placements = plannedPlacements(draft, plan);
  return draft.nodes.filter((node) => ids.has(node.id) && hasMeasuredText(node)).map((node) => ({ nodeId: node.id,
    kind: node.kind, width: ownValue(placements, node.id)?.width ?? nodeWidth(node, plan), ...(node.content !== undefined ? { content: node.content } : {}),
    ...(isNonEmptyLabel(node.label) ? { label: node.label } : {}), ...(draft.typography ? { typography: draft.typography } : {}) }));
}

/**
 * Produce a new document and factual field changes without mutating either input.
 * Geometry uses diagram units; node coordinates remain relative to the existing immediate parent.
 * Omitted canvas dimensions grow from the original viewport; explicit dimensions and node overrides stay exact.
 * Measurement heights are lower bounds unless an explicit height override takes precedence.
 * @throws {LayoutGeometryError} If measurements are stale/unresolved or geometry arithmetic is unrepresentable.
 */
export function layoutDraft(draft, plan, measurements = []) {
  validateMeasurements(draft, plan, measurements);
  const context = { draft, plan, measurements, nodes: new Map(draft.nodes.map((node) => [node.id, node])) };
  const padding = plan.canvas?.padding ?? DEFAULT_CANVAS_PADDING;
  const main = placeRegions(context, padding);
  const nodes = draft.nodes.map((node) => ({ ...node, ...(ownValue(main.placements, node.id) ?? (ownValue(plan.overrides, node.id) ? nodeGeometry(node, node, context, false) : {})) }));
  const bounds = nodes.filter((node) => node.parentId === undefined).reduce((extent, node) => ({
    right: Math.max(extent.right, node.x + node.width), bottom: Math.max(extent.bottom, node.y + node.height)
  }), { right: main.right, bottom: main.bottom });
  const document = { ...draft,
    viewport: { ...draft.viewport, width: plan.canvas?.width ?? Math.max(draft.viewport.width, bounds.right + padding),
      height: plan.canvas?.height ?? Math.max(draft.viewport.height, bounds.bottom + padding) },
    nodes,
    edges: draft.edges.map((edge) => ({ ...edge, ...ownValue(plan.edges, edge.id) }))
  };
  validateGeometry(document);
  const changes = geometryChanges(draft, document);
  return { document, strategy: plan.strategy, changes,
    overrides: Object.entries(plan.overrides ?? {}).map(([nodeId, values]) => ({ nodeId, values: { ...values } })),
    measuredNodes: measurements.map((item) => ({ ...item })),
    labelOnlyMeasurements: measurements.filter((item) => item.labelOnly).map((item) => ({ ...item })),
    appliedHeightChanges: changes.filter((item) => item.objectType === "node" && item.field === "height") };
}

function validateGeometry(document) {
  const values = [
    ...document.nodes.flatMap((node, index) => NODE_FIELDS.map((field) => ({ value: node[field], location: `nodes[${index}].${field}`, positive: field === "width" || field === "height" }))),
    ...document.nodes.flatMap((node, index) => [
      { value: node.x + node.width, location: `nodes[${index}].x`, positive: false },
      { value: node.y + node.height, location: `nodes[${index}].y`, positive: false }
    ]),
    ...["width", "height"].map((field) => ({ value: document.viewport[field], location: `viewport.${field}`, positive: true }))
  ];
  const invalid = values.find(({ value, positive }) => !Number.isFinite(value) || (positive && value <= 0));
  if (invalid) throw new LayoutGeometryError("LAYOUT_GEOMETRY_INVALID", invalid.location,
    "Layout arithmetic must produce finite coordinates and positive finite dimensions.");
}

function validateMeasurements(draft, plan, measurements) {
  const ids = new Set([...plan.layers.flatMap(primitiveIds), ...(plan.sidebar ? primitiveIds(plan.sidebar.layout) : [])]);
  const widths = new Map(getLayoutMeasurementInputs(draft, plan).map((item) => [item.nodeId, item.width]));
  const seen = new Set();
  for (const [index, item] of measurements.entries()) {
    const node = draft.nodes.find((candidate) => candidate.id === item.nodeId);
    if (!node || !ids.has(item.nodeId) || seen.has(item.nodeId) || item.width !== widths.get(item.nodeId)
      || !Number.isFinite(item.recommendedHeight) || item.recommendedHeight <= 0 || !Array.isArray(item.diagnostics) || item.diagnostics.length) {
      throw new LayoutGeometryError("LAYOUT_MEASUREMENT_INVALID", `measurements[${index}]`,
        "Measurements must identify one planned node, match its final width, and provide a positive finite height with no unresolved diagnostics.");
    }
    seen.add(item.nodeId);
  }
}

/** Geometry failures carry the same diagnostic fields consumed by the installed CLI. */
class LayoutGeometryError extends Error {
  constructor(code, location, reason) {
    super(reason);
    this.name = "LayoutGeometryError";
    this.code = code;
    this.location = location;
    this.stage = "layout";
    this.nextStep = "Correct the plan or remeasure content at the final planned width, then retry without changing source semantics.";
  }
}

function placeRegions(context, padding) {
  const { plan } = context;
  const origin = { x: padding, y: padding };
  const gap = plan.gaps?.sidebar ?? DEFAULT_GAP;
  const sidebarFirst = plan.sidebar?.side === "left";
  const first = sidebarFirst ? placePrimitive(plan.sidebar.layout, origin, context)
    : arrangeChildren(plan.layers, origin, "column", plan.gaps?.layer ?? DEFAULT_GAP, context);
  if (!plan.sidebar) return first;
  const nextOrigin = { x: first.right + gap, y: padding };
  const second = sidebarFirst ? arrangeChildren(plan.layers, nextOrigin, "column", plan.gaps?.layer ?? DEFAULT_GAP, context)
    : placePrimitive(plan.sidebar.layout, nextOrigin, context);
  return { right: Math.max(first.right, second.right), bottom: Math.max(first.bottom, second.bottom), placements: { ...first.placements, ...second.placements } };
}

function arrangeChildren(children, origin, type, gap, context) {
  return children.reduce((state, child) => {
    const next = placePrimitive(child, { x: type === "row" ? state.cursor : origin.x, y: type === "row" ? origin.y : state.cursor }, context);
    return { right: Math.max(state.right, next.right), bottom: Math.max(state.bottom, next.bottom),
      cursor: (type === "row" ? next.right : next.bottom) + gap, placements: { ...state.placements, ...next.placements } };
  }, { right: origin.x, bottom: origin.y, cursor: type === "row" ? origin.x : origin.y, placements: {} });
}

function placePrimitive(primitive, origin, context) {
  if (typeof primitive !== "string") {
    return placeContainer(primitive, origin, context);
  }
  const node = context.nodes.get(primitive);
  const geometry = nodeGeometry(node, origin, context);
  return { right: geometry.x + geometry.width, bottom: geometry.y + geometry.height, placements: { [node.id]: geometry } };
}

function primitiveIds(primitive) {
  if (typeof primitive === "string") return [primitive];
  return [...(primitive.id === undefined ? [] : [primitive.id]), ...primitive.children.flatMap(primitiveIds)];
}

function ownValue(object, key) { return object && Object.hasOwn(object, key) ? object[key] : undefined; }

function isNonEmptyLabel(label) { return typeof label === "string" && label.length > 0; }
function hasMeasuredText(node) { return node.content !== undefined || isNonEmptyLabel(node.label); }

/** Resolve width-dependent geometry without measurements; height growth never changes widths or horizontal positions. */
function plannedPlacements(draft, plan) {
  const context = { draft, plan, measurements: [], nodes: new Map(draft.nodes.map((node) => [node.id, node])) };
  return placeRegions(context, plan.canvas?.padding ?? DEFAULT_CANVAS_PADDING).placements;
}

function nodeWidth(node, plan) { return ownValue(plan.overrides, node.id)?.width ?? plan.defaults?.width ?? node.width; }

function nodeGeometry(node, origin, context, managed = true) {
  const override = ownValue(context.plan.overrides, node.id);
  const measured = managed ? context.measurements.find((item) => item.nodeId === node.id) : undefined;
  return { x: override?.x ?? origin.x, y: override?.y ?? origin.y,
    width: override?.width ?? (managed ? context.plan.defaults?.width : undefined) ?? node.width,
    height: override?.height ?? Math.max(node.height, (managed ? context.plan.defaults?.height : undefined) ?? 0, measured?.recommendedHeight ?? 0) };
}

function placeContainer(primitive, origin, context) {
  const isGroup = primitive.id !== undefined;
  const override = isGroup ? ownValue(context.plan.overrides, primitive.id) : undefined;
  const padding = override?.padding ?? primitive.padding ?? (isGroup ? context.plan.defaults?.groupPadding ?? DEFAULT_GROUP_PADDING : 0);
  const headingHeight = override?.headingHeight ?? primitive.headingHeight ?? (isGroup ? context.plan.defaults?.headingHeight ?? DEFAULT_HEADING_HEIGHT : 0);
  const gap = override?.gap ?? primitive.gap ?? context.plan.gaps?.[primitive.type === "layer" ? "column" : primitive.type] ?? DEFAULT_GAP;
  const localOrigin = isGroup ? { x: padding, y: padding + headingHeight } : { x: origin.x + padding, y: origin.y + padding + headingHeight };
  const children = arrangeChildren(primitive.children, localOrigin, primitive.type, gap, context);
  if (!isGroup) return { ...children, right: children.right + padding, bottom: children.bottom + padding };
  // Children absent from the plan keep their local coordinates and still contribute to the enclosing group's size.
  const unmanaged = context.draft.nodes.filter((node) => node.parentId === primitive.id && !Object.hasOwn(children.placements, node.id))
    .map((node) => nodeGeometry(node, node, context, false));
  const right = unmanaged.reduce((largest, node) => Math.max(largest, node.x + node.width), children.right);
  const bottom = unmanaged.reduce((largest, node) => Math.max(largest, node.y + node.height), children.bottom);
  const node = context.nodes.get(primitive.id);
  const measured = context.measurements.find((item) => item.nodeId === primitive.id);
  const geometry = { x: override?.x ?? origin.x, y: override?.y ?? origin.y,
    width: override?.width ?? right + padding,
    height: override?.height ?? Math.max(bottom + padding, node.height, context.plan.defaults?.height ?? 0, measured?.recommendedHeight ?? 0) };
  return { right: geometry.x + geometry.width, bottom: geometry.y + geometry.height,
    placements: { ...children.placements, [primitive.id]: geometry } };
}

function geometryChanges(before, after) {
  const nodes = before.nodes.flatMap((node, index) => fieldChanges("node", node.id, NODE_FIELDS, node, after.nodes[index]));
  const edges = before.edges.flatMap((edge, index) => fieldChanges("edge", edge.id, EDGE_FIELDS, edge, after.edges[index]));
  return [...nodes, ...edges, ...fieldChanges("viewport", undefined, ["width", "height"], before.viewport, after.viewport)];
}

function fieldChanges(objectType, objectId, fields, before, after) {
  return fields.filter((field) => before[field] !== after[field]).map((field) => ({ objectType,
    ...(objectId === undefined ? {} : { objectId }), field, before: before[field], after: after[field] }));
}
