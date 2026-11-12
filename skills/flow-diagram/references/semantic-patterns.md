# Semantic patterns

Select a diagram type by the relationship the reader must understand, then use its semantic pattern to organize the content. A semantic pattern defines required objects, relationships, conditions and outcomes; layout choices follow that meaning. Every bundled scenario below is an invented teaching setup, not evidence about a real system. [Source metadata](../resources/teaching-sources.json) states its directions, conditions, quantities and unknowns. Use the matching record when adapting a sample; replace teaching assumptions with the user's evidence before describing a real system.

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

For capability cards, read [the no-edge recipe](visual-design.md#capability-inventory-without-runtime-edges) and use [capability-overview.json](../examples/capability-overview.json) as a starting point. Its teaching setup supplies no facts about the user's system.

## Data flow and source mapping

Use when the reader needs to connect sources or inputs to transformations and uses. Establish each source, the mapped or transferred object, the destination, and any supplied transformation. Arrange source and destination regions around labelled mapping channels; distinguish an explanatory mapping from runtime data transfer. The diagram is ready when each important channel identifies what crosses it and how the destination uses or changes it. Read [the source/service recipe](visual-design.md#source-mapping-and-service-cards) for comparable source and service cards, or [staged data processing](#staged-data-processing) for ordered transformations. The [teaching sources](../resources/teaching-sources.json) record invented facts and unknowns for the selected examples.

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

For source-supported conditions, use a decision node and name each outgoing condition; a shape alone does not define the rule. [approval-review.json](../examples/approval-review.json) demonstrates input/output, decision, defined subprocess and report presets. Its fictional facts define complete materials leading to review and a draft report, while missing materials return for revision. Both alternatives remain visible in this static diagram. No resubmission, approval outcome, archive action, retry count or processing time is supplied. Follow [preset labels](document-model.md#preset-labels) for safe measurement before authoring.

## Request and response

Use this pattern when the reader must distinguish an initiating request from its returned result.

- **Required input:** requester, receiver, request direction and payload, response direction and result. Ask whether failures or unsolicited events belong in scope. Keep an unspecified failure unknown.
- **Common misrepresentation:** a single forward arrow labelled “request/response” hides the return direction. A reverse flow marker does not reverse the edge's arrow; use distinct directed edges when both relations must remain readable while paused.
- **Static frame:** select the state that matches the explanation. The overview shows both relations, not proof that a response has already arrived. For a returned result, use the compiled final time; verify that the changed service content is present. A static image cannot preserve the chronological movement of the markers.
- **Runnable JSON:** [query-round-trip.json](../examples/query-round-trip.json). The teaching setup is one successful query; timeout and failure behavior are unspecified. Content changes from waiting to result-ready. Measure both versions before changing dimensions.

## Retry and state transition

Use this pattern when a reader needs to understand an object's states and the conditions for changing them, including continuing, repeating or exiting work. For a general state diagram, establish the states, trigger or condition for each directed transition, and any supplied initial or terminal states. The diagram is ready when each important transition has an identifiable source, destination and trigger or condition. Apply the following additional requirements when the state changes describe retries.

- **Required input:** states, transition direction, triggering conditions, attempt counting convention, retry limit, success exit, exhausted exit, and any stated delay or cancellation. If a limit or delay is absent, label it unknown rather than inventing it.
- **Common misrepresentation:** an unlabelled loop implies endless retry; “3 retries” and “3 total attempts” have different limits. An animated arrow does not execute a retry policy or prove that a runtime can reach a state.
- **Static frame:** show the relevant outgoing conditions and terminal states together. A failure-only crop that hides the success branch needs an explicit narrower scope. For an animated instance, pair its selected state with the policy overview if one image cannot explain both.
- **Runnable JSON:** [retry-policy.json](../examples/retry-policy.json), a static policy overview. Teaching setup: at most three total attempts including the first; temporary error with count below three waits and retries; success exits; temporary error on attempt three fails. Waiting duration and other error handling are unknown. The graph does not model a counter or run a simulation.

## Fan-in and bottleneck

Use this pattern when several sources converge on a shared stage and their combined demand matters.

- **Required input:** each source, convergence direction, queue or merge semantics, processing capacity and units, resulting output, and any known overload policy. Separate arrival rate, storage capacity and processing rate.
- **Common misrepresentation:** line thickness or animation speed presented as measured throughput; a finite queue invented from a processing rate; extra demand silently shown as dropped, buffered forever or delayed by a numerical amount.
- **Static frame:** include all sources and the shared stage so the reader can compare stated demand with capacity. Label the comparison's assumptions; an isolated worker image cannot explain the convergence.
- **Runnable JSON:** [fan-in-capacity.json](../examples/fan-in-capacity.json). Teaching setup: three sources each supply one item/second, one worker handles two items/second, and completed items leave the worker. Under sustained supply, aggregate arrival exceeds processing rate. Queue capacity, overload policy, actual length and latency are unknown; the static diagram does not simulate them.

## Staged data processing

Use this pattern when the reader needs to follow how an input becomes a different output through ordered transformations.

- **Required input:** stage order, input and output at each boundary, transformation, and any supplied branch or error destination. Keep control dependencies distinct from transferred data.
- **Common misrepresentation:** stage names alone conceal the changing data; ordering drawn as a guarantee of success; missing error destinations silently filled with a reject store or retry path.
- **Static frame:** show adjacent stage inputs and outputs together. An intermediate-state export must identify which transformation has happened; a moving marker alone is insufficient explanation.
- **Runnable JSON:** [record-transformations.json](../examples/record-transformations.json). Teaching setup: raw records → remove format errors → count valid records by date → daily report. Error-record destination, volume and timing are unknown. For conditional work without data transformations, use [application review](../examples/approval-review.md); its alternative ends at revision and establishes no retry loop.

## System architecture with boundaries

Use this pattern when ownership or another explicitly named boundary determines how relationships should be read.

- **Required input:** components, boundary meaning, component membership, external participants and cross-boundary relationship direction. Distinguish logical ownership, deployment location and trust boundary; use the meaning actually supplied.
- **Common misrepresentation:** a group interpreted as a host, network or security boundary without evidence; proximity mistaken for membership; a database arrow interpreted as a response or replication relation.
- **Static frame:** include the boundary heading, contained components and necessary external endpoints. A focus on the API alone omits ownership context. Check crossing arrows and titles at the intended display size.
- **Inline teaching case:** a client submits an order to an API inside a named logical order-service group, and the API writes to storage inside the same group. This establishes logical membership and two directed relations, not hosts, replicas, trust policy or return traffic. For deployment, name hosts and replica membership only when supplied; for trust, name the actual security boundary. The selected [layered example](../examples/layered-architecture.md) demonstrates group endpoints and membership, but its explanatory layers do not supply system-boundary or deployment facts.

## Layered architecture with teaching boundaries

Use this teaching pattern when a reader needs to compare layers, several columns inside a layer, and governance notes beside the main structure. The bundled sample is an invented teaching setup; it does not describe a production system.

- **Required input:** layer names and their intended reading relationship, the objects in each column, explicit cross-layer relation directions, heading space, and the meaning of any governance annotation. Choose [relationship scope and endpoints](#relationship-scope-and-endpoints) before placing cross-layer edges. Keep the layer order separate from execution order.
- **Common misrepresentation:** a top-to-bottom layer order is read as call timing; a group is read as a deployment, network or trust boundary; a governance edge is read as an undeclared runtime dependency. Use labels such as “非调用依赖” when the relation is explanatory only.
- **Static frame:** leave heading space inside each group, keep columns on a shared row, and route labelled edges through the gaps between groups. Measure structured content at the document's actual typography before increasing heights. The sample's row heights, column gaps and label clearance are verified starting values for this document and display width, not general SDK layout parameters.
- **Runnable JSON:** [layered-architecture.json](../examples/layered-architecture.json). It contains two columns in each of the ingress, domain and data layers, a dashed governance sidebar, labelled cross-layer edges, and auxiliary text that records unknown information. The sidebar contains policy and observability records; relationship annotations describe the two existing group relations rather than additional business entities. Layer order does not establish call order, grouping does not automatically establish deployment or trust boundaries, and governance relations do not add dependencies absent from the teaching setup. A group does not imply a deployment or trust boundary unless the source says so.

## Run the installed examples

Replace `<skill-directory>` with the absolute installed path. Run from a separate working directory and create a canonical [task workspace](tool-contract.md#task-workspace); replace `<task-workspace>` with that path. Repeat the first command with each sample name above, using its own matching diagram name and workspace. The [sources file](../resources/teaching-sources.json) preserves the bundled teaching setups; it does not assert real-world facts or fetch sources. For the layered sample, copy the installed source into the canonical task-root draft, use `measure --input <draft> --in-place` when height backfill is needed, then validate and author the same draft; keep the installed source bytes unchanged. A complete authoring result still needs actual HTML/image inspection, and program checks do not stand in for visual review.

```text
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/query-round-trip.json" --sources "<skill-directory>/resources/teaching-sources.json" --name query-round-trip --svg --time 0 --output "<task-workspace>/history"
node "<skill-directory>/scripts/flowsvg.mjs" measure --input "<skill-directory>/resources/content-measurement.json"
```

`author` performs public validation and compilation, default JSON/paused offline HTML/report delivery, requested SVG, and browser previews when a prepared browser is available. Read the report's compiled times before requesting a later SVG; regenerate current outputs. For content in another sample, create a measurement input `{kind, width, content, typography}` from that node and the document typography, using all replacement content versions; the separate measurement example illustrates the format. Actual image inspection remains required. Follow [visual inspection](visual-checks.md), and record observed problems instead of equating successful export with visual approval.

## Sample display checks

The [selected example index](../examples/README.md#display-conditions-and-limits) and each adjacent note state the primary display sizes and viewing limits. Those conditions do not establish responsive behavior or approval for another host. Re-measure changed content and typography, regenerate outputs and actually view affected files and animation stages. Use formal artifact evidence only when that additional traceability is requested.
