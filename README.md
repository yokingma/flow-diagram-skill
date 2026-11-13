# Flow Diagram

An Agent Skill built on [FlowSVG](https://github.com/yokingma/FlowSVG) for creating editable system and process diagrams from descriptions, documents, or code. Deliver a static explanation or an animated walkthrough as a self-contained offline HTML page, with editable JSON and check reports. Export SVG, PNG, or GIF when requested.

[简体中文](README.zh-CN.md) · [Install](#install) · [User guide](docs/guides/flow-diagram-guide.md) · [Examples](skills/flow-diagram/examples/README.md) · [Contributing](CONTRIBUTING.md)

## Examples

Upstream FlowSVG SDK showcase animations illustrate request flows, deployment architecture, and model inference. Browse the [interactive demo](https://yokingma.github.io/FlowSVG/) or see the [asset sources and versions](docs/images/flowsvg/README.md).

### Request and response

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/request-response.gif" alt="Animated request and response between a client and service" width="700"></p>

### Web service deployment

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/web-service-deployment.gif" alt="Web service deployment with two application replicas" width="700"></p>

### LLM inference

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/llm-inference.gif" alt="LLM inference with Transformer layers and KV Cache reuse" width="700"></p>

## Install

Run in the project where you want to use the Skill:

```sh
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram
```

The [Skills CLI](https://github.com/vercel-labs/skills) selects a detected assistant or asks you to choose one. Installation is project-local by default. To install for the current user across projects, choose one of these commands:

```sh
# Codex
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --agent codex --global

# Claude Code
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --agent claude-code --global
```

You need **Node.js 20+ and npm**, and Git for the GitHub installation. Your assistant must support skills and local Node commands. The first diagram task installs locked runtime packages into an isolated cache and needs access to the npm registry; a complete cache can be reused offline. Your application's dependencies are not changed.

**PNG, GIF, and browser inspection also need a separately installed Chrome/Chromium executable.** JSON, HTML, and SVG generation work without it. The Skill never downloads a browser.

Restart Codex if the new Skill is not discovered. See the [installation guide](docs/guides/flow-diagram-guide.md#2-install-in-a-host) for manual installation, Windows, updates, and fixed-version checkouts. Using the Skill does not require `pnpm install` or an SDK source checkout.

## Use it

Default creation follows understand → create → validate → view and revise → deliver. It reuses one source draft, current outputs and one temporary `issues.md` for substantive findings. View the actual delivered HTML and requested images. SDK previews and registered formal reviews are requested separately; machine checks and screenshot generation do not establish visual quality. Design guidance supports authoring and revision rather than acting as an acceptance gate.

Before arranging nodes and edges, the assistant uses [diagram selection](skills/flow-diagram/references/semantic-patterns.md#choose-by-the-readers-question) to match your explanation goal to a diagram type and follow its guidance. It uses free composition when no listed type covers the main question. You can name a type, such as a layered architecture diagram or logic flowchart, or describe what the reader should understand.

In Codex, send:

```text
$flow-diagram
Create a static architecture diagram: a client calls an API service,
and the API service queries a database. The API and database belong to
the Order platform; the client is outside that boundary.
Use English labels and a light theme. Name it order-platform.
Deliver the default JSON and offline HTML, and also export SVG.
```

In Claude Code, replace the first line with `/flow-diagram`.

For animation, describe the sequence and state changes, for example:

```text
Use the flow-diagram skill to explain a request and response.
Keep the client, API, and database visible throughout. First show the
overview, then animate the request to the API, the database query,
and the response to the client. Finish with the overview.
```

When working from sources, name the files or directories the assistant may read. Include the audience, intended display size, and export formats when known. The assistant asks about gaps that affect meaning or presentation; the assistant remembers preferences you clearly set for future diagrams in this project.

## What you get

After successful finalization, open `.diagrams/order-platform/diagram.html` in a browser. It works offline and includes playback controls; the initial state is paused.

| File | Purpose |
| --- | --- |
| `diagram.html` | Offline explanation page and player |
| `diagram.json` | Editable diagram for revisions and exports |
| `report.json`, `report.md` | Sources, completed checks, warnings, and unfinished work |
| `diagram.svg` | Static export explicitly requested in the example |

SVG, PNG, and GIF are optional exports. The HTML page carries only a heading, a one-sentence answer to the reader's question, functional reading hints when needed and the player; source, decision and check records stay in the delivery explanation and reports. Page text is not included in image exports. Keep the HTML, JSON and reports together for later edits that preserve the page design. Authoring reuses one working draft and current outputs; immutable checkpoints are saved only on request. Successful finalization removes the task's drafts and screenshots unless you request retention; failed tasks retain source-identified recovery files.

Direct CLI users receive a concise saved-authoring result; follow its `detailsPath` for the full report. Read-only validation and measurement return necessary results inline.

## What it covers

- System architecture and boundaries, request/response flows, retries, state changes, and staged processing.
- Source-based diagrams with recorded references and content decisions.
- Working drafts, read-only validation, optional factual geometry observations, and checks of delivered files.
- Offline explanations, web illustrations, and image assets for presentations. PPTX files and native PowerPoint shapes are outside the Skill's scope.

## Powered by FlowSVG

[FlowSVG](https://github.com/yokingma/FlowSVG) is an open-source TypeScript SDK for executable diagrams that explain systems and processes. A single editable JSON or TypeScript document describes nodes, connections, groups, scenes, and beats. The SDK validates and renders that document, plays its state changes, and exports offline HTML, SVG, PNG, or GIF. “Executable” refers to authored visual states and transitions; it does not run the business process being explained.

This **Skill** guides the assistant through reading sources, designing the explanation, authoring and revising the diagram, planning layout, inspecting results, and delivering files and reports. **FlowSVG SDK** supplies its rendering and playback foundation. To embed diagrams in an application, the SDK offers native browser, React, Vue, and Web Component integrations; see the [SDK repository](https://github.com/yokingma/FlowSVG) and [npm package](https://www.npmjs.com/package/flowsvg).

Diagrams support plain-label decision, input/output, report and predefined-process shapes. Start with the [application review](skills/flow-diagram/examples/approval-review.md) and its [measurement guidance](skills/flow-diagram/references/document-model.md#preset-labels).

### Runtime dependencies

The Skill prepares these locked packages in its isolated cache:

| Package | Version | Role |
| --- | --- | --- |
| `flowsvg` | `0.4.0` | Diagram validation, content measurement, geometry diagnostics, rendering, playback, and exports |
| `playwright-core` | `1.58.2` | Controls the prepared browser for inspection, PNG, and GIF generation; includes no browser executable |
| `gifenc` | `1.0.3` | GIF encoding, installed transitively through `flowsvg` |

The [runtime manifest](skills/flow-diagram/runtime/manifest.json) records the exact SDK baseline; the [runtime package](skills/flow-diagram/runtime/package.json) and [lockfile](skills/flow-diagram/runtime/package-lock.json) define dependency versions and integrity. A newer upstream SDK release does not automatically upgrade the Skill. React and Vue are optional SDK integrations and are not needed to use this Skill. End-user Node/npm and browser requirements are described under [Install](#install).

## Status

`0.1.0` is the initial independent distribution version and pins the exact `flowsvg@0.4.0` runtime baseline. Its release tag is `v0.1.0`. See the [changelog](CHANGELOG.md#010--2026-11-13) for the release scope.

Platform and assistant-host verification remains limited. See the [known platform limits and verification requirements](docs/development/flow-diagram-maintenance.md#ci-and-platform-evidence) for the current scope.

File generation, automated checks, and actual visual review are reported separately. A missing browser or image viewer leaves dependent inspection incomplete.

## Development

Use Node 20+ and pnpm `10.12.1`:

```sh
pnpm install --frozen-lockfile
pnpm test
```

To browse teaching examples and API exercises, follow the [local preview instructions](examples/README.md#preview-the-example-library), including their coverage and rebuild steps.

Browser-dependent tests skip when `FLOWSVG_TEST_BROWSER` is absent. See [CONTRIBUTING](CONTRIBUTING.md) for browser and consumer acceptance, and the [documentation map](docs/README.md) for maintenance, architecture decisions, and release records.

## License

[MIT](LICENSE), copyright © 2026 zac_ma. The standalone Skill includes the same [license](skills/flow-diagram/LICENSE). See [source and license attribution](CONTRIBUTING.md#source-and-license-attribution) for its FlowSVG origin. Third-party runtime packages retain their own licenses.
