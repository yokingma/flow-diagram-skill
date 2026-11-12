---
name: flow-diagram
description: Create and revise executable FlowSVG diagrams to explain systems, processes, and state changes with static views or animation. Validate or diagnose diagrams and export JSON, offline HTML, SVG, PNG, or GIF. Manage project preferences for FlowSVG diagrams. Reuse the document for playback and SDK embedding.
---

# Flow Diagram

Flow Diagram is the authoring skill for executable system and process diagrams: author once, then play, embed, inspect, and export the result.

Turn descriptions and source material into **visual explanations**: static or animated diagrams that make structures, relationships, and processes clear. The aim is to preserve the source meaning and help readers understand how things are organized, connected, and change over time.

## Choose the task

This skill produces diagram assets; PPTX files and native PowerPoint shapes are outside its scope.

Identify the task type, the input to use, and where to enter or resume the process.

| Request | Starting point |
| --- | --- |
| New diagram or JSON import that will be authored or revised | Start at step 0 and follow all five authoring steps. Preserve unchanged imported bytes where required. |
| Revise a finalized diagram | Read the existing diagram and final report. Establish the requested changes and scope, then start at step 0. Reuse valid design decisions and carry forward requested formats unless the user changes them. |
| Export an existing diagram without edits | Consult [project preferences](references/preferences.md#locate-and-read) only for a material export choice still open. Run `author` using the [export options](references/export.md). Preserve the selected JSON bytes and page design; skip drafting, styling, measurement, and layout changes. Inspect and finalize in steps 4 and 5. |
| Continue an unfinished task | Read the task records and select the saved revision to continue. Resume at the unfinished steps or those affected by changes. |
| Validation only | Use read-only [validation](references/tool-contract.md#revisions-and-reports). Report the checks performed, their limits, and discovered issues, then stop. |
| Visual diagnosis without edits | Follow [inspection-only preparation](references/visual-checks.md#inspection-only-preparation), then the applicable checks in step 4. Report findings, evidence, and coverage gaps, then stop. |

When the user clearly sets a default for future diagrams in this project or asks to save, change, forget or reset a preference, follow [preference management](references/preferences.md#save-update-forget-or-reset). Report standalone operations without creating a diagram.

For imports, revisions, or exports from existing diagrams, read [input and parent selection](references/diagnostics-and-revisions.md#selecting-a-parent). Before creating task files, read [task workspace requirements](references/tool-contract.md#task-workspace); for validation commands and report states, read [runtime and result contracts](references/tool-contract.md).

Proceed when the input, authorized changes, and process entry point are clear.

## Process

### 0. Resolve project preferences

For new and revised drafts, follow [project preferences](references/preferences.md) before step 1. Apply relevant defaults only to open choices and record their sources. Resolve remaining material gaps with the delivery context. Verify any authorized save or report its failure. Resume unfinished tasks with their recorded decisions, revisiting preferences only when a relevant choice changes.

### 1. Define the explanation goal

Start with the reader's question: what should the reader understand after viewing the diagram? Use this question to guide later content, layout, and animation decisions.

- **Define the question.** Identify the subject and what the reader should understand from the user's request.
- **Establish the facts.** Read the user's designated sources or existing diagram within the authorized scope. Identify relevant objects, relationships, processes, and state changes. Distinguish known facts from information that needs clarification, and record sources through [source metadata](references/tool-contract.md#source-metadata).

  For broad investigations, such as exploring a code repository, investigate the parts relevant to the reader's question. When the host supports sub-agents and delegation is permitted, delegate bounded parts with that question and authorized source scope; otherwise investigate them in the current session. In either case, collect relevant objects, relationships, processes, and state changes, with source locations and unresolved questions. Use those findings to establish the facts needed for the explanation.

  For a few articles, a small set of reference materials, or a short request such as "Explain the RAG workflow with a flowchart," establish the facts in the current session.

- **Record the requirements.** Capture the audience, usage context, and delivery requirements already specified by the user. Follow [missing delivery context](references/delivery-contexts.md#preferences-and-missing-context) to reuse known choices, collect relevant gaps once, and record adopted assumptions before choosing geometry.

Proceed when you can state the reader's question in one sentence and identify the facts supporting its answer. Clarify information gaps that would change the diagram's meaning before drafting. If the SDK cannot express the request faithfully, explain the limit and wait for the user's choice.

### 2. Design the visual explanation

Choose how to present the subject so the reader can answer the question defined in step 1.

For new or revised drafts, read [delivery contexts](references/delivery-contexts.md) before choosing the canvas and density, including when the purpose is unknown. Use the [reader-question selection table](references/semantic-patterns.md#choose-by-the-readers-question) for capability inventories, responsibilities, resource status, requests and responses, state transitions, data processing, or architecture.

- **Learn from relevant failures.** Before choosing the structure and visual direction, consult [rendering gotchas](references/rendering-gotchas.md) for failure conditions relevant to the content and display context. Use the reader's question to judge which candidate treatments fit; record decisions that materially affect the design.
- **Select the content.** Choose the objects, relationships, processes, and states needed for the explanation. Before omitting or aggregating content or deciding how to present unknown source information, read [source fidelity and information choices](references/source-fidelity.md). Preserve the source meaning in these choices.
- **Allocate content to its surface.** Before diagram geometry, follow [content placement](references/delivery-contexts.md#content-placement) and the [page content contract](references/delivery-contexts.md#keep-the-html-page-minimal) to assign content to the page, diagram and delivery explanation. Record the allocation and the context required by each requested format.
- **Organize the structure.** Define groups, hierarchy, and reading order so the reader can identify the main points and follow their relationships. For grouped or layered views, select [relationship scope and endpoints](references/semantic-patterns.md#relationship-scope-and-endpoints) before geometry; record collective relationships and necessary component exceptions.
- **Set the visual direction.** Follow [visual design](references/visual-design.md#choose-a-visual-direction) to select a direction for the usage context. For layered structures with a sidebar, processes with branches or returns, or repeated cards with longer content, select an applicable [composition recipe](references/visual-design.md#composition-recipes). Record the concrete choices required for production.
- **Choose static diagrams or animation.** Use static layout to explain structures and relationships. For animation, distinguish [persistent relationship flow, attention and staged change](references/timeline.md#choose-the-animation-purpose); a request for flowing lines can keep the entire diagram visible.
- **Plan the animation narrative.** When using animation, follow [animation rhythm and visual continuity](references/visual-design.md#animation-rhythm-and-visual-continuity) to define each stage's explanation goal, state changes, transitions, and reading pauses.

Proceed when the plan records the selected content, its carrying surfaces, groups, reading order, visual choices, and static or animated presentation. For grouped or layered views, establish the intended relationship level and resolve ambiguity that would change the meaning before geometry. For animation, include the stage plan and the key stages that need inspection to answer the reader's question.

### 3. Create the diagram

Implement the design from step 2 and generate the artifacts needed for inspection in step 4.

Use Node 20+ and npm. Run `node <skill-directory>/scripts/flowsvg.mjs` from the user's chosen working directory, with quoted paths when needed. Resolve tools and task resources within this installed skill. The CLI prepares its own pinned SDK runtime without changing application dependencies.

- **Read the relevant authoring guidance.** For new or revised drafts, read [the document model](references/document-model.md) and [layout guidance](references/static-layout.md), and adapt the selected [design recipes](references/visual-design.md#design-methods-and-recipes). Revisit [rendering gotchas](references/rendering-gotchas.md) when the chosen shapes, labels, routes or changed dimensions expose a relevant technical risk. For animation, also read [scenes, inherited state, and timing](references/timeline.md). For requested SVG, PNG, or GIF files, read [export options and limits](references/export.md).
- **Build the diagram document.** For new or revised drafts, implement the planned objects, groups, connections, text, and animation stages. Use the selected label language and visual direction while preserving source meaning. Use the endpoints selected by [relationship scope](references/semantic-patterns.md#relationship-scope-and-endpoints), then apply [connection design](references/visual-design.md#connections-and-relationship-labels) to choose ports, routes and label space. For a new diagram without a specified direction, start with a light theme and rounded groups. Measure text on the complete draft and follow the [layout plan workflow](references/static-layout.md#layout-plan-workflow) when repeated geometry needs a plan. Compare every object, relationship direction, parent boundary, and state change against the sources. Save authorized changes in a new workspace draft; for an unchanged import or export, use the selected input bytes directly.
- **Validate and correct.** Use read-only `validate` during iteration and read every diagnostic. It returns exact input identity and finite checks without creating a diagram revision; keep the working draft. Apply corrections within the current authorization, following [diagnosis and revision decisions](references/diagnostics-and-revisions.md). Clarify corrections that would change the explanation's meaning with the user.
- **Compose the HTML page.** For new or revised HTML explanations, implement step 2's page allocation under the [page content contract](references/delivery-contexts.md#keep-the-html-page-minimal) and submit the HTML/CSS through [editable HTML pages](references/tool-contract.md#editable-html-pages). For an existing result, follow [page continuation](references/tool-contract.md#continue-an-existing-page) to preserve its design and explicitly synchronize intended diagram changes. Reuse the installed starter for new pages when useful; preserve the managed player region and keep the complete page in the task workspace.
- **Generate inspection artifacts.** Before browser capture or choosing a preview sample count, read [browser preparation and sampling](references/visual-checks.md). Use `author` to produce the required offline HTML, needed previews, and requested export files. Use `author --browser none` when only intermediate HTML is needed. For several named static states, follow [named batch exports](references/export.md#named-batch-exports); confirm selected times from actual compiled beats with the user before binding the manifest. Follow the [runtime and result contracts](references/tool-contract.md) for setup, SDK compatibility, and report fields; use CLI `--help` for command options.

Proceed when the draft implements the plan, or an unchanged input is preserved, blocking errors are resolved, remaining diagnostics have recorded handling decisions, and all required files for inspection are complete. On export failure, follow the recovery rules below and report completed and unfinished files separately.

### 4. Inspect the result

For delivered SVG/PNG, follow [on-demand artifact evidence](references/artifact-evidence.md): run `evidence` against the explicit saved subject, then view and independently review its images. Existing valid conditions are reused; new conditions stay unviewed until inspected.

View the generated diagram and confirm that it explains the subject accurately and clearly.

- **Check semantic accuracy.** Compare objects, relationship directions, group boundaries, and state changes against the sources. Check endpoint scope against the selected view: collective relations reach groups, specific exceptions reach their named components, and membership uses containment. Confirm that omissions and aggregation preserve the source meaning.
- **Check visual readability.** View actual rendered images at the intended display size. Inspect text, spacing, occlusion, and reading order. Trace each relevant connection from its source through bends and crossings to its arrowhead; check ports, labels, and clearance from unrelated nodes.
- **Assess visual design.** Follow [visual design inspection](references/visual-design.md#inspect-the-visual-design) to identify visible defects and record observations for the user's final design judgment.
- **Check the animation explanation.** For animation, follow [key-stage inspection and supplementation](references/visual-checks.md#check-the-selected-key-stages) to match the stage plan to compiled times, captures and actual viewing. Supplement missing stages with existing capture or export capabilities, or disclose the gap and its impact. Use actual playback when assessing pacing; report sample-only inspection as limited to the viewed states.
- **Check the delivered files.** Have the tool open the actual saved offline HTML and apply the [page completion checklist](references/delivery-contexts.md#page-completion-checklist) while checking its initial paused state, controls, offline requests and relevant playback states. View its captured images through the [HTML inspection workflow](references/visual-checks.md#actual-offline-html). Inspect requested export files as delivered; use [target-size artifact inspection](references/artifact-evidence.md) for final SVG/PNG files.

Before submitting reviews, read [the complete review input contracts and template workflow](references/review-inputs.md). Generate an unviewed form with `review-template` from the explicit diagram subject and, for separate formal evidence, `--evidence-from`, then use independent `review` for HTML, preview and formal SVG/PNG observations and record the IDs, hashes, observations, and issues only for images actually viewed. Repeated review submission does not require another diagram version. When a browser or image viewer is unavailable, record the unperformed checks and their impact explicitly.

For diagnosis-only tasks, report discovered problems and stop. For authoring or revision tasks, return to step 3 to apply authorized corrections, regenerate the artifacts, and inspect the affected files and states again. Follow [diagnosis and revision decisions](references/diagnostics-and-revisions.md) when recording issues or clarifying meaning-changing corrections with the user.

Finish when each required file, state, and display condition has been inspected or its unperformed checks are explicit, and every observed issue has a recorded handling decision.

### 5. Finalize and deliver

Turn the selected diagram into a delivery the user can view, use, and continue editing, and describe its completion status accurately.

Deliver one selected diagram with editable JSON, paused offline HTML with controls, `report.json`, and `report.md`, plus any SVG, PNG, or GIF files in the delivery plan.

- **Confirm the final version.** Select the revision for delivery and verify that the requested files are complete and match the source and outputs covered by step 4's inspection records or explicit inspection gaps.
- **Publish and organize the delivery.** Follow [finalization](references/tool-contract.md#finalize-the-task) to publish `.diagrams/<diagram-name>/`. Verify the returned final-file paths and task-workspace cleanup status. Preserve history or debug evidence when the user explicitly requests it; keep cleanup scoped to this task workspace.
- **Present the result.** Show the selected final diagram or a directly openable entry point first. Then provide the editable JSON and requested export files, using verified final-file paths.
- **Explain results and limits.** Summarize the selected structure and why it answers the reader's question, adopted preferences and display assumptions, checks performed, display and animation coverage, retained warnings, and unresolved issues. Explain omissions or aggregation that affect interpretation. Report file completion and quality coverage separately, following the [report contracts](references/tool-contract.md#revisions-and-reports). Report these as tool and inspection results; the user judges the final design.

Finish when the final files have been verified and linked, check results and limitations have been explained, and workspace cleanup or intentional retention has been confirmed. Report cleanup failures even when the published files remain available.

## Handle failures and interruptions

When a task fails, is interrupted unexpectedly, or is cancelled by the user, follow [failure recovery](references/troubleshooting.md) and the conditions below.

- **Execution failure.** Retain the draft, completed files, and available error reports. Explain the failed stage and reported cause. Address the cause within the current authorization, then retry the affected operation. Follow [operation-specific recovery](references/troubleshooting.md): `author` reserves a new revision, `review` and `evidence` use independent records, and `validate` writes no diagram history. If the same failure recurs without new evidence, stop retrying and report the next recovery action.
- **Unexpected interruption.** Inspect the task records and files that actually remain. Identify completed and unfinished steps. Follow [input and parent selection](references/diagnostics-and-revisions.md#selecting-a-parent) to choose an explicit saved revision for recovery. Once the interruption cause is addressed within the current authorization, resume the unfinished or affected steps; a resumed `validate` call checks existing bytes without writing history; `author` saves a new revision.
- **User cancellation.** Stop current commands and further retries. Retain existing results and report their saved locations and unfinished work. Resume only after the user asks to continue.

Handling is complete when the retained results, current task status, unfinished work, and conditions for continuing have been verified and explained.
