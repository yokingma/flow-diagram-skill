# SDK capabilities

Use these focused upstream examples for document syntax and public SDK behavior. For a full explanation to imitate, choose a [complete example](../complete/README.md).

| Need | Source |
| --- | --- |
| Shapes, preset labels, group-relative geometry, ports, orthogonal routes, label replacement and explicit highlighting | [Basic shapes](basic-shapes.md) · [JSON](basic-shapes.json) |
| Document emphasis, automatic edge/participant highlighting and parallel flow comparison | [Emphasis and flow](emphasis-flow.md) · [JSON](emphasis-flow.json) |
| Titles, paragraphs, lists, native tags and multi-version content | [RAG workflow](../complete/rag-workflow.md), nodes and scenes for retrieval, reranking, context and answer; [content model](../../references/document-model.md#node-content-and-measurement) |
| Cross-scene state and content changes, independent outcomes and restoration | [Task lifecycle](../complete/job-lifecycle.md), especially the independent B/C scenes; [timeline](../../references/timeline.md#scenes-and-inherited-state) |
| Nested groups and collective dependency endpoints | [SDK architecture](../complete/project-architecture.md) |
| Curved routes, explicit focus, hide/show, straight routes or forward/reverse flow | Read the relevant [document](../../references/document-model.md) and [action](../../references/timeline.md#scenes-and-inherited-state) contracts; selected examples demonstrate only the actions they actually contain. |

Two runnable capability sources serve four teaching groups without duplicating full stories. [Measurement input](../../resources/content-measurement.json) and the [layout input/plan](../../references/layout-plan.md#complete-teaching-input) remain independent execution resources. Framework embedding and the complete API test matrix belong to the SDK project.

For the shared dark presentation defaults, commands and viewing limits, read [the example index](../README.md#run-and-inspect).
