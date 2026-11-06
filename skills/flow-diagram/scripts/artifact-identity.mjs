/** Immutable static-file identities and scoped revision readers shared by export and evidence workflows. */
import { createHash } from "node:crypto";
import { open, readFile, realpath, rm } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Identity binds actual file bytes, source revision and all recorded rendering parameters. */
export function artifactIdentity(item) {
  return digest(JSON.stringify(["flowsvg-artifact-v1", item.artifactSourceRevision, item.sourceSha256,
    item.sdk?.version, item.sdk?.integrity, item.kind, item.name, item.relativePath, item.timeMs, item.theme,
    item.reducedMotion, item.background, item.camera, item.intrinsicWidth, item.intrinsicHeight, item.viewBox ?? null, item.sha256]));
}

/** Inspect intrinsic dimensions from the returned file, rather than inferred viewport defaults. */
export function inspectImage(kind, bytes) {
  if (kind === "png") {
    const buffer = Buffer.from(bytes);
    if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || buffer.toString("ascii", 12, 16) !== "IHDR") throw new Error("Invalid PNG header.");
    return { intrinsicWidth: buffer.readUInt32BE(16), intrinsicHeight: buffer.readUInt32BE(20) };
  }
  const value = Buffer.from(bytes).toString("utf8").match(/<svg\b[^>]*\bviewBox="([^"]+)"/u)?.[1];
  const viewBox = value?.trim().split(/[\s,]+/u).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) throw new Error("SVG needs a valid positive viewBox.");
  return { intrinsicWidth: viewBox[2], intrinsicHeight: viewBox[3], viewBox };
}

/** Exclusive writes register only complete files; cancellation never removes an existing destination. */
export async function saveComplete(path, data, signal) {
  const handle = await open(path, "wx");
  try { await handle.writeFile(data, { signal }); signal?.throwIfAborted(); await handle.close(); }
  catch (cause) { await handle.close(); await rm(path, { force: true }); throw cause; }
}

/** Save a public SDK result and retain its exact source/camera/context identity for later review. */
export async function saveStaticArtifact(report, { kind, name, filename, data, timeMs, background, diagram, signal }) {
  const path = join(report.revision.directory, filename);
  const metadata = { kind, path, relativePath: relative(report.revision.directory, path), name,
    artifactSourceRevision: report.revision.id, sourceSha256: report.input.sha256,
    sdk: { version: report.sdk.version, integrity: report.sdk.integrity }, timeMs, theme: report.theme,
    reducedMotion: false, background, camera: diagram.evaluateAt(timeMs, { theme: report.theme, reducedMotion: false }).camera,
    ...inspectImage(kind, Buffer.from(data)), sha256: digest(data) };
  metadata.artifactId = artifactIdentity(metadata);
  await saveComplete(path, data, signal);
  report.artifacts.push(metadata);
  return metadata;
}

/** Canonical directory and file containment reject traversal and symlink escapes before reading bytes. */
export async function scopedFile(directory, path) {
  const [root, file] = await Promise.all([realpath(directory), realpath(path)]);
  if (!file.startsWith(root + sep)) throw new Error("File escapes its registered revision directory.");
  return { path: file, bytes: await readFile(file) };
}

/** Load an explicit sibling revision and check its saved input against the current SDK/source context. */
export async function loadArtifactRevision(report, id) {
  if (typeof id !== "string" || !/^v\d{3,}$/u.test(id)) throw new Error("An explicit artifact revision ID is required.");
  const root = await realpath(dirname(report.revision.directory));
  const directory = await realpath(join(root, id));
  if (dirname(directory) !== root) throw new Error("Artifact revision escapes the selected diagram.");
  const source = JSON.parse((await scopedFile(directory, join(directory, "report.json"))).bytes.toString("utf8"));
  const input = await scopedFile(directory, join(directory, "diagram.json"));
  if (source.revision?.id !== id || digest(input.bytes) !== source.input?.sha256 || source.input.sha256 !== report.input.sha256
    || source.theme !== report.theme || source.sdk?.version !== report.sdk.version || source.sdk?.integrity !== report.sdk.integrity) {
    throw new Error("Artifact source bytes, theme or SDK baseline do not match this revision.");
  }
  return { directory, source };
}

/** Resolve only registered original SVG/PNG bytes; metadata edits invalidate their canonical identity. */
export async function readArtifact(report, revisionId, artifactId) {
  const { directory, source } = await loadArtifactRevision(report, revisionId);
  const artifact = source.artifacts?.find((item) => item.artifactId === artifactId && ["svg", "png"].includes(item.kind));
  if (!artifact || artifact.artifactSourceRevision !== revisionId || artifact.sourceSha256 !== source.input.sha256
    || artifact.theme !== source.theme || artifact.reducedMotion !== false || artifact.sdk?.version !== source.sdk.version
    || artifact.sdk?.integrity !== source.sdk.integrity || artifactIdentity(artifact) !== artifactId) throw new Error("Artifact is unregistered or its rendering context changed.");
  const file = await scopedFile(directory, artifact.path);
  if (artifact.relativePath !== relative(directory, file.path)) throw new Error("Artifact path differs from its registered location.");
  const dimensions = inspectImage(artifact.kind, file.bytes);
  if (digest(file.bytes) !== artifact.sha256 || JSON.stringify(dimensions) !== JSON.stringify({ intrinsicWidth: artifact.intrinsicWidth,
    intrinsicHeight: artifact.intrinsicHeight, ...(artifact.kind === "svg" ? { viewBox: artifact.viewBox } : {}) })) throw new Error("Artifact bytes or intrinsic dimensions changed after export.");
  return { artifact, bytes: file.bytes };
}
