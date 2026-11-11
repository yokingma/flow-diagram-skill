# Repository work

This repository owns Flow Diagram Skill authoring, layout plans, checks, reviews, delivery, and its isolated runtime. The SDK is a separately versioned public dependency. Keep installed resources inside `skills/flow-diagram/`; repository tests, tools, guides, and maintenance documents stay outside it.

- Before changing a domain contract, read [GLOSSARY.md](GLOSSARY.md) and the relevant [ADRs](docs/adr/README.md).
- Before changing CLI behavior or modules, read [PATTERNS.md](PATTERNS.md), [CLI patterns](docs/development/flow-diagram-patterns.md), and [source-comment rules](docs/agents/code-comments.md). Preserve the exact SDK baseline unless the task explicitly changes it.
- For implementation or structure changes, update the root changelog and affected patterns, then synchronize affected READMEs and guides. Verify observable CLI behavior. New or changed behavior tests must fail before implementation; pure test relocation retains assertions and records its scope.
- Before adding or reorganizing documentation, read the [documentation scope](docs/README.md#documentation-scope).
- Before writing technical documentation or source comments, read [technical writing](docs/agents/technical-writing.md). Apply its completion checks to every changed passage.
- When changing Agent guidance, keep installed references self-contained. Keep bilingual user guides aligned by task, prerequisites, defaults, failure behavior, and examples.
- Report delivery completion, programmatic checks, actual viewing, and unperformed checks separately. Historical source evidence is not current independent acceptance; configured CI is not executed CI.

## Agent skills

### Issue tracker

Track specs and issues as local Markdown under `.scratch/`; follow [tracker rules](docs/agents/issue-tracker.md).

### Triage labels

Use the five default triage roles as local ticket status strings; follow [triage labels](docs/agents/triage-labels.md).

### Domain docs

Use the single-context layout: root `GLOSSARY.md` and `docs/adr/`; follow [domain documentation](docs/agents/domain.md).
