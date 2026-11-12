# Flow Diagram user guide

[简体中文](flow-diagram-guide.zh-CN.md) · [Documentation map](../README.md)

**Flow Diagram is the skill for executable diagrams that explain systems and processes. Author once, then play, embed, inspect, and export.**

The skill authors the diagram document and guides its inspection. The FlowSVG SDK renders and plays that document; application embedding uses the SDK integrations. The [SDK manual at the source snapshot](https://github.com/yokingma/FlowSVG/blob/726a31bb52c0af50439d6bdf1d087814af48f70c/docs/guides/sdk-guide.md) is the authority for SDK APIs; bundled references remain available offline for the Skill workflow. Executable diagrams play authored visual states and transitions; they do not execute the system or business process being explained.

This guide explains how to install and use Flow Diagram in a coding assistant. Describe the reader's question and source facts in natural language. The assistant understands, creates, validates, views and revises, then delivers one selected final diagram. A task uses one editable source draft, current generated files and one temporary `issues.md` for substantive problems. Default delivery includes JSON, paused offline HTML and reports. Successful finalization removes the task workspace; failed work remains recoverable. Immutable checkpoints and registered formal review are added only when explicitly requested.

The skill is experimental and uses an exact registry SDK baseline. The supported SDK version is exactly `0.3.1`; installations still use the exact version and integrity recorded by the runtime manifest and lockfile. Platform and assistant-host verification is limited. See [known platform limits](../development/flow-diagram-maintenance.md#ci-and-platform-evidence) and the [host verification procedure](../development/flow-diagram-maintenance.md#host-verification). Installation instructions do not establish that every host and platform has passed acceptance.

The initial independent Skill release is `0.1.0`. Install through the Skills CLI or a complete manual copy as described in [Install in a host](#2-install-in-a-host). Use the `v0.1.0` tag for a fixed checkout. The exact SDK baseline is `flowsvg@0.3.1`; SDK upgrades require an explicit manifest/lock update and independent acceptance.

After an SDK upgrade, historical reports and viewing evidence retain their original SDK identity. Re-export requested images under the new baseline and inspect them again. A filled Agent HTML page from another SDK is rejected even with `--sync-html`; preserve the original and follow [SDK upgrade recovery](../../skills/flow-diagram/references/troubleshooting.md#continuing-after-an-sdk-upgrade) to prepare a fresh managed region.

## Documentation and task routing

This guide covers installation, creation, revision, validation and export for human users. [SKILL.md](../../skills/flow-diagram/SKILL.md) defines the Agent workflow. For tests, installation boundaries and acceptance scope, read the [maintenance guide](../development/flow-diagram-maintenance.md). User guides stay in the project's `docs/` directory; installing and running the skill does not require copying them.

| Task | Next step | Completion standard |
| --- | --- | --- |
| Create a diagram | Read [Create your first diagram](#3-create-your-first-diagram), then consult the relevant semantic pattern and delivery references | The selected final diagram links saved JSON, HTML, checks and unresolved items |
| Create from sources | Read [Create from designated sources](#4-create-from-designated-sources) and [source fidelity and information choices](../../skills/flow-diagram/references/source-fidelity.md) | `sources.json` and the report record the authorized sources and decisions |
| Manage project preferences | See [Preferences, purpose and display size](#31-preferences-purpose-and-display-size) | The assistant reports what was saved, forgotten or reset |
| Revise a diagram | Read [Revise an existing diagram](#6-revise-an-existing-diagram) | The result identifies the selected input and records changes and decisions |
| Diagnose without edits | Follow [inspection-only preparation](../../skills/flow-diagram/references/visual-checks.md#inspection-only-preparation) | The assistant reports findings, evidence and gaps without publishing a replacement |
| Export static images or GIF | Read [Export SVG, PNG or GIF on request](#7-export-svg-png-or-gif-on-request) and [export options](../../skills/flow-diagram/references/export.md) | The report accounts for each requested format; missing browsers leave dependent exports unfinished |
| Validate only | Read [Validate only, or use the command line](#8-validate-only-or-use-the-command-line) | The result reports checks and diagnostics without saving a diagram revision |
| Recover an interrupted or failed task | See [troubleshooting](../../skills/flow-diagram/references/troubleshooting.md) | The assistant reports retained files and what remains unfinished |

## Suitable tasks

- **Presentation assets:** create diagrams of architectures, processes and state changes. Request SVG, PNG or GIF for use in presentation software.
- **Web explanations:** create diagrams that readers can pause and revisit in offline HTML. Use SDK integration to embed a player in an application.
- **Teaching and training:** explain requests, data flows and task lifecycles step by step.
- **Reviews and retrospectives:** combine a structural overview with interactions or failures supported by your sources.

Specify the audience, display size and output formats to help the assistant choose information density and pacing. JSON and offline HTML remain the default delivery. Request SVG, PNG or GIF when needed, or set a project preference for repeated use. The skill creates diagram assets, not PPTX files or native PowerPoint shapes. Import and playback behavior depend on the presentation software.

The assistant uses [visual design methods](../../skills/flow-diagram/references/visual-design.md) to coordinate text, spacing, color, containers, connections and animation. These standards guide production and visual revision; they are not an acceptance gate. Actual viewing against the reader's question and display conditions supports design judgments. Machine success or registered coverage does not establish design approval.

A clear request can proceed directly to creation. The assistant may reorder, group, merge duplicate explanations and choose abstraction while preserving meaning. It asks before changing facts, key relationships, boundaries or scope, or when the SDK cannot express the request faithfully. An independent plan or design-compliance record is unnecessary.

The bundled [semantic pattern guide](../../skills/flow-diagram/references/semantic-patterns.md) covers request/response, retries and state transitions, fan-in and bottlenecks, staged data processing, system boundaries, and a layered architecture teaching setup. Its examples are labeled teaching scenarios that can serve as starting points; real business relationships must come from your sources. The [delivery context guide](../../skills/flow-diagram/references/delivery-contexts.md) explains sizes and inspection scope for presentation assets, web illustrations and offline interactive HTML. The tool has no formal delivery-context preset field or CLI preset; documented sizes are starting suggestions. SVG, PNG and GIF are available on request. PNG and GIF require a runnable Chrome/Chromium executable.

For flowchart decisions, input/output, reports and defined subprocesses, use the four [preset shapes](../../skills/flow-diagram/references/document-model.md#preset-labels). They support plain labels and reject structured content. The [mixed approval flow](../../skills/flow-diagram/examples/mixed-approval-flow.json) is a fictional teaching example with a visible missing-materials branch and an animated complete-materials path. Run `measure` on the full draft to include all preset label replacements; widen nodes when width diagnostics remain. `layout` stays static-only: establish geometry before adding scenes, then remeasure and recheck spacing. For standalone preset experiments, `label` can be a string (including empty) or a nonempty version array. Batch labels remain descriptive metadata.

For a layered architecture exercise, start with [layered-architecture.json](../../skills/flow-diagram/examples/layered-architecture.json). It intentionally has multiple columns in each layer, heading space inside groups, labelled cross-layer edges and a governance sidebar. Layer order does not establish call order, grouping does not automatically establish deployment or trust boundaries, and dashed governance annotations do not add undeclared runtime dependencies. Copy the example into the task workspace, use `measure --input <draft.json> --in-place` when height backfill is needed, then author from that same source; the recorded row heights, column gaps and label clearance are verified starting values for this example and its typography, not general layout parameters.

During design, consult [rendering gotchas](../../skills/flow-diagram/references/rendering-gotchas.md) for relevant failure conditions; adapt their candidate treatments to the reader's question and display context. Revisit technical details as the draft develops. For layered structures with sidebars, branching processes with returns, or repeated cards with longer content, the [composition recipes](../../skills/flow-diagram/references/visual-design.md#composition-recipes) offer starting points; [recipe sample checks](../../skills/flow-diagram/examples/README.md) distinguish those starting points from capability demonstrations. Recheck at your actual display width. Decide which logs must survive cleanup when [creating task files](../../skills/flow-diagram/references/tool-contract.md#task-workspace).

## 1. Prepare the environment

- Install Node.js 20 or later and npm. The assistant's environment must be able to find `node` and `npm`.
- The first runtime preparation needs network access to fetch the locked npm packages. A complete cache can then be reused offline; npm must remain available.
- Screenshot inspection, PNG export and GIF export require a prepared local Chrome/Chromium executable. JSON, HTML and SVG generation do not require a browser.

The skill includes a browser control library, but no browser executable, and never downloads a browser automatically. A host's built-in browser tool does not necessarily expose an executable that the skill can use. Provide the Chrome/Chromium path when needed.

For direct CLI use, run `node <skill-directory>/scripts/flowsvg.mjs --help` or append `--help` to `author`, `validate` or `measure` to see the current options. `author --samples <count>` selects a smaller deterministic preview plan when a focused visual review is sufficient; the report lists omitted candidates.

To size structured-content and label-only nodes from the draft itself, run `measure --input <draft.json>`. The command associates each node ID with its current and required height, height change and deterministic estimated line count, using the draft's typography. The line count is a public-SDK estimate, so it is not browser pixel or formal SVG/PNG evidence. Structured content includes every initial and animated replacement version. Use `--in-place` to backfill the same canonical task-root source draft; generated current JSON, checkpoints, external files and aliases remain protected. Backfill increases heights only and rejects unsupported animated width/height changes. Use `--output <new-draft.json>` instead only for an explicit separate copy; it preserves the source and never overwrites an existing target. Cancellation and save failure preserve the source. Reauthor after edits; finalization rejects stale generated files. SDK overflow estimates are auxiliary and allow backfill to continue. Coordinate positions and inspect the actual generated image.

Add `--lines` to `measure --input <json>` when you want source-bound `estimatedLines` before rendering. The flag adds one list per result or draft node, retains all already-measured versions and distinct text roles, and leaves default output, heights, diagnostics and backfill unchanged. Batch labels remain metadata; ordinary draft labels remain initial-only. Records can extend outside the safe area and their count need not equal the baseline count. They are estimates for inspection, not actual visible glyphs or automatic readability judgments. Failed complete-draft measurement still returns only diagnostics; `--output` never writes the records into the document. Other commands reject this flag. See [estimated text lines](../../skills/flow-diagram/references/tool-contract.md#inspect-estimated-text-lines).

When measurement reports a problem, follow `sourcePath` (and draft `location`) to the actual node, block or animated action. `objectId` preserves the node ID; SDK `path`, `versionIndex`, `dimension` and `message` remain available. `nextStep` separates width/safe-area checks from fixed graph-block height and local-coordinate checks. Increasing outer node height cannot solve horizontal overflow or enlarge a fixed graph block; increasing graph-block height alone cannot correct negative extents. Failed complete-draft measurement returns diagnostics only and publishes no backfill. This means the requested operation did not complete, not that the diagram is visually invalid. Checks stop at the failing stage, so the diagnostics are not an exhaustive problem list. Independent and batch inputs retain measurement results with SDK diagnostics. Inspect actual images separately. See [measurement diagnostics](../../skills/flow-diagram/references/tool-contract.md#locate-sdk-measurement-diagnostics) and [failure and file protection](../../skills/flow-diagram/references/tool-contract.md#write-a-height-filled-draft).

For repeated static geometry, use the [layout plan workflow](../../skills/flow-diagram/references/static-layout.md#layout-plan-workflow). The Agent chooses semantic structure, ownership, order and overrides; the layout strategy computes coordinates for existing IDs. Use direct coordinates when the scene is irregular. A plan only changes geometry and does not infer meaning or remove warnings. The bundled [layout assistance teaching draft](../../skills/flow-diagram/examples/layout-assistance.json) and [plan](../../skills/flow-diagram/examples/layout-assistance-plan.json) are invented teaching data; their gaps are not general spacing promises.

The optional layout command needs a static draft and explicit layout plan. After optional `measure --in-place`, run `layout --input <draft> --plan <layout-plan.json> --in-place`, then validate and author the same source. Measured heights are lower bounds; `overrides[id].height` stays exact. Optional `--geometry` returns finite auxiliary estimates. Layout is a geometry result, not design approval. View requested SVG/PNG at intended size and background; [registered artifact evidence](../../skills/flow-diagram/references/artifact-evidence.md) is added for an explicit formal review.

## 2. Install in a host

For ordinary installation, use the Skills CLI from any project:

```sh
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram
```

The command selects `flow-diagram`; the CLI selects a detected assistant or asks you to choose one. For a non-interactive installation across projects for the current user, choose the command for your host:

```sh
# Codex
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --global --agent codex --yes

# Claude Code
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --global --agent claude-code --yes
```

Without `--global`, the installation is project-local. Git must be available for GitHub installation. End users need Node and npm, not the repository's pnpm development dependencies.

For a project installation, `npx skills list` shows installed skills and `npx skills update flow-diagram` updates this Skill. For a global installation, use the explicit scope:

```sh
npx skills list --global
npx skills update flow-diagram --global
```

The update command changes installed files. The repository URL follows its default branch, so updates may change Skill behavior. For reproducibility, use a reviewed tag or commit through the manual checkout below. Skill distribution, tool-report, and SDK versions are separate identities.

### Manual installation and fixed checkouts

Clone the repository, or download and extract its source ZIP:

```sh
git clone https://github.com/yokingma/flow-diagram-skill.git
cd flow-diagram-skill
git rev-parse HEAD
```

For a fixed installation, check out the `v0.1.0` release tag before copying and record the commit printed by `git rev-parse HEAD`.

Copy the entire `skills/flow-diagram/` directory to one of the locations below. Keep `LICENSE` and preserve the relative positions of `SKILL.md`, `agents/`, `scripts/`, `references/`, `examples/` and `runtime/`, including the runtime manifest and lockfile. `agents/openai.yaml` configures the Codex display name and short description; the invocation name is `$flow-diagram`. Copying only `SKILL.md` cannot run the tools.

| Host | Current project only | Multiple projects for the current user | Explicit invocation |
| --- | --- | --- | --- |
| Codex CLI / IDE extension | `<project>/.agents/skills/flow-diagram/` | `~/.agents/skills/flow-diagram/` | `$flow-diagram`; also discoverable through `/skills` |
| Claude Code | `<project>/.claude/skills/flow-diagram/` | `~/.claude/skills/flow-diagram/` | `/flow-diagram` |

For a first user-level installation, run from the cloned repository. These commands require that the destination `flow-diagram` directory does not already exist.

macOS/Linux (Codex):

```sh
mkdir -p "$HOME/.agents/skills"
cp -R skills/flow-diagram "$HOME/.agents/skills/flow-diagram"
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" prepare
```

Windows PowerShell (Codex; installation example, not Windows acceptance evidence):

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse -Path "skills/flow-diagram" -Destination "$HOME/.agents/skills/flow-diagram"
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" prepare
```

For Claude Code, use `.claude/skills` in place of `.agents/skills`. For project-only installation, use the target project's directory in the table rather than your home directory. To update, back up the installed directory, then replace it with the complete selected version; merging copies can retain removed scripts or references.

`~` means the user's home directory, usually `C:\Users\<username>` on Windows. For other hosts, use their existing skill installation mechanism and ensure that the assistant can read the directory and execute Node commands. These locations come from host documentation; they do not establish tested support for every host.

After installation, open the host in the target project or working directory and explicitly select `flow-diagram`. If Codex does not show the new skill, restart Codex and check again. Follow other hosts' discovery or reload instructions.

First ask the assistant to inspect the environment:

```text
Use the flow-diagram skill to check whether this environment can run it.
Report the status of Node, npm and the browser.
```

`doctor` checks Node, npm and the cache, but not the browser. Check browser availability separately and confirm it during an actual screenshot or GIF task. The first authoring task automatically prepares isolated dependencies. It does not require installing FlowSVG in your project or changing the project's dependency manifest.

## 3. Create your first diagram

In Codex, send:

```text
$flow-diagram
Create a static architecture diagram: a client calls an API service, and the API service queries a database.
The API service and database belong to the "Order platform"; the client is outside that boundary.
Use English labels and a light theme. Name the diagram order-platform and output it in the current working directory.
```

In Claude Code, replace the first line with `/flow-diagram` and keep the other requirements. You can also say "use the flow-diagram skill" in a host that supports automatic selection.

Include the objects, relationship directions, group boundaries and explanation goal. When the request is clear, the assistant completes the initial layout directly. It asks first when a key meaning, such as a relationship direction, is unclear. If the SDK cannot express your request, the assistant explains the limit and asks you to choose an alternative.

For presentation assets, add concrete constraints:

```text
This diagram is for a 16:9 technical review presentation. Use short English labels that are readable on a projector.
Also export a static SVG. I will import it into presentation software; no PPTX file is needed.
```

For a process or state change, explicitly request animation:

```text
Use the flow-diagram skill to show a client sending a request to an API service and receiving a response.
Start with the full diagram, show the request and response in order, then return to the full diagram.
Name the diagram request-response and deliver the default JSON and offline HTML.
```

## 3.1. Preferences, purpose and display size

The assistant reads [project preferences](../../skills/flow-diagram/references/preferences.md) from `.diagrams/preferences.md` under the current working directory or the project root you specify. It reads them for new drafts, revisions, and export-only tasks with an unresolved option they can fill. Validation and diagnosis skip the record. Your current request and mandatory project rules take priority; revisions keep design and delivery choices outside the requested changes.

Say “Use Chinese labels for architecture diagrams in this project from now on” or “Include SVG by default for review deliveries” to save a project preference. The assistant records one reusable choice per Markdown list line. A one-off adjustment or repeated feedback stays in the current task; the assistant only asks about saving when you express a lasting choice whose scope or value is unclear. Source facts, relationships, specific coordinates and actual display conditions stay with the task.

You can change a preference, forget one, or reset the record. A change replaces the previous value for the same scope; a specific exception can have its own line. If conflicting lines affect the current task, the assistant points them out and continues without that default. Failed writes or deletions are reported. Reset removes only `.diagrams/preferences.md`. The old `.diagrams/.preferences.json` stays untouched and no longer applies. To keep an old choice, add it to the Markdown or ask the assistant to save it again.

When purpose is unknown, the assistant adopts a static Web composition with a 960 × 600 canvas, an assumed 720 CSS px display width and light background unless an applicable preference changes the appearance. It states these assumptions; no “use defaults” confirmation is required. Known PPT use keeps its context. Default files are JSON, paused offline HTML and reports; extra formats come from your request or an applicable project preference. Saving a project preference still requires explicit future-reuse intent.

For PPT assets, specify full-slide or local placement, available width **and height**, background, and whether the slide or the asset carries the title and footer. Known PPT use stays in that context; missing exact dimensions are recorded as assumptions. Target-size viewing covers those conditions; actual PowerPoint/WPS integration is reported separately. For animation, specify browser HTML playback or GIF; MP4, PPTX and native PowerPoint animation are outside this skill's export capability.

If you need an image to import into a slide, specify SVG or PNG. With no requested image format, the assistant keeps the default file set and explains that it contains no slide-import image. Choosing default files produces HTML/JSON/reports, with no implicit slide-import image.

The [reader-question table](../../skills/flow-diagram/references/semantic-patterns.md#choose-by-the-readers-question) helps choose capability inventories, source mappings or processes. The [teaching recipes](../../skills/flow-diagram/examples/README.md#presentation-recipe-checks) include a no-edge capability overview, Chinese source/service cards and an all-visible parallel-flow animation. Reuse their organization with your own facts and dimensions.

## 3.2. Page introductions and diagram text

For new or revised HTML explanations, the assistant allocates page content before diagram geometry. The page contains one title, one sentence stating the reader's question, functional reading hints only when an operation needs explanation, and the managed player. Keep object names, relationship conditions, essential states and necessary comparison-card descriptions in the diagram. Keep source, decision, inspection and production records in the delivery explanation or reports. Do not turn the source outline or task plan into page sections. See the installed [page content contract](../../skills/flow-diagram/references/delivery-contexts.md#keep-the-html-page-minimal).

The assistant writes the page HTML/CSS around an embedded player. The closed reading order is heading, one-sentence introduction, optional functional reading hints and player with captions and controls. There is no supporting-explanation section. Before delivery, the assistant applies the [page completion checklist](../../skills/flow-diagram/references/delivery-contexts.md#page-completion-checklist) and deletion test: move or remove any block that repeats visible diagram content, describes production, or can disappear without reducing the reader's ability to use the page. Unperformed checks and their impact are disclosed; you retain the final design judgment. The delivered HTML remains one self-contained offline file alongside editable diagram JSON and reports; no extra page source is required. Existing imports, pure exports and validation retain their original input and entry point.

For direct tool use, copy the installed [HTML page starter](../../skills/flow-diagram/examples/html-page.html) into the task workspace, edit its outer content and CSS, then pass it to `author --html <page.html>` with the usual diagram input and output options. Preserve its managed playback region. Existing filled regions must match the exact diagram JSON, theme and SDK by default; invalid or mismatched pages fail explicitly. Page source and final-file hashes are recorded, and checks cover the actual outer page plus the embedded controls. Browser capture does not establish actual visual approval. See the installed [page input contract](../../skills/flow-diagram/references/tool-contract.md#editable-html-pages).

For a saved task revision, `--from <revision>` or `--input <changed.json> --parent <revision>` preserves its registered Agent page unless you select another with `--html`. Page-only edits keep the same JSON. An intentional diagram/theme change requires `--sync-html`; the tool verifies the old playback region and replaces only that region, preserving surrounding design. After task cleanup, use the delivered `diagram.html` and `diagram.json` in a fresh workspace without a historical parent. Read the final report to retain the requested formats. Changed page bytes need new inspection and actual viewing; an old HTML review is rejected for a changed page. See [continuing a page](../../skills/flow-diagram/references/tool-contract.md#continue-an-existing-page) for commands and failure behavior.

When requesting HTML with SVG/PNG, specify whether the images will stand alone or sit inside an article or slide. The assistant records whether each necessary title, legend and qualification is carried by the image or its destination; page text is not included in static exports. Different content arrangements use explicit, named drafts rather than silently removing conditions. The actual page and each image receive separate checks and viewing records at their intended widths and backgrounds.

For direct tool use, combine `--html <page.html>` with explicit `--svg --png` flags. To export an unchanged final page in a fresh workspace, use its exact JSON as `--input` and its HTML as `--html`; this retains the source bytes and page design. Omitting image flags produces no SVG/PNG. If PNG fails, successful HTML/SVG remain available but the requested delivery is incomplete. See [combined export](../../skills/flow-diagram/references/export.md#include-an-agent-authored-page). A missing browser can leave default file delivery complete while page inspection remains unperformed.

## 4. Create from designated sources

Give source paths and the authorized reading scope so the assistant can preserve evidence and avoid inventing business facts:

```text
Use the flow-diagram skill to create a system architecture diagram using only docs/order-system.md.
You may read only that file. Keep its Chinese names, and add no dependencies or deployment counts that it does not state.
Record the sources and name the diagram order-system.
```

If the content is too dense, the assistant proposes splitting or aggregation. You decide before it merges objects, removes relationships or changes meaning; node count alone does not authorize omissions. The delivery explanation accounts for retained, merged, omitted and unknown information, linked to sources and actual decisions. See [source fidelity and information choices](../../skills/flow-diagram/references/source-fidelity.md) for worked examples.

When analyzing a code repository, also specify the directory or file scope. Source records explain the diagram's evidence. The tool saves source metadata; it does not fetch files or URLs from that metadata.

## 5. Read artifacts and check results

Outputs default to the task's working directory. A successful first run for a new diagram typically produces:

```text
.diagrams/
  order-platform/
    diagram.json
    diagram.html
    report.json
    report.md
```

Requested, successful exports add `diagram.svg`, `diagram.png` or `diagram.gif`; named batch images use `exports/`. The compact report includes source metadata, checks, warnings, visual observations and final file hashes. Failed tasks retain their workspace and register only saved files; HTML or a complete artifact set is not guaranteed.

The assistant keeps its drafts, temporary helper scripts and measurement/review inputs together under `.diagrams/.work/<diagram-name>/<task-id>/`. During iteration, browser-free validation avoids repeated screenshots. After all requested files are ready, `finalize` publishes the selected final diagram under `.diagrams/<diagram-name>/` and removes only this task workspace. Failed or cancelled tasks retain their working files. Ask explicitly to keep history or debug evidence. Existing source files, other tasks and older history are outside cleanup scope.

| File | Use |
| --- | --- |
| `diagram.html` | Open in a browser. It starts paused, with controls for playback, timeline seeking and speed. The single file can be shared offline. |
| `diagram.json` | Editable diagram document for later revisions or exports. |
| `report.md` | Read completed checks, warnings, delivered files and unfinished work. |
| `report.json` | Structured facts from the same authoring report, for tools or later tasks. |

During a task, editing, validation, measurement, layout, capture and retries reuse the same source draft and current outputs. Keep substantive questions, errors and viewing findings in one `issues.md`; update the same issue with its location, status and handling result. Normal command logs and full stdout are unnecessary. Before publication, the assistant summarizes unresolved effects with optional `finalize --notes <markdown>`. The CLI copies Agent-authored notes without parsing or grading them. Successful publication cleans only this task; requested checkpoints or work records may be retained.

File completion, machine checks and actual viewing are reported separately. With a prepared browser, the tool opens saved `diagram.html` and records its hash, paused start, offline behavior, playback and captured states. Capture does not mean that the assistant viewed them. The assistant views actual files, revises problems, and describes viewed dimensions/stages and gaps at delivery. Default viewing needs no review form or CLI submission. Missing browser or image-viewing capability limits the stated viewing scope; complete files can still be delivered with disclosed gaps.

For animation, the assistant selects key stages from the reader's question and the stage plan, then matches them to actual compiled times, planned points, omitted candidates, captured images and actual viewing. One suitable image can cover concurrent flows when each route and marker is distinguishable. Actual HTML captures preserve authored focus and use unique timeline times. Static diagrams have one frame; animated `--samples 2` covers initial and final states, while larger bounds can include intermediate stages. The separate SDK `--preview` plan reserves one slot for a focus-free overview.

If a key stage is missing, the assistant can increase `author --samples` against current, inspect actual HTML/playback at that time or view a timed export. New captures need actual viewing; old observations do not establish viewing of regenerated files. The delivery explanation identifies viewed surfaces/times and remaining effects. Actual playback is needed to judge pacing; sample viewing covers only its states. See [key-stage inspection](../../skills/flow-diagram/references/visual-checks.md#check-the-selected-key-stages).

## 6. Revise an existing diagram

Give the final JSON path, diagram name and permitted changes:

```text
Use the flow-diagram skill to revise ./.diagrams/order-platform/diagram.json.
Change the database label to "Order database"; keep all other relationships and groups unchanged.
Publish the replacement only after the complete revised result is ready.
```

A finalized JSON starts a fresh task. During a task, continue editing one working draft; authoring replaces its current outputs without creating a version per call. Resume an unfinished saved draft with `--from current`, or select an explicitly retained checkpoint when historical comparison or rollback is needed. Before publication, the Agent summarizes unresolved issues from its single temporary problem record; optional `finalize --notes <markdown>` carries that opaque Agent-authored summary into the final report.

When viewing reveals overlap, clipping, missing characters or connection ambiguity, the assistant corrects it within the source meaning and re-views affected files. It asks when a proposed correction changes key meaning. For example:

```text
This overlap is intentional. Keep it and explain its effect in the delivery notes.
```

```text
Use your proposed move to the right. Move only node cache and keep everything else unchanged.
Update the same source draft and regenerate current outputs.
```

Add `--geometry` to `validate`, `author` or `layout` for finite SDK geometry calculations when useful. Informational observations identify their method, objects, source and time; text and curve estimates retain their limits. A rectangle intersection is not a visual obstruction verdict. Short-line/vertical-label heuristics and warning-approval submissions are removed. The user or LLM judges the actual image using design guidance; geometry observations do not require an exception record. See [diagnosis and revision decisions](../../skills/flow-diagram/references/diagnostics-and-revisions.md).

## 7. Export SVG, PNG or GIF on request

During a task, repeated exports replace the current files. `author --from current` retains omitted export formats, selected time, background, image width, explicit theme override, saved manifest bytes, GIF options and requested capture scope, then regenerates the requested outputs. Browser selection remains per invocation. Changed source or SDK identity invalidates a saved batch manifest; supply a newly bound manifest after selecting the intended stages. Missing requested files keep delivery incomplete and preserve the previous complete published delivery. Animation and image formats do not create checkpoints or require formal review.

A static SVG represents one selected time:

```text
Use the flow-diagram skill to read ./.diagrams/order-platform/diagram.json.
Also export an SVG at 0 milliseconds and publish the complete final file set.
```

PNG can specify a width and transparent background, and requires a usable browser. PNG is not generated by default. Without a browser, successful JSON, HTML and SVG remain available, while the PNG request remains unfinished:

```text
Use the flow-diagram skill to read ./.diagrams/order-platform/diagram.json and export transparent SVG and PNG.
Use the reported time of 0 milliseconds and a PNG width of 1440 pixels.
Actually view the exported files at a web content width of 720 CSS pixels on both white and dark backgrounds.
```

Export and actual viewing need no formal review record. If you explicitly need traceable review, follow [formal review](#formal-review-on-explicit-request) and the [formal image evidence contract](../../skills/flow-diagram/references/artifact-evidence.md).

Named static batches use a separate export manifest bound to exact source bytes and actual SDK version/integrity. The assistant uses compiled beats to select requested explanatory states and describe them, asking only when selection would change key meaning. Source or SDK changes need a newly bound manifest rather than silently replacing identity. Each item has its own name, time and SVG/PNG formats.

```text
Use the flow-diagram skill to read ./.diagrams/article/diagram.json and confirm two static states from the actual compiled beats.
In the current task, use an export manifest to generate named SVG and PNG files, sharing a transparent background and PNG width of 1440 pixels.
Keep the manifest in the task workspace. Report each item separately and retry failed items before finalizing.
```

See [named batch exports](../../skills/flow-diagram/references/export.md#named-batch-exports). Viewing one image does not establish inspection of other times, formats or display sizes.

GIF requires a usable browser when it is included in the delivery plan. It can come from your current request, formats carried forward from the existing delivery, or an applicable project preference. Your current request can remove GIF from the delivery. For example, to add GIF:

```text
Use the flow-diagram skill to read ./.diagrams/request-response/diagram.json.
Also export a GIF. Use a light theme and keep the explanatory text.
Use a Chrome/Chromium executable available in this environment. If none is available, explain that first.
```

To select a browser, provide its absolute executable path in the request. The tool launches a separate headless process. See [prepared browsers](../../skills/flow-diagram/references/visual-checks.md#prepared-browser).

After a failed or cancelled GIF export, completed JSON/HTML/SVG remain usable, but the GIF request remains unfinished. You decide changes to the interval, size, frame rate or explanatory text before a retry. See [export options](../../skills/flow-diagram/references/export.md) for parameters and limits.

## 8. Validate only, or use the command line

Saved authoring commands return a concise JSON summary. Read the returned `detailsPath` for the full report, including HTML inspection states and sampling details. Read-only validation and measurement keep their operation results inline. Errors before report creation explain the failure directly; they do not return a nonexistent report path.

To inspect existing JSON only, ask:

```text
Use the flow-diagram skill to validate only ./draft.json and report structural, compilation and layout diagnostics.
Preserve the input. Do not export HTML, SVG, PNG or GIF, and do not fix it automatically.
```

`validate --input <draft.json>` returns structured diagnostics, exact input-byte identity and the actual SDK baseline without creating history, snapshots or delivery files. `revision` is null and `validation.snapshotCreated` is false. Keep the working draft; redirect stdout into the task workspace if needed. Use `validate --from <revision> --name <name> --output <task-workspace>/history` only for a known saved version. Geometry estimates require no approval or exception record.

For visual diagnosis only, the assistant reuses valid registered screenshots when available. With only JSON or a finalized delivery, it preserves the input bytes and generates temporary inspection materials in an isolated task workspace, retaining the matching page when supplied. A prepared browser enables capture; actual image viewing remains a separate check. The assistant reports findings, evidence locations and unavailable checks, then retains the workspace without publishing a replacement. Corrections require authorization. See [inspection-only preparation](../../skills/flow-diagram/references/visual-checks.md#inspection-only-preparation).

You can also invoke the installation unit's single CLI entry in a terminal. Replace `<skill-directory>` below with the absolute installation path. First change to the working directory where outputs should be saved. Replace `<task-id>` with a fresh ID for this run.

```text
node "<skill-directory>/scripts/flowsvg.mjs" doctor
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/architecture.json" --name architecture --output ".diagrams/.work/architecture/<task-id>/history" --browser none
node "<skill-directory>/scripts/flowsvg.mjs" finalize --workspace ".diagrams/.work/architecture/<task-id>" --name architecture
```

The second command generates temporary JSON, HTML and reports from the bundled example. The third publishes final files and removes this task workspace. `--browser none` explicitly skips screenshots so you can verify delivery without a browser. Direct CLI execution does not replace the assistant's semantic analysis or actual visual judgment. The bundled architecture teaching example retains known relationship-label/group-overlap warnings; read the report and resolve them within the requested scope rather than treating this smoke test as a clean design template.

See [the tool contract](../../skills/flow-diagram/references/tool-contract.md) for full arguments, isolated caches and report fields. See [troubleshooting](../../skills/flow-diagram/references/troubleshooting.md) for preparation, cancellation or export failures.

## 9. View results and request formal review when needed

Default authoring captures the actual delivered HTML; `--samples` selects its capture budget. SDK previews require `--preview`. Captures do not establish actual viewing. Ordinary reports describe file completion and machine checks, with formal review marked `not-requested`; they omit unified quality and formal viewing counts. The assistant views actual HTML and requested SVG/PNG at the intended display conditions, revises as needed, and states the actual viewing scope and gaps.

### Formal review on explicit request

For traceable review, `author --from current --formal-review` saves one immutable `v###`; use that returned ID for evidence, templates, review and finalization. `--checkpoint` alone preserves history without requesting review. Later ordinary edits replace `current` and do not inherit viewing conclusions. Creating a review template or requesting artifact evidence persists formal intent without changing the saved source report.

Only an explicit formal review request adds `completion.quality` and `qualityCoverage`. These record structural checks and registered viewing coverage of the actual HTML and requested SVG/PNG surfaces; geometric estimates do not require approval. `formalReview.status: complete` means declared coverage is present; viewer issues remain `unresolved-issues` with their supplied action. A complete record does not establish user design acceptance. Complete files remain deliverable with disclosed viewing gaps.

Before submitting preview, HTML or SVG/PNG evidence reviews, use `review-template` to generate an unviewed form with registered IDs and hashes. Fill observations only after viewing. Read the [complete three-kind input contracts](../../skills/flow-diagram/references/review-inputs.md); invalid submissions fail before allocating a revision or rendering.

HTML and preview review append independent records without rendering or copying diagram files. Identical submissions reuse the same record. Finalization revalidates their source evidence and retains partial coverage and all unresolved observations; a later clean review does not erase an earlier issue. See [record identity and complete inputs](../../skills/flow-diagram/references/review-inputs.md).

Formal-image review records preserve exact artifact/evidence sources, SDK, time, camera, export background, display size and carrying backdrop. One reviewed surface does not cover another. Finalization retains all requested SVG/PNG and named batch files and revalidates the sources; repeated identical reviews write no new files, while later observations keep prior issues.

## On-demand image evidence

Use `evidence --from <revision> --name <name> --output <task-workspace>/history [--artifact-preview-settings <json>] --browser <prepared-executable>` for existing SVG/PNG. Defaults cover every selected file; later requests accumulate required conditions. Valid captures reuse their original identities without runtime, browser or writes. New captures remain unviewed. Pass the returned `evidence-<uuid>` to `review-template` and `review` with `--evidence-from`. See [the evidence contract](../../skills/flow-diagram/references/artifact-evidence.md) for partial recovery and identity checks.

## Official host documentation

Installation paths and explicit invocation methods were checked on 2026-10-27. Host versions and organization policies can affect local skill availability. Follow current host documentation.

- [Codex: Agent Skills](https://developers.openai.com/codex/skills/)
- [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills)

## Animated explanatory pages on narrow screens

For a new explanatory HTML page, the assistant keeps its heading and one-sentence introduction outside the player, adds a functional reading hint only when needed, and uses existing timeline captions for changing narration. The editable starter uses a 720px minimum playback width within a focusable horizontal scrolling area; the assistant adjusts it to the diagram's labels and checks both ends, captions and controls. The introduction wraps independently. Report viewport and playback widths separately; horizontal scrolling does not show the entire graph at once.

With a prepared browser, the saved-file check records actual captions and diagram text at compiled samples, exercises play/pause and backward seeking, and checks static page text stays stable. External network or local-file resources fail offline inspection while complete files remain available; use inline or data-URL assets. `--browser none` leaves these checks unperformed. Programmatic playback and sampled screenshots do not establish continuous visual viewing or sufficient caption reading time; the report states which were actually checked.
