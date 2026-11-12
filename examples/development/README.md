# Development exercises

These English API exercises are fictional inputs for development, not selected visual teaching examples. Use the [installed teaching library](../../skills/flow-diagram/examples/README.md) for complete compositions to imitate.

- [Architecture](architecture.json): a client submits an order to an API inside a logical order-service group, then the API saves it. No hosts, replicas, trust rules or return traffic are specified.
- [Deployment](deployment.json): a router sends work to two replicas on named hosts; both access a shared database. Scheduling, failover, consistency and trust policy are unknown.
- [Process](process.json): collect material, review it and archive it after review. Rejection, retry, parallelism and duration are unspecified.

Relationship text uses a smaller font than node text. These exercises use native edge labels to keep line gaps close to the text width; the labels sit above the routes. The labels describe relationships and conditions, not additional process steps or system components.

For local viewing, follow the [gallery instructions](../README.md#preview-the-example-library). The large layout exercise and historical regression inputs live in [test fixtures](../../tests/fixtures/README.md); maintain those sources there rather than copying them here.
