# Animation authoring

Use animation when order, transfer or state change explains the user's material. Keep architecture and deployment relationships static when the whole structure is the main message. Animation does not supply missing business facts. [The complete request/response teaching example](../examples/request-response.json) can run without this repository or a showcase build; its captions explicitly identify invented teaching content.

This reference carries the SDK timeline rules needed by the installed skill, plus authoring and report checks. Keep these rules aligned with the pinned SDK baseline in `runtime/manifest.json`; the installed skill must remain usable without this repository.

## Choose the animation purpose

| Purpose | Presentation | Check |
| --- | --- | --- |
| Explain established relationships through flowing lines | Keep the full context visible; apply `flow` to existing directed relations | Arrow meaning, simultaneous versus sequential transfer, and readable start/pause/end states |
| Guide the speaker's attention | Keep context visible; use local emphasis | Emphasis identifies a topic without asserting a transfer or business state |
| Explain order or changing state | Reveal or update objects when the source supports that sequence | Conditions, identity, continuity and reading time |

For “flowing lines,” select persistent visibility unless the user asks for staged disclosure or the explanation requires it. [recipe-parallel-flow.json](../examples/recipe-parallel-flow.json) keeps all text and objects visible and sends markers along two distinct relations together, three times. Its pacing and repetition are illustrative, not business throughput. It starts and ends with an all-visible hold. Read the compiled timing and inspect the beat boundaries, repeated-flow seams and paused state; the marker resets between beats rather than making the entire player loop. See [teaching facts](../examples/recipe-sources.json) and [checked conditions](../examples/README.md#presentation-recipe-checks).

## Scenes and inherited state

A scene is a named continuous segment. Each scene has a unique `id`, a `label`, and a nonempty `beats` array. A beat contains positive `durationMs`, an `actions` array, optional `transitionMs` and a plain-text `caption`. Scenes inherit all persistent node, edge, content, caption and camera state from the preceding scene. Restore a value explicitly when the next scene needs a different state. An omitted caption inherits the preceding caption; `caption: ""` clears it.

A beat includes its start and excludes its end. At total duration the SDK returns the completed final frame. Geometry and style interpolate over `transitionMs`, which defaults to `min(250, durationMs)` and must be between zero and authored duration. The compiler caps transitions at the effective beat duration. A separate beat with `actions: []` provides reading time.

Actions use the following objects:

| Action | Fields |
| --- | --- |
| Visibility or emphasis | `type: "show"`, `"hide"`, `"highlight"` or `"unhighlight"`; `target` is a node/edge ID |
| Camera | `type: "focus"`; `target` is a node/group ID or `null` for full view |
| Node update | `type: "updateNode"`, `target`, `value`; value allows x/y/width/height, fill/stroke/opacity and label/content |
| Edge update | `type: "updateEdge"`, `target`, `value`; value allows label/stroke/strokeWidth/opacity |
| Transfer | `type: "flow"`, edge `target`, required `direction: "forward"` or `"reverse"`, optional `text` and `highlightParticipants` |

`updateNode.value.content` replaces the complete structured content at beat start. Text does not interpolate. `value.label` switches to simple-label mode; `value.content` switches to structured content. `content: null` clears content. Choose one label/content mode per node in a beat and avoid competing assignments to that node's fields. Size the node for every content version with the measurement command before layout; replacement does not resize the node. See [the content model](document-model.md#node-content-and-measurement).

## Transfer and emphasis

Use `flow` for a directed transfer along an existing edge. Set required `direction` to `forward` or `reverse`; the edge arrow itself does not change. Optional `text` labels the moving marker. `highlightParticipants: false` disables automatic endpoint highlighting while preserving the marker and temporary edge highlight. A marker is local to its beat and disappears at the end.

Use `highlight` to emphasize an object without claiming a transfer. Explicit highlighting persists across beats and scenes until `unhighlight`. The ordinary style remains under the highlight layer. `show` and `hide` change visibility. Hiding a group masks its connected edges; showing it restores their saved visibility. `focus` targets a node/group; `target: null` restores the full view. A focused view can intentionally crop the wider graph.

One flow in a beat derives its duration from routed path length at the beat's target state: movement at 180 diagram units/second with a 400 ms minimum, followed by a 500 ms arrival hold. This effective duration replaces authored duration and shifts later beats. Multiple distinct edge flows use authored duration and synchronized progress. Use separate beats for sequential transfers and for longer reading time.

Always read `compilation.totalDurationMs` and `compilation.beats` in the authoring report before choosing SVG times or discussing animation length. Summing authored durations gives the wrong timeline for single-flow beats. The preview plan uses those compiled intervals. See [visual inspection](visual-checks.md) for coverage and evidence.
