# Flow Diagram maintenance

This is the repository entry for maintaining Flow Diagram. For installation, prompts, outputs and revisions, use the [English user guide](../guides/flow-diagram-guide.md) or [中文用户指南](../guides/flow-diagram-guide.zh-CN.md).

## Documentation boundaries

| Reader or task | Start here | Responsibility |
| --- | --- | --- |
| Human user | [English guide](../guides/flow-diagram-guide.md) · [中文指南](../guides/flow-diagram-guide.zh-CN.md) | Installation, task selection, exports, revisions and limits |
| Agent | [SKILL.md](../../skills/flow-diagram/SKILL.md) | Execution order, decision gates and completion reporting |
| Codex interface | [agents/openai.yaml](../../skills/flow-diagram/agents/openai.yaml) | Display name and short UI description; the invocation name is `$flow-diagram` |
| Maintainer | This guide, [patterns](flow-diagram-patterns.md), [current changelog](../../CHANGELOG.md), [release procedure](../releasing.md) | Installation boundary, verification, implementation conventions and history |
| Layout workflow | [Static layout and layout-plan workflow](../../skills/flow-diagram/references/static-layout.md) · [layout-plan contract](../../skills/flow-diagram/references/layout-plan.md) | Agent semantic choices, deterministic geometry and review hand-off |
| Authoring | [Document model](../../skills/flow-diagram/references/document-model.md), [static layout](../../skills/flow-diagram/references/static-layout.md), [semantic patterns](../../skills/flow-diagram/references/semantic-patterns.md), [delivery contexts](../../skills/flow-diagram/references/delivery-contexts.md) | Diagram structure, relationships and display context |
| Visual design | [Visual design](../../skills/flow-diagram/references/visual-design.md) | Shared quality standards, context-specific direction, production recipes and observations for human review |
| Export and evidence | [Export options](../../skills/flow-diagram/references/export.md), [artifact evidence](../../skills/flow-diagram/references/artifact-evidence.md) | Format selection, named batches, on-demand evidence reuse and target-size image review |
| Diagnosis and revision | [Diagnosis and revision decisions](../../skills/flow-diagram/references/diagnostics-and-revisions.md) | Parent selection, finite checks and scoped decisions |
| Visual checks and recovery | [Visual checks](../../skills/flow-diagram/references/visual-checks.md), [troubleshooting](../../skills/flow-diagram/references/troubleshooting.md) | Browser preparation, actual inspection and failure recovery |
| Tool contract | [Runtime and result contracts](../../skills/flow-diagram/references/tool-contract.md) | Commands, cache behavior, reports and the registry baseline |

The layout-plan workflow is the single command-order reference for draft, measurement, layout, validation, author/review and finalization. Keep its HTML-review and target-size evidence branches explicit; do not copy that sequence into the main skill or user guides. Keep visual production rules in the visual design reference and technical field and evidence contracts in their existing references. Reported quality states describe recorded checks and coverage; the user judges the final design.

Project preference preflight and file management are Agent rules in [preferences.md](../../skills/flow-diagram/references/preferences.md); purpose and display defaults remain in `delivery-contexts.md`. The CLI does not read or write preferences. Keep the preference contract in that single installed reference, including default markers, revisions, explicit persistence, invalid files and reset recovery. Keep bilingual guides aligned with those rules. Neutral presentation recipes in `examples/` carry their invented source metadata; copied-install tests verify content fit and exports, while the example index records independently viewed conditions and limits. Add visual questions within the existing four observation fields unless a separate contract change is explicitly designed.

The complete human user guides and this maintenance guide belong in project `docs/`. Root READMEs and the [documentation map](../README.md#skill-users) provide discovery. Keep the English and Chinese user guides aligned by task, prerequisites, defaults, failure behavior and examples; `SKILL.md` is an Agent contract, not an English substitute for a user guide.

## Ownership and independent releases

The Skill repository owns authoring, layout plans, checks, review records, delivery reports, its runtime baseline, and acceptance. The [SDK manual at the source snapshot](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/guides/sdk-guide.md) owns the document model, nodes, edges, timeline, playback, and export APIs. Installation references remain self-contained and apply to the exact `flowsvg@0.2.2` baseline; they are operational guidance rather than a separate SDK API authority. No local sibling checkout is required.

The first independent distribution version is prepared as `v0.1.0` and is not yet published. Runtime report tool versions and diagram document versions are separate identities. Keep the installed runtime npm lock separate from repository development pnpm dependencies. Explicit SDK baseline updates require synchronized manifest/lock integrity and repeated isolated acceptance before release; the compatibility range never selects a runtime version. Repository release records live in the root [CHANGELOG](../../CHANGELOG.md).

## Installation boundary

The standalone installation unit is `skills/flow-diagram/`. Preserve `LICENSE`, `SKILL.md`, `agents/`, `scripts/`, `references/`, `examples/` and `runtime/`, including the runtime manifest and lockfile. `agents/openai.yaml` supplies optional Codex UI metadata; it does not add runtime or tool dependencies. Automatic skill selection remains enabled by default. See [official skill metadata](https://developers.openai.com/codex/skills/#optional-metadata) for the host configuration. The tools run through Node 20+ and npm without source-workspace dependencies. See [ADR 0006](../adr/0006-authoring-skill-uses-public-sdk.md) for the integration decision.

An installed skill needs no README or full human user guide. All bundled document references, module imports, metadata assets, examples and runtime resources must resolve within the copied installation unit. Do not reference source-repository files or sibling skills. User-selected inputs, output directories, the isolated dependency cache and prepared browser executables are external runtime locations, not bundled resources. Keep runtime instructions and required examples inside the unit. The CLI's actual commands, cache behavior and report contract are defined in [the tool contract](../../skills/flow-diagram/references/tool-contract.md).

Keep repository conventions in [PATTERNS](../../PATTERNS.md), CLI conventions in [skill patterns](flow-diagram-patterns.md), and new release history in [CHANGELOG](../../CHANGELOG.md), all outside the installation unit. The installed skill contains its license, Agent contract, host metadata and task resources. When executable implementation or source structure changes, review and update these project maintenance documents under the project conventions. Pure documentation changes do not require an implementation history entry.

## Acceptance scope

Ordinary tasks use a temporary workspace and explicit history root, then `finalize` publishes only final files and a portable report before cleaning that workspace. See [ADR 0010](../adr/0010-final-diagram-files-by-default.md). Installed-CLI tests verify export retention across reviews, exact-task cleanup, explicit retention, and preservation of work and prior delivery after failure.

The skill is experimental and uses an exact registry SDK baseline. The current supported range is `>=0.2.2 <0.3.0`, while the runtime manifest and lockfile select one exact version and integrity. `validate --input` is read-only and needs no diagram name. `validate --from` requires an explicit name and verifies the selected saved input without creating a version. Formal warning decisions use saved `author` reports; authoring examples should provide a name. Preview sampling defaults to 12 points and can be reduced with `--samples`; a full clean visual review reports `quality: passed`. Platform and host claims require verification for the exact release candidate; see [CI and platform evidence](#ci-and-platform-evidence). Future SDK upgrades require a new exact baseline and repeat the independent acceptance; a compatibility range never authorizes dynamic installation.

Keep reusable verification procedures in this guide and follow the [documentation scope](../README.md#documentation-scope) when saving work records. Summarize candidate-specific commands, outcomes, and limits in the corresponding pull request or release.

## Maintainer verification

From the repository root, run:

```text
pnpm test
```

`pnpm test` runs the Skill regression suites selected by the root package scripts. `pnpm test:guides` runs the guide/example subset declared in `package.json`. Test fixtures live in `tests/fixtures/`; GIF tests import the repository's direct `gifuct-js@2.1.2` development dependency. Neither path uses SDK source or historical working directories. A guide-only pass does not establish complete coverage. Tests copy the installation unit outside the workspace and inspect the real CLI, reports, files and observable side effects. Set `FLOWSVG_TEST_BROWSER` to a prepared Chrome/Chromium executable to include browser-dependent checks; without it, those tests are skipped. Tests do not download a browser.

Run the independent consumer gate from the repository root with a prepared browser and a real Node 18 executable:

```text
node scripts/verify-authoring-skill.mjs --skill skills/flow-diagram --browser "/path/to/prepared/chrome" --node18 "/path/to/node18" --output acceptance/evidence.json
```

This script is repository maintainer tooling, outside the installation unit. It records actual versions, hashes and contract outcomes. Missing prerequisites or unexecuted required contracts cause a nonzero exit status. The Node 18 executable tests rejection of an unsupported runtime; it is not the supported runtime for authoring.

For documentation changes, check local paths and Markdown anchors from both root READMEs and the documentation map. Copy the entire skill outside the repository, then verify every bundled reference stays inside that copy and resolves. Check Markdown links, paths in prose and commands, metadata assets, script imports, runtime file dependencies and archive contents. Check each relative Markdown destination from its containing file, each heading fragment against the target heading, and each bundled link against the copied installation root. The copied `LICENSE` must match the root license. Historical source links support provenance only; the current checks must work from this repository. Run the user guide's `doctor`, browser-free `author` and `finalize` examples from a separate working directory with an isolated cache to verify that the copied skill needs no project documentation.

## CI and platform evidence

[The workflow](../../.github/workflows/authoring-skill.yml) configures Ubuntu, macOS, and Windows with Node 20/22, retains an actual Node 18 executable for rejection checks, and prepares Chrome at the runner level. Each job installs the frozen development lock, runs every regression with that browser, then runs the external installed-CLI consumer gate. Changes to installation resources, tests/fixtures, guides, scripts, root configurations/locks, maintenance records, and workflows trigger these checks. JSON regression and consumer evidence is uploaded even when a gate fails.

Use CI results for the exact candidate when claiming verified platforms. A configured matrix or a local pass does not establish results for other platforms, runtimes, or later commits. Record failures, skips, and incomplete gates in the pull request and release notes.

The consumer harness reports graceful cancellation as `not-run` on Windows because `child.kill(SIGINT)` force-terminates Windows children. A real console Ctrl+C runner is still required. The Windows consumer gate therefore remains incomplete/nonzero, and regression cancellation cases may also fail on that platform. Keep that limitation explicit until verified. Claude Code diagram-task execution also remains unverified; installation instructions alone do not establish host acceptance.

## Host verification

CLI tests verify tools rather than the assistant's task selection, interpretation, or viewing. To verify an assistant host:

1. Install the complete Skill outside this repository and record the candidate commit, host, OS, Node/npm, browser, and exact SDK identity.
2. Use synthetic sources to exercise creation, authorized source scope, ambiguous meaning, long content, animation, revisions, and exports. Compare objects, relationship directions, boundaries, and recorded decisions with the sources.
3. Continue from final JSON and an explicitly retained parent revision. Check final files, scoped cleanup, requested history retention, invalid input, missing browsers, cancellation, and failure recovery.
4. View the actual saved HTML and requested image surfaces at their intended sizes. Record file identities, viewed states, observations, and unperformed checks separately from programmatic browser facts.
5. Save raw sessions, inputs, reports, and images in local work records or candidate CI artifacts. Publish a concise result with the candidate and environment identities, completed cases, failures, and coverage limits.

Verification is complete only for the recorded candidate, host, cases, and display conditions. Retain missing capabilities as incomplete coverage; a successful process exit does not establish semantic or visual quality.

## Layered architecture teaching example

The self-contained installation unit includes `examples/layered-architecture.json`, its source metadata record and the layered section in `references/semantic-patterns.md`. The layered architecture sample deliberately shows multiple columns inside three layers, heading space inside groups, labelled cross-layer edges and a dashed governance sidebar. Its text states that layer order does not establish call order, groups do not automatically establish deployment or trust boundaries, and governance annotations do not create undeclared runtime dependencies.

The example is maintained as a measured draft. Run `measure --input` against the source draft and write a new draft before `validate` or `author`; keep coordinates, group sizes and spacing under author review. Label-only records expose deterministic line estimates and required heights; these estimates do not establish browser pixel fit. Numeric row heights, column gaps and label clearance are verified starting values for the sample's typography and intended display width. The installed CLI acceptance must exercise the copied skill, preserve the source draft, produce JSON/HTML/SVG/PNG when a browser is available, and finalize only the selected result. Program checks record structure and file completion; actual HTML and image inspection remains a separate evidence step.

## Review input preparation

The installed CLI `review-template` reads only registered source evidence and publishes an exclusive unviewed form in the same canonical task workspace. `review-contract.mjs` is the single shape validator for all three review kinds. `review-preflight.mjs/preflightReviews(options, { authoring })` returns `{ parent, source, report, materials }`; `materials` is keyed by `visual`, `html` or `artifact`, with `{ review, bytes, entries, path }` for each supplied form. `entries` contains verified source identity plus supplied observations/issues. No preflight helper writes files or prepares the SDK. `authoring: true` additionally checks the effective author theme. See [the user-facing contract](../../skills/flow-diagram/references/review-inputs.md).

Run `authoring-skill-review-preflight.test.ts` against the copied installation. Set `FLOWSVG_TEST_BROWSER` to an already prepared browser for all three template kinds and identity/scope cases; absence skips those cases explicitly. The regression records invalid submission tree preservation and runtime/browser avoidance independently of quality.

## Independent review records

`review.mjs/submitReview` consumes the verified preflight without authoring execution. `review-records.mjs` builds semantic content IDs, publishes complete append-only records and reloads them with source/report/screenshot verification. `loadReviewRecords(records)` accepts selected real ancestry records and returns `{record, context}` entries; context includes verified `materials[kind].entries`. `review-projection.mjs/aggregateReviews(records, independent, {htmlSha256})` returns a cloned report, keeps selected requirements, unions applicable observations and issues, and recomputes quality. It never writes history. `saved-revisions.mjs/readSavedRevisions(root, id)` supplies the same unchanged-context ancestry to review and finalization. Review IDs remain separate from source revisions. See [ADR 0014](../adr/0014-independent-review-records.md).

Run the copied-install `authoring-skill-independent-review.test.ts` with prepared Chrome to verify exact duplicate reuse, partial animated coverage, repeated ancestor state de-duplication, issue retention, selected-plan/display boundaries and tampered evidence/records. A cache path that is an ordinary input file proves valid review needs no runtime preparation; Playwright logs and task-tree bytes independently check browser/file side effects. Browser absence remains an explicit skip for capture-dependent tests.

Independent formal-image acceptance uses a copied installation and real registered SVG/PNG, multiple target sizes/backdrops, named animation exports and explicit evidence-source selection. Synthetic review fixtures test attestation mechanics only; they do not establish actual viewing or user aesthetic acceptance. Repeated review must add no design artifacts or browser launches.

## Independent evidence verification

The standalone formal-image check uses `evidence`, repeats under an unavailable browser and unusable cache, then reviews its independent source. Synthetic attestations test contracts only. The dedicated copied-install CLI suite covers accumulated conditions, old revision capture reuse, changed contexts, missing browsers, cancellation, named exports and damaged-image recovery. Raw rendering and cost observations remain separate from actual viewing.
