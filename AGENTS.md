# Repository work

This repository owns Flow SVG Diagram Skill authoring, layout plans, checks, reviews, delivery, and its isolated runtime. The SDK is a separately versioned public dependency. Keep installed resources inside `skills/flow-svg-diagram/`; repository tests, tools, guides, and maintenance documents stay outside it.

- Before changing a domain contract, read [GLOSSARY.md](GLOSSARY.md) and the relevant [ADRs](docs/adr/README.md).
- Before changing CLI behavior or modules, read [PATTERNS.md](PATTERNS.md), [CLI patterns](docs/development/flowsvg-skill-patterns.md), and [source-comment rules](docs/agents/code-comments.md). Preserve the exact SDK baseline unless the task explicitly changes it.
- For implementation or structure changes, update the root changelog and affected patterns, then synchronize affected READMEs and guides. Verify observable CLI behavior. New or changed behavior tests must fail before implementation; pure test relocation retains assertions and records its scope.
- When changing Agent guidance, keep installed references self-contained. Keep bilingual user guides aligned by task, prerequisites, defaults, failure behavior, and examples. Use consistent glossary terms and explicit actors, conditions, and outcomes.
- Track specs and issues as local Markdown under `.scratch/`; follow [tracker rules](docs/agents/issue-tracker.md) and [triage labels](docs/agents/triage-labels.md).
- Report delivery completion, programmatic checks, actual viewing, and unperformed checks separately. Historical source evidence is not current independent acceptance; configured CI is not executed CI.
