# Diagram document model

The tool consumes plain JSON through public `flowsvg` SDK exports. Unknown fields are errors. Use `version: 1`, positive finite `viewport.width`/`height`, and arrays `nodes`, `edges`, `scenes`. `title` and `theme` are optional; theme is `light` or `dark`, default light. Empty `scenes` defines a static diagram. All coordinates, dimensions and measurement results use diagram units, not CSS or font pixels.

Optional `typography` contains positive finite `nodeLabel`, `edgeLabel` and `flowLabel` values. Omitted roles use 16/14/12. Ordinary labels and omitted structured-content font sizes use this context; explicit structured font sizes remain unchanged. See [purpose presets](delivery-contexts.md#purpose-presets) when authoring a new draft. No typography option changes node dimensions automatically.

## Geometry and relationships

Every node has a globally unique `id`, `kind`, finite `x`/`y` and positive finite `width`/`height`. Kinds are `rect`, `roundedRect`, `ellipse`, `cylinder`, `group`. A group supplies a local origin for children and rounded borders by default. Use `parentId` only for an existing group, without cycles. Child x/y are offsets from the parent's current origin, including nested groups. Groups do not clip children: explicitly allow room for child bounds and a heading. `visible` defaults true; hidden ancestors also hide descendants.

A node can have a simple `label` string or structured `content`, never both. Node `style` allows hexadecimal `fill`, `stroke`, `textColor`, nonnegative `strokeWidth`, and boolean `dashed` (for group borders). Use [color roles and palette](visual-design.md#color-roles-and-palette) for visual choices and source-supported state colors.

Every edge has a unique `id`, `from` and `to` pointing to nodes or groups. The arrow points from source to target. Label the relation explicitly when direction alone is ambiguous. Separate requests and responses when both are supported by the material. Optional `fromPort`/`toPort` are `top`, `right`, `bottom`, `left`. `route` is `straight` (default), `orthogonal` or `curved`. Edge `style` supports hexadecimal `stroke`, nonnegative `strokeWidth` and boolean `dashed`. `visible` defaults true; hidden endpoints hide the edge. Edges and nodes share a global ID space.

The viewport starts at document origin. Keep authored geometry within its width and height. Optional `viewport.fitHeight: {"padding": 24}` fits full-view height to current painted geometry while preserving width and origin. It does not move nodes or correct negative coordinates. Animated focus retains the authored viewport semantics; GIFs use fixed authored dimensions.

The document `title` is metadata, distinct from an HTML page heading and a node title. Author global page introductions through [editable HTML pages](tool-contract.md#editable-html-pages); keep object-specific content in nodes.

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

Content clips to the shape's safe area and never resizes its node. Measure text at the chosen width and typography before setting node height. Use a complete draft to measure its text-bearing nodes, or an independent input for content experiments. Read [the measurement CLI contract](tool-contract.md#content-measurement) before choosing an input, interpreting results or requesting a height-filled draft. The contract defines input forms, output fields, write conditions and measurement limits. [The multiple-version example](../examples/content-measurement.json) supplies a runnable independent input.

## Scenes and beats

Use `scenes: []` for a static diagram. Before adding animation actions, read [animation authoring](timeline.md) for the scene/beat schema, inherited state, content replacement and effective timing. Select export times from `compilation.beats` and `totalDurationMs` in the report.

The CLI reports field/reference and derived compilation errors separately. See [diagnosis and revision decisions](diagnostics-and-revisions.md) when checks report a problem. Complete static inputs: [architecture](../examples/architecture.json), [deployment](../examples/deployment.json), [process](../examples/process.json).
