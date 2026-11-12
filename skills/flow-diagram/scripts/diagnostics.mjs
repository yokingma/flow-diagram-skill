/** Optional finite geometry observations from public SDK frames; design judgment belongs to the actual viewer. */
import { createIssueContext, computeIssueId } from "./issue-identity.mjs";
import { ToolError } from "./runtime.mjs";
import { LABEL_ESTIMATE_METHOD, measureLabel } from "./label-measurement.mjs";

/** Inspect compiled beat boundaries, transition midpoints and final states in absolute diagram coordinates. */
export function diagnoseLayout(report, { document, diagram, sdk }, options = {}) {
  if (!options.geometry) return;
  report.stage = "layout";
  const samples = planLayoutSamples(document, diagram);
  report.layout = { method: "sampled-public-sdk-geometry-and-frame-rectangles", continuousCoverage: false, visualJudgment: false, samples: [] };
  for (const timeMs of samples) {
    const frame = evaluateFrame(report, diagram, timeMs);
    for (const observation of diagnoseFrame(report, diagram, timeMs)) {
      addObservation(report, observation.code, observation.objectId, observation.path, timeMs,
        `Public SDK geometry reports ${observation.code} for ${observation.objectId} and ${(observation.relatedObjectIds ?? []).join(", ")}.`,
        { method: "public-sdk-shapes-path-sampling-and-text-estimates", relatedObjectIds: observation.relatedObjectIds,
          warningKey: observation.warningKey });
    }
    const focusTarget = findFocusTarget(document, diagram, timeMs);
    report.layout.samples.push({ timeMs, focusTarget, sceneId: frame.sceneId, beatId: frame.beatId });
    const nodes = frame.nodes.filter((node) => node.visible && node.opacity > 0);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const warning of frame.warnings) {
      const node = byId.get(warning.objectId);
      const edge = frame.edges.find((item) => item.id === warning.objectId && item.visible && item.opacity > 0);
      if (!node && !edge) continue;
      const labelDetails = node && warning.code === "text-overflow" && typeof warning.path === "string" && warning.path.endsWith(".label")
        ? labelOverflowDetails(node, document, sdk)
        : null;
      const reason = labelDetails
        ? labelOverflowReason(node, labelDetails)
        : `Public SDK text-layout estimate: ${warning.message}`;
      addObservation(report, warning.code, warning.objectId, warning.path, timeMs, reason,
        { method: "public-sdk-text-layout-estimate", ...(labelDetails ? { ...labelDetails, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD } : {}) });
    }
    for (const node of nodes) {
      const parent = byId.get(node.parentId);
      if (parent && !contains(parent, node)) addObservation(report, "child-outside-parent", node.id, nodePath(document, node.id), timeMs,
        `Frame rectangle ${node.id} extends outside parent rectangle ${parent.id}.`, { method: "public-sdk-frame-rectangles", relatedObjectIds: [parent.id], warningKey: legacyWarningKey("child-outside-parent", node.id, nodePath(document, node.id), [parent.id], [nodePath(document, parent.id)]) });
      if (!focusTarget && !contains(frame.camera, node)) addObservation(report, "canvas-clipping", node.id, nodePath(document, node.id), timeMs,
        `Frame rectangle ${node.id} extends outside the full-view camera rectangle.`, { method: "public-sdk-frame-rectangles" });
    }
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const [a, b] = [nodes[left], nodes[right]].sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0);
        if (a.parentId !== b.parentId || contains(a, b) || contains(b, a) || !overlaps(a, b)) continue;
        addObservation(report, "node-overlap", a.id, nodePath(document, a.id), timeMs,
          `Visible sibling frame rectangles ${a.id} and ${b.id} intersect.`, { method: "public-sdk-frame-rectangles", relatedObjectIds: [b.id], warningKey: legacyWarningKey("node-overlap", a.id, nodePath(document, a.id), [b.id], [nodePath(document, b.id)]) });
      }
    }
  }
  report.checks.layout = "computed";
}

/** Explain label overflow with the same deterministic line estimate used by measure and layout. */
function labelOverflowDetails(node, document, sdk) {
  return { currentHeight: node.height, ...measureLabel(sdk, { kind: node.kind, width: node.width,
    label: node.label, typography: document.typography }) };
}

function labelOverflowReason(node, details) {
  const problem = details.diagnostics?.some((item) => item.dimension === "width")
    ? "has estimated content wider than its available width"
    : "has estimated content taller than its height";
  return `Label for node "${node.id}" ${problem}: current height ${details.currentHeight}, required height ${details.requiredHeight}, estimated line count ${details.estimatedLineCount}. This line count is a deterministic estimate from the public SDK baseline, not browser pixel measurement or a visual design conclusion.`;
}

/** Keep computed observations source-bound without asking for design approval or an exception record. */
function addObservation(report, code, objectId, location, timeMs, reason, extra = {}) {
  const warningKey = extra.warningKey ?? legacyWarningKey(code, objectId, location, extra.relatedObjectIds ?? []);
  const issueContext = createIssueContext(report, timeMs, warningKey);
  const issueId = computeIssueId(issueContext);
  if (report.diagnostics.some((item) => item.issueId === issueId)) return;
  report.diagnostics.push({ severity: "info", stage: "layout", code, objectId, location, timeMs, reason,
    nextStep: "Use this calculation as an authoring aid and inspect the rendered artifact when adjusting the diagram.",
    limitations: "Finite SDK geometry and text estimates, without browser glyph pixels or continuous coverage; not a visual design conclusion.",
    ...extra, warningKey, issueId, sourceRevision: report.revision?.id ?? null, issueContext });
}
function nodePath(document, id) { return `nodes[${document.nodes.findIndex((node) => node.id === id)}]`; }
function contains(outer, inner) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}
function overlaps(a, b) { return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height; }

/** Finite samples expose known changes without claiming continuous collision detection. */
function planLayoutSamples(document, diagram) {
  const times = new Set([0, diagram.totalDuration]);
  for (const beat of diagram.beats) {
    const authored = document.scenes.find((scene) => scene.id === beat.sceneId).beats[beat.beatIndex];
    const duration = beat.endMs - beat.startMs;
    const transition = Math.min(authored.transitionMs ?? Math.min(250, authored.durationMs), duration);
    times.add(beat.startMs);
    times.add(beat.startMs + duration / 2);
    if (transition > 0) {
      times.add(beat.startMs + transition / 2);
      times.add(beat.startMs + transition);
    }
    times.add(beat.endMs);
    // A boundary belongs to the next beat. Sample the prior state as well when the timeline continues.
    if (beat.endMs < diagram.totalDuration) times.add(Math.max(beat.startMs, beat.endMs - Math.min(0.001, duration / 2)));
  }
  return [...times].sort((a, b) => a - b);
}

/** Active focus intentionally crops the full diagram, including camera transitions into or out of focus. */
function findFocusTarget(document, diagram, timeMs) {
  let target = null;
  for (const beat of diagram.beats) {
    if (beat.startMs > timeMs) break;
    const authored = document.scenes.find((scene) => scene.id === beat.sceneId).beats[beat.beatIndex];
    const action = authored.actions.find((item) => item.type === "focus");
    if (action) {
      const prior = target;
      target = action.target;
      const transition = Math.min(authored.transitionMs ?? Math.min(250, authored.durationMs), beat.endMs - beat.startMs);
      if (target === null && timeMs < beat.startMs + transition) return prior;
    }
  }
  return target;
}

function evaluateFrame(report, diagram, timeMs) {
  try { return diagram.evaluateAt(timeMs, { theme: report.theme, reducedMotion: report.reducedMotion }); }
  catch (cause) {
    report.checks.layout = "failed";
    const reason = Array.isArray(cause.issues) ? cause.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ") : cause.message;
    throw new ToolError("layout", "FRAME_EVALUATION_FAILED", reason,
      "Correct the unevaluable frame or input and retry the operation.", `timeMs=${timeMs}`, cause);
  }
}

/** Older checks retain their actual object/field/pair scope, without deriving identity from message or coordinates. */
function legacyWarningKey(code, objectId, location, relatedObjectIds, relatedPaths = []) {
  const participants = [[objectId, location], ...relatedObjectIds.map((id, index) => [id, relatedPaths[index]])];
  return JSON.stringify(["flowsvg-skill-layout-warning", 1, code, ...participants]);
}

function diagnoseFrame(report, diagram, timeMs) {
  try { return diagram.diagnoseAt(timeMs, { theme: report.theme, reducedMotion: report.reducedMotion }); }
  catch (cause) {
    report.checks.layout = "failed";
    throw new ToolError("layout", "GEOMETRY_DIAGNOSIS_FAILED", cause.message,
      "Inspect the input and SDK calculation failure, resolve the cause and retry the operation.", `timeMs=${timeMs}`, cause);
  }
}
