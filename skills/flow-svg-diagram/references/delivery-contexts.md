# Delivery contexts

Before drafting, establish the audience, the message to retain, the intended display width or occupied slide area, and the requested outputs. Select the [semantic pattern](semantic-patterns.md) independently of the destination. A pattern describes meaning; a delivery context describes where that meaning must be readable.

## Static assets for presentations

Use the user's slide ratio and occupied area. A full-slide 16:9 canvas can start at `viewport: {"width": 1280, "height": 720}` when appropriate; local assets use their actual allocated aspect ratio. Neither choice creates PPTX or native PowerPoint shapes.

Keep enough boundary and relationship context for the image to stand alone. Choose an SVG time that explains the intended state; the time-zero overview is an inspection projection, not a guarantee that every object is visible. Use the actual report's compiled timing. For a sequence that cannot be expressed faithfully in one frame, propose several images or an explicitly requested animation. Any aggregation or omission that changes meaning requires the user's decision.

Inspect the exported image at its intended slide size. For full-slide material, 1280 CSS pixels is a useful reference width; a local asset needs its own allocated width. If no local width is supplied, state the assumed width and limit the readability claim to it. SVG import and GIF playback depend on the presentation software.

## Static illustrations in web content

Establish the article column width and what the surrounding prose already explains. Use a self-contained state with readable labels and an explicit direction. A `960 × 600` viewport is one possible authoring canvas, not a requirement. Inspect the image at the actual column width; use 720 CSS pixels as a reference when none is supplied and record that assumption.

A larger file resolution does not make labels larger when the page displays it at the same width. At a narrower target width, propose a simpler presentation or separate images with the user's approval where meaning changes. A paused HTML player and a static article illustration have different acceptance scopes.

## Offline interactive HTML

Default delivery includes one self-contained HTML file, initially paused with controls. Establish an understandable initial state, then use scenes and beats only when order, transfer or change helps explain the material. Give the viewer enough time to read captions and changing content. Check start, relevant transitions and final state; seek backward to verify that the state can be reconstructed.

The file can be opened offline after delivery. Embedding a player into an application is a separate SDK integration task. Animation does not substitute for source evidence or make a poor static state self-explanatory.

## Purpose presets

For a new draft, choose a purpose preset and write its concrete viewport and typography into the document. These are authoring defaults; there is no preset field in the document and no CLI preset flag. Preserve an imported document byte-for-byte unless the user authorizes a revision. Explicit overrides remain the author's choices.

| Purpose | Viewport | `typography` (`nodeLabel` / `edgeLabel` / `flowLabel`) |
| --- | --- | --- |
| Full-slide presentation starting point | 1280 × 720 | 32 / 24 / 20 |
| Web article starting point | 960 × 600 | 20 / 18 / 16 |
| Local asset | Author the allocated dimensions | Choose concrete sizes for the allocated display width |
| Ordinary defaults | Author explicit dimensions | Omitted roles use 16 / 14 / 12 |

For example, a new web draft can include:

```json
{"viewport":{"width":960,"height":600},"typography":{"nodeLabel":20,"edgeLabel":18,"flowLabel":16}}
```

This fragment is not a complete document. Add the required version, nodes, edges and scenes. Structured content's omitted font sizes scale with `nodeLabel`; explicit font sizes remain unchanged. Measure content with the same typography context before choosing node heights. Larger typography does not automatically enlarge nodes or rearrange geometry.

Default outputs remain editable JSON, paused offline HTML and reports. Request SVG, PNG or GIF explicitly using [export options](export.md). Formal SVG/PNG files have independent [target-size artifact evidence](artifact-evidence.md); fixed 1440 × 1000 sampling images do not establish readability at 720px or 1280px.
