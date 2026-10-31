/** Validate the versioned skill-only layout plan without changing diagram semantics or performing I/O. */

const PLAN_FIELDS = ["schemaVersion", "strategy", "canvas", "defaults", "gaps", "layers", "sidebar", "overrides", "edges"];
const PRIMITIVE_FIELDS = ["type", "id", "children", "gap", "padding", "headingHeight"];
const OVERRIDE_FIELDS = ["x", "y", "width", "height", "gap", "padding", "headingHeight"];

/**
 * Return field diagnostics without mutating either input. Coordinates use diagram units.
 * Callers must also validate the draft with the public SDK before computing geometry.
 */
export function validateLayoutPlan(draft, plan) {
  const diagnostics = [];
  const addIssue = (code, location, reason) => diagnostics.push({ severity: "error", stage: "layout-plan", code, location, reason,
    nextStep: "Correct the named layout-plan field without changing diagram semantics, then retry." });
  if (!isObject(draft) || !Array.isArray(draft.nodes) || !Array.isArray(draft.edges)) {
    addIssue("LAYOUT_DRAFT_INVALID", "$", "A diagram draft requires nodes and edges arrays.");
    return { valid: false, diagnostics };
  }
  const nodes = new Map(draft.nodes.map((node) => [node.id, node]));
  validateStaticParents(draft, nodes, addIssue);
  if (!checkObject(plan, PLAN_FIELDS, "$", addIssue)) return { valid: false, diagnostics };
  if (plan.schemaVersion !== 1) addIssue("LAYOUT_PLAN_VERSION", "schemaVersion", "Only layout-plan schemaVersion 1 is supported.");
  if (plan.strategy !== "layered") addIssue("LAYOUT_PLAN_STRATEGY", "strategy", "Only the layered layout strategy is supported.");
  checkNumbers(plan.canvas, ["width", "height", "padding"], "canvas", addIssue);
  checkNumbers(plan.defaults, ["width", "height", "groupPadding", "headingHeight"], "defaults", addIssue);
  checkNumbers(plan.gaps, ["layer", "row", "column", "sidebar"], "gaps", addIssue);
  const containers = new Set();
  const visit = createPrimitiveVisitor(nodes, containers, addIssue);
  if (!Array.isArray(plan.layers) || plan.layers.length === 0) addIssue("LAYOUT_PLAN_INVALID", "layers", "layers must be a nonempty array of layout primitives.");
  else plan.layers.forEach((layer, index) => visit(layer, `layers[${index}]`));
  if (plan.sidebar !== undefined && checkObject(plan.sidebar, ["side", "layout"], "sidebar", addIssue)) {
    if (!["left", "right"].includes(plan.sidebar.side)) addIssue("LAYOUT_PLAN_INVALID", "sidebar.side", "sidebar.side must be left or right.");
    visit(plan.sidebar.layout, "sidebar.layout");
  }
  validateOverrides(plan.overrides, nodes, containers, addIssue);
  validateEdges(plan.edges, new Set(draft.edges.map((edge) => edge.id)), addIssue);
  return { valid: diagnostics.length === 0, diagnostics };
}

function validateStaticParents(draft, nodes, addIssue) {
  if (!Array.isArray(draft.scenes) || draft.scenes.length !== 0) {
    addIssue("LAYOUT_STATIC_ONLY", "scenes", "Layout accepts only a static draft with scenes: [].");
  }
  for (const [index, node] of draft.nodes.entries()) {
    const ancestors = new Set([node.id]);
    let parentId = node.parentId;
    while (parentId !== undefined && nodes.has(parentId)) {
      if (ancestors.has(parentId)) {
        addIssue("LAYOUT_PARENT_CYCLE", `nodes[${index}].parentId`, `Node ${node.id} has a cyclic parent chain.`);
        break;
      }
      ancestors.add(parentId);
      parentId = nodes.get(parentId).parentId;
    }
  }
}

function createPrimitiveVisitor(nodes, containers, addIssue) {
  const assigned = new Set();
  return function visit(primitive, location, parentId) {
    if (typeof primitive !== "string" && !checkObject(primitive, PRIMITIVE_FIELDS, location, addIssue)) return;
    const id = typeof primitive === "string" ? primitive : primitive.id;
    if (id !== undefined) {
      const idPath = typeof primitive === "string" ? location : `${location}.id`;
      if (!nodes.has(id)) addIssue("LAYOUT_UNKNOWN_NODE", idPath, `Unknown node ID ${id}.`);
      else if (assigned.has(id)) addIssue("LAYOUT_DUPLICATE_NODE", idPath, `Node ${id} already belongs to a layout primitive.`);
      else assigned.add(id);
      const node = nodes.get(id);
      if (node && node.parentId !== parentId) addIssue("LAYOUT_PARENT_MISMATCH", idPath,
        `Node ${id} must remain in its existing parent scope ${node.parentId ?? "root"}.`);
      if (node && typeof primitive !== "string" && node.kind !== "group") addIssue("LAYOUT_GROUP_REQUIRED", idPath,
        `Primitive ID ${id} must reference an existing group node.`);
      if (node?.kind === "group" && typeof primitive !== "string") containers.add(id);
    }
    if (typeof primitive === "string") return;
    if (!["layer", "row", "column"].includes(primitive.type)) addIssue("LAYOUT_PLAN_INVALID", `${location}.type`, "Primitive type must be layer, row or column.");
    checkNumbers(Object.fromEntries(Object.entries(primitive).filter(([key]) => ["gap", "padding", "headingHeight"].includes(key))),
      ["gap", "padding", "headingHeight"], location, addIssue);
    if (!Array.isArray(primitive.children) || primitive.children.length === 0) {
      addIssue("LAYOUT_PLAN_INVALID", `${location}.children`, "Primitive children must be a nonempty array.");
      return;
    }
    // Anonymous containers affect geometry only. Only an existing group starts a new local coordinate scope.
    primitive.children.forEach((child, index) => visit(child, `${location}.children[${index}]`, id ?? parentId));
  };
}

function validateOverrides(overrides, nodes, containers, addIssue) {
  if (overrides === undefined || !checkObject(overrides, null, "overrides", addIssue)) return;
  for (const [id, value] of Object.entries(overrides)) {
    const location = `overrides[${JSON.stringify(id)}]`;
    if (!nodes.has(id)) addIssue("LAYOUT_UNKNOWN_NODE", location, `Unknown node ID ${id}.`);
    checkNumbers(value, OVERRIDE_FIELDS, location, addIssue);
    if (!isObject(value) || containers.has(id)) continue;
    for (const field of ["gap", "padding", "headingHeight"]) if (Object.hasOwn(value, field)) {
      addIssue("LAYOUT_SPACING_TARGET", `${location}.${field}`, `${field} requires an existing group expanded as a container in the plan.`);
    }
  }
}

function validateEdges(edges, ids, addIssue) {
  if (edges === undefined || !checkObject(edges, null, "edges", addIssue)) return;
  for (const [id, value] of Object.entries(edges)) {
    const location = `edges[${JSON.stringify(id)}]`;
    if (!ids.has(id)) addIssue("LAYOUT_UNKNOWN_EDGE", location, `Unknown edge ID ${id}.`);
    if (!checkObject(value, ["route", "fromPort", "toPort"], location, addIssue)) continue;
    if (value.route !== undefined && !["straight", "orthogonal", "curved"].includes(value.route)) {
      addIssue("LAYOUT_PLAN_INVALID", `${location}.route`, "route must be straight, orthogonal or curved.");
    }
    for (const field of ["fromPort", "toPort"]) if (value[field] !== undefined && !["top", "right", "bottom", "left"].includes(value[field])) {
      addIssue("LAYOUT_PLAN_INVALID", `${location}.${field}`, "A port must be top, right, bottom or left; omit it for automatic selection.");
    }
  }
}

function checkNumbers(value, fields, location, addIssue) {
  if (value === undefined || !checkObject(value, fields, location, addIssue)) return;
  for (const [field, number] of Object.entries(value)) {
    if (!fields.includes(field)) continue;
    const positive = field === "width" || field === "height";
    const signed = field === "x" || field === "y";
    if (!Number.isFinite(number) || (positive ? number <= 0 : !signed && number < 0)) {
      addIssue("LAYOUT_PLAN_INVALID", `${location}.${field}`, `${field} must be a finite ${positive ? "positive" : signed ? "numeric" : "nonnegative"} value in diagram units.`);
    }
  }
}

function checkObject(value, fields, location, addIssue) {
  if (!isObject(value)) {
    addIssue("LAYOUT_PLAN_INVALID", location, "Expected an object.");
    return false;
  }
  if (fields) for (const key of Object.keys(value)) if (!fields.includes(key)) {
    addIssue("LAYOUT_PLAN_INVALID", location === "$" ? key : `${location}.${key}`, `Unsupported layout-plan field ${key}.`);
  }
  return true;
}
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
