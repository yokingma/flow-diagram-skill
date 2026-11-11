# Delivery contexts

Before drafting, establish the audience, the message to retain, the intended display width or occupied slide area, and the requested outputs. Select the [semantic pattern](semantic-patterns.md) independently of the destination. A pattern describes meaning; a delivery context describes where that meaning must be readable.

## Preferences and missing context

For new or revised drafts, read [project preferences](preferences.md) before the five authoring steps. Here, establish purpose, display dimensions, carrying background, playback and files from the conversation and existing task decisions. Apply relevant saved defaults to open choices. A purpose preset supplies starting dimensions and typography for the actual context.

Collect relevant missing context in one concise question, combined with any preference gaps where practical. Reuse answers already given. Clarify missing facts or relationships that would change meaning before drafting. Ordinary visual adjustments within the agreed scope can proceed without another approval.

When purpose is unknown and the user explicitly chooses “use defaults” or “just make it,” author a static Web explanation with a `960 × 600` canvas, an assumed `720 CSS px` display width and a light background unless an applicable preference overrides the appearance. Choose grouping and layout from the reader's question. An unanswered question is not a choice of defaults. A known PPT purpose keeps its presentation context even when precise placement dimensions are missing.

Record the adopted preferences, display conditions and their sources (request, project convention, user preference or assumption) in the existing task plan and final explanation. In the absence of a request or applicable preference for other files, deliver JSON, paused offline HTML and reports. Static composition alone does not call for SVG or PNG. An export-only task preserves its input and uses preferences only for relevant open choices.

PPT placement determines layout, while the resolved file kinds determine exports. If the user needs a slide-import image and the format remains unresolved, include that choice in the initial context question. If they explicitly choose to proceed with default files, state that the delivery contains HTML/JSON/reports and that no slide-import image was requested; avoid implying it is already an integrated slide asset.

## Content placement

Before choosing diagram geometry, assign the explanation's content to its carrying surface in the existing task plan. Complete this choice when every planned heading and explanation has a location and each requested format retains the context needed for its use.

| Content | Default location |
| --- | --- |
| Overall title and one-sentence reading goal | HTML heading and introduction |
| Background, sources, global assumptions, limits and detailed discussion | Outside the page: delivery explanation, `report.json` / `report.md`, `sources[].description` or a separate file |
| Object names, group titles, relationship conditions and essential states | Diagram nodes, groups or nearby labels |
| Explanation that changes with a scene or beat | Existing player captions |
| Legend or annotation | Near the relationship it qualifies; only a functional reading hint may sit in HTML |

Use spatial and temporal meaning to decide placement, rather than the field name or text length. Keep necessary node descriptions in content cards. Moving text must preserve the source meaning; relationships or qualifications that would become ambiguous stay with their objects. Independent SVG/PNG and presentation assets need their own context allocation; page text is not part of an exported image. All placement stays within the [page content contract](#keep-the-html-page-minimal); a content type has no page destination unless that contract allows it.

For new or revised HTML explanations, author the page HTML/CSS around the player, beginning with [the editable page starter](../examples/html-page.html) when useful. The reading order is the blocks allowed by [keep the HTML page minimal](#keep-the-html-page-minimal): heading, one-sentence introduction, functional reading hints, then the player with its captions and controls. There is no supporting-prose section. Page text uses HTML layout and remains readable independently of diagram scaling. Keep the managed playback region intact and follow [editable HTML pages](tool-contract.md#editable-html-pages) to submit the complete page. Inspect the actual page at its intended width, including a narrow width when relevant. An unchanged import, pure export or validation keeps its existing entry point and input design.

### Keep the HTML page minimal

**Use this section as the single source of truth for Agent-authored page content.** The starter, installed references and bilingual guides point here; they do not add blocks or create exceptions. Let diagram nodes, relationships and player captions carry the explanation; the page is a viewing shell for orientation and operation, not a report. Treat user material as source evidence for the diagram. Do not turn the source outline, task plan or delivery report into an HTML outline.

**Before writing page HTML, allocate content in this order:**

1. Write one `h1` that names the explanation.
2. Write one introduction sentence that states the reader's question or the answer the diagram provides.
3. Add a functional reading hint only when the reader needs an operation instruction, such as horizontal scrolling, display width or player controls.
4. Put the managed player region after those blocks. Its captions and controls carry scene-specific explanation.

**The page whitelist is closed:** one `h1`, one introductory sentence, optional functional reading hints and the managed player region. Do not add a second-level heading, supporting-prose section, source list, data table, appendix, decision log, inspection record or production footer.

The whitelist governs visible content blocks, not the HTML implementation structure. Semantic wrappers such as `main`, `header` and `section`, ARIA attributes, keyboard focus handling and CSS are allowed when they support the listed blocks. Keep CSS, scripts, fonts and images inline or in data URLs so the delivered file remains self-contained; do not add CDN or other external resources.

**Keep these materials outside the page:** source transcriptions and paraphrases; complete relationship or object inventories; `retained` / `merged` / `omitted` / `unknown` accounts; assumptions, limits, QA scope and production notes; repeated node text; and any second explanation of the diagram. Put object detail in nodes, groups and nearby labels; put source facts and decisions in `sources[].description`, `report.json`, `report.md` or the delivery explanation; put changing explanation in existing player captions. [Source fidelity](source-fidelity.md#before-and-after-a-meaning-change) step 5 is a delivery requirement, not permission to add a page chapter. If a full inventory is needed for reference, create a separate file outside the page and mention it in the delivery explanation.

**Apply this deletion test before authoring:** remove any block that repeats visible diagram content, describes how the diagram was made, or can disappear without reducing the reader's ability to use the page. Delete the starter's explanatory comment instead of filling it. If the page needs section headings, a table of contents or scrolling prose, stop and move that material to the delivery explanation or a separate file.

### Page completion checklist

Before delivery, the Agent checks the authored page and available browser and image evidence against all of the following:

- exactly one `h1` names the explanation;
- exactly one introductory sentence states the reader's question or the answer the diagram provides;
- a functional reading hint appears only when the reader needs an operation instruction and contains only that instruction;
- the managed player region appears exactly once, after the outer text, with its captions and controls intact;
- no visible source, decision, inspection, production or duplicate diagram-content block remains outside the whitelist;
- the page has no external resource request and remains usable at the intended width, including the narrow condition when relevant.

The Agent corrects observed violations before delivery. When browser or image viewing is unavailable, record the unperformed checks and their impact explicitly. The user's final design judgment is separate from this self-check.

This is an Agent authoring contract. Do not implement it as page-text length, heading-count or section-count validation in `html-page.mjs`, `validate`, inspection or reports.

## HTML with standalone images

When HTML and SVG/PNG are requested together, record whether each image will be read on its own or inside a known article or slide. Before authoring, assign its necessary title, legend and qualifications to either the image or the named host. Keep object identities, relationship directions and essential conditions understandable in that recorded use. An HTML introduction covers only the page.

Use the same diagram when its content serves both destinations. If an image needs additional context, explicitly author it in the diagram or confirm the target host supplies it. If the destinations need different diagrams, save separate, clearly named drafts and sources; an export time or camera selection changes the selected view, not its underlying explanation. Follow the existing source-fidelity decision process before omissions, aggregation or scope changes.

Mark mixed file delivery complete only when every requested format exists; report quality separately from the applicable checks and actual viewing of each HTML/image. Follow [image export](export.md#requested-svg-and-png) for planned images and [artifact evidence](artifact-evidence.md) for the real SVG/PNG at its recorded width and backdrop. Pure export preserves the selected JSON bytes and page design; page text edits alone do not request images.

## Static assets for presentations

Use the user's slide ratio and occupied area. A full-slide 16:9 canvas can start at `viewport: {"width": 1280, "height": 720}` when appropriate; local assets use their actual allocated aspect ratio. Neither choice creates PPTX or native PowerPoint shapes.

Keep enough boundary and relationship context for the image to stand alone. Choose an SVG time that explains the intended state; the time-zero overview is an inspection projection, not a guarantee that every object is visible. Use the actual report's compiled timing. For a sequence that cannot be expressed faithfully in one frame, propose several images or an explicitly requested animation. Any aggregation or omission that changes meaning requires the user's decision.

Inspect the exported image at its intended slide size. For full-slide material, 1280 CSS pixels is a useful reference width; a local asset needs its own allocated width. If no local width is supplied, state the assumed width and limit the readability claim to it. SVG import and GIF playback depend on the presentation software.

Before choosing geometry, record full-slide versus local placement, available width and height, safe margins, and whether the slide or the asset carries the title, draft marker and footer. Use dimensions from the actual content area when supplied. When placement is unknown, state an authoring assumption and check that condition; verify again after the real placement is known.

Use both dimensions for proportional fit: `s = min(availableWidth / canvasWidth, availableHeight / canvasHeight)`. Express available dimensions in the same reference units; displayed text size is authored size multiplied by `s`. For example, a `1280 × 560` asset in a `1200 × 525` reference area has `s = 0.9375`; 24-unit body text displays at 22.5 reference pixels. This is not a conversion to PowerPoint points. A smaller slide content height can reduce the scale further even when width is unchanged.

Target-size image inspection covers the recorded dimensions and backdrop. Actual PowerPoint/WPS placement and playback are separate checks: record them as unverified until performed. Complete files may be delivered with disclosed inspection gaps; image or HTML checks alone do not establish slide integration.

### Animated presentation material

For “animation for PPT,” establish the playback carrier before choosing animation: offline HTML plays in a browser; SVG/PNG preserve one static frame. Include GIF when the resolved delivery plan calls for it under [GIF export rules](export.md#gif-exports), and check playback in the target presentation software. MP4, PPTX and native PowerPoint animation are outside this skill's export capability. State which carrier was produced and whether the target presentation software was actually tested. See [animation purpose](timeline.md#choose-the-animation-purpose) and [export limits](export.md).

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

Default outputs remain editable JSON, paused offline HTML and reports. Use [export options](export.md) for any additional formats in the delivery plan. Formal SVG/PNG files have independent [target-size artifact evidence](artifact-evidence.md); fixed 1440 × 1000 sampling images do not establish readability at 720px or 1280px.
