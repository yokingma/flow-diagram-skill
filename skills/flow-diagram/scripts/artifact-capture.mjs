/** Decode actual artifact bytes into fixed display surfaces; callers own record storage and identity. */
import { importPlaywright } from "./browser.mjs";
import { saveComplete, digest } from "./artifact-identity.mjs";
import { join } from "node:path";

export const CAPTURE_CONTEXT = { method: "decoded-artifact-canvas-png-v1", deviceScaleFactor: 1, offline: true };
const TIMEOUT_MS = 15_000;

/** Capture only the supplied missing surfaces in one owned browser; register complete files through the callback. */
export async function captureArtifactSurfaces({ directory, items, runtime, executablePath, signal, onCaptured }) {
  const { chromium } = await importPlaywright(runtime);
  let browser;
  let abortCleanup;
  let cleanupError;
  const abort = () => { abortCleanup = browser?.close().catch((cause) => { cleanupError = cause; }); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    browser = await chromium.launch({ executablePath, headless: true, timeout: TIMEOUT_MS, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
    const context = await browser.newContext({ offline: true, deviceScaleFactor: 1 });
    for (const [index, item] of items.entries()) {
      signal?.throwIfAborted();
      process.stderr.write(`Capturing artifact evidence ${index + 1}/${items.length}…\n`);
      const page = await context.newPage();
      page.setDefaultTimeout(TIMEOUT_MS);
      try {
        const result = await renderArtifactSurface(page, item, signal);
        const relativePath = `evidence-${String(index + 1).padStart(2, "0")}.png`;
        const path = join(directory, relativePath);
        await saveComplete(path, result.bytes, signal);
        await onCaptured(item, { path, relativePath, sha256: digest(result.bytes), fonts: result.fonts,
          browser: { version: browser.version(), source: "prepared executable" } });
      } finally { await page.close().catch((cause) => { if (!signal?.aborted) throw cause; }); }
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    if (abortCleanup) await abortCleanup;
    if (browser) await browser.close().catch((cause) => { cleanupError = cause; });
    if (cleanupError) {
      const cause = signal?.aborted ? signal.reason : cleanupError;
      cause.cleanupError = cleanupError.message;
      throw cause;
    }
  }
}

/** Keep the same canvas compositing path as author-owned evidence; no SDK rendering is involved. */
export async function renderArtifactSurface(page, { kind, bytes, evidence }, signal) {
  signal?.throwIfAborted();
  const { displayWidth: width, displayHeight: height, backdrop } = evidence;
  await page.setViewportSize({ width, height });
  const dataUrl = `data:image/${kind === "svg" ? "svg+xml" : "png"};base64,${bytes.toString("base64")}`;
  await page.setContent(`<!doctype html><html><body><img alt="actual exported artifact" src="${dataUrl}"></body></html>`);
  const result = await page.evaluate(async ({ width, height, backdrop }) => {
    const image = document.querySelector("img");
    await image.decode();
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const drawing = canvas.getContext("2d");
    if (!drawing) throw new Error("Canvas2D is unavailable for artifact evidence.");
    drawing.fillStyle = backdrop;
    drawing.fillRect(0, 0, width, height);
    drawing.drawImage(image, 0, 0, width, height);
    return { encoded: canvas.toDataURL("image/png").split(",")[1], fonts: {
      ready: document.fonts.status === "loaded", glyphCoverage: "not-verified",
      scope: "actual artifact decoded; target-size canvas composited; host document fonts ready",
      captureMethod: "decoded-artifact-canvas-png-v1",
      issues: [...document.fonts].filter((font) => font.status === "error").map((font) => font.family)
    } };
  }, { width, height, backdrop });
  signal?.throwIfAborted();
  return { bytes: Buffer.from(result.encoded, "base64"), fonts: result.fonts };
}
