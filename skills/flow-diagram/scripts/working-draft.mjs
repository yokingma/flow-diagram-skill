/** Stage mutable authoring runs, then replace one current result without accumulating revisions. */
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { assertDiagramName, saveReport } from "./reports.mjs";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { ToolError } from "./runtime.mjs";

/** Reserve one author operation. The stable current result remains readable until the run is saved. */
export async function allocateWorkingDraft(outputRoot, name) {
  assertDiagramName(name);
  const series = resolve(outputRoot, name);
  await mkdir(series, { recursive: true });
  if (await realpath(series) !== series) throw invalid("Working draft directory must not use symlink ancestors.");
  const lock = await reserveDraftOperation(series);
  try {
    await recoverInterruptedRuns(series);
    const directory = await mkdtemp(join(series, ".current-run-"));
    return { revision: { id: "current", directory, parent: null }, current: join(series, "current"),
      recovery: join(series, ".recovery"), previous: await optionalReport(join(series, "current")), lock };
  } catch (cause) {
    await rm(lock, { recursive: true, force: true });
    throw cause;
  }
}

/** Reserve current authoring or finalization; a live owner prevents destructive task cleanup. */
export async function reserveDraftOperation(series) {
  if (await realpath(series) !== series) throw invalid("Task result series must use a canonical directory.");
  const lock = join(series, ".current.lock");
  await reserveOperation(lock);
  try { await writeFile(join(lock, "owner.json"), JSON.stringify({ pid: process.pid })); }
  catch (cause) { await rm(lock, { recursive: true, force: true }); throw cause; }
  return lock;
}

/** Publish even a failed draft for recovery, retaining at most one earlier complete result. */
export async function finishWorkingDraft(report, operation) {
  if (!operation) return;
  const staging = report.revision.directory;
  const previous = await optionalReport(operation.current);
  const existingRecovery = await optionalReport(operation.recovery);
  const complete = report.completion.delivery === "complete";
  const retainPrevious = !complete && previous?.completion?.delivery === "complete";
  const recovery = retainPrevious ? previous : !complete ? existingRecovery : null;
  if (recovery) report.recovery = recoveryDescription(recovery, operation.recovery);
  const currentReport = relocate(report, staging, operation.current);
  currentReport.workingDraft = { ...currentReport.workingDraft, id: "current", directory: operation.current, inputSha256: report.input?.sha256 };
  // Serialize stable locators while files are still private to this run.
  const writable = { ...currentReport, revision: { ...currentReport.revision, directory: staging } };
  await saveReport(writable);
  await writeFile(join(staging, "report.json"), JSON.stringify(currentReport, null, 2) + "\n");
  const replaced = `${staging}-previous`;
  try {
    if (previous) await rename(operation.current, replaced);
    await rename(staging, operation.current);
  } catch (cause) {
    if (previous) {
      try { await rename(replaced, operation.current); }
      catch (restore) { throw invalid(`Current replacement failed: ${cause.message}; restore also failed: ${restore.message}. Recover files at ${replaced} and ${staging}.`); }
    }
    throw cause;
  }
  Object.assign(report, currentReport);
  if (retainPrevious) {
    await rm(operation.recovery, { recursive: true, force: true });
    await rename(replaced, operation.recovery);
    const saved = relocate(previous, operation.current, operation.recovery);
    await saveReport(saved);
  } else if (previous) await rm(replaced, { recursive: true, force: true });
  if (complete) {
    await rm(operation.recovery, { recursive: true, force: true });
    await rm(join(dirname(operation.current), ".interrupted"), { recursive: true, force: true });
  }
}

/** Release only this invocation's reservation; successful runs leave no staging files behind. */
export async function releaseWorkingDraft(operation) {
  if (operation) await rm(operation.lock, { recursive: true, force: true });
}

/** Read one exact mutable result, with no ancestry lookup or inferred historical artifacts. */
export async function readCurrentDraft(root) {
  const directory = join(root, "current");
  if (await realpath(directory) !== directory) throw invalid("Current draft must remain inside its real task directory.");
  const report = JSON.parse((await scopedFile(directory, join(directory, "report.json"))).bytes.toString("utf8"));
  const input = await scopedFile(directory, join(directory, "diagram.json"));
  if (report.revision?.id !== "current" || report.workingDraft?.directory !== directory
    || digest(input.bytes) !== report.input?.sha256) throw invalid("Current draft bytes or identity changed after authoring.");
  return { directory, report };
}

/** Capture source-bound file hashes after generation; current outputs never inherit an older pass. */
export async function bindWorkingArtifacts(report) {
  if (!report.workingDraft) return;
  const kinds = new Set(["json", "html", "svg", "png", "gif"]);
  for (const artifact of report.artifacts.filter((item) => kinds.has(item.kind))) {
    const bytes = await scopedFile(report.revision.directory, artifact.path);
    artifact.sha256 = digest(bytes.bytes);
    artifact.sourceSha256 = report.input.sha256;
    artifact.sdk = { version: report.sdk?.version, integrity: report.sdk?.integrity };
    artifact.theme = report.theme;
  }
}

function relocate(value, from, to) {
  if (typeof value === "string") return value.replaceAll(from, to);
  if (Array.isArray(value)) return value.map((item) => relocate(item, from, to));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, relocate(item, from, to)]));
  return value;
}

async function optionalReport(directory) {
  try {
    if (await realpath(directory) !== directory) throw invalid("Current and recovery directories must not be symlinks.");
    const report = JSON.parse(await readFile(join(directory, "report.json"), "utf8"));
    if (report.revision?.id !== "current" || report.revision?.directory !== directory || report.workingDraft?.directory !== directory) {
      throw invalid("Current or recovery report has an invalid directory identity.");
    }
    return report;
  } catch (cause) { if (cause.code === "ENOENT") return null; throw cause; }
}

async function reserveOperation(lock) {
  try { await mkdir(lock); return; }
  catch (cause) { if (cause.code !== "EEXIST") throw cause; }
  // Only one recoverer may inspect/remove a dead owner's lock. Read the owner after winning
  // this election, so a previously observed dead PID cannot authorize deleting a new live lock.
  const recovery = `${lock}.recovery`;
  await mkdir(recovery).catch((cause) => {
    throw invalid(`Cannot reserve operation recovery at ${recovery}: ${cause.message}. If recovery was interrupted, verify no author process is running before removing that recovery reservation.`);
  });
  try {
    await writeFile(join(recovery, "owner.json"), JSON.stringify({ pid: process.pid }));
    if (await realpath(lock) !== lock) throw invalid("Operation lock must not be a symlink.");
    let owner;
    try { owner = JSON.parse(await readFile(join(lock, "owner.json"), "utf8")); }
    catch (cause) { throw invalid(`Operation owner is unavailable: ${cause.message}. Verify no author process is running before removing ${lock}.`); }
    if (!Number.isInteger(owner.pid) || owner.pid <= 0) throw invalid(`Invalid operation owner; preserve files and verify ${lock} before removing the lock.`);
    try { process.kill(owner.pid, 0); }
    catch (cause) {
      if (cause.code !== "ESRCH") throw invalid(`Cannot verify operation owner ${owner.pid}: ${cause.message}`);
      await rm(lock, { recursive: true });
      await mkdir(lock).catch((error) => { throw invalid(`Another operation reserved the draft during recovery: ${error.message}`); });
      return;
    }
    throw invalid(`Author process ${owner.pid} still owns this working draft. Wait for that operation to finish.`);
  } finally {
    // Recovery reservations are never automatically reclaimed: a crashed recovery fails closed
    // instead of introducing another stale-owner election with the same deletion race.
    await rm(recovery, { recursive: true, force: true });
  }
}

// Preserve interrupted input before cleaning a dead operation's staging area.
async function recoverInterruptedRuns(series) {
  const replaced = (await readdir(series)).filter((name) => /^\.current-run-[A-Za-z0-9]+-previous$/u.test(name));
  for (const name of replaced) {
    const path = join(series, name);
    if (await realpath(path) !== path) throw invalid(`Interrupted previous result is not a real directory: ${path}`);
    const current = await optionalReport(join(series, "current"));
    const destination = join(series, current ? ".recovery" : "current");
    if (current) await rm(destination, { recursive: true, force: true });
    await rename(path, destination);
    const old = JSON.parse(await readFile(join(destination, "report.json"), "utf8"));
    await saveReport(relocate(old, join(series, "current"), destination));
  }
  const abandoned = (await readdir(series)).filter((name) => /^\.current-run-[A-Za-z0-9]+$/u.test(name));
  for (const name of abandoned) {
    const path = join(series, name);
    if (await realpath(path) !== path) throw invalid(`Interrupted run is not a real directory: ${path}`);
    const preserved = join(series, ".interrupted");
    await rm(preserved, { recursive: true, force: true });
    await rename(path, preserved);
    const reportPath = join(preserved, "report.json");
    try {
      const report = relocate(JSON.parse(await readFile(reportPath, "utf8")), path, preserved);
      report.status = "cancelled";
      report.completion.delivery = "incomplete";
      await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
    } catch (cause) { if (cause.code !== "ENOENT") throw cause; }
  }
}

function recoveryDescription(report, directory) {
  return { directory, inputSha256: report.input?.sha256, theme: report.theme,
    sdk: { version: report.sdk?.version, integrity: report.sdk?.integrity },
    artifacts: report.artifacts.filter((item) => ["json", "html", "svg", "png", "gif"].includes(item.kind))
      .map((item) => ({ kind: item.kind, path: join(directory, relative(report.revision.directory, item.path)), sha256: item.sha256 })) };
}

function invalid(reason) {
  return new ToolError("save", "WORKING_DRAFT_INVALID", reason, "Keep the task files; resolve the current draft or operation lock before retrying.");
}
