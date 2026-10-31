# ADR 0015: Collect missing evidence from existing artifacts

- Status: accepted

来源：FlowSVG [`86bb7ad`](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/adr/0015-on-demand-artifact-evidence.md)。本仓保留与 Skill 有关的决策和职责边界。
- Date: 2026-10-30

## Context

Capturing a target-size view through `author` repeats compilation, HTML and preview capture for unchanged diagrams. A new design snapshot for each evidence or review operation obscures substantive changes and spends rendering work.

## Decision

Use explicit `evidence --from <diagram-revision> --name <name> --output <history-root>`. Read actual registered SVG/PNG bytes. Plan every selected artifact and accumulated display condition before browser work. Default unconfigured artifacts to native CSS width and theme backdrop; explicit first conditions replace that implicit default for the selected artifact. Later requests retain recorded conditions.

Verify source bytes, locked SDK, theme, export time/camera/background, intrinsic/display dimensions, backdrop, image bytes and recorded rendering conditions. Reuse exact valid captures without runtime, browser or writes. Capture only missing surfaces through decoded-file canvas PNG output at device scale factor 1. Store original identities and host/browser facts; cross-host font equivalence is outside this guarantee.

Append terminal capture operations under `records/evidence/evidence-<uuid>/`. Keep real source revisions separate. Reused images retain original evidence identity; new captures stay unviewed. Once source and settings planning succeeds, browser discovery/launch failures, capture failure and cancellation preserve completed images and all requested conditions in a terminal operation record. Invalid settings remain a preflight failure without task writes. Finalization loads requests even without reviews. Damaged evidence PNGs remove old viewing coverage while retaining invalid observations and issues; source or metadata corruption blocks adoption. See [ADR 0014](0014-independent-review-records.md) for independent review semantics.

## Consequences

The common repeat costs identity checks only. One added condition writes one PNG and one operation record. Partial requests remain visible and recoverable. Logical display conditions determine coverage, independently of retry or capture counts. Successful finalization retains portable operation/review facts and uses existing scoped cleanup. Artifact counts and timing measure costs; they do not impose a version budget or weaken quality requirements.
