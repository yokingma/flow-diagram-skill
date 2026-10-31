# Changelog

## 0.1.0 — independent repository preparation

- Copy the complete Flow SVG Diagram installation unit into `skills/flow-svg-diagram` from the recorded FlowSVG source snapshot.
- Add independent development dependencies and a pnpm lockfile. Keep the installed runtime's npm lockfile and `flowsvg@0.2.2` baseline unchanged.
- Verify external installation, read-only validation, JSON/HTML/SVG generation, finalization, and application dependency isolation without a browser.
- Migrate bilingual user guides, current CLI maintenance patterns, attributed pre-split history, glossary, and relevant architecture decisions. Add independent Agent/tracker documentation and retain the two guide/example regression suites at their new repository paths.
- Migrate all 27 Skill regression files and their maintained fixtures into `tests/`; declare `gifuct-js@2.1.2` directly for GIF decoding. Preserve existing behavior assertions and browser preconditions. Move the consumer harness as a required regression-test resource, with its default installation path updated.
- Configure independent CI for Ubuntu/macOS/Windows and Node 20/22, including complete browser regressions and the fail-closed external consumer gate with real Node 18 rejection. Expand triggers to tests, fixtures, guides, tools, configurations, locks, and workflows. Record local browser/consumer execution and limited actual visual inspection separately from unexecuted remote CI and the Windows graceful-cancellation limitation.

This version is prepared locally and has not been released. Local browser and consumer acceptance are recorded separately from configured CI and unexecuted platforms.
