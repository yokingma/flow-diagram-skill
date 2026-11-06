# ADR 0010: Keep final diagram files by default

- Status: accepted

来源：FlowSVG [`86bb7ad`](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/adr/0010-final-diagram-files-by-default.md)。本仓保留与 Skill 有关的决策和职责边界。
- Date: 2026-10-29

## Context

A field test produced 11 revisions and 103 files for one diagram. Repeated JSON/HTML snapshots and inspection images dominated the retained output. Users need a high-quality final diagram, while drafts and full evidence are useful mainly for active retries or explicit investigation.

The user approved changing the previous default of retaining all historical evidence. Existing project artifacts require separate cleanup authorization.

## Decision

Ordinary skill tasks keep all generated working files under `.diagrams/.work/<name>/<task-id>/`, including an explicit CLI history root. Use browser-free validation during iteration and capture only the needed final samples.

The `finalize` command publishes JSON, HTML, requested images and a compact report under `.diagrams/<name>/`. It collects exports through explicit unchanged-source/theme/SDK ancestry so review-only revisions cannot drop earlier images. Changed source content ends inheritance; requested images must be exported again.

Publish through staging and rollback before deleting the exact canonical task workspace. Failed finalization retains recovery files and the previous final delivery. `--keep-work` retains complete task history only on explicit request. Existing history, other tasks and original user sources are outside cleanup scope.

The portable report retains hashes, source metadata, scoped review observations and unresolved issues without requiring temporary evidence files. Subsequent edits import the final JSON into a fresh task workspace. Low-level `author`/`validate` commands retain their existing revision behavior; the skill uses explicit workspaces and finalization.

## Consequences

Successful ordinary tasks retain only user-facing deliverables. Full screenshot evidence and helper scripts are unavailable after default cleanup, so full history must be requested before finalization. Failed or cancelled tasks remain available for recovery. Cleanup does not change quality status or establish visual approval.

See the [tool contract](../../skills/flow-diagram/references/tool-contract.md#finalize-the-task) and [maintenance patterns](../development/flow-diagram-patterns.md).
