/** On-demand evidence plans complete required surfaces, reuses valid captures and captures only missing actual files. */
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { loadReviewSource } from "./review-preflight.mjs";
import { readSavedRevisions } from "./saved-revisions.mjs";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { prepareRuntime } from "./runtime.mjs";
import { findBrowser } from "./browser.mjs";
import { CAPTURE_CONTEXT, captureArtifactSurfaces } from "./artifact-capture.mjs";
import { planEvidence } from "./evidence-plan.mjs";
import { canonicalJson } from "./review-records.mjs";
import { evidenceDirectory, independentEvidenceIdentity, saveEvidenceRecord, surfaceKey } from "./evidence-records.mjs";

/** Explicit source selection never creates a design version; all-reused requests avoid runtime and filesystem writes. */
export async function collectEvidence(options, signal) {
  const result = { command: "evidence", status: "pending", stage: "evidence", revision: null, diagnostics: [], artifacts: [] };
  let record;
  let directory;
  try {
    if (!options.from || !options.name) throw new Error("evidence requires --from and --name.");
    const subject = await loadReviewSource(options);
    result.sourceRevision = subject.parent.id;
    const records = await readSavedRevisions(dirname(subject.parent.directory), subject.parent.id);
    const plan = await planEvidence(subject, records, options["artifact-preview-settings"]);
    signal?.throwIfAborted();
    if (plan.requested.every((item) => plan.reuse.has(surfaceKey(item)))) return reusedResult(result, plan);
    const prepared = await prepareRecord(subject, plan);
    record = prepared.record;
    directory = prepared.directory;
    const browser = await findBrowser(options.browser);
    const pending = plan.requested.filter((item) => !plan.reuse.has(surfaceKey(item)));
    if (!browser) {
      record.status = "not-run";
      result.status = "failed";
      result.diagnostics.push(diagnostic("EVIDENCE_BROWSER_UNAVAILABLE", "No prepared browser; missing surfaces remain not-run."));
    } else {
      const runtime = await prepareRuntime(signal);
      await captureMissing(record, directory, subject, plan, pending, runtime, browser, signal);
      record.status = "awaiting-review";
      result.status = "evidence-recorded";
    }
  } catch (cause) {
    result.status = signal?.aborted || cause.name === "AbortError" ? "cancelled" : "failed";
    result.diagnostics.push(diagnostic(cause.code ?? "EVIDENCE_FAILED", cause.message));
    if (cause.cleanupError) result.diagnostics.push(diagnostic("EVIDENCE_BROWSER_CLEANUP", cause.cleanupError));
    if (record) {
      record.status = result.status;
      record.reason = cause.message;
      record.items = record.items.map((item) => item.status === "not-run" ? { ...item, operationStatus: result.status, reason: cause.message } : item);
    }
  }
  if (record) {
    record.diagnostics = result.diagnostics;
    const saved = await saveEvidenceRecord(directory, record);
    result.record = { id: saved.id, path: join(directory, "record.json"), reused: false };
    result.artifactEvidence = { status: saved.status, items: saved.items, requested: saved.requested };
    result.artifacts = [{ kind: "evidence-record", path: result.record.path }, ...saved.items.filter((item) => item.operationStatus === "captured")
      .map((item) => ({ kind: "artifact-preview", path: item.path, evidenceId: item.evidenceId, sha256: item.sha256 }))];
  }
  return result;
}

async function prepareRecord(subject, plan) {
  const id = `evidence-${randomUUID()}`;
  const root = await evidenceDirectory(dirname(subject.parent.directory), true);
  const directory = join(root, id);
  await mkdir(directory);
  const reportFile = await scopedFile(subject.parent.directory, join(subject.parent.directory, "report.json"));
  const record = { schemaVersion: 1, kind: "evidence", id, recordedAt: new Date().toISOString(), status: "pending",
    subject: { sourceRevision: subject.parent.id, inputSha256: subject.source.input.sha256, sdk: { version: subject.source.sdk.version,
      integrity: subject.source.sdk.integrity }, theme: subject.source.theme, reducedMotion: false },
    source: { revision: subject.parent.id, reportSha256: digest(reportFile.bytes) }, captureContext: CAPTURE_CONTEXT,
    requested: plan.requested, items: plan.requested.map((surface) => {
      const reused = plan.reuse.get(surfaceKey(surface));
      if (reused) return { ...reused.item, operationStatus: "reused", reuseSource: reused.locator };
      return { ...surface, status: "not-run", operationStatus: "not-run" };
    }), invalidPriorEvidence: plan.invalid };
  return { directory, record };
}

async function captureMissing(record, directory, subject, plan, pending, runtime, browser, signal) {
  const items = pending.map((surface) => {
    const original = plan.artifacts.find(({ artifact }) => artifact.artifactId === surface.artifactId);
    const { kind, name, path, relativePath, sha256, ...metadata } = original.artifact;
    return { kind, bytes: original.bytes, evidence: { ...metadata, ...surface, artifactSha256: sha256,
      evidenceSource: { kind: "evidence-record", id: record.id, sourceRevision: subject.parent.id }, captureContext: CAPTURE_CONTEXT,
      status: "captured", operationStatus: "captured" } };
  });
  await captureArtifactSurfaces({ directory, items, runtime, executablePath: browser.executablePath, signal,
    onCaptured: async (selected, captured) => {
      const evidence = { ...selected.evidence, ...captured };
      evidence.evidenceId = independentEvidenceIdentity(evidence);
      record.items = record.items.map((item) => surfaceKey(item) === surfaceKey(evidence) ? evidence : item);
    } });
}

function reusedResult(result, plan) {
  const operation = [...plan.operations].reverse().find(({ record }) => canonicalJson(record.requested) === canonicalJson(plan.requested)
    && record.items.every((item) => item.evidenceId && item.evidenceId === plan.reuse.get(surfaceKey(item))?.item.evidenceId));
  const items = plan.requested.map((surface) => ({ ...plan.reuse.get(surfaceKey(surface)).item, operationStatus: "reused" }));
  return { ...result, status: "evidence-reused", record: operation ? { id: operation.record.id, path: join(operation.directory, "record.json"), reused: true } : null,
    artifactEvidence: { status: "awaiting-review", items, requested: plan.requested }, evidenceSources: [...new Map([...plan.reuse.values()].map(({ locator }) => [canonicalJson(locator), locator])).values()] };
}
function diagnostic(code, reason) {
  return { severity: "error", stage: "evidence", code, location: "$", reason,
    nextStep: "Keep actual source artifacts; select a prepared browser to capture missing surfaces, then actually view and independently review each new image." };
}
