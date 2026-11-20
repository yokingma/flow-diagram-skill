# E-commerce order: From checkout to delivery

[Diagram JSON](order-fulfillment.json) · [Example index](../../skills/flow-diagram/examples/README.md)

Before running or exporting, read the [shared execution and viewing conditions](../../skills/flow-diagram/examples/README.md#run-and-inspect).

**Reader's question:** How does an order move from submission to delivery, and where can it stop early?

**Source scenario:** A fictional e-commerce order runs through three phases: checkout and payment, risk review and fulfilment preparation, and warehouse-to-doorstep delivery. Three exception exits end or restart the order: rejected validation, unpaid or cancelled payment, and a risk block.

**Composition and animation:** A single vertical spine carries the happy path; all exceptions sit in a right-hand column so the main line stays readable. Phase labels sit outside the spine without node boxes. The timeline plays the spine first, then the three exits, including the dashed return edge from rejection back to the start; all highlights clear at the end.

**Static reading:** Use the compiled final state (`compilation.totalDurationMs`) for the complete diagram with no active highlight; the initial state also shows the whole composition.

**Scenes:** `main-path`, `exits`.

**Canvas:** 1040 × 1672 diagram units.

**Source kind and attribution:** Skill-authored local example, not an upstream FlowSVG snapshot. No byte identity with any upstream definition is claimed. Scenario data, exception policy and wording are teaching assumptions. License: MIT, Copyright (c) 2026 zac_ma.

**Known limitation under SDK 0.4.1:** Horizontal labelled exception edges jitter between two label anchors during playback because of float-exact comparisons in the SDK's `pathLabelAnchor`. The candidate source is otherwise stable; see the candidate `issues.md` for evidence and options.
