# FlowSVG skill user guide

[简体中文](flowsvg-skill-guide.zh-CN.md) · [Documentation map](../README.md)

**Flow SVG Diagram is the skill for executable diagrams that explain systems and processes. Author once, then play, embed, inspect, and export.**

The skill authors the diagram document and guides its inspection. The FlowSVG SDK renders and plays that document; application embedding uses the SDK integrations. The [SDK manual at the source snapshot](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/guides/sdk-guide.md) is the authority for SDK APIs; bundled references remain available offline for the Skill workflow. Executable diagrams play authored visual states and transitions; they do not execute the system or business process being explained.

This guide explains how to install and use Flow SVG Diagram in a coding assistant that supports skills. Describe a diagram in natural language. The assistant chooses an expression model from the reader's question, organizes source-supported content, writes diagram JSON, runs the tools and explains the checks. Default delivery presents one selected final revision with editable JSON, offline HTML with playback controls, and an authoring report; drafts and inspection images are temporary and removed after successful finalization. Full history is retained only on explicit request.


The independent Skill version is prepared as `v0.1.0`; no independent remote repository or release has been published by this local migration. Install from the local snapshot below. The exact SDK baseline remains `flowsvg@0.2.2`. SDK upgrades require an explicit manifest/lock update and independent acceptance; user runs never follow npm `latest`.

## Documentation and task routing

This guide covers installation, creation, revision, validation and export for human users. [SKILL.md](../../skills/flow-svg-diagram/SKILL.md) defines the Agent workflow. For tests, installation boundaries and acceptance scope, read the [maintenance guide](../development/flowsvg-skill-maintenance.md). User guides stay in the project's `docs/` directory; installing and running the skill does not require copying them.

| Task | Next step | Completion standard |
| --- | --- | --- |
| Create a diagram | Read [Create your first diagram](#3-create-your-first-diagram), then consult the relevant semantic pattern and delivery references | The selected final diagram links saved JSON, HTML, checks and unresolved items |
| Create from sources | Read [Create from designated sources](#4-create-from-designated-sources) and [source fidelity and information choices](../../skills/flow-svg-diagram/references/source-fidelity.md) | `sources.json` and the report record the authorized sources and decisions |
| Revise or diagnose | Read [Revise an existing diagram](#6-revise-an-existing-diagram) and [diagnosis and revision decisions](../../skills/flow-svg-diagram/references/diagnostics-and-revisions.md) | The new revision identifies its parent, preserves original warnings and records your decisions |
| Export static images or GIF | Read [Export SVG, PNG or GIF on request](#7-export-svg-png-or-gif-on-request) and [export options](../../skills/flow-svg-diagram/references/export.md) | The report accounts for each requested format; missing browsers leave dependent exports unfinished |
| Validate only, or recover from an environment failure | Read [Validate only, or use the command line](#8-validate-only-or-use-the-command-line) or [troubleshooting](../../skills/flow-svg-diagram/references/troubleshooting.md) | Validation reports `validated`, or a preserved failure report gives the next recovery step |

## Suitable tasks

- **Presentation assets:** create diagrams of architectures, processes and state changes. Request SVG, PNG or GIF for use in presentation software.
- **Web explanations:** create diagrams that readers can pause and revisit in offline HTML. Use SDK integration to embed a player in an application.
- **Teaching and training:** explain requests, data flows and task lifecycles step by step.
- **Reviews and retrospectives:** combine a structural overview with interactions or failures supported by your sources.

Specify the audience, display size and output formats to help the assistant choose information density and pacing. JSON and offline HTML remain the default delivery. Explicitly request SVG, PNG or GIF when needed. The skill creates diagram assets, not PPTX files or native PowerPoint shapes. Import and playback behavior depend on the presentation software.

The assistant uses [visual design methods](../../skills/flow-svg-diagram/references/visual-design.md) to coordinate typography, spacing, colors, containers, tags, connections and animation for the usage context. Tool checks and AI inspection provide evidence and observations; you judge the final design. A reported quality pass describes the recorded checks and coverage.

For a clear request, the assistant completes the initial layout directly. It asks before changing a relationship, boundary, omission, aggregation or other meaning. It checks the main path, entry ports, labels, target-size content and the actual displayed result when a browser or image viewer is available. A simple task with a clear source scope and no semantic ambiguity does not need an extra confirmation round.

The bundled [semantic pattern guide](../../skills/flow-svg-diagram/references/semantic-patterns.md) covers request/response, retries and state transitions, fan-in and bottlenecks, staged data processing, system boundaries, and a layered architecture teaching setup. Its examples are labeled teaching scenarios that can serve as starting points; real business relationships must come from your sources. The [delivery context guide](../../skills/flow-svg-diagram/references/delivery-contexts.md) explains sizes and inspection scope for presentation assets, web illustrations and offline interactive HTML. The tool has no formal delivery-context preset field or CLI preset; documented sizes are starting suggestions. SVG, PNG and GIF are available on request. PNG and GIF require a runnable Chrome/Chromium executable.

For a layered architecture exercise, start with [layered-architecture.json](../../skills/flow-svg-diagram/examples/layered-architecture.json). It intentionally has multiple columns in each layer, heading space inside groups, labelled cross-layer edges and a governance sidebar. Layer order does not establish call order, grouping does not automatically establish deployment or trust boundaries, and dashed governance annotations do not add undeclared runtime dependencies. Run `measure --input` on the draft and write a separate output draft before authoring; the recorded row heights, column gaps and label clearance are verified starting values for this example and its typography, not general layout parameters.

For layered structures with sidebars, branching processes with returns, or repeated cards with longer content, use the [composition recipes](../../skills/flow-svg-diagram/references/visual-design.md#composition-recipes) before choosing geometry. [Rendering gotchas](../../skills/flow-svg-diagram/references/rendering-gotchas.md) give conditional prevention choices; [recipe sample checks](../../skills/flow-svg-diagram/examples/README.md) distinguish design starting points from capability demonstrations. Recheck at your actual display width. Decide which logs must survive cleanup when [creating task files](../../skills/flow-svg-diagram/references/tool-contract.md#task-workspace).

## 1. Prepare the environment

- Install Node.js 20 or later and npm. The assistant's environment must be able to find `node` and `npm`.
- The first runtime preparation needs network access to fetch the locked npm packages. A complete cache can then be reused offline; npm must remain available.
- Screenshot inspection, PNG export and GIF export require a prepared local Chrome/Chromium executable. JSON, HTML and SVG generation do not require a browser.

The skill includes a browser control library, but no browser executable, and never downloads a browser automatically. A host's built-in browser tool does not necessarily expose an executable that the skill can use. Provide the Chrome/Chromium path when needed.

For direct CLI use, run `node <skill-directory>/scripts/flowsvg.mjs --help` or append `--help` to `author`, `validate` or `measure` to see the current options. `author --samples <count>` selects a smaller deterministic preview plan when a focused visual review is sufficient; the report lists omitted candidates.

To size structured-content and label-only nodes from the draft itself, run `measure --input <draft.json>`. The command associates each node ID with its current and required height, height change and deterministic estimated line count, using the draft's typography. The line count is a public-SDK estimate, so it is not browser pixel or formal SVG/PNG evidence. Structured content includes every initial and animated replacement version. Add `--output <new-draft.json>` only when a separate backfilled draft is wanted; it preserves the source bytes, refuses animated width/height changes and unresolved measurement diagnostics, increases heights only, and never overwrites an existing target. A generated draft still needs explicit positioning, layout diagnostics and visual checks.

For repeated static geometry, use the [layout plan workflow](../../skills/flow-svg-diagram/references/static-layout.md#layout-plan-workflow). The Agent chooses semantic structure, ownership, order and overrides; the layout strategy computes coordinates for existing IDs. Use direct coordinates when the scene is irregular. A plan only changes geometry and does not infer meaning or remove warnings. The bundled [layout assistance teaching draft](../../skills/flow-svg-diagram/examples/layout-assistance.json) and [plan](../../skills/flow-svg-diagram/examples/layout-assistance-plan.json) are invented teaching data; their gaps are not general spacing promises.

The workflow requires an explicit static draft and plan. After `measure`, run `layout --input <draft> --plan <layout-plan.json> --output <new-draft.json>`, then `validate` the new draft before authoring. Layout applies measured heights as lower bounds and reflows groups and later layers; `overrides[id].height` remains exact and retains a `text-overflow` warning when it is smaller than the estimate. A layout result is a draft, not a revision or quality approval. For target-size SVG/PNG review, use explicit `--artifact-preview-settings` from the artifact source revision, view each saved evidence image, then use `review --artifact-review` with explicit subject and evidence source. Ordinary preview and HTML review cover their own sampled surfaces and do not cover the formal artifact.

## 2. Install in a host

Copy this repository's entire `skills/flow-svg-diagram/` directory to one of the locations below. Preserve the relative positions of `SKILL.md`, `agents/`, `scripts/`, `references/`, `examples/` and `runtime/`, including the runtime manifest and lockfile. `agents/openai.yaml` configures the Codex display name and short description; the invocation name is `$flow-svg-diagram`. Copying only `SKILL.md` cannot run the tools.

| Host | Current project only | Multiple projects for the current user | Explicit invocation |
| --- | --- | --- | --- |
| Codex CLI / IDE extension | `<project>/.agents/skills/flow-svg-diagram/` | `~/.agents/skills/flow-svg-diagram/` | `$flow-svg-diagram`; also discoverable through `/skills` |
| Claude Code | `<project>/.claude/skills/flow-svg-diagram/` | `~/.claude/skills/flow-svg-diagram/` | `/flow-svg-diagram` |

`~` means the user's home directory, usually `C:\Users\<username>` on Windows. For other hosts, use their existing skill installation mechanism and ensure that the assistant can read the directory and execute Node commands. These locations come from host documentation; they do not establish tested support for every host.

After installation, open the host in the target project or working directory and explicitly select `flow-svg-diagram`. If Codex does not show the new skill, restart Codex and check again. Follow other hosts' discovery or reload instructions.

First ask the assistant to inspect the environment:

```text
Use the flow-svg-diagram skill to check whether this environment can run it.
Report the status of Node, npm and the browser.
```

`doctor` checks Node, npm and the cache, but not the browser. Check browser availability separately and confirm it during an actual screenshot or GIF task. The first authoring task automatically prepares isolated dependencies. It does not require installing FlowSVG in your project or changing the project's dependency manifest.

## 3. Create your first diagram

In Codex, send:

```text
$flow-svg-diagram
Create a static architecture diagram: a client calls an API service, and the API service queries a database.
The API service and database belong to the "Order platform"; the client is outside that boundary.
Use English labels and a light theme. Name the diagram order-platform and output it in the current working directory.
```

In Claude Code, replace the first line with `/flow-svg-diagram` and keep the other requirements. You can also say "use the flow-svg-diagram skill" in a host that supports automatic selection.

Include the objects, relationship directions, group boundaries and explanation goal. When the request is clear, the assistant completes the initial layout directly. It asks first when a key meaning, such as a relationship direction, is unclear. If the SDK cannot express your request, the assistant explains the limit and asks you to choose an alternative.

For presentation assets, add concrete constraints:

```text
This diagram is for a 16:9 technical review presentation. Use short English labels that are readable on a projector.
Also export a static SVG. I will import it into presentation software; no PPTX file is needed.
```

For a process or state change, explicitly request animation:

```text
Use the flow-svg-diagram skill to show a client sending a request to an API service and receiving a response.
Start with the full diagram, show the request and response in order, then return to the full diagram.
Name the diagram request-response and deliver the default JSON and offline HTML.
```

## 4. Create from designated sources

Give source paths and the authorized reading scope so the assistant can preserve evidence and avoid inventing business facts:

```text
Use the flow-svg-diagram skill to create a system architecture diagram using only docs/order-system.md.
You may read only that file. Keep its Chinese names, and add no dependencies or deployment counts that it does not state.
Record the sources and name the diagram order-system.
```

If the content is too dense, the assistant proposes splitting or aggregation. You decide before it merges objects, removes relationships or changes meaning; node count alone does not authorize omissions. The delivery explanation accounts for retained, merged, omitted and unknown information, linked to sources and actual decisions. See [source fidelity and information choices](../../skills/flow-svg-diagram/references/source-fidelity.md) for worked examples.

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

During a task, authoring, validation, retries and review records use temporary revisions. Successful finalization removes these intermediate revisions and screenshots; the final report uses relative file paths and retains review facts without links to deleted evidence. Later edits import the final JSON into a fresh task workspace.

File delivery and quality checks are recorded separately. The authoring tool opens the actual delivered `diagram.html` when a prepared browser is available and records its file hash, paused start, offline behavior, playback and sampled states. This programmatic HTML check does not mean that the assistant has viewed the screenshots; use `review --from <source-revision> --name <same-name> --output <same-root> --html-review <json>` after actually viewing the listed states. HTML can be delivered with layout warnings that await your review. Without a browser or host image-viewing capability, HTML/image inspection remains unperformed and is recorded as such.

## 6. Revise an existing diagram

Give the final JSON path, diagram name and permitted changes:

```text
Use the flow-svg-diagram skill to revise ./.diagrams/order-platform/diagram.json.
Change the database label to "Order database"; keep all other relationships and groups unchanged.
Publish the replacement only after the complete revised result is ready.
```

A finalized JSON starts a fresh task. If you explicitly retained a workspace and want to continue an unfinished task, identify the saved parent revision in that workspace.

When the assistant finds overlap, clipping, missing characters or semantic problems, it explains the impact and options. It asks you when the choice changes meaning and applies already authorized mechanical corrections. For example:

```text
This overlap is intentional. Keep the layout and record my decision and the original warning in a new revision.
```

```text
Use your proposed move to the right. Move only node cache and keep everything else unchanged.
Create a new revision using the revision with the reported issue as its parent.
```

At finite timeline samples, the tool checks four existing layout risks and three SDK geometry risks: edges crossing unrelated nodes, labels overlapping unrelated nodes, and labels overlapping other labels. `LABEL_VERTICAL_RUN` also flags conservative runs of very short soft-wrapped edge-label lines. Explicit newlines are distinguished from additional wrapping within each paragraph. Diagnosis needs no browser. Text baselines and bounds use deterministic estimates and do not replace visual inspection at the actual display size.

New decisions select one warning through `sourceRevision` and `issueId` in the report. Different object pairs, text fields, lines and sample times retain separate decision scopes. Changes to source JSON bytes, the SDK baseline or the theme do not authorize new warnings through an earlier decision. Historical records without IDs are preserved; diagnose again before submitting a new exact decision. See [diagnosis and revision decisions](../../skills/flow-svg-diagram/references/diagnostics-and-revisions.md).

Recording an intentional design neither removes the original warning nor completes quality acceptance. Intermediate revisions, including failures, remain available during the task; successful finalization removes them unless you requested history.

## 7. Export SVG, PNG or GIF on request

A static SVG represents one selected time:

```text
Use the flow-svg-diagram skill to read ./.diagrams/order-platform/diagram.json.
Also export an SVG at 0 milliseconds and publish the complete final file set.
```

PNG can specify a width and transparent background, and requires a usable browser. PNG is not generated by default. Without a browser, successful JSON, HTML and SVG remain available, while the PNG request remains unfinished:

```text
Use the flow-svg-diagram skill to read ./.diagrams/order-platform/diagram.json and export transparent SVG and PNG.
Use the reported time of 0 milliseconds and a PNG width of 1440 pixels.
Generate formal artifact review images at a web content width of 720 CSS pixels on both white and dark backgrounds, and actually view them.
```

Formal image evidence is separate from sampled timeline screenshots. The assistant first generates target-size review images from the original artifact revision, then appends actual viewing through independent `review --artifact-review`. `--from` selects the diagram subject; use `--evidence-from` for a separate evidence source. This operation does not remake the diagram or open a browser. Each size and display background has its own record. See [formal image evidence](../../skills/flow-svg-diagram/references/artifact-evidence.md).

Named static batches use a separate export manifest. It binds the diagram's exact source-byte hash and the actual SDK version and integrity, and specifies a name and SVG/PNG formats for each time. The assistant reads compiled beats and asks you to confirm the selected times before creating the manifest. Source or SDK changes require confirmation again; bindings are not silently replaced.

```text
Use the flow-svg-diagram skill to read ./.diagrams/article/diagram.json and confirm two static states from the actual compiled beats.
In a new revision, use an export manifest to generate named SVG and PNG files, sharing a transparent background and PNG width of 1440 pixels.
Keep the manifest in the task workspace. Report each item separately and retry failed items before finalizing.
```

See [named batch exports](../../skills/flow-svg-diagram/references/export.md#named-batch-exports). Viewing one image does not establish inspection of other times, formats or display sizes.

GIF requires an explicit request and a usable browser:

```text
Use the flow-svg-diagram skill to read ./.diagrams/request-response/diagram.json.
Also export a GIF. Use a light theme and keep the explanatory text.
Use a Chrome/Chromium executable available in this environment. If none is available, explain that first.
```

To select a browser, provide its absolute executable path in the request. The tool launches a separate headless process. See [prepared browsers](../../skills/flow-svg-diagram/references/visual-checks.md#prepared-browser).

After a failed or cancelled GIF export, completed JSON/HTML/SVG remain usable, but the GIF request remains unfinished. You decide changes to the interval, size, frame rate or explanatory text before a retry. See [export options](../../skills/flow-svg-diagram/references/export.md) for parameters and limits.

## 8. Validate only, or use the command line

To inspect existing JSON only, ask:

```text
Use the flow-svg-diagram skill to validate only ./draft.json and report structural, compilation and layout diagnostics.
Preserve the input. Do not export HTML, SVG, PNG or GIF, and do not fix it automatically.
```

`validate --input <draft.json>` returns structured diagnostics, exact input-byte identity and the actual SDK baseline without creating history, snapshots or delivery files. `revision` is null and `validation.snapshotCreated` is false. Keep the working draft; redirect stdout into the task workspace if needed. Use `validate --from <revision> --name <name> --output <task-workspace>/history` only for a known saved version. Formal warning decisions need the exact warning in a saved `author` report; draft diagnostics cannot supply `sourceRevision`.

You can also invoke the installation unit's single CLI entry in a terminal. Replace `<skill-directory>` below with the absolute installation path. First change to the working directory where outputs should be saved. Replace `<task-id>` with a fresh ID for this run.

```text
node "<skill-directory>/scripts/flowsvg.mjs" doctor
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/architecture.json" --name architecture --output ".diagrams/.work/architecture/<task-id>/history" --browser none
node "<skill-directory>/scripts/flowsvg.mjs" finalize --workspace ".diagrams/.work/architecture/<task-id>" --name architecture --from v001
```

The second command generates temporary JSON, HTML and reports from the bundled example. The third publishes final files and removes this task workspace. `--browser none` explicitly skips screenshots so you can verify delivery without a browser. Direct CLI execution does not replace the assistant's semantic analysis or actual visual judgment.

See [the tool contract](../../skills/flow-svg-diagram/references/tool-contract.md) for full arguments, isolated caches and report fields. See [troubleshooting](../../skills/flow-svg-diagram/references/troubleshooting.md) for preparation, cancellation or export failures.

## Official host documentation

Installation paths and explicit invocation methods were checked on 2026-10-27. Host versions and organization policies can affect local skill availability. Follow current host documentation.

- [Codex: Agent Skills](https://developers.openai.com/codex/skills/)
- [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills)

#### Required quality coverage

The report separates `completion.delivery` from `completion.quality`. `qualityCoverage` names the structural checks, the actual `diagram.html` states and each requested SVG/PNG display surface. If no target size is specified, an image uses its intrinsic dimensions and the resolved theme backdrop. A complete file set can be delivered while quality is `incomplete` when a browser or actual viewing is unavailable; unresolved or deferred warnings are `needs-user-decision`. Review-only revisions carry the parent's requested formats and artifact identities so an earlier static file cannot disappear from the required coverage.

Before submitting preview, HTML or SVG/PNG evidence reviews, use `review-template` to generate an unviewed form with registered IDs and hashes. Fill observations only after viewing. Read the [complete three-kind input contracts](../../skills/flow-svg-diagram/references/review-inputs.md); invalid submissions now fail before allocating a revision or rendering.

HTML and preview review now append independent records without rendering or copying diagram files. Identical submissions reuse the same record. Finalization revalidates their source evidence and retains partial coverage and all unresolved observations; a later clean review does not erase an earlier issue. See [record identity and complete inputs](../../skills/flow-svg-diagram/references/review-inputs.md).

Formal-image review records preserve exact artifact/evidence sources, SDK, time, camera, export background, display size and carrying backdrop. One reviewed surface does not cover another. Finalization retains all requested SVG/PNG and named batch files and revalidates the sources; repeated identical reviews write no new files, while later observations keep prior issues.

## On-demand image evidence

Use `evidence --from <revision> --name <name> --output <task-workspace>/history [--artifact-preview-settings <json>] --browser <prepared-executable>` for existing SVG/PNG. Defaults cover every selected file; later requests accumulate required conditions. Valid captures reuse their original identities without runtime, browser or writes. New captures remain unviewed. Pass the returned `evidence-<uuid>` to `review-template` and `review` with `--evidence-from`. See [the evidence contract](../../skills/flow-svg-diagram/references/artifact-evidence.md) for partial recovery and identity checks.
