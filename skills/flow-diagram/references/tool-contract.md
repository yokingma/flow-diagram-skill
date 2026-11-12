# Runtime and result contracts

Install the entire `skills/flow-diagram/` directory as `flow-diagram/` using the host's existing skill installation mechanism. Preserve its contents and relative paths. The installed tool uses Node directly; Bash, pnpm, a TypeScript compiler, and the source repository are not runtime requirements.

For Skill tasks, use the explicit task workspace in saved commands below; CLI `--help` lists all low-level options.

```text
node <skill-directory>/scripts/flowsvg.mjs doctor
node <skill-directory>/scripts/flowsvg.mjs prepare
node <skill-directory>/scripts/flowsvg.mjs validate --input <json> [--theme light|dark]
node <skill-directory>/scripts/flowsvg.mjs validate --from <revision> --name <diagram-name> [--output <history-root>] [--theme light|dark]
node <skill-directory>/scripts/flowsvg.mjs author --input <json> --name <diagram-name> [--html <page.html>] [--sync-html] [--sources <metadata.json>] [--theme light|dark] [--svg] [--png --png-width <pixels>] [--time <ms>] [--background theme|transparent] [--samples <count>] [--preview] [--geometry] [--checkpoint | --formal-review] [--artifact-preview-settings <json>] [--artifact-review <json>] [--gif --gif-options <json>] [--browser <executable|none>] [--visual-review <json>] [--html-review <json>] --output <task-workspace>/history [--parent <revision>]
node <skill-directory>/scripts/flowsvg.mjs author --from <revision> --name <diagram-name> --output <task-workspace>/history
node <skill-directory>/scripts/flowsvg.mjs evidence --from <revision> --name <name> --output <history-root> [--artifact-preview-settings <json>] [--browser <executable|none>]
node <skill-directory>/scripts/flowsvg.mjs review --from <subject-revision> --name <name> [--output <history-root>] [--html-review <json>] [--visual-review <json>] [--artifact-review <json> --evidence-from <evidence-source>]
node <skill-directory>/scripts/flowsvg.mjs review-template --from <subject-revision> --name <name> --output <history-root> --kind <visual|html|artifact> --template <new-task-file> [--evidence-from <evidence-source>]
node <skill-directory>/scripts/flowsvg.mjs measure --input <measurement.json> [--in-place | --output <new-draft.json>]
node <skill-directory>/scripts/flowsvg.mjs layout --input <draft.json> --plan <layout-plan.json> (--in-place | --output <new-draft.json>)
node <skill-directory>/scripts/flowsvg.mjs finalize --workspace <task-workspace> --name <diagram-name> [--from current|<checkpoint>] [--notes <markdown>] [--keep-work]
```

`doctor` checks Node 20+, npm, cache write access and the expected cached SDK state. It does not install dependencies or claim network access was tested. `prepare`, `validate`, `author`, `measure` and `layout` automatically run `npm ci` against the exact runtime manifest and lockfile when no verified cache exists. Package lifecycle scripts are disabled. The SDK is resolved through its public ESM exports inside that environment. The tool never falls back to the current project, global SDK, or registry latest.

The default cache follows the platform's cache convention: macOS `~/Library/Caches/flowsvg-authoring`, Windows `%LOCALAPPDATA%/flowsvg-authoring/Cache`, Linux `$XDG_CACHE_HOME/flowsvg-authoring` or `~/.cache/flowsvg-authoring`. `FLOWSVG_CACHE_DIR` selects another cache root. Cache identities include tool scripts, the dependency manifest and lockfile, the SDK baseline, platform and architecture. A complete cache verifies every installed regular file before reuse. Modified, wrong-version or incomplete environments are rebuilt. Preparation uses an installation lock and a temporary environment; cancelled or failed preparation removes its own temporary files and lock. A later run removes temporary environments whose owning process has exited.

A complete cache is usable offline. npm must still be available. A first uncached run needs access to the lockfile's packages; network, permissions or integrity failures preserve the original input and any authoring snapshot, mark SDK checks `not-run`, and return a nonzero exit status. Configure npm's normal proxy or certificate settings when the environment requires them. An active installation lock is bounded by a two-minute wait and reports a recovery action if the owner does not release it.

## Command results

Saved authoring returns a concise JSON result with status, input and SDK identity, current artifact paths, actionable diagnostics, check summaries and a readable `detailsPath`. Read that registered report when you need HTML state signatures, sampling plans, detailed rendering results or provenance. stdout is not a copy of the report. Working drafts identify their current location; immutable revision IDs appear only for explicitly saved checkpoints or formal sources.

Read-only validation, measurement and other operations without a matching saved report return their necessary data inline. Preserve height suggestions and layout changes needed for the next operation. Evidence, review and template results identify their saved record or template; derived operation facts remain inline. Readable detail pointers are returned only for files that exist. Failures before report creation include their own location and recovery diagnostics. Reading details performs no rendering, history allocation or report write.

## Task workspace

The [project preference record](preferences.md) sits outside individual task workspaces. The following rules govern production drafts, helpers and evidence.

Resolve the chosen working directory to its canonical real path before the first saved command, and derive workspace paths from that directory. Use that same real directory for later commands. Path aliases such as macOS `/tmp` versus `/private/tmp` can produce source paths that review-template or finalization rejects, even when both names reach the same files. Preserve an affected task; start a fresh canonical workspace rather than editing saved source reports.

Before writing task files, create `.diagrams/.work/<diagram-name>/<task-id>/` under the user's chosen working directory. Choose a fresh task ID, such as a timestamp with a unique suffix, to keep concurrent tasks separate. Pass `--output <task-workspace>/history` to saved authoring, export, evidence and review calls. Read-only `validate --input` needs no history path; `validate --from` uses this history root to locate its explicit source. Keep commands running from the chosen working directory so relative CLI output paths stay correct. The finalization command accepts only real task directories under `.diagrams/.work/<name>/`; symlinked and broader directories are rejected.

Keep Agent-created source drafts, helper scripts, measurement inputs, source metadata, export manifests, issues and any explicitly requested review/settings files inside this workspace. Before creating files, identify material that must survive finalization: copy it to an explicitly chosen retention directory outside this task workspace, or use `finalize --keep-work`. Successful default finalization removes the task workspace, including logs and intermediate files. Write JSON directly and use the bundled CLI before adding scripts. If a helper script is needed, give it explicit paths inside the workspace for its intermediate output; send final export work through the CLI. User-provided sources stay at their existing paths, and the tool manages its own cache, revision files and final delivery directories.

Treat the installed skill as read-only. Task helpers belong in the workspace rather than the installed skill, project root, application `scripts/`, unrelated `.scratch/` folders or system temporary directories. The Agent creates this workspace; the CLI does not automatically relocate arbitrary helper files.

Continue editing one working draft. Saved authoring replaces `<task-workspace>/history/<name>/current/`, including its current JSON, HTML and report pair; retries do not allocate versions. Use browser-free validation and reuse one batch measurement input generated from the draft content and typography. Capture only after layout and content are ready. Keep drafts, helpers and inspection files in the workspace until finalization succeeds; failed or cancelled tasks remain available for recovery. Existing source files, other tasks and historical directories are outside cleanup scope.

The Agent keeps one `issues.md` in the workspace for material semantic questions, machine errors, viewing findings and execution failures. Update the same problem with its location, status and handling result; omit normal-step logs and full stdout. The CLI does not parse issue entries or require the record before authoring. Before publication, reduce unresolved issues and their impact to an Agent-authored summary; pass that Markdown to `finalize --notes <markdown>` when needed. The tool copies those notes as opaque text into the final report, separately from machine facts. Failed or cancelled work retains the draft, notes and available outputs. One `.recovery` directory retains the last complete current result when a newer run fails; its source identity is named in the current report. Dead operation owners can be reclaimed on retry, and interrupted staging is preserved until a successful replacement.

## Editable HTML pages

For new or revised HTML explanations, copy [the page starter](../examples/html-page.html) into the task workspace, then author only the heading, one-sentence introduction, functional reading hints and CSS allowed by the [page content contract](delivery-contexts.md#keep-the-html-page-minimal). Move source facts, decision records, inspection scope and process notes to the delivery explanation or reports. Supply that complete page to `author --input <diagram.json> --html <page.html> --name <name> --output <history-root>`, with the usual browser and export options. The resulting `diagram.html` is both the editable page and the single-file offline delivery; no separate page source is published. Without an explicit page or a selected parent with an Agent page, low-level `author` retains SDK-only HTML output.

A page contains exactly one ordered `<!-- flowsvg:player:start -->` / `<!-- flowsvg:player:end -->` region. An empty region is filled from the checked diagram. An existing filled region must match the exact diagram JSON bytes, theme, SDK identity and generated playback output. The region contains Skill-owned versioned data, `flowsvg-page-data`, the iframe `flowsvg-page-player`, and sizing code; preserve it when editing outer markup/CSS. These two IDs are reserved to that region. Malformed, duplicate, unsupported or mismatched regions fail explicitly rather than silently changing the diagram. The tool consumes the complete public SDK `renderHtml` result as opaque iframe content, without reading private assets or modifying SDK scripts.

The input page is read once before reserving the authoring operation. `htmlPage` records portable source SHA-256/byte count, diagram SHA-256, SDK version/integrity, theme, playback HTML hash and final HTML hash. Finalization retains this provenance. Page composition finishes before final HTML identity and browser evidence are recorded. To edit a saved result, work on a copy and submit it as a new authoring input; direct edits to registered historical files invalidate their checks. By default, an existing playback region requires matching diagram bytes; use the explicit synchronization workflow below for intentional changes.

### Continue an existing page

The same task automatically preserves its registered current Agent page when no new `--html` is supplied. When `--from current`, `--from <checkpoint>` or `--input <changed.json> --parent <checkpoint>` selects a saved source, authoring inherits that parent's Agent page unless `--html` explicitly selects another page. Inheritance verifies the registered HTML hash first; missing or externally edited parent HTML fails. Edit a copy and pass it with `--html` instead of altering saved history. `htmlPage.selection` distinguishes explicit HTML input from a selected parent, and its source hash identifies the bytes consumed.

Page-only edits retain the exact diagram JSON. For intentional diagram or theme changes, use `author --input <changed.json> --html <existing.html> --sync-html ...`, or add `--sync-html` when inheriting the selected parent's page. The tool validates the complete old managed region and embedded playback hash before replacing that region with the current public SDK output. Outer HTML/CSS remains byte-for-byte intact. SDK identity must match the installed baseline. A mismatched page without this flag fails; synchronization records the previous input and playback hashes. Check that the heading, one-sentence introduction and any functional reading hint still describe the changed diagram accurately; do not reintroduce process or report text during continuation.

After finalization removes the old workspace, read the delivered report, copy the delivered `diagram.html` into a fresh task for page edits, and use the delivered `diagram.json` as input. For diagram edits, save a revised JSON and submit the delivered HTML with `--sync-html`. No historical parent or second page-source file is needed. Keep the report's requested formats unless the user changes them. Each successful continuation can be finalized and resumed again from its delivered files.

Every continuation registers its actual final HTML identity and performs fresh applicable checks. Old HTML screenshots and observations do not cover changed bytes. Author-side `--html-review` rejects a page that differs from its reviewed source; author, capture and actually view the new page before recording its new review. An invalid selected input preserves the previous complete delivery and recovery files.

HTML inspection opens the final outer page, checks controls in its declared playback iframe and captures the whole page. File completion, browser facts and later actual-viewing observations remain separate. If a browser is unavailable, HTML may finish while inspection remains incomplete; keep that limitation explicit.

## Finalize the task

After generating the requested files, actually view and revise the relevant surfaces, and state any remaining viewing gaps or issues. Publish the selected current result with:

```text
node <skill-directory>/scripts/flowsvg.mjs finalize --workspace <task-workspace> --name <diagram-name> [--notes <agent-summary.md>]
```

The default source is `current` under `<task-workspace>/history/<name>/`. Finalization reads only its registered current artifacts, verifies input and output bytes, theme and exact SDK identity, and publishes no stale files from an earlier run. Missing requested formats or changed output bytes preserve the workspace and previous final delivery. `--from <checkpoint>` explicitly selects an immutable saved version; the retained checkpoint's matching source ancestry remains available for requested historical exports.

Finalization publishes JSON, HTML, requested images, `report.json` and `report.md` under `.diagrams/<name>/`. The portable report records relative final-file paths, hashes, the selected revision, SDK identity, checks, original source metadata, user decisions and recorded review observations. It contains no required links to temporary screenshots or revision directories. Default reports omit unified quality; explicit formal review retains its coverage facts and viewer issues. Cleanup grants no visual approval.

Complete files may be finalized with disclosed inspection gaps. For requested formal review, missing checks keep coverage incomplete; unresolved issues retain their reported status under [the report contract](#revisions-and-reports). File publication does not complete those checks or establish user acceptance.

Only after publication succeeds does the command remove the exact task workspace, including helper scripts, temporary revisions and screenshots. Check the returned `cleanup.status`; a cleanup error leaves the final delivery intact and must be reported. `--keep-work` preserves the full workspace only when the user explicitly requests history or debug evidence. Finalization never prunes earlier `.history` directories or other tasks. A subsequent edit imports the final `diagram.json` and, for an Agent page, its final `diagram.html` into a fresh workspace using [page continuation](#continue-an-existing-page). Read the existing final report and re-export its requested formats unless the user changes the delivery set; files from changed content cannot be reused as new exports.

## Revisions and reports

Ordinary `validate --input <json>` reads the input once, identifies its exact bytes by SHA-256, and applies field/reference checks and compilation, with finite geometry calculations only when `--geometry` is requested. It returns diagnostics on stdout with `revision: null`, `validation.snapshotCreated: false`, no artifacts and no report files. It never creates a history directory or starts a browser. Draft `--name` is optional; `--output` is only a lookup root for `--from`, not a validation report destination. A missing runtime may still prepare the isolated dependency cache. Keep the original draft and redirect stdout into the task workspace only when a saved diagnostic is useful.

`validate --from <revision> --name <name> --output <history-root>` verifies the exact saved report, canonical diagram scope and input hash before checking its bytes. `validation.sourceRevision` identifies that verified source; `revision` remains null because the command creates no new version. A draft uses `validation.sourceRevision: null`. Geometry observations are informational; they require no approval source. Validation rejects write-related `--parent`, `--sources` and review options. Earlier validation success is never reused by `author`: authoring reads, saves and checks the bytes supplied to that invocation, with its actual theme and runtime.

Default saved authoring reuses `<task-workspace>/history/<name>/current/`; low-level authoring without `--output` uses `.diagrams/.history/<name>/current/`. A run stages complete files privately before replacing the current result. Failed runs save the attempted input and factual report while retaining a bounded, source-identified recovery result. `--from current` resumes the saved current JSON; `--input <draft>` consumes the edited draft. A successful low-level default author also publishes complete files to `.diagrams/<name>/`; explicit output roots wait for finalization.

Use `author --checkpoint` only when immutable version retention is explicitly requested. That operation allocates `v###`, preserving prior versions. `--from <checkpoint>` or `--parent <checkpoint>` selects an explicit saved source; it does not by itself require another checkpoint. Input JSON is read once and saved byte-for-byte, identified by SHA-256 and shared by checks and exports. Source files, immutable versions and unrelated output directories remain protected. A save failure reports what remains recoverable rather than claiming a completed result.

Except for `--help`, stdout contains one JSON object; progress uses stderr. Exit status is `0` for `ready`, `validated`, `delivered`, `measured` or `laid-out`, and `1` for `failed` or `cancelled`. `validated` is not a delivery-complete status. Fields include:

- `schemaVersion`, `toolVersion`, `command`, `status`, and the last `stage`.
- `revision`: ID, number, directory and parent; null for read-only validation or when allocation failed.
- `sources`: the original input path plus optional source metadata. `input` records the original path, byte count and SHA-256. `theme` is the explicit command override, document theme or light default. `sdk`: actual version, isolated path, pinned source, integrity and development/release baseline; null when no SDK was loaded.
- `checks`: separate field/reference validation, compilation, layout and visual states. A skipped check remains `not-run`.
- `diagnostics`: severity, stage, code, location, reason and next step. Explicit geometry observations also record `objectId`, related objects when applicable, exact `timeMs`, `warningKey`, `issueId`, `sourceRevision` and `issueContext` (source SHA-256, SDK version/integrity, effective theme/reducedMotion, time and key). Geometry computations use finite samples; three geometry codes come only from public SDK `diagnoseAt`.
- `artifacts`: only saved files, with their kind and absolute path. `author` saves JSON, HTML and the structured/readable report pair; optional SVG/PNG records exact file identity, actual `timeMs`, `theme`, background, camera and intrinsic dimensions. Source metadata is saved when provided. Failed exports do not register an incomplete file.
- `compilation`: actual duration and public compiled beats after compilation succeeds.
- `completion`: requested/completed file kinds and delivery status. Default reports omit `completion.quality` and `qualityCoverage`, with formal review `not-requested`. Explicit formal requests add structural/viewing coverage; complete coverage can coexist with `unresolved-issues`. Viewer observations and actions remain separate from machine facts and design acceptance. A later failure preserves successful files and marks delivery incomplete.
- `layout`: actual finite frame times, active focus and check method. `provenance`: selected parent directory, actual/previous SHA-256 and original issues. `userDecisions`: historical choices remain opaque provenance; new design choices belong in the draft or issue notes rather than a CLI approval submission. Visual stages record their own evidence separately.

During a task, `report.json` is the detailed factual record and `report.md` is derived from it. Finalization replaces those details with the portable final-delivery summary described above. Neither a successful command nor an empty diagnostic list implies semantic, layout or visual approval. Ctrl+C or termination signals preserve the original input. Authoring retains its attempted input and recovery files and records cancellation when writable; validation returns cancellation on stdout without a saved report. Both commands release the installing child before cleanup. A force-killed process cannot write a final report; the next `author` run reclaims a dead operation reservation and recovers abandoned preparation state. Explicit retained snapshots keep their reserved numbers.

## Static layout drafts

For the selected workspace-root source draft, use `layout --input <draft.json> --plan <layout-plan.json> --in-place`. Supply `--output <new-draft.json>` instead only when a separate copy is wanted. Input and plan paths must be nonempty; `--geometry` is optional. `--plan` is valid only for this command. Read the [version-1 layout-plan contract](layout-plan.md) before constructing a plan. The command reads each source once, validates the draft through the installed SDK, validates plan fields/static scope/references, and measures planned structured-content and label-only nodes at their final planned widths, including child-derived widths for expanded groups. Auxiliary measurement estimates remain in the result and do not stop the operation. Override-only nodes outside the primitives retain every geometry field that the override does not name; they are not automatically measured.

The command computes geometry, validates and compiles the result, and, with `--geometry`, computes finite geometry observations before publishing the JSON. Label `text-overflow` warnings include current height, required height and estimated line count; the line count is a deterministic public-SDK estimate and is not browser pixel or formal SVG/PNG artifact evidence. In-place publication uses the [editable-source protection](#write-a-height-filled-draft) below. Explicit copy publication uses a complete same-directory temporary file and an exclusive hard link; an existing target is never replaced, and the copy cannot name either input. A read, validation, compilation, measurement, cancellation or publication failure preserves source bytes and removes the command's temporary file. The requested parent directory must already exist and be writable.

The stdout result has `command: "layout"`, `status: "laid-out"` on success and `revision: null`. It includes separate `input`, `plan` and `output` path/byte/SHA-256 identities, installed `sdk`, `strategy`, `changes`, actual `overrides`, `measuredNodes`, `preservedSemanticFields`, `checks`, finite `layout` coverage and all `diagnostics`. Only a successfully published draft appears in `artifacts`. No numbered revision, report file or delivery is allocated. In-place operations reserve the task series used by author/finalize and release that reservation afterward. Keep Agent-created plans, the selected draft and any useful diagnostic summary in the task workspace; `--output` for layout names a draft file, not the history root used by `author` and saved-source validation.

Optional geometry observations retain their code, participant fields, time, method and output-bound source identity. Their severity is `info` and their source revision is null; they need no approval or exception registration. Successful computation is not a design verdict. Inspect the actual rendered artifact when adjusting the diagram. The output is directly usable by `measure --input`, `validate --input` and `author --input`.

## Static delivery

`author` defaults to editable JSON and one offline HTML file, rendered with `autoplay: false` and `controls: true`. When a browser is available, it opens the actual saved `diagram.html` after export and records `checks.html: captured`, the file SHA-256, display conditions, initial paused state, offline requests, playback and the planned static/timeline states. This programmatic inspection does not claim that a model viewed the images. Use `review --from <source-revision> --name <same-name> --output <same-root> --html-review <json>` after viewing the captured HTML states; it records reviewer observations and hashes, and rejects changed HTML or incomplete identities. Without a browser, `checks.html` is `not-run` with an explicit reason. Theme precedence is command `--theme`, document `theme`, then `light`. HTML and SVG rendering require no browser; preview capture is a separate stage. Before requesting SVG, PNG or GIF, read [export files](export.md) for flags, timing, limits and partial-delivery behavior. `--time` requires `--svg` or `--png`; `--export-manifest` selects a snapshot- and SDK-bound batch and excludes single-frame `--svg`/`--png`/`--time`; `--png-width` requires PNG, and `--background` requires a requested static image; `--gif-options` requires `--gif`, and GIF requires `author`.

## Content measurement

Use `measure --input <json>` to estimate text height at a fixed width through the isolated public SDK. The command returns stdout JSON without reserving a diagram revision. Read [the content model](document-model.md#node-content-and-measurement) when constructing structured content.

### Choose the input

| Input form | Use and fields |
| --- | --- |
| One measurement object | Use `{kind, width, label?, content?, typography?}` for one fixed-width experiment. Ordinary `label` must be a nonempty string; preset labels accept a string (including empty) or nonempty string-version array. When both ordinary label and content are supplied, the result uses the larger required height. Presets reject structured content. |
| Top-level array | Measure unrelated structured-content objects in one process. Each item's optional `label` is descriptive metadata, not measured text. |
| Complete diagram draft | Measure structured-content and label-only nodes by ID, using authored width and document typography. Preset nodes include empty/omitted initial labels and every label replacement. Ordinary labels remain initial-only. Complete document nodes retain the label/content mutual-exclusion rule. |

For an independent object, `content` accepts one content object or a nonempty array of versions. Use [the multiple-version example](../examples/content-measurement.json) for a runnable input. Draft measurement includes initial content and every `updateNode.value.content` replacement.

For `diamond`, `parallelogram`, `document` and `predefinedProcess`, height and width diagnostics come from public `measureNodeLabel`; see [preset labels](document-model.md#preset-labels). `layout` measures these kinds at final planned widths in a static draft. Add animation afterward and use `measure` for a common height across preset label versions. Width issues stop draft backfill and layout and point to the node's `label`; standalone measurement returns the unresolved diagnostics for inspection. Height recommendations alone do not prove width fit.

### Read measurement results

All results identify `method: "sdk-content-estimate"` and `units: "diagram"`.

- **One object:** `measurement.height` is the required height. Structured-content results retain SDK diagnostics. Multiple content versions add `perContent` heights and `drivenBy`, the zero-based version that determines the shared height.
- **Batch:** `measurement.items` retains each item's `index`, optional metadata `label`, height, diagnostics and applicable per-version details.
- **Draft:** `measurement.kind: "draft"` contains a `nodes` array. Each entry records `nodeId`, `currentHeight`, `requiredHeight`, `recommendedHeight`, positive-or-zero `heightChange` and diagnostics. Structured-content entries also retain per-version results. A recommendation can be below the authored height; height backfill preserves the larger authored value.

Text-bearing results include `estimatedLineCount` and `estimatedLineCountMethod: "public-sdk-baseline-y-estimate"`. Structured-content counts use distinct public `contentLayout.lines` baseline positions; label-only counts use public SDK label baselines. Each content version retains its estimate, and the shared estimate is the maximum. Structured-content counts retain all public baseline positions, including graph-internal label positions when supplied by the SDK. These are deterministic structural estimates, not browser glyph pixels or formal SVG/PNG evidence.

### Inspect estimated text lines

Add `--lines` only to `measure` when you need the SDK's estimated wrapping before image inspection:

```text
node <skill-directory>/scripts/flowsvg.mjs measure --input <draft-or-measurement.json> --lines
```

The result adds one `estimatedLines` array to each single-object result, batch item or draft-node result. Without the flag, no line arrays are added. Each record contains `text`, `sourcePath` and zero-based `versionIndex`; structured text also retains public `blockIndex`, `role` and applicable `itemIndex`/`tagIndex`. Text sources point to the original text field, including animation actions. Generated list markers instead point to the block's authored `marker` configuration, with `itemIndex` identifying the generated item marker. A list without a marker configuration produces no marker records in the pinned SDK. Label records omit block/item/role fields. Mixed independent label/content experiments distinguish those sources; batch labels remain metadata.

Records retain the measured version order and public SDK record order at the selected width and typography. Ordinary draft labels remain initial-only; presets and structured content retain their existing replacement-version scope. Every measured version is included, not only the tallest. Graph-internal labels are excluded from this list. Empty text estimates return `[]`; long results are not truncated. Per-version measurement details do not duplicate the list.

A record is not necessarily a separate baseline: body, auxiliary, status and tags remain distinct even on the same line. Therefore `estimatedLines.length` need not equal `estimatedLineCount`; the existing count method is unchanged. The text comes from public `contentLayout.lines` or `labelLines`, and can include unclipped records outside the safe area. It does not establish actual glyph visibility, natural terminology breaks, readability or design quality. Inspect the rendered image at the intended size to judge those questions.

The flag changes neither height, diagnostics nor pass/fail behavior. With `--output`, line records stay in the report and never enter the height-filled document. If complete-draft measurement fails, it returns diagnostics only, with no partial lines or node results and no backfill file. Independent objects retain their existing results with diagnostics. Other commands reject `--lines` before creating history or artifacts.

### Locate SDK measurement diagnostics

SDK diagnostics retain `versionIndex`, `path`, `dimension` and `message`. The added `sourcePath` identifies the original input field, including a version-array element, content block or animated replacement. For example, `path: "content[1].blocks[0]"` can map to `sourcePath: "scenes[0].beats[1].actions[0].value.content.blocks[0]"`. Node IDs remain separate from array-index paths, so a dot in an ID does not create a path level. Independent objects use `content`/`label`; top-level batch items use `[i].content`, with `label` still metadata. Per-version diagnostics retain the SDK index from that individual measurement call; use `sourcePath` to locate their original version.

Use `nextStep` to distinguish width and graph-block height checks. Width issues require checking the node width, content or label safe area, text sizing, and graph-local coordinates when applicable. Increasing the outer node height cannot correct horizontal overflow or enlarge a fixed graph block. For graph height issues, inspect both the fixed block height and local coordinates; increasing block height alone cannot correct negative extents. The CLI does not probe or invent a required graph-block height.

These diagnostics describe the SDK algorithm at the chosen width and typography. They do not prove actual glyph visibility, unreadability or poor design. Keep measurement failure separate from the actual-image judgment; the operation and file-protection rules follow below.

### Write a height-filled draft

For a complete task draft, use `measure --input <task-workspace>/draft.json --in-place` to apply height increases to the selected source. Repeated measurement and layout reuse that file. Without `--in-place` or `--output`, measurement returns suggestions only. Use `--output <new-draft.json>` only for an explicit separate copy; the source bytes remain unchanged and an existing copy target is never overwritten. The two write modes are mutually exclusive. Only node heights change during backfill, and they only increase. Node positions and widths, IDs, content, parent membership, edges, scenes, viewport and other fields remain unchanged.

In-place edits require a canonical regular JSON file directly inside `.diagrams/.work/<name>/<task-id>/`, with no symlink ancestors or hard links. Keep the editable source there; generated `history/<name>/current/diagram.json`, immutable checkpoints and external files are protected. The command reserves the same task series as author/finalize, writes a complete sibling temporary file, rechecks the original file identity and bytes, and atomically renames the replacement. A busy task, source edit, cancellation or save failure leaves the original recoverable; staging files are removed. Reauthor from the same source path after backfill or layout. Finalization rejects a workspace-root source whose bytes changed after the selected author run, so old generated files cannot stand in for the edited draft.

Complete-draft measurement rejects animated width or height changes with `MEASUREMENT_SIZE_ANIMATION`, even without `--output`. Measure affected states separately and use the authoring workflow to coordinate their geometry. Width or fixed-height graph overflow remains an auxiliary SDK estimate and does not stop measurement or height backfill. A taller node does not change the node width or enlarge a fixed graph block; use the estimate as context when viewing and adjusting the rendered result. Draft diagnostics retain `objectId` and use zero-based input array positions in `location`, including `scenes[i].beats[j].actions[k].value.content` or `.label` for replacements. Failed complete-draft measurement returns diagnostics only, without partial node measurements or an output copy.

`status: "failed"` and a nonzero exit code mean that the requested measurement operation did not complete. Read the diagnostic code and location to distinguish invalid input, unsupported animated size changes, failed SDK execution and output-publication errors. This status does not declare the diagram visually invalid. A node shorter than the computed height can still produce a successful height recommendation; an existing output target can prevent publication after measurement succeeds internally.

Within complete-draft measurement, document validation precedes the animated-size check, then node measurement and any requested output publication. A failure stops later checks, so the returned diagnostics are not an exhaustive list of the draft's problems. Only a successful complete-draft operation returns the measurement results and, when requested, publishes the replacement or explicit copy. The source bytes and existing target remain protected on failure.

After height backfill, coordinate node positions, group bounds and connection clearance through the authoring or layout workflow. Inspect diagnostics and perform actual image inspection before claiming that the diagram fits or its layout is approved.

## Source metadata

Pass `--sources` a JSON array authored from the user's evidence. Records have required `kind` (`prompt`, `file`, `url`, `repository`) and nonempty `reference` strings; optional `description` and `scope` are strings. Example:

```json
[
  {"kind":"prompt","reference":"客户端向订单 API 提交订单，API 保存到订单存储","description":"用户明确描述"},
  {"kind":"repository","reference":"/chosen/project","scope":"services/orders/**","description":"用户明确指定的读取范围"}
]
```

The tool reads and validates this metadata once, saves it as `sources.json` with current or the explicit snapshot, and copies records into the report. It does not open referenced paths, fetch URLs or infer authorization from metadata. The author must stay within the actual user-designated scope. The diagram JSON path is always recorded even when metadata is omitted. Metadata errors occur after the draft is saved and before SDK checks.

## Registry baseline and compatibility

The runtime uses the exact published `flowsvg@0.3.1` registry package. Its version and integrity are recorded in `runtime/manifest.json` and `runtime/package-lock.json`; other dependencies are exact registry versions. The supported SDK version is exactly `0.3.1`, and runtime installation never dynamically selects another SDK version. A future SDK upgrade requires a new exact baseline, regenerated lockfile and manifest, and the full independent skill acceptance before it becomes current. The tool does not perform npm publication.

## Previews and visual review

Default `author` captures actual HTML, with `--samples <count>` selecting its bounded timeline points (default 12). Read `htmlInspection.plan` and `htmlInspection.states` for its scope. `--preview` explicitly adds SDK state captures with their separate `visual.plan`; choose enough capture scope for the explanation, then actually view the relevant files. Default reports omit formal quality coverage.

After file export attempts, `author` captures actual HTML and, only with `--preview`, bounded SDK states. Missing browsers preserve default delivery with an informational diagnostic. Unusable explicit browsers or capture failures return a failure while preserving successful exports. See [prepared browser selection](visual-checks.md#prepared-browser) for configuration and [partial delivery](export.md#partial-delivery-and-history) for stage ordering and cancellation.

| Report field | Evidence recorded |
| --- | --- |
| `visual.plan` | Static single-frame or compiled-beat sampling strategy, exact points, bound and omitted candidates |
| `visual.capturedFrames` | Saved image paths, times, SHA-256 and font observations |
| `visual.resources` | Cleanup of owned browser resources |
| `visual.status` | Capture/review state, including `awaiting-review`, `not-run`, `failed`, `cancelled` or `review-recorded` |
| `visual.viewedFrames` and `visual.review` | Submitted source-image observations and reviewer identity |
| `htmlInspection` | Actual `diagram.html` identity, display conditions, paused/playback facts, captured state hashes, cleanup and later viewed-state attestations |

Capture alone leaves actual viewing unclaimed. Read [visual inspection](visual-checks.md#actual-model-inspection), view the files and report viewing scope at delivery. Only explicit formal review adds [registered review inputs](review-inputs.md#submit-filled-html-and-preview-forms); its stable source images and rendering inputs must still match.

## Formal image evidence

Use on-demand `evidence` for [target-size artifact evidence](artifact-evidence.md) for actual SVG/PNG files. `exports` records each requested static file result. `artifactEvidence` records saved settings and per-surface capture status. `visual.artifactReviews` records later actual-viewing attestations independently of sampled `viewedFrames`; `artifactEvidenceCoverage` counts viewed and unviewed surfaces. Original artifact revision, diagram subject and evidence-record ID are distinct. Evidence records append outside `v###`; reuse verifies identities without browser, runtime or writes. Finalization loads unreviewed request conditions too, including valid requests that failed browser discovery or launch. Invalid settings remain a read-only preflight failure. Capturing a PNG or screenshot does not establish actual viewing or design quality. Use independent `review --artifact-review` to append actual-viewing observations; `--evidence-from` explicitly selects a separate evidence source while `--from` stays the diagram subject. The source locator, original artifact and screenshot identities are reverified at submission, repeat and finalization. Required surfaces and unresolved issues remain complete; preview and HTML observations cannot replace formal-image coverage.

Batch selection and schema are documented in [named batch exports](export.md#named-batch-exports). `exportManifest` records original bytes/hash, parsed selection and shared settings. `exports` records each item and incomplete category results. `provenance.exportManifests` retains historical manifest sources when an explicit parent is selected.

## Review preflight and templates

Use [review input contracts](review-inputs.md) for all three complete JSON schemas, explicit source selection and `review-template`. Invalid author review inputs fail before snapshot allocation, runtime preparation or rendering. Template generation verifies existing evidence and writes one new, unviewed form inside the same task workspace. It does not create a diagram revision or claim actual viewing.

## Independent review records

Use `review --from <diagram-revision> --name <diagram> [--output <history-root>]` with any combination of `--html-review`, `--visual-review` and `--artifact-review` inputs. For a separate formal-image evidence source, add `--evidence-from <source>`. The command verifies existing source evidence and atomically appends one record under `<history-root>/<name>/records/reviews/`. It does not prepare SDK dependencies or run any production/capture stage. Identical semantic submissions reuse their record; changed observations append. See [the complete contract](review-inputs.md#submit-filled-html-and-preview-forms).

Reports returned by `review` use `revision: null` and distinguish `sourceRevision` from `record.id`. `finalize --from` continues to select a real diagram revision, never a review record ID. Finalization rechecks applicable records and source hashes before recomputing quality. Its portable report names considered/adopted records, retains observations and unresolved issue history, and preserves all requested original exports. Invalid records preserve the task and prior delivery; no historic report is rewritten.
