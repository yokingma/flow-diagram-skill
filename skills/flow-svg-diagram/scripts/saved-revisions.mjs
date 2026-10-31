/** Read exact saved ancestry for review and finalization; this reader never creates or edits revisions. */
import { realpath } from "node:fs/promises";
import { join } from "node:path";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { ToolError } from "./runtime.mjs";

const REVISION_ID = /^v\d{3,}$/u;

/** Stop ancestry at a changed source/theme/SDK context; invalid bytes or cyclic identities fail closed. */
export async function readSavedRevisions(root, id) {
  const records = [];
  const seen = new Set();
  while (id) {
    if (!REVISION_ID.test(id) || seen.has(id)) throw invalid("Invalid or cyclic saved ancestry.");
    seen.add(id);
    const directory = join(root, id);
    if (await realpath(directory) !== directory) throw invalid("Revision path must stay inside the selected diagram series.");
    const report = JSON.parse((await scopedFile(directory, join(directory, "report.json"))).bytes.toString("utf8"));
    const input = await scopedFile(directory, join(directory, "diagram.json"));
    if (report.revision?.id !== id || digest(input.bytes) !== report.input?.sha256) throw invalid("Saved revision identity or input bytes changed.");
    if (records.length && !sameContext(records[0].report, report)) break;
    records.push({ directory, report: { ...report, revision: { ...report.revision, directory } } });
    id = report.revision.parent;
  }
  return records;
}
function sameContext(left, right) {
  return left.input?.sha256 === right.input?.sha256 && left.theme === right.theme
    && left.sdk?.version === right.sdk?.version && left.sdk?.integrity === right.sdk?.integrity;
}
function invalid(reason) {
  return new ToolError("revision", "SAVED_REVISION_INVALID", reason, "Keep the task and original saved sources; restore the invalid source before retrying.");
}
