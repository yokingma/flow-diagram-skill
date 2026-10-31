# Implementation patterns

## Installation unit and repository tools

`skills/flow-svg-diagram/` is the complete distributable Skill. Installed instructions, references, examples, metadata, scripts, and runtime resources resolve within that directory. Repository-level development tests, acceptance tools, and human guides belong outside the installation unit.

## Runtime isolation

The installed CLI prepares the exact public SDK baseline in an isolated cache. `runtime/package-lock.json` and `runtime/manifest.json` record the runtime dependency identity. The repository's `pnpm-lock.yaml` only controls development tools. Neither workflow may resolve the SDK from a workspace or a sibling checkout.

## Migration scope

The initial installation unit is copied without behavior changes. Move repository resources to their agreed final paths; do not introduce old-path fallback logic. Preserve the source repository until the independent browser acceptance gate passes.

## Completion and evidence

Report file delivery and inspection coverage separately. A no-browser run can complete JSON, offline HTML, and SVG delivery while quality coverage stays incomplete. Finalization removes only the selected task workspace. Browser capture and actual visual review require their own evidence.
