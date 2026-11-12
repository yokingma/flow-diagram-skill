# Static authoring and layout

Start with the message the reader should retain. List each source-supported object, directed relationship and boundary. Use the label language selected for the task, defaulting to the source language. Put source evidence and any explicitly user-approved assumptions in metadata; the tool records metadata but cannot establish its truth. A clear brief needs no separate layout approval.

## Delivery context

For a new or revised draft, read [delivery contexts](delivery-contexts.md) before choosing canvas and density. Reuse known preferences and purpose; follow its missing-context rule when information is absent. Read [semantic patterns](semantic-patterns.md#choose-by-the-readers-question) to select an organization by the reader's question, including inventories without runtime edges as well as relationship and process diagrams.

## Layout plan workflow

Use a layout plan when repeated geometry should be recalculated after content changes. The Agent chooses semantic mode, object ownership, reading order and the plan; the layout strategy computes geometry for existing IDs. Use direct coordinates when the scene is irregular or the plan would obscure the intended meaning. A plan changes geometry only. It does not infer semantics, reorder objects or alter relationships. Explicit overrides preserve exceptional geometry; optional calculations assist actual viewing. See the [layout-plan contract](layout-plan.md) and the bundled teaching pair [layout-assistance.json](../examples/layout-assistance.json) / [layout-assistance-plan.json](../examples/layout-assistance-plan.json).

Keep one editable source at `<task-workspace>/draft.json` and reuse it through these operations:

1. **Draft** the semantic structure and static JSON. Confirm IDs, relationships, parent scopes and reading order.
2. **Measure when needed** with `measure --input <draft.json> --in-place`. The command measures complete content and [preset labels](document-model.md#preset-labels), then increases heights in the selected source. SDK estimates remain auxiliary.
3. **Layout** with `layout --input <draft.json> --plan <layout-plan.json> --in-place`. Read the changed geometry and explicit overrides from stdout; no additional draft copy is needed.
4. **Validate and author** from that same path. Correct actual input or execution errors and regenerate the current HTML and requested images after source edits.
5. **View and revise** the actual HTML and requested images under their display conditions. Use the design guidance to improve expression and recheck affected files or stages. Registered evidence is an additional branch only when explicitly requested.
6. **Finalize** the current generated result after the source has been reauthored. Follow [finalization](tool-contract.md#finalize-the-task); retain unresolved issues and viewing gaps in the delivery explanation.

In-place writes are limited to the canonical task-root source; external inputs, generated current JSON and immutable checkpoints remain protected. Use an explicit `--output <new-draft.json>` only when a separate copy is wanted. Both modes preserve semantics and use complete-file publication; failures preserve the selected source. See [write protection](tool-contract.md#write-a-height-filled-draft).
The example gaps are teaching settings for its content and viewport. They do not promise clearance for arbitrary labels or CJK text.

`layout` requires `scenes: []`. Establish static geometry before adding animation; then use complete-draft `measure` to include every preset label replacement. Recheck spacing after any height increase. Animated width/height changes require separate state measurements and explicit authoring geometry.

## Structure and layout

Choose a structure that explains the material. The following are examples, and can be mixed:

- Architecture: group components by the stated system boundary, keep children in local coordinates, and label dependency arrows. Use a static overview so the whole structure is readable. Start from [architecture.json](../examples/architecture.json).
- Deployment: show named hosts, replicas and data stores only when the input states them. Put replicas on parallel rows and retain the actual routing relationships. Start from [deployment.json](../examples/deployment.json).
- Process: arrange source-supported stages left to right or top to bottom. Label branches and return paths when present; include no implied retry, timeout or success condition. Empty scenes are sufficient when the user needs a static process. Start from [process.json](../examples/process.json).

Apply the selected [design recipes](visual-design.md#design-methods-and-recipes) for spacing, containers, ports, and connection routes. Author explicit node dimensions. The SDK routes edges, but does not guarantee complete collision avoidance or global automatic layout.

For structured content and label-only nodes, choose width from the communication hierarchy and run `measure` on the complete draft. The result reports each node ID, current and required height, positive height change, estimated line count and diagnostics. Label line counts are deterministic public-SDK estimates, not browser pixel measurements or formal SVG/PNG evidence. Apply height increases to the same draft with `--in-place`; use `--output` only for an explicit separate copy. Auxiliary SDK estimates do not block height backfill; correct input or execution failures before retrying. Height backfill only increases node heights and leaves coordinates, groups and spacing for the Agent to arrange. For layout plans, use the same final widths and let `layout` apply required heights as automatic lower bounds; explicit `overrides[id].height` remains exact and retains a `text-overflow` warning when it is smaller.

Both height backfill and automatic layout preserve the authored height as a lower bound. When an initial size is generous or content becomes shorter, review width and height using the [card sizing recipe](visual-design.md#repeated-cards-and-longer-content); reduce excess space in the working draft before recomputing surrounding rows, groups and connection channels. Recheck text fit and affected routes after resizing.

Use diagnostic `sourcePath` to locate the original content block or label, including animated replacements; consult [measurement diagnostics](tool-contract.md#locate-sdk-measurement-diagnostics) before changing dimensions. Width and graph-local overflow require their own checks; increasing outer node height is insufficient.

For unrelated content, a top-level measurement array remains available. The measurement command does not decide whether a title is acceptable for a product-specific height budget or expose browser wrapping pixels; compare the returned height with your chosen budget and inspect diagnostics before claiming the content fits. Cylinder safe areas reserve top and bottom caps. Groups and ellipses use simple labels instead of structured content.

For optional source-bound wrapping records, use `measure --lines` and read [estimated text lines](tool-contract.md#inspect-estimated-text-lines). Compare the estimates with the actual image; natural terminology breaks and whitespace remain visual judgments.

Draft measurement covers node content and node labels. It does not measure edge-label fit; reserve relationship channels and follow [short-path label guidance](rendering-gotchas.md#long-relationship-labels-on-short-paths) before relying on a clean node measurement result.

Before invoking the tool, compare every object, edge direction and parent relationship against the evidence. After the tool runs, read [diagnostics and revisions](diagnostics-and-revisions.md) for warning coverage and user decisions. For browser screenshots, read [visual inspection](visual-checks.md). Structural validation and finite layout checks are separate from actual visual inspection.

To try a complete static example after installing the skill, first create a canonical [task workspace](tool-contract.md#task-workspace). Replace `<task-workspace>` with that path and run:

```text
node <skill-directory>/scripts/flowsvg.mjs author --input <skill-directory>/examples/architecture.json --name architecture --svg --time 0 --output "<task-workspace>/history"
node <skill-directory>/scripts/flowsvg.mjs measure --input <skill-directory>/examples/content-measurement.json
```

These commands use only the installed skill and its isolated SDK. They do not require a source checkout, showcase build, browser or online handbook after the runtime cache is complete.
