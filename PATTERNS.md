# Implementation patterns

## Installation unit and repository tools

`skills/flow-diagram/` is the complete distributable Skill. Installed instructions, references, examples, metadata, scripts, and runtime resources resolve within that directory. Repository-level development tests, acceptance tools, and human guides belong outside the installation unit.

The public repository is `yokingma/flow-diagram-skill`; the installed Skill name and directory are `flow-diagram`, displayed as Flow Diagram. FlowSVG remains the SDK dependency. The `scripts/flowsvg.mjs` helper and existing runtime/cache identities retain their names independently of the Skill's public identity.

The detailed [CLI patterns](docs/development/flow-diagram-patterns.md) remain the implementation reference for runtime preparation, deterministic layout, diagnostics, review identity, and quality projection. The [maintenance guide](docs/development/flow-diagram-maintenance.md) defines verification and documentation ownership. New release entries belong in root `CHANGELOG.md`.

Guide regression tests belong in `tests/` with the complete suite. When relocating existing tests, change only resource locations and imports required by the final structure, retain every behavioral assertion, and keep the source snapshot traceable. Cross-repository documentation cites an explicit source commit; execution never depends on those online references.

## Regression resource ownership

Skill test files live in `tests/`. Copy installed resources from `skills/flow-diagram`; direct geometry/plan imports use that same installation directory. Own historical label-risk JSON and artifact-pixel fixtures in `tests/fixtures/`, with source attribution and no dependency on an old `.scratch/` tree. GIF tests import the repository's direct `gifuct-js` development dependency rather than the SDK package's dependencies or types. The repository consumer harness belongs in `scripts/`; its fail-closed prerequisite test is part of the full regression entry.

Run regressions from an independent repository copy with only its own installed development dependencies. Preserve browser-dependent test discovery and preconditions. A no-browser run must report the skipped browser cases; it does not satisfy the complete consumer/browser gate.

## Runtime isolation

The installed CLI prepares the exact public SDK baseline in an isolated cache. `runtime/package-lock.json` and `runtime/manifest.json` record the runtime dependency identity. The repository's `pnpm-lock.yaml` only controls development tools. Neither workflow may resolve the SDK from a workspace or a sibling checkout. SDK baseline upgrades synchronize the runtime package, npm lock, manifest version/integrity, current guidance and report identity assertions. Recalibrate wrapping fixtures against public SDK frames while retaining positive, negative and threshold cases; historical viewing records keep their original SDK identity.

## Completion and evidence

Report file delivery and inspection coverage separately. A no-browser run can complete JSON, offline HTML, and SVG delivery while quality coverage stays incomplete. Finalization removes only the selected task workspace. Browser capture and actual visual review require their own evidence.

## Teaching recipes and visual guidance

Keep reader-question selection, preference/context resolution, design methods and rendering gotchas in installed references, with explicit entry points from `SKILL.md`. Step 2 consults relevant failure conditions before choosing the structure and visual direction; step 3 revisits technical details as the draft develops. Record material design judgments rather than requiring an entry-by-entry prevention log. Teaching recipes record invented facts and checked display conditions; fixed geometry is a starting point for that content, not a general visual threshold. Exercise new recipes through the copied installed CLI. Record actual viewing independently from synthetic test assertions and programmatic browser checks. Static composition and requested export formats remain separate choices.

Design guidance supplies goals, judgment criteria and candidate methods. When a failure is observed, document its conditions, concrete behavior and visible consequences in the installed gotchas; distinguish observed facts from suspected causes. Retain treatments as candidates until evidence across relevant scenarios supports a general rule. A successful correction or rerun alone does not establish a universal route, endpoint or layout preference. Keep case evidence and investigation history in ignored task records under the [documentation scope](docs/README.md#documentation-scope).

## Project preference preflight

`references/preferences.md` owns the installed Agent file contract and lifecycle. Resolve preferences before authoring, retain existing revision design, and keep task context separate. The CLI does not manage this configuration. Verify guidance with isolated Agent scenarios and actual file operations; wording assertions do not establish workflow behavior. Project preference files sit outside task cleanup scope and are written only for an explicit persistence request.

## Acceptance and CI

Run the complete regression suite against a prepared browser, then exercise the copied installed CLI through the independent consumer harness with a real unsupported Node 18 executable. A missing prerequisite, failed contract, or required `not-run` check must retain a nonzero/incomplete gate; no platform fallback converts it to success. Windows graceful console cancellation needs an actual Ctrl+C runner and remains unverified by the existing harness.

CI triggers include installation resources, tests/fixtures, guides, tools, root configurations/locks, and workflows. Every configured OS/runtime job installs the frozen development lock and runs both gates; upload factual JSON evidence after failures. CI configuration, actual execution, programmatic browser checks, and viewed images are distinct evidence. Keep synthetic test attestations labeled; record actual viewing separately with exact saved-file/state identity.

## Editable HTML pages

Offline HTML inspection observes resource requests from the complete page and embedded player. External network or local-file requests fail the inspection even when the offline browser blocks them; complete delivery files remain available and quality stays incomplete.

Record visible captions and SVG text with each sampled page state. Exercise backward reconstruction through the visible progress control and verify the original diagram/caption and outer static text. Fractional compiled boundaries must not serialize just before a beat: round the requested range time upward by less than one microsecond and retain actual progress. Bound that rounding by the next compiled beat; an unrepresentable in-beat time fails instead of skipping a short beat. Final time remains clamped by the progress control maximum. Starter page CSS may retain a chosen diagram reading width inside a focusable horizontal scroller; it does not modify SDK layout or its opaque HTML.

Backseek validation also compares a canonical public SVG signature: stable element tags/IDs, selected geometry/style attributes and computed visibility/display/opacity, sorted to ignore irrelevant DOM order. Keep text/caption checks alongside this signature; neither alone represents the full rendered state.

`html-page.mjs` owns the Skill-managed playback region and page source/output identities. Preserve Agent-authored outer HTML/CSS, embed the complete public SDK HTML as opaque iframe content, and reject malformed or mismatched managed regions. Read page inputs once before revision allocation. Page delivery remains one HTML, diagram JSON and reports; no separate page source is required.

## Page content wording contract

Page content scope is an Agent authoring decision, not a CLI check. `references/delivery-contexts.md#keep-the-html-page-minimal` is its single source of truth: it owns the closed whitelist of allowed blocks, the excluded-content destinations, the deletion test and the human completion checklist. Before authoring, the Agent must convert the reader's question into one title and one sentence, add only operation instructions the reader needs, then place the managed player. Installed references, the starter and the bilingual guides link there; they do not extend the allowed blocks or grant exceptions, and short summaries at entry points must match that contract.

When editing this guidance, sweep the whole repository for wording that silently re-authorizes page chapters (`supporting prose`, `supporting explanation`, `global notes`, `补充说明`, `正文`), including bilingual guides, both root READMEs and the starter comment. Keep the English and Chinese guides aligned on the allowed blocks and reading order. This contract governs wording only: do not add page-text length, heading-count or section-count validation to `html-page.mjs`, `validate`, inspection or reports.

## Page-preserving revisions

Authoring inherits a selected parent's Agent page when no explicit HTML is supplied. Verify the parent's registered full-file identity before reuse; edited pages enter through `--html`. `--sync-html` permits an intentional diagram/theme update only after canonical managed-region and embedded playback-hash validation; SDK identity remains exact. The new report records both previous input/playback hashes. A new revision recomposes and inspects its own saved HTML without inheriting prior actual-viewing coverage. Author-side HTML review preflight compares the selected page snapshot to the reviewed file; review recording also verifies the newly delivered bytes before adopting prior observations.

## Mixed HTML and image acceptance

Exercise combined `--html` and explicit image requests through the copied installed CLI and actual saved outputs. Page prose stays outside static exports; test source bytes, image identities and independent evidence rather than treating HTML screenshots as image coverage. Preserve successful formats on partial failure and leave default delivery image-free. Context allocation belongs in `references/delivery-contexts.md`; export mechanics and evidence each link there.

## FlowSVG 0.3.1 baseline

The exact registry runtime is `flowsvg@0.3.1`. Keep package, manifest and npm lock identity synchronized; support declarations do not select installations. Historical reports, managed HTML and viewing evidence keep their original SDK identity. Adopt historical export completion only after validation confirms matching source, theme and actual SDK identity; a changed baseline requires fresh exports. Verify upgrades through a copied installation and the public package.
