# Layered architecture

[Diagram source](layered-architecture.json)

**Question:** How can a reader distinguish layer membership, relations between layers and separate governance notes?

**Teaching facts:** This fictional architecture has access, domain and data layers, each with two columns of components. Two relations connect whole layers. Governance contains policy and observability records. Layer order does not establish call timing, and grouping does not establish deployment or trust boundaries. Component-level dependencies, scheduling, failure behavior and business constraints remain unspecified.

**Why this composition:** Shared left edges and two-column cards make membership easy to scan. Vertical arrows meet layer boundaries through dedicated gaps, so the relations apply to layers rather than arbitrary components. Labels sit beside their paths. A compact dashed sidebar holds the two governance records. Card heights follow their content; explicit line breaks keep meaningful phrases together.

**Display and limits:** Static light-background diagram, 1280 × 904 units, intended for a 1280 × 904 PNG with actual HTML displayed at a 1440 × 1000 browser viewport. Use it for document-width architecture explanations. Component call sequences need additional source facts and a different composition. Adapted content needs fresh measurement and actual viewing.

For current viewing coverage and unperformed checks, read the [library viewing scope](README.md#display-conditions-and-limits).
