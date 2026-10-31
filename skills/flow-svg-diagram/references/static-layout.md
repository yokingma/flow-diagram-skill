# Static authoring and layout

Start with the message the reader should retain. List each source-supported object, directed relationship and boundary. Keep labels in the source language. Put source evidence and any explicitly user-approved assumptions in metadata; the tool records metadata but cannot establish its truth. A clear brief needs no separate layout approval.

## Delivery context

When the brief specifies presentation/web placement, target display size or interactive playback requirements, read [delivery contexts](delivery-contexts.md) before choosing canvas and density. For requests, retry/state transitions, fan-in/bottlenecks, staged processing or system boundaries, read [semantic patterns](semantic-patterns.md) for required evidence, common misrepresentations and static-frame choices.

## Layout plan workflow

Use a layout plan when repeated geometry should be recalculated after content changes. The Agent chooses semantic mode, object ownership, reading order and the plan; the layout strategy computes geometry for existing IDs. Use direct coordinates when the scene is irregular or the plan would obscure the intended meaning. A plan changes geometry only. It does not infer semantics, reorder objects, alter relationships or remove warnings. Explicit overrides preserve exceptional geometry; warnings remain for the Agent and user to decide. See the [layout-plan contract](layout-plan.md) and the bundled teaching pair [layout-assistance.json](../examples/layout-assistance.json) / [layout-assistance-plan.json](../examples/layout-assistance-plan.json).

Follow this sequence once for every layout-plan task:

1. **Draft** the semantic structure and save the static `diagram.json`. Confirm IDs, relationships, parent scopes and reading order.
2. **Measure** complete node content with the installed `measure` command. Apply a height-filled copy only when requested; keep coordinates and groups under author control.
3. **Layout** with the same validated `layout-plan.json`. The command writes a new draft and reports changed geometry, overrides and retained warnings.
4. **Validate** the layout draft, then read field, compile and finite geometry diagnostics. Resolve meaning-changing choices with the user.
5. **Author/review** the requested HTML/SVG/PNG/GIF. HTML review covers the delivered HTML states; ordinary preview review covers sampled SDK frames. For existing SVG/PNG, use `evidence --from <diagram-revision>` to collect missing target conditions, then actually view the images and use independent `review --artifact-review --evidence-from <source>`. Read [artifact evidence](artifact-evidence.md) for defaults and accumulated conditions.
6. **Finalize** only the selected revision after requested files and required review scope are complete. Delivery completion and quality coverage remain separate.

The example gaps are teaching settings for its content and viewport. They do not promise clearance for arbitrary labels or CJK text.

## Structure and layout

Choose a structure that explains the material. The following are examples, and can be mixed:

- Architecture: group components by the stated system boundary, keep children in local coordinates, and label dependency arrows. Use a static overview so the whole structure is readable. Start from [architecture.json](../examples/architecture.json).
- Deployment: show named hosts, replicas and data stores only when the input states them. Put replicas on parallel rows and retain the actual routing relationships. Start from [deployment.json](../examples/deployment.json).
- Process: arrange source-supported stages left to right or top to bottom. Label branches and return paths when present; include no implied retry, timeout or success condition. Empty scenes are sufficient when the user needs a static process. Start from [process.json](../examples/process.json).

Apply the selected [design recipes](visual-design.md#design-methods-and-recipes) for spacing, containers, ports, and connection routes. Author explicit node dimensions. The SDK routes edges, but does not guarantee complete collision avoidance or global automatic layout.

For structured content and label-only nodes, choose width from the communication hierarchy and run `measure` on the complete draft. The result reports each node ID, current and required height, positive height change, estimated line count and diagnostics. Label line counts are deterministic public-SDK estimates, not browser pixel measurements or formal SVG/PNG evidence. Pass `--output` to create a separate draft only after all diagnostics are resolved; the operation only increases node heights and leaves coordinates, groups and spacing for the Agent to arrange. For layout plans, use the same final widths and let `layout` apply required heights as automatic lower bounds; explicit `overrides[id].height` remains exact and retains a `text-overflow` warning when it is smaller. For unrelated content, a top-level measurement array remains available. The measurement command does not decide whether a title is acceptable for a product-specific height budget or expose browser wrapping pixels; compare the returned height with your chosen budget and inspect diagnostics before claiming the content fits. Cylinder safe areas reserve top and bottom caps. Groups and ellipses use simple labels instead of structured content.

Draft measurement covers node content and node labels. It does not measure edge-label fit; reserve relationship channels and follow [short-path label guidance](rendering-gotchas.md#long-relationship-labels-on-short-paths) before relying on a clean node measurement result.

Before invoking the tool, compare every object, edge direction and parent relationship against the evidence. After the tool runs, read [diagnostics and revisions](diagnostics-and-revisions.md) for warning coverage and user decisions. For browser screenshots, read [visual inspection](visual-checks.md). Structural validation and finite layout checks are separate from actual visual inspection.

To try a complete static example after installing the skill, run:

```text
node <skill-directory>/scripts/flowsvg.mjs author --input <skill-directory>/examples/architecture.json --name architecture --svg --time 0
node <skill-directory>/scripts/flowsvg.mjs measure --input <skill-directory>/examples/content-measurement.json
```

These commands use only the installed skill and its isolated SDK. They do not require a source checkout, showcase build, browser or online handbook after the runtime cache is complete.
