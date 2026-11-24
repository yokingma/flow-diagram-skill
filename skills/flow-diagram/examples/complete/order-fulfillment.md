# E-commerce order: From checkout to delivery

[Diagram JSON](order-fulfillment.json) · [Example index](../README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** How does an order move from submission to delivery, and where can it stop early?

**Source scenario:** A fictional e-commerce order runs through three phases: checkout and payment, risk review and fulfilment preparation, and warehouse-to-doorstep delivery. Three exception exits end or restart the order: rejected validation, unpaid or cancelled payment, and a risk block.

**Composition and animation:** A single vertical spine carries the happy path; all exceptions sit in a right-hand column so the main line stays readable. Phase labels sit outside the spine without node boxes. The timeline plays the spine first, then the three exits, including the dashed return edge from rejection back to the start; all highlights clear at the end.

**Static reading:** Use the compiled final state (`compilation.totalDurationMs`) for the complete diagram with no active highlight; the initial state also shows the whole composition.

**Scenes:** `main-path`, `exits`.

**Canvas:** 1040 × 1672 diagram units.

**Source and attribution:** AI-assisted Skill-authored example created with the `hy4 flash` model using the Flow Diagram Skill; not an upstream FlowSVG snapshot. The fictional scenario, exception policy and wording are teaching assumptions; no byte identity with an upstream definition is claimed. License: MIT, Copyright (c) 2026 zac_ma.

**SDK baseline and viewing:** Rendered with `flowsvg@0.4.2` in the dark theme. After the final phase-label contrast adjustment to `#a8bfd2` (9.34:1 against `#101828`), the saved HTML initial state was viewed at 1440 × 1000. A preceding 1× playback review covered the unchanged layout, wording and timeline before the palette-only adjustment; it used 22 time samples, with intervals between samples not visually inspected frame by frame.
