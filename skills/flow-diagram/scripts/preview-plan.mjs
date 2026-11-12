/** Build deterministic point samples from effective SDK beats, never authored-duration sums. */
const DEFAULT_PREVIEW_POINTS = 12;

/** Static diagrams use one authored frame; animated timeline points retain the original camera and actions. */
export function createPreviewPlan(document, diagram, maxPoints = DEFAULT_PREVIEW_POINTS) {
  if (document.scenes.length === 0) {
    return {
      strategy: "static-frame-v1",
      mode: "static",
      maxPoints: 1,
      totalDurationMs: 0,
      coverage: "Static diagram: one static frame at time zero; no timeline states or transitions are sampled.",
      overviewProjection: "Static diagram is inspected as authored at time zero; no timeline actions or camera projection are present.",
      points: [{ id: "frame-01", timeMs: 0, view: "overview", reasons: ["full-view"] }],
      omitted: []
    };
  }
  const candidates = new Map();
  const add = (timeMs, reason, priority) => {
    const previous = candidates.get(timeMs);
    candidates.set(timeMs, { timeMs, view: "timeline", reasons: [...(previous?.reasons || []), reason], priority: Math.min(previous?.priority ?? priority, priority) });
  };
  add(0, "start", 0);
  add(diagram.totalDuration, "final", 0);
  for (const beat of diagram.beats) {
    const authored = document.scenes.find((scene) => scene.id === beat.sceneId).beats[beat.beatIndex];
    const effectiveDuration = beat.endMs - beat.startMs;
    const contentChange = authored.actions.some((action) => ["updateNode", "updateEdge"].includes(action.type)
      && ["content", "label"].some((key) => Object.hasOwn(action.value, key)));
    add(beat.startMs, contentChange ? "content-change" : "beat-start", contentChange ? 1 : 4);
    const transition = Math.min(authored.transitionMs ?? Math.min(250, authored.durationMs), effectiveDuration);
    if (transition > 0 && authored.actions.length) add(beat.startMs + transition / 2, "transition-midpoint", 2);
    if (authored.actions.some((action) => action.type === "flow")) add(beat.startMs + effectiveDuration / 2, "flow-midpoint", 2);
  }
  const ranked = [...candidates.values()].sort((left, right) => left.priority - right.priority || left.timeMs - right.timeMs);
  const normalize = ({ priority, ...point }) => ({ ...point, reasons: [...new Set(point.reasons)].sort() });
  const selected = ranked.slice(0, maxPoints - 1).sort((left, right) => left.timeMs - right.timeMs).map(normalize);
  const omitted = ranked.slice(maxPoints - 1).sort((left, right) => left.timeMs - right.timeMs).map(normalize);
  return { strategy: "compiled-beats-v1", mode: "animated", maxPoints, totalDurationMs: diagram.totalDuration,
    coverage: "Discrete points only; intervening times and omitted candidates are not inspected.",
    overviewProjection: "At time zero with camera focus actions removed; all non-camera actions and content are preserved.",
    points: [{ timeMs: 0, view: "overview", reasons: ["full-view"] }, ...selected].map((point, index) => ({ id: `frame-${String(index + 1).padStart(2, "0")}`, ...point })), omitted };
}

/** Actual HTML has one authored camera at each time; reserve its budget for unique timeline states. */
export function createHtmlPlan(document, diagram, maxPoints = DEFAULT_PREVIEW_POINTS) {
  // The SDK plan reserves one slot for its focus-free projection. HTML cannot reproduce that
  // projection by seeking, so select one extra slot and discard only that synthetic overview.
  const plan = createPreviewPlan(document, diagram, maxPoints + 1);
  const points = plan.mode === "static" ? plan.points : plan.points.filter((point) => point.view === "timeline");
  return { ...plan, strategy: "actual-html-beats-v1", maxPoints: plan.mode === "static" ? 1 : maxPoints,
    overviewProjection: "Actual delivered HTML at each selected time; authored focus and camera actions are preserved.",
    points: points.map((point, index) => ({ ...point, id: `frame-${String(index + 1).padStart(2, "0")}`, view: "html" })),
    omitted: plan.omitted.map((point) => ({ ...point, view: "html" })) };
}
