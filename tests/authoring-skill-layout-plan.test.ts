/** Layout-plan contracts are tested through the read-only validation interface. */
import { expect, test } from "vitest";

const draft = {
  version: 1, viewport: { width: 800, height: 600 },
  nodes: [
    { id: "band", kind: "group", x: 0, y: 0, width: 700, height: 300 },
    { id: "card", kind: "rect", parentId: "band", x: 20, y: 60, width: 200, height: 100 },
    { id: "control", kind: "rect", x: 0, y: 350, width: 300, height: 100 }
  ],
  edges: [{ id: "request", from: "control", to: "card" }], scenes: []
};
const plan = { schemaVersion: 1, strategy: "layered", layers: [
  { type: "layer", id: "band", children: ["card"] }
] };

async function validate(input: unknown = plan, document: unknown = draft) {
  const { validateLayoutPlan } = await import("../skills/flow-svg-diagram/scripts/layout-plan.mjs");
  return validateLayoutPlan(document, input);
}

test("accepts a static plan without changing the draft or plan", async () => {
  const before = JSON.stringify({ draft, plan });
  expect(await validate()).toEqual({ valid: true, diagnostics: [] });
  expect(JSON.stringify({ draft, plan })).toBe(before);
});

test("reports unknown IDs and duplicate ownership at their plan fields", async () => {
  const result = await validate({ ...plan, layers: [
    { type: "layer", id: "band", children: ["card", "missing", "card"] }
  ] });
  expect(result.valid).toBe(false);
  expect(result.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "LAYOUT_UNKNOWN_NODE", location: "layers[0].children[1]" }),
    expect.objectContaining({ code: "LAYOUT_DUPLICATE_NODE", location: "layers[0].children[2]" })
  ]));
});

test("rejects animation and cyclic parents before geometry calculation", async () => {
  expect(await validate(plan, { ...draft, scenes: [{ id: "scene", beats: [] }] })).toMatchObject({
    valid: false, diagnostics: expect.arrayContaining([expect.objectContaining({ code: "LAYOUT_STATIC_ONLY", location: "scenes" })])
  });
  const cyclic = { ...draft, nodes: draft.nodes.map((node) => node.id === "band" ? { ...node, parentId: "card" } : node) };
  expect(await validate(plan, cyclic)).toMatchObject({ valid: false,
    diagnostics: expect.arrayContaining([expect.objectContaining({ code: "LAYOUT_PARENT_CYCLE" })]) });
});

test.each([
  [null, "$"],
  [{ ...plan, schemaVersion: 2 }, "schemaVersion"],
  [{ ...plan, strategy: "automatic" }, "strategy"],
  [{ ...plan, gaps: { row: -1 } }, "gaps.row"],
  [{ ...plan, defaults: { width: 0 } }, "defaults.width"],
  [{ ...plan, canvas: { height: Number.POSITIVE_INFINITY } }, "canvas.height"],
  [{ ...plan, overrides: { card: { label: "replacement" } } }, 'overrides["card"].label'],
  [{ ...plan, overrides: { card: { width: -10 } } }, 'overrides["card"].width'],
  [{ ...plan, layers: [{ type: "grid", children: [] }] }, "layers[0].type"],
  [{ ...plan, layers: [{ type: "row", children: "card" }] }, "layers[0].children"],
  [{ ...plan, layers: [] }, "layers"],
  [{ ...plan, semanticOrder: ["card"] }, "semanticOrder"]
])("rejects invalid plan fields without throwing: %j", async (input, location) => {
  expect(await validate(input)).toMatchObject({ valid: false,
    diagnostics: expect.arrayContaining([expect.objectContaining({ location, severity: "error", stage: "layout-plan" })]) });
});

test("preserves existing parent scopes through anonymous rows and columns", async () => {
  const valid = { ...plan, layers: [{ type: "column", children: [
    { type: "layer", id: "band", children: [{ type: "row", children: ["card"] }] }, "control"
  ] }] };
  expect(await validate(valid)).toMatchObject({ valid: true });
  expect(await validate({ ...plan, layers: ["card"] })).toMatchObject({ valid: false,
    diagnostics: expect.arrayContaining([expect.objectContaining({ code: "LAYOUT_PARENT_MISMATCH", location: "layers[0]" })]) });
  expect(await validate({ ...plan, layers: [{ type: "row", id: "control", children: ["band"] }] })).toMatchObject({ valid: false,
    diagnostics: expect.arrayContaining([expect.objectContaining({ code: "LAYOUT_GROUP_REQUIRED", location: "layers[0].id" })]) });
});

test("validates sidebar ownership, override references and edge geometry preferences", async () => {
  expect(await validate({ ...plan, sidebar: { side: "right", layout: "control" },
    overrides: { card: { x: -5, y: 70, width: 250, height: 140 }, band: { gap: 12, padding: 16, headingHeight: 40 } },
    edges: { request: { route: "orthogonal", fromPort: "right", toPort: "left" } }
  })).toMatchObject({ valid: true });
  expect(await validate({ ...plan, sidebar: { side: "middle", layout: "band" },
    overrides: { missing: { x: 5 } }, edges: { absent: { route: "automatic", fromPort: "auto", from: "card" } }
  })).toMatchObject({ valid: false, diagnostics: expect.arrayContaining([
    expect.objectContaining({ location: "sidebar.side" }),
    expect.objectContaining({ code: "LAYOUT_DUPLICATE_NODE", location: "sidebar.layout" }),
    expect.objectContaining({ code: "LAYOUT_UNKNOWN_NODE", location: 'overrides["missing"]' }),
    expect.objectContaining({ code: "LAYOUT_UNKNOWN_EDGE", location: 'edges["absent"]' }),
    expect.objectContaining({ location: 'edges["absent"].route' }),
    expect.objectContaining({ location: 'edges["absent"].fromPort' }),
    expect.objectContaining({ location: 'edges["absent"].from' })
  ]) });
});

test("rejects spacing overrides that have no expanded group container to arrange", async () => {
  expect(await validate({ ...plan, overrides: { card: { gap: 10 } } })).toMatchObject({ valid: false,
    diagnostics: expect.arrayContaining([expect.objectContaining({ code: "LAYOUT_SPACING_TARGET", location: 'overrides["card"].gap' })]) });
  expect(await validate({ ...plan, layers: ["band"], overrides: { band: { padding: 10, headingHeight: 40 } } })).toMatchObject({ valid: false,
    diagnostics: expect.arrayContaining([
      expect.objectContaining({ code: "LAYOUT_SPACING_TARGET", location: 'overrides["band"].padding' }),
      expect.objectContaining({ code: "LAYOUT_SPACING_TARGET", location: 'overrides["band"].headingHeight' })
    ]) });
});
