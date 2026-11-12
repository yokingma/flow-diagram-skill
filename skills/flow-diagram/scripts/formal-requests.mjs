/** Persist explicit template intent beside immutable sources; never rewrite source reports or claim viewing. */
import { lstat, mkdir, readdir, realpath } from "node:fs/promises";
import { dirname, join } from "node:path";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { publishDraftCopy } from "./atomic-draft.mjs";
import { ToolError } from "./runtime.mjs";

/** Bind one requested evidence kind to the exact selected source; identical requests reuse their record. */
export async function saveFormalRequest(context, kind, signal) {
  const report = await scopedFile(context.parent.directory, join(context.parent.directory, "report.json"));
  const request = { schemaVersion: 1, sourceRevision: context.parent.id, reportSha256: digest(report.bytes), kind };
  const id = requestId(request);
  const directory = await requestDirectory(dirname(context.parent.directory), true);
  const path = join(directory, `${id}.json`);
  try { await publishDraftCopy(path, JSON.stringify({ ...request, id }, null, 2) + "\n", signal); }
  catch (cause) {
    if (cause.code !== "EEXIST") throw cause;
    const existing = JSON.parse((await scopedFile(directory, path)).bytes.toString("utf8"));
    if (requestId(existing) !== id || existing.id !== id) throw invalid("Existing formal request identity changed.");
  }
  return { ...request, id };
}

/** Verify applicable request records against immutable report bytes before projecting formal coverage. */
export async function loadFormalRequests(records) {
  const directory = await requestDirectory(dirname(records[0].directory), false);
  if (!directory) return [];
  const results = [];
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".json")).sort()) {
    const request = JSON.parse((await scopedFile(directory, join(directory, name))).bytes.toString("utf8"));
    if (!/^request-[a-f0-9]{64}$/u.test(request.id ?? "") || name !== `${request.id}.json`
      || request.schemaVersion !== 1 || !["visual", "html", "artifact"].includes(request.kind)
      || requestId(request) !== request.id) throw invalid("Formal request record identity changed.");
    const source = records.find(({ report }) => report.revision.id === request.sourceRevision);
    if (!source) continue;
    const report = await scopedFile(source.directory, join(source.directory, "report.json"));
    if (digest(report.bytes) !== request.reportSha256) throw invalid("Formal request source report changed.");
    results.push(request);
  }
  return results;
}

function requestId(request) {
  return `request-${digest(JSON.stringify([request.schemaVersion, request.sourceRevision, request.reportSha256, request.kind]))}`;
}
async function requestDirectory(series, create) {
  let directory = await realpath(series);
  for (const name of ["records", "formal-requests"]) {
    const path = join(directory, name);
    if (create) await mkdir(path).catch((cause) => { if (cause.code !== "EEXIST") throw cause; });
    try {
      if (await realpath(path) !== path || !(await lstat(path)).isDirectory()) throw invalid("Formal requests escape the selected task.");
    } catch (cause) { if (!create && cause.code === "ENOENT") return null; throw cause; }
    directory = path;
  }
  return directory;
}
function invalid(reason) {
  return new ToolError("review", "FORMAL_REQUEST_INVALID", reason, "Preserve the task and previous delivery; restore the original request and source before retrying.");
}
