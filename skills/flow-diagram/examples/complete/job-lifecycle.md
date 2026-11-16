# Background task lifecycle

[Diagram JSON](job-lifecycle.json) · [Example index](README.md)

Before running or exporting, read the [shared execution and viewing conditions](../README.md#run-and-inspect).

**Reader's question:** Which events change the current task state?

**Source scenario:** Watch task events and state transitions: A completes after retry, independent B reaches its retry limit, and C is cancelled while queued. Exactly one state is current. Retry counts are teaching choices; no live tasks run.

**Composition and animation:** Task A completes after retry; independent B reaches its limit; independent C is cancelled while queued. Exactly one state is current. These are separate cases, not changes to an already terminal task.

**Static reading:** The state graph stays available for static reading. Choose the scene for the intended task outcome; the final picture is cancellation of C.

**Scenes:** `submit`, `execute`, `recover`, `exhaust`, `cancel`.

**Canvas:** 868 × 416 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Definition `job-lifecycle`, category `state`, from [packages/showcase/src/examples/job-lifecycle.ts](https://github.com/yokingma/FlowSVG/blob/02eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/job-lifecycle.ts) at commit `02eda6e4172ad8c3c1383290e107b53bf0ea0c985`. Generated JSON: `packages/showcase/dist/site/json/job-lifecycle.json`. Source JSON SHA-256: `4416f551ce24c1ee716bb8b2a1b3e76c64f83a773f9ebe824685af74ae4897ab`.
