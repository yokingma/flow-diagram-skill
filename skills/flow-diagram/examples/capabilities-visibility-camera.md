# Visibility, focus and restoration

[Diagram JSON](capabilities-visibility-camera.json) · [Capability index](capabilities-README.md)

Before running or exporting, read the [shared execution and viewing conditions](README.md#run-and-inspect).

**Reader's question:** How do visibility, camera changes and edge updates persist and restore?

**Source scenario:** A Skill-authored visual exercise links an overview card to a detail card in a group. Labels and changes explain player mechanisms; no service, deployment or failure behavior is asserted.

**Composition and animation:** The overview and detail cards share a horizontal centerline. A straight edge joins the overview's right port to the detail's left port. Scene `hidden` hides `detail-group`, its child and their connected edge. `shown` restores the saved visibility. `focused` moves the camera to the group. `updated` restores the full camera with `focus.target: null`, then changes the edge label, stroke and width. `restored` explicitly restores the original edge values. Seeking back reconstructs the earlier state from the same source.

**Static reading:** Use time 0 or the completed final time for the full baseline. Use scene `updated` for the changed edge or `focused` for the intentionally narrower view. The final SVG matches the initial geometry, styles and text; playback captions describe different stages.

**Scenes:** `overview`, `hidden`, `shown`, `focused`, `updated`, `restored`.

**Canvas:** 800 × 260 diagram units. The group reserves space for its title above the detail card, with 40 units on either side and 30 below. Uses the shared dark presentation. The focused state intentionally crops the overview card.

**Source:** Original Skill capability exercise, MIT, Copyright (c) 2026 zac_ma. Public mechanisms are illustrated in [FlowSVG inherited-transition-composition.ts](https://github.com/yokingma/FlowSVG/blob/2eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/flowsvg/tests/fixtures/inherited-transition-composition.ts). See the scoped [teaching record](../resources/teaching-sources.json).
