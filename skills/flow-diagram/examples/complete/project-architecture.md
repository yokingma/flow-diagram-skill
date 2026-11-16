# FlowSVG: SDK architecture

[Diagram JSON](project-architecture.json) · [Example index](README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** Which layer owns each FlowSVG responsibility?

**Source scenario:** Explore FlowSVG's responsibility layers: a platform-independent core, browser integration and Node tools inside the public SDK, with showcase apps outside it. Arrows point from consumers to providers. Playback highlights each layer while keeping the complete architecture visible.

**Composition and animation:** Nested groups separate the public SDK from its showcase consumers. Arrows point from consumers to providers; the core module cards have no invented internal execution arrows. Topic highlights retain the full architecture.

**Static reading:** Use scene `overview` or `summary` for a static architecture diagram.

**Scenes:** `overview`, `core`, `browser`, `node`, `boundary`, `summary`.

**Canvas:** 1080 × 736 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Definition `project-architecture`, category `architecture`, from [packages/showcase/src/examples/project-architecture.ts](https://github.com/yokingma/FlowSVG/blob/02eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/project-architecture.ts) at commit `02eda6e4172ad8c3c1383290e107b53bf0ea0c985`. Generated JSON: `packages/showcase/dist/site/json/project-architecture.json`. Source JSON SHA-256: `98ac6a04b100bb24cc1e79c3e28c0c16a4046652d3b24fe74e4eb1e700ea1630`.
