# Delivery contexts

Before drafting, establish the audience, the message to retain, the intended display width or occupied slide area, and the requested outputs. Select the [semantic pattern](semantic-patterns.md) independently of the destination. A pattern describes meaning; a delivery context describes where that meaning must be readable.

## Preferences and missing context

For new or revised drafts, resolve appearance through [project preference preflight](preferences.md) before the five authoring steps. Here, establish purpose, display dimensions, carrying background, playback and requested files from the conversation and existing task decisions. A purpose preset supplies starting dimensions and typography for that context.

Collect relevant missing context in one concise question, combined with any preference gaps where practical. Reuse answers already given. Clarify missing facts or relationships that would change meaning before drafting. Ordinary visual adjustments within the agreed scope can proceed without another approval.

When purpose is unknown and the user explicitly chooses “use defaults” or “just make it,” author a static Web explanation with a `960 × 600` canvas, an assumed `720 CSS px` display width and a light background unless an applicable preference overrides the appearance. Choose grouping and layout from the reader's question. An unanswered question is not a choice of defaults. A known PPT purpose keeps its presentation context even when precise placement dimensions are missing.

Record the adopted preferences, display conditions and their sources (request, project convention, user preference or assumption) in the existing task plan and final explanation. Default files remain JSON, paused offline HTML and reports; static composition does not implicitly request SVG or PNG. An unchanged export-only task preserves its input and requested formats.

PPT placement determines layout, while requested file kinds determine exports. If the user needs a slide-import image but has not selected a format, include that choice in the initial context question. If they explicitly choose to proceed with default files, state that the delivery contains HTML/JSON/reports and that no slide-import image was requested; avoid implying it is already an integrated slide asset.

## Content placement

Before choosing diagram geometry, assign the explanation's content to its carrying surface in the existing task plan. Complete this choice when every planned heading and explanation has a location and each requested format retains the context needed for its use.

| Content | Default location |
| --- | --- |
| Overall title, subtitle and reading goal | HTML heading and introduction |
| Background, sources, global assumptions, limits and detailed discussion | Supporting HTML prose |
| Object names, group titles, relationship conditions and essential states | Diagram nodes, groups or nearby labels |
| Explanation that changes with a scene or beat | Existing player captions |
| Legend or annotation | Near the relationship it qualifies; global reading advice may sit in HTML |

Use spatial and temporal meaning to decide placement, rather than the field name or text length. Keep necessary node descriptions in content cards. Moving text must preserve the source meaning; relationships or qualifications that would become ambiguous stay with their objects. Independent SVG/PNG and presentation assets need their own context allocation; page-only prose is not part of an exported image.

For new or revised HTML explanations, author the page HTML/CSS around the player, beginning with [the editable page starter](../examples/html-page.html) when useful. The normal reading order is heading/introduction, player with captions and controls, then supporting prose; adapt it to the content. Page text uses HTML layout and remains readable independently of diagram scaling. Keep the managed playback region intact and follow [editable HTML pages](tool-contract.md#editable-html-pages) to submit the complete page. Inspect the actual page at its intended width, including a narrow width when relevant. An unchanged import, pure export or validation keeps its existing entry point and input design.

## Static assets for presentations

Use the user's slide ratio and occupied area. A full-slide 16:9 canvas can start at `viewport: {"width": 1280, "height": 720}` when appropriate; local assets use their actual allocated aspect ratio. Neither choice creates PPTX or native PowerPoint shapes.

Keep enough boundary and relationship context for the image to stand alone. Choose an SVG time that explains the intended state; the time-zero overview is an inspection projection, not a guarantee that every object is visible. Use the actual report's compiled timing. For a sequence that cannot be expressed faithfully in one frame, propose several images or an explicitly requested animation. Any aggregation or omission that changes meaning requires the user's decision.

Inspect the exported image at its intended slide size. For full-slide material, 1280 CSS pixels is a useful reference width; a local asset needs its own allocated width. If no local width is supplied, state the assumed width and limit the readability claim to it. SVG import and GIF playback depend on the presentation software.

Before choosing geometry, record full-slide versus local placement, available width and height, safe margins, and whether the slide or the asset carries the title, draft marker and footer. Use dimensions from the actual content area when supplied. When placement is unknown, state an authoring assumption and check that condition; verify again after the real placement is known.

Use both dimensions for proportional fit: `s = min(availableWidth / canvasWidth, availableHeight / canvasHeight)`. Express available dimensions in the same reference units; displayed text size is authored size multiplied by `s`. For example, a `1280 × 560` asset in a `1200 × 525` reference area has `s = 0.9375`; 24-unit body text displays at 22.5 reference pixels. This is not a conversion to PowerPoint points. A smaller slide content height can reduce the scale further even when width is unchanged.

Target-size image inspection covers the recorded dimensions and backdrop. Actual PowerPoint/WPS placement and playback are separate checks: record them as unverified until performed. Complete files may be delivered with disclosed inspection gaps; image or HTML checks alone do not establish slide integration.

### Animated presentation material

For “animation for PPT,” establish the playback carrier before choosing animation: offline HTML plays in a browser; SVG/PNG preserve one static frame; GIF requires an explicit request and software-specific playback checks. MP4, PPTX and native PowerPoint animation are outside this skill's export capability. State which carrier was produced and whether the target presentation software was actually tested. See [animation purpose](timeline.md#choose-the-animation-purpose) and [export limits](export.md).

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
