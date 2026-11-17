# Flow Diagram user guide

[简体中文](flow-diagram-guide.zh-CN.md) · [Documentation map](../README.md)

Flow Diagram helps a coding assistant create editable system and process diagrams from descriptions, documents or code. Describe what the reader should understand; the assistant creates, checks and delivers the selected final diagram.

Default delivery includes editable JSON, an offline HTML page and reports. Request SVG, PNG or GIF when you need images. The HTML player illustrates authored states and transitions; it does not run the business process shown in the diagram.

## Documentation and task routing

| Task | Read next |
| --- | --- |
| Install the Skill | [Install in a host](#2-install-in-a-host) |
| Create a diagram | [Create your first diagram](#3-create-your-first-diagram) |
| Set project defaults | [Preferences, purpose and display size](#31-preferences-purpose-and-display-size) |
| Work from documents or code | [Create from designated sources](#4-create-from-designated-sources) |
| Find the delivered files | [Read artifacts and check results](#5-read-artifacts-and-check-results) |
| Modify a diagram | [Revise an existing diagram](#6-revise-an-existing-diagram) |
| Export images | [Export SVG, PNG or GIF](#7-export-svg-png-or-gif-on-request) |
| Check existing JSON | [Validate only, or use the command line](#8-validate-only-or-use-the-command-line) |
| Recover after a failure | [Troubleshooting](../../skills/flow-diagram/references/troubleshooting.md) |

## Suitable tasks

- **Presentation assets:** architecture, process and state diagrams exported as SVG, PNG or GIF.
- **Web explanations:** offline HTML diagrams that readers can pause and revisit.
- **Teaching and training:** step-by-step explanations of requests, data flows and task lifecycles.
- **Reviews and retrospectives:** structural overviews and interactions based on your sources.

You can request a diagram type, such as a layered architecture diagram or logic flowchart, or let the assistant choose from your explanation goal. Browse the [examples](../../skills/flow-diagram/examples/README.md) for starting points.

The Skill creates diagram assets. It does not generate PPTX files or native PowerPoint shapes. For a player embedded in an application, use the [FlowSVG SDK](https://github.com/yokingma/FlowSVG).

## 1. Prepare the environment

- Install Node.js 20+ and npm. Both commands must be available in the assistant's environment.
- The first diagram task needs network access to download runtime dependencies. A complete cache can be reused offline.
- PNG, GIF and screenshot inspection need a separately installed Chrome/Chromium executable. JSON, HTML and SVG generation work without it.

The Skill never downloads a browser or changes your application's dependencies. If the assistant cannot find Chrome/Chromium, provide its executable path. A host's browser tool may use a browser that is unavailable to local Node commands.

## 2. Install in a host

Run in the project where you want to use the Skill:

```sh
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram
```

The Skills CLI selects a detected assistant or asks you to choose one. Installation is project-local by default. Git is required for installation from GitHub.

To install for the current user across projects, choose your host:

```sh
# Codex
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --global --agent codex --yes

# Claude Code
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --global --agent claude-code --yes
```

For a project installation, use `npx skills list` to list skills and `npx skills update flow-diagram` to update this Skill. For a global installation:

```sh
npx skills list --global
npx skills update flow-diagram --global
```

Updates follow the repository's default branch. To keep a fixed version, use the manual installation below.

### Manual installation and fixed checkouts

Clone the repository, or download and extract its source ZIP:

```sh
git clone https://github.com/yokingma/flow-diagram-skill.git
cd flow-diagram-skill
git rev-parse HEAD
```

For a fixed release, check out its tag, such as `v0.1.0`, before copying. Copy the entire `skills/flow-diagram/` directory, including its license and subdirectories:

| Host | Current project | Current user | Invocation |
| --- | --- | --- | --- |
| Codex | `<project>/.agents/skills/flow-diagram/` | `~/.agents/skills/flow-diagram/` | `$flow-diagram` |
| Claude Code | `<project>/.claude/skills/flow-diagram/` | `~/.claude/skills/flow-diagram/` | `/flow-diagram` |

For a first user-level Codex installation, run the following from the cloned repository. The destination `flow-diagram` directory must not already exist.

macOS/Linux:

```sh
mkdir -p "$HOME/.agents/skills"
cp -R skills/flow-diagram "$HOME/.agents/skills/flow-diagram"
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" prepare
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse -Path "skills/flow-diagram" -Destination "$HOME/.agents/skills/flow-diagram"
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" prepare
```

For Claude Code, replace `.agents/skills` with `.claude/skills`. For project-local installation, use the project path from the table. To update a manual installation, back up the installed directory and replace it with a complete copy of the selected version.

Open your assistant in the target project and invoke the Skill. If Codex does not discover it, restart Codex. Other hosts may require a reload; see their [official documentation](#official-host-documentation).

You can ask the assistant to check the environment before creating a diagram:

```text
Use the flow-diagram skill to check Node, npm and browser availability.
```

The `doctor` command checks Node, npm and the runtime cache. Browser availability is checked separately. The first diagram task prepares runtime dependencies automatically; using the Skill does not require `pnpm install` or an SDK checkout.

## 3. Create your first diagram

In Codex, send:

```text
$flow-diagram
Create a static architecture diagram: a client calls an API service,
and the API service queries a database. The API and database belong to
"Order platform"; the client is outside that boundary.
Use English labels and a light theme. Name it order-platform.
Deliver JSON and offline HTML, and also export SVG.
```

In Claude Code, replace the first line with `/flow-diagram`. You can also say “use the flow-diagram skill” in a host that supports automatic selection.

Include the objects, relationship directions, group boundaries and explanation goal. The assistant asks about missing information that affects meaning. If a requested effect is unsupported, it explains the limit and asks you to choose an alternative.

For animation, describe the order and state changes:

```text
Use the flow-diagram skill to explain a request and response.
Keep the client, API and database visible. Start with the full diagram,
then show the request, database query and response in order.
Finish with the full diagram. Name it request-response.
```

## 3.1. Preferences, purpose and display size

Specify the audience, intended display size, background and export formats when known. For presentation assets, include the available width and height and whether the slide carries the title and legend. Request SVG or PNG for slide import, or GIF for animation; the default HTML page is meant for browser playback.

When the purpose is unspecified, the assistant starts with a static web diagram, using a 960 × 600 canvas, a 720 CSS pixel display width and a light background for unspecified choices. Explicit requirements and applicable project preferences override individual defaults. A known presentation purpose keeps its slide context even when exact dimensions are missing. The assistant states assumed dimensions and backgrounds so you can adjust them.

To save a project default, say “Use Chinese labels for architecture diagrams in this project from now on” or “Include SVG by default for review deliveries.” Preferences are stored in `.diagrams/preferences.md` in the working directory or the project root you specify. Your current request takes priority. Revisions preserve choices outside the requested changes.

Ask the assistant to change or forget a preference, or reset all project preferences. A reset removes only the preference record. One-off adjustments are not saved as future defaults. If saved preferences conflict, the assistant explains the conflict and continues without that default.

## 3.2. Page introductions and diagram text

The offline HTML page contains a title, a short introduction and the diagram player. Captions explain the animation stages. Object names, relationships and essential qualifications stay in the diagram; source references and check results are in the reports.

When requesting HTML and images together, say whether the images will stand alone or appear in an article or slide. Page titles and introductions are not included in SVG, PNG or GIF exports, so a standalone image may need its own title or legend.

Keep the delivered HTML with its JSON for later edits that preserve the page design. For custom HTML/CSS or direct CLI use, see [editable HTML pages](../../skills/flow-diagram/references/tool-contract.md#editable-html-pages) and [page continuation](../../skills/flow-diagram/references/tool-contract.md#continue-an-existing-page).

## 4. Create from designated sources

Name the sources the assistant may read and any facts it must preserve:

```text
Use the flow-diagram skill to create a system architecture diagram
using only docs/order-system.md. Keep its Chinese names.
Add no dependencies or deployment counts that the file does not state.
Record the sources and name the diagram order-system.
```

For code repositories, specify the permitted directories or files. The assistant preserves source facts and asks before changing key relationships, boundaries or meaning. If the content is too dense, it can propose splitting or aggregation. Missing facts stay unknown until clarified.

See [source fidelity](../../skills/flow-diagram/references/source-fidelity.md) for examples of retaining, merging and omitting information.

## 5. Read artifacts and check results

Open the delivered HTML in a browser. A successful diagram named `order-platform` produces:

```text
.diagrams/
  order-platform/
    diagram.json
    diagram.html
    report.json
    report.md
```

| File | Use |
| --- | --- |
| `diagram.html` | Offline page with playback, seeking and speed controls; starts paused. |
| `diagram.json` | Editable diagram for revisions and exports. |
| `report.md` | Sources, completed checks, warnings and unfinished work. |
| `report.json` | The same report information in a structured format. |

Requested exports add `diagram.svg`, `diagram.png` or `diagram.gif`. Named batch images are saved under `exports/`.

The assistant checks the generated files and views them at the intended size when a browser and image viewer are available. The delivery explanation identifies any missing export or check. If an export fails, completed files remain available; the task retains recovery files.

Temporary drafts and screenshots are cleaned after successful delivery. Before delivery, ask to retain them if you need troubleshooting details, including the task's `issues.md`, or request checkpoints when you need saved versions for comparison or rollback.

## 6. Revise an existing diagram

Give the JSON path and permitted changes:

```text
Use the flow-diagram skill to revise ./.diagrams/order-platform/diagram.json.
Change the database label to "Order database".
Keep all other relationships and groups unchanged, and preserve the HTML page design.
```

The assistant updates the diagram and regenerates its requested formats. It preserves the previous complete delivery if the replacement cannot finish. Keep the matching HTML and reports alongside the JSON, and state any format you want to add or remove.

For a visual correction, name the affected object or area. The assistant can fix spacing, clipping and ambiguous connections while preserving meaning; it asks before changing facts or key relationships.

After an SDK update, if an existing page is rejected as incompatible, preserve the original files and follow [SDK upgrade recovery](../../skills/flow-diagram/references/troubleshooting.md#continuing-after-an-sdk-upgrade).

## 7. Export SVG, PNG or GIF on request

Request a format and, for a static image, the state or time to show:

```text
Use the flow-diagram skill to read ./.diagrams/order-platform/diagram.json.
Also export an SVG at 0 milliseconds.
```

PNG requires a browser. You can specify width and background:

```text
Export transparent SVG and PNG from this diagram at 0 milliseconds.
Use a PNG width of 1440 pixels. Check them at a display width of
720 CSS pixels on both white and dark backgrounds.
```

For several images, name the stages you need. The assistant selects their compiled times and exports named files. See [named batch exports](../../skills/flow-diagram/references/export.md#named-batch-exports) for direct CLI use.

To add animation as a GIF:

```text
Use the flow-diagram skill to read ./.diagrams/request-response/diagram.json.
Also export a GIF with a light theme and explanatory captions.
```

GIF requires Chrome/Chromium. You can specify size, frame rate and interval; see [export options](../../skills/flow-diagram/references/export.md) for limits. If a requested export fails or is cancelled, completed JSON, HTML and images remain usable. The assistant reports what needs a retry.

## 8. Validate only, or use the command line

To check JSON without editing or exporting it:

```text
Use the flow-diagram skill to validate only ./draft.json.
Report structural and compilation diagnostics. Preserve the input,
do not export files, and do not fix it automatically.
```

For visual diagnosis without changes, ask the assistant to inspect the diagram and report findings. It may create temporary screenshots, but does not replace the delivery or change the source.

You can also use the CLI directly. Replace `<skill-directory>` with the absolute installation path and `<task-id>` with a new task identifier. Run from the working directory where you want the output:

```sh
node "<skill-directory>/scripts/flowsvg.mjs" doctor
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/complete/project-architecture.json" --name project-architecture --theme dark --output ".diagrams/.work/project-architecture/<task-id>/history" --browser none
node "<skill-directory>/scripts/flowsvg.mjs" finalize --workspace ".diagrams/.work/project-architecture/<task-id>" --name project-architecture
```

These commands generate the architecture example and save the final files under `.diagrams/project-architecture/`. `--browser none` skips screenshot inspection. Saved authoring commands return a summary; open its `detailsPath` for the full report. Validation and measurement return their results directly.

Use `--help` for options. See the [tool reference](../../skills/flow-diagram/references/tool-contract.md) for commands and reports, [content measurement](../../skills/flow-diagram/references/tool-contract.md#content-measurement) for text sizing, and [layout plans](../../skills/flow-diagram/references/static-layout.md#layout-plan-workflow) for repeated static layouts.

## 9. View results and request formal review when needed

Check labels, relationship directions, group boundaries and readability at the size where the diagram will be used. Play animations to check their order, captions and pacing. Share specific corrections with the assistant.

### Formal review on explicit request

For a traceable review, ask the assistant to record observations against the delivered files and display conditions. Ordinary creation and image export do not require a formal review request.

Formal review records identify the files, inspected states, display sizes and unresolved issues. For direct CLI review, see [review inputs](../../skills/flow-diagram/references/review-inputs.md).

## On-demand image evidence

For a review that needs saved screenshots of SVG or PNG at specific widths and backgrounds, request image evidence. The assistant can capture existing exports and record observations after viewing them. See [image evidence](../../skills/flow-diagram/references/artifact-evidence.md) for commands and settings.

## Official host documentation

Host versions and organization policies can affect Skill discovery and local command access. Consult your host's documentation when installation or invocation differs:

- [Codex: Agent Skills](https://developers.openai.com/codex/skills/)
- [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills)

## Animated explanatory pages on narrow screens

Wide diagrams can scroll horizontally while the heading and introduction wrap independently. Use the playback controls to pause or revisit a stage. When requesting a mobile layout, specify the target viewport and whether horizontal scrolling is acceptable.

Offline pages must keep scripts, styles, fonts and images within the file. For custom pages, use inline assets or data URLs instead of external resources.
