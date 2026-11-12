/** Replace one explicitly selected task-source draft; generated current files and checkpoints stay protected. */
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { digest } from "./artifact-identity.mjs";
import { assertDiagramName } from "./reports.mjs";
import { reserveDraftOperation, releaseWorkingDraft } from "./working-draft.mjs";
import { ToolError } from "./runtime.mjs";

/** Reserve the same task series as author/finalize before reading its editable source bytes. */
export async function openEditableDraft(input) {
  const path = resolve(input);
  const workspace = dirname(path);
  const nameDirectory = dirname(workspace);
  const name = basename(nameDirectory);
  if (dirname(nameDirectory) !== resolve(".diagrams", ".work") || name.startsWith(".") || extname(path) !== ".json"
    || await realpath(path) !== path) throw invalid(path, "Select a real JSON draft directly inside .diagrams/.work/<name>/<task>/.");
  assertDiagramName(name);
  const history = join(workspace, "history");
  const series = join(history, name);
  await ensureCanonicalDirectory(history);
  await ensureCanonicalDirectory(series);
  const lock = await reserveDraftOperation(series);
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.nlink !== 1) throw invalid(path, "The editable draft must be a regular file without hard links.");
    return { path, lock, stat, bytes: await readFile(path) };
  } catch (cause) { await releaseWorkingDraft({ lock }); throw cause; }
}

/** Publish a complete replacement atomically; cancellation or pre-publication failure preserves original bytes. */
export async function replaceEditableDraft(operation, text, signal) {
  const temporary = join(dirname(operation.path), `.draft-write-${randomUUID()}`);
  try {
    signal?.throwIfAborted();
    await writeFile(temporary, text, { encoding: "utf8", flag: "wx", mode: operation.stat.mode, signal });
    const stat = await lstat(operation.path);
    if (await realpath(operation.path) !== operation.path || stat.dev !== operation.stat.dev || stat.ino !== operation.stat.ino
      || stat.nlink !== 1 || digest(await readFile(operation.path)) !== digest(operation.bytes)) {
      throw invalid(operation.path, "The selected draft changed while this operation was running; preserve the newer bytes and retry.");
    }
    signal?.throwIfAborted();
    await rename(temporary, operation.path);
  } catch (cause) {
    if (cause.name === "AbortError" || cause instanceof ToolError) throw cause;
    throw new ToolError("save", "EDITABLE_DRAFT_WRITE_FAILED", cause.message,
      "Keep the source draft, restore write access and retry the operation.", operation.path, cause);
  } finally { await rm(temporary, { force: true }); }
}

/** Release the task reservation after success, failure or cancellation. */
export async function closeEditableDraft(operation) {
  if (operation) await releaseWorkingDraft(operation);
}

async function ensureCanonicalDirectory(path) {
  try { await mkdir(path); }
  catch (cause) { if (cause.code !== "EEXIST") throw cause; }
  if (await realpath(path) !== path) throw invalid(path, "Task history and series must stay inside the canonical workspace.");
}

function invalid(path, reason) {
  return new ToolError("save", "EDITABLE_DRAFT_INVALID", reason, "Use a workspace-root source draft; keep external files and generated checkpoints unchanged.", path);
}
