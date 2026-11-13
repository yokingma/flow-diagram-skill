# Query round trip

[Diagram source](query-round-trip.json)

**Question and facts:** What does a client send, and what returns? In this fictional setup, a client sends one query, the service obtains a result, then sends it back. Timeout, failure, payload details and real processing time are unknown.

**Composition and animation:** Matching cards keep both participants comparable. Separate top and bottom orthogonal channels retain opposite directions while paused. A request marker precedes the service's result-ready state; a return marker follows its own arrow. Borderless annotations name the existing relationships above the paths without adding business participants. Reading holds and route-derived transfer duration serve explanation rather than measuring latency.

**Display and timing:** Light background, 960 × 432 CSS px for the diagram and static exports; the intended HTML viewport is 1440 × 1000. The compiled sequence lasts about 12.810 seconds on the exact SDK 0.4.0 baseline. Read the new report's compiled times after changing a route or beat. A time-zero image shows the initial waiting state, not a completed exchange.

**Use and limits:** Adapt for one successful exchange with known participants, ordering and response direction. Keep unspecified error behavior unknown.

For current viewing coverage and unperformed checks, read the [library viewing scope](README.md#display-conditions-and-limits).
