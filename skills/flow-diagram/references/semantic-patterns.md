# Semantic patterns

Select a diagram type by the relationship the reader must understand, then use its semantic pattern to organize the content. A semantic pattern defines required objects, relationships, conditions and outcomes; layout choices follow that meaning. The installed library combines pinned upstream showcase documents with focused Skill-authored exercises. [Source metadata](../resources/teaching-sources.json) distinguishes the SDK architecture at its source revision from fictional scenarios. Replace teaching assumptions with the user's evidence before describing a real system.

## Choose by the reader's question

Match the main reader question and the source-supported relationships against the table before choosing geometry. The family column groups related types; each diagram type links to its applicable guidance.

| Family | Diagram type and guidance | Reader's question | Relationship requirement |
| --- | --- | --- | --- |
| Architecture | [Layered architecture](#layered-architecture-with-teaching-boundaries) | How do layers and their components relate? | Read layer semantics, relation directions and sidebar ownership. |
| Architecture | [System boundary diagram](#system-architecture-with-boundaries) | What belongs inside each system boundary? | Read boundary meanings, membership and crossing directions. |
| Process | [Business or logic flowchart, including approval](#decisions-and-conditional-process-paths) | How is work completed, branched or returned? | Keep steps, conditions, outcomes and source-supported returns traceable. |
| Data flow | [Source-to-use mapping](#data-flow-and-source-mapping) | How do inputs become useful outputs? | Label what is mapped, transferred or transformed at each boundary. |
| Data flow | [Staged data processing](#staged-data-processing) | How does data change at each stage? | Read boundary inputs, transformations and outputs. |
| Interaction | [Request and response](#request-and-response) | What was requested, and what returned? | Read required inputs and static-state choices; retain both directions. |
| State | [State transition, including retry and termination](#retry-and-state-transition) | What changes state, and when does work retry or terminate? | Read triggers, transition directions and terminal states; apply attempt-count rules to retry policies. |
| Overview and comparison | [Goal and resource overview](#overview-and-comparison) | What is the goal, and what resources are available? | Distinguish available, proposed and unknown resources; availability does not establish authorization or model access. |
| Overview and comparison | [Capability inventory or responsibility overview](#overview-and-comparison) | What capabilities exist, and who owns them? | Parallel cards can stand without edges; membership and layer order do not establish call order. |
| Overview and comparison | [Function matrix](#overview-and-comparison) | What functions does a system provide? | Grouping compares functions; draw dependencies only when sources establish them. |
| Convergence and capacity | [Fan-in and bottleneck](#fan-in-and-bottleneck) | Where does combined demand exceed capacity? | Read rate units, queue semantics and unknown overload behavior. |

Apply the selection rules:

1. **Match:** select the type that covers the main question. Use an explicitly requested type when it fits the source relationships. Read its linked guidance before arranging content; choose geometry for the actual content and display conditions.
2. **Several matches:** choose the primary type by the main question. Read an additional pattern when a distinct secondary question requires it, retaining each relationship's meaning. If competing interpretations change the explanation's focus, clarify that focus with the user.
3. **No match:** use free composition when no listed type covers the main question. Define the objects, main relationship, grouping and reading order, then apply the shared source-fidelity, visual-design and inspection guidance. Consult an existing pattern for any local relationship it covers.
4. **Missing facts:** clarify material gaps or retain them as unknown under the source-fidelity rules. Missing information does not establish a type mismatch. Explain SDK limits before choosing an alternative expression.

Selection is complete when a primary type and its applicable guidance are identified, or free composition has a defined main relationship and reading order. Static versus animated presentation, visual direction and layout remain separate choices. The table is an authoring index; the supported document model determines what can be expressed.

## Overview and comparison

Use for goals, resources, capabilities, responsibilities or functions that the reader needs to survey or compare. Establish the scope, the objects, the basis of grouping or comparison, and any supplied ownership or status. Organize comparable objects as parallel cards or a matrix; name matrix axes and shared capabilities. Distinguish available, proposed and unknown states. An edge requires a source-supported relationship; card order or membership alone supplies no execution order. The overview is ready when the reader can identify the comparison basis, object membership and material status or ownership differences.

For capability cards, read [the no-edge recipe](visual-design.md#capability-inventory-without-runtime-edges). The parallel core module cards in [SDK architecture](../examples/complete-project-architecture.md) demonstrate responsibilities without internal execution arrows; the complete architecture also contains explicitly sourced dependencies.

## Data flow and source mapping

Use when the reader needs to connect sources or inputs to transformations and uses. Establish each source, the mapped or transferred object, the destination, and any supplied transformation. Arrange source and destination regions around labelled mapping channels; distinguish an explanatory mapping from runtime data transfer. The diagram is ready when each important channel identifies what crosses it and how the destination uses or changes it. Read [source/service composition](visual-design.md#source-mapping-and-service-cards) or [staged data processing](#staged-data-processing). The [order pipeline](../examples/complete-order-event-pipeline.md) demonstrates actual teaching transfers, not aggregate source/service mapping.

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

Use for business or logic flows whose main question concerns work steps and outcomes. Establish the entry, step order, source-supported branches, their conditions and destinations, and the supplied outcomes. Arrange a main reading direction with distinct branch and return paths. The flow is ready when the reader can trace each important path from its entry or condition to its stated outcome; preserve unspecified continuation as unknown. Use [the process recipe](visual-design.md#process-with-branches-and-returns) for geometry.

For source-supported conditions, use a decision node and name each outgoing condition; a shape alone does not define the rule. [Basic shapes](../examples/capabilities-basic-shapes.md) demonstrates input/output, decision, defined subprocess and report shapes with ordinary labels. Its branches teach shape use, not a real approval policy. [Task lifecycle](../examples/complete-job-lifecycle.md) gives a full event-driven state explanation; do not replace a decision process with state transitions unless the source supports that meaning. Follow [preset labels](document-model.md#preset-labels) before authoring.

## Request and response

Use this pattern when the reader must distinguish an initiating request from its returned result.

- **Required input:** requester, receiver, request direction and payload, response direction and result. Ask whether failures or unsolicited events belong in scope. Keep an unspecified failure unknown.
- **Common misrepresentation:** a single forward arrow labelled “request/response” hides the return direction. A reverse flow marker does not reverse the edge's arrow; use distinct directed edges when both relations must remain readable while paused.
- **Static frame:** select the state that matches the explanation. An overview establishes the request and response directions; a static image alone does not establish that either transfer occurred. For the cache-aside example, check that the final overview retains all seven numbered messages, including the API-to-client response and its order result. For other sources, verify the supplied response direction and result; require content changes only when the source defines them.
- **Runnable JSON:** [cache-aside-sequence.json](../examples/complete-cache-aside-sequence.json). A cache miss leads to database retrieval, cache population and a response through seven ordered messages. The [note](../examples/complete-cache-aside-sequence.md) explains its static overview and unknown cache-hit/error behavior.

## Retry and state transition

Use this pattern when a reader needs to understand an object's states and the conditions for changing them, including continuing, repeating or exiting work. For a general state diagram, establish the states, trigger or condition for each directed transition, and any supplied initial or terminal states. The diagram is ready when each important transition has an identifiable source, destination and trigger or condition. Apply the following additional requirements when the state changes describe retries.

- **Required input:** states, transition direction, triggering conditions, attempt counting convention, retry limit, success exit, exhausted exit, and any stated delay or cancellation. If a limit or delay is absent, label it unknown rather than inventing it.
- **Common misrepresentation:** an unlabelled loop implies endless retry; “3 retries” and “3 total attempts” have different limits. An animated arrow does not execute a retry policy or prove that a runtime can reach a state.
- **Static frame:** show the relevant outgoing conditions and terminal states together. A failure-only crop that hides the success branch needs an explicit narrower scope. For an animated instance, pair its selected state with the policy overview if one image cannot explain both.
- **Runnable JSON:** [job-lifecycle.json](../examples/complete-job-lifecycle.json). Task A succeeds after retry, independent B exhausts its example limit, and independent C is cancelled while queued. Read its [note](../examples/complete-job-lifecycle.md). Do not apply an unrelated three-total-attempt policy to these distinct teaching cases.

## Fan-in and bottleneck

Use this pattern when several sources converge on a shared stage and their combined demand matters.

- **Required input:** each source, convergence direction, queue or merge semantics, processing capacity and units, resulting output, and any known overload policy. Separate arrival rate, storage capacity and processing rate.
- **Common misrepresentation:** line thickness or animation speed presented as measured throughput; a finite queue invented from a processing rate; extra demand silently shown as dropped, buffered forever or delayed by a numerical amount.
- **Static frame:** include all sources and the shared stage so the reader can compare stated demand with capacity. Label the comparison's assumptions; an isolated worker image cannot explain the convergence.
- **Inline capacity example:** three sources each supply one item/second and one worker processes two items/second. Sustained aggregate arrival exceeds processing capacity. Queue capacity, overload policy, observed queue length and latency remain unknown; the rate comparison supplies no simulation or exact delay. No separate capacity JSON is installed.

## Staged data processing

Use this pattern when the reader needs to follow how an input becomes a different output through ordered transformations.

- **Required input:** stage order, input and output at each boundary, transformation, and any supplied branch or error destination. Keep control dependencies distinct from transferred data.
- **Common misrepresentation:** stage names alone conceal the changing data; ordering drawn as a guarantee of success; missing error destinations silently filled with a reject store or retry path.
- **Static frame:** show adjacent stage inputs and outputs together. An intermediate-state export must identify which transformation has happened; a moving marker alone is insufficient explanation.
- **Runnable JSON:** [order-event-pipeline.json](../examples/complete-order-event-pipeline.json). Four fictional inputs become two valid orders worth CNY 200, one discarded duplicate and one quarantined invalid record. The [note](../examples/complete-order-event-pipeline.md) identifies the complete static result. This replaces the earlier raw-record/date-count illustration with a different, explicitly sourced dataset.

## System architecture with boundaries

Use this pattern when ownership or another explicitly named boundary determines how relationships should be read.

- **Required input:** components, boundary meaning, component membership, external participants and cross-boundary relationship direction. Distinguish logical ownership, deployment location and trust boundary; use the meaning actually supplied.
- **Common misrepresentation:** a group interpreted as a host, network or security boundary without evidence; proximity mistaken for membership; a database arrow interpreted as a response or replication relation.
- **Static frame:** include the boundary heading, contained components and necessary external endpoints. A focus on the API alone omits ownership context. Check crossing arrows and titles at the intended display size.
- **Inline teaching case:** a client submits an order to an API inside a logical order-service group, and the API writes to storage in that group. This establishes membership and two directed relations, not hosts, replicas, trust or return traffic. [SDK architecture](../examples/complete-project-architecture.md) demonstrates responsibility/dependency boundaries; [web deployment](../examples/complete-web-service-deployment.md) separately demonstrates explicit runtime locations and replicas.

## Layered architecture with teaching boundaries

Use this teaching pattern when a reader needs to compare layers, several columns inside a layer, and governance notes beside the main structure. The layer/governance setup here is an invented teaching pattern; it does not describe a production system. Layer order does not establish call order. A group does not imply a deployment or trust boundary unless the source says so.

- **Required input:** layer names and their intended reading relationship, the objects in each column, explicit cross-layer relation directions, heading space, and the meaning of any governance annotation. Choose [relationship scope and endpoints](#relationship-scope-and-endpoints) before placing cross-layer edges. Keep the layer order separate from execution order.
- **Common misrepresentation:** a top-to-bottom layer order is read as call timing; a group is read as a deployment, network or trust boundary; a governance edge is read as an undeclared runtime dependency. Use labels such as “非调用依赖” when the relation is explanatory only.
- **Static frame:** leave heading space inside each group, keep columns on a shared row, and route labelled edges through the gaps between groups. Measure structured content at the document's actual typography before increasing heights. Choose row heights, column gaps and label clearance for the actual content and display width; these are not general SDK layout parameters.
- **Runnable JSON:** [project-architecture.json](../examples/complete-project-architecture.json). The upstream SDK architecture separates platform-independent core, browser integration, Node tools and external showcase consumers. Topic highlights keep all geometry and dependencies visible. Arrows point from consumers to providers, not from an earlier execution stage to a later stage. Use its [source note](../examples/complete-project-architecture.md) for the actual boundaries. The fictional layered/governance teaching setup above remains an inline method example, not the facts of this SDK diagram.

## Run the installed examples

Read the [example index](../examples/README.md#run-and-inspect) for absolute installed paths, task workspaces, dark presentation defaults, static-stage selection and viewing limits. The library has six complete upstream stories and four focused capability examples; additional content and scene-state methods reuse the complete sources.

```text
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/complete-project-architecture.json" --theme dark --sources "<skill-directory>/resources/teaching-sources.json" --name project-architecture --svg --time 0 --output "<task-workspace>/history"
node "<skill-directory>/scripts/flowsvg.mjs" measure --input "<skill-directory>/resources/content-measurement.json"
```

Read current compiled times before requesting another SVG/PNG state. Copy a source into one editable task-root draft before adapting it. Measure initial and replacement content at the final typography and width. Actually view HTML and requested images; program execution and generated screenshots do not establish visual quality.

## Sample display checks

The [example index](../examples/README.md#display-conditions-and-limits) and adjacent notes state intended conditions and limitations. Re-measure and re-view affected surfaces after changes. Formal artifact evidence is only for an explicit traceability request.
