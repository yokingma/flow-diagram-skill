# GitHub Release notes

Before pushing a formal version tag, commit its release notes as `docs/releases/vX.Y.Z.md`. Follow the [release procedure](../releasing.md#4-发布到-github). The tag version must match the root `package.json` version.

Use `## 中文` and `## English` headings, each followed by a nonempty version summary. Describe the user-visible changes, installation requirements, SDK baseline and known limitations in both languages. State only checks actually executed for the candidate; link its Actions evidence separately from actual viewing or host acceptance.

The automatic publisher uses this file as the Release body and adds a comparison link. It attaches the generic Skill installation ZIP and its SHA-256 checksum file. WorkBuddy retains its independent release process.

A minimal structure is:

```markdown
## 中文

概述本版本的主要变化、运行要求和已知限制。

## English

Describe this version’s main changes, runtime requirements, and known limitations.
```

Write the actual version changes before publishing. This index is guidance, not a release-ready version summary.
