/** Finite layout-risk checks over public SDK frames; geometry is never modified and edges are not routed here. */
import { createIssueContext, computeIssueId } from "./issue-identity.mjs";
import { ToolError } from "./runtime.mjs";
import { LABEL_ESTIMATE_METHOD, measureLabel } from "./label-measurement.mjs";
import { findVerticalLabelRun } from "./label-patterns.mjs";

const LABEL_SUMMARY_CHARACTERS = 80;

/** Inspect compiled beat boundaries, transition midpoints and final states in absolute diagram coordinates. */
export function diagnoseLayout(report, { document, diagram, sdk }) {
  report.stage = "layout";
  const samples = planLayoutSamples(document, diagram);
  report.layout = { method: "sampled-public-sdk-geometry-and-frame-rectangles", continuousCoverage: false, samples: [] };
  for (const timeMs of samples) {
    const frame = evaluateFrame(report, diagram, timeMs);
    for (const warning of diagnoseFrame(report, diagram, timeMs)) {
      const [impact, candidates] = geometryAdvice(warning.code);
      addWarning(report, warning.code, warning.objectId, warning.path, timeMs, warning.message, impact, candidates,
        { relatedObjectIds: warning.relatedObjectIds, warningKey: warning.warningKey });
    }
    diagnoseLabelRuns(report, document, frame, timeMs);
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
        : warning.message;
      addWarning(report, warning.code, warning.objectId, warning.path, timeMs, reason,
        "Text may extend past its readable content area.", ["Increase the affected node dimensions", "Shorten or reorganize the content"],
        labelDetails ? { ...labelDetails, estimatedLineCountMethod: LABEL_ESTIMATE_METHOD } : {});
    }
    for (const node of nodes) {
      const parent = byId.get(node.parentId);
      if (parent && !contains(parent, node)) addWarning(report, "child-outside-parent", node.id, nodePath(document, node.id), timeMs,
        `Node ${node.id} extends outside parent group ${parent.id}.`, "Group membership may be hard to read.",
        ["Move the child inside the group", "Increase the group dimensions", "Confirm intentional overflow"], { relatedObjectIds: [parent.id], warningKey: legacyWarningKey("child-outside-parent", node.id, nodePath(document, node.id), [parent.id], [nodePath(document, parent.id)]) });
      if (!focusTarget && !contains(frame.camera, node)) addWarning(report, "canvas-clipping", node.id, nodePath(document, node.id), timeMs,
        `Node ${node.id} extends outside the full-view camera.`, "The full view may crop part of this node.",
        ["Move the node inside the canvas", "Increase the viewport", "Confirm intentional clipping"]);
    }
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const [a, b] = [nodes[left], nodes[right]].sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0);
        if (a.parentId !== b.parentId || contains(a, b) || contains(b, a) || !overlaps(a, b)) continue;
        addWarning(report, "node-overlap", a.id, nodePath(document, a.id), timeMs,
          `Visible sibling rectangles ${a.id} and ${b.id} overlap.`, "Node shape bounds may obscure each other; precise shapes and edge paths were not checked.",
          ["Move one sibling", "Adjust dimensions or whitespace", "Confirm intentional overlap"], { relatedObjectIds: [b.id], warningKey: legacyWarningKey("node-overlap", a.id, nodePath(document, a.id), [b.id], [nodePath(document, b.id)]) });
      }
    }
  }
  report.checks.layout = report.diagnostics.some((item) => item.stage === "layout" && item.severity === "warning") ? "warnings" : "passed";
  report.layout.warningGroups = aggregateLayoutWarnings(report.diagnostics);
}

/** Read the already-wrapped public label lines; no geometry, wording or playback state is changed. */
function diagnoseLabelRuns(report, document, frame, timeMs) {
  for (const edge of frame.edges.filter((item) => item.visible && item.opacity > 0 && item.label)) {
    const details = findVerticalLabelRun(edge);
    if (!details) continue;
    const location = `edges[${document.edges.findIndex((item) => item.id === edge.id)}].label`;
    addWarning(report, "LABEL_VERTICAL_RUN", edge.id, location, timeMs,
      `Label for edge "${edge.id}" has ${details.softWrappedRun.lineCount} very short lines across a ${details.softWrappedRun.baselineSpan} diagram-unit baseline span. These public SDK estimates are not browser glyph measurements.`,
      "A relationship label may read as an unintended vertical run and obscure nearby content.",
      ["Increase the label space or adjust the path and ports", "Use an unlabelled arrow with a clearly associated explanation", "Shorten wording only within the existing authorization"],
      { ...details, labelSummary: Array.from(edge.label).slice(0, LABEL_SUMMARY_CHARACTERS).join(""), estimatedLineCountMethod: LABEL_ESTIMATE_METHOD });
  }
}

/** Explain label overflow with the same deterministic line estimate used by measure and layout. */
function labelOverflowDetails(node, document, sdk) {
  return { currentHeight: node.height, ...measureLabel(sdk, { kind: node.kind, width: node.width,
    label: node.label, typography: document.typography }) };
}

function labelOverflowReason(node, details) {
  const problem = details.diagnostics?.some((item) => item.dimension === "width")
    ? "exceeds its available width; increasing height alone cannot resolve it"
    : "exceeds its height";
  return `Label for node "${node.id}" ${problem}: current height ${details.currentHeight}, required height ${details.requiredHeight}, estimated line count ${details.estimatedLineCount}. This line count is a deterministic estimate from the public SDK baseline, not browser pixel measurement or formal SVG/PNG artifact evidence.`;
}

/** Summarize related warnings for navigation while retaining every source diagnostic as a decision target. */
export function aggregateLayoutWarnings(diagnostics) {
  const groups = new Map();
  for (const diagnostic of diagnostics.filter((item) => item.stage === "layout" && item.severity === "warning")) {
    const related = [...(diagnostic.relatedObjectIds ?? [])].sort();
    const key = JSON.stringify([diagnostic.code, diagnostic.objectId, related]);
    const group = groups.get(key) ?? { key, code: diagnostic.code, objectId: diagnostic.objectId, relatedObjectIds: related, records: [] };
    const record = { issueId: diagnostic.issueId, warningKey: diagnostic.warningKey, timeMs: diagnostic.timeMs,
      location: diagnostic.location, sourceRevision: diagnostic.sourceRevision, relatedObjectIds: diagnostic.relatedObjectIds ?? [] };
    groups.set(key, { ...group, records: [...group.records, record] });
  }
  return [...groups.values()].map((group) => ({ ...group, count: group.records.length }));
}

function addWarning(report, code, objectId, location, timeMs, reason, impact, candidates, extra = {}) {
  const warningKey = extra.warningKey ?? legacyWarningKey(code, objectId, location, extra.relatedObjectIds ?? []);
  const issueContext = createIssueContext(report, timeMs, warningKey);
  const issueId = computeIssueId(issueContext);
  if (report.diagnostics.some((item) => item.issueId === issueId)) return;
  report.diagnostics.push({ severity: "warning", stage: "layout", code, objectId, location, timeMs, reason, impact, candidates,
    nextStep: "Explain the reason, impact and candidate corrections. Apply already authorized mechanical corrections; ask the user before changes outside that authorization or changes to meaning.", ...extra,
    warningKey, issueId, sourceRevision: report.revision?.id ?? null, issueContext });
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
      "Review the unevaluable frame and input with the user; apply an authorized correction in a new revision.", `timeMs=${timeMs}`, cause);
  }
}

/** Older checks retain their actual object/field/pair scope, without deriving identity from message or coordinates. */
function legacyWarningKey(code, objectId, location, relatedObjectIds, relatedPaths = []) {
  const participants = [[objectId, location], ...relatedObjectIds.map((id, index) => [id, relatedPaths[index]])];
  return JSON.stringify(["flowsvg-skill-layout-warning", 1, code, ...participants]);
}

/** SDK owns the geometry and canonical participant identities; the skill adds author-facing treatment choices only. */
function geometryAdvice(code) {
  if (code === "edge-node-overlap") return ["A connection may be hard to trace through an unrelated node.",
    ["Move the unrelated node", "Adjust the authored route or spacing", "Confirm intentional crossing"]];
  if (code === "label-node-overlap") return ["A label and unrelated node may obscure each other.",
    ["Adjust the label owner or unrelated node position", "Increase whitespace", "Confirm intentional overlap"]];
  return ["Visible labels may be hard to read where their estimated bounds overlap.",
    ["Separate the label owners", "Adjust dimensions or wording", "Confirm intentional overlap"]];
}

function diagnoseFrame(report, diagram, timeMs) {
  try { return diagram.diagnoseAt(timeMs, { theme: report.theme, reducedMotion: report.reducedMotion }); }
  catch (cause) {
    report.checks.layout = "failed";
    throw new ToolError("layout", "GEOMETRY_DIAGNOSIS_FAILED", cause.message,
      "Review the saved input and SDK diagnostic failure; retry in a new revision after resolving the cause.", `timeMs=${timeMs}`, cause);
  }
}
