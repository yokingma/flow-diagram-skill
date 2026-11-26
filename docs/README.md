# Flow Diagram documentation

[Project](../README.md) · [中文介绍](../README.zh-CN.md)

## Skill users

- [English user guide](guides/flow-diagram-guide.md) and [中文用户指南](guides/flow-diagram-guide.zh-CN.md): installation, creation, revisions, exports, and recovery.
- [Teaching examples](../skills/flow-diagram/examples/README.md): runnable diagrams with composition notes and export tips.
- [Skill-generated README images](images/skill-examples/README.md): source identities, tool attribution and export details for local static examples.
- [FlowSVG showcase previews](images/flowsvg/README.md): sources and licenses for the README animations.

## Skill developers

- [Contribution guide](../CONTRIBUTING.md): setup, bug reports, validation, pull requests, and source attribution.
- [Maintenance guide](development/flow-diagram-maintenance.md): installation boundaries, [SDK upgrades](development/flow-diagram-maintenance.md#sdk-baseline-upgrade), verification methods, and platform limits.
- [Plugin distribution maintenance](development/flow-diagram-maintenance.md#plugin-distribution-maintenance): host manifests, shared metadata, release synchronization and installation checks.
- [Manual generation test Skill](../.agents/skills/test-flow-diagram/SKILL.md): user-specified tasks through the globally installed Skill, with a fresh-context subagent and local decision/problem records.
- [GitHub release Skill](../.agents/skills/github-release/SKILL.md): prepare version metadata and bilingual notes, publish an authorized candidate, or revise an existing Release body on request.
- [Example workshop](../examples/README.md) and [中文说明](../examples/README.zh-CN.md): local gallery coverage and rebuild instructions; candidate selection follows [teaching-example maintenance](development/flow-diagram-maintenance.md#teaching-example-maintenance).
- [Repository patterns](../PATTERNS.md) and [CLI patterns](development/flow-diagram-patterns.md): implementation conventions and module responsibilities.
- [Glossary](../GLOSSARY.md) and [architecture decisions](adr/README.md): domain terms, accepted trade-offs, and contracts.
- [Agent work rules](../AGENTS.md), [technical writing](agents/technical-writing.md), [source-comment rules](agents/code-comments.md), and [domain documentation](agents/domain.md): repository development guidance.
- [Local tracker](agents/issue-tracker.md) and [triage labels](agents/triage-labels.md): conventions for ignored local work records.
- [Release procedure](releasing.md) and [changelog](../CHANGELOG.md): distribution and release changes.

## Installed Agent references

The complete installation unit is `skills/flow-diagram/`. Its [SKILL.md](../skills/flow-diagram/SKILL.md) routes the assistant by task; required execution guidance stays inside that directory.

- [Project preferences](../skills/flow-diagram/references/preferences.md): applying and saving user-stated project defaults.
- [Diagram selection and semantic patterns](../skills/flow-diagram/references/semantic-patterns.md#choose-by-the-readers-question): diagram families, type-specific guidance and free composition when no type matches.
- [Layout workflow](../skills/flow-diagram/references/static-layout.md#layout-plan-workflow) and [visual design](../skills/flow-diagram/references/visual-design.md): diagram production.
- [Runtime and result contract](../skills/flow-diagram/references/tool-contract.md): commands, workspaces, reports, and finalization.
- [Review contracts](../skills/flow-diagram/references/review-inputs.md) and [artifact evidence](../skills/flow-diagram/references/artifact-evidence.md): explicit traceable review and registered viewing records. Default visual inspection needs no formal record.

## Documentation scope

Keep reusable usage instructions, current development rules, architecture decisions, release procedures, and attribution in `docs/`. Keep task plans, run logs, acceptance snapshots, publication audits, and case retrospectives in ignored `.scratch/` work records. Summarize relevant verification results in pull requests, CI artifacts, or release notes for the exact candidate. Preserve reusable methods and known limitations in the maintenance guide.

## SDK authority

FlowSVG SDK owns the document model, rendering, playback, export APIs, and application embedding. The Skill's bundled references apply to the SDK baseline recorded in the [runtime manifest](../skills/flow-diagram/runtime/manifest.json) and support offline execution. For SDK APIs, consult the versioned manuals:

- [English SDK manual](https://github.com/yokingma/FlowSVG/blob/b07f9ddc004f015f147d785af307e2456b86ee5b/docs/guides/sdk-guide.md).
- [中文 SDK 手册](https://github.com/yokingma/FlowSVG/blob/b07f9ddc004f015f147d785af307e2456b86ee5b/docs/guides/sdk-guide.zh-CN.md).

Installed execution uses bundled references and the public npm SDK; it does not require online manuals or a sibling SDK checkout.
