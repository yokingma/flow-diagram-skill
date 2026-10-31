/** Shared review JSON contract. Identity checks live in the source-specific readers. */
export const REVIEW_KINDS = { visual: { field: "frames", id: "id" }, html: { field: "states", id: "id" }, artifact: { field: "items", id: "evidenceId" } };
export const OBSERVATION_KEYS = ["readingOrder", "density", "occlusion", "narrative"];

/** Reject unfilled templates and report the first invalid field before any persistent work. */
export function validateReviewInput(review, kind) {
  const { field, id } = REVIEW_KINDS[kind];
  requireObject(review, "$", ["reviewer", "viewed", field]);
  requireText(review.reviewer, "$.reviewer");
  if (review.viewed !== true) throw new Error("$.viewed must be true after actual viewing.");
  if (!Array.isArray(review[field]) || !review[field].length) throw new Error(`$.${field} must be a nonempty array.`);
  const seen = new Set();
  for (const [index, item] of review[field].entries()) {
    const path = `$.${field}[${index}]`;
    requireObject(item, path, [id, "sha256", "observations", "issues"]);
    requireText(item[id], `${path}.${id}`);
    if (seen.has(item[id])) throw new Error(`${path}.${id} duplicates ${item[id]}.`);
    seen.add(item[id]);
    if (typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(item.sha256)) throw new Error(`${path}.sha256 must be a lowercase SHA-256.`);
    requireObject(item.observations, `${path}.observations`, OBSERVATION_KEYS);
    for (const key of OBSERVATION_KEYS) requireText(item.observations[key], `${path}.observations.${key}`);
    if (!Array.isArray(item.issues)) throw new Error(`${path}.issues must be an array.`);
    for (const [issueIndex, issue] of item.issues.entries()) {
      const issuePath = `${path}.issues[${issueIndex}]`;
      requireObject(issue, issuePath, ["reason", "nextStep"]);
      requireText(issue.reason, `${issuePath}.reason`);
      requireText(issue.nextStep, `${issuePath}.nextStep`);
    }
  }
}

function requireObject(value, path, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object.`);
  const unknown = Object.keys(value).find((key) => !fields.includes(key));
  if (unknown) throw new Error(`${path}.${unknown} is not a supported field.`);
}
function requireText(value, path) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${path} must be a nonempty string.`);
}

/** A source state covers a selected point only when both its explicit identifier and time match. */
export function stateMatchesPoint(state, point) {
  return (state.pointId === point.id || state.id === `html-${point.id}`) && state.timeMs === point.timeMs;
}
