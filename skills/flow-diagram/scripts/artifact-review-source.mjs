/** Resolve explicit formal-evidence sources independently from the real diagram subject; no revision is synthesized. */
import { EVIDENCE_RECORD_ID, loadIndependentEvidenceSource, verifyIndependentEvidence } from "./evidence-records.mjs";
import { basename, dirname, join } from "node:path";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { validateEvidence } from "./artifact-review.mjs";
import { loadReviewSource } from "./review-preflight.mjs";

/** Return the registered source plus a hash-bound locator suitable for immutable review records. */
export async function loadArtifactEvidenceSource(subject, selection = subject.parent.id) {
  const id = typeof selection === "string" ? selection : selection?.id;
  if (EVIDENCE_RECORD_ID.test(id ?? "") || selection?.kind === "evidence-record") return loadIndependentEvidenceSource(subject, selection);
  if (typeof selection !== "string" && selection?.kind !== "revision") throw new Error("Unsupported artifact evidence source kind.");
  const source = await loadReviewSource({ from: id, output: dirname(dirname(subject.parent.directory)), name: basename(dirname(subject.parent.directory)) });
  for (const key of ["theme", "reducedMotion"]) if (source.source[key] !== subject.source[key]) throw new Error(`Artifact evidence ${key} differs from the diagram subject.`);
  if (source.source.input.sha256 !== subject.source.input.sha256 || source.source.sdk.version !== subject.source.sdk.version
    || source.source.sdk.integrity !== subject.source.sdk.integrity) throw new Error("Artifact evidence source does not match the subject input and runtime baseline.");
  const file = await scopedFile(source.parent.directory, join(source.parent.directory, "report.json"));
  const locator = { kind: "revision", id, sourceRevision: id, reportSha256: digest(file.bytes) };
  if (typeof selection !== "string" && Object.keys(locator).some((key) => selection[key] !== locator[key])) throw new Error("Artifact evidence source identity changed.");
  return { ...source, locator };
}

/** Verify all registered settings and exact source images before an artifact observation is accepted. */
export async function verifyArtifactReviewEntries(context, review) {
  const evidenceContext = context.artifactEvidenceSource ?? await loadArtifactEvidenceSource(context);
  const { parent, source } = evidenceContext;
  if (evidenceContext.locator.kind === "evidence-record") {
    const entries = [];
    for (const item of review.items) {
      const evidence = source.artifactEvidence.items.find((candidate) => candidate.evidenceId === item.evidenceId);
      await verifyIndependentEvidence(context, evidenceContext, evidence);
      if (item.sha256 !== evidence.sha256) throw new Error("Reviewed evidence SHA-256 differs from its registered screenshot.");
      entries.push({ ...evidence, evidenceSource: evidenceContext.locator, observations: item.observations, issues: item.issues });
    }
    return entries;
  }
  const settings = await scopedFile(parent.directory, join(parent.directory, "artifact-preview-settings.json"));
  if (digest(settings.bytes) !== source.artifactEvidence?.settingsSha256
    || JSON.stringify(JSON.parse(settings.bytes.toString("utf8"))) !== JSON.stringify(source.artifactEvidence.settings)) throw new Error("Saved artifact evidence settings changed after capture.");
  const entries = [];
  for (const item of review.items) {
    const evidence = source.artifactEvidence?.items?.find((candidate) => candidate.evidenceId === item.evidenceId);
    await validateEvidence(context.report, parent.id, parent.directory, source, evidence, item);
    entries.push({ ...evidence, evidenceSource: evidenceContext.locator, observations: item.observations, issues: item.issues });
  }
  return entries;
}
