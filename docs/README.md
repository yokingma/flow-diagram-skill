# Flow Diagram documentation

[Project](../README.md) · [中文介绍](../README.zh-CN.md)

## Skill users

- [English user guide](guides/flow-diagram-guide.md) and [中文用户指南](guides/flow-diagram-guide.zh-CN.md): installation, creation, revisions, exports, and recovery.
- [Teaching examples](../skills/flow-diagram/examples/README.md): starting diagrams and their intended display conditions.
- [FlowSVG showcase previews](images/flowsvg/README.md): source and license of the animations displayed in the root READMEs.

## Skill developers

- [Contribution guide](../CONTRIBUTING.md): setup, bug reports, validation, pull requests, and source attribution.
- [Maintenance guide](development/flow-diagram-maintenance.md): installation boundaries, verification methods, and platform limits.
- [Repository patterns](../PATTERNS.md) and [CLI patterns](development/flow-diagram-patterns.md): implementation conventions and module responsibilities.
- [Glossary](../GLOSSARY.md) and [architecture decisions](adr/README.md): domain terms, accepted trade-offs, and contracts.
- [Agent work rules](../AGENTS.md), [technical writing](agents/technical-writing.md), [source-comment rules](agents/code-comments.md), and [domain documentation](agents/domain.md): repository development guidance.
- [Local tracker](agents/issue-tracker.md) and [triage labels](agents/triage-labels.md): conventions for ignored local work records.
- [Release procedure](releasing.md) and [changelog](../CHANGELOG.md): distribution and release changes.

## Installed Agent references

The complete installation unit is `skills/flow-diagram/`. Its [SKILL.md](../skills/flow-diagram/SKILL.md) routes the assistant by task; required execution guidance stays inside that directory.

- [Project preferences](../skills/flow-diagram/references/preferences.md): preflight and explicit persistence.
- [Layout workflow](../skills/flow-diagram/references/static-layout.md#layout-plan-workflow) and [visual design](../skills/flow-diagram/references/visual-design.md): diagram production.
- [Runtime and result contract](../skills/flow-diagram/references/tool-contract.md): commands, workspaces, reports, and finalization.
- [Review contracts](../skills/flow-diagram/references/review-inputs.md) and [artifact evidence](../skills/flow-diagram/references/artifact-evidence.md): inspections and actual-viewing records.

## Documentation scope

Keep reusable usage instructions, current development rules, architecture decisions, release procedures, and attribution in `docs/`. Keep task plans, run logs, acceptance snapshots, publication audits, and case retrospectives in ignored `.scratch/` work records. Summarize relevant verification results in pull requests, CI artifacts, or release notes for the exact candidate. Preserve reusable methods and known limitations in the maintenance guide.

## SDK authority

FlowSVG SDK owns the document model, rendering, playback, export APIs, and application embedding. The Skill's bundled references apply to its locked `flowsvg@0.3.1` runtime and support offline execution. For SDK APIs, consult the versioned manuals:

- [English SDK manual at source commit 726a31b](https://github.com/yokingma/FlowSVG/blob/726a31bb52c0af50439d6bdf1d087814af48f70c/docs/guides/sdk-guide.md).
- [中文 SDK 手册，来源提交 726a31b](https://github.com/yokingma/FlowSVG/blob/726a31bb52c0af50439d6bdf1d087814af48f70c/docs/guides/sdk-guide.zh-CN.md).

Installed execution uses bundled references and the public npm SDK; it does not require online manuals or a sibling SDK checkout.
