# Cache miss: Read and populate

[Diagram JSON](cache-aside-sequence.json) · [Example index](README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** What happens after a cache miss?

**Source scenario:** Follow seven message rows between the client, API, cache and database: request, miss, record and cache fill. Lanes identify participants; vertical position indicates message order. Straight arrows and default styling keep this teaching sequence simple.

**Composition and animation:** Seven numbered messages retain requester and return directions through cache lookup, MISS, database read, cache population and response. No cache-hit, error or consistency guarantee is supplied.

**Static reading:** Use scene `overview` for the complete static sequence; the opening begins the first request.

**Scenes:** `request`, `cache-get`, `cache-miss`, `database-get`, `database-result`, `cache-set`, `response`, `overview`.

**Canvas:** 948 × 572 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Definition `cache-aside-sequence`, category `sequence`, from [packages/showcase/src/examples/cache-aside-sequence.ts](https://github.com/yokingma/FlowSVG/blob/02eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/cache-aside-sequence.ts) at commit `02eda6e4172ad8c3c1383290e107b53bf0ea0c985`. Generated JSON: `packages/showcase/dist/site/json/cache-aside-sequence.json`. Source JSON SHA-256: `74a7b0aec1f49cc8a2dac208aa4b749964020fab049825673b6562d66c9be81c`.
