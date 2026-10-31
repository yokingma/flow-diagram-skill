# ADR 0014: Append review observations independently from design revisions

- Status: accepted

来源：FlowSVG [`86bb7ad`](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/adr/0014-independent-review-records.md)。本仓保留与 Skill 有关的决策和职责边界。
- Date: 2026-10-30

## Context

Submitting observations through `author` repeats diagram snapshots, compilation, HTML production and optional capture even when the diagram has not changed. The approved lightweight-authoring tickets preserve required checks and append-only evidence while removing that execution cost. HTML/preview inspection must remain distinct from actual viewing, continuous visual playback and the user's final design judgment.

## Decision

Use `review --from <diagram-revision> --name <diagram> [--output <history-root>]` for existing HTML, preview and formal-image evidence. Formal-image submissions can select a separate `--evidence-from <source>` while `--from` remains the actual diagram subject. Reuse the strict JSON contract and read-only identity preflight. Save one atomically published immutable review record under `<history-root>/<name>/records/reviews/`, separate from `v###`. The semantic record ID binds the real source revision, input/theme/SDK, source-report hash and normalized observations. Timestamp is metadata. Exact repeats revalidate their sources and reuse the record without writes; changed observations append.

Review submission does not allocate a design revision, prepare the SDK, compile, generate HTML, export images, launch browsers or capture screenshots. Source selection stays explicit. A review ID never becomes a revision ID or an accepted `--from` value. Existing author review inputs remain preflighted; ordinary actual-viewing observation uses the independent operation.

Finalization reads applicable independent records from the selected real ancestry with unchanged input/theme/SDK and verifies their actual sources and screenshots again. HTML coverage requires the exact delivered file, matching display conditions, and selected required point IDs and times. The selected required set is preserved. Duplicate state observations count once, with all source attestations retained. Aggregation preserves the union of unresolved issues; a later clean observation cannot erase history or imply a user decision. Reports name all considered and adopted records. Invalid source, artifact, path or record metadata fails closed and retains working files and the previous delivery. Missing or damaged formal-image PNGs retain invalid entry attestations and issues but remove only affected entries from viewing coverage. Valid entries and other review kinds in the same combined record remain effective. A fresh valid capture and actual review can restore that surface.

Finalization still collects all requested design files from valid ancestry before scoped cleanup. File completion and quality remain separate under [ADR 0011](0011-delivery-quality-follows-required-checks.md). This decision replaces the review-as-new-revision assumption in [ADR 0010](0010-final-diagram-files-by-default.md), while retaining that decision's final-file publication and cleanup boundaries. Formal-image reviews share this record axis and retain a separate evidence-source locator, source-report hash and exact artifact/render/display identities. Templates and preflight use the same source loader. Finalization revalidates both independent and author-recorded formal observations; portable reports keep all attestations and source identities. On-demand evidence extends this axis under [ADR 0015](0015-on-demand-artifact-evidence.md) without synthetic design revisions.

## Consequences

Existing evidence can receive observations at the cost of one small record. The final portable report retains exact review identity, scope and issue history even after temporary captures are removed. Hash or context changes invalidate applicable evidence instead of silently passing quality. Historical issues remain unresolved until an explicit supported resolution exists. Conservative failure on corrupted records is preferable to publishing a false passed status.
