# Rendering gotchas

Before arranging new or revised geometry, read the entries whose conditions match the draft. Use the linked methods for the complete operation. These are risk-prevention choices, not automatic repairs or additional approval steps.

## Long relationship labels on short paths

- **Condition and symptom:** a long label occupies a short edge path, especially between closely spaced groups. Automatic wrapping can leave one or two characters per line, even though the document validates.
- **Start with:** reserve enough path and label space before placing the connected objects. If the relation needs a sentence, use an unlabelled arrow with a nearby, clearly associated explanation. The [layered recipe](visual-design.md#layered-architecture-and-sidebar) demonstrates this choice. Annotation nodes describe the existing relationship; they are not new business entities. Preserve its direction and endpoints.
- **Current checks:** in SDK 0.2.3, purely vertical edge labels use endpoint column widths; other edge labels use available path space. Widening a vertical gap alone may leave wrapping unchanged. `measure` reports node content and node labels, not edge-label fit. Existing overlap warnings do not guarantee detection of awkward wrapping; [`LABEL_VERTICAL_RUN`](diagnostics-and-revisions.md#short-edge-label-runs) flags conservative runs of very short soft-wrapped lines from public SDK estimates; it does not catch every awkward line break.
- **Still view:** trace the actual path and read the entire label at the target size. Check that a separate explanation has unambiguous ownership and does not hide an arrowhead.

## Sidebars beside cross-region relationships

- **Condition and symptom:** cross-region edges are added after a sidebar is positioned; routes can pass through an unrelated group or appear to make the sidebar an endpoint.
- **Start with:** reserve the main relationship channels before positioning the sidebar. Coordinate ports and sidebar placement using the [connection recipe](visual-design.md#connections-and-relationship-labels). Use an in-card explanation only when it preserves the required relationship and its ownership.
- **Current checks:** the SDK routes edges and detects some node-related risks, but does not guarantee container avoidance. Container-crossing diagnosis is under evaluation, not a default check.
- **Still view:** follow each cross-region path through bends and crossings to the destination arrowhead. Distinguish membership boundaries from paths and explanatory side notes.

## Borderless headings and supporting text

- **Condition and symptom:** a white node fill is used to make a heading look unboxed, but the theme's border remains visible.
- **Start with:** explicitly set the supported fill, stroke and `strokeWidth: 0` for the intended borderless appearance. Use text color that contrasts with the carrying background. See the [node style contract](document-model.md#geometry-and-relationships).
- **Current checks:** valid style fields can be checked, but the tool cannot infer a borderless design intention from a white fill.
- **Still view:** inspect the heading on the actual background, including transparent exports on their carrying surface. Check separation from surrounding content.

## Narrow cards and text wrapping

- **Condition and symptom:** Long terms, titles or several tags occupy a narrow card in any language. CJK and mixed scripts also vary in glyph width; character counts alone cannot establish fit. Punctuation or a term can become stranded.
- **Start with:** measure the complete content using the final width and actual typography, then allocate height and nearby space. Adjust width or organization before reducing text size. Preserve meaning when changing wording. See [content measurement](static-layout.md#structure-and-layout) and the [long-content card recipe](visual-design.md#repeated-cards-and-longer-content).
- **Current checks:** SDK 0.2.3 preserves complete Latin words in ordinary labels; an intact word can exceed the estimated width. `measure` gives deterministic content-height and line-count estimates, so a height recommendation alone does not establish horizontal fit. It does not report browser glyph pixels or prove that every possible line break reads well.
- **Still view:** read titles, sentences, list items and tags at the intended display width. Check punctuation, term boundaries and tag emphasis, not only clipping.

## Short labels and optical alignment

- **Condition and symptom:** identical text anchors or padding still appear misaligned across letters, CJK glyphs, digits, punctuation or mixed fonts; a rounded shape's content safe area can add a visible inset.
- **Start with:** establish a shared reading edge and text roles, then inspect actual rendered labels. A separate border group and borderless text rect can decouple decoration from the text inset when needed; keep their local coordinates explicit. See [source mapping and service cards](visual-design.md#source-mapping-and-service-cards).
- **Current checks:** content measurement estimates line count and height. Coordinate equality or a browser bounding box is not a guarantee of optical centering, and a font-ready signal does not prove identical glyphs across hosts.
- **Still view:** compare title starts, number columns, label centers and border gaps at the target size. If browser measurement assists a correction, record the font, coordinate system and measured condition; recheck visually after the change instead of applying a fixed offset to every font.

## Content changes after geometry is arranged

- **Condition and symptom:** content grows, a width changes or measurement increases a node's height, while later rows or the parent group retain old coordinates and dimensions.
- **Start with:** recompute affected rows, heading space, containers and connection channels. Reuse the same [layout plan](static-layout.md#layout-plan-workflow) for repeated geometry; keep intentional exceptions explicit.
- **Current checks:** height application increases node heights only. Layout plans recalculate managed geometry and preserve explicit overrides; finite checks can find some overflow, overlap and clipping. Neither operation proves complete collision avoidance.
- **Still view:** inspect the changed region and affected relationships. Keep intended height differences when content or comparison purpose requires them; there is no global equal-height threshold.

For logs or intermediates that must survive cleanup, decide retention when [creating task files](tool-contract.md#task-workspace), rather than after finalization.
