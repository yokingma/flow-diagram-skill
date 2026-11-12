# Teaching examples

These English examples explain fictional scenarios or diagram-authoring methods. Choose by the reader's question, then read the adjacent note for source facts, composition choices, display conditions and limits. [Teaching sources](../resources/teaching-sources.json) records their assumptions; replace them with the user's evidence for a real task and use the requested output language.

| Reader's question | Example and source | Primary PNG display; diagram canvas |
| --- | --- | --- |
| What happens with complete or missing materials? | [Application review](approval-review.md) · [JSON](approval-review.json) | 1280 × 440; 1280 × 440 |
| When does an attempt retry or stop? | [Finite retry policy](retry-policy.md) · [JSON](retry-policy.json) | 1100 × 523; 1240 × 590 |
| Where do combined arrivals exceed processing capacity? | [Fan-in capacity](fan-in-capacity.md) · [JSON](fan-in-capacity.json) | 1100 × 485; 1360 × 600 |
| How do records change between stages? | [Record transformations](record-transformations.md) · [JSON](record-transformations.json) | 1100 × 275; 1400 × 350 |
| How do layers, members and governance notes relate? | [Layered architecture](layered-architecture.md) · [JSON](layered-architecture.json) | 1280 × 904; 1280 × 904 |
| Which responsibilities exist, are proposed or remain unknown? | [Capability overview](capability-overview.md) · [JSON](capability-overview.json) | 720 × 363; 960 × 484 |
| How does a source collection map to services? | [Source/service mapping](source-services.md) · [JSON](source-services.json) | 1200 × 525; 1280 × 560 |
| How can paragraphs, lists and short tags share cards? | [Content cards](content-cards.md) · [JSON](content-cards.json) | 1100 × 432; 1100 × 432 |
| What is sent, what changes, and what returns? | [Query round trip](query-round-trip.md) · [JSON](query-round-trip.json) | 960 × 432; 960 × 432 |
| How can independent transfers flow together? | [Parallel transfers](parallel-transfers.md) · [JSON](parallel-transfers.json) | 960 × 432; 960 × 432 |

## Display conditions and limits

The first eight examples are static. The last two animate transfer and state changes. All use a light background and the exact SDK 0.3.1 baseline. PNG display sizes above are CSS pixels, while canvases use diagram units. Each note states its intended use.

The current PNGs were viewed at the listed sizes. Actual HTML screenshots were viewed at a 1440 × 1000 browser viewport, including paused animation starts, selected changes and ends. Continuous visual playback and independent SVG viewing remain unperformed. Other platforms, themes, fonts, smaller placements and host embedding are outside the viewed conditions. Earlier selection of the library does not extend viewing coverage to later revisions. Successful validation, compilation or export does not establish visual quality.

## Adapt an example

Copy its JSON into the task's one editable source draft, replace fictional facts and preserve source-supported relationships. Measure changed content and typography when needed, regenerate current outputs and actually view affected surfaces at the intended size. Keep substantive findings in one temporary `issues.md`; add registered evidence only for an explicit formal request. Follow the [task workspace rules](../references/tool-contract.md#task-workspace).

The installed JSON is the publication source. This directory contains reusable sources and teaching notes; [execution resources](../resources/README.md) holds the HTML starter, independent measurement input and teaching-source records.
