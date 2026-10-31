# Implementation patterns

## Installation unit and repository tools

`skills/flow-svg-diagram/` is the complete distributable Skill. Installed instructions, references, examples, metadata, scripts, and runtime resources resolve within that directory. Repository-level development tests, acceptance tools, and human guides belong outside the installation unit.

The detailed [CLI patterns](docs/development/flowsvg-skill-patterns.md) remain the implementation reference for runtime preparation, deterministic layout, diagnostics, review identity, and quality projection. The [maintenance guide](docs/development/flowsvg-skill-maintenance.md) defines verification and documentation ownership. New release entries belong in root `CHANGELOG.md`; the migrated pre-split changelog is historical.

Guide regression tests belong in `tests/` with the complete suite. When relocating existing tests, change only resource locations and imports required by the final structure, retain every behavioral assertion, and keep the source snapshot traceable. Cross-repository documentation cites an explicit source commit; execution never depends on those online references.

## Regression resource ownership

All 27 Skill test files live in `tests/`. Copy installed resources from `skills/flow-svg-diagram`; direct geometry/plan imports use that same installation directory. Own historical label-risk JSON and artifact-pixel fixtures in `tests/fixtures/`, with source attribution and no dependency on an old `.scratch/` tree. GIF tests import the repository's direct `gifuct-js` development dependency rather than the SDK package's dependencies or types. The repository consumer harness belongs in `scripts/`; its fail-closed prerequisite test is part of the full regression entry.

Run regressions from an independent repository copy with only its own installed development dependencies. Preserve browser-dependent test discovery and preconditions. A no-browser run must report the skipped browser cases; it does not satisfy the complete consumer/browser gate.

## Runtime isolation

The installed CLI prepares the exact public SDK baseline in an isolated cache. `runtime/package-lock.json` and `runtime/manifest.json` record the runtime dependency identity. The repository's `pnpm-lock.yaml` only controls development tools. Neither workflow may resolve the SDK from a workspace or a sibling checkout.

## Migration scope

The initial installation unit is copied without behavior changes. Move repository resources to their agreed final paths; do not introduce old-path fallback logic. Preserve the source repository until the independent browser acceptance gate passes.

## Completion and evidence

Report file delivery and inspection coverage separately. A no-browser run can complete JSON, offline HTML, and SVG delivery while quality coverage stays incomplete. Finalization removes only the selected task workspace. Browser capture and actual visual review require their own evidence.

## Acceptance and CI

Run the complete regression suite against a prepared browser, then exercise the copied installed CLI through the independent consumer harness with a real unsupported Node 18 executable. A missing prerequisite, failed contract, or required `not-run` check must retain a nonzero/incomplete gate; no platform fallback converts it to success. Windows graceful console cancellation needs an actual Ctrl+C runner and remains unverified by the existing harness.

CI triggers include installation resources, tests/fixtures, guides, tools, root configurations/locks, and workflows. Every configured OS/runtime job installs the frozen development lock and runs both gates; upload factual JSON evidence after failures. CI configuration, actual execution, programmatic browser checks, and viewed images are distinct evidence. Keep synthetic test attestations labeled; record actual viewing separately with exact saved-file/state identity.
