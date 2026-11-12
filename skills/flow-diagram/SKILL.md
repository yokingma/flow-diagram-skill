---
name: flow-diagram
description: Create and revise executable FlowSVG diagrams that explain systems, processes and state changes, with static views or animation. Validate or diagnose diagrams; export JSON, offline HTML, SVG, PNG or GIF; manage project diagram preferences.
---

# Flow Diagram

Create accurate, understandable and visually clear explanations. Design standards guide the work; judge the result by actually viewing it against the reader's question and display conditions. Invest in reading, measurement, rendering and revision when they improve the result.

This skill produces diagram assets. PPTX and native PowerPoint shapes are outside its scope. Use Node 20+ and npm; run `node <skill-directory>/scripts/flowsvg.mjs` from the user's chosen working directory. Resolve tools and references inside this installed skill. Its pinned SDK runtime leaves application dependencies untouched.

## Choose the task

| Request | Action |
| --- | --- |
| New or revised diagram | Follow the process below; preserve imported facts and requested formats outside the authorized changes. |
| Continue unfinished work | Read its source draft, `issues.md` if present and current report; resume the affected steps. See [source selection](references/diagnostics-and-revisions.md#selecting-a-parent). |
| Export without edits | Preserve selected JSON bytes and page design. Read [exports](references/export.md), then generate, view and deliver the requested files. |
| Validation only | Run read-only `validate`, report exact checks, limits and findings, then stop. |
| Visual diagnosis without edits | Follow [inspection preparation](references/visual-checks.md#inspection-only-preparation), view the requested surfaces, report findings and gaps, then stop. |
| Save, change or remove a project preference | Follow [preference writing](references/preferences.md#save-update-forget-or-reset). A one-off choice stays in this task; saving requires explicit intent to reuse it. |

## Default process

### 1. Understand

Start with the reader's question: what should this diagram explain? Read the user's designated sources or existing diagram within the authorized scope. When using designated source material, record its references and scope through [source metadata](references/tool-contract.md#source-metadata). Apply relevant [project preferences](references/preferences.md#locate-and-read) to open choices.

Use known display conditions and requested formats. For missing conditions, adopt and state the [existing defaults](references/delivery-contexts.md#preferences-and-missing-context); known PPT use remains PPT use. A clear brief can proceed directly to creation. Clarify factual gaps that change meaning, key relationships, boundaries or scope; explain SDK limits that prevent faithful expression before choosing an alternative.

Finish when the reader's question and supporting facts are clear. An independent plan is optional.

### 2. Create

For every new or revised draft, read [document model](references/document-model.md), [shared quality standards](references/visual-design.md#shared-quality-standards), [visual direction](references/visual-design.md#choose-a-visual-direction) and [visual inspection guidance](references/visual-design.md#inspect-the-visual-design). Reuse sections already loaded.

Organize content to answer the question. Reorder, group, merge duplicate explanations and select abstraction within the source meaning. Use [source fidelity](references/source-fidelity.md#before-and-after-a-meaning-change) when unknowns or information reduction affect interpretation. Ask before changing facts, key relationships, boundaries or scope.

Read the branches relevant to the work:

- **Structure:** use the [reader-question table](references/semantic-patterns.md#choose-by-the-readers-question), then the matching semantic pattern. With groups or cross-boundary edges, choose [relationship scope and endpoints](references/semantic-patterns.md#relationship-scope-and-endpoints).
- **Text and containers:** use [typography](references/visual-design.md#typography-and-content-layout), [spacing](references/visual-design.md#spacing-and-spatial-hierarchy), [color](references/visual-design.md#color-roles-and-palette) and [cards/groups/tags](references/visual-design.md#cards-groups-and-tags). With edges, read [connections](references/visual-design.md#connections-and-relationship-labels). Select a [composition recipe](references/visual-design.md#composition-recipes) when it fits; consult only relevant shape/label/routing sections in [rendering gotchas](references/rendering-gotchas.md).
- **HTML:** apply [page content](references/delivery-contexts.md#keep-the-html-page-minimal) and [editable pages](references/tool-contract.md#editable-html-pages); use the [starter](examples/html-page.html) when useful. Preserve existing page design through [page continuation](references/tool-contract.md#continue-an-existing-page).
- **Display destination:** read [PPT conditions](references/delivery-contexts.md#static-assets-for-presentations) or [article conditions](references/delivery-contexts.md#static-illustrations-in-web-content) for those uses. Independent images need their own readable context.
- **Geometry assistance:** read [measurement](references/tool-contract.md#content-measurement) when text sizing needs it. For repeated geometry, use [layout workflow](references/static-layout.md#layout-plan-workflow) and [layout-plan contract](references/layout-plan.md); irregular compositions can use direct coordinates.
- **Animation:** read [purpose](references/timeline.md#choose-the-animation-purpose), [inherited state](references/timeline.md#scenes-and-inherited-state), [transfer/emphasis and effective timing](references/timeline.md#transfer-and-emphasis) and [rhythm](references/visual-design.md#animation-rhythm-and-visual-continuity). With captions, check their [continuous reading windows](references/timeline.md#caption-reading-time). Choose stages that help explain changes or transfers.
- **Extra formats:** read [SVG/PNG](references/export.md#requested-svg-and-png), [named batches](references/export.md#named-batch-exports) or [GIF](references/export.md#gif-exports) when requested.

Before saving, read [task workspace](references/tool-contract.md#task-workspace). Keep one editable source draft at the task-workspace root; update that file throughout creation. Current HTML, requested images and machine report are replaced when regenerated. Keep one `issues.md` for material questions, diagnostics, visible problems and failures, updating location, status and handling result. Normal steps and full stdout need no log; CLI does not parse or require this Markdown.

Finish when the draft expresses the selected content and relationships. Concrete design choices belong in the draft; separate proof of design compliance is unnecessary.

### 3. Validate

Use read-only validation while editing:

```sh
node <skill-directory>/scripts/flowsvg.mjs validate --input <task-workspace>/draft.json
```

Correct exact input/reference/SDK errors. Read [diagnostics](references/diagnostics-and-revisions.md#interpreting-checks) when findings occur. Geometry and text estimates are optional aids with stated methods and limits; visible readability and connection clarity belong in viewing. When needed, `measure --input <draft> --in-place` and `layout --input <draft> --plan <plan> --in-place` update the same source draft.

Generate the current result from that source:

```sh
node <skill-directory>/scripts/flowsvg.mjs author --input <task-workspace>/draft.json --name <name> --output <task-workspace>/history
```

Read the compact result and use its real `detailsPath` for detailed timing or capture facts. Default capture covers actual HTML; `--preview` adds SDK state captures for a specific diagnosis. `--samples` adjusts needed animation capture coverage; `--browser none` skips capture for intermediate HTML. Parameters remain discoverable through `--help`.

Finish when exact errors are fixed and requested inspection files exist, or an execution gap and its affected files are identified. A successful machine check is an execution fact.

### 4. View and revise

Read [actual HTML inspection](references/visual-checks.md#actual-offline-html). View the saved HTML, its captured images and requested SVG/PNG at intended dimensions and background. Trace important edges to their arrowheads; assess text, hierarchy, boundaries and reading order with the design guidance. For animation, read [key stages](references/visual-checks.md#check-the-selected-key-stages), view initial/important/final states and play it to judge pacing. HTML viewing does not substitute for actual exported-image viewing.

Edit the same source draft when the picture reveals a problem, regenerate and re-view affected files or stages. Record substantive problems in the same `issues.md`. Finish when needed surfaces have been viewed and findings corrected and rechecked, or retained problems and viewing gaps have a stated reason and effect. File completion alone does not establish a high-quality result.

Only an explicit request for traceable review or audit adds [formal review inputs](references/review-inputs.md) and, for images, [formal artifact evidence](references/artifact-evidence.md). Use `author --formal-review` to retain a stable source and use its returned `v###` for formal commands. Historical comparison/rollback requests use `--checkpoint`. These steps are independent of animation, complexity and output format; later ordinary edits continue the mutable current draft.

### 5. Deliver

Read [finalization](references/tool-contract.md#finalize-the-task). Publish current JSON, paused offline HTML, `report.json`, `report.md` and requested formats:

```sh
node <skill-directory>/scripts/flowsvg.mjs finalize --workspace <task-workspace> --name <name>
```

If issues remain, summarize their effects in Agent-authored Markdown and pass `--notes <summary.md>`; the CLI copies it without interpreting or grading it. Verify final paths under `.diagrams/<diagram-name>/` and scoped workspace cleanup. Keep history or work records only when requested.

Lead with the viewable result and links. Briefly explain how the structure answers the reader's question and any material assumptions or information choices. Report file completion, machine checks, actual viewing (files, dimensions and animation stages) and unperformed checks separately. Default reports state formal review is not requested; registered formal coverage describes evidence and viewing, with viewer issues reported separately from design acceptance.

Finish when files and notes are published and linked, viewing scope and remaining limitations are clear, and cleanup or requested retention is verified.

## Recover interrupted work

On execution failure, retain the source draft, `issues.md` and available files. Read the relevant [recovery branch](references/troubleshooting.md), correct the cause within authorization, then retry the affected operation against current. A previous complete `.recovery` result retains its own source identity and cannot represent a changed draft. Preserve any prior published delivery.

After interruption, inspect remaining task files and continue the unfinished work; use explicit retained checkpoints only when needed. Stop repeated retries without new evidence and report the next action. On user cancellation, stop commands and retain work; resume when asked.
