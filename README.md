# Flow SVG Diagram

An executable diagram skill for explaining systems and processes. Author once, then play, embed, inspect, and export.

Flow SVG Diagram：面向系统和流程解释的可执行图表 Skill。一次编写，支持播放、嵌入、检查和导出。

This repository maintains the Skill. [FlowSVG SDK](https://github.com/yokingma/FlowSVG) maintains the document model, rendering, playback, and export APIs. The Skill uses the published `flowsvg@0.2.2` package; it does not require the SDK source repository.

## Install from a local snapshot

Copy the complete [`skills/flow-svg-diagram`](skills/flow-svg-diagram/) directory into your assistant's skill directory. Keep its scripts, references, examples, agents, and runtime files together. Invoke it as `flow-svg-diagram`.

Node 20+ and npm are required. From your chosen working directory, run:

```sh
node /absolute/path/to/flow-svg-diagram/scripts/flowsvg.mjs doctor
node /absolute/path/to/flow-svg-diagram/scripts/flowsvg.mjs prepare
```

Read [SKILL.md](skills/flow-svg-diagram/SKILL.md) for the authoring, inspection, and finalization workflow. The CLI uses its own isolated cache and leaves application dependencies unchanged. PNG, GIF, and browser inspection require a separately prepared Chrome; the tool does not download browsers.


## Development

```sh
pnpm install --frozen-lockfile
```

Repository development dependencies and their pnpm lock are separate from the installed Skill's npm runtime lock. Full maintenance guides, regression tests, and CI are added by the remaining split tickets.
