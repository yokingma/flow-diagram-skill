# Source fidelity and information choices

Read this reference when a source has unknowns, a readability proposal aggregates or removes information, or a delivery explanation needs to account for those choices. Use [source metadata](tool-contract.md#source-metadata) for evidence and [revision decisions](diagnostics-and-revisions.md) for existing diagnostics. The tool preserves these records; it cannot establish their truth or supply the user's authorization.

## Before and after a meaning change

1. Map each source-supported object, relationship, direction, boundary and state to the draft. Keep the source language. Mark missing values as unknown, or explain the narrower scope if that value is outside the requested diagram.
2. When readability needs improvement, offer concrete candidates: separate images, additional states or an aggregation with its lost distinctions stated. Node count is a readability signal, not an automatic deletion threshold.
3. Obtain the user's decision before merging objects, omitting source-supported relationships or changing meaning. Apply an already explicit decision within its stated scope; a general “make it simpler” request leaves the affected facts unresolved.
4. In `sources[].description`, connect the source facts, unknowns, actual decision and permitted scope. For an existing diagram, select an explicit parent and save the authorized draft in a new revision. Keep the parent and its original issues. If a parent diagnostic exists, record the actual choice with `--decisions` as well. That option requires a known diagnostic; a semantic choice alone does not justify inventing a diagnostic code.
5. Deliver the saved files and an explanation of **retained**, **merged**, **omitted** and **unknown** information. Identify the source and decision for each change, and the effects on interpretation. State “none” where a category is empty. Keep unapproved proposals unresolved.

These are authoring actions and prose in existing metadata and delivery explanations, not a new report schema. A decision to merge three sources does not authorize a new queue policy, another omitted relationship or changes in a later source version.

## Worked teaching example: unknown capacity and requested aggregation

The following source and user turns are invented teaching material. They do not authorize edits to a real user's diagram. The underlying unmerged diagram is [fan-in-bottleneck.json](../examples/fan-in-bottleneck.json); its [teaching source record](../examples/semantic-pattern-sources.json) remains the baseline.

**Source S1:** A, B and C each send one item/second into the same queue. One worker takes items from that queue, processes two items/second and emits completed items. Queue capacity, overload policy, observed queue length and latency are unspecified. This is a teaching setup, not monitoring data.

**Initial user request U1:** “Make the slide less crowded; aggregate the sources if possible.”

**Author's proposal:** “A, B and C could become one node labelled ‘3 sources × 1 item/second’. It would retain the stated combined arrival rate but hide individual source identities and their three separate incoming arrows. Keep the queue, worker and completed-output relationship. Capacity and overload policy would remain unknown. Do you approve that specific merge, or prefer separate images?”

**Teaching user decision U2:** “Approve that merge for this slide only. Keep the queue, worker and completed-output relationship; label capacity and overload policy unknown.”

Only after U2 does the author write a separate aggregated draft. The author retains the original teaching JSON and, for a revision, names its saved parent. For the installed tool, a sources array can use the existing fields below. In a real task replace these teaching references with the actual designated source and actual conversation reference; never copy U2 as real approval.

```json
[
  {
    "kind": "prompt",
    "reference": "Teaching example S1 in source-fidelity.md",
    "description": "教学设定：A/B/C各1项/秒→同一队列→处理者2项/秒→已完成项。队列容量、溢出策略、实际队列长度、延迟未知；不是监测数据。"
  },
  {
    "kind": "prompt",
    "reference": "Teaching example U2 in source-fidelity.md",
    "description": "虚构教学决定：仅本页将A/B/C合并为‘3路来源×1项/秒’，隐藏个体名称及三条独立入边；保留队列、处理者和已完成项关系；容量及溢出策略仍标未知。该记录不是本次真实用户授权。"
  }
]
```

A delivery explanation for that teaching revision would say:

| Category | Account tied to S1 and U2 |
| --- | --- |
| Retained | Three sources each contribute one item/second; all reach the shared queue; the worker processes two items/second and emits completed items. These objects and directions come from S1. |
| Merged | A/B/C become “3 sources × 1 item/second” only for this slide, as U2 permits. Three individual incoming relations are represented by one aggregate relation; the original source and unmerged JSON remain available. |
| Omitted | Individual names and separate incoming arrows are absent from this view, as disclosed in the proposal and accepted in U2. No additional relationship is omitted. |
| Unknown | Capacity, overload policy, observed queue length and latency remain unknown. Neither S1 nor U2 supplies values. Sustained stated arrival exceeds processing rate; no exact delay, queue growth measurement or drop behavior is asserted. |

The delivery explanation also identifies the actual selected time and display width, inspected files and unresolved warnings. Export success does not verify the facts, the aggregation decision or readability. If U2 is absent, retain the unmerged draft and present the proposal as awaiting the user's decision.
