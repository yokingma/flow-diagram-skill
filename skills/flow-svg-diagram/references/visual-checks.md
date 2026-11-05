# Screenshot capture and visual inspection

Before submitting any review, read [the complete field contracts and unviewed template workflow](review-inputs.md). Invalid review input is rejected before version allocation or rendering.
Use `validate` while drafting. When intermediate HTML is needed, use `author --browser none`; capture the needed samples only after the draft is ready. Keep the same temporary `--output <task-workspace>/history` for capture and review, then [finalize](tool-contract.md#finalize-the-task).

`author` attempts previews after default JSON/HTML, optional SVG and any requested GIF attempt. For independent stage failures and cancellation, see [partial delivery](export.md#partial-delivery-and-history). It uses the skill's explicit, locked `playwright-core` dependency inside the isolated runtime. It creates a dedicated browser, context and page; it neither connects to nor closes a browser owned by the host or user. Success, failure and cancellation close the resources the command created.

## Prepared browser

Pass `--browser <executable>` or set `FLOWSVG_BROWSER_PATH` to an installed Chrome/Chromium executable. An explicit path has priority. The tool verifies file readability and execution permission before launch; an unusable path fails visibly without creating a browser profile. Otherwise the tool detects standard macOS/Windows install locations or Linux executable names on `PATH`. `--browser none` disables detection. The tool never downloads a browser. Common executable paths are `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS, `/usr/bin/chromium` on Linux and `C:\Program Files\Google\Chrome\Application\chrome.exe` on Windows; verify the actual path in this environment. Without one, default JSON/HTML and optional SVG still complete; screenshot capture and visual inspection remain unperformed. Install a browser separately when the user wants that check. Recapture HTML or SDK previews through `author` in a new revision; collect missing formal SVG/PNG surfaces with independent [artifact evidence](artifact-evidence.md).

## Reproducible samples

For animated diagrams, the plan uses actual compiled beats. It reserves a full-view overview, timeline start and final frame. The overview is an inspection projection at time zero: focus actions are removed, while all non-camera actions and content remain. The source JSON and timeline samples retain the original focus actions. An export at a chosen time preserves that time’s actual visibility and camera, including focus. For static diagrams (`scenes: []`), the plan contains exactly one full-view frame at time zero; there are no timeline states or transitions to sample. Neither the overview nor an export means “all objects visible.” If the reader needs an all-visible explanation, propose a separate, source-faithful composition and obtain the user’s decision for any changed meaning; do not silently remove hide actions or restore hidden objects.

Additional candidates are content-change beat starts, transition midpoints, flow midpoints and other beat starts. Content changes have priority over midpoints and ordinary starts. For equal priority, earlier times have priority. The default maximum is 12 images, including the overview; `author --samples <count>` selects a different maximum from 2 through 100. `visual.plan.omitted` lists candidates outside this bound. All intervening times remain unsampled; a few images do not establish continuous coverage. The plan is identical for identical input, compiler behavior and sample count.

## Actual offline HTML

For Agent-composed pages, inspect the whole outer page and its declared embedded player. Page headings, prose, spacing and responsive layout are part of HTML viewing; controls and SVG state are checked inside the managed frame. Captures and hashes identify the complete final HTML, not only the iframe content.

When HTML is part of the requested delivery, `author` opens the saved `diagram.html` in an owned offline browser context after writing it. The report records the exact HTML SHA-256, input/SDK/theme context, viewport and background, initial paused state, control values, external requests, playback advancement and screenshots for the same static or compiled timeline points. These facts describe the file and browser behavior; they do not mean a model viewed the screenshots. After viewing the screenshots, submit `review --from <source-revision> --name <same-name> --output <same-root> --html-review <json>`. Each state needs its captured ID and hash, four observations (`readingOrder`, `density`, `occlusion`, `narrative`) and an issues array. A changed HTML file or context rejects the review. A missing browser leaves `checks.html: not-run` with an explicit reason.

Each captured point renders the public SDK SVG state at exact milliseconds, explicit theme and full motion. Playwright uses a 1440 × 1000 viewport, device scale factor 1, offline context and a dedicated static document. Capture waits for `document.fonts.ready`. Images use system fonts; the report records observed font readiness, font family and font-face errors. A ready font set does not prove every Chinese glyph exists. Missing glyphs, reading difficulty and platform differences require actual image inspection. Cross-system pixel equality is not promised.

## Actual model inspection

Capture success sets `visual.status: awaiting-review`. `checks.visual` stays `not-run` and `viewedFrames` stays empty until a later review. View the actual PNGs through the host's image viewer or image attachments. If neither capability is available, leave visual inspection unperformed and explain the limitation. Start with the overview, then inspect the saved timeline samples. For each viewed image, assess reading order, density, occlusion and narrative continuity. Record which images were actually viewed; describe unreadable glyphs or missing content explicitly.

Reviewing every captured frame completes the preview review scope only. Report partial viewing and observed issues explicitly. Use the returned `qualityCoverage` and [overall quality contract](tool-contract.md#revisions-and-reports) to interpret `completion.quality`; preview review cannot replace required HTML or formal SVG/PNG checks. A screenshot filename, successful export or nonempty PNG does not establish visual approval.

For each observed issue, follow [diagnosis and revision decisions](diagnostics-and-revisions.md): explain the issue and candidate corrections; ask when the choice changes meaning and apply already authorized mechanical corrections. Preserve failed capture evidence and partial screenshots. Submit observations of existing images through independent `review`; changed observations append a record and identical submissions reuse the verified record. A retry that regenerates HTML or SDK previews uses `author` and creates a new revision. Use independent `evidence` for formal-image capture recovery. Saved reports remain unchanged during the task. Successful finalization retains review facts and removes temporary screenshots and revisions unless history was requested.

## Questions for the four observations

Keep the existing four observation fields. Answer the questions that apply to each actually viewed image; put discovered problems in `issues` with candidate treatments for the user's choice.

| Field | Inspection questions |
| --- | --- |
| `readingOrder` | Can the reader identify the entry point, then trace each relevant arrow from its source through bends or shared segments to its arrowhead? Are request and return directions distinct? Do boundary headings explain membership? Can the reader recover the direction after a crossing? |
| `density` | At the intended display width, can the reader distinguish labels, conditions and units? Does the slide's occupied area or article column leave enough space? Record actual or assumed dimensions. A higher-resolution file does not enlarge text displayed at the same width. Node count is a prompt to assess readability, never permission to delete information. |
| `occlusion` | Does a connection cross an unrelated node in a way that suggests a false relationship? Does an edge label cover an unrelated node, another label or a needed arrowhead? Are text, group titles and ports clipped or covered? Distinguish intended containment and endpoint contact from obscured meaning. A crossing alone need not be an error. |
| `narrative` | Does the shown state match the selected time, caption and explanation? Across the viewed start, transition and end states, do changing labels, visibility, focus and markers preserve identity and causality? Are success, retry and exit conditions still understandable while paused? State which intervening times were not viewed. |

For **PPT assets**, open the requested SVG at its allocated slide size and inspect the directions and context needed for that single state. A 1280px full-slide reference does not cover a smaller local asset. For **web illustrations**, inspect at the column width (720px if explicitly recorded as the assumption), with the surrounding prose's scope in mind. For **animation**, inspect the initial state, actual compiled beat boundaries, relevant transition midpoints and final state. For **paused interactive HTML**, inspect those states while paused. Seek backward to check content and camera reconstruction when the user requests interactive animation or the source includes state reset. Inspect the HTML controls separately from the diagram-only SVG.

Current sampling screenshots use a fixed inspection viewport. For actual SVG/PNG delivery, use [target-size artifact evidence](artifact-evidence.md). That workflow reads the exported file, records its target display surface and stores later actual-viewing attestations in `visual.artifactReviews`. Sampling `viewedFrames` covers only sampled images. Inspect paused HTML separately, and preserve the [source and information choices](source-fidelity.md) when proposing a readability correction.

## Save the later judgment

After actually opening the source images, save a review JSON. The tool accepts the model's explicit attestation; it cannot independently prove that the model used an image viewer. Every listed frame needs observations in all four areas and an explicit issues array:

```json
{
  "reviewer": "the model/host that actually viewed these images",
  "viewed": true,
  "frames": [{
    "id": "frame-01",
    "sha256": "copy the exact 64-character hash from the source report",
    "observations": {
      "readingOrder": "Describe the observed order.",
      "density": "Describe readable and crowded areas.",
      "occlusion": "Describe visible clipping or overlap, or the scope with none observed.",
      "narrative": "Describe the state shown and its relationship to other viewed frames."
    },
    "issues": [{"reason": "Describe an actual observed issue.", "nextStep": "Offer a candidate correction for the user's decision."}]
  }]
}
```

Use `issues: []` only when that viewed frame has no observed issue. Use source frame IDs and hashes, not the explanatory placeholder above. Run `review --from v001 --name <same-name> --output <same-output-root> --visual-review <review.json>` to append observations without regenerating files or images. The explicit source stays inside this diagram series. The command creates an independent record, leaves `v001` unchanged and reuses identical submissions. For combined HTML/preview input and aggregation rules, read [review input contracts](review-inputs.md). A changed diagram requires a separate authoring revision and new inspection of affected outputs.

`visual.viewedFrames` identifies original source images, times, paths, hashes and observations. `visual.review` identifies the submitting reviewer and source report. `checks.visual: reviewed` means only those source images were actually reported as viewed. It is not a blanket pass; issues become warnings awaiting the user's decision. Newly captured images remain unviewed. Changed source-image bytes, duplicate frame IDs, absent observations or an implicit parent are rejected.
