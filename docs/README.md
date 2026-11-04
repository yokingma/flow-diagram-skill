# Flow SVG Diagram documentation

[Project](../README.md) · [中文介绍](../README.zh-CN.md)

## Skill users

- [English user guide](guides/flowsvg-skill-guide.md) and [中文用户指南](guides/flowsvg-skill-guide.zh-CN.md): install, select tasks, create, revise, export, and recover.
- [Project preferences](../skills/flow-svg-diagram/references/preferences.md): preflight, explicit persistence and reset.
- [Installed Agent contract](../skills/flow-svg-diagram/SKILL.md): execution order and completion gates.
- [Layout workflow](../skills/flow-svg-diagram/references/static-layout.md#layout-plan-workflow), [visual design](../skills/flow-svg-diagram/references/visual-design.md), and [examples](../skills/flow-svg-diagram/examples/README.md): design and production resources.
- [Runtime and result contract](../skills/flow-svg-diagram/references/tool-contract.md): task workspace, commands, SDK identity, reports, and finalization.
- [Review contracts](../skills/flow-svg-diagram/references/review-inputs.md) and [artifact evidence](../skills/flow-svg-diagram/references/artifact-evidence.md): registered evidence and actual viewing.

## Maintainers

- [Contribution guide](../CONTRIBUTING.md) and [release procedure](releasing.md).
- [Maintenance guide](development/flowsvg-skill-maintenance.md), [repository patterns](../PATTERNS.md), and [CLI patterns](development/flowsvg-skill-patterns.md).
- [Glossary](../GLOSSARY.md), [architecture decisions](adr/README.md), and [Agent work rules](../AGENTS.md).
- [Local tracker](agents/issue-tracker.md), [triage labels](agents/triage-labels.md), and [source-comment rules](agents/code-comments.md).

## Acceptance


The complete regression suite and installed-CLI consumer gate are available locally. The three-platform Node 20/22 [CI workflow](../.github/workflows/authoring-skill.yml) is configured; local results and platform limits are recorded in ticket 04. No remote CI has been run by these local checks. File generation and programmatic browser checks do not attest actual viewing.

## SDK authority

FlowSVG SDK owns document model, nodes, edges, timeline, rendering, playback, and export APIs. The Skill's bundled references apply to its precise `flowsvg@0.2.2` runtime baseline and support offline execution; the SDK manuals are the API authority:

- [English SDK manual at source commit 86bb7ad](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/guides/sdk-guide.md).
- [中文 SDK 手册，来源提交 86bb7ad](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/guides/sdk-guide.zh-CN.md).

These explicit-version references are optional reading. Installed execution does not require network documentation or a local SDK checkout.
