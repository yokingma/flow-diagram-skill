# RAG: From sources to answers

[Diagram JSON](complete-rag-workflow.json) · [Example index](complete-README.md)

Before running or exporting, read the [shared execution and viewing conditions](README.md#run-and-inspect).

**Reader's question:** How do sources become a cited answer?

**Source scenario:** Explore RAG ingestion and online queries: share an embedding model, retrieve five candidates, optionally rerank to keep two, and generate a cited answer. The handbook, question and answer are fictional. No live model or database is used; chunk counts are teaching choices.

**Composition and animation:** Eight scenes separate one-time ingestion from online questioning, retrieval, optional reranking, context assembly and cited generation. Content changes resize affected rows. Five-to-two selection is a fictional teaching choice, not a recommended retrieval setting.

**Static reading:** Use scene `complete` for the resulting answer and citations; the opening shows ingestion context, not the final answer.

**Scenes:** `parse`, `ingest`, `ask`, `retrieve`, `rerank`, `context`, `generate`, `complete`.

**Canvas:** 1120 × 789 diagram units.

**Attribution:** FlowSVG, MIT, Copyright (c) 2026 zac_ma. Source: [packages/showcase/src/examples/rag-workflow.ts](https://github.com/yokingma/FlowSVG/blob/2eda6e4172ad8c3c1383290e107b53bf0ea0c985/packages/showcase/src/examples/rag-workflow.ts). See [source metadata](../resources/teaching-sources.json).
