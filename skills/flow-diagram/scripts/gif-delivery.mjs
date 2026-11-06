/** Optional GIF delivery through the installed public Node SDK. The SDK owns and releases its browser. */
import { readFile, open, rm } from "node:fs/promises";
import { join } from "node:path";
import { findBrowser } from "./browser.mjs";
import { importSdk, ToolError } from "./runtime.mjs";

const GIF_OPTION_NAMES = ["startMs", "endMs", "speed", "width", "fps", "includeCaptions", "captionHeight", "loopCount", "finalHoldMs", "reducedMotion"];
const RETRY_GIF = "Keep the successful JSON/HTML files. Review the GIF settings and diagnostic; retry in a new revision after resolving the cause.";
const PREPARE_BROWSER = "Install or prepare Chrome/Chromium yourself, then pass --browser <executable> or set FLOWSVG_BROWSER_PATH. The tool does not download browsers. Retry in a new revision; existing JSON/HTML remain available.";

/** Export only on an explicit GIF request; all bytes come from the same saved document snapshot. */
export async function deliverGif(report, { document, runtime, options, signal }) {
  if (!options.gif) return;
  report.stage = "gif-export";
  signal?.throwIfAborted();
  const settings = await readGifOptions(options["gif-options"]);
  const selected = await findBrowser(options.browser).catch((cause) => {
    if (cause.code !== "BROWSER_EXECUTABLE") throw cause;
    throw new ToolError("gif-export", "GIF_ENVIRONMENT", cause.message, PREPARE_BROWSER, "browser", cause);
  });
  if (!selected) {
    throw new ToolError("gif-export", "GIF_BROWSER_UNAVAILABLE", "GIF requires a prepared Chrome/Chromium executable.", PREPARE_BROWSER, "browser");
  }
  const { executablePath } = selected;
  report.gif = { options: settings, theme: report.theme, executablePath };
  try {
    const { exportGif } = await importSdk(runtime, "/node");
    const bytes = await exportGif(document, { ...settings, theme: report.theme, executablePath, signal,
      onProgress: (progress) => { process.stderr.write(JSON.stringify({ stage: "gif-export", ...progress }) + "\n"); }
    });
    signal?.throwIfAborted();
    await saveGif(report, bytes, settings, signal);
  } catch (cause) {
    if (signal?.aborted) throw signal.reason;
    if (cause instanceof ToolError || cause.name === "AbortError") throw cause;
    throw new ToolError("gif-export", `GIF_${(cause.code || "EXPORT_FAILED").toUpperCase().replaceAll("-", "_")}`,
      cause.message, cause.code === "environment" ? PREPARE_BROWSER : RETRY_GIF, "gif", cause);
  }
}

/** Snapshot serializable export settings once; browser, signal, progress and theme belong to the task. */
async function readGifOptions(path) {
  if (!path) return {};
  let settings;
  try { settings = JSON.parse(await readFile(path, "utf8")); }
  catch (cause) { throw new ToolError("gif-export", "GIF_OPTIONS", cause.message, "Provide a readable GIF options JSON object and retry in a new revision.", path, cause); }
  if (!settings || typeof settings !== "object" || Array.isArray(settings) || Object.keys(settings).some((name) => !GIF_OPTION_NAMES.includes(name))) {
    throw new ToolError("gif-export", "GIF_OPTIONS", "GIF settings must be an object containing supported serializable export options.",
      "Use the fields in references/export.md; choose theme with --theme and browser with --browser.", "gif-options");
  }
  return settings;
}

/** Register only a complete SDK result; failed or cancelled writes remove only the task-created file. */
async function saveGif(report, bytes, settings, signal) {
  const path = join(report.revision.directory, "diagram.gif");
  const handle = await open(path, "wx");
  try {
    await handle.writeFile(bytes, { signal });
    signal?.throwIfAborted();
    await handle.close();
    signal?.throwIfAborted();
  } catch (cause) {
    await handle.close();
    await rm(path, { force: true });
    throw cause;
  }
  report.artifacts.push({ kind: "gif", path, options: settings, theme: report.theme });
  report.completion.completed.push("gif");
}
