/** Keep current export requests separate from completion so every replacement renders fresh files. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPORT_OPTIONS = ["svg", "png", "gif", "time", "background", "png-width", "theme", "samples", "preview"];

/** Persist omitted current settings and read request files once; failures remain in their export stage. */
export async function inheritExportRequest(report, parent, options) {
  const previous = parent && (parent.workingDraft || report.workingDraft) ? parent.exportRequest ?? {} : {};
  const inherited = Object.fromEntries(EXPORT_OPTIONS.filter((key) => previous.options?.[key] !== undefined).map((key) => [key, previous.options[key]]));
  const selected = { ...inherited, ...options };
  const singleSelection = options.svg || options.png;
  const manifest = options["export-manifest"] ? await snapshotFile(options["export-manifest"])
    : singleSelection ? undefined : previous.manifest;
  const gifOptions = options["gif-options"] ? await snapshotFile(options["gif-options"]) : previous.gifOptions;
  if (manifest) { delete selected.svg; delete selected.png; delete selected.time; }
  report.exportRequest = { options: Object.fromEntries(EXPORT_OPTIONS.filter((key) => selected[key] !== undefined).map((key) => [key, selected[key]])),
    ...(manifest ? { manifest } : {}), ...(gifOptions ? { gifOptions } : {}) };
  const requested = ["json", "html", ...(selected.svg ? ["svg"] : []), ...(selected.png ? ["png"] : []), ...(selected.gif ? ["gif"] : []),
    ...(manifest ? ["exports"] : [])];
  report.completion.requested = parent && !parent.workingDraft
    ? [...new Set([...report.completion.requested, ...requested])] : requested;
  return { ...selected, ...(manifest ? { "export-manifest": manifest.source } : {}),
    ...(gifOptions ? { "gif-options": gifOptions.source } : {}), requestFiles: { manifest, gifOptions } };
}

/** Export stages consume the read-once request, never a mutable external options file on continuation. */
export function readRequestFile(options, key) {
  const snapshot = options.requestFiles?.[key];
  if (!snapshot) return null;
  if (snapshot.error) throw new Error(snapshot.error);
  return Buffer.from(snapshot.base64, "base64");
}

async function snapshotFile(source) {
  try { return { source: resolve(source), base64: (await readFile(source)).toString("base64") }; }
  catch (cause) { return { source: resolve(source), error: cause.message }; }
}
