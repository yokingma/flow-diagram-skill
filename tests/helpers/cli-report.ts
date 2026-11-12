/** Load a saved authoring report through its public result pointer; read-only results stay inline. */
import { readFile } from "node:fs/promises";

export async function readCommandReport(stdout: string) {
  const result = JSON.parse(stdout);
  if (result.command !== "author" || !result.detailsPath) return result;
  return JSON.parse(await readFile(result.detailsPath, "utf8"));
}
