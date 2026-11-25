# Web service: Two-replica deployment

[Diagram JSON](complete-web-service-deployment.json) · [Example index](complete-README.md)

Before running or exporting, read the [shared execution and viewing conditions](README.md#run-and-inspect).

**Reader's question:** How do public entry, application replicas and data services connect?

**Source scenario:** Explore the public entry, two private app replicas and the data tier. Queries use the load balancer, cache and primary; replication and health checks are separate. After A becomes unhealthy, later requests go to B. No live infrastructure is used.

**Composition and animation:** Nested runtime groups separate public entry, the private network, application replicas and data services. The story shows requests, independent replication, a health change and later routing to B. These are fictional deployment rules, not a general failover guarantee.

**Static reading:** Use time 0 for topology; use scene `reroute` for the later health/routing state. Label the chosen state when exporting.

**Scenes:** `entry`, `application`, `query`, `response`, `replication`, `health`, `reroute`.

**Canvas:** 922 × 756 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Source: [packages/showcase/src/examples/web-service-deployment.ts](https://github.com/yokingma/FlowSVG/blob/2eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/web-service-deployment.ts). See [source metadata](../resources/teaching-sources.json).
