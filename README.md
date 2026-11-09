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

When working from sources, name the files or directories the assistant may read. Include the audience, intended display size, and export formats when known. The assistant asks about gaps that affect meaning or presentation; project design preferences can be saved on explicit request.

## What you get

After successful finalization, open `.diagrams/order-platform/diagram.html` in a browser. It works offline and includes playback controls; the initial state is paused.

| File | Purpose |
| --- | --- |
| `diagram.html` | Offline explanation page and player |
| `diagram.json` | Editable diagram for revisions and exports |
| `report.json`, `report.md` | Sources, completed checks, warnings, and unfinished work |
| `diagram.svg` | Static export explicitly requested in the example |

SVG, PNG, and GIF are optional exports. HTML page prose is outside the diagram and is not included in image exports. Keep the HTML, JSON, and reports together for later edits that preserve the page design. Successful finalization removes the task's drafts and screenshots unless you request history retention; failed tasks retain recovery files.

## What it covers

- System architecture and boundaries, request/response flows, retries, state changes, and staged processing.
- Source-based diagrams with recorded references and content decisions.
- Revisions, read-only validation, layout diagnostics, and checks of delivered files.
- Offline explanations, web illustrations, and image assets for presentations. PPTX files and native PowerPoint shapes are outside the Skill's scope.

## Powered by FlowSVG

[FlowSVG](https://github.com/yokingma/FlowSVG) is an open-source TypeScript SDK for executable diagrams that explain systems and processes. A single editable JSON or TypeScript document describes nodes, connections, groups, scenes, and beats. The SDK validates and renders that document, plays its state changes, and exports offline HTML, SVG, PNG, or GIF. “Executable” refers to authored visual states and transitions; it does not run the business process being explained.

This **Skill** guides the assistant through reading sources, designing the explanation, authoring and revising the diagram, planning layout, inspecting results, and delivering files and reports. **FlowSVG SDK** supplies its rendering and playback foundation. To embed diagrams in an application, the SDK offers native browser, React, Vue, and Web Component integrations; see the [SDK repository](https://github.com/yokingma/FlowSVG) and [npm package](https://www.npmjs.com/package/flowsvg).

Diagrams support plain-label decision, input/output, report and predefined-process shapes. Start with the [mixed approval flow](skills/flow-diagram/examples/mixed-approval-flow.json) and its [measurement guidance](skills/flow-diagram/references/document-model.md#preset-labels).

### Runtime dependencies

The Skill prepares these locked packages in its isolated cache:

| Package | Version | Role |
| --- | --- | --- |
| `flowsvg` | `0.3.1` | Diagram validation, content measurement, geometry diagnostics, rendering, playback, and exports |
| `playwright-core` | `1.58.2` | Controls the prepared browser for inspection, PNG, and GIF generation; includes no browser executable |
| `gifenc` | `1.0.3` | GIF encoding, installed transitively through `flowsvg` |

The [runtime manifest](skills/flow-diagram/runtime/manifest.json) records the exact SDK baseline; the [runtime package](skills/flow-diagram/runtime/package.json) and [lockfile](skills/flow-diagram/runtime/package-lock.json) define dependency versions and integrity. A newer upstream SDK release does not automatically upgrade the Skill. React and Vue are optional SDK integrations and are not needed to use this Skill. End-user Node/npm and browser requirements are described under [Install](#install).

## Status

Experimental. `0.1.0` is the initial independent release candidate; see the [release procedure](docs/releasing.md) for publication and verification requirements. The installation command follows the repository's default branch.

Platform and assistant-host verification is still limited. Windows console Ctrl+C acceptance and Claude Code diagram-task verification remain incomplete. See [known platform limits and verification requirements](docs/development/flow-diagram-maintenance.md#ci-and-platform-evidence); release notes should identify the environments verified for each candidate.

File generation, automated checks, and actual visual review are reported separately. A missing browser or image viewer leaves dependent inspection incomplete.

## Development

Use Node 20+ and pnpm `10.12.1`:

```sh
pnpm install --frozen-lockfile
pnpm test
```

Browser-dependent tests skip when `FLOWSVG_TEST_BROWSER` is absent. See [CONTRIBUTING](CONTRIBUTING.md) for browser and consumer acceptance, and the [documentation map](docs/README.md) for maintenance, architecture decisions, and release records.

## License

[MIT](LICENSE), copyright © 2026 zac_ma. The standalone Skill includes the same [license](skills/flow-diagram/LICENSE). See [source and license attribution](CONTRIBUTING.md#source-and-license-attribution) for its FlowSVG origin. Third-party runtime packages retain their own licenses.
