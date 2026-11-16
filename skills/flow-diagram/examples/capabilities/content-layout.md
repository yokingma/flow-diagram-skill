# Content and local relationships

[Diagram JSON](content-layout.json) · [Capability index](README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** How can a fixed-size card combine styled text, a list and a local entity graph?

**Source scenario:** A Skill-authored visual exercise compares two invented content views. Ada, Team and Topic are local graph labels, not facts about a real system. The connecting arrow means related views; it is not a runtime transfer.

**Composition:** Two aligned cards separate text components from graph geometry. `rich-content` uses styled text spans, numbered items and auxiliary text. Each number shares its body's first baseline. The `ready-tag` badge is a separate rounded rectangle with a centered simple label; it is not a native list tag and has its own player hit target. [RAG workflow](../complete/rag-workflow.md) and the [measurement input](../../resources/content-measurement.json) demonstrate native list tags. `entity-content` holds a fixed-height graph with two undirected links. Ada and Team share a row; Ada and Topic share a column, so the links are horizontal and vertical. Graph coordinates are local to the block; graph entities share their outer card's player hit target. A horizontal straight edge joins the cards' facing ports.

**Static reading:** Export time 0. The document has no animation scenes. Measure at its authored widths before changing text; graph height and local coordinates need their own clearance check.

**Canvas:** 1024 × 360 diagram units. Equal card heights leave room for the graph labels and numbered text. Uses the shared dark presentation.

**Source:** Original Skill capability exercise, MIT, Copyright (c) 2026 zac_ma. This JSON is the author source, not an upstream showcase snapshot. The public graph/content contract is illustrated in [FlowSVG node-content-graph.test.ts](https://github.com/yokingma/FlowSVG/blob/2eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/flowsvg/src/core/node-content-graph.test.ts); the exercise composes its own geometry and teaching text. See the scoped [teaching record](../../resources/teaching-sources.json).
