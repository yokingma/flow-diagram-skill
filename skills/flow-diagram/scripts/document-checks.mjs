/** Shared field and compilation checks for read-only validation and saved authoring. */
import { ToolError } from "./runtime.mjs";

/** Return the public compiled diagram and parsed snapshot only after both independent checks succeed. */
export function checkDocument(report, sdk, text, options) {
  report.stage = "validation";
  let document;
  try { document = JSON.parse(text); }
  catch (cause) {
    report.checks.validation = "failed";
    throw new ToolError("validation", "JSON_SYNTAX", cause.message, "Correct the JSON syntax in a new draft.", "$", cause);
  }
  const issues = sdk.validateDocument(document);
  if (issues.length) {
    report.checks.validation = "failed";
    report.status = "failed";
    report.diagnostics.push(...issues.map((issue) => ({ severity: "error", stage: "validation", code: "DOCUMENT_INVALID", location: issue.path,
      reason: issue.message, nextStep: "Review the field or reference with the user; save any correction as a new revision." })));
    return null;
  }
  report.checks.validation = "passed";
  report.theme = options.theme ?? document.theme ?? "light";
  report.reducedMotion = false;
  if (!["light", "dark"].includes(report.theme)) throw new ToolError("validation", "THEME", "Theme must be light or dark", "Choose a supported theme.", "theme");
  report.stage = "compilation";
  try {
    const diagram = sdk.createDiagram(document);
    report.checks.compilation = "passed";
    report.compilation = { totalDurationMs: diagram.totalDuration, beats: diagram.beats };
    return { document, diagram };
  } catch (cause) {
    report.checks.compilation = "failed";
    if (!Array.isArray(cause.issues)) throw new ToolError("compilation", "COMPILE_FAILED", cause.message, "Review the saved input and derived timing; correct it in a new revision.", "$", cause);
    report.diagnostics.push(...cause.issues.map((issue) => ({ severity: "error", stage: "compilation", code: "COMPILE_FAILED", location: issue.path,
      reason: issue.message, nextStep: "Review derived timing and the saved input with the user; create a new revision after deciding the correction." })));
    report.status = "failed";
    return null;
  }
}
