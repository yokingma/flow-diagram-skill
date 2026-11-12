/** Publish complete deliveries with destination ownership checks and rollback on replacement failure. */
import { lstat, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { ToolError } from "./runtime.mjs";

/** Replace only a recognized delivery; restore its previous directory when the new rename fails. */
export async function replaceDelivery(staging, destination) {
  let backup;
  try {
    const existing = await lstat(destination);
    if (!existing.isDirectory() || existing.isSymbolicLink()) throw invalid("FINALIZE_DESTINATION", "Final destination must be a real directory.");
    const report = JSON.parse(await readFile(join(destination, "report.json"), "utf8"));
    const inputHash = report.command === "finalize" ? report.inputSha256 : report.input?.sha256;
    if (!["author", "finalize"].includes(report.command) || report.completion?.delivery !== "complete" || !/^[a-f0-9]{64}$/u.test(inputHash ?? "")) {
      throw invalid("FINALIZE_DESTINATION", "Existing directory is not a FlowSVG final delivery.");
    }
    backup = `${staging}-previous`;
    await rename(destination, backup);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  try { await rename(staging, destination); }
  catch (error) {
    if (backup) {
      try { await rename(backup, destination); }
      catch (restore) { throw invalid("FINALIZE_RESTORE", `Publication failed: ${error.message}; restore failed: ${restore.message}. Previous delivery remains at ${backup}.`); }
    }
    throw error;
  }
  if (backup) await rm(backup, { recursive: true, force: true });
}


function invalid(code, reason) {
  return new ToolError("finalize", code, reason, "Keep current work and the previous delivery; resolve the reported cause before retrying.");
}
