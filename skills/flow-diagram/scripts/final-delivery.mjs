/** Publish the selected default authoring revision as the user-facing final delivery. */
import { replaceDelivery } from "./delivery-publication.mjs";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const DEFAULT_HISTORY_ROOT = resolve(".diagrams", ".history");
const BASE_DELIVERY_FILES = ["diagram.json", "diagram.html", "report.json", "report.md"];
const COPIED_ARTIFACT_KINDS = new Set(["json", "html", "report-json", "report-markdown", "svg", "png", "gif", "export-manifest"]);

/** Copy complete authoring outputs only after the requested delivery has succeeded. */
export async function publishFinalDelivery(report, options) {
  if (report.command !== "author" || report.completion.delivery !== "complete" || report.status === "cancelled") return null;
  const historyRoot = resolve(options.output || DEFAULT_HISTORY_ROOT);
  if (historyRoot !== DEFAULT_HISTORY_ROOT) return null;

  const diagramName = basename(dirname(report.revision.directory));
  const finalDirectory = join(dirname(historyRoot), diagramName);
  const temporaryDirectory = `${finalDirectory}.tmp-${process.pid}-${Date.now()}`;
  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(temporaryDirectory, { recursive: true });
  try {
    const files = new Set(BASE_DELIVERY_FILES);
    for (const artifact of report.artifacts) {
      if (COPIED_ARTIFACT_KINDS.has(artifact.kind)) files.add(relative(report.revision.directory, artifact.path));
    }
    for (const item of report.exports) {
      if (item.status === "succeeded" && item.path) files.add(relative(report.revision.directory, item.path));
    }
    for (const file of files) await copyRevisionFile(report.revision.directory, temporaryDirectory, file);
    await replaceDelivery(temporaryDirectory, finalDirectory);
    return finalDirectory;
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function copyRevisionFile(revisionDirectory, temporaryDirectory, file) {
  if (!file || isAbsolute(file) || file === "." || file === ".." || file.startsWith(`..${sep}`)) {
    throw new Error(`Final delivery file escapes the revision directory: ${file}`);
  }
  const source = join(revisionDirectory, file);
  const destination = join(temporaryDirectory, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
