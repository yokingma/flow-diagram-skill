# Snapshot provenance

This independent repository starts from a file snapshot, without importing or rewriting the original Git history.

- Source repository: <https://github.com/yokingma/FlowSVG>
- Source commit: [`86bb7ad29484d7deb63142c1df84c6944a7c0eb4`](https://github.com/yokingma/FlowSVG/tree/86bb7ad29484d7deb63142c1df84c6944a7c0eb4)
- Source installation unit: `skills/flowsvg/`
- New installation unit: `skills/flow-svg-diagram/`
- Initial snapshot installation unit contents: all 83 tracked files, with executable file modes preserved. 81 files are byte-for-byte copies. The two other files (`scripts/document-checks.mjs` and `scripts/review-contract.mjs`) only lose an extra blank line at EOF so the added snapshot passes Git whitespace checks.
- License: MIT, retaining `Copyright (c) 2026 zac_ma` in the root [LICENSE](../LICENSE).

The current distribution additionally includes a copy of the root MIT `LICENSE` inside `skills/flow-svg-diagram/`, so a standalone Skill copy retains its copyright and permission notice. The 83-file count above describes the initial migrated snapshot, not subsequent distribution additions.

The migration plan was subsequently committed to the source repository as `07cf031`. That planning commit does not change the source installation unit. It is not presented as part of the earlier source snapshot.

## Version identities

The independent Skill distribution is prepared as `v0.1.0`. Its repository is [flow-svg-diagram-skills](https://github.com/yokingma/flow-svg-diagram-skills); release tags and publication status are checked separately under the [release procedure](releasing.md). Runtime tool reports continue to use `toolVersion: 0.1.0`; these are separate version identities even where the numbers coincide. Diagram document format version remains `1`.

The installed runtime remains `registry-exact`:

```text
SDK: flowsvg@0.2.2
Registry: https://registry.npmjs.org/
Integrity: sha512-wYaipfmxKGIzcZrWdAySNufBDOzjyA5wn+bkV04KQsEhV45oPXQlvdq/nAnxXF9Wc5Goi7/H84feemGHDenJcQ==
Browser control: playwright-core@1.58.2
```

Development dependencies pin the versions already resolved by the source pnpm lock: TypeScript `5.9.3`, Vitest `3.2.7`, Node types `22.19.1`, and Playwright Core `1.58.2`. The source manifest's TypeScript and Vitest ranges were broader; these exact versions avoid changing their resolved direct versions during the split.

