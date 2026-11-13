# Animation authoring

Use animation when order, transfer or state change explains the user's material. Keep architecture and deployment relationships static when the whole structure is the main message. Animation does not supply missing business facts. [The query round-trip teaching example](../examples/query-round-trip.md) can run without this repository or a showcase build; its note identifies the fictional exchange and viewing limits.

This reference carries the SDK timeline rules needed by the installed skill, plus authoring and report checks. Keep these rules aligned with the pinned SDK baseline in `runtime/manifest.json`; the installed skill must remain usable without this repository.

## Choose the animation purpose

| Purpose | Presentation | Check |
| --- | --- | --- |
| Explain established relationships through flowing lines | Keep the full context visible; apply `flow` to existing directed relations | Arrow meaning, simultaneous versus sequential transfer, and readable start/pause/end states |
| Guide the speaker's attention | Keep context visible; use local emphasis | Emphasis identifies a topic without asserting a transfer or business state |
| Explain order or changing state | Reveal or update objects when the source supports that sequence | Conditions, identity, continuity and reading time |

For “flowing lines,” select persistent visibility unless the user asks for staged disclosure or the explanation requires it. [parallel-transfers.json](../examples/parallel-transfers.json) keeps all text and objects visible and sends markers along two distinct relations together, three times. Its pacing and repetition are illustrative, not business throughput. It starts and ends with an all-visible hold. Read the compiled timing and inspect the beat boundaries, repeated-flow seams and paused state; the marker resets between beats rather than making the entire player loop. See [teaching facts](../resources/teaching-sources.json) and [display and timing limits](../examples/parallel-transfers.md).

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
| Transfer | `type: "flow"`, edge `target`, required `direction: "forward"` or `"reverse"`, optional `text`, `highlightEdge` and `highlightParticipants` |

`updateNode.value.content` replaces the complete structured content at beat start. Text does not interpolate. `value.label` switches to simple-label mode; `value.content` switches to structured content. `content: null` clears content. Choose one label/content mode per node in a beat and avoid competing assignments to that node's fields. Size the node for every content version with the measurement command before layout; replacement does not resize the node. See [the content model](document-model.md#node-content-and-measurement).

## Transfer and emphasis

Use `flow` for a directed transfer along an existing edge. Set required `direction` to `forward` or `reverse`; the edge arrow itself does not change. Optional `text` labels the moving marker. `highlightEdge` and `highlightParticipants` both default to `true` and independently control automatic edge/label coloring and endpoint highlighting. A marker is local to its beat and disappears at the end.

Use `highlight` to emphasize an object without claiming a transfer. Explicit highlighting persists across beats and scenes until `unhighlight`. The ordinary style remains under the highlight layer. `show` and `hide` change visibility. Hiding a group masks its connected edges; showing it restores their saved visibility. `focus` targets a node/group; `target: null` restores the full view. A focused view can intentionally crop the wider graph.

When color carries relationship meaning, prefer `highlightEdge: false` to retain the current edge and label colors while the marker moves. Set `highlightParticipants: false` as well when motion alone should guide attention. For example, `{ "type": "flow", "target": "request", "direction": "forward", "highlightEdge": false, "highlightParticipants": false }` keeps automatic paint off for that transfer. Explicit `highlight` still applies, and `updateEdge` changes continue to interpolate and persist. Line dashing and flow timing remain unchanged; the edge's logical `highlighted` flag remains true while the flow is active. Reduced motion hides markers and respects both switches, so disabling both can leave no automatic visible cue.

Choose document-level [emphasis colors](document-model.md#emphasis-colors) for explicit highlights, automatic flow highlights and markers. Omitted colors retain the selected theme defaults. With automatic edge coloring enabled, a single flow fades that paint toward the current ordinary color during the final 200 ms, unless explicit highlighting remains active. Inspect the relation colors, highlighted text and marker readability in the actual playing and paused views.

One flow in a beat derives its duration from routed path length at the beat's target state: movement at 180 diagram units/second with a 400 ms minimum, followed by a 500 ms arrival hold. This effective duration replaces authored duration and shifts later beats. Multiple distinct edge flows use authored duration and synchronized progress. Use separate beats for sequential transfers and for longer reading time.

Always read `compilation.totalDurationMs` and `compilation.beats` in the authoring report before choosing SVG times or discussing animation length. Summing authored durations gives the wrong timeline for single-flow beats. The preview plan uses those compiled intervals. See [visual inspection](visual-checks.md) for coverage and evidence.

### Caption reading time

Use the compiled beats' effective captions and start/end times to find each continuous caption window. Extend a window only through adjacent beats that display the same caption; a different caption or an empty caption ends it. For example, a 900 ms flow followed by a 2200 ms hold gives 3100 ms for the original caption only if the hold keeps that caption. If the hold supplies a new caption, the original still has only 900 ms. Increasing the authored duration of a single-flow beat does not extend its compiled window; add or adjust a separate hold that retains the caption.

Use these windows to identify short reading opportunities, then judge pacing through actual playback with the intended audience and display conditions in mind. Character counts and durations can assist that judgment; the CLI supplies no automatic reading-speed verdict. Paused final text can remain available after playback ends, but that does not add playback time to its compiled interval.

## Animation in an editable HTML page

Keep the page heading, one-sentence introduction and any functional reading hint outside the managed iframe; the [page content contract](delivery-contexts.md#keep-the-html-page-minimal) forbids a supporting-prose section. Use existing beat captions for changing explanation; do not add a second dynamic explanation protocol or copy the task narrative into the page. Read actual compiled beat times before selecting page states, since one flow can replace the authored beat duration. A reading hold with `actions: []` retains the caption; add one when the effective flow interval is too short for its text.

The saved-page browser check exercises play/pause and end-to-start backward seeking through visible controls, records actual captions and SVG text at finite samples, and verifies outer static text stays stable. It does not establish continuous visual playback or sufficient reading time. Actually play the page when judging rhythm; state separately which paused screenshots were viewed and whether continuous playback was watched.
