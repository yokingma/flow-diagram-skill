# Source fidelity and information choices

Read this reference when a source has unknowns, a readability proposal aggregates or removes information, or a delivery explanation needs to account for those choices. Use [source metadata](tool-contract.md#source-metadata) for evidence and [revision decisions](diagnostics-and-revisions.md) for existing diagnostics. The tool preserves these records; it cannot establish their truth or supply the user's authorization.

## Before and after a meaning change

Preserve source-supported facts, key relationships, directions, boundaries and states. Translate labels without changing meaning when the request or project preference selects another language. Mark unknown values as unknown; distinguish teaching assumptions from measured facts.

Reorder objects, group related content, merge duplicate explanations and choose an abstraction level that answers the reader's question. These are authoring decisions within the source meaning. A readability improvement can use different geometry, separate views or a more concise explanation without a separate approval or design record.

Ask before a proposed change alters a fact, key relationship, system boundary or explanatory scope. Describe the affected meaning and a concrete alternative. Apply an already explicit user decision within its scope. Keep material questions and their resolution in the task's single `issues.md`; source descriptions may explain the facts and chosen scope. Continue editing the same source draft.

In the delivery explanation, disclose information choices that affect interpretation and important unknowns. Keep that explanation outside the HTML page under [page content](delivery-contexts.md#keep-the-html-page-minimal). Use the actual source and actual authorization when one was needed; invented teaching decisions never authorize real edits.

## Worked teaching example: unknown capacity and requested aggregation

The following source and user turns are invented teaching material. They do not authorize edits to a real user's diagram. The underlying unmerged diagram is [fan-in-capacity.json](../examples/fan-in-capacity.json); its [teaching source record](../resources/teaching-sources.json) remains the baseline.

**Source S1:** A, B and C each send one item/second into the same queue. One worker takes items from that queue, processes two items/second and emits completed items. Queue capacity, overload policy, observed queue length and latency are unspecified. This is a teaching setup, not monitoring data.

**Initial user request U1:** “Make the slide less crowded; aggregate the sources if possible.”

**Meaning-changing alternative:** “A, B and C could become one node labelled ‘3 sources × 1 item/second’. It would retain the stated combined arrival rate but hide individual source identities and their three separate incoming arrows. Keep the queue, worker and completed-output relationship. Capacity and overload policy would remain unknown. Do you approve that specific merge, or prefer separate images?”

**Teaching user decision U2:** “Approve that merge for this slide only. Keep the queue, worker and completed-output relationship; label capacity and overload policy unknown.”

For this example, removing individual source identities changes the stated scope, so U2 authorizes that change. The author updates the working draft; a separate retained checkpoint is optional when requested. For the installed tool, a sources array can use the existing fields below. In a real task replace these teaching references with the actual designated source and actual conversation reference; never copy U2 as real approval.

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

A delivery explanation for that teaching revision would say (in the delivery message, not on the HTML page):

| Category | Account tied to S1 and U2 |
| --- | --- |
| Retained | Three sources each contribute one item/second; all reach the shared queue; the worker processes two items/second and emits completed items. These objects and directions come from S1. |
| Merged | A/B/C become “3 sources × 1 item/second” only for this slide, as U2 permits. Three individual incoming relations are represented by one aggregate relation; the original source and unmerged JSON remain available. |
| Omitted | Individual names and separate incoming arrows are absent from this view, as disclosed in the proposal and accepted in U2. No additional relationship is omitted. |
| Unknown | Capacity, overload policy, observed queue length and latency remain unknown. Neither S1 nor U2 supplies values. Sustained stated arrival exceeds processing rate; no exact delay, queue growth measurement or drop behavior is asserted. |

The delivery explanation also identifies the actual selected time and display width, inspected files and unresolved warnings. Export success does not verify the facts, the aggregation decision or readability. If U2 is absent, retain source identities while simplifying their visual organization; ask before removing those distinctions.
