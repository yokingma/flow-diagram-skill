# Flow SVG Diagram

Create editable system and process diagrams with an AI coding assistant. Describe the relationships, provide source material, and receive a static or animated diagram with offline playback and inspection reports.

[简体中文](README.zh-CN.md) · [User guide](docs/guides/flowsvg-skill-guide.md) · [Examples](skills/flow-svg-diagram/examples/README.md) · [Documentation](docs/README.md)

## What you can do

- Explain architectures, request/response flows, retries, state changes, and staged processing.
- Create diagrams from designated files or repository sources, with recorded sources and decisions.
- Revise editable JSON, validate existing diagrams, and inspect layout diagnostics.
- Deliver offline HTML with page introductions outside the diagram and embedded playback controls; request SVG, PNG, or GIF for other uses.

This repository maintains the **Skill**: authoring, layout plans, checks, review, and delivery. [FlowSVG SDK](https://github.com/yokingma/FlowSVG) maintains the document model, rendering, playback, export APIs, and application embedding. The Skill uses the published `flowsvg@0.2.2` package in an isolated cache. You do not need the SDK source repository or an SDK dependency in your application. “Executable” diagrams play authored visual states; they do not run the business process being explained.

## Requirements

- An assistant that supports skills and can execute local Node commands, such as Codex or Claude Code.
- Node.js 20+ and npm. Initial runtime preparation needs access to the npm registry; a complete cache can then be reused offline.
- A separately prepared Chrome/Chromium executable for PNG, GIF, and browser inspection. JSON, HTML, and SVG generation work without it. The Skill never downloads a browser.

## Install

The recommended installation uses the Skills CLI. From any project, run:

```sh
npx skills add yokingma/flow-svg-diagram-skills
```

The CLI discovers `skills/flow-svg-diagram/SKILL.md` and lets you select the Skill and target Agent interactively. To install directly to the global Codex directory without prompts, use:

```sh
npx skills add yokingma/flow-svg-diagram-skills --global --agent codex --yes
```

Without `--global`, the Skill is installed for the current project. Use `npx skills list`, `npx skills check`, and `npx skills update flow-svg-diagram` to inspect and update a managed installation. The shorthand resolves the repository's default branch; use a release tag or commit when reproducibility matters.

For local development or a manually pinned checkout, clone the repository and copy the complete [`skills/flow-svg-diagram/`](skills/flow-svg-diagram/) directory. Preserve all files, including `LICENSE`, scripts, references, examples, and runtime locks. From the cloned repository, a first user-level Codex installation on macOS/Linux is:

```sh
mkdir -p "$HOME/.agents/skills"
cp -R skills/flow-svg-diagram "$HOME/.agents/skills/flow-svg-diagram"
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" prepare
```

Use this copy command only when the destination does not already exist. For updates, back up and replace the whole installed directory so removed files do not survive an update. The [installation guide](docs/guides/flowsvg-skill-guide.md#2-install-in-a-host) covers project-level paths, Claude Code, and PowerShell. Restart Codex if the new Skill is not discovered. You do not need `pnpm install` to use the Skill.

## Create your first diagram

In Codex, send:

```text
$flow-svg-diagram
Create a static architecture diagram: a client calls an API service,
and the API service queries a database. The API and database belong to
the Order platform; the client is outside that boundary.
Use English labels and a light theme. Name it order-platform.
Deliver the default JSON and offline HTML, and also export SVG.
```

In Claude Code, use `/flow-svg-diagram` on the first line. For animation, request the sequence and state changes explicitly. See the [user guide](docs/guides/flowsvg-skill-guide.md) for source-based tasks, revisions, exports, and direct CLI use.

Successful finalization saves the selected result under your working directory:

```text
.diagrams/order-platform/
  diagram.json
  diagram.html
  diagram.svg       # requested in this example
  report.json
  report.md
```

Open `diagram.html` in a browser for offline viewing and playback. Keep `diagram.html`, `diagram.json` and the reports for later edits that preserve the page design. The reports distinguish file delivery, completed checks, and unresolved issues. Successful finalization removes this task's drafts and screenshots unless you ask to retain history; failed tasks retain recovery files.

## Status and limits

The project is experimental; `0.1.0` is the initial independent version under preparation. Skill, tool-report, and SDK versions are separate identities. Use a release tag or record your checkout commit when you need a reproducible installation; this README does not assert that a release tag has been published.


File generation and automated checks do not establish actual visual review. Missing browsers or image-viewing capability leave inspection coverage incomplete. The Skill produces diagram assets; PPTX files and native PowerPoint shapes are outside its scope.

## Development and contribution

Use Node 20+ and pnpm `10.12.1` (the `packageManager` version):

```sh
pnpm install --frozen-lockfile
pnpm test
```

Browser-dependent tests are skipped unless `FLOWSVG_TEST_BROWSER` points to a prepared Chrome/Chromium executable. The separate full consumer gate also requires a real Node 18 executable to test unsupported-runtime rejection:

```sh
pnpm verify:consumer --browser "/path/to/chrome" --node18 "/path/to/node18" --output acceptance/evidence.json
```

Read [CONTRIBUTING](CONTRIBUTING.md), the [maintenance guide](docs/development/flowsvg-skill-maintenance.md), [patterns](PATTERNS.md), [changelog](CHANGELOG.md), and [release procedure](docs/releasing.md). Development dependencies use the root pnpm lock; the installed Skill has its own npm runtime lock.

## License and provenance

[MIT](LICENSE), copyright © 2026 zac_ma. The distributable Skill includes the same [license](skills/flow-svg-diagram/LICENSE). This repository was extracted from FlowSVG; [snapshot provenance](docs/snapshot-provenance.md) records the source commit, retained attribution, and runtime identity. Third-party runtime packages retain their own licenses.
