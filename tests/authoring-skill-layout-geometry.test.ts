/** Public pure geometry contract: layout follows a plan without editing diagram semantics. */
import { expect, test } from "vitest";
import { getLayoutMeasurementInputs, layoutDraft } from "../skills/flow-svg-diagram/scripts/layout-geometry.mjs";

const draft = {
  version: 1, title: "教学布局", viewport: { width: 200, height: 100 },
  nodes: [
    { id: "a", kind: "rect", x: 9, y: 8, width: 100, height: 40, label: "甲" },
    { id: "b", kind: "rect", x: 1, y: 2, width: 80, height: 60, label: "乙" }
  ],
  edges: [{ id: "ab", from: "a", to: "b", label: "关系", route: "curved" }], scenes: []
};
const plan = {
  schemaVersion: 1, strategy: "layered", canvas: { padding: 10 },
  gaps: { row: 20, layer: 30 }, layers: [{ type: "row", children: ["b", "a"] }]
};

test("plan order controls placement while document order, content and edge direction remain unchanged", () => {
  const source = JSON.stringify(draft);
  const result = layoutDraft(draft, plan, []);
  expect(result.document).toEqual({ ...draft, viewport: { width: 220, height: 100 }, nodes: [
    { ...draft.nodes[0], x: 110, y: 10 }, { ...draft.nodes[1], x: 10, y: 10 }
  ] });
  expect(JSON.stringify(draft)).toBe(source);
  expect(result.changes).toContainEqual({ objectType: "node", objectId: "a", field: "x", before: 9, after: 110 });
  expect(layoutDraft(draft, plan, [])).toEqual(result);
});

test("nested groups retain local child coordinates, heading reserves and two explicit card rows", () => {
  const grouped = { ...draft, nodes: [
    { id: "band", kind: "group", x: 99, y: 99, width: 400, height: 300, label: "层" },
    { id: "nested", kind: "group", parentId: "band", x: 0, y: 0, width: 400, height: 300, label: "分组" },
    ...draft.nodes.map((node) => ({ ...node, parentId: "nested" })),
    { id: "c", kind: "rect", parentId: "nested", x: 0, y: 0, width: 50, height: 30, label: "丙" }
  ] };
  const groupedPlan = { ...plan, layers: [{ type: "layer", id: "band", children: [
    { type: "column", id: "nested", gap: 7, padding: 5, headingHeight: 20, children: [
      { type: "row", children: ["a", "b"] }, "c"
    ] }
  ] }] };
  const result = layoutDraft(grouped, groupedPlan);
  expect(result.document.nodes).toEqual([
    { ...grouped.nodes[0], x: 10, y: 10, width: 242, height: 364 },
    { ...grouped.nodes[1], x: 16, y: 48, width: 210, height: 300 },
    { ...grouped.nodes[2], x: 5, y: 25 },
    { ...grouped.nodes[3], x: 125, y: 25 },
    { ...grouped.nodes[4], x: 5, y: 92 }
  ]);
});

test("measurement uses final override widths and content growth moves the next layer", () => {
  const content = { blocks: [{ type: "paragraph", text: "完整的中文说明" }] };
  const withContent = { ...draft, typography: { nodeLabel: 18 }, nodes: [
    { ...draft.nodes[0], content }, draft.nodes[1],
    { id: "untouched", kind: "rect", x: 2, y: 3, width: 50, height: 20, content }
  ] };
  const measuredPlan = { ...plan, defaults: { width: 120, height: 30 }, layers: ["a", "b"], overrides: { a: { width: 80 } } };
  expect(getLayoutMeasurementInputs(withContent, measuredPlan)).toEqual([
    { nodeId: "a", kind: "rect", width: 80, content, label: "甲", typography: { nodeLabel: 18 } },
    { nodeId: "b", kind: "rect", width: 120, label: "乙", typography: { nodeLabel: 18 } }
  ]);
  const measurements = [{ nodeId: "a", width: 80, recommendedHeight: 180, diagnostics: [] }];
  const result = layoutDraft(withContent, measuredPlan, measurements);
  expect(result.document.nodes).toEqual([
    { ...withContent.nodes[0], x: 10, y: 10, width: 80, height: 180 },
    { ...withContent.nodes[1], x: 10, y: 220, width: 120, height: 60 },
    withContent.nodes[2]
  ]);
  expect(result.document.viewport.height).toBe(290);
  expect(result.measuredNodes).toEqual(measurements);
});

test("label-only measurement uses final width, raises the next layer and keeps semantic fields", () => {
  const labelDraft = { ...draft, nodes: [
    { ...draft.nodes[0], width: 180, height: 20, label: "这是一个需要换行的中文摘要" },
    { ...draft.nodes[1], label: "下一层" }
  ] };
  const labelPlan = { ...plan, layers: ["a", "b"], overrides: { a: { width: 90 } } };
  const measurement = { nodeId: "a", width: 90, requiredHeight: 74, recommendedHeight: 74, currentHeight: 20,
    heightChange: 54, estimatedLineCount: 2, estimatedLineCountMethod: "public-sdk-baseline-y-estimate", diagnostics: [] };
  const source = JSON.stringify(labelDraft);
  expect(getLayoutMeasurementInputs(labelDraft, labelPlan)).toEqual([
    { nodeId: "a", kind: "rect", width: 90, label: "这是一个需要换行的中文摘要" },
    { nodeId: "b", kind: "rect", width: 80, label: "下一层" }
  ]);
  const result = layoutDraft(labelDraft, labelPlan, [measurement]);
  expect(result.document.nodes[0]).toMatchObject({ width: 90, height: 74, label: labelDraft.nodes[0].label });
  expect(result.document.nodes[1].y).toBe(114);
  expect(result.measuredNodes).toEqual([measurement]);
  expect(JSON.stringify(labelDraft)).toBe(source);
});

test("explicit label height override remains exact while measured changes are reported", () => {
  const labelDraft = { ...draft, nodes: [{ ...draft.nodes[0], height: 20, label: "需要保留窄带" }, draft.nodes[1]] };
  const labelPlan = { ...plan, layers: ["a", "b"], overrides: { a: { height: 20 } } };
  const measurement = { nodeId: "a", width: 100, requiredHeight: 80, recommendedHeight: 80, currentHeight: 20,
    heightChange: 60, estimatedLineCount: 3, estimatedLineCountMethod: "public-sdk-baseline-y-estimate", diagnostics: [] };
  const result = layoutDraft(labelDraft, labelPlan, [measurement]);
  expect(result.document.nodes[0].height).toBe(20);
  expect(result.document.nodes[1].y).toBe(60);
  expect(result.changes).not.toContainEqual(expect.objectContaining({ objectId: "a", field: "height" }));
});

test("expanded group labels use derived widths and grow group and next-layer heights", () => {
  const grouped = { ...draft, nodes: [
    { id: "band", kind: "group", x: 0, y: 0, width: 500, height: 30, label: "Long group heading" },
    { ...draft.nodes[0], parentId: "band", x: 0, y: 0 }, draft.nodes[1]
  ] };
  const groupPlan = { ...plan, layers: [{ type: "column", id: "band", children: ["a"] }, "b"] };
  expect(getLayoutMeasurementInputs(grouped, groupPlan)[0]).toMatchObject({ nodeId: "band", width: 132 });
  const measurement = { nodeId: "band", width: 132, recommendedHeight: 240, diagnostics: [] };
  const result = layoutDraft(grouped, groupPlan, [measurement]);
  expect(result.document.nodes[0]).toMatchObject({ width: 132, height: 240 });
  expect(result.document.nodes[2].y).toBe(280);
  expect(result.document.viewport.height).toBe(350);
  expect(() => layoutDraft(grouped, groupPlan, [{ ...measurement, width: 500 }])).toThrowError(
    expect.objectContaining({ code: "LAYOUT_MEASUREMENT_INVALID" }));
  const overridden = layoutDraft(grouped, { ...groupPlan, overrides: { band: { height: 20 } } }, [measurement]);
  expect(overridden.document.nodes[0].height).toBe(20);
});

test("automatic heights retain authored and default minima for leaves and expanded groups", () => {
  const grouped = { ...draft, nodes: [
    { id: "band", kind: "group", x: 0, y: 0, width: 500, height: 300, label: "Group" },
    { ...draft.nodes[0], parentId: "band", height: 180 }, draft.nodes[1]
  ] };
  const groupPlan = { ...plan, defaults: { height: 80 }, layers: [{ type: "column", id: "band", children: ["a"] }, "b"] };
  const result = layoutDraft(grouped, groupPlan);
  expect(result.document.nodes.map((node: { height: number }) => node.height)).toEqual([300, 180, 80]);
});

test("explicit coordinates and sizes win while groups include unmanaged children and preserve edge semantics", () => {
  const grouped = { ...draft, nodes: [
    { id: "band", kind: "group", x: 0, y: 0, width: 10, height: 10, label: "层" },
    ...draft.nodes.map((node) => ({ ...node, parentId: "band" })),
    { id: "unmanaged", kind: "rect", parentId: "band", x: 300, y: 200, width: 50, height: 30, label: "保留" },
    { id: "next", kind: "rect", x: 0, y: 0, width: 100, height: 40, label: "下一层" }
  ] };
  const overrides = { band: { x: 50, y: 25, padding: 10, headingHeight: 20, gap: 5 }, a: { x: 20, y: 100, width: 80, height: 20 } };
  const explicitPlan = { ...plan, layers: [{ type: "layer", id: "band", padding: 99, gap: 99, children: ["a", "b"] }, "next"], overrides,
    edges: { ab: { route: "orthogonal", fromPort: "bottom", toPort: "top" } } };
  const result = layoutDraft(grouped, explicitPlan, [{ nodeId: "a", width: 80, recommendedHeight: 180, diagnostics: [] }]);
  expect(result.document.nodes).toEqual([
    { ...grouped.nodes[0], x: 50, y: 25, width: 360, height: 240 },
    { ...grouped.nodes[1], x: 20, y: 100, width: 80, height: 20 },
    { ...grouped.nodes[2], x: 10, y: 125 }, grouped.nodes[3],
    { ...grouped.nodes[4], x: 10, y: 295 }
  ]);
  expect(result.document.edges).toEqual([{ ...draft.edges[0], route: "orthogonal", fromPort: "bottom", toPort: "top" }]);
  expect(result.overrides).toEqual([{ nodeId: "band", values: overrides.band }, { nodeId: "a", values: overrides.a }]);
});

test("override-only nodes keep every unspecified geometry field and are not implicitly measured", () => {
  const content = { blocks: [{ type: "paragraph", text: "保留原高度" }] };
  const original = { ...draft, nodes: [draft.nodes[0], { ...draft.nodes[1], content }] };
  const explicitPlan = { ...plan, defaults: { width: 999, height: 999 }, layers: ["a"], overrides: { b: { x: 300 } } };
  expect(getLayoutMeasurementInputs(original, explicitPlan)).toEqual([
    { nodeId: "a", kind: "rect", width: 999, label: "甲" }
  ]);
  expect(layoutDraft(original, explicitPlan).document.nodes[1]).toEqual({ ...original.nodes[1], x: 300 });
});

test.each(["left", "right"])("the %s sidebar uses its own geometry and explicit canvas dimensions remain fixed", (side) => {
  const sidebarPlan = { ...plan, canvas: { padding: 10, width: 150, height: 70 }, gaps: { sidebar: 30 }, layers: ["a"], sidebar: { side, layout: "b" } };
  const result = layoutDraft(draft, sidebarPlan);
  expect(result.document.viewport).toEqual({ width: 150, height: 70 });
  expect(result.document.nodes).toEqual([
    { ...draft.nodes[0], x: side === "left" ? 120 : 10, y: 10 },
    { ...draft.nodes[1], x: side === "left" ? 10 : 140, y: 10 }
  ]);
});

test.each([
  { nodeId: "a", width: 99, recommendedHeight: 100, diagnostics: [] },
  { nodeId: "a", width: 100, recommendedHeight: -1, diagnostics: [] },
  { nodeId: "a", width: 100, recommendedHeight: 100, diagnostics: [{ dimension: "width", message: "overflow" }] }
])("stale or unresolved measurements cannot be consumed by geometry", (measurement) => {
  expect(() => layoutDraft(draft, plan, [measurement])).toThrowError(expect.objectContaining({
    code: "LAYOUT_MEASUREMENT_INVALID", stage: "layout", location: "measurements[0]"
  }));
});

test("finite plan values that overflow arithmetic fail before a non-finite document can escape", () => {
  const hugePlan = { ...plan, defaults: { width: Number.MAX_VALUE }, gaps: { row: Number.MAX_VALUE } };
  expect(() => layoutDraft(draft, hugePlan)).toThrowError(expect.objectContaining({ code: "LAYOUT_GEOMETRY_INVALID", stage: "layout" }));
});

test("an override-only root node contributes its final bounds to an unconstrained viewport", () => {
  const explicitPlan = { ...plan, layers: ["a"], overrides: { b: { x: 300, y: 500 } } };
  const result = layoutDraft(draft, explicitPlan);
  expect(result.document.viewport).toEqual({ width: 390, height: 570 });
  expect(result.document.nodes[1]).toEqual({ ...draft.nodes[1], x: 300, y: 500 });
});

test("an existing prototype-named node ID receives its explicit geometry override", () => {
  const named = { ...draft, nodes: [draft.nodes[0], { ...draft.nodes[1], id: "toString" }], edges: [{ ...draft.edges[0], to: "toString" }] };
  const namedPlan = { ...plan, layers: ["a"], overrides: { toString: { x: 300 } } };
  expect(layoutDraft(named, namedPlan).document.nodes[1]).toEqual({ ...named.nodes[1], x: 300 });
});

test("fixed canvas constraints do not hide overflowing derived node extents", () => {
  const hugePlan = { ...plan, canvas: { width: 200, height: 100 }, layers: ["a"],
    overrides: { a: { x: Number.MAX_VALUE, width: Number.MAX_VALUE } } };
  expect(() => layoutDraft(draft, hugePlan)).toThrowError(expect.objectContaining({ code: "LAYOUT_GEOMETRY_INVALID" }));
});

test("a group named undefined does not apply its spacing override to anonymous wrappers", () => {
  const grouped = { ...draft, nodes: [
    { id: "undefined", kind: "group", x: 0, y: 0, width: 1, height: 1, label: "分组" },
    ...draft.nodes.map((node) => ({ ...node, parentId: "undefined" }))
  ] };
  const namedPlan = { ...plan, layers: [{ type: "layer", id: "undefined", children: [{ type: "row", children: ["a", "b"] }] }],
    overrides: { undefined: { padding: 10, headingHeight: 20, gap: 5 } } };
  expect(layoutDraft(grouped, namedPlan).document.nodes).toEqual([
    { ...grouped.nodes[0], x: 10, y: 10, width: 220, height: 100 },
    { ...grouped.nodes[1], x: 10, y: 30 }, { ...grouped.nodes[2], x: 130, y: 30 }
  ]);
});
