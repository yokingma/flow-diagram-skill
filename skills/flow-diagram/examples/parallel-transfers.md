# Parallel transfers

[Diagram source](parallel-transfers.json)

**Question and facts:** How can two independent transfers stay understandable while the whole relationship remains visible? In this fictional setup, a resource station sends public guides and service notices to a service desk. Both independent relationships point in the same direction. Three repetitions and their timing are presentation choices, not throughput or a request/response exchange.

**Composition and animation:** Both participant cards and both relationships stay visible from start to finish. Separate top and bottom orthogonal channels distinguish the transfers. Dot markers move together; participant highlighting stays disabled so motion carries the emphasis. Borderless annotations name the existing relationships above their paths without adding participants. Repeated flows end with a still overview that preserves context.

**Display and timing:** Light background, 960 × 432 CSS px for the diagram and static exports; the intended HTML viewport is 1440 × 1000. The exact SDK 0.3.1 sequence lasts 9 seconds: an 800 ms opening, three 2400 ms concurrent-flow beats and a 1000 ms closing hold. Time-zero images retain the overview without moving markers.

**Use and limits:** Adapt when sources support distinct simultaneous transfers, rather than sequential work or a return trip. Repetition establishes no schedule or measured rate.

For current viewing coverage and unperformed checks, read the [library viewing scope](README.md#display-conditions-and-limits).
