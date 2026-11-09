# Recover an incomplete authoring task

Read stdout JSON or the saved `report.json` first. Use `stage`, diagnostic `code`, `location`, `reason`, `nextStep`, and actual `artifacts` to explain the failure. Keep the draft and successful outputs. Follow [diagnosis and revision decisions](diagnostics-and-revisions.md): apply already authorized mechanical corrections, and ask the user when a correction changes meaning. For an environment failure or unexpected interruption, address the reported cause before retrying within the current authorization. `validate` returns diagnostics without saving a revision; `author` saves a fresh revision. If the same failure recurs without new evidence, stop and report the next recovery action. User cancellation follows the stopping rule below.

## Environment and browser preparation

Run `node <skill-directory>/scripts/flowsvg.mjs doctor` for Node 20+, npm and isolated-cache checks. For dependency preparation, cache recovery and offline requirements, use [the runtime contract](tool-contract.md). A complete cached SDK works offline; an uncached environment needs its locked packages. The tool does not change the user's application dependencies.

For GIF or screenshot startup failures, read [prepared browser selection](visual-checks.md#prepared-browser). Verify that the chosen executable exists, has execution permission and runs on this operating system. Prepare Chrome/Chromium separately when needed.

`GIF_BROWSER_UNAVAILABLE` means browser use was disabled or no prepared browser was selected or detected. `GIF_ENVIRONMENT` means the SDK could not start or run the selected executable. Check the reported path and operating-system dependencies. Successful JSON/HTML/SVG remain available, and the explicitly requested GIF is still unfinished. Supply a usable browser and retry in a new revision.

## Continuing after an SDK upgrade

Historical reports, exports and viewing evidence retain their original SDK version and integrity. When continuing saved JSON under a new baseline, re-export every requested image; old completion and evidence cannot satisfy the new context. Ordinary `review` can still address a verified historical source, but its observations remain bound to that source.

An Agent-composed HTML page with a filled managed region from another SDK fails with `HTML_PAGE_INVALID`, including with `--sync-html`. Preserve the historical page. In a new task page, copy its authorized outer HTML/CSS and leave only the empty `<!-- flowsvg:player:start -->` / `<!-- flowsvg:player:end -->` region. Submit that fresh page through `author --html` with the selected JSON, regenerate the requested outputs and inspect the actual new files. Keep old review records under their original identity.

## GIF settings and export errors

- `GIF_OPTIONS`: inspect the reported field/reason and [supported settings](export.md). Correct malformed JSON, unsupported fields, invalid values or a range outside the compiled timeline.
- `GIF_LIMIT`: reduce the selected duration, sample rate, dimensions or final hold after the user chooses the tradeoff. The report retains the SDK's specific limit reason.
- `GIF_CAPTION_OVERFLOW`: show the reported scene/beat and caption to the user. Candidate changes are a larger caption region, wider output or shorter caption text. Resizing still must satisfy the 1920 px final-long-edge limit. Preserve the original draft until the user decides.
- `GIF_RASTERIZATION` or `GIF_ENCODING`: retain the report, supplied settings and complete files. Check the specific SDK reason and browser environment before another attempt. Do not register partial bytes as a complete GIF.
- A destination/write error: inspect output permission, disk space and existing files. The tool uses exclusive creation for GIF, preserves an existing same-name file, and removes its own incomplete write.

## Cancellation and completion

Ctrl+C and termination signals cancel the current task. Authoring saves a cancellation report when writable; read-only validation returns cancellation on stdout and preserves its input without a saved report. The SDK releases its owned browser resources. Successful earlier files remain listed; an unfinished GIF stays absent from `completion.completed`. A force-killed process cannot write a final report. Preserve that revision as interruption evidence.

When the user asks to stop or cancels the task, stop further commands and retries. Report retained files and unfinished work. Resume only after the user asks; a resumed authoring attempt creates a new revision, while validation remains read-only. For an unexpected interruption, apply the recovery conditions above.

State delivery and quality separately. `completion.delivery: complete` requires every requested export to finish. Layout warnings, unviewed screenshots and skipped visual inspection still need an explicit explanation even when all files exist. Follow the report's actual checks; an HTML file or GIF progress message is not evidence that the full task passed visual review.

For `REVIEW_RECORD_INVALID`, retain the task, review record and prior delivery. Read the named record/source diagnostic and restore or regenerate the affected evidence. Repeating a clean observation does not overwrite a prior issue. Use `review` for existing HTML, preview and formal-image observations; use a new author revision only when the diagram or required production outputs change. See [review input and recovery rules](review-inputs.md).

## Evidence recovery

For `evidence`, keep every requested condition and completed image. A valid request survives missing or invalid explicit browsers, failure or cancellation in an immutable terminal operation record; retry after the cause is addressed to capture only missing conditions. Damaged evidence PNGs remove only affected entry coverage while retaining invalid observations and issues. Valid surfaces and other review kinds in the same combined record continue to count. Use a new capture and actual independent review. Changed source/artifact bytes, metadata or escaped paths block reuse and finalization; preserve the task and restore the verified source rather than relabeling changed files.
