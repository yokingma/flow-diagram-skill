/** Export one saved snapshot through public SDK entries; image failures preserve independent exports. */
import { composeHtmlPage } from "./html-page.mjs";
import { join } from "node:path";
import { importSdk, ToolError } from "./runtime.mjs";
import { findBrowser } from "./browser.mjs";
import { recordFailure } from "./reports.mjs";
import { saveComplete, saveStaticArtifact } from "./artifact-identity.mjs";

/** HTML remains paused and browser-free; requested static formats are attempted independently. */
export async function deliverStatic(report, context) {
  report.stage = "export";
  context.signal?.throwIfAborted();
  const { renderHtml } = await importSdk(context.runtime, "/node");
  const playerHtml = await renderHtml(context.document, { theme: report.theme, autoplay: false, controls: true });
  const html = context.htmlPage ? composeHtmlPage(context.htmlPage, playerHtml, report, context.options["sync-html"]) : playerHtml;
  const path = join(report.revision.directory, "diagram.html");
  await saveComplete(path, html, context.signal);
  report.artifacts.push({ kind: "html", path });
  if (!report.completion.completed.includes("html")) report.completion.completed.push("html");
  for (const format of ["svg", "png"].filter((kind) => context.options[kind])) {
    await deliverImage(report, context, { format, name: "diagram", filename: `diagram.${format}`,
      timeMs: context.options.time, background: context.options.background ?? "theme", width: context.options["png-width"] });
  }
}

/** One image request appends a factual result and never hides another format's success. */
export async function deliverImage(report, context, settings) {
  const { format, name, filename, background, width } = settings;
  const result = settings.result ?? { name, format, timeMs: settings.timeMs === undefined ? 0 : Number(settings.timeMs), background, status: "pending" };
  if (!settings.result) report.exports.push(result);
  result.status = "pending";
  report.stage = "export";
  try {
    context.signal?.throwIfAborted();
    const timeMs = exportTime(settings.timeMs, context.diagram.totalDuration, format.toUpperCase());
    const visual = { timeMs, theme: report.theme, reducedMotion: false, background };
    const data = format === "svg" ? context.diagram.renderSvg(timeMs, visual) : await renderPng(context, visual, width);
    const artifact = await saveStaticArtifact(report, { kind: format, name, filename, data, timeMs, background,
      diagram: context.diagram, signal: context.signal });
    Object.assign(result, { status: "succeeded", artifactId: artifact.artifactId, sha256: artifact.sha256,
      path: artifact.path, width: artifact.intrinsicWidth, height: artifact.intrinsicHeight });
    if (!report.completion.completed.includes(format)) report.completion.completed.push(format);
  } catch (cause) {
    result.status = context.signal?.aborted ? "cancelled" : "failed";
    if (context.signal?.aborted) { result.error = { code: "ABORT_ERR", reason: context.signal.reason?.message ?? "Task cancelled" }; throw context.signal.reason; }
    const error = cause instanceof ToolError ? cause : new ToolError("export", `${format.toUpperCase()}_${(cause.code || "EXPORT_FAILED").toUpperCase().replaceAll("-", "_")}`,
      cause.message, "Keep successful files. Review the image settings and prepared browser; retry in a new revision.", format, cause);
    result.error = { code: error.code, reason: error.message };
    if (["SVG_TIME", "PNG_TIME"].includes(error.code)) throw error;
    recordFailure(report, error);
    report.exportFailureStage = report.stage;
  }
}

async function renderPng(context, settings, width) {
  const selected = await findBrowser(context.options.browser);
  if (!selected) throw new ToolError("export", "PNG_BROWSER_UNAVAILABLE", "PNG requires a prepared Chrome/Chromium executable.",
    "Prepare a browser separately and select it with --browser. Successful JSON/HTML/SVG remain available.", "browser");
  if (width !== undefined && (typeof width === "string" && !width.trim() || !Number.isFinite(Number(width)) || Number(width) <= 0)) {
    throw new ToolError("export", "PNG_WIDTH", "PNG width must be a positive finite number.", "Choose a supported pixel width.", "png-width");
  }
  const { exportPng } = await importSdk(context.runtime, "/node");
  return exportPng(context.document, { ...settings, ...(width === undefined ? {} : { width: Number(width) }),
    executablePath: selected.executablePath, signal: context.signal });
}

/** SDK evaluation clamps finite times; the CLI rejects an out-of-range explicit image request. */
function exportTime(value, totalDuration, format) {
  const timeMs = value === undefined ? 0 : Number(value);
  if (typeof value === "string" && !value.trim() || !Number.isFinite(timeMs) || timeMs < 0 || timeMs > totalDuration) {
    throw new ToolError("export", `${format}_TIME`, `${format} time must be between 0 and ${totalDuration} milliseconds`,
      "Choose a time from the compiled timeline and retry in a new revision.", "time");
  }
  return timeMs;
}
