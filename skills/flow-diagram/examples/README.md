# Teaching examples and design starting points

All bundled examples are teaching setups, not production facts. Semantic examples demonstrate objects, relations and SDK capabilities; a runnable file alone is not a recommended visual composition. Use [semantic patterns](../references/semantic-patterns.md) for their facts and limitations. The `recipe-` examples illustrate the [composition recipes](../references/visual-design.md#composition-recipes) and retain the scope below.

## Recipe display checks

The following actual SVGs were rendered at time 0 with the locked SDK 0.2.2 and viewed as target-size artifact-evidence PNGs on macOS with prepared Chrome 156.0.8078.74, device scale factor 1 and a white backdrop on 2026-10-31. They have empty scenes and no animation. These observations support these exact static conditions, not smaller widths, HTML playback or user aesthetic acceptance.

| Design starting point | Canvas and checked CSS width | Viewed result and limits |
| --- | --- | --- |
| [Layered architecture and sidebar](recipe-layered-architecture.json) | 1280 × 1080; 1280px | Three named layers and two shared columns remain readable. Two downward arrows occupy the inter-layer gaps; nearby borderless notes explain each arrow. The dashed sidebar remains outside the main paths. Intentional height differences reflect different card content; the sidebar has open lower space for visual alignment, not additional implied components. |
| [Process with a return](recipe-process-return.json) | 1160 × 600; 1160px | The forward collect/review/archive row, downward revision branch and curved return are traceable. Two incoming paths share the review node's left port; this is an intentional convergence, not an extra processing stage. No retry count or delay is specified. |
| [Long-content cards](recipe-content-cards.json) | 1100 × 384; 1100px | Three cards share title, paragraph and list/tag structure with stable left alignment. All content fits the shared 324-unit height; tags remain below title emphasis. Their horizontal placement compares concerns without adding dependencies. |

No clipping or text overlap was observed in these viewed final surfaces. These are observations, not a zero-defect guarantee. The checks did not cover other fonts, operating systems, narrower placements, dark backgrounds or actual offline HTML. The original semantic examples keep their separately documented limitations; these starting points do not retroactively approve them.

## Presentation recipe checks

On 2026-11-03, the following neutral recipes were generated with the locked SDK 0.2.2 and inspected on macOS with Google Chrome 156.0.8078.80, device scale factor 1 and a white backdrop. Each final SVG and PNG at time 0 was actually viewed through its target-size artifact evidence. Actual offline HTML screenshots were also viewed, with a recorded 1440 × 1000 browser viewport (full-page screenshots can be taller). These checks are separate from the earlier recipe checks above.

| Teaching recipe | Canvas; checked SVG/PNG display size | Actual observations |
| --- | --- | --- |
| [No-edge capability overview](recipe-capability-overview.json) | 960 × 600; 720 × 450 CSS px | Three parallel responsibility cards share title/body starts and padding. Existing responsibilities, the proposed capability and unknown authorization/launch conditions remain explicit. No edge implies an execution order. One static HTML state at 0ms was viewed. |
| [Source mapping and service cards](recipe-source-services.json) | 1280 × 560; 1200 × 525 CSS px | The 1/2/21 number column is separate from source descriptions. Four service cards share reading edges and spacing. The inter-region arrow means a group-level needs mapping, not runtime calls or a promise to deliver 21 items. One static HTML state at 0ms was viewed. |
| [All-visible parallel flow](recipe-parallel-flow.json) | 960 × 720; 720 × 540 CSS px | Both nodes, descriptions and relationship notes remain visible. Two independent paths transfer in the same direction; notes sit outside the marker paths. Twelve HTML states were viewed across opening, three repeated flows and the final hold. |

No clipping, text overlap or marker/text collision was observed in these final viewed surfaces. Shared card heights leave deliberate open space; this is a composition choice rather than an automatic quality score. Invented facts and limits are recorded in [recipe-sources.json](recipe-sources.json).

The animation compiles to 9000ms: an 800ms opening, three 2400ms parallel-flow beats and a 1000ms final hold. Viewed HTML sample times were `0, 0, 800, 925, 2000, 3200, 3325, 4400, 5600, 5725, 6800, 9000` ms. The bounded sample plan omitted the 8000ms beat boundary. Programmatic playback advanced and paused successfully; viewing these screenshots does not establish continuous visual playback inspection. The SVG/PNG checks cover only time 0.

These observations cover the stated sizes and host. Actual PowerPoint/WPS placement and playback, other fonts/platforms/backgrounds, narrower placements and continuous visual playback were not checked. The original nine-page customer case was not independently revalidated. Neither these examples nor passing checks establish user aesthetic approval or a measured reduction in rework.

## Use a recipe

Copy the selected JSON into the task workspace and adapt source-supported content. [recipe-sources.json](recipe-sources.json) records the invented facts and derivations used for these examples; replace that metadata with the user's real sources for a real task. Measure with the document's actual typography after changing widths or content, then use the existing validate, author, evidence and review workflow. Read [task workspace and retention rules](../references/tool-contract.md#task-workspace) before saving files.

For the card example, measurement gives required heights below the shared authored height. Shared height is an authoring choice; the tool does not infer which objects should match. The layered example's annotation nodes are explanations of the existing group-to-group arrows, not new business entities. If changing annotation position makes ownership ambiguous, reserve a clearer channel rather than deleting the relationship.

## Editable HTML page starter

[html-page.html](html-page.html) is an editable page shell, not a second final delivery file. Copy it to the task workspace and adapt headings, prose and CSS. Preserve the single managed playback region, then submit the complete page with `author --html`; see [content placement](../references/delivery-contexts.md#content-placement) and [the page contract](../references/tool-contract.md#editable-html-pages).

The starter retains a 720px minimum playback width in a focusable horizontal reading area; change `--diagram-reading-width` for the actual diagram typography. Page prose still wraps at narrow viewport widths. Check both horizontal ends and controls, and record playback width separately from viewport width. The value itself does not establish readable labels or actual viewing. Keep resources inline/data URLs for offline sharing.
