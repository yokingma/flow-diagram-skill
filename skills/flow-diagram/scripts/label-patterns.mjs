/** Soft-wrap risks from public SDK text lines; this module never measures glyphs or parses edge paths. */
const MIN_RUN_LINES = 4;
const MIN_RUN_CHARACTERS = 6;
const MAX_CHARACTERS_PER_LINE = 2;

/**
 * Return the first unrequested short-line run and its public baseline span in diagram units, or null.
 * Explicit line boundaries split candidates; they do not exempt additional soft wrapping inside a line.
 * Thresholds are conservative corpus-calibrated heuristics, not general typography requirements.
 */
export function findVerticalLabelRun(edge) {
  // The SVG label foreground follows evaluated edge stroke; strokeWidth only controls the path.
  if (/^#(?:[0-9a-f]{3}0|[0-9a-f]{6}00)$/iu.test(edge.style.stroke)) return null;
  for (const segment of explicitLineSegments(edge)) {
    const run = findShortRun(edge, segment);
    if (run) return { estimatedLineCount: edge.labelLines.length, softWrappedRun: run };
  }
  return null;
}

/** Match already-rendered lines to authored paragraphs by their non-whitespace character counts. */
function explicitLineSegments(edge) {
  let cursor = 0;
  return edge.label.split("\n").map((text) => {
    const start = cursor;
    const required = characterCount(text);
    let consumed = 0;
    do {
      consumed += characterCount(edge.labelLines[cursor]);
      cursor += 1;
    } while (cursor < edge.labelLines.length && consumed < required);
    return { start, end: cursor };
  });
}

function findShortRun(edge, segment) {
  let start = segment.start;
  for (let index = segment.start; index <= segment.end; index += 1) {
    const count = index < segment.end ? characterCount(edge.labelLines[index]) : 0;
    if (count > 0 && count <= MAX_CHARACTERS_PER_LINE) continue;
    const run = describeRun(edge, start, index);
    if (run) return run;
    start = index + 1;
  }
  return null;
}

function describeRun(edge, start, end) {
  if (end - start < MIN_RUN_LINES) return null;
  const charactersPerLine = edge.labelLines.slice(start, end).map(characterCount);
  if (charactersPerLine.reduce((sum, count) => sum + count, 0) < MIN_RUN_CHARACTERS) return null;
  const baselineSpan = edge.labelBoxes[end - 1].y - edge.labelBoxes[start].y;
  if (!(baselineSpan > 0)) return null;
  return { startLine: start, lineCount: end - start, charactersPerLine, baselineSpan };
}

function characterCount(text) { return Array.from(text.replace(/\s/gu, "")).length; }
