# 0020: Reuse working drafts by default

Status: accepted

Date: 2026-11-11

The user confirmed one default authoring workflow that reuses a working draft and current generated files instead of allocating immutable diagram revisions for validation, layout, previews or retries. A temporary Markdown file collects problems and their handling for the user; it does not replace machine diagnostics or registered review evidence. Default publication reads the selected current artifacts rather than an iteration ancestry.

Explicit requests for version comparison, rollback or checkpoints add snapshot retention; requests for traceable review or audit add stable source snapshots under ADRs [0014](0014-independent-review-records.md) and [0015](0015-on-demand-artifact-evidence.md). These are additional steps within the same workflow, and later draft edits cannot overwrite registered evidence. This changes the default revision lifecycle retained by [ADR 0010](0010-final-diagram-files-by-default.md) while preserving its publication and scoped cleanup protections: failed work retains recovery materials and the previous complete delivery, and successful work keeps unresolved issues in the final report before cleaning temporary files.

The trade-off is less automatic rollback history by default in exchange for fewer duplicate files and a single readable problem record. Authoring replaces current outputs; measurement and layout can atomically update the canonical source draft. Explicit checkpoints and formal-review sources retain immutable identities.
