# Regression fixtures

These JSON files are owned by this repository and need no SDK checkout or historical working directory.

- `teaching-regressions/`: original inputs from installed teaching examples at Skill commit `a1b6ad2`; retained byte-for-byte so visual-library revisions do not alter CLI, timing, measurement, pixel or identity regression contracts. Historical `scope` values record original installation paths, not current fixture locations.
- `layout-assistance/`: original 31-node draft and plan from installed examples at the same commit; retained byte-for-byte for deterministic geometry, semantic preservation and output protection. These are developer inputs, not selected visual compositions.
- `label-pattern/`: seven `label-*.json` files used by the label-risk regression suite, sourced from `.scratch/rendering-validator-improvements/evidence/02-walkthrough/fixtures/`. Only required JSON was migrated; source logs, screenshots and tickets stay in the original repository.

Source: [FlowSVG snapshot `86bb7ad`](https://github.com/yokingma/FlowSVG/tree/86bb7ad29484d7deb63142c1df84c6944a7c0eb4). The vertical-run and two-character-wrap fixtures use 30- and 50-unit endpoint widths to retain their original risk cases under the SDK 0.2.3 endpoint-column wrapping rule. Other fixtures retain their source bytes. All fixtures retain their MIT license; see [source and license attribution](../../CONTRIBUTING.md#source-and-license-attribution) and [LICENSE](../../LICENSE).
