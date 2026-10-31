/** Bind one sampled warning to source bytes, installed SDK and effective visual context. No historical IDs are inferred. */
import { createHash } from "node:crypto";

/** Build the complete context used by newly generated warnings; milliseconds remain exact finite sample values. */
export function createIssueContext(report, timeMs, warningKey) {
  return { sourceSha256: report.input?.sha256, sdk: { version: report.sdk?.version, integrity: report.sdk?.integrity },
    theme: report.theme, reducedMotion: report.reducedMotion, timeMs, warningKey };
}

/** Return null for incomplete historical context instead of assigning it a new identity. */
export function computeIssueId(context) {
  if (!context || !/^[a-f0-9]{64}$/u.test(context.sourceSha256) || typeof context.sdk?.version !== "string" || !context.sdk.version
    || typeof context.sdk?.integrity !== "string" || !context.sdk.integrity || !["light", "dark"].includes(context.theme)
    || typeof context.reducedMotion !== "boolean" || !Number.isFinite(context.timeMs) || context.timeMs < 0
    || typeof context.warningKey !== "string" || !context.warningKey) return null;
  const sequence = ["flowsvg-layout-issue", 1, context.sourceSha256, context.sdk.version, context.sdk.integrity,
    context.theme, context.reducedMotion, context.timeMs, context.warningKey];
  return `sha256-${createHash("sha256").update(JSON.stringify(sequence)).digest("hex")}`;
}
