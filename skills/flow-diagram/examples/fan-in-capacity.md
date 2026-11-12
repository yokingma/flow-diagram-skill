# Fan-in and processing capacity

[Diagram source](fan-in-capacity.json)

**Question:** Where does combined arrival exceed one worker’s processing rate?

**Fictional source facts:** This fictional setup: A, B and C each supply one item/second; one worker handles two items/second and emits completed items. Sustained aggregate arrival is three items/second. Queue capacity, full-queue policy, actual queue length and delay remain unknown.

**Why this composition:** The three equal source cards feed three distinct queue ports. Upper and lower sources use orthogonal channels; the center source runs straight. Rates stay inside the source/worker cards, separating rates from arrow direction. A single blue worker card locates the processing constraint, and a detached note states the comparison without inventing overload behavior.

Relationship words are borderless annotations in the source geometry, placed clear of their paths. These annotations explain the existing relations; they are not additional states.

**Primary display:** Light background, 1360 × 600 units; PNG displayed at 1100 × 485 CSS px. The intended offline HTML viewport is 1440 × 1000. This diagram is static; the SDK page controls do not create animation.

**Use and limits:** Use for a static rate comparison under sustained supply. Lines do not encode throughput and no marker speed, dropped item, queue-length simulation or numerical latency is implied.

For current viewing coverage and unperformed checks, read the [library viewing scope](README.md#display-conditions-and-limits).
