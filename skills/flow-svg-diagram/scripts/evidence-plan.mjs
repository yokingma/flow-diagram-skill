/** Build complete evidence requirements from actual deliverable artifacts, prior requests and explicit additions. */
import { readFile } from "node:fs/promises";
import { readArtifact } from "./artifact-identity.mjs";
import { validateSettings } from "./artifact-evidence.mjs";
import { loadArtifactEvidenceSource, verifyArtifactReviewEntries } from "./artifact-review-source.mjs";
import { loadEvidenceRecords, surfaceKey, verifyIndependentEvidence } from "./evidence-records.mjs";

const MAX_SIDE = 8192;
const MAX_PIXELS = 32_000_000;

/** Return selected original bytes, complete requirements and identity-verified reusable images; this stage writes nothing. */
export async function planEvidence(subject, records, settingsPath) {
  const artifacts = await deliveredArtifacts(subject, records);
  if (!artifacts.length) throw new Error("The selected delivery has no existing SVG/PNG artifacts.");
  const operations = await loadEvidenceRecords(records);
  const prior = records.flatMap(({ report }) => report.artifactEvidence?.items ?? []);
  const additions = settingsPath ? JSON.parse(await readFile(settingsPath, "utf8")) : { items: [] };
  if (settingsPath) validateSettings(additions);
  const selections = [...operations.flatMap((operation) => operation.record.requested), ...prior, ...additions.items];
  const requested = new Map();
  for (const selection of selections) {
    const original = artifacts.find(({ artifact }) => artifact.artifactId === selection.artifactId);
    if (!original) {
      if (additions.items.includes(selection)) throw new Error("Explicit settings select an artifact outside the selected actual delivery.");
      continue;
    }
    const surface = prepareSurface(original.artifact, selection);
    requested.set(surfaceKey(surface), surface);
  }
  for (const { artifact } of artifacts) if (![...requested.values()].some((item) => item.artifactId === artifact.artifactId)) {
    const surface = prepareSurface(artifact, { displayWidth: Math.round(artifact.intrinsicWidth), backdrop: artifact.theme === "dark" ? "#111827" : "#ffffff" });
    requested.set(surfaceKey(surface), surface);
  }
  const candidates = [...operations.flatMap((operation) => operation.record.items.map((item) => ({ item, source: operation }))),
    ...prior.map((item) => ({ item, source: null }))];
  const reuse = new Map();
  const invalid = [];
  for (const { item, source } of candidates) {
    if (item.status !== "captured" || !requested.has(surfaceKey(item)) || reuse.has(surfaceKey(item))) continue;
    try {
      const verified = await verifyCandidate(subject, source, item);
      reuse.set(surfaceKey(item), verified);
    } catch (cause) {
      if (cause.code !== "EVIDENCE_IMAGE_INVALID") throw cause;
      invalid.push({ evidenceId: item.evidenceId, reason: cause.message });
    }
  }
  return { artifacts, operations, requested: [...requested.values()], reuse, invalid };
}

/** Match final file selection by relative output path; historical replaced artifacts are not current deliverables. */
export async function deliveredArtifacts(subject, records) {
  const selected = new Map();
  for (const { report } of records) for (const artifact of report.artifacts ?? []) {
    if (!["svg", "png"].includes(artifact.kind) || selected.has(artifact.relativePath)) continue;
    selected.set(artifact.relativePath, await readArtifact(subject.report, artifact.artifactSourceRevision, artifact.artifactId));
  }
  return [...selected.values()];
}

/** Validate derived CSS dimensions against the original file, not a reconstructed diagram viewport. */
export function prepareSurface(artifact, selection) {
  const displayWidth = selection.displayWidth;
  const backdrop = selection.backdrop?.toLowerCase();
  const displayHeight = Math.max(1, Math.round(displayWidth * artifact.intrinsicHeight / artifact.intrinsicWidth));
  if (!Number.isInteger(displayWidth) || displayWidth <= 0 || displayWidth > MAX_SIDE || !/^#[a-f0-9]{6}$/u.test(backdrop ?? "")
    || !Number.isFinite(displayHeight) || displayHeight > MAX_SIDE || displayWidth * displayHeight > MAX_PIXELS) throw new Error("Evidence surface requires positive integer CSS width, opaque #RRGGBB backdrop, at most 8192 per side and 32,000,000 pixels.");
  return { artifactId: artifact.artifactId, artifactSourceRevision: artifact.artifactSourceRevision,
    displayWidth, displayHeight, backdrop };
}

async function verifyCandidate(subject, source, item) {

  if (source) {
    await verifyIndependentEvidence(subject, source, item);
    return { item, locator: source.locator };
  }
  const original = await loadArtifactEvidenceSource(subject, item.evidenceRevision);
  const settings = original.source.artifactEvidence?.settings;
  if (!settings?.items?.some((selection) => surfaceKey({ ...selection, displayHeight: item.displayHeight }) === surfaceKey(item))) throw new Error("Revision evidence is outside its registered settings.");
  await verifyArtifactReviewEntries({ ...subject, artifactEvidenceSource: original }, { items: [{ evidenceId: item.evidenceId, sha256: item.sha256 }] });
  return { item: { ...item, evidenceSource: original.locator }, locator: original.locator };
}
