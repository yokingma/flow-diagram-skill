# Candidate findings: order-fulfillment

Temporary record for selection. Not part of the published example library.

## Source

- Source kind: Skill-authored local example (fictional e-commerce flow), not an upstream FlowSVG snapshot.
- Installed reference if selected: `skills/flow-diagram/examples/complete/order-fulfillment.json` plus its note. Complete examples currently document upstream snapshots only, so the provenance policy in `examples/README*.md`, the complete-example index and `teaching-sources.json` need a Skill-authored category entry before publication.

## Verification performed

- Official CLI at the pinned SDK baseline: `author ... --theme dark --svg --time 0 --browser none` returned `delivery: complete`, validation and compilation passed, JSON/HTML/SVG and reports produced.
- Actual viewing: dark-theme SVG at t=0 and at the compiled final time. The three original diamonds had near-invisible labels under the dark palette; the candidate source now pins `textColor: "#15334b"` on those nodes, which needs a fresh render and re-view before selection.
- Playback: the unpatched official player shows 40 label jump events and 394 clipPath rebuilds in an 8-second window (`/tmp/diag8b.mjs` equivalent, Chromium). The delivered copy in the separate task workspace uses a post-processing patch and shows 0 / 0.

## Open issue to resolve before publication

The SDK's `pathLabelAnchor` uses exact float comparisons; horizontal labelled edges alternate a 20×12 px label offset between frames, and unstable clip ids force full `<defs>` rebuilds. Options:

1. Add a focused runtime-stability change to the Skill so every generated offline player is stable (broad change; needs the repository's issue-first approval, failing tests, changelog and guide updates).
2. Keep the JSON self-contained by replacing the three horizontal edge labels with static text nodes, or accept a 1 px vertical offset on exception cards. Both avoid the branching path; both alter the source composition.
3. Keep the candidate unpublished until the SDK fixes the defect upstream.

## Decision (2026-11-20)

Keep this candidate unpublished. Do not place the source or note into `skills/flow-diagram/examples/`, and do not change the installed example library or the player runtime. Revisit selection only after the upstream SDK fixes the horizontal-label jitter (or a separately approved Skill-level runtime-stability change lands).

No published library files were changed by this candidate.
