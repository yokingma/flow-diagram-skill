# Cache miss: Read and populate

[Diagram JSON](cache-aside-sequence.json) · [Example index](README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** What happens after a cache miss?

**Source scenario:** Follow seven message rows between the client, API, cache and database: request, miss, record and cache fill. Lanes identify participants; vertical position indicates message order. Straight arrows and default styling keep this teaching sequence simple.

**Composition and animation:** Seven numbered messages retain requester and return directions through cache lookup, MISS, database read, cache population and response. No cache-hit, error or consistency guarantee is supplied.

**Static reading:** Use scene `overview` for the complete static sequence; the opening begins the first request.

**Scenes:** `request`, `cache-get`, `cache-miss`, `database-get`, `database-result`, `cache-set`, `response`, `overview`.

**Canvas:** 948 × 572 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Source: [packages/showcase/src/examples/cache-aside-sequence.ts](https://github.com/yokingma/FlowSVG/blob/2eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/cache-aside-sequence.ts). See [source metadata](../../resources/teaching-sources.json).
