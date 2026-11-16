# Complete examples

These complete FlowSVG showcase documents explain a reader's question through a full composition and animation. Each can also supply a static diagram from a suitable overview or key state. Use the same source JSON for both formats.

| Reader's question | Example and JSON | Category |
| --- | --- | --- |
| Who owns each SDK responsibility? | [SDK architecture](project-architecture.md) · [JSON](project-architecture.json) | Architecture |
| How do sources become a cited answer? | [RAG workflow](rag-workflow.md) · [JSON](rag-workflow.json) | Workflow |
| What causes retry, success, failure or cancellation? | [Task lifecycle](job-lifecycle.md) · [JSON](job-lifecycle.json) | State transitions |
| How do raw events become validated metrics? | [Order-event pipeline](order-event-pipeline.md) · [JSON](order-event-pipeline.json) | Data flow |
| How do replicas and data services connect? | [Web deployment](web-service-deployment.md) · [JSON](web-service-deployment.json) | Deployment |
| What is the message order after a cache miss? | [Cache-aside sequence](cache-aside-sequence.md) · [JSON](cache-aside-sequence.json) | Sequence |

Read [running, viewing limits and adaptation](../README.md#run-and-inspect) before use. Source commit and byte identity are in each note. The SDK architecture records responsibilities at that source revision; other scenarios are fictional teaching data, not observations from a live system.
