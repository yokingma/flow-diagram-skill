# Rendering gotchas

During design, consult these failure conditions to identify risks relevant to the explanation and display context. Revisit technical details as the draft develops. **Start with** offers candidate treatments to adapt and compare in the rendered result; choose another approach when it better preserves meaning and readability. Record decisions that materially affect the design rather than an entry-by-entry checklist.

## Long relationship labels on short paths

- **Condition and symptom:** a long label occupies a short edge path, especially between closely spaced groups. Automatic wrapping can leave one or two characters per line, even though the document validates.
- **Start with:** reserve enough path and label space before placing the connected objects. If the relation needs a sentence, use an unlabelled arrow with a nearby, clearly associated explanation. The [layered recipe](visual-design.md#layered-architecture-and-sidebar) demonstrates this choice. Annotation nodes describe the existing relationship; they are not new business entities. Preserve its direction and endpoints.
- **Current checks:** purely vertical edge labels use endpoint column widths; other edge labels use available path space. Widening a vertical gap alone may leave wrapping unchanged. `measure` reports node content and node labels, not edge-label fit. Optional geometry observations do not judge wrapping quality. Use the actual target-size image to decide whether the label is readable.
- **Still view:** trace the actual path and read the entire label at the target size. Check that a separate explanation has unambiguous ownership and does not hide an arrowhead.

## Sidebars beside cross-region relationships

- **Condition and symptom:** cross-region edges are added after a sidebar is positioned; routes can pass through an unrelated group or appear to make the sidebar an endpoint.
- **Start with:** reserve the main relationship channels before positioning the sidebar. Coordinate ports and sidebar placement using the [connection recipe](visual-design.md#connections-and-relationship-labels). Use an in-card explanation only when it preserves the required relationship and its ownership.
- **Current checks:** the SDK routes edges and detects some node-related risks, but does not guarantee container avoidance. Container-crossing diagnosis is under evaluation, not a default check.
- **Still view:** follow each cross-region path through bends and crossings to the destination arrowhead. Distinguish membership boundaries from paths and explanatory side notes.

## Endpoint scope and obstructed paths

- **Condition and symptom:** an overview expresses collective layer support as many child-to-child edges, a specific component relationship points to its parent group, or a path crosses unrelated content or obscures another relationship. The result can be a dense fan of component arrows, an arrowhead on the wrong boundary or an ambiguous path. A channel that is too narrow for a label can create the same crowding as [short-path labels](#long-relationship-labels-on-short-paths).
- **Start with:** select [relationship scope and endpoints](semantic-patterns.md#relationship-scope-and-endpoints) before geometry, then use [connection design](visual-design.md#connections-and-relationship-labels) to compare the actual candidate paths. Allocate space for the selected path before placing sidebars or labels. If no path can carry a label without crossing content, use a nearby explanation that clearly belongs to that relationship.
- **Current checks:** `validate` may report some edge-node or label overlap, but it does not infer relationship meaning, reject an unintended group endpoint or treat a diagonal route as a failure. `measure` does not prove channel width or edge-label fit. Passing structural checks is not evidence that the arrow reaches the intended card or avoids visual collision.
- **Still view:** inspect the rendered path at the target size, preferably with a crop of the busy channel. Trace from the source card or group through every bend to the arrowhead. Confirm that the arrowhead lands on the intended boundary, every segment stays in its reserved channel, no unrelated node is crossed or covered, and parallel directions remain distinguishable.

## Independent edges share a routing channel

- **Condition and symptom:** independent edges use the same side or layer gap. In an observed layered draft, changing several fan-in edges to `orthogonal` left long coincident segments; their individual sources and destinations remained hard to follow. Other routes can also coincide or become hard to distinguish. Solid and dashed relationships can appear merged, and several arrowheads can look like one bus. This observation establishes that switching route mode alone can leave ambiguity; it does not establish a general preference against bends.
- **Start with:** resolve endpoint scope first, then arrange the remaining endpoints, group gaps and ports together. Inspect the rendered routes before adding labels. If paths still coincide, revise the geometry or route choice in the working draft and re-view the affected relationships. Preserve independently supported edges; a bus or junction requires source meaning or an explicitly authorized meaning change.
- **Current checks:** finite diagnostics do not provide an edge-to-edge ambiguity check. `orthogonal` selects a routing mode; it does not assign an exclusive lane or guarantee distinct paths. Supported ports name a side, not an authored offset or waypoint; use only the [document model](document-model.md#geometry-and-relationships) fields.
- **Still view:** inspect a crop of each busy channel at the target display size. Trace every affected edge independently, including its source, shared segment, exit and arrowhead. Record ambiguous overlaps in review `issues`, even if `validate` reports none. Claims about lane separation or distance must describe the rendered result rather than the planned spacing.

## Borderless headings and supporting text

- **Condition and symptom:** a white node fill is used to make a heading look unboxed, but the theme's border remains visible.
- **Start with:** explicitly set the supported fill, stroke and `strokeWidth: 0` for the intended borderless appearance. Use text color that contrasts with the carrying background. See the [node style contract](document-model.md#geometry-and-relationships).
- **Current checks:** valid style fields can be checked, but the tool cannot infer a borderless design intention from a white fill.
- **Still view:** inspect the heading on the actual background, including transparent exports on their carrying surface. Check separation from surrounding content.

## Narrow cards and text wrapping

- **Condition and symptom:** Long terms, titles or several tags occupy a narrow card in any language. CJK and mixed scripts also vary in glyph width; character counts alone cannot establish fit. Punctuation or a term can become stranded.
- **Start with:** measure the complete content using the final width and actual typography, then allocate height and nearby space. Adjust width or organization before reducing text size. Preserve meaning when changing wording. See [content measurement](static-layout.md#structure-and-layout) and the [long-content card recipe](visual-design.md#repeated-cards-and-longer-content).
- **Current checks:** ordinary labels preserve complete Latin words; an intact word can exceed the estimated width. `measure` gives deterministic content-height and line-count estimates, so a height recommendation alone does not establish horizontal fit. It does not report browser glyph pixels or prove that every possible line break reads well.
- **Still view:** read titles, sentences, list items and tags at the intended display width. Check punctuation, term boundaries and tag emphasis, not only clipping.

## Short labels and optical alignment

- **Condition and symptom:** identical text anchors or padding still appear misaligned across letters, CJK glyphs, digits, punctuation or mixed fonts; a rounded shape's content safe area can add a visible inset.
- **Start with:** establish a shared reading edge and text roles, then inspect actual rendered labels. A separate border group and borderless text rect can decouple decoration from the text inset when needed; keep their local coordinates explicit. See [source mapping and service cards](visual-design.md#source-mapping-and-service-cards).
- **Current checks:** content measurement estimates line count and height. Coordinate equality or a browser bounding box is not a guarantee of optical centering, and a font-ready signal does not prove identical glyphs across hosts.
- **Still view:** compare title starts, number columns, label centers and border gaps at the target size. If browser measurement assists a correction, record the font, coordinate system and measured condition; recheck visually after the change instead of applying a fixed offset to every font.

## Content changes after geometry is arranged

- **Condition and symptom:** content grows, a width changes or measurement increases a node's height, while later rows or the parent group retain old coordinates and dimensions.
- **Start with:** recompute affected rows, heading space, containers and connection channels. Recheck actual port alignment after height changes using [connection design](visual-design.md#connections-and-relationship-labels). Reuse the same [layout plan](static-layout.md#layout-plan-workflow) for repeated geometry; keep intentional exceptions explicit.
- **Current checks:** height application increases node heights only. Layout plans recalculate managed geometry and preserve explicit overrides; finite checks can find some overflow, overlap and clipping. Neither operation proves complete collision avoidance.
- **Still view:** inspect the changed region and affected relationships. Keep intended height differences when content or comparison purpose requires them; there is no global equal-height threshold.

For logs or intermediates that must survive cleanup, decide retention when [creating task files](tool-contract.md#task-workspace), rather than after finalization.


## Preset labels and shape clearance

- **Condition and symptom:** a decision, input/output, report or predefined-process node uses a preset label whose versions may exceed the shape's safe area. Overwide words can split at grapheme boundaries, and the contour can clip text even when the document validates.
- **Start with:** read [preset labels](document-model.md#preset-labels) before setting dimensions. Run `measure` at the intended width and typography, including every label replacement. Resolve width diagnostics before backfill or layout; increasing height alone cannot make a grapheme fit.
- **Current checks:** public geometry diagnostics use visible clipped paint, so a lack of overlap warnings does not establish that all authored text is visible.
- **Still view:** inspect the actual label and contour at the target size after measurement and layout.
