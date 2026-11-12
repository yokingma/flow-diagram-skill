# Flow Diagram maintenance

This is the repository entry for maintaining Flow Diagram. For installation, prompts, outputs and revisions, use the [English user guide](../guides/flow-diagram-guide.md) or [中文用户指南](../guides/flow-diagram-guide.zh-CN.md).

## Documentation boundaries

| Reader or task | Start here | Responsibility |
| --- | --- | --- |
| Human user | [English guide](../guides/flow-diagram-guide.md) · [中文指南](../guides/flow-diagram-guide.zh-CN.md) | Installation, task selection, exports, revisions and limits |
| Agent | [SKILL.md](../../skills/flow-diagram/SKILL.md) | Default process, task branches and completion reporting |
| Codex interface | [agents/openai.yaml](../../skills/flow-diagram/agents/openai.yaml) | Display name and short UI description; the invocation name is `$flow-diagram` |
| Maintainer | This guide, [patterns](flow-diagram-patterns.md), [current changelog](../../CHANGELOG.md), [release procedure](../releasing.md) | Installation boundary, verification, implementation conventions and history |
| Layout workflow | [Static layout and layout-plan workflow](../../skills/flow-diagram/references/static-layout.md) · [layout-plan contract](../../skills/flow-diagram/references/layout-plan.md) | Agent semantic choices, deterministic geometry and review hand-off |
| Authoring | [Document model](../../skills/flow-diagram/references/document-model.md), [static layout](../../skills/flow-diagram/references/static-layout.md), [semantic patterns](../../skills/flow-diagram/references/semantic-patterns.md), [delivery contexts](../../skills/flow-diagram/references/delivery-contexts.md) | Diagram structure, relationships and display context |
| Visual design | [Visual design](../../skills/flow-diagram/references/visual-design.md) | Shared quality standards, context-specific direction, production recipes and observations for human review |
| Export and evidence | [Export options](../../skills/flow-diagram/references/export.md), [artifact evidence](../../skills/flow-diagram/references/artifact-evidence.md) | Format selection, named batches, on-demand evidence reuse and target-size image review |
| Diagnosis and revision | [Diagnosis and revision decisions](../../skills/flow-diagram/references/diagnostics-and-revisions.md) | Parent selection, finite checks and scoped decisions |
| Visual checks and recovery | [Visual checks](../../skills/flow-diagram/references/visual-checks.md), [troubleshooting](../../skills/flow-diagram/references/troubleshooting.md) | Browser preparation, actual inspection and failure recovery |
| Tool contract | [Runtime and result contracts](../../skills/flow-diagram/references/tool-contract.md) | Commands, cache behavior, reports and the registry baseline |

`SKILL.md` owns the default production process and its task branches. The layout-plan workflow owns the local operation order when geometry assistance is selected; it is optional. Formal review follows its own contract only when explicitly requested. Keep visual production rules in the visual design reference and technical field and evidence contracts in their existing references. Reported quality states describe recorded checks and coverage; the user judges the final design.

Project preference resolution and file management are Agent rules in [preferences.md](../../skills/flow-diagram/references/preferences.md); purpose and display defaults remain in `delivery-contexts.md`. The CLI does not read or write preferences. Keep the preference contract in that single installed reference, including scope, revision and export precedence, authorization, conflicting items and reset behavior. Keep bilingual guides aligned with those rules. Selected teaching examples in installed `examples/` have adjacent notes, with scoped fictional facts in `resources/teaching-sources.json`. The index routes by reader question and states display limits. Historical recipe inputs live in test fixtures; copied-install tests preserve their behavior assertions independently of the current teaching library. Add visual questions within the existing four observation fields unless a separate contract change is explicitly designed.

The complete human user guides and this maintenance guide belong in project `docs/`. Root READMEs and the [documentation map](../README.md#skill-users) provide discovery. Keep the English and Chinese user guides aligned by task, prerequisites, defaults, failure behavior and examples; `SKILL.md` is an Agent contract, not an English substitute for a user guide.

Treat edits to `SKILL.md` as changes to execution guidance. Keep task routes, required checks, completion conditions and stop rules explicit. Before removing or relocating an instruction, verify that the affected task still reaches it at the point of action. Judge edits by clarity and behavior; a shorter file is not a goal.

## Teaching example maintenance

Maintain candidates in the repository [example workshop](../../examples/README.md#make-or-revise-a-candidate), which defines example language and working files. For gallery coverage and regeneration, use its [preview instructions](../../examples/README.md#preview-the-example-library).

1. Choose a teaching purpose and declare the main display size and background. Preserve fictional assumptions and unknown facts.
2. Validate and render the current source with the exact SDK baseline. Actually view the declared surfaces, correct observed problems and re-view affected output. For animation, view key stages and continuous playback; state any viewing gap.
3. Show the current preview and a brief recommendation to the user. Batch selection is sufficient. A spec or ticket approval does not select an unseen candidate. Keep candidates with important viewing gaps identifiable so the user can decide whether their limits are acceptable.
4. After selection, place only the selected source, necessary supporting materials and short teaching note in the installed library; update entry points and verify installed references. Remove the candidate work copy and duplicate output. The installed file becomes the only publication source.

For later revisions, create a temporary candidate from that publication source. Re-view affected output and obtain selection for changes to meaning, composition, text layout or animation before replacing it. Path corrections and explanatory errata need only their relevant checks. After an SDK upgrade, re-render and actually view installed examples; request selection again for changed pictures. Previous viewing does not cover the new rendering.

This workflow maintains the reusable example library. Daily diagram production continues through the installed Skill; design guidance and actual viewing supply design judgment, while CLI results describe execution facts. No design scoring or formal review form is required.

## Ownership and independent releases

The Skill repository owns authoring, layout plans, checks, review records, delivery reports, its runtime baseline, and acceptance. The [SDK manual at the source snapshot](https://github.com/yokingma/FlowSVG/blob/726a31bb52c0af50439d6bdf1d087814af48f70c/docs/guides/sdk-guide.md) owns the document model, nodes, edges, timeline, playback, and export APIs. Installation references remain self-contained and apply to the exact `flowsvg@0.3.1` baseline; they are operational guidance rather than a separate SDK API authority. No local sibling checkout is required.

The first independent distribution release is `v0.1.0`. Runtime report tool versions and diagram document versions are separate identities. Keep the installed runtime npm lock separate from repository development pnpm dependencies. Explicit SDK baseline updates require synchronized manifest/lock integrity and repeated isolated acceptance before release; the compatibility range never selects a runtime version. Repository release records live in the root [CHANGELOG](../../CHANGELOG.md).

## Installation boundary

The standalone installation unit is `skills/flow-diagram/`. Preserve `LICENSE`, `SKILL.md`, `agents/`, `scripts/`, `references/`, `examples/`, `resources/` and `runtime/`, including the runtime manifest and lockfile. `agents/openai.yaml` supplies optional Codex UI metadata; it does not add runtime or tool dependencies. Automatic skill selection remains enabled by default. See [official skill metadata](https://developers.openai.com/codex/skills/#optional-metadata) for the host configuration. The tools run through Node 20+ and npm without source-workspace dependencies. See [ADR 0006](../adr/0006-authoring-skill-uses-public-sdk.md) for the integration decision.

An installed skill needs no repository README or full human user guide. Keep its concise teaching index and notes inside the installation unit. The installed `examples/` contains only selected complete diagrams and notes; `resources/` holds required execution helpers and scoped teaching facts. Development exercises belong in repository `examples/development/`, and regression inputs stay in `tests/fixtures/`. All bundled document references, module imports, metadata assets, examples and runtime resources must resolve within the copied installation unit. Do not reference source-repository files or sibling skills. User-selected inputs, output directories, the isolated dependency cache and prepared browser executables are external runtime locations, not bundled resources. Keep runtime instructions and required examples inside the unit. The CLI's actual commands, cache behavior and report contract are defined in [the tool contract](../../skills/flow-diagram/references/tool-contract.md).

Keep repository conventions in [PATTERNS](../../PATTERNS.md), CLI conventions in [skill patterns](flow-diagram-patterns.md), and new release history in [CHANGELOG](../../CHANGELOG.md), all outside the installation unit. The installed skill contains its license, Agent contract, host metadata and task resources. When executable implementation or source structure changes, review and update these project maintenance documents under the project conventions. Pure documentation changes do not require an implementation history entry.

## Acceptance scope

Ordinary tasks use a temporary workspace and explicit history root, then `finalize` publishes only final files and a portable report before cleaning that workspace. See [ADR 0010](../adr/0010-final-diagram-files-by-default.md). Installed-CLI tests verify export retention across reviews, exact-task cleanup, explicit retention, and preservation of work and prior delivery after failure.

The runtime manifest and lockfile select the exact public `flowsvg@0.3.1` package. For validation, capture and report behavior, use the installed [tool contract](../../skills/flow-diagram/references/tool-contract.md). Ordinary reports state execution facts; actual viewing and user judgment establish visual conclusions. Explicit traceable review follows the [formal review contract](../../skills/flow-diagram/references/review-inputs.md). Platform and host claims require verification for the exact published version; see [CI and platform evidence](#ci-and-platform-evidence). An SDK upgrade selects a new exact baseline and repeats independent acceptance.

Keep reusable verification procedures in this guide and follow the [documentation scope](../README.md#documentation-scope) when saving work records. Summarize candidate-specific commands, outcomes, and limits in the corresponding pull request or release.

Preset-label measurement uses public `measureNodeLabel` for four shape kinds; ordinary-label measurement covers initial labels. Layout accepts static drafts; complete-draft measurement handles animated preset label replacements. Run `tests/authoring-skill-preset-labels.test.ts` for safe-area heights, empty labels, unresolved width issues, source/output preservation, final planned widths and mixed-flow delivery. Supply the prepared browser to include PNG/GIF and actual-page capture in that delivery case. Captures do not establish actual viewing.

## Maintainer verification

From the repository root, run:

```text
pnpm test
```

`pnpm test` runs the Skill regression suites selected by the root package scripts. `pnpm test:guides` runs the guide/example subset declared in `package.json`. Test fixtures live in `tests/fixtures/`; legacy teaching inputs in `teaching-regressions/` and the high-density layout pair in `layout-assistance/` retain their original bytes and behavior assertions independently of selected teaching sources.

The installed `resources/` contains the editable HTML starter and independent content-measurement input; the layout-plan reference includes a complete runnable input and plan.

GIF tests import the repository's direct `gifuct-js@2.1.2` development dependency. Neither path uses SDK source or historical working directories. A guide-only pass does not establish complete coverage. Tests copy the installation unit outside the workspace and inspect the real CLI, reports, files and observable side effects. Set `FLOWSVG_TEST_BROWSER` to a prepared Chrome/Chromium executable to include browser-dependent checks; without it, those tests are skipped. Tests do not download a browser.

Run the independent consumer gate from the repository root with a prepared browser and a real Node 18 executable. The harness exercises mutable current drafts by default and explicitly requests checkpoints, SDK previews or formal review only for the contracts that need them:

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

The self-contained installation unit includes `examples/layered-architecture.json`, its adjacent teaching note, the scoped record in `resources/teaching-sources.json` and the layered section in `references/semantic-patterns.md`. The layered architecture sample deliberately shows multiple columns inside three layers, heading space inside groups, collective cross-layer edges with nearby annotations and a dashed governance sidebar containing policy and observability records. Its text states that layer order does not establish call order, groups do not automatically establish deployment or trust boundaries, and governance annotations do not create undeclared runtime dependencies.

The example is maintained as a measured draft. Copy the source into a canonical task-root draft and use `measure --input <draft> --in-place` when height backfill is needed, then validate and author that same source; keep coordinates, group sizes and spacing under author review. Label-only records expose deterministic line estimates and required heights; these estimates do not establish browser pixel fit. Numeric row heights, column gaps and label clearance are verified starting values for the sample's typography and intended display width. The installed CLI acceptance must exercise the copied skill, preserve the source draft, produce JSON/HTML/SVG/PNG when a browser is available, and finalize only the selected result. Program checks record structure and file completion; actual HTML and image viewing remains separate; registered evidence is added only for requested formal review.

## Review input preparation

The installed CLI `review-template` reads only registered source evidence and publishes an exclusive unviewed form in the same canonical task workspace. `review-contract.mjs` is the single shape validator for all three review kinds. `review-preflight.mjs/preflightReviews(options, { authoring })` returns `{ parent, source, report, materials }`; `materials` is keyed by `visual`, `html` or `artifact`, with `{ review, bytes, entries, path }` for each supplied form. `entries` contains verified source identity plus supplied observations/issues. No preflight helper writes files or prepares the SDK. `authoring: true` additionally checks the effective author theme. See [the user-facing contract](../../skills/flow-diagram/references/review-inputs.md).

Run `authoring-skill-review-preflight.test.ts` against the copied installation. Set `FLOWSVG_TEST_BROWSER` to an already prepared browser for all three template kinds and identity/scope cases; absence skips those cases explicitly. The regression records invalid submission tree preservation and runtime/browser avoidance independently of quality.

## Independent review records

`review.mjs/submitReview` consumes the verified preflight without authoring execution. `review-records.mjs` builds semantic content IDs, publishes complete append-only records and reloads them with source/report/screenshot verification. `loadReviewRecords(records)` accepts selected real ancestry records and returns `{record, context}` entries; context includes verified `materials[kind].entries`. `review-projection.mjs/aggregateReviews(records, independent, {htmlSha256})` returns a cloned report, keeps selected requirements, unions applicable observations and issues, and recomputes quality. It never writes history. `saved-revisions.mjs/readSavedRevisions(root, id)` supplies the same unchanged-context ancestry to review and finalization. Review IDs remain separate from source revisions. See [ADR 0014](../adr/0014-independent-review-records.md).

Run the copied-install `authoring-skill-independent-review.test.ts` with prepared Chrome to verify exact duplicate reuse, partial animated coverage, repeated ancestor state de-duplication, issue retention, selected-plan/display boundaries and tampered evidence/records. A cache path that is an ordinary input file proves valid review needs no runtime preparation; Playwright logs and task-tree bytes independently check browser/file side effects. Browser absence remains an explicit skip for capture-dependent tests.

Independent formal-image acceptance uses a copied installation and real registered SVG/PNG, multiple target sizes/backdrops, named animation exports and explicit evidence-source selection. Synthetic review fixtures test attestation mechanics only; they do not establish actual viewing or user aesthetic acceptance. Repeated review must add no design artifacts or browser launches.

## Independent evidence verification

The standalone formal-image check uses `evidence`, repeats under an unavailable browser and unusable cache, then reviews its independent source. Synthetic attestations test contracts only. The dedicated copied-install CLI suite covers accumulated conditions, old revision capture reuse, changed contexts, missing browsers, cancellation, named exports and damaged-image recovery. Raw rendering and cost observations remain separate from actual viewing.
