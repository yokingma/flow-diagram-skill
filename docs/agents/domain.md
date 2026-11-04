# Domain documentation

Before changing a domain contract or terminology, read [GLOSSARY.md](../../GLOSSARY.md) and the relevant decisions in [docs/adr](../adr/README.md). Use the glossary's terms in issues, design notes, code, and tests. Surface a conflict with an accepted ADR before changing its contract.

## Repository boundaries

- `skills/flow-svg-diagram/` is the complete installation unit: Agent guidance, host metadata, scripts, references, examples, runtime resources, and license.
- `tests/` and `tests/fixtures/` own independent regression coverage and its inputs.
- `scripts/` contains repository acceptance tooling.
- `docs/` contains human guides, maintenance guidance, architecture decisions, and recorded acceptance.
- Root `PATTERNS.md` and `CHANGELOG.md` describe independent repository conventions and releases.

The SDK is a separately versioned public dependency. Its document model, rendering, playback, and export APIs remain SDK responsibilities. Use the versioned SDK manuals linked from the glossary when assessing that boundary; installed execution uses the bundled references and pinned runtime rather than a sibling source checkout.

When a task establishes a new domain term or architecture decision, record it in the glossary or an ADR and add it to the relevant index. Finish when the affected documents agree on the actor, conditions, and observable outcome, with any unresolved contract conflict stated explicitly.
