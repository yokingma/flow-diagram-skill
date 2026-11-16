# Order events: From ingestion to metrics

[Diagram JSON](order-event-pipeline.json) · [Example index](README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** Where do valid, duplicate and invalid order events go?

**Source scenario:** Follow four fictional order events through a queue, validation, deduplication, valid/invalid routing and window aggregation. Two valid orders total CNY 200. IDs, counts and amounts remain traceable; no live message or data service is used.

**Composition and animation:** Four fictional events yield two valid orders worth CNY 200, one discarded duplicate and one quarantined invalid record. Data counts and destinations stay explicit; no live queue or service is called.

**Static reading:** Use scene `overview` after publication for the complete data result. Initial cards contain waiting states.

**Scenes:** `collect`, `consume`, `validate`, `split`, `aggregate`, `publish`, `overview`.

**Canvas:** 964 × 580 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Definition `order-event-pipeline`, category `data-flow`, from [packages/showcase/src/examples/order-event-pipeline.ts](https://github.com/yokingma/FlowSVG/blob/02eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/order-event-pipeline.ts) at commit `02eda6e4172ad8c3c1383290e107b53bf0ea0c985`. Generated JSON: `packages/showcase/dist/site/json/order-event-pipeline.json`. Source JSON SHA-256: `ed4b33985074f1c57ea976477e7980c7cf631446a2d83d202054706057c7a287`.
