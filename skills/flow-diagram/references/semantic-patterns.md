# Semantic patterns

Choose a pattern by the relationship the reader must understand. Patterns can be combined and do not restrict supported diagrams or layouts. Every bundled scenario below is an invented teaching setup, not evidence about a real system. [Source metadata](../examples/semantic-pattern-sources.json) states its directions, conditions, quantities and unknowns. Use the matching record when adapting a sample; replace teaching assumptions with the user's evidence before describing a real system.

## Choose by the reader's question

| Reader's question | Structure to consider | Relationship requirement |
| --- | --- | --- |
| What is the goal, and what resources are available? | Goal, participants and resource-status cards | Distinguish available, proposed and unknown resources; availability does not establish authorization or model access. |
| What capabilities exist, and who owns them? | Responsibility layers or a capability inventory | Parallel cards can stand without edges; membership and layer order do not establish call order. |
| What functions does a system provide? | Function matrix with a shared-capability band | Grouping compares functions; draw dependencies only when sources establish them. |
| How do inputs become useful outputs? | Source → transformation → use channels | Label what is mapped, transferred or transformed at each boundary. |
| How is work completed and improved? | Process with conditions, outcomes and returns | Keep direct replies, rejected work and conditional returns traceable. |
| What was requested, and what returned? | [Request and response](#request-and-response) | Read required inputs and static-state choices; retain both directions. |
| When does work retry or terminate? | [Retry and state transition](#retry-and-state-transition) | Read conditions, attempt counting and terminal-state requirements. |
| Where does combined demand exceed capacity? | [Fan-in and bottleneck](#fan-in-and-bottleneck) | Read rate units, queue semantics and unknown overload behavior. |
| How does data change at each stage? | [Staged data processing](#staged-data-processing) | Read boundary inputs, transformations and outputs. |
| What belongs inside each system boundary? | [System architecture](#system-architecture-with-boundaries) | Read boundary meanings, membership and crossing directions. |
| How do layers and shared columns relate? | [Layered architecture](#layered-architecture-with-teaching-boundaries) | Read layer semantics, relation directions and sidebar ownership. |

Treat the table as a selection aid, not a requirement to use these exact compositions. For a capability inventory, read [the no-edge recipe](visual-design.md#capability-inventory-without-runtime-edges) and use [recipe-capability-overview.json](../examples/recipe-capability-overview.json). For source mapping and business cards, use [the source/service recipe](visual-design.md#source-mapping-and-service-cards). Their [teaching sources](../examples/recipe-sources.json) state invented facts and unknowns separately from these relation-focused examples.

## Relationship scope and endpoints

Before placing edges in a grouped or layered diagram, state the view's level of detail: layer responsibilities, component dependencies, or a layer overview with named component exceptions. Select endpoints at the level of the source-supported relationship:

| Relationship meaning | Endpoints | Interpretation |
| --- | --- | --- |
| One layer or subsystem supports another | Group → group | Connect their boundaries; the relation describes the named groups collectively and does not assert every possible child-to-child dependency. |
| A specific component serves a subsystem, or a subsystem serves a specific component | Node → group, or group → node | Keep the specific endpoint and name the collective responsibility at the other boundary. |
| A specific component calls, supplies or depends on another | Node → node | Preserve both component IDs, direction and any conditions. |
| A component belongs to a layer | Parent membership | Express containment with `parentId`; add an edge only for a separately supported relationship. |

For a capability or layered architecture overview, use group endpoints for collective relationships and keep only the component exceptions needed to answer the reader's question. In a component dependency view, retain the specific endpoints. An architecture title or the presence of groups alone does not establish either meaning.

Express the view's relationship level through its endpoints; keep material ambiguity in `issues.md`. Repeated edges between children of the same groups are a prompt to check the relationship's scope, not an instruction to merge them. When revising, follow [source fidelity](source-fidelity.md#before-and-after-a-meaning-change): collective endpoints can represent a supported abstraction, while changing key relationships requires confirmation. Preserve meaningful exceptions, such as a named external integration, a cross-layer dependency or a planned capability with distinct status. User approval of that specific abstraction can be applied without asking again for each edge.

Endpoint selection is ready for geometry when it expresses the intended relationship level and any uncertainty that would change meaning is resolved. Judge individual endpoints against the sources and reader's question; route styling cannot correct a relationship expressed at the wrong level.

### Endpoint decision examples

These invented cases illustrate the decision; they supply no facts about a user's system.

| Source and reader's question | Endpoint decision |
| --- | --- |
| “The data platform supports the application platform”; explain how the platforms relate. Each platform contains several capability cards. | Connect the two platform groups. Keep cards as members; the collective statement supplies no individual card-to-card calls to draw. |
| “The order API writes to the order database”; show that dependency. The API and database belong to different groups. | Connect the API and database shapes. Membership supplies context but does not establish a collective dependency between their groups. |
| “The data platform supports the application platform; a planned audit service will also serve the named external client”; explain the overview and its exception. | Draw the group relationship and the specific audit-service → client exception with its planned status. Keep the exception's scope distinct from the collective relationship. |

## Decisions and conditional process paths

For source-supported conditions, use a decision node and name each outgoing condition; a shape alone does not define the rule. [mixed-approval-flow.json](../examples/mixed-approval-flow.json) demonstrates input/output, decision, defined subprocess and report presets. Its fictional sources define complete materials leading to review and archival, while missing materials return for revision. The static overview retains both branches; only the complete-materials path is animated. No retry, review criterion or real execution duration is supplied. Follow [preset labels](document-model.md#preset-labels) for safe measurement before authoring.

## Request and response

Use this pattern when the reader must distinguish an initiating request from its returned result.

- **Required input:** requester, receiver, request direction and payload, response direction and result. Ask whether failures or unsolicited events belong in scope. Keep an unspecified failure unknown.
- **Common misrepresentation:** a single forward arrow labelled “request/response” hides the return direction. A reverse flow marker does not reverse the edge's arrow; use distinct directed edges when both relations must remain readable while paused.
- **Static frame:** select the state that matches the explanation. The overview shows both relations, not proof that a response has already arrived. For a returned result, use the compiled final time; verify that the changed service content is present. A static image cannot preserve the chronological movement of the markers.
- **Runnable JSON:** [request-response.json](../examples/request-response.json). The teaching setup is one successful query; timeout and failure behavior are unspecified. Content changes from waiting to result-ready. Measure both versions before changing dimensions.

## Retry and state transition

Use this pattern when a reader needs the conditions for continuing, repeating or exiting work.

- **Required input:** states, transition direction, triggering conditions, attempt counting convention, retry limit, success exit, exhausted exit, and any stated delay or cancellation. If a limit or delay is absent, label it unknown rather than inventing it.
- **Common misrepresentation:** an unlabelled loop implies endless retry; “3 retries” and “3 total attempts” have different limits. An animated arrow does not execute a retry policy or prove that a runtime can reach a state.
- **Static frame:** show the relevant outgoing conditions and terminal states together. A failure-only crop that hides the success branch needs an explicit narrower scope. For an animated instance, pair its selected state with the policy overview if one image cannot explain both.
- **Runnable JSON:** [retry-state.json](../examples/retry-state.json), a static policy overview. Teaching setup: at most three total attempts including the first; temporary error with count below three waits and retries; success exits; temporary error on attempt three fails. Waiting duration and other error handling are unknown. The graph does not model a counter or run a simulation.

## Fan-in and bottleneck

Use this pattern when several sources converge on a shared stage and their combined demand matters.

- **Required input:** each source, convergence direction, queue or merge semantics, processing capacity and units, resulting output, and any known overload policy. Separate arrival rate, storage capacity and processing rate.
- **Common misrepresentation:** line thickness or animation speed presented as measured throughput; a finite queue invented from a processing rate; extra demand silently shown as dropped, buffered forever or delayed by a numerical amount.
- **Static frame:** include all sources and the shared stage so the reader can compare stated demand with capacity. Label the comparison's assumptions; an isolated worker image cannot explain the convergence.
- **Runnable JSON:** [fan-in-bottleneck.json](../examples/fan-in-bottleneck.json). Teaching setup: three sources each supply one item/second, one worker handles two items/second, and completed items leave the worker. Under sustained supply, aggregate arrival exceeds processing rate. Queue capacity, overload policy, actual length and latency are unknown; the static diagram does not simulate them.

## Staged data processing

Use this pattern when the reader needs to follow how an input becomes a different output through ordered transformations.

- **Required input:** stage order, input and output at each boundary, transformation, and any supplied branch or error destination. Keep control dependencies distinct from transferred data.
- **Common misrepresentation:** stage names alone conceal the changing data; ordering drawn as a guarantee of success; missing error destinations silently filled with a reject store or retry path.
- **Static frame:** show adjacent stage inputs and outputs together. An intermediate-state export must identify which transformation has happened; a moving marker alone is insufficient explanation.
- **Runnable JSON:** [staged-data-processing.json](../examples/staged-data-processing.json). Teaching setup: raw records → remove format errors → count valid records by date → daily report. Error-record destination, volume and timing are unknown. For a simpler work sequence without data transformations, reuse [process.json](../examples/process.json): collect → review → archive after review. That sample does not establish rejection or retry behavior.

## System architecture with boundaries

Use this pattern when ownership or another explicitly named boundary determines how relationships should be read.

- **Required input:** components, boundary meaning, component membership, external participants and cross-boundary relationship direction. Distinguish logical ownership, deployment location and trust boundary; use the meaning actually supplied.
- **Common misrepresentation:** a group interpreted as a host, network or security boundary without evidence; proximity mistaken for membership; a database arrow interpreted as a response or replication relation.
- **Static frame:** include the boundary heading, contained components and necessary external endpoints. A focus on the API alone omits ownership context. Check crossing arrows and titles at the intended display size.
- **Runnable JSON:** [architecture.json](../examples/architecture.json). Teaching setup: client outside the order-service boundary, API and storage inside, order submission then persistence. It does not state replicas, hosts, trust policy or return traffic. The sample API uses height 140 and document `nodeLabel: 20`. Measuring the same content and typography recommends height 111.375, with no content-overflow diagnostic. The sample retains two edge-label/group overlap risks (`request` and `persist` against `orders`); inspect those at the intended display size. Re-measure with the same document typography before changing dimensions.

## Layered architecture with teaching boundaries

Use this teaching pattern when a reader needs to compare layers, several columns inside a layer, and governance notes beside the main structure. The bundled sample is an invented teaching setup; it does not describe a production system.

- **Required input:** layer names and their intended reading relationship, the objects in each column, explicit cross-layer relation directions, heading space, and the meaning of any governance annotation. Choose [relationship scope and endpoints](#relationship-scope-and-endpoints) before placing cross-layer edges. Keep the layer order separate from execution order.
- **Common misrepresentation:** a top-to-bottom layer order is read as call timing; a group is read as a deployment, network or trust boundary; a governance edge is read as an undeclared runtime dependency. Use labels such as “非调用依赖” when the relation is explanatory only.
- **Static frame:** leave heading space inside each group, keep columns on a shared row, and route labelled edges through the gaps between groups. Measure structured content at the document's actual typography before increasing heights. The sample's row heights, column gaps and label clearance are verified starting values for this document and display width, not general SDK layout parameters.
- **Runnable JSON:** [layered-architecture.json](../examples/layered-architecture.json). It contains two columns in each of the ingress, domain and data layers, a dashed governance sidebar, labelled cross-layer edges, and auxiliary text that records unknown information. The title and auxiliary blocks are measured from the draft and the published draft keeps only supported height increases. Layer order does not establish call order, grouping does not automatically establish deployment or trust boundaries, and governance relations do not add dependencies absent from the teaching setup. A group does not imply a deployment or trust boundary unless the source says so.

## Run the installed examples

Replace `<skill-directory>` with the absolute installed path. Run from a separate working directory and create a canonical [task workspace](tool-contract.md#task-workspace); replace `<task-workspace>` with that path. Repeat the first command with each sample name above, using its own matching diagram name and workspace. The sources file preserves the bundled teaching setups; it does not assert real-world facts or fetch sources. For the layered sample, run `measure --input` on the draft, write a new output draft, then validate and author from that new file; keep the original draft bytes unchanged. A complete authoring result still needs actual HTML/image inspection, and program checks do not stand in for visual review.

```text
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/request-response.json" --sources "<skill-directory>/examples/semantic-pattern-sources.json" --name request-response --svg --time 0 --output "<task-workspace>/history"
node "<skill-directory>/scripts/flowsvg.mjs" measure --input "<skill-directory>/examples/content-measurement.json"
```

`author` performs public validation and compilation, default JSON/paused offline HTML/report delivery, requested SVG, and browser previews when a prepared browser is available. Read the report's compiled times before requesting a later SVG; regenerate current outputs. For content in another sample, create a measurement input `{kind, width, content, typography}` from that node and the document typography, using all replacement content versions; the separate measurement example illustrates the format. Actual image inspection remains required. Follow [visual inspection](visual-checks.md), and record observed problems instead of equating successful export with visual approval.

## Sample display checks

The bundled teaching samples use explicit typography and geometry chosen for particular display widths. Inspect request-response at a 1280px reference width, fan-in/bottleneck, retry/state and staged processing at 720px, and architecture at an assumed 640px local-asset width. These widths limit the readability claim; they are not responsive presets. The samples retain their teaching objects, relationships and unknowns. Source metadata is in `examples/semantic-pattern-sources.json`. Re-measure structured content after changing typography and check each formal file through target-size artifact evidence.
