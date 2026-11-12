# Diagnosis and revision decisions

Read this reference when importing existing JSON, selecting a historical parent, or handling any discovered issue. The tool saves evidence and never changes diagram geometry. The author explains the issue and asks the user when a correction, intentional exception or deferral changes meaning or exceeds the current authorization. Apply already authorized mechanical corrections to the working draft; use `author` when regenerating current outputs. This includes problems found in screenshots.

## Interpreting checks

`validate` reads input once and checks JSON fields, references and SDK compilation without saving a revision. `author` checks the exact input bytes used for generation. Invalid inputs and actual compilation, execution or file-operation failures remain errors, with the affected field or operation identified.

Add `--geometry` to `validate`, `author` or `layout` when finite geometry calculations help with a specific question. The default leaves `checks.layout` as `not-run`. A completed calculation records `computed`; this describes execution, not a design verdict. SDK frame evaluation or diagnostic calls that fail return an error and their sample time.

Geometry observations have severity `info`, a method, participants, locations and sample time. They report computed relationships rather than visual defects:

| Code | Computation | Limits |
| --- | --- | --- |
| `text-overflow` | SDK text-layout estimate exceeds the authored area | Labels can include estimated height and line count; these are not browser glyph measurements |
| `node-overlap` | Visible sibling frame rectangles intersect without containment | Rectangle relationship, not actual shape obstruction |
| `child-outside-parent` | A child frame rectangle exceeds its parent rectangle | Uses evaluated coordinates including ancestor movement |
| `canvas-clipping` | A node frame rectangle exceeds the full-view camera rectangle | Active focus and transitions intentionally crop other objects |
| `edge-node-overlap` | SDK path samples intersect an unrelated node contour | Finite curve samples; endpoints and groups are excluded |
| `label-node-overlap` | SDK estimated label bounds intersect an unrelated node | Text uses SDK estimates, not browser glyph pixels |
| `label-overlap` | SDK estimated label bounds intersect each other | Individual fields and lines retain their identities |

The calculation samples zero, compiled beat boundaries, transition midpoint/completion, beat midpoint, end-left boundaries when needed, and completion. `layout.samples` records actual times and focus. Coverage is finite, and computations require no browser. Source-bound IDs distinguish inputs, SDK, theme, fields and times for traceability; they do not require an approval or exception record.

Content measurement also returns auxiliary estimates, including width or fixed graph-block overflow. These results retain SDK fields and original-input locations and allow height application and layout to continue. Invalid input, unsupported animated size changes, failed SDK calls and failed writes still stop their operation. See [measurement results](tool-contract.md#locate-sdk-measurement-diagnostics).

Design guidance helps the user or LLM judge the actual image: reading order, hierarchy, connections, obstruction, readability and narrative. Short-line and vertical-label heuristics are not CLI diagnoses. Record material design questions in the task's temporary problem record and revise the working draft; neither an empty diagnostic list nor `computed` establishes design approval.

## Selecting a parent

Keep the editable source draft at the [task-workspace root](tool-contract.md#task-workspace), with generated files under `--output <task-workspace>/history`. Default `author` replaces `<history>/<name>/current`; validation writes no history. Continue current output with `author --from current` or edit the same source and regenerate with `--input`.

For a finalized diagram, read the final report to retain requested formats, then import `diagram.json` into a fresh task workspace without a historical parent. Select its delivered HTML under [page continuation](tool-contract.md#continue-an-existing-page) when preserving an Agent page.

Only requested history/comparison/rollback adds `--checkpoint`. Explicit `--formal-review` also fixes one immutable `v###`; use the returned stable ID for formal evidence and review. `--from v001` selects that retained source; output still becomes current unless a new checkpoint or formal source is requested. Retained snapshot numbers remain reserved after failure.

```text
node <skill-directory>/scripts/flowsvg.mjs author --from current --name orders --output "<task-workspace>/history"
node <skill-directory>/scripts/flowsvg.mjs author --input <task-workspace>/draft.json --name orders --output "<task-workspace>/history" --checkpoint
```

`--from` reads the explicit source under the selected output root and name without `--input`. An inherited Agent page is verified by its saved HTML hash; `--html` selects an edited page. Intentional diagram/theme changes use `--sync-html`. Retained sources remain unchanged; generated current is mutable and does not inherit previous viewing claims. Read-only `validate --from <current-or-checkpoint> --name <name> --output <history>` verifies canonical source identity and returns `validation.sourceRevision` with `revision: null`.

Source provenance can retain original issues and user choices as historical data. It cannot authorize new changes or establish acceptance. Current diagnostics describe current input and execution.

## Design choices

Keep actual user choices and unresolved design questions in the task's temporary problem record. Geometry and measurement estimates do not require a formal decision, and the CLI has no warning-approval submission operation. Historical provenance remains source data; it cannot authorize a new design or establish acceptance.

## Independent review identity

HTML, preview and formal-image observations use [independent review records](review-inputs.md#submit-filled-html-and-preview-forms). A `review-<sha256>` ID identifies an append-only attestation; `sourceRevision` identifies the actual saved `v###` diagram subject. A formal-image material retains its separate hash-bound evidence-source locator; each evidence entry also identifies the original artifact version. Review records never become design revisions or valid `--from` values. Source selection remains explicit and canonical. Repeated semantic input reuses the record after revalidation, while different observations append without erasing issues.

Review aggregation follows only the selected real ancestry with identical input/theme/SDK. HTML coverage also requires the exact delivered file, matching display, and selected point IDs and times. Repeated attestations count once and retain their original identities. Finalization revalidates hashes, records considered/adopted IDs, and preserves unresolved history. An invalid record fails closed and leaves the task and prior delivery available for recovery.

## Independent evidence operations

Use `evidence` for existing formal images. Operation records append under `records/evidence/evidence-<uuid>/`; they never reserve `v###`. Existing source files and valid evidence remain unchanged. Repeated valid requests perform identity checks with no runtime, browser or writes. Complete requested display conditions persist independently of review submission; finalization loads them before quality calculation. See [artifact evidence](artifact-evidence.md).
