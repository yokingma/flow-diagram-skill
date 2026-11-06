/** Render public SVG states in an owned Playwright task page; screenshots never imply model approval. */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { importSdk, ToolError } from "./runtime.mjs";
import { findBrowser, importPlaywright } from "./browser.mjs";
import { createPreviewPlan } from "./preview-plan.mjs";

const PREVIEW_VIEWPORT = { width: 1440, height: 1000 };
const PREVIEW_TIMEOUT_MS = 15_000;

/** Capture bounded samples after browser-free delivery. Missing browsers preserve all default exports. */
export async function capturePreviews(report, context) {
  const { document, diagram, options, runtime, signal } = context;
  report.stage = "preview";
  const maxPoints = options.samples === undefined ? undefined : Number(options.samples);
  report.visual = { status: "not-run", viewedFrames: [], artifactReviews: [], capturedFrames: [], plan: createPreviewPlan(document, diagram, maxPoints),
    viewport: PREVIEW_VIEWPORT, theme: report.theme, resources: { page: "not-created", context: "not-created", browser: "not-created" } };
  const selected = await findBrowser(options.browser).catch((cause) => {
    report.visual.status = "failed";
    report.visual.reason = cause.message;
    throw new ToolError("preview", "PREVIEW_FAILED", cause.message, cause.nextStep, "browser", cause);
  });
  if (!selected) {
    report.visual.reason = "No prepared browser selected or detected; screenshots and visual inspection were not performed.";
    report.diagnostics.push({ severity: "info", stage: "preview", code: "BROWSER_UNAVAILABLE", location: "browser", reason: report.visual.reason,
      nextStep: "Install Chrome/Chromium separately or select an existing executable with --browser; retry in a new revision. No browser is downloaded by this tool." });
    return;
  }
  report.visual.browser = selected;
  let browser;
  let browserContext;
  let page;
  let abortCleanup;
  const abort = () => { if (browser) abortCleanup = browser.close().catch((error) => { report.visual.cleanupError = error.message; }); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    const { chromium } = await importPlaywright(runtime);
    browser = await chromium.launch({ executablePath: selected.executablePath, headless: true, timeout: PREVIEW_TIMEOUT_MS });
    report.visual.resources.browser = "open";
    signal?.throwIfAborted();
    browserContext = await browser.newContext({ viewport: PREVIEW_VIEWPORT, deviceScaleFactor: 1, offline: true, colorScheme: report.theme, reducedMotion: "no-preference" });
    report.visual.resources.context = "open";
    page = await browserContext.newPage();
    report.visual.resources.page = "open";
    page.setDefaultTimeout(PREVIEW_TIMEOUT_MS);
    const sdk = await importSdk(runtime);
    const overview = sdk.createDiagram({ ...document, scenes: document.scenes.map((scene) => ({ ...scene,
      beats: scene.beats.map((beat) => ({ ...beat, actions: beat.actions.filter((action) => action.type !== "focus") })) })) });
    await mkdir(join(report.revision.directory, "previews"));
    for (const point of report.visual.plan.points) {
      signal?.throwIfAborted();
      process.stderr.write(`Capturing preview ${point.id} at ${point.timeMs} ms…\n`);
      await captureFrame(report, { point, diagram: point.view === "overview" ? overview : diagram, page, signal });
    }
    report.visual.status = "awaiting-review";
  } catch (cause) {
    report.visual.status = signal?.aborted ? "cancelled" : "failed";
    report.visual.reason = cause.message;
    signal?.throwIfAborted();
    throw new ToolError("preview", "PREVIEW_FAILED", cause.message,
      "Keep the default exports. Review browser, screenshot and font errors with the user; retry in a new revision.", "browser", cause);
  } finally {
    signal?.removeEventListener("abort", abort);
    if (abortCleanup) await abortCleanup.catch((error) => { report.visual.cleanupError = error.message; });
    await closeResources(report, { page, context: browserContext, browser });
  }
}

/** Font readiness is observable; installed glyph coverage and cross-system pixel equality are not inferred. */
async function captureFrame(report, { point, diagram, page, signal }) {
  const svg = diagram.renderSvg(point.timeMs, { theme: report.theme, reducedMotion: false });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:${report.theme === "dark" ? "#111827" : "#fff"}}svg{display:block;width:100%;height:100%;}</style></head><body>${svg}</body></html>`);
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return { ready: document.fonts.status === "loaded", glyphCoverage: "not-verified", family: getComputedStyle(document.querySelector("text") || document.body).fontFamily,
      issues: [...document.fonts].filter((font) => font.status === "error").map((font) => `${font.family}: ${font.status}`) };
  });
  signal?.throwIfAborted();
  process.stderr.write(`Capturing screenshot ${point.id}…\n`);
  const bytes = await page.screenshot({ type: "png", animations: "disabled", timeout: PREVIEW_TIMEOUT_MS });
  signal?.throwIfAborted();
  const path = join(report.revision.directory, "previews", `${point.id}.png`);
  await writeFile(path, bytes, { flag: "wx" });
  const frame = { ...point, path, sha256: createHash("sha256").update(bytes).digest("hex"), fonts };
  report.visual.capturedFrames.push(frame);
  report.artifacts.push({ kind: "preview", path, timeMs: point.timeMs, view: point.view, theme: report.theme, sha256: frame.sha256 });
}

/** Close only resources created by this invocation, including failure and cancellation paths. */
async function closeResources(report, resources) {
  for (const [kind, resource] of Object.entries(resources)) {
    if (!resource) continue;
    try { await resource.close(); report.visual.resources[kind] = "closed"; }
    catch (error) {
      report.visual.resources[kind] = "close-failed";
      report.diagnostics.push({ severity: "error", stage: "preview", code: "BROWSER_CLEANUP", location: kind, reason: error.message,
        nextStep: "Inspect the owned browser process and close it before retrying." });
    }
  }
}
