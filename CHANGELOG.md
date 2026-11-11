# Changelog

## Unreleased

- Store reusable project preferences for design, expression and delivery in `.diagrams/preferences.md`, one Markdown item per line. Save only on clear authorization, including an explicit choice for future project tasks. Apply preferences to open choices without expanding a revision. The legacy JSON stays untouched and is no longer read. Agent guidance only; the CLI and SDK runtime are unchanged.

- Clarify Agent page self-check versus user design judgment, allow finalization of complete files with disclosed inspection gaps, make spatial hierarchy an adaptable design starting point, and remove repeated page rules from the main workflow. Guidance only; no CLI, report or runtime behavior changed.
- Consult relevant rendering failures during design in step 2, then revisit technical details during authoring. Treat remedies as candidates and record material judgments instead of per-entry or per-edge logs. Document the observed shared-path failure and align maintenance guidance and bilingual guides. Guidance only; no CLI, report or runtime behavior changed.
- Choose connection endpoints by relationship meaning and routes by rendered clarity. Allow clear diagonal paths, describe group/component/mixed endpoints, and inspect ambiguous shared paths without prescribing a universal line style.

## Animated HTML inspection

- Fail offline HTML inspection when the delivered page attempts external network or local-file resources; preserve complete files and captured failure evidence without claiming quality coverage.
- Record actual captions and diagram text at compiled HTML samples, verify backward seeking restores the initial state and keep outer page text stable. Seek fractional boundaries upward by less than one microsecond to avoid selecting the preceding beat through range serialization.
- Give the editable HTML starter an author-adjustable minimum playback width and a keyboard-focusable horizontal reading area for narrow viewports.
- Compare a canonical public SVG visual-state signature during end-to-start backseek, including stable element attributes and computed visibility/style state.

## 0.1.0 — initial independent release

- Align the complete rendering-gotcha checklist across the Skill, installed references and `PATTERNS.md`; structure preset-label risks as a matchable entry and remove the remaining broad HTML-prose wording from export guidance. Complete the bilingual guide summaries so they name the managed player. Documentation guidance only; no CLI, check or report behavior changed.
- Add a human page completion checklist, align outer-page and narrow-screen inspection with it, and define semantic wrappers, accessibility attributes and inline/data-URL assets as allowed implementation structure while keeping external resources out. Record the page content contract in the glossary. Guidance and terminology only; no CLI or report behavior changed.
- Add a pre-geometry rendering gotcha for group endpoints and off-axis ports on cross-layer edges, and require `SKILL.md` step 3 to match every gotcha condition against the draft and record the chosen prevention in the task plan. Agent wording contract only; no CLI, check or report behavior changed.
- Make `references/delivery-contexts.md#keep-the-html-page-minimal` the single source of truth for Agent-authored HTML page content: a closed whitelist (heading, one-sentence introduction, functional reading hints, player), a do-not-put-on-page list, content destinations and a deletion test. Remove conflicting “supporting prose / supporting explanation” wording from `SKILL.md`, content placement, source fidelity, timeline, tool contract, visual checks, visual design, the starter, examples README, bilingual guides and both root READMEs. This is an Agent wording contract; no CLI, check or report behavior changed.
- Consolidate Chinese publishing guidance for GitHub distribution and WorkBuddy Skill assets in `docs/releasing.md`; keep platform registration outside this guide. No installed Skill files changed.
- Upgrade the exact SDK runtime to `flowsvg@0.3.1` with synchronized registry integrity and npm lock. Support this exact SDK version; retain historical report and review identities.
- Defer historical export completion/evidence adoption until validation establishes matching source, theme and SDK identities. A new SDK cannot claim old static files as completed exports; retain their requests for explicit re-export.
- Add a fictional mixed approval flow, preset-label authoring guidance and aligned bilingual instructions. Keep static layout separate from animated draft measurement.
- Measure `diamond`, `parallelogram`, `document` and `predefinedProcess` labels through public `measureNodeLabel`, retaining unresolved width diagnostics. Draft measurement includes preset label replacements and empty labels; static layout uses final planned widths and shape-safe height floors. Width overflow no longer reports a height-only remedy.

- Upgrade the exact runtime baseline to `flowsvg@0.2.3`, refresh its npm integrity lock and manifest, retain the tested compatibility range `>=0.2.2 <0.3.0`, and synchronize SDK identity checks and guidance. Recalibrate vertical-label fixtures for endpoint-column wrapping while preserving risk thresholds and update the dense-layout diagnostic expectation.

- Rename the public project to Flow Diagram (`yokingma/flow-diagram-skill`) and the installable Skill to `flow-diagram`. Move the installation unit to `skills/flow-diagram/`; synchronize host metadata, bilingual guides, repository tooling and regression paths. Preserve the CLI entry, runtime contracts and exact SDK baseline.

- Verify mixed Agent-page HTML and explicit SVG/PNG through copied-install regressions, including source-preserving exports, independent image evidence and partial PNG failure. Clarify standalone-image context and separate page/image viewing in installed references and bilingual guides.

- Preserve a selected saved parent’s registered Agent HTML page in new revisions, rejecting changed or missing parent HTML instead of rebuilding a default page. Add explicit `author --sync-html` for intended diagram/theme changes after validating the entire old managed region and playback hash. Reject old HTML review inputs for changed page bytes before allocating a version, with an additional actual-output hash guard.

- Accept Agent-composed HTML pages through `author --html`, preserving outer HTML/CSS around a managed iframe containing opaque public SDK output. Bind source/output identities and inspect the actual page and embedded player without changing the SDK baseline.

- Add Agent-managed project preference preflight before the five authoring steps, with explicit save/update/reset at `.diagrams/.preferences.json`, versioned descriptive fields and a follow-defaults marker. Preserve existing revision design and skip preference questions for pure exports, validation and diagnosis.
- Repair semantic-pattern branch pointers, expose optical-alignment and wrapping guidance across languages, and make the source/service recipe independent of PPT placement. Sync bilingual guides and record preference-operation trials separately from visual acceptance.

- Reuse available design preferences and delivery context before drafting; ask once for relevant gaps. After the user chooses defaults, use a Web static composition without changing default delivery formats.
- Add capability-inventory and source/service composition guidance, presentation content-area sizing, mixed-script alignment observations and persistent relationship-flow animation guidance.
- Add three neutral teaching recipes and copied-install regression coverage for content fit, finite layout checks and export completeness. Preserve the exact SDK baseline and keep automatic visual lint outside this change.

## Preparation before 0.1.0

- Copy the complete Flow Diagram installation unit into `skills/flow-diagram` from the recorded FlowSVG source snapshot.
- At the 0.1.0 preparation snapshot, add independent development dependencies and a pnpm lockfile while keeping that snapshot's installed runtime npm lockfile and `flowsvg@0.2.2` baseline unchanged.
- Verify external installation, read-only validation, JSON/HTML/SVG generation, finalization, and application dependency isolation without a browser.
- Migrate bilingual user guides, current CLI maintenance patterns, attributed pre-split history, glossary, and relevant architecture decisions. Add independent Agent/tracker documentation and retain the two guide/example regression suites at their new repository paths.
- Migrate all 27 Skill regression files and their maintained fixtures into `tests/`; declare `gifuct-js@2.1.2` directly for GIF decoding. Preserve existing behavior assertions and browser preconditions. Move the consumer harness as a required regression-test resource, with its default installation path updated.
- Configure independent CI for Ubuntu/macOS/Windows and Node 20/22, including complete browser regressions and the fail-closed external consumer gate with real Node 18 rejection. Expand triggers to tests, fixtures, guides, tools, configurations, locks, and workflows. Record local browser/consumer execution and limited actual visual inspection separately from unexecuted remote CI and the Windows graceful-cancellation limitation.

This preparation snapshot records the independent repository setup that preceded the 0.1.0 release. Local browser and consumer acceptance remain separate from configured CI and unexecuted platforms.
