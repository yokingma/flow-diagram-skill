# Changelog

## Unreleased

- Verify mixed Agent-page HTML and explicit SVG/PNG through copied-install regressions, including source-preserving exports, independent image evidence and partial PNG failure. Clarify standalone-image context and separate page/image viewing in installed references and bilingual guides.

- Preserve a selected saved parent’s registered Agent HTML page in new revisions, rejecting changed or missing parent HTML instead of rebuilding a default page. Add explicit `author --sync-html` for intended diagram/theme changes after validating the entire old managed region and playback hash. Reject old HTML review inputs for changed page bytes before allocating a version, with an additional actual-output hash guard.

- Accept Agent-composed HTML pages through `author --html`, preserving outer HTML/CSS around a managed iframe containing opaque public SDK output. Bind source/output identities and inspect the actual page and embedded player without changing the SDK baseline.

- Add Agent-managed project preference preflight before the five authoring steps, with explicit save/update/reset at `.diagrams/.preferences.json`, versioned descriptive fields and a follow-defaults marker. Preserve existing revision design and skip preference questions for pure exports, validation and diagnosis.
- Repair semantic-pattern branch pointers, expose optical-alignment and wrapping guidance across languages, and make the source/service recipe independent of PPT placement. Sync bilingual guides and record preference-operation trials separately from visual acceptance.

- Reuse available design preferences and delivery context before drafting; ask once for relevant gaps. After the user chooses defaults, use a Web static composition without changing default delivery formats.
- Add capability-inventory and source/service composition guidance, presentation content-area sizing, mixed-script alignment observations and persistent relationship-flow animation guidance.
- Add three neutral teaching recipes and copied-install regression coverage for content fit, finite layout checks and export completeness. Preserve the exact SDK baseline and keep automatic visual lint outside this change.

## 0.1.0 — independent repository preparation

- Copy the complete Flow SVG Diagram installation unit into `skills/flow-svg-diagram` from the recorded FlowSVG source snapshot.
- Add independent development dependencies and a pnpm lockfile. Keep the installed runtime's npm lockfile and `flowsvg@0.2.2` baseline unchanged.
- Verify external installation, read-only validation, JSON/HTML/SVG generation, finalization, and application dependency isolation without a browser.
- Migrate bilingual user guides, current CLI maintenance patterns, attributed pre-split history, glossary, and relevant architecture decisions. Add independent Agent/tracker documentation and retain the two guide/example regression suites at their new repository paths.
- Migrate all 27 Skill regression files and their maintained fixtures into `tests/`; declare `gifuct-js@2.1.2` directly for GIF decoding. Preserve existing behavior assertions and browser preconditions. Move the consumer harness as a required regression-test resource, with its default installation path updated.
- Configure independent CI for Ubuntu/macOS/Windows and Node 20/22, including complete browser regressions and the fail-closed external consumer gate with real Node 18 rejection. Expand triggers to tests, fixtures, guides, tools, configurations, locks, and workflows. Record local browser/consumer execution and limited actual visual inspection separately from unexecuted remote CI and the Windows graceful-cancellation limitation.

This version is prepared locally and has not been released. Local browser and consumer acceptance are recorded separately from configured CI and unexecuted platforms.
