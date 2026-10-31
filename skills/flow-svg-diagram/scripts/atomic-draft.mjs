/** Publish a complete draft beside its temporary file without replacing any existing destination. */
import { link, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

/** Native file errors remain available to each command's diagnostic adapter. */
export async function publishDraftCopy(path, text, signal) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    signal?.throwIfAborted();
    await writeFile(temporary, text, { encoding: "utf8", flag: "wx", signal });
    signal?.throwIfAborted();
    // Hard-link publication is exclusive and exposes only the complete same-filesystem draft.
    await link(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}
