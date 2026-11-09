# Diagnosis and revision decisions

Read this reference when importing existing JSON, selecting a historical parent, or handling any discovered issue. The tool saves evidence and never changes diagram geometry. The author explains the issue and asks the user when a correction, intentional exception or deferral changes meaning or exceeds the current authorization. Apply already authorized mechanical corrections to the working draft; use `author` when saving a corrected revision. This includes problems found in screenshots.

## Interpreting checks

`validate` reads input once and returns field/reference, compilation and finite layout diagnostics without saving a revision. `author` saves the exact bytes before applying the same checks. Errors stop completion; the caller retains a validation draft, while authoring retains its saved draft and report. A public frame-evaluation failure also stops delivery and marks layout failed; the tool preserves the SDK field reason and failing sample time. Only successful compilation reaches layout diagnosis. Layout warnings allow HTML delivery for user inspection. Explain each warning’s object, time, reason, impact and candidate treatments. Keep the original warning when the user accepts an intentional layout.

Reports may include `layout.warningGroups` to help an Agent navigate related warnings. Groups are keyed by code, primary object and related object IDs, while each record retains the original issue identity and sample time; use the flat diagnostic record for decisions.

The finite layout check uses public SDK `evaluateAt` frames and on-demand `diagnoseAt` results at zero, actual compiled beat boundaries, transition midpoint/completion, beat midpoint, end-left boundary when needed, and global completion. `report.layout.samples` lists the times and active focus. Eight warning codes are available:

| Code | Meaning | Limits |
| --- | --- | --- |
| `text-overflow` | SDK warning at its object and content/label field | Label overflow includes current height, required height and estimated line count; the estimate is not browser font pixels or formal SVG/PNG evidence |
| `node-overlap` | Visible sibling rectangles intersect and neither contains the other | Rectangular risk only; precise shapes and edge paths are not checked |
| `child-outside-parent` | A visible child exceeds its evaluated parent-group rectangle | Coordinates include ancestor movement |
| `canvas-clipping` | A visible node exceeds the full-view camera | Active focus and its camera transition intentionally crop other objects |
| `edge-node-overlap` | A painted edge path intersects an unrelated node | SDK shape contours and finite curve samples; endpoints and groups are excluded |
| `label-node-overlap` | Estimated visible label bounds intersect an unrelated node | Ordinary labels can extend outside their owner; structured text is clipped to safeArea and camera |
| `label-overlap` | Estimated visible label bounds intersect each other | Fields and text lines retain separate identities, including lines owned by the same object |
| `LABEL_VERTICAL_RUN` | A visible edge label contains an unrequested run of very short wrapped lines | Public line text and baseline estimates; not glyph widths, vertical-writing intent or continuous coverage |

The three SDK geometry checks exclude legal label ownership/ancestor containment, hidden/zero-opacity objects and fully transparent paint. Group titles can still obscure child nodes. The SDK checks actual node contours; the older `node-overlap` check remains rectangular. Normal ancestor containment and touching rectangles are excluded from that older check. Edge crossings are not automatically errors. Full-view clipping uses the evaluated camera, including `fitHeight`. Finite samples do not guarantee every instant in a continuous animation. The core uses deterministic text estimates rather than glyph pixels, and finite curve samples rather than a continuous curve guarantee. These checks require no browser. A passed layout check is separate from semantic or visual approval.

## Short edge-label runs

`LABEL_VERTICAL_RUN` recognizes the already wrapped public frame text; it does not measure text or reroute edges. Within one authored newline-delimited paragraph, a candidate needs at least four consecutive nonempty lines with at most two non-whitespace Unicode code points each, at least six code points total, and a positive public baseline span. Explicit newlines separate candidates, while extra soft wrapping inside an explicit paragraph remains eligible. These corpus-calibrated constants are conservative risk thresholds, not general layout requirements.

Each warning identifies the exact edge label field, current label summary, total `estimatedLineCount`, and `softWrappedRun` with zero-based `startLine`, `lineCount`, `charactersPerLine` and `baselineSpan` in diagram units. Public `labelBoxes` provide text baselines, not glyph width/height boxes. Short labels, reasonable wider multiline labels, hidden or zero-opacity edges and fully transparent evaluated label foregrounds are excluded. Zero path stroke width does not hide label text. The check considers painted labels in the sampled full frame, including off-camera labels; it does not certify viewport readability or detect every awkward line break.

The code uses the same source/SDK/theme/time-bound issue identity and concrete decision workflow below. Reserve more label space, adjust ports or paths, or use an unlabelled arrow with a clearly associated explanation. Shorten wording only within the existing authorization. Actual target-size viewing remains required, including when this warning is absent.

## Selecting a parent

Keep saved authoring invocations in the same temporary history root: `--output <task-workspace>/history`. These revisions remain immutable during the task; [finalization](tool-contract.md#finalize-the-task) removes them after publishing the final result unless history was explicitly requested. For a finalized diagram, first read its final report and retain its requested formats unless the user changes them. Import its `diagram.json` into a fresh workspace without a historical parent; for an Agent page, also select its delivered `diagram.html` as described in [page continuation](tool-contract.md#continue-an-existing-page).

Each `author` invocation creates a new revision. Failed authoring numbers remain reserved. Ordinary `validate --input <draft>` requires no name and writes no history. To check an existing saved version, use `validate --from v001 --name <name> --output <task-workspace>/history`; the tool verifies its canonical location and input hash. The selected source is recorded in `validation.sourceRevision`, while `revision` remains null. Validation does not infer a latest source or accept `--parent`, `--decisions` or `--sources`. Import an independent JSON with `--input` and no parent. To continue a saved task revision, name its parent in that task history; when the intended parent is unclear, ask before running a revision task. The tool cannot infer the semantic origin of an arbitrary copied draft.

```text
node <skill-directory>/scripts/flowsvg.mjs author --input <new-draft.json> --name orders --parent v001 --output "<task-workspace>/history"
node <skill-directory>/scripts/flowsvg.mjs author --from v001 --name orders --output "<task-workspace>/history"
```

`--from` reads the explicit parent under the selected `--output` root and `--name`, without `--input`. Both modes require the parent’s `diagram.json` and `report.json`. An Agent page is inherited from that parent after verifying its saved HTML hash, unless an explicit `--html` selects another page; intentional diagram/theme changes require `--sync-html`. A parent cannot be the newly allocated revision or a path outside that diagram. Historical JSON used as `--input` requires the matching parent. Save a changed draft separately and change only what the user authorized. Failed retries and extra exports also create new revisions.

The new report retains original issues and inherited decisions in `provenance.originalIssues` and `userDecisions`. `provenance.parent` records the parent directory, actual input hash, recorded input hash and whether external edits changed the parent JSON. The task snapshots the actual bytes without overwriting either the parent or original input. Parent sources remain in the new report. Current diagnostics describe the new snapshot; preserved original issues explain its history.

## Recording a user decision

Draft diagnostics from `validate` and `layout` have `sourceRevision: null`. They identify the consumed bytes and conditions, but cannot carry a formal decision. Save the draft with `author` first. After the user chooses, copy `sourceRevision` and `issueId` from the exact layout warning in that saved report. `intentional` records an intentional exception, `revise` records an authorized correction, and `defer` retains an unresolved issue. The tool records these choices; it does not apply corrections. Each new record accepts only four fields:

```json
[
  {"sourceRevision":"v001","issueId":"sha256-<copy the warning's 64 hex digits>","decision":"intentional","reason":"用户确认此条警告所指的布局是有意设计"}
]
```

Replace the example ID with the actual report ID. `code` and `objectId` describe an issue but cannot select one for a new decision. Submit each reference once. The source must be the explicit parent or an actual ancestor whose issue also exists in the parent's original issue history. The tool checks canonical revision/file paths, actual source bytes, source SDK version/integrity and the warning's complete identity against that source report. A sibling revision, forged flattened history, changed source/context or missing identity is rejected.

Each newly generated layout warning, including the four older checks, carries `warningKey`, `issueId`, `sourceRevision` and `issueContext`. SDK keys distinguish object roles, fields and text lines. The issue ID hashes source JSON bytes, SDK version and integrity, effective theme/reducedMotion, exact sample time and warningKey. The CLI records effective `reducedMotion: false`; it does not add a reduction switch. Repeated unchanged context yields the same ID; source whitespace, SDK integrity, theme, field or time changes produce a different identity. Same-key repeats at one sample are deduplicated; other fields and sample times remain separate.

An A–B exception does not decide A–C, another text line or another time. Inherited decisions retain their original source revision, identity and full context. A changed draft may record a `revise` decision for its original warning, but the decision does not authorize a new warning in the changed context. Original records without IDs remain unchanged; create a fresh authoring revision before making a new precise decision about them. The tool never fills in guessed historical IDs or accepts the old code/object form as a new submission.

```text
node <skill-directory>/scripts/flowsvg.mjs author --from v001 --name orders --decisions <decisions.json> --output "<task-workspace>/history"
node <skill-directory>/scripts/flowsvg.mjs author --input <authorized-fix.json> --parent v001 --name orders --decisions <decisions.json> --output "<task-workspace>/history"
```

Decisions require an explicit parent and are saved in the new revision. A decision alone never removes original warnings or marks quality approved. New decision files select identified layout warnings; other authorizations remain part of the source and task record. Report what changed, what was retained and which checks actually ran.

## Independent review identity

HTML, preview and formal-image observations use [independent review records](review-inputs.md#submit-filled-html-and-preview-forms). A `review-<sha256>` ID identifies an append-only attestation; `sourceRevision` identifies the actual saved `v###` diagram subject. A formal-image material retains its separate hash-bound evidence-source locator; each evidence entry also identifies the original artifact version. Review records never become design revisions or valid `--from` values. Source selection remains explicit and canonical. Repeated semantic input reuses the record after revalidation, while different observations append without erasing issues.

Review aggregation follows only the selected real ancestry with identical input/theme/SDK. HTML coverage also requires the exact delivered file, matching display, and selected point IDs and times. Repeated attestations count once and retain their original identities. Finalization revalidates hashes, records considered/adopted IDs, and preserves unresolved history. An invalid record fails closed and leaves the task and prior delivery available for recovery. User warning decisions retain their separate verified `sourceRevision + issueId` contract.

## Independent evidence operations

Use `evidence` for existing formal images. Operation records append under `records/evidence/evidence-<uuid>/`; they never reserve `v###`. Existing source files and valid evidence remain unchanged. Repeated valid requests perform identity checks with no runtime, browser or writes. Complete requested display conditions persist independently of review submission; finalization loads them before quality calculation. See [artifact evidence](artifact-evidence.md).
