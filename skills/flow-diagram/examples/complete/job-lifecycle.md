# Background task lifecycle

[Diagram JSON](job-lifecycle.json) · [Example index](README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** Which events change the current task state?

**Source scenario:** Watch task events and state transitions: A completes after retry, independent B reaches its retry limit, and C is cancelled while queued. Exactly one state is current. Retry counts are teaching choices; no live tasks run.

**Composition and animation:** Task A completes after retry; independent B reaches its limit; independent C is cancelled while queued. Exactly one state is current. These are separate cases, not changes to an already terminal task.

**Static reading:** The state graph stays available for static reading. Choose the scene for the intended task outcome; the final picture is cancellation of C.

**Scenes:** `submit`, `execute`, `recover`, `exhaust`, `cancel`.

**Canvas:** 868 × 416 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Source: [packages/showcase/src/examples/job-lifecycle.ts](https://github.com/yokingma/FlowSVG/blob/2eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/job-lifecycle.ts). See [source metadata](../../resources/teaching-sources.json).
