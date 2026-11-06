/** Locate prepared browsers only. This module never downloads or connects to a caller's browser. */
import { access, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, join, sep } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { ToolError } from "./runtime.mjs";

/** Explicit selection has priority over detection; `none` intentionally disables browser work. */
export async function findBrowser(explicitPath) {
  const selected = explicitPath ?? process.env.FLOWSVG_BROWSER_PATH;
  if (selected === "none") return null;
  if (selected) {
    try { await assertExecutable(selected); }
    catch (cause) { throw new ToolError("browser", "BROWSER_EXECUTABLE", `Selected browser is not a readable executable file: ${selected}`,
      "Select an already installed Chrome/Chromium executable; no fallback or browser download is performed.", selected, cause); }
    return { executablePath: selected, source: "explicit" };
  }
  const candidates = process.platform === "darwin" ? [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ] : process.platform === "win32" ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
    .filter(Boolean).flatMap((directory) => [join(directory, "Google", "Chrome", "Application", "chrome.exe"), join(directory, "Chromium", "Application", "chrome.exe")])
    : (process.env.PATH || "").split(delimiter).filter(Boolean).flatMap((directory) => ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].map((name) => join(directory, name)));
  for (const executablePath of candidates) {
    try { await assertExecutable(executablePath); return { executablePath, source: "detected" }; }
    catch (error) { if (!["ENOENT", "EACCES", "ENOTDIR"].includes(error.code)) throw error; }
  }
  return null;
}

/** Reject invalid executables before a browser driver creates a temporary profile directory. */
async function assertExecutable(path) {
  await access(path, process.platform === "win32" ? constants.R_OK : constants.R_OK | constants.X_OK);
  if (!(await stat(path)).isFile()) {
    const error = new Error("Browser executable must be a file");
    error.code = "ENOTDIR";
    throw error;
  }
}

/** Resolve the explicit Playwright dependency through the isolated environment's public package export. */
export async function importPlaywright(runtime) {
  const resolver = await import(pathToFileURL(join(runtime.directory, "resolve.mjs")).href);
  const entry = await realpath(fileURLToPath(resolver.resolvePublicEntry("playwright-core")));
  const packageRoot = await realpath(join(runtime.directory, "node_modules", "playwright-core"));
  if (!entry.startsWith(packageRoot + sep)) {
    throw new ToolError("preview", "PLAYWRIGHT_SOURCE", "Playwright resolved outside the isolated tool environment", "Prepare the complete isolated runtime again.");
  }
  return import(pathToFileURL(entry).href);
}
