# Record transformations

[Diagram source](record-transformations.json)

**Question:** How do raw records become a daily count report?

**Fictional source facts:** This fictional setup: raw records are cleaned of format errors, valid records are counted by date, then date/count pairs form a daily report. Error-record destinations, data volume and duration are unknown.

**Why this composition:** Equal-height cards distinguish stage titles from the transformation description. All side ports share one horizontal center. Arrow labels name the changing boundary data: raw records, valid records and date counts. The date aggregation receives a restrained accent because it changes records into counts. A borderless note preserves the unknown error destination and timing.

Relationship words are borderless annotations in the source geometry, placed clear of their paths. These annotations explain the existing relations; they are not additional states.

**Primary display:** Light background, 1400 × 350 units; PNG displayed at 1100 × 275 CSS px. The intended offline HTML viewport is 1440 × 1000. This diagram is static; the SDK page controls do not create animation.

**Use and limits:** Use for an ordered transformation pipeline with named intermediate data. This static diagram explains relationships, not an execution trace or success guarantee; it adds no reject store, retry or processing statistics.

For current viewing coverage and unperformed checks, read the [library viewing scope](README.md#display-conditions-and-limits).
