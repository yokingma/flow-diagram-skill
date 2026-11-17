# Regression fixtures

These repository-owned JSON inputs support CLI regression tests.

- `teaching-regressions/`: original inputs from installed teaching examples at Skill commit `a1b6ad2`; retained byte-for-byte so visual-library revisions do not alter CLI, timing, measurement, pixel or identity regression contracts. Historical `scope` values record original installation paths, not current fixture locations.
- `layout-assistance/`: original 31-node draft and plan from installed examples at the same commit; retained byte-for-byte for deterministic geometry, semantic preservation and output protection. These are developer inputs, not selected visual compositions.
- `label-pattern/`: seven `label-*.json` files used by the label-risk regression suite.

The label-pattern inputs come from [FlowSVG snapshot `86bb7ad`](https://github.com/yokingma/FlowSVG/tree/86bb7ad29484d7deb63142c1df84c6944a7c0eb4). The vertical-run and two-character-wrap fixtures use 30- and 50-unit endpoint widths to exercise narrow-label wrapping. All fixtures retain their MIT license; see [source and license attribution](../../CONTRIBUTING.md#source-and-license-attribution) and [LICENSE](../../LICENSE).
