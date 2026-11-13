# Diagram document model

The tool consumes plain JSON through public `flowsvg` SDK exports. Unknown fields are errors. Use `version: 1`, positive finite `viewport.width`/`height`, and arrays `nodes`, `edges`, `scenes`. `title` and `theme` are optional; theme is `light` or `dark`, default light. Empty `scenes` defines a static diagram. All coordinates, dimensions and measurement results use diagram units, not CSS or font pixels.

Optional `typography` contains positive finite `nodeLabel`, `edgeLabel` and `flowLabel` values. Omitted roles use 16/14/12. Ordinary labels and omitted structured-content font sizes use this context; explicit structured font sizes remain unchanged. See [purpose presets](delivery-contexts.md#purpose-presets) when authoring a new draft. No typography option changes node dimensions automatically.

## Emphasis colors

Optional top-level `emphasis` sets the diagram's highlight and flow-marker colors. For example, `"emphasis": { "fill": "#fff4db", "stroke": "#0f766e", "markerText": "#ffffff" }` uses a pale node highlight fill, teal highlight strokes and marker backgrounds, and white marker text. `markerText` changes only moving-marker text; node and edge text retain their existing color rules. Choose a highlight fill that works with the node text in the intended theme and inspect the actual result.

Each field is optional and falls back to the selected theme. Colors accept case-insensitive `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`; `null`, invalid colors and unknown fields are errors. Ordinary node/edge styles stay beneath the highlight layer; `unhighlight` restores their latest values. Browser hover uses the same emphasis colors, with border-only feedback by default, and stays outside exports.

Save author choices in the JSON so playback and exports share them. The Skill CLI consumes document `emphasis`; it adds no runtime palette override flag. The SDK also accepts per-field runtime overrides, but editing the document is the Skill's authoring path. See [transfer and emphasis](timeline.md#transfer-and-emphasis) for preserving relation colors during a flow.

## Geometry and relationships

Every node has a globally unique `id`, `kind`, finite `x`/`y` and positive finite `width`/`height`. Kinds are `rect`, `roundedRect`, `ellipse`, `cylinder`, `group`, `diamond`, `parallelogram`, `document` and `predefinedProcess`. A group supplies a local origin for children and rounded borders by default. Use `parentId` only for an existing group, without cycles. Child x/y are offsets from the parent's current origin, including nested groups. Groups do not clip children: explicitly allow room for child bounds and a heading. `visible` defaults true; hidden ancestors also hide descendants.

A node can have a simple `label` string or structured `content`, never both. Node `style` allows hexadecimal `fill`, `stroke`, `textColor`, nonnegative `strokeWidth`, and boolean `dashed` (for group borders). Use [color roles and palette](visual-design.md#color-roles-and-palette) for visual choices and source-supported state colors.

Simple node labels, including group headings, support explicit line breaks: write `"label": "Offline indexing\nBuild the knowledge base"` in JSON. The SDK also wraps text to the available width. Choose breaks that preserve meaningful units; allow room for all lines and, for groups, the children below the heading. Recheck nearby connections after wrapping; a line break alone does not guarantee clearance.

Every edge has a unique `id`, `from` and `to` pointing to nodes or groups. The arrow points from source to target. Select node, group or mixed endpoints using [relationship scope](semantic-patterns.md#relationship-scope-and-endpoints). Label the relation explicitly when direction alone is ambiguous. Separate requests and responses when both are supported by the material. Optional `fromPort`/`toPort` are `top`, `right`, `bottom`, `left`. `route` is `straight` (default), `orthogonal` or `curved`; `straight` draws the direct segment, including a diagonal for off-axis ports. Choose ports and routes through [connection design](visual-design.md#connections-and-relationship-labels). Edge `style` supports hexadecimal `stroke`, nonnegative `strokeWidth` and boolean `dashed`. `visible` defaults true; hidden endpoints hide the edge. Edges and nodes share a global ID space.

The viewport starts at document origin. Keep authored geometry within its width and height. Optional `viewport.fitHeight: {"padding": 24}` fits full-view height to current painted geometry while preserving width and origin. It does not move nodes or correct negative coordinates. Animated focus retains the authored viewport semantics; GIFs use fixed authored dimensions.

The document `title` is metadata, distinct from an HTML page heading and a node title. Author global page introductions through [editable HTML pages](tool-contract.md#editable-html-pages); keep object-specific content in nodes.

## Preset labels

Use `diamond` for a decision, `parallelogram` for input/output, `document` for a report/file, and `predefinedProcess` for a defined subprocess. The subprocess shape is one node, not a group or executable operation. Select these meanings only when supported by the sources.

These four kinds accept plain `label` only and reject structured `content`, including empty blocks. Their label safe areas, clipping and shape contours are owned by the SDK. After choosing width and typography, run `measure` before applying heights; a generic rectangular height is unsafe for a diamond or report wave. For a standalone input, use `{ "kind": "diamond", "width": 240, "label": ["Ready?", "Materials\ncomplete?"] }`. Empty strings are valid versions; the versions array must be nonempty. Top-level batch `label` remains metadata, so use a standalone object or complete draft for preset labels.

Complete-draft measurement includes the initial label and every `updateNode.value.label` replacement for these kinds. Empty or omitted initial text still reserves contour clearance. Width diagnostics remain actionable after increasing height: widen the node or obtain authorization for a text change. Visible overflowing text is clipped rather than shrunk. Existing ordinary-label whole-word wrapping does not describe these presets, which may split overwide words between complete graphemes.

For a complete static workflow, use [approval-review.json](../examples/approval-review.json) with its [teaching note](../examples/approval-review.md) and [source metadata](../resources/teaching-sources.json). `layout` accepts static drafts only; establish geometry before adding scenes, then measure all preset label versions and recheck spacing. Inspect actual playback and requested images separately from numeric measurement.


## Node content and measurement

Structured content is supported by `rect`, `roundedRect` and `cylinder`. It replaces a simple label and uses explicit fixed node dimensions. `content.blocks` contains ordered blocks:

| Block | Fields |
| --- | --- |
| Title | `type: "title"`, `text` |
| Paragraph | `type: "paragraph"`, `text`, optional `role: "body"` or `"auxiliary"` |
| List | `type: "list"`, `items`, optional `marker: "none"`, `"bullet"` or `"number"` |
| Entity graph | `type: "graph"`, positive `height`, local `nodes` and `edges` |

Title/paragraph text is a string or ordered array of `{text, style?}` spans. Text style supports positive `fontSize`, integer `fontWeight` from 100–900 and hexadecimal `color`; block styles also support `align: "left"|"center"|"right"`. A list item can contain `body`, `auxiliary`, `status`, `tags: [{text, style?}]`. Items can override `style`, `auxiliaryStyle`, `statusStyle`; tag style supports typography, hexadecimal `fill` and `shape: "rounded"|"pill"`. List style also accepts nonnegative `itemGap` and `tagGap`. Content style supports nonnegative `padding` and `blockGap`.

Graph nodes have `id`, `label`, center offsets `x`/`y` relative to the block's top left, and optional `highlighted`. Graph edges use `from`/`to` local IDs and are undirected. This block has fixed height and no independent player hit targets. It is not a nested diagram or a general statistical chart.

Content clips to the shape's safe area and never resizes its node. Measure text at the chosen width and typography before setting node height. Use a complete draft to measure its text-bearing nodes, or an independent input for content experiments. Read [the measurement CLI contract](tool-contract.md#content-measurement) before choosing an input, interpreting results or requesting a height-filled draft. The contract defines input forms, output fields, write conditions and measurement limits. [The multiple-version example](../resources/content-measurement.json) supplies a runnable independent input.

## Scenes and beats

Use `scenes: []` for a static diagram. Before adding animation actions, read [animation authoring](timeline.md) for the scene/beat schema, inherited state, content replacement and effective timing. Select export times from `compilation.beats` and `totalDurationMs` in the report.

The CLI reports field/reference and derived compilation errors separately. See [diagnosis and revision decisions](diagnostics-and-revisions.md) when checks report a problem. Complete static inputs include [layered architecture](../examples/layered-architecture.md), [application review](../examples/approval-review.md) and [record transformations](../examples/record-transformations.md).
