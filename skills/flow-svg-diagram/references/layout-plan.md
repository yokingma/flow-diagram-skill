# Layout-plan contract (version 1)

A layout plan is a skill input. It is separate from `diagram.json` and does not extend the public SDK schema. The Agent chooses the objects, relationships, parent groups, reading order and layout strategy. The layout strategy computes geometry for those existing objects. It cannot create, delete, merge, reorder or rewrite nodes, edges, parents or content.

`validateLayoutPlan(draft, plan)` in [layout-plan.mjs](../scripts/layout-plan.mjs) returns `{ valid, diagnostics }` without mutating either input. Diagnostics identify a field with `location`, explain the error in `reason`, and include `severity`, `stage`, `code` and `nextStep`. The CLI must also validate the diagram through the public SDK before computing geometry. A plan can only be used with a static draft whose `scenes` is exactly `[]`. Cyclic parent chains are rejected independently of SDK validation.

## Fields

All dimensions, coordinates, padding and gaps use diagram units, not browser pixels. Numbers must be finite. Width and height must be positive; spacing must be nonnegative. Coordinates may be negative, but existing layout checks can report clipping. Unknown fields are errors at every plan level.

| Field | Meaning and minimal value |
| --- | --- |
| `schemaVersion` | Required contract version: `1`. |
| `strategy` | Required strategy: `"layered"`. Other values are rejected. |
| `canvas` | Optional viewport constraints: `{ "width": 1200, "height": 900, "padding": 30 }`. Omitted width and height let the viewport grow to contain the layout; neither dimension shrinks below the draft viewport. Explicit width and height stay fixed even when layout checks report overflow. Padding is the outer inset. |
| `defaults` | Optional node dimensions and group reserves: `{ "width": 240, "height": 120, "groupPadding": 20, "headingHeight": 40 }`. Measured content height remains an input to geometry calculation. |
| `gaps` | Optional strategy gaps: `{ "layer": 36, "row": 24, "column": 20, "sidebar": 32 }`. `layer` separates root layers; `row` separates items in a horizontal row; `column` separates items in a vertical column; `sidebar` separates the main region and sidebar. |
| `layers` | Required nonempty ordered array of primitives: `["existing-root-node"]`. The strategy follows this order; it never infers order from edges or labels. |
| `sidebar` | Optional sidebar: `{ "side": "right", "layout": "existing-root-node" }`. Side is `left` or `right`; `layout` is one primitive. |
| `overrides` | Optional map keyed by existing node ID: `{ "card": { "x": 20, "y": 70, "width": 260, "height": 140 } }`. Only `x`, `y`, `width`, `height`, `gap`, `padding` and `headingHeight` are allowed. |
| `edges` | Optional map keyed by existing edge ID: `{ "request": { "route": "orthogonal", "fromPort": "right", "toPort": "left" } }`. Route is `straight`, `orthogonal` or `curved`. Ports are `top`, `right`, `bottom` or `left`; omit a port to retain the draft preference or SDK automatic selection. |

When omitted, canvas padding and all gaps are `0`. Group padding is `16` and group heading reserve is `32`. Omitted default node width and height retain the node's draft dimensions. Heading reserve is an explicit algorithm parameter; it is not inferred from font size. These defaults are overridable and do not guarantee label clearance.

## Primitives and parent coordinates

A primitive is an existing node ID string or an object with these fields:

```json
{
  "type": "layer",
  "id": "existing-group",
  "children": [
    { "type": "row", "gap": 24, "children": ["first-card", "second-card"] }
  ],
  "gap": 20,
  "padding": 18,
  "headingHeight": 42
}
```

`type` is `layer`, `row` or `column`. Rows arrange children horizontally. Columns arrange children vertically. A layer arranges its children vertically, so a layer with two `row` primitives has two rows of cards. `children` is a required nonempty ordered array. `gap`, `padding` and `headingHeight` are optional nonnegative numbers.

`id` is optional. When supplied on a container, it must reference an existing `group` node. Its children use that group's local coordinates, and the group retains its existing parent. Every referenced child must already belong to that parent in the draft. An anonymous row or column introduces no semantic parent and keeps the enclosing coordinate scope.

A node ID can occur only once across `layers`, nested children and `sidebar.layout`. Override and edge maps do not claim layout ownership. Nodes not referenced by a primitive retain their geometry unless an explicit override changes that node. An unmanaged child of a moved group still moves in absolute space because its original local coordinates and parent are preserved. Its existing local bounds still contribute to the computed group size.

Reserve group heading space above child content. `headingHeight` is an extra vertical reserve after top padding; it is not a text font size or an estimate of browser wrapping. Padding surrounds the child region. For nested groups, all child `x` and `y` values remain relative to the existing immediate parent, not the viewport or an anonymous wrapper.

## Explicit overrides

For group spacing, precedence is strategy defaults, then primitive fields, then the node's explicit override. Explicit `x`, `y`, `width` and `height` take precedence over calculated geometry. An override coordinate is relative to the existing parent, including for an override-only node. Spacing overrides require an existing group expanded as a container object in the plan. A leaf node or a group referenced only by an ID string has no arranged child region, so `gap`, `padding` and `headingHeight` overrides on those targets are errors.

Overrides cannot change a label, content, node kind, parent ID, edge endpoints or array order. A dimension override may create an overflow or another warning. The strategy retains that value and reports the warning; it does not silently enlarge gaps or shorten content to hide the issue. Edge geometry preferences change only the selected edge's route and ports. They do not guarantee global collision avoidance.

## Pure geometry interface

[layout-geometry.mjs](../scripts/layout-geometry.mjs) exposes two pure functions after plan and public SDK draft validation:

- `getLayoutMeasurementInputs(draft, plan)` returns planned text-bearing nodes in document order. Each item contains `nodeId`, final override/default/authored width and either structured `content` or a nonempty `label`. Expanded groups use their child-derived final width unless an explicit width override exists. The CLI strips the identifier and measures each applicable text source through the installed public SDK boundary.
- `layoutDraft(draft, plan, measurements)` consumes `{ nodeId, width, recommendedHeight, diagnostics }` items. Widths must match the final plan width. Heights must be positive and finite, with no unresolved diagnostics. The result contains `document`, `strategy`, `changes`, `overrides` and `measuredNodes`.

Automatic height is the maximum of the authored height, plan default height and measured required height for planned leaves and expanded groups. Label-only records include `currentHeight`, `requiredHeight`, `heightChange`, `estimatedLineCount` and the explicit public-SDK estimate method. The layout report separates `labelOnlyMeasurements` and `appliedHeightChanges` from retained warnings. An explicit height override remains exact, including when text needs more space; the resulting `text-overflow` warning remains for the Agent and user. Override-only nodes change only the explicitly supplied fields and are not measured; put a node into a primitive when its text should drive automatic height. Expanded groups include unlisted children's retained local bounds and their own label height when computing group dimensions. Group heading reserve remains explicit; label height estimation does not guarantee clearance between group text and children. A string reference to a group retains its existing child geometry and does not recursively lay out those children.

The strategy grows each omitted viewport dimension from its existing size to contain final root-node bounds and canvas padding. An explicit viewport width or height stays fixed. Negative coordinates, deliberate small dimensions and edge preferences can still produce warnings. Unrepresentable arithmetic fails with `LAYOUT_GEOMETRY_INVALID`; stale or unresolved measurements fail with `LAYOUT_MEASUREMENT_INVALID`. No strategy changes gaps to suppress warnings.

`changes` lists only actual geometry differences in original document order, using `{ objectType, objectId?, field, before, after }`. `overrides` records each supplied node override as `{ nodeId, values }`. Neither interface changes input objects or performs file, SDK installation or browser operations.

## Complete teaching input

Save this draft as `draft.json`. The objects describe a teaching arrangement, not production facts:

```json
{
  "version": 1,
  "viewport": { "width": 1200, "height": 900 },
  "nodes": [
    { "id": "band", "kind": "group", "x": 20, "y": 20, "width": 700, "height": 300, "label": "教学层" },
    { "id": "card", "kind": "rect", "parentId": "band", "x": 20, "y": 70, "width": 240, "height": 120, "label": "示例卡片" },
    { "id": "control", "kind": "rect", "x": 800, "y": 20, "width": 240, "height": 120, "label": "教学控制面" }
  ],
  "edges": [{ "id": "request", "from": "control", "to": "card", "label": "教学关联" }],
  "scenes": []
}
```

Save this complete plan as `layout-plan.json`. It demonstrates every plan field:

```json
{
  "schemaVersion": 1,
  "strategy": "layered",
  "canvas": { "width": 1200, "height": 900, "padding": 30 },
  "defaults": { "width": 240, "height": 120, "groupPadding": 20, "headingHeight": 40 },
  "gaps": { "layer": 36, "row": 24, "column": 20, "sidebar": 32 },
  "layers": [{
    "type": "layer", "id": "band", "padding": 18, "headingHeight": 42, "gap": 20,
    "children": [{ "type": "column", "children": [{ "type": "row", "children": ["card"] }] }]
  }],
  "sidebar": { "side": "right", "layout": "control" },
  "overrides": {
    "band": { "gap": 18, "padding": 20, "headingHeight": 44 },
    "card": { "x": 20, "y": 70, "width": 260, "height": 140 }
  },
  "edges": { "request": { "route": "orthogonal", "fromPort": "left", "toPort": "right" } }
}
```

Spacing values are teaching choices. They do not promise clearance for arbitrary labels or content. Continue with the existing measurement, validation and actual artifact inspection workflow after geometry calculation. Layout does not allocate author revisions or establish quality approval.
