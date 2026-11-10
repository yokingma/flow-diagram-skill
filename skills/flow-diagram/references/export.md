# Export files

For ordinary skill tasks, first create a canonical [task workspace](tool-contract.md#task-workspace), then pass `--output <task-workspace>/history --name <diagram-name>` to every export, evidence and review invocation. Replace the workspace placeholder in the examples with that path. [Finalize](tool-contract.md#finalize-the-task) only when all requested files are ready; successful finalization keeps those files and removes temporary revisions and inspection images.

This reference carries the SDK export rules needed by the installed skill, plus CLI, report, revision, manifest and partial-delivery rules. Keep these rules aligned with the pinned SDK baseline in `runtime/manifest.json`; the installed skill must remain usable without this repository.

Use `author` to save editable JSON and paused offline HTML with controls. These default files require no browser. `--svg --time <ms>` adds SVG at a finite time within the actual compiled duration; the default time is zero. Static diagrams accept only zero. Each invocation reserves a new diagram revision and uses its saved JSON snapshot for every export. Delivery completion and visual approval are separate report fields.

## Requested SVG and PNG

Add `--svg`, `--png`, or both. `--time <ms>` applies to the selected static formats; omit it for zero. Times must be finite and inside the actual compiled timeline. `--background theme|transparent` affects only requested SVG/PNG files and defaults to `theme`. It does not change JSON, HTML, GIF or sampled previews. An orphan `--time`, `--background` or `--png-width` is rejected.

PNG calls the installed public `flowsvg/node.exportPng` API and requires a prepared browser. Select it as described below. `--png-width <pixels>` requires a requested PNG; it is positive and finite, rounded to an integer. Default width is the document viewport width. Height preserves the selected camera ratio, including focus and fitHeight. Each side is at most 8192 pixels and the image is at most 32,000,000 pixels. Both formats contain the diagram alone, without player controls or captions; no automatic crop or geometry change occurs.

```text
node <skill-directory>/scripts/flowsvg.mjs author --input "draft.json" --name "article" --svg --png --time 0 --png-width 1440 --background transparent --browser "/path/to/chromium" --output "<task-workspace>/history"
```

Single files are `diagram.svg` and `diagram.png`. Their report records include artifact ID, actual byte hash, original revision, source hash, SDK version/integrity, selected time/theme/background/camera and intrinsic dimensions. `exports` records each requested format's success or failure. Missing browsers and PNG errors preserve successful JSON/HTML/SVG; PNG remains incomplete. Generated files remain visually unreviewed until [actual artifact evidence](artifact-evidence.md) is viewed and recorded.

### Include an Agent-authored page

For a combined page and image request, pass the complete page with the normal explicit image flags:

```text
node <skill-directory>/scripts/flowsvg.mjs author --input "draft.json" --html "page.html" --name "article" --svg --png --time 0 --png-width 1440 --browser "/path/to/chromium" --output "<task-workspace>/history"
```

The page supplies only the allowed heading, one-sentence introduction, functional reading hints and managed player region, plus their outer HTML/CSS; static exports use the saved diagram JSON. Follow the [page content contract](delivery-contexts.md#keep-the-html-page-minimal) and allocate standalone-image context using [delivery contexts](delivery-contexts.md#html-with-standalone-images) before running this command. Inspect the actual HTML and each requested image separately. A successful HTML and SVG remain available if PNG fails; the combined request remains incomplete.

For an unchanged finalized page, import its exact `diagram.json` and select its `diagram.html` with `--html` in the fresh workspace. This preserves the selected page design while adding only requested formats. Keep its managed region intact and matching the original source bytes, theme and SDK. Default `author --html` without image flags still delivers only JSON, HTML and reports.

## Named batch exports

Use `--export-manifest <json>` instead of single-frame `--svg`, `--png` or `--time`. First run `validate` or `author` on the exact source bytes. Read `input.sha256`, `sdk.version`, `sdk.integrity`, `compilation.totalDurationMs` and `compilation.beats` from that report, then confirm the selected times with the user. Build this independent manifest with those actual values:

```json
{
  "schemaVersion": 1,
  "sourceSha256": "<input.sha256 from the report>",
  "sdk": { "version": "<sdk.version>", "integrity": "<sdk.integrity>" },
  "frames": [
    { "name": "overview", "timeMs": 0, "formats": ["svg", "png"] }
  ]
}
```

```text
node <skill-directory>/scripts/flowsvg.mjs author --input "draft.json" --name "article" --export-manifest "exports.json" --theme light --background transparent --png-width 1440 --browser "/path/to/chromium" --output "<task-workspace>/history"
```

The source hash covers exact bytes, including whitespace. Both SDK fields must match the actual isolated installation, including same-version integrity changes. Missing or stale binding fields fail; the tool never rebinds a manifest. After a change, read the new compiled beats and identity, confirm the selected frames, and create a new manifest. Preserve that confirmation with `--sources`; use an explicit parent to retain the old manifest source/hash/settings in `provenance.exportManifests`.

Every frame requires a nonempty unique portable name, finite numeric time within the compiled duration, and unique nonempty `svg`/`png` formats. Separators, reserved filenames, trailing dots/spaces, case collisions and Unicode normalization collisions are rejected. Different names may select the same time. Extra schema fields are rejected. The tool constructs `exports/<name>.svg` and `exports/<name>.png`; manifests cannot supply output paths.

The task shares `--theme`, `--background` and `--png-width` across frames. PNG width requires at least one PNG item. All binding, frame and shared-size checks finish before any batch image is written. Invalid manifests preserve default JSON/HTML and original manifest bytes. The report records the original manifest SHA-256, parsed fields and shared settings.

Frames and their formats run in manifest order. Each `exports` item records time, theme, background, intended path, dimensions and `succeeded`, `failed`, `not-run` or `cancelled`, with an error reason when relevant. Runtime failure continues other items; missing PNG browsers still permit SVG. Cancellation stops remaining items. Only complete exclusive writes register artifacts. A format enters `completion.completed` only when all its items succeed. Retry in a fresh revision; prior bytes are preserved. Report-write failure remains a failure even after all images were saved.

Select batch artifact IDs through the same [actual-file evidence workflow](artifact-evidence.md). One viewed format, time or display width does not cover the other items or sizes.

## Explicit GIF requests

Generate GIF only when the user explicitly requests GIF. Add `--gif` to the normal `author` command. Use a prepared Chrome/Chromium executable; read [browser selection](visual-checks.md#prepared-browser) for `--browser`, environment settings and local detection. For example:

```text
node <skill-directory>/scripts/flowsvg.mjs author --input "animated draft.json" --name "request-flow" --gif --browser "/path/to/chromium" --gif-options "gif settings.json" --output "<task-workspace>/history"
```

The input can be an existing FlowSVG animation JSON. The tool calls only the public `flowsvg/node.exportGif` entry and passes the executable path explicitly. The SDK runs its browser exporter in an isolated offline page and releases its own browser, contexts and temporary files on success, failure or cancellation. The tool does not connect to or close a caller's browser. GIF is encoded from evaluated diagram frames, rather than screen recording.

`--gif-options` reads a JSON object once. Omit it to use SDK defaults. Select the task theme with `--theme light|dark`; the same resolved theme applies to HTML, SVG and GIF. Browser, theme, signal and progress callbacks are task settings and cannot be supplied inside the GIF settings file. All supported file fields are listed below.

| Field | Contract and default |
| --- | --- |
| `startMs` | Inclusive source start in milliseconds; default `0`. Full earlier scene state is retained. |
| `endMs` | Exclusive source end in milliseconds; default actual compiled duration. Animated ranges require `0 <= startMs < endMs <= duration`; static diagrams require both values `0`. A segment ends on the end-left picture; the global end includes completed state. |
| `speed` | Positive finite source-time multiplier; default `1`. Output duration is source range divided by speed. |
| `width` | Positive finite diagram width in pixels, rounded to an integer. Default is `min(viewport.width, 1280)`. Height preserves the authored viewport ratio; `viewport.fitHeight` is ignored to keep dimensions stable. |
| `fps` | Integer samples per second from `1` to `30`; default `15`. GIF delays use cumulative 10 ms rounding. |
| `includeCaptions` | Boolean; default `true`. `false` removes the caption region. |
| `captionHeight` | Finite nonnegative pixel height, rounded to an integer; default `80`. Captions use 16 px system text, 22 px line height, 16 px horizontal and 12 px vertical padding. Every effective caption is measured; overflow fails with its scene/beat rather than clipping or shrinking text. |
| `loopCount` | Integer from `0` to `65536`; default `0` means infinite looping, `1` means one total play. |
| `finalHoldMs` | Finite nonnegative final-picture delay; default `1000` ms. Long holds split into bounded GIF frames. Static diagrams have at least a 10 ms delay even when set to zero. Global completed state is preserved even with zero additional hold. |
| `reducedMotion` | Boolean; default `false`. `true` completes transitions and hides flow markers without changing duration. |

The SDK limits effective animation duration to 120 seconds, sampling to 1800 frames, encoded output to 1801 frames including final-hold splits, and the final long edge to 1920 pixels including captions. Limit and option errors retain the SDK's reason in the authoring report. Change a range, speed, frame rate, size or caption only after the user decides how to handle a discovered problem.

Example settings:

```json
{
  "startMs": 0,
  "endMs": 1000,
  "width": 640,
  "fps": 10,
  "includeCaptions": true,
  "captionHeight": 80,
  "finalHoldMs": 500,
  "loopCount": 1
}
```

Choose `endMs` from the input's actual compiled timeline; the example is valid only when the compiled duration is at least 1000 ms. The report records the supplied settings and task theme. Omitted settings follow the locked SDK defaults above.

## Partial delivery and history

stdout remains one JSON result; GIF phase/count progress goes to stderr. A GIF artifact is registered only after the SDK returns the complete byte sequence and the tool saves the entire file. A failed or cancelled file write removes only the file created by that task. Existing destination files are preserved and produce an error.

A missing browser, caption overflow, invalid range, encoding failure or cancellation leaves successful JSON/HTML/SVG files available. The report lists `gif` in `completion.requested`, omits it from `completion.completed`, and sets `completion.delivery` to `incomplete`. Explain that the GIF request is unfinished and link the successful files. HTML or SVG does not satisfy the GIF request. A generated GIF does not establish visual approval. After a noncancelled GIF failure, the tool still attempts independent previews and records both results. A preview failure does not erase completed exports. Cancellation stops subsequent stages.

To export a previously finalized diagram, import its final `diagram.json` into a fresh workspace. For an unfinished task or explicitly retained historical result, use the explicit parent revision workflow in [the tool contract](tool-contract.md#revisions-and-reports). Adding GIF creates a fresh revision; keep the earlier revision and input bytes. Retry failures in a new revision as well. Read [troubleshooting](troubleshooting.md) for browser preparation, cancellation and failure recovery.
