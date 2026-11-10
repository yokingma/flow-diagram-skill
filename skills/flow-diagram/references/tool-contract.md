# Runtime and result contracts

Install the entire `skills/flow-diagram/` directory as `flow-diagram/` using the host's existing skill installation mechanism. Preserve its contents and relative paths. The installed tool uses Node directly; Bash, pnpm, a TypeScript compiler, and the source repository are not runtime requirements.

For Skill tasks, use the explicit task workspace in saved commands below; CLI `--help` lists all low-level options.

```text
node <skill-directory>/scripts/flowsvg.mjs doctor
node <skill-directory>/scripts/flowsvg.mjs prepare
node <skill-directory>/scripts/flowsvg.mjs validate --input <json> [--theme light|dark]
node <skill-directory>/scripts/flowsvg.mjs validate --from <revision> --name <diagram-name> [--output <history-root>] [--theme light|dark]
node <skill-directory>/scripts/flowsvg.mjs author --input <json> --name <diagram-name> [--html <page.html>] [--sync-html] [--sources <metadata.json>] [--theme light|dark] [--svg] [--png --png-width <pixels>] [--time <ms>] [--background theme|transparent] [--samples <count>] [--artifact-preview-settings <json>] [--artifact-review <json>] [--gif --gif-options <json>] [--browser <executable|none>] [--visual-review <json>] [--html-review <json>] --output <task-workspace>/history [--parent <revision>] [--decisions <json>]
node <skill-directory>/scripts/flowsvg.mjs author --from <revision> --name <diagram-name> --output <task-workspace>/history [--decisions <json>]
node <skill-directory>/scripts/flowsvg.mjs evidence --from <revision> --name <name> --output <history-root> [--artifact-preview-settings <json>] [--browser <executable|none>]
node <skill-directory>/scripts/flowsvg.mjs review --from <subject-revision> --name <name> [--output <history-root>] [--html-review <json>] [--visual-review <json>] [--artifact-review <json> --evidence-from <evidence-source>]
node <skill-directory>/scripts/flowsvg.mjs review-template --from <subject-revision> --name <name> --output <history-root> --kind <visual|html|artifact> --template <new-task-file> [--evidence-from <evidence-source>]
node <skill-directory>/scripts/flowsvg.mjs measure --input <measurement.json> [--output <new-draft.json>]
node <skill-directory>/scripts/flowsvg.mjs layout --input <draft.json> --plan <layout-plan.json> --output <new-draft.json>
node <skill-directory>/scripts/flowsvg.mjs finalize --workspace <task-workspace> --name <diagram-name> --from <revision> [--keep-work]
```

`doctor` checks Node 20+, npm, cache write access and the expected cached SDK state. It does not install dependencies or claim network access was tested. `prepare`, `validate`, `author`, `measure` and `layout` automatically run `npm ci` against the exact runtime manifest and lockfile when no verified cache exists. Package lifecycle scripts are disabled. The SDK is resolved through its public ESM exports inside that environment. The tool never falls back to the current project, global SDK, or registry latest.

The default cache follows the platform's cache convention: macOS `~/Library/Caches/flowsvg-authoring`, Windows `%LOCALAPPDATA%/flowsvg-authoring/Cache`, Linux `$XDG_CACHE_HOME/flowsvg-authoring` or `~/.cache/flowsvg-authoring`. `FLOWSVG_CACHE_DIR` selects another cache root. Cache identities include tool scripts, the dependency manifest and lockfile, the SDK baseline, platform and architecture. A complete cache verifies every installed regular file before reuse. Modified, wrong-version or incomplete environments are rebuilt. Preparation uses an installation lock and a temporary environment; cancelled or failed preparation removes its own temporary files and lock. A later run removes temporary environments whose owning process has exited.

A complete cache is usable offline. npm must still be available. A first uncached run needs access to the lockfile's packages; network, permissions or integrity failures preserve the original input and any authoring snapshot, mark SDK checks `not-run`, and return a nonzero exit status. Configure npm's normal proxy or certificate settings when the environment requires them. An active installation lock is bounded by a two-minute wait and reports a recovery action if the owner does not release it.

## Task workspace

Persistent project design preferences follow [their separate Agent contract](preferences.md). They are outside individual task workspaces; the following rules govern production drafts, helpers and evidence.

Resolve the chosen working directory to its canonical real path before the first saved command, and derive workspace paths from that directory. Use that same real directory for later commands. Path aliases such as macOS `/tmp` versus `/private/tmp` can produce source paths that review-template or finalization rejects, even when both names reach the same files. Preserve an affected task; start a fresh canonical workspace rather than editing saved source reports.

Before writing task files, create `.diagrams/.work/<diagram-name>/<task-id>/` under the user's chosen working directory. Choose a fresh task ID, such as a timestamp with a unique suffix, to keep concurrent tasks separate. Pass `--output <task-workspace>/history` to saved authoring, export, evidence and review calls. Read-only `validate --input` needs no history path; `validate --from` uses this history root to locate its explicit source. Keep commands running from the chosen working directory so relative CLI output paths stay correct. The finalization command accepts only real task directories under `.diagrams/.work/<name>/`; symlinked and broader directories are rejected.

Keep Agent-created drafts, helper scripts, measurement batches, source metadata, export manifests, decisions, review/settings JSON and redirected stdout/logs inside this workspace. Before creating files, identify material that must survive finalization: copy it to an explicitly chosen retention directory outside this task workspace, or use `finalize --keep-work`. Successful default finalization removes the task workspace, including logs and intermediate files. Write JSON directly and use the bundled CLI before adding scripts. If a helper script is needed, give it explicit paths inside the workspace for its intermediate output; send final export work through the CLI. User-provided sources stay at their existing paths, and the tool manages its own cache, revision files and final delivery directories.

Treat the installed skill as read-only. Task helpers belong in the workspace rather than the installed skill, project root, application `scripts/`, unrelated `.scratch/` folders or system temporary directories. The Agent creates this workspace; the CLI does not automatically relocate arbitrary helper files.

During iteration, use browser-free validation and reuse one batch measurement input generated from the draft content and typography. Capture only after layout and content are ready. Keep drafts, helpers and inspection files in the workspace until finalization succeeds; failed or cancelled tasks remain available for recovery. Existing source files, other tasks and historical directories are outside cleanup scope.

## Editable HTML pages

For new or revised HTML explanations, copy [the page starter](../examples/html-page.html) into the task workspace, then author only the heading, one-sentence introduction, functional reading hints and CSS allowed by the [page content contract](delivery-contexts.md#keep-the-html-page-minimal). Move source facts, decision records, inspection scope and process notes to the delivery explanation or reports. Supply that complete page to `author --input <diagram.json> --html <page.html> --name <name> --output <history-root>`, with the usual browser and export options. The resulting `diagram.html` is both the editable page and the single-file offline delivery; no separate page source is published. Without an explicit page or a selected parent with an Agent page, low-level `author` retains SDK-only HTML output.

A page contains exactly one ordered `<!-- flowsvg:player:start -->` / `<!-- flowsvg:player:end -->` region. An empty region is filled from the checked diagram. An existing filled region must match the exact diagram JSON bytes, theme, SDK identity and generated playback output. The region contains Skill-owned versioned data, `flowsvg-page-data`, the iframe `flowsvg-page-player`, and sizing code; preserve it when editing outer markup/CSS. These two IDs are reserved to that region. Malformed, duplicate, unsupported or mismatched regions fail explicitly rather than silently changing the diagram. The tool consumes the complete public SDK `renderHtml` result as opaque iframe content, without reading private assets or modifying SDK scripts.

The input page is read once before allocating a version. `htmlPage` records portable source SHA-256/byte count, diagram SHA-256, SDK version/integrity, theme, playback HTML hash and final HTML hash. Finalization retains this provenance. Page composition finishes before final HTML identity and browser evidence are recorded. To edit a saved result, work on a copy and submit it as a new authoring input; direct edits to registered historical files invalidate their checks. By default, an existing playback region requires matching diagram bytes; use the explicit synchronization workflow below for intentional changes.

### Continue an existing page

When `--from <revision>` or `--input <changed.json> --parent <revision>` selects a saved parent, authoring inherits that parent's Agent page unless `--html` explicitly selects another page. Inheritance verifies the registered HTML hash first; missing or externally edited parent HTML fails. Edit a copy and pass it with `--html` instead of altering saved history. `htmlPage.selection` distinguishes explicit HTML input from a selected parent, and its source hash identifies the bytes consumed.

Page-only edits retain the exact diagram JSON. For intentional diagram or theme changes, use `author --input <changed.json> --html <existing.html> --sync-html ...`, or add `--sync-html` when inheriting the selected parent's page. The tool validates the complete old managed region and embedded playback hash before replacing that region with the current public SDK output. Outer HTML/CSS remains byte-for-byte intact. SDK identity must match the installed baseline. A mismatched page without this flag fails; synchronization records the previous input and playback hashes. Check that the heading, one-sentence introduction and any functional reading hint still describe the changed diagram accurately; do not reintroduce process or report text during continuation.

After finalization removes the old workspace, read the delivered report, copy the delivered `diagram.html` into a fresh task for page edits, and use the delivered `diagram.json` as input. For diagram edits, save a revised JSON and submit the delivered HTML with `--sync-html`. No historical parent or second page-source file is needed. Keep the report's requested formats unless the user changes them. Each successful continuation can be finalized and resumed again from its delivered files.

Every continuation registers its actual final HTML identity and performs fresh applicable checks. Old HTML screenshots and observations do not cover changed bytes. Author-side `--html-review` rejects a page that differs from its reviewed source; author, capture and actually view the new page before recording its new review. An invalid selected input preserves the previous complete delivery and recovery files.

HTML inspection opens the final outer page, checks controls in its declared playback iframe and captures the whole page. File completion, browser facts and later actual-viewing observations remain separate. If a browser is unavailable, HTML may finish while inspection remains incomplete; keep that limitation explicit.

## Finalize the task

When all requested files are complete, each required check has been performed or its gap and impact are explicit, and every observed issue has a recorded handling decision, run:

```text
node <skill-directory>/scripts/flowsvg.mjs finalize --workspace <task-workspace> --name <diagram-name> --from <selected-revision>
```

The command reads the selected successful `author` revision under `<task-workspace>/history/<name>/`. It collects requested output files through the explicit parent chain while source JSON bytes, SDK version/integrity and theme match. This preserves PNG/SVG/GIF after review-only calls. Changed content ends that search: re-export requested images for the changed draft. Missing, failed or modified static exports block finalization and preserve the previous final delivery and workspace.

Finalization publishes JSON, HTML, requested images, `report.json` and `report.md` under `.diagrams/<name>/`. The portable report records relative final-file paths, hashes, the selected revision, SDK identity, checks, original source metadata, user decisions and recorded review observations. It contains no required links to temporary screenshots or revision directories. A report's `quality` remains its scoped check result; cleanup grants no visual approval.

Complete files may be finalized with disclosed inspection gaps. Missing checks keep quality incomplete; unresolved issues retain their reported status under [the report contract](#revisions-and-reports). File publication does not complete those checks or establish user acceptance.

Only after publication succeeds does the command remove the exact task workspace, including helper scripts, temporary revisions and screenshots. Check the returned `cleanup.status`; a cleanup error leaves the final delivery intact and must be reported. `--keep-work` preserves the full workspace only when the user explicitly requests history or debug evidence. Finalization never prunes earlier `.history` directories or other tasks. A subsequent edit imports the final `diagram.json` and, for an Agent page, its final `diagram.html` into a fresh workspace using [page continuation](#continue-an-existing-page). Read the existing final report and re-export its requested formats unless the user changes the delivery set; files from changed content cannot be reused as new exports.

## Revisions and reports

Ordinary `validate --input <json>` reads the input once, identifies its exact bytes by SHA-256, and applies field/reference checks, compilation and finite layout diagnosis. It returns diagnostics on stdout with `revision: null`, `validation.snapshotCreated: false`, no artifacts and no report files. It never creates a history directory or starts a browser. Draft `--name` is optional; `--output` is only a lookup root for `--from`, not a validation report destination. A missing runtime may still prepare the isolated dependency cache. Keep the original draft and redirect stdout into the task workspace only when a saved diagnostic is useful.

`validate --from <revision> --name <name> --output <history-root>` verifies the exact saved report, canonical diagram scope and input hash before checking its bytes. `validation.sourceRevision` identifies that verified source; `revision` remains null because the command creates no new version. A draft uses `validation.sourceRevision: null`. All validation-run warnings have `sourceRevision: null`; only a saved authoring report can supply a formal decision source. Validation rejects write-related `--parent`, `--decisions`, `--sources` and review options. Earlier validation success is never reused by `author`: authoring reads, saves and checks the bytes supplied to that invocation, with its actual theme and runtime.

For ordinary saved authoring, use `<task-workspace>/history/<name>/v001` with explicit `--output`. Low-level `author` without `--output` writes `.diagrams/.history/<name>/v001`. Each authoring invocation atomically reserves a new version, including failed invocations. Existing names and failed numbers are retained. Authoring should also provide a name so its final delivery has a stable destination. A successful default `author` delivery also publishes the selected JSON, HTML and report pair to `.diagrams/<name>/`; requested static exports are copied there when they succeed. `--output` selects an explicit history root and preserves the revision-only behavior for that root. `--parent` selects a readable revision under the same output root/name. `--from <revision>` uses that parent’s saved JSON without `--input`; it never guesses the latest revision. `--input <draft> --parent <revision>` uses a changed draft. Input taken directly from a version directory requires its matching explicit parent. See [revision decisions](diagnostics-and-revisions.md) for validation, decision records and preserved warnings. The original input is read once, saved byte-for-byte as `diagram.json`, identified by SHA-256, and used for all checks and exports. The tool never rereads the original draft for an export. The original input and existing revision files remain untouched. If the destination cannot be written, stdout explicitly reports a save failure and does not claim a saved draft.

Except for `--help`, stdout contains one JSON object; progress uses stderr. Exit status is `0` for `ready`, `validated`, `delivered`, `measured` or `laid-out`, and `1` for `failed` or `cancelled`. `validated` is not a delivery-complete status. Fields include:

- `schemaVersion`, `toolVersion`, `command`, `status`, and the last `stage`.
- `revision`: ID, number, directory and parent; null for read-only validation or when allocation failed.
- `sources`: the original input path plus optional source metadata. `input` records the original path, byte count and SHA-256. `theme` is the explicit command override, document theme or light default. `sdk`: actual version, isolated path, pinned source, integrity and development/release baseline; null when no SDK was loaded.
- `checks`: separate field/reference validation, compilation, layout and visual states. A skipped check remains `not-run`.
- `diagnostics`: severity, stage, code, location, reason and next step. Newly generated layout warnings also record `objectId`, related objects when applicable, exact `timeMs`, `warningKey`, `issueId`, `sourceRevision` and `issueContext` (source SHA-256, SDK version/integrity, effective theme/reducedMotion, time and key). All layout warning codes use finite samples; three geometry codes come only from public SDK `diagnoseAt`.
- `artifacts`: only saved files, with their kind and absolute path. `author` saves JSON, HTML and the structured/readable report pair; optional SVG/PNG records exact file identity, actual `timeMs`, `theme`, background, camera and intrinsic dimensions. Source metadata is saved when provided. Failed exports do not register an incomplete file.
- `compilation`: actual duration and public compiled beats after compilation succeeds.
- `completion`: requested and completed file kinds, delivery status and independent quality status. `delivered` means all requested file exports succeeded; layout records finite checks and visual approval remains independent. `qualityCoverage` lists every required structural, HTML and actual SVG/PNG display-surface check for the selected delivery. Static surfaces use recorded settings, or native intrinsic dimensions and the resolved theme backdrop when no size is specified. A missing requested export keeps delivery `incomplete` and never becomes a passed quality result. Quality is `incomplete` until every required check is complete; unresolved or deferred warnings and review issues set `needs-user-decision`; accepted intentional warnings retain their source records and can still allow `passed`. A later failure preserves successful files and marks delivery `incomplete`.
- `layout`: actual finite frame times, active focus and check method. `provenance`: selected parent directory, actual/previous SHA-256 and original issues. `userDecisions`: inherited choices remain unchanged; new choices require only `sourceRevision`, `issueId`, `decision` and `reason` in the submission. Saved new records add verified original context and display fields. Exact references are checked against real source reports in the explicit parent ancestry; no code/object fallback is accepted. Visual stages record their own evidence separately.

During a task, `report.json` is the detailed factual record and `report.md` is derived from it. Finalization replaces those details with the portable final-delivery summary described above. Neither a successful command nor an empty diagnostic list implies semantic, layout or visual approval. Ctrl+C or termination signals preserve the original input. Authoring retains its reserved revision and saved draft and records cancellation when writable; validation returns cancellation on stdout without a saved report. Both commands release the installing child before cleanup. A force-killed process cannot write a final report; the next `author` run reserves a fresh version and recovers abandoned preparation state.

## Static layout drafts

`layout` accepts only `--input`, `--plan` and `--output`; all three require a nonempty path. `--plan` is valid only for this command. Read the [version-1 layout-plan contract](layout-plan.md) before constructing a plan. The command reads each source once, validates the draft through the installed SDK, validates plan fields/static scope/references, and measures planned structured-content and label-only nodes at their final planned widths, including child-derived widths for expanded groups. Unresolved measurement diagnostics stop the operation. Override-only nodes outside the primitives retain every geometry field that the override does not name; they are not automatically measured.

The command computes geometry, validates and compiles the result, and runs existing finite layout diagnosis before publishing the new JSON. Label `text-overflow` warnings include current height, required height and estimated line count; the line count is a deterministic public-SDK estimate and is not browser pixel or formal SVG/PNG artifact evidence. Publication uses a complete same-directory temporary file and an exclusive hard link. An existing target is never replaced, and output cannot name either input. A read, validation, compilation, measurement, cancellation or publication failure preserves source bytes and removes the command's temporary file. The requested parent directory must already exist and be writable.

The stdout result has `command: "layout"`, `status: "laid-out"` on success and `revision: null`. It includes separate `input`, `plan` and `output` path/byte/SHA-256 identities, installed `sdk`, `strategy`, `changes`, actual `overrides`, `measuredNodes`, `preservedSemanticFields`, `checks`, finite `layout` coverage and all `diagnostics`. Only a successfully published draft appears in `artifacts`. No author history, report file or delivery directory is allocated. Keep Agent-created plans, drafts and redirected stdout in the task workspace; `--output` for layout names a draft file, not the history root used by `author` and saved-source validation.

Warnings retain their code, participant fields, time, `warningKey`, `issueId` and output-bound `issueContext`. Their `sourceRevision` is null because the draft has no author revision. Run `author` on the output before recording an exact warning decision. Read-only `validate` does not establish a persisted decision source. Successful geometry computation is not quality approval, and layout never enlarges spacing repeatedly to hide warnings. Its output is directly usable by `measure --input`, `validate --input` and `author --input`; measurement and validation remain read-only unless a measurement output draft is explicitly requested; authoring saves a revision and delivery files.

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

Text-bearing results include `estimatedLineCount` and `estimatedLineCountMethod: "public-sdk-baseline-y-estimate"`. Structured-content counts use distinct public `contentLayout.lines` baseline positions; label-only counts use public SDK label baselines. Each content version retains its estimate, and the shared estimate is the maximum. Graph-internal labels are outside this count. These are deterministic structural estimates, not browser glyph pixels or formal SVG/PNG evidence.

### Write a height-filled draft

Without `--output`, measurement reports suggestions only. For a complete draft, pass `--output <new-draft.json>` to publish a separate height-filled copy after all measurement checks succeed. Only node heights can change, and they only increase. Node positions and widths, IDs, content, parent membership, edges, scenes, viewport and other fields remain unchanged. The original input bytes are preserved, and an existing target is never overwritten.

Complete-draft measurement rejects animated width or height changes with `MEASUREMENT_SIZE_ANIMATION`, even without `--output`. Measure affected states separately and use the authoring workflow to coordinate their geometry. Unresolved width or fixed-height graph overflow also stops draft measurement and blocks height backfill; a taller node cannot resolve those problems. Diagnostics retain the node identity or content-version index and block path where applicable.

After height backfill, coordinate node positions, group bounds and connection clearance through the authoring or layout workflow. Inspect diagnostics and perform actual image inspection before claiming that the diagram fits or its layout is approved.

## Source metadata

Pass `--sources` a JSON array authored from the user's evidence. Records have required `kind` (`prompt`, `file`, `url`, `repository`) and nonempty `reference` strings; optional `description` and `scope` are strings. Example:

```json
[
  {"kind":"prompt","reference":"客户端向订单 API 提交订单，API 保存到订单存储","description":"用户明确描述"},
  {"kind":"repository","reference":"/chosen/project","scope":"services/orders/**","description":"用户明确指定的读取范围"}
]
```

The tool reads and validates this metadata once, saves it as `sources.json` in the revision, and copies records into the report. It does not open referenced paths, fetch URLs or infer authorization from metadata. The author must stay within the actual user-designated scope. The diagram JSON path is always recorded even when metadata is omitted. Metadata errors occur after the draft is saved and before SDK checks.

## Registry baseline and compatibility

The runtime uses the exact published `flowsvg@0.3.1` registry package. Its version and integrity are recorded in `runtime/manifest.json` and `runtime/package-lock.json`; other dependencies are exact registry versions. The supported SDK version is exactly `0.3.1`, and runtime installation never dynamically selects another SDK version. A future SDK upgrade requires a new exact baseline, regenerated lockfile and manifest, and the full independent skill acceptance before it becomes current. The tool does not perform npm publication.

## Previews and visual review

Use `author --samples <count>` to bound the preview points for focused inspection; the default is 12. A smaller count reduces capture and review cost, while `visual.plan` records omitted candidates and finite coverage. Preview coverage is distinct from overall quality; interpret `completion.quality` through [the report contract](#revisions-and-reports).

After default delivery and any requested GIF attempt, `author` attempts bounded previews. Missing browsers preserve default delivery with an informational diagnostic. Unusable explicit browsers or capture failures return a failure while preserving successful exports. See [prepared browser selection](visual-checks.md#prepared-browser) for configuration and [partial delivery](export.md#partial-delivery-and-history) for stage ordering and cancellation.

| Report field | Evidence recorded |
| --- | --- |
| `visual.plan` | Static single-frame or compiled-beat sampling strategy, exact points, bound and omitted candidates |
| `visual.capturedFrames` | Saved image paths, times, SHA-256 and font observations |
| `visual.resources` | Cleanup of owned browser resources |
| `visual.status` | Capture/review state, including `awaiting-review`, `not-run`, `failed`, `cancelled` or `review-recorded` |
| `visual.viewedFrames` and `visual.review` | Submitted source-image observations and reviewer identity |
| `htmlInspection` | Actual `diagram.html` identity, display conditions, paused/playback facts, captured state hashes, cleanup and later viewed-state attestations |

Capture leaves `checks.visual: not-run`. For actual image inspection and the later `--visual-review` schema, read [visual inspection](visual-checks.md#actual-model-inspection). Use independent `review` to append that review without another design revision; the source images and rendering inputs must still match. See [review inputs](review-inputs.md#submit-filled-html-and-preview-forms).

## Formal image evidence

Use on-demand `evidence` for [target-size artifact evidence](artifact-evidence.md) for actual SVG/PNG files. `exports` records each requested static file result. `artifactEvidence` records saved settings and per-surface capture status. `visual.artifactReviews` records later actual-viewing attestations independently of sampled `viewedFrames`; `artifactEvidenceCoverage` counts viewed and unviewed surfaces. Original artifact revision, diagram subject and evidence-record ID are distinct. Evidence records append outside `v###`; reuse verifies identities without browser, runtime or writes. Finalization loads unreviewed request conditions too, including valid requests that failed browser discovery or launch. Invalid settings remain a read-only preflight failure. Capturing a PNG or screenshot never completes quality. Use independent `review --artifact-review` to append actual-viewing observations; `--evidence-from` explicitly selects a separate evidence source while `--from` stays the diagram subject. The source locator, original artifact and screenshot identities are reverified at submission, repeat and finalization. Required surfaces and unresolved issues remain complete; preview and HTML observations cannot replace formal-image coverage.

Batch selection and schema are documented in [named batch exports](export.md#named-batch-exports). `exportManifest` records original bytes/hash, parsed selection and shared settings. `exports` records each item and incomplete category results. `provenance.exportManifests` retains historical manifest sources when an explicit parent is selected.

## Review preflight and templates

Use [review input contracts](review-inputs.md) for all three complete JSON schemas, explicit source selection and `review-template`. Invalid author review inputs fail before snapshot allocation, runtime preparation or rendering. Template generation verifies existing evidence and writes one new, unviewed form inside the same task workspace. It does not create a diagram revision or claim actual viewing.

## Independent review records

Use `review --from <diagram-revision> --name <diagram> [--output <history-root>]` with any combination of `--html-review`, `--visual-review` and `--artifact-review` inputs. For a separate formal-image evidence source, add `--evidence-from <source>`. The command verifies existing source evidence and atomically appends one record under `<history-root>/<name>/records/reviews/`. It does not prepare SDK dependencies or run any production/capture stage. Identical semantic submissions reuse their record; changed observations append. See [the complete contract](review-inputs.md#submit-filled-html-and-preview-forms).

Reports returned by `review` use `revision: null` and distinguish `sourceRevision` from `record.id`. `finalize --from` continues to select a real diagram revision, never a review record ID. Finalization rechecks applicable records and source hashes before recomputing quality. Its portable report names considered/adopted records, retains observations and unresolved issue history, and preserves all requested original exports. Invalid records preserve the task and prior delivery; no historic report is rewritten.
