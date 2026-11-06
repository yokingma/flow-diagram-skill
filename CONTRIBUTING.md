# Contributing

Thanks for helping improve Flow Diagram. Documentation corrections, reproducible bug reports, teaching examples, and focused fixes are welcome. [中文项目介绍](README.zh-CN.md) · [Documentation map](docs/README.md)

## Scope

This repository owns the Skill's authoring, layout plans, diagnostics orchestration, review records, delivery, and isolated runtime. Document-model, rendering, playback, and export API changes belong in [FlowSVG SDK](https://github.com/yokingma/FlowSVG). A Skill contribution must work with the published SDK and without a sibling SDK checkout.

Use the repository’s GitHub Issues for public bug reports and Pull Requests for proposed changes. Maintainers may use the local tracker described below for implementation work; contributors do not need those private work records.

For a bug report, include the checkout commit or release, operating system, Node/npm versions, assistant host if relevant, exact command or prompt, expected and actual behavior, and a minimal diagram that reproduces the problem. For browser-dependent failures, include the browser version and executable selection. Share sanitized excerpts from `report.json` or stdout; replace private source content, credentials, and personal paths with a minimal synthetic example.

For changes to diagram meaning, CLI contracts, or runtime dependencies, explain the proposed behavior before implementing a broad change. Maintainers keep implementation specs and tickets under `.scratch/` using the [local tracker conventions](docs/agents/issue-tracker.md); those work records are separate from user documentation and release evidence.

## Development setup

Use Node.js 20+, npm, and pnpm `10.12.1`, matching [package.json](package.json). Clone this repository and run:

```sh
pnpm install --frozen-lockfile
pnpm test
```

The root pnpm lock controls development dependencies. The Skill's `runtime/package-lock.json` controls installed runtime dependencies. Preserve the exact SDK baseline unless the contribution explicitly upgrades it. Do not install development tools inside the distributable Skill.

Read [AGENTS.md](AGENTS.md), [PATTERNS.md](PATTERNS.md), and the [maintenance guide](docs/development/flow-diagram-maintenance.md) before implementation changes. For domain-contract changes, also read [GLOSSARY.md](GLOSSARY.md) and relevant [ADRs](docs/adr/README.md).

## Validation

- Documentation changes: check relative links and heading fragments, copy paths and CLI examples, and keep English/Chinese READMEs and user guides aligned by task, requirements, defaults, failures, and examples. `pnpm test:guides` exercises the existing guide/example contracts.
- Behavior changes: add or update behavior tests, demonstrate failure before implementation, then run the affected tests and required regressions. Bug fixes need a reproducing regression case. Tests should observe CLI results and side effects rather than mirror internal functions.
- Browser coverage: set `FLOWSVG_TEST_BROWSER` to a separately prepared Chrome/Chromium executable. Tests skip dependent cases when it is absent; report those skips. Tests never download a browser.
- Consumer acceptance: follow the [maintainer verification procedure](docs/development/flow-diagram-maintenance.md#maintainer-verification), using a prepared browser and real Node 18 executable for unsupported-runtime rejection.

Record the exact commands, passed/failed/skipped counts, and unperformed checks in your pull request. Treat generated files, browser automation, and actual image viewing as separate evidence. The [known Windows cancellation gap](docs/development/flow-diagram-maintenance.md#ci-and-platform-evidence) remains incomplete until verified through a real console Ctrl+C runner.

## Pull requests

Keep each pull request focused on one problem. Explain the resulting behavior, validation, and remaining limitations. Use commit subjects in the form `<type>(<scope>): <description>`, such as `docs(skill): clarify browser requirements`.

Executable implementation or code-structure changes require updates to root `CHANGELOG.md`, affected patterns, and affected guides. Pure documentation corrections do not require an implementation changelog entry. Keep installed references self-contained within `skills/flow-diagram/`; human guides and development tooling belong outside that directory.

## Source and license attribution

Flow Diagram originated from `skills/flowsvg/` in [FlowSVG commit `86bb7ad`](https://github.com/yokingma/FlowSVG/tree/86bb7ad29484d7deb63142c1df84c6944a7c0eb4). The upstream repository retains the original development history.

Contributions are distributed under this project's [MIT license](LICENSE), retaining `Copyright (c) 2026 zac_ma`. The installed [Skill license](skills/flow-diagram/LICENSE) must match the root license. Preserve existing copyright notices, and identify the source and license of any third-party material you add. Third-party runtime packages retain their own licenses.

The [regression fixture inventory](tests/fixtures/README.md) records migrated test data. The [showcase asset inventory](docs/images/flowsvg/README.md) records the separately copied README images, their source version and hashes.
