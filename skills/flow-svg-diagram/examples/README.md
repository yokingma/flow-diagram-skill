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

## Use a recipe

Copy the selected JSON into the task workspace and adapt source-supported content. [recipe-sources.json](recipe-sources.json) records the invented facts and derivations used for these examples; replace that metadata with the user's real sources for a real task. Measure with the document's actual typography after changing widths or content, then use the existing validate, author, evidence and review workflow. Read [task workspace and retention rules](../references/tool-contract.md#task-workspace) before saving files.

For the card example, measurement gives required heights below the shared authored height. Shared height is an authoring choice; the tool does not infer which objects should match. The layered example's annotation nodes are explanations of the existing group-to-group arrows, not new business entities. If changing annotation position makes ownership ambiguous, reserve a clearer channel rather than deleting the relationship.
