# Flow SVG Diagram

An executable diagram skill for explaining systems and processes. Author once, then play, embed, inspect, and export.

Flow SVG Diagram：面向系统和流程解释的可执行图表 Skill。一次编写，支持播放、嵌入、检查和导出。

[English user guide](docs/guides/flowsvg-skill-guide.md) · [中文介绍](README.zh-CN.md) · [中文用户指南](docs/guides/flowsvg-skill-guide.zh-CN.md) · [Documentation map](docs/README.md)

This repository maintains the Skill. [FlowSVG SDK](https://github.com/yokingma/FlowSVG) maintains the document model, rendering, playback, and export APIs. The Skill uses the published `flowsvg@0.2.2` package; it does not require the SDK source repository.

## Install from a local snapshot

Copy the complete [`skills/flow-svg-diagram`](skills/flow-svg-diagram/) directory into your assistant's skill directory. Keep its scripts, references, examples, agents, and runtime files together. Invoke it as `flow-svg-diagram`.

Node 20+ and npm are required. From your chosen working directory, run:

```sh
node /absolute/path/to/flow-svg-diagram/scripts/flowsvg.mjs doctor
node /absolute/path/to/flow-svg-diagram/scripts/flowsvg.mjs prepare
```

Read the [user guide](docs/guides/flowsvg-skill-guide.md) for prompts, outputs, revisions, and command-line examples. [SKILL.md](skills/flow-svg-diagram/SKILL.md) defines the Agent's authoring, inspection, and finalization workflow. The CLI uses its own isolated cache and leaves application dependencies unchanged. PNG, GIF, and browser inspection require a separately prepared Chrome; the tool does not download browsers.


## Development

```sh
pnpm install --frozen-lockfile
pnpm test
```

Repository development dependencies and their pnpm lock are separate from the installed Skill's npm runtime lock. Read the [maintenance guide](docs/development/flowsvg-skill-maintenance.md), [patterns](PATTERNS.md), and [changelog](CHANGELOG.md). All 27 Skill regression files are available in `tests/`, with owned fixtures and a direct GIF decoding test dependency. Set `FLOWSVG_TEST_BROWSER` to prepared Chrome to include browser-dependent cases; a run without it reports those cases as skipped. Run the separate consumer gate with `pnpm verify:consumer --browser "/path/to/chrome" --node18 "/path/to/node18" --output acceptance/evidence.json`. See [local browser acceptance and CI limits](docs/development/flowsvg-skill-maintenance.md#ci-and-platform-evidence). A file-delivery pass does not establish actual visual review or cross-platform acceptance.
