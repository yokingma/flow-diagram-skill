# Application review

[Diagram source](approval-review.json)

**Question:** What happens when an application has complete or missing materials?

**Teaching facts:** This is a fictional scenario. Complete materials lead to review, then production of a draft report. Missing materials lead to return for revision. No resubmission route, approval result, archive action, processing time or retry count is specified.

**Why this composition:** The complete-materials path reads left to right, and the alternative branches downward with its own condition label. Facing side ports share a vertical center; aligned bottom/top ports keep the branch vertical. A pale blue diamond emphasizes the decision without implying success or failure. Its width preserves the full question at the chosen type size. Shapes distinguish input, decision, defined subprocess and document.

**Display and limits:** Static light-background diagram, 1280 × 440 units, intended for a 1280 × 440 CSS-pixel SVG/PNG display. The intended HTML viewport is 1440 × 1000. Use it for a short conditional workflow with one main path and one terminal alternative. It does not explain retry loops or review internals. Adapted content needs fresh measurement and actual viewing.

Relationship labels are borderless annotations in the source geometry. They sit above horizontal paths with visible clearance, while “missing” sits beside its vertical branch. These annotations explain existing relations without adding states. The review/report gaps reserve enough width for unbroken words.

For current viewing coverage and unperformed checks, read the [library viewing scope](README.md#display-conditions-and-limits).
