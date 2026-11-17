# SDK capabilities

Choose an example for the authoring feature you need. Use [complete examples](../complete/README.md) for full explanations.

| Need | Runnable source |
| --- | --- |
| All public shapes, preset labels, group-relative geometry, ports, orthogonal routes and label replacement | [Basic shapes](basic-shapes.md) · [JSON](basic-shapes.json) |
| Palette, automatic edge/participant highlighting and parallel transfers | [Emphasis and flow](emphasis-flow.md) · [JSON](emphasis-flow.json) |
| Static styled text, numbered lists, a centered badge and local entity graphs | [Content and layout](content-layout.md) · [JSON](content-layout.json) |
| Group hide/show, connected-edge visibility, focus/full-view restoration and edge updates | [Visibility and camera](visibility-camera.md) · [JSON](visibility-camera.json) |

For content replacement and geometry changes, study [RAG workflow](../complete/rag-workflow.md), especially nodes `retriever`, `reranker`, `context` and `answer`. [Task lifecycle](../complete/job-lifecycle.md) demonstrates independent state cases; [SDK architecture](../complete/project-architecture.md) demonstrates nested groups and collective dependency endpoints. [Web deployment](../complete/web-service-deployment.md) and RAG contain reverse flows; [cache-aside sequence](../complete/cache-aside-sequence.md) uses straight routes.

For text sizing and repeated geometry, use the [measurement input](../../resources/content-measurement.json) and [layout input/plan](../../references/layout-plan.md#complete-teaching-input).

Before running or exporting, read [shared execution and viewing conditions](../README.md#run-and-inspect).
