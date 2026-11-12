/** Snapshot-bound batch planning. Validate every frame before any requested static image is written. */
import { readRequestFile } from "./export-request.mjs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ToolError } from "./runtime.mjs";
import { digest, saveComplete } from "./artifact-identity.mjs";
import { deliverImage } from "./delivery.mjs";

const MAX_PNG_SIDE = 8192;
const MAX_PNG_PIXELS = 32_000_000;

/** Preserve the author's exact manifest bytes; no automatic source or SDK rebinding is performed. */
export async function deliverManifest(report, context) {
  report.stage = "export-manifest";
  let bytes;
  try { bytes = readRequestFile(context.options, "manifest"); }
  catch (cause) { throw invalid(`Cannot read manifest: ${cause.message}`); }
  const path = join(report.revision.directory, "export-manifest.json");
  await saveComplete(path, bytes, context.signal);
  report.exportManifest = { path, source: resolve(context.options["export-manifest"]), sha256: digest(bytes), status: "preflight" };
  report.artifacts.push({ kind: "export-manifest", path, sha256: digest(bytes) });
  let manifest;
  try { manifest = JSON.parse(bytes.toString("utf8")); }
  catch (cause) { report.exportManifest.status = "preflight-failed"; throw invalid(cause.message); }
  const settings = { theme: report.theme, reducedMotion: false, background: context.options.background ?? "theme" };
  report.exportManifest.settings = settings;
  report.exportManifest.manifest = manifest;
  let items;
  try { items = planManifest(report, context, manifest, settings); }
  catch (cause) { report.exportManifest.status = "preflight-failed"; throw cause; }
  report.completion.requested = [...report.completion.requested.filter((kind) => kind !== "exports"), ...new Set(items.map((item) => item.format))];
  report.exportManifest.status = "running";
  await mkdir(join(report.revision.directory, "exports"), { recursive: true });
  report.exports = items.map((item) => ({ name: item.name, format: item.format, timeMs: item.timeMs,
    theme: settings.theme, reducedMotion: false, background: settings.background, width: item.dimensions.width,
    height: item.dimensions.height, path: join(report.revision.directory, item.filename), status: "not-run" }));
  try {
    for (const [index, item] of items.entries()) await deliverImage(report, context, { ...item, result: report.exports[index] });
  } finally {
    if (context.signal?.aborted) {
      for (const item of report.exports.filter((item) => item.status === "not-run")) {
        item.error = { code: "BATCH_NOT_EXECUTED", reason: "Task cancelled before this item started." };
      }
    }
    for (const format of new Set(items.map((item) => item.format))) {
      report.completion.completed = report.completion.completed.filter((kind) => kind !== format);
      if (report.exports.filter((item) => item.format === format).every((item) => item.status === "succeeded")) report.completion.completed.push(format);
    }
    report.exportManifest.status = context.signal?.aborted ? "cancelled"
      : report.exports.every((item) => item.status === "succeeded") ? "succeeded" : "failed";
  }
}

function planManifest(report, context, manifest, settings) {
  if (!hasFields(manifest, ["schemaVersion", "sourceSha256", "sdk", "frames"]) || manifest.schemaVersion !== 1
    || manifest.sourceSha256 !== report.input.sha256 || !hasFields(manifest.sdk, ["version", "integrity"])
    || manifest.sdk.version !== report.sdk.version || manifest.sdk.integrity !== report.sdk.integrity
    || !Array.isArray(manifest.frames) || !manifest.frames.length) throw invalid("Manifest must bind this source SHA-256, installed SDK version/integrity and a nonempty frames array.");
  const names = new Set();
  for (const frame of manifest.frames) {
    if (!hasFields(frame, ["name", "timeMs", "formats"]) || !portableName(frame.name)
      || names.has(frame.name.normalize("NFC").toLowerCase())) throw invalid("Each frame needs a unique portable name; case and Unicode normalization collisions are rejected.");
    names.add(frame.name.normalize("NFC").toLowerCase());
    if (!Number.isFinite(frame.timeMs) || frame.timeMs < 0 || frame.timeMs > context.diagram.totalDuration) throw invalid(`Frame ${frame.name} timeMs must be a number between 0 and ${context.diagram.totalDuration}.`);
    if (!Array.isArray(frame.formats) || !frame.formats.length || frame.formats.some((format) => !["svg", "png"].includes(format))
      || new Set(frame.formats).size !== frame.formats.length) throw invalid(`Frame ${frame.name} needs unique SVG/PNG formats.`);
  }
  const hasPng = manifest.frames.some((frame) => frame.formats.includes("png"));
  const width = context.options["png-width"];
  if (width !== undefined && (!hasPng || !width.trim() || !Number.isFinite(Number(width)) || Number(width) <= 0)) throw invalid("--png-width requires a PNG item and a positive finite pixel width.");
  if (width !== undefined) settings.pngWidth = Number(width);
  return manifest.frames.flatMap((frame) => frame.formats.map((format) => ({ ...settings, format, name: frame.name,
    timeMs: frame.timeMs, filename: `exports/${frame.name}.${format}`, width,
    dimensions: imageDimensions(report, context, frame, format, width) })));
}

/** Match public PNG rounding and limits using the selected public camera, before browser allocation. */
function imageDimensions(report, context, frame, format, requestedWidth) {
  const camera = context.diagram.evaluateAt(frame.timeMs, { theme: report.theme, reducedMotion: false }).camera;
  if (format === "svg") return { width: camera.width, height: camera.height };
  const width = Math.max(1, Math.round(requestedWidth === undefined ? context.document.viewport.width : Number(requestedWidth)));
  const height = Math.max(1, Math.round(width * (camera.height / camera.width)));
  if (!Number.isFinite(width) || !Number.isFinite(height) || Math.max(width, height) > MAX_PNG_SIDE
    || width * height > MAX_PNG_PIXELS) throw invalid(`Frame ${frame.name} exceeds PNG side or pixel limits.`);
  return { width, height };
}
function hasFields(value, fields) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === fields.length && fields.every((field) => Object.hasOwn(value, field));
}
function portableName(name) {
  return typeof name === "string" && name.trim().length > 0 && name !== "." && name !== ".."
    && !/[<>:"/\\|?*\x00-\x1f\x7f]/u.test(name) && !/[. ]$/u.test(name)
    && !/^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/iu.test(name);
}

function invalid(message) {
  return new ToolError("export-manifest", "EXPORT_MANIFEST_INVALID", message,
    "Read the saved source hash, installed SDK identity and compiled timeline. Confirm the selected frames and create a new manifest explicitly.", "export-manifest");
}
