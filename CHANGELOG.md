# Changelog

## Animated HTML inspection

- Fail offline HTML inspection when the delivered page attempts external network or local-file resources; preserve complete files and captured failure evidence without claiming quality coverage.
- Record actual captions and diagram text at compiled HTML samples, verify backward seeking restores the initial state and keep outer page text stable. Seek fractional boundaries upward by less than one microsecond to avoid selecting the preceding beat through range serialization.
- Give the editable HTML starter an author-adjustable minimum playback width and a keyboard-focusable horizontal reading area for narrow viewports.
- Compare a canonical public SVG visual-state signature during end-to-start backseek, including stable element attributes and computed visibility/style state.

## Unreleased

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

## 0.1.0 — independent repository preparation

- Copy the complete Flow Diagram installation unit into `skills/flow-diagram` from the recorded FlowSVG source snapshot.
- At the 0.1.0 preparation snapshot, add independent development dependencies and a pnpm lockfile while keeping that snapshot's installed runtime npm lockfile and `flowsvg@0.2.2` baseline unchanged.
- Verify external installation, read-only validation, JSON/HTML/SVG generation, finalization, and application dependency isolation without a browser.
- Migrate bilingual user guides, current CLI maintenance patterns, attributed pre-split history, glossary, and relevant architecture decisions. Add independent Agent/tracker documentation and retain the two guide/example regression suites at their new repository paths.
- Migrate all 27 Skill regression files and their maintained fixtures into `tests/`; declare `gifuct-js@2.1.2` directly for GIF decoding. Preserve existing behavior assertions and browser preconditions. Move the consumer harness as a required regression-test resource, with its default installation path updated.
- Configure independent CI for Ubuntu/macOS/Windows and Node 20/22, including complete browser regressions and the fail-closed external consumer gate with real Node 18 rejection. Expand triggers to tests, fixtures, guides, tools, configurations, locks, and workflows. Record local browser/consumer execution and limited actual visual inspection separately from unexecuted remote CI and the Windows graceful-cancellation limitation.

This version is prepared locally and has not been released. Local browser and consumer acceptance are recorded separately from configured CI and unexecuted platforms.
