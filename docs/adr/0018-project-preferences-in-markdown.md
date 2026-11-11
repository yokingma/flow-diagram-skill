# ADR 0018: Keep project preferences in one Markdown record

- Status: accepted

The original JSON admitted only a fixed set of visual fields, while users can also set reusable defaults for diagram expression and delivery. The Skill uses one editable Markdown list with one scoped preference per line, avoiding two active sources with overlapping authority. Clear user intent for future project tasks is required to write; saved preferences fill open choices without changing source facts or expanding a revision.

The legacy JSON is left intact but no longer applies, so keeping an old preference requires a deliberate transfer. The [installed preference contract](../../skills/flow-diagram/references/preferences.md) owns the file lifecycle; neither the CLI nor the SDK interprets the record.
