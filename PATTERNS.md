# Implementation patterns

## Installation unit and repository tools

`skills/flow-diagram/` is the complete distributable Skill. Installed instructions, references, examples, metadata, scripts, and runtime resources resolve within that directory. Repository-level development tests, acceptance tools, and human guides belong outside the installation unit.

The public repository is `yokingma/flow-diagram-skill`; the installed Skill name and directory are `flow-diagram`, displayed as Flow Diagram. FlowSVG remains the SDK dependency. The `scripts/flowsvg.mjs` helper and existing runtime/cache identities retain their names independently of the Skill's public identity.

The detailed [CLI patterns](docs/development/flow-diagram-patterns.md) remain the implementation reference for runtime preparation, deterministic layout, diagnostics, review identity, and quality projection. The [maintenance guide](docs/development/flow-diagram-maintenance.md) defines verification and documentation ownership. New release entries belong in root `CHANGELOG.md`.

Guide regression tests belong in `tests/` with the complete suite. When relocating existing tests, change only resource locations and imports required by the final structure, retain every behavioral assertion, and keep the source snapshot traceable. Cross-repository documentation cites an explicit source commit; execution never depends on those online references.

## Regression resource ownership

Skill test files live in `tests/`. Copy installed resources from `skills/flow-diagram`; direct geometry/plan imports use that same installation directory. Own historical label-risk JSON, artifact-pixel fixtures and legacy teaching regressions in `tests/fixtures/`, with source attribution and no dependency on an old `.scratch/` tree. GIF tests import the repository's direct `gifuct-js` development dependency rather than the SDK package's dependencies or types. The repository consumer harness belongs in `scripts/`; its fail-closed prerequisite test is part of the full regression entry.

Run regressions from an independent repository copy with only its own installed development dependencies. Preserve browser-dependent test discovery and preconditions. A no-browser run must report the skipped browser cases; it does not satisfy the complete consumer/browser gate.

Required installed helpers belong in `skills/flow-diagram/resources/`; the HTML starter, independent measurement input and selected teaching-source records remain self-contained. Keep only selected complete diagrams and concise notes in installed `examples/`. Development API exercises belong in repository `examples/development/`; historical inputs already owned by fixtures have no second maintained copy. Keep the high-density layout exercise in `tests/fixtures/layout-assistance/`, and use the complete inline input/plan in the installed layout reference for standalone execution. Legacy teaching fixtures retain source bytes and historical metadata scopes so library redesign cannot silently weaken existing behavior assertions.

## Runtime isolation

The installed CLI prepares the exact public SDK baseline in an isolated cache. `runtime/package-lock.json` and `runtime/manifest.json` record the runtime dependency identity. The repository's `pnpm-lock.yaml` only controls development tools. Neither workflow may resolve the SDK from a workspace or a sibling checkout. SDK baseline upgrades synchronize the runtime package, npm lock, manifest version/integrity, current guidance and report identity assertions. Recalibrate wrapping fixtures against public SDK frames while retaining positive, negative and threshold cases; historical viewing records keep their original SDK identity.

## Diagnostic responsibility

CLI failures describe invalid input, unsupported operations, SDK execution, file operations or artifact identity. `--geometry` on author/validate/layout adds finite informational computations with method, source, participants, time and limits; `computed` is an execution fact. Content-size estimates remain auxiliary during measurement and layout, including height application. Keep design judgment in actual viewing and design guidance, without heuristic readability thresholds or warning-approval submissions.

## Command results

`command-result.mjs` projects saved authoring results at stdout serialization. Return status, input/SDK identity, artifacts, actionable diagnostics and check summaries with a readable `detailsPath`; keep full state signatures, samples and rendering details in the registered report. Read-only operations retain their necessary inline result and create no detail file. A missing report never supplies a pretend path; failure diagnostics remain inline. Review records own observations, while derived review operation facts stay inline without copying captured HTML states. Consumers load the authoring report through the returned pointer instead of expecting stdout to equal the complete report.

## Completion and evidence

Default authoring stages one mutable `current` result and replaces it under an operation reservation. Stale-owner recovery elects one recoverer before reading the owner; an interrupted recovery reservation fails closed with its exact manual-recovery locator. Every current file binds its bytes, input, theme and exact SDK identity; publication reads that selected result without ancestry. Preserve the last complete result in one recovery directory after a failed replacement. Immutable `v###` allocation requires explicit checkpoint retention or a formal review request. Formal authoring fixes one source for review; later ordinary iterations reuse current. Template requests are separate hash-bound records under `records/formal-requests`, while terminal evidence records retain capture intent. Finalization projects these requests without changing immutable reports; declared coverage and unresolved viewer observations remain separate facts. Finalization treats optional Agent notes as opaque Markdown and reads them before publication and cleanup.

Report file completion, machine execution and actual viewing separately. Default authoring captures distinct actual HTML times with initial/final priority; SDK state previews require `--preview` and retain their separate focus-free overview. `formal-review.mjs` owns explicit intent: ordinary reports omit unified quality and formal viewing coverage, while `--formal-review` or submitted observations request registered coverage. Geometry calculations never gate that coverage. Complete files can be delivered with disclosed capture or viewing gaps. Finalization removes only the selected task workspace.

## Teaching recipes and visual guidance

The repository gallery reads sources from their owning directories and keeps generated files outside the installation unit. Track the generator and template; keep one disposable output tree. Publish the index after every included source renders successfully. The [workshop guide](examples/README.md#preview-the-example-library) owns gallery usage and coverage.

Repository `examples/` holds teaching candidates and local current previews; selected examples use their installed source as the single publication source. [Teaching-example maintenance](docs/development/flow-diagram-maintenance.md#teaching-example-maintenance) owns viewing, user selection and publication-source rules; installation guidance stays self-contained.

Keep reader-question selection, preference/context resolution, design methods and rendering gotchas in installed references, with explicit entry points from `SKILL.md`. The five-stage entrance routes common document/design guidance for new or revised drafts, then discloses semantic, rendering, layout, animation and export references on their branches. Design choices live in the draft; substantive findings live in one temporary `issues.md`. Actual viewing and revision serve quality; standards are guidance rather than compliance gates. Selected teaching examples have adjacent explanations of their question, fictional facts, composition, display conditions and limits; `resources/teaching-sources.json` scopes their factual metadata. Fixed geometry is a starting point for that content, not a general visual threshold. Retain API/geometry guidance when changing example pointers; the library is selected by the user rather than a design scoring gate. Exercise new recipes through the copied installed CLI. Record actual viewing independently from synthetic test assertions and programmatic browser checks. Static composition and requested export formats remain separate choices.

Design guidance supplies goals, judgment criteria and candidate methods. When a failure is observed, document its conditions, concrete behavior and visible consequences in the installed gotchas; distinguish observed facts from suspected causes. Retain treatments as candidates until evidence across relevant scenarios supports a general rule. A successful correction or rerun alone does not establish a universal route, endpoint or layout preference. Keep case evidence and investigation history in ignored task records under the [documentation scope](docs/README.md#documentation-scope).

## Project preferences

`references/preferences.md` owns the installed Agent file contract and lifecycle. Use saved defaults for open choices before authoring or for an export with an unresolved option. Retain design and delivery decisions outside the revision scope. The Agent manages one Markdown record outside task cleanup; writes require a clear request or an explicit choice for future tasks in the project. The CLI does not manage the record. Verify guidance with isolated Agent scenarios and actual file operations; wording assertions do not establish workflow behavior.

## Acceptance and CI

Consumer scenarios select current drafts, explicit checkpoints and formal review independently. Parallel runtime preparation uses separate diagram tasks; checkpoint source protection and mutable retry replacement have distinct assertions. Optional geometry reports computational facts, while actual HTML sampling remains the default capture path.

Run the complete regression suite against a prepared browser, then exercise the copied installed CLI through the independent consumer harness with a real unsupported Node 18 executable. A missing prerequisite, failed contract, or required `not-run` check must retain a nonzero/incomplete gate; no platform fallback converts it to success. Windows graceful console cancellation needs an actual Ctrl+C runner and remains unverified by the existing harness.

CI triggers include installation resources, tests/fixtures, guides, tools, the example workshop/template, root configurations/locks, and workflows. Every configured OS/runtime job installs the frozen development lock and runs both gates; upload factual JSON evidence after failures. CI configuration, actual execution, programmatic browser checks, and viewed images are distinct evidence. Keep synthetic test attestations labeled; record actual viewing separately with exact saved-file/state identity.

## Editable HTML pages

Offline HTML inspection observes resource requests from the complete page and embedded player. External network or local-file requests fail the inspection even when the offline browser blocks them; complete delivery files remain available with an explicit failed check; requested formal coverage stays incomplete.

Record visible captions and SVG text with each sampled page state. Exercise backward reconstruction through the visible progress control and verify the original diagram/caption and outer static text. Fractional compiled boundaries must not serialize just before a beat: round the requested range time upward by less than one microsecond and retain actual progress. Bound that rounding by the next compiled beat; an unrepresentable in-beat time fails instead of skipping a short beat. Final time remains clamped by the progress control maximum. Starter page CSS may retain a chosen diagram reading width inside a focusable horizontal scroller; it does not modify SDK layout or its opaque HTML.

Backseek validation also compares a canonical public SVG signature: stable element tags/IDs, selected geometry/style attributes and computed visibility/display/opacity, sorted to ignore irrelevant DOM order. Keep text/caption checks alongside this signature; neither alone represents the full rendered state.

`html-page.mjs` owns the Skill-managed playback region and page source/output identities. Preserve Agent-authored outer HTML/CSS, embed the complete public SDK HTML as opaque iframe content, and reject malformed or mismatched managed regions. Read page inputs once before revision allocation. Page delivery remains one HTML, diagram JSON and reports; no separate page source is required.

## Page content wording contract

Page content scope is an Agent authoring decision, not a CLI check. `references/delivery-contexts.md#keep-the-html-page-minimal` is its single source of truth: it owns the closed whitelist of allowed blocks, the excluded-content destinations, the deletion test and the human completion checklist. Before authoring, the Agent must convert the reader's question into one title and one sentence, add only operation instructions the reader needs, then place the managed player. Installed references, the starter and the bilingual guides link there; they do not extend the allowed blocks or grant exceptions, and short summaries at entry points must match that contract.

When editing this guidance, sweep the whole repository for wording that silently re-authorizes page chapters (`supporting prose`, `supporting explanation`, `global notes`, `补充说明`, `正文`), including bilingual guides, both root READMEs and the starter comment. Keep the English and Chinese guides aligned on the allowed blocks and reading order. This contract governs wording only: do not add page-text length, heading-count or section-count validation to `html-page.mjs`, `validate`, inspection or reports.

## Page-preserving revisions

Authoring inherits a selected parent's Agent page when no explicit HTML is supplied. Verify the parent's registered full-file identity before reuse; edited pages enter through `--html`. `--sync-html` permits an intentional diagram/theme update only after canonical managed-region and embedded playback-hash validation; SDK identity remains exact. The new report records both previous input/playback hashes. A regenerated current result recomposes and inspects its own saved HTML without inheriting prior actual-viewing coverage. Author-side HTML review preflight compares the selected page snapshot to the reviewed file; review recording also verifies the newly delivered bytes before adopting prior observations.

## Mixed HTML and image acceptance

Exercise combined `--html` and explicit image requests through the copied installed CLI and actual saved outputs. Page prose stays outside static exports; test source bytes, image identities and independent evidence rather than treating HTML screenshots as image coverage. Preserve successful formats on partial failure and leave default delivery image-free. Context allocation belongs in `references/delivery-contexts.md`; export mechanics and evidence each link there.

## FlowSVG 0.3.1 baseline

The exact registry runtime is `flowsvg@0.3.1`. Keep package, manifest and npm lock identity synchronized; support declarations do not select installations. Historical reports, managed HTML and viewing evidence keep their original SDK identity. Adopt historical export completion only after validation confirms matching source, theme and actual SDK identity; a changed baseline requires fresh exports. Verify upgrades through a copied installation and the public package.

## Measurement source locations

Preserve public SDK measurement diagnostic fields and add original-input `sourcePath` separately. `measurement-sources.mjs` owns initial/replacement version order and source paths; draft node IDs stay in `objectId` rather than being interpolated into JSON paths. Draft measurement keeps its all-or-nothing result. Explicit copy backfill remains exclusive. `editable-draft.mjs` restricts `--in-place` to a canonical task-root source, reserves the author/finalize task series, checks file identity and bytes, then atomically replaces one complete file. Failed writes and cancellation preserve the source. Current reports retain the editable-source path and consumed SHA-256 across `--from current` captures; explicit input selection replaces that binding. Finalization verifies that task source before publication or cleanup, including after in-place edits. Width and fixed graph-block height suggestions derive from structured dimensions and block kinds, never message matching or guessed repair sizes. SDK estimates and actual image inspection remain separate evidence.

## Optional measurement text records

`measurement-lines.mjs` projects public SDK content and label frames into `estimatedLines` only when `measure --lines` is explicit. Reuse `measurement-sources.mjs` for existing version scope and original-input paths. Keep public record order and role/item/tag selectors; exclude graph-block labels only from the new list, preserving all public SDK baseline positions in the existing counts. Store the list once per measurement result, outside per-version detail. Draft failures publish no partial measurement or line results; backfill JSON contains authored fields only.

## Current export requests

`export-request.mjs` snapshots export selection, requested capture scope and exact request-file bytes before runtime work. Current continuation inherits omitted settings, then regenerates requested files in the operation staging directory. Completion contains only this run’s successful outputs. Single-frame selection replaces a saved batch; a saved batch keeps its exact source/SDK binding and fails explicitly after identity changes. Browser selection is per invocation. Failed current replacement retains bounded recovery and leaves the complete published delivery intact.
