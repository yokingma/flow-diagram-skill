# GitHub Release notes

Before pushing a formal version tag, commit its release notes as `docs/releases/vX.Y.Z.md`. Follow the [release procedure](../releasing.md#4-发布到-github). The tag version must match the root `package.json` version.

Use `## 中文` and `## English` headings, each followed by a short change list. Apply these rules to both languages:

- Usually write 1–5 bullets per language, with one sentence per bullet. Group related changes by their effect on users and maintainers.
- Start each bullet with the concrete addition, fix or improvement. Include only changes since the previous release, and keep both languages aligned item by item.
- Describe the result readers need to know; keep implementation details in the changelog or linked documentation.
- Include changed installation requirements, SDK requirements, breaking changes, migration steps or material known issues when they affect upgrading or using this version. Retain necessary upgrade instructions even when they require extra bullets.
- Keep the body to these change bullets. Unchanged requirements, installation tutorials and project introductions belong in the README or user guides. Test counts, environment inventories, viewing records and unperformed checks belong in release acceptance records and CI artifacts, reported separately to the maintainer.

The automatic publisher uses this file as the Release body and adds a comparison link. It attaches the generic Skill installation ZIP and its SHA-256 checksum file. WorkBuddy retains its independent release process.

For an explicitly requested edit to a published Release body, follow the [body revision procedure](../releasing.md#修订已发布-release-正文) to synchronize the working-tree notes and revision record while retaining the tag's original publication source.

A minimal structure is:

```markdown
## 中文

- 修复……，现在可以……。
- 改进……。

## English

- Fix … so users can ….
- Improve ….
```

Replace the example bullets with actual version changes before publishing. Check that every bullet describes a change or an actionable upgrade issue, and that the two lists cover the same items. Keep the automatically added comparison link; the workflow supplies it, so the notes file does not need to repeat it.
