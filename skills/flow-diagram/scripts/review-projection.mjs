/** Project verified append-only review facts into a report in memory; historical files stay unchanged. */
import { requestFormalReview } from "./formal-review.mjs";
import { updateArtifactCoverage } from "./artifact-evidence.mjs";
import { stateMatchesPoint } from "./review-contract.mjs";
import { updateQualityCoverage } from "./quality-coverage.mjs";
import { canonicalJson } from "./review-records.mjs";

/** Adopt exact source-context reviews; coverage de-duplicates evidence while preserving every observed issue. */
export function aggregateReviews(records, { records: independent, savedInvalid }, { htmlSha256, evidence = { items: [], records: [], invalid: [] } } = {}) {
  const report = structuredClone(records[0].report);
  if (independent.length || evidence.records.length || evidence.requests?.length || records.some(({ report: source }) => source.formalReview?.status !== "not-requested" && source.formalReview)) requestFormalReview(report);
  if (evidence.requests?.length) report.formalReview.requests = evidence.requests;
  report.completion.requested = [...new Set(records.flatMap(({ report: item }) => item.completion?.requested ?? []))];
  report.inheritedArtifacts = records.flatMap(({ report: item }) => [...(item.artifacts ?? []), ...(item.inheritedArtifacts ?? [])]);
  report.inheritedExports = records.flatMap(({ report: item }) => [...(item.exports ?? []), ...(item.inheritedExports ?? [])]);
  report.artifactEvidence.items = unionValues([...records.flatMap(({ report: item }) => item.artifactEvidence?.items ?? []), ...evidence.items]);
  report.evidenceRecords = { records: evidence.records, invalid: evidence.invalid };
  report.visual.artifactReviews = unionValues(records.flatMap(({ report: item }) => item.visual?.artifactReviews ?? []))
    .filter((review) => !savedInvalid.some((invalid) => invalid.evidenceId === review.evidenceId));
  report.reviewRecords = { invalidSaved: savedInvalid, considered: independent.map(({ record }) => record.id), adopted: [],
    policy: "Union of verified applicable observations; a later clean review does not erase an earlier issue.",
    records: independent.map(({ record, invalid }) => ({ invalid, materials: invalid ? record.materials : undefined, id: record.id, subject: record.subject, source: record.source,
      recordedAt: record.recordedAt, reviewers: Object.fromEntries(Object.entries(record.materials).map(([kind, material]) => [kind, material.review.reviewer])) })) };
  for (const { record, context, invalid } of [...independent].sort((left, right) => left.record.id.localeCompare(right.record.id))) {
    for (const item of invalid ?? []) appendIssues(report, [{ ...item.entry, id: item.id }], item.kind, record.subject.sourceRevision);
    let adopted = false;
    for (const kind of ["visual", "html", "artifact"]) {
      const material = context.materials[kind];
      if (kind === "artifact" && material) adoptArtifactRequirements(report, context);
      if (!material?.entries.length) continue;
      if (kind === "html" && context.source.htmlInspection.file.sha256 !== (htmlSha256 ?? report.htmlInspection?.file?.sha256)) continue;
      if (kind === "html" && report.htmlInspection?.display
        && canonicalJson(context.source.htmlInspection.display) !== canonicalJson(report.htmlInspection.display)) continue;
      if (kind === "html") applyHtml(report, context, material, record.id);
      else if (kind === "artifact") applyArtifact(report, context, material, record.id);
      else applyVisual(report, context, material, record.id);
      adopted = true;
    }
    if (adopted) report.reviewRecords.adopted.push(record.id);
  }
  reconcileArtifactCaptures(report, evidence, independent, savedInvalid);
  report.evidenceRecords.records = report.evidenceRecords.records.map((record) => ({ ...record,
    items: record.items.map((item) => ({ ...item, viewed: typeof item.evidenceId === "string"
      && report.visual.artifactReviews.some((review) => review.evidenceId === item.evidenceId) })) }));
  updateArtifactCoverage(report, report.artifactEvidence.items);
  updateQualityCoverage(report);
  return report;
}

function applyVisual(report, context, material, recordId) {
  const additions = material.entries.map((entry) => ({ ...entry, reviewer: material.review.reviewer, reviewRecord: recordId }));
  report.visual.viewedFrames = unionEntries([...(report.visual.viewedFrames ?? []), ...additions]);
  report.visual.status = "review-recorded";
  report.checks.visual = "reviewed";
  appendIssues(report, additions, "visual", context.parent.id);
}

function applyHtml(report, context, material, recordId) {
  const current = report.htmlInspection;
  const inspection = context.source.htmlInspection;
  const plan = current?.plan ?? inspection.plan;
  const prior = current?.file?.sha256 === inspection.file.sha256 ? current.viewedStates ?? [] : [];
  const additions = material.entries.map((entry) => ({ ...entry, reviewer: material.review.reviewer, reviewRecord: recordId }));
  const viewedStates = unionEntries([...prior, ...additions]);
  const coveredStates = plan.points.filter((point) => viewedStates.some((state) => stateMatchesPoint(state, point))).length;
  report.htmlInspection = { ...inspection, ...current, plan, status: "review-recorded", viewedStates,
    initial: inspection.initial, playback: inspection.playback,
    states: current?.states?.length ? current.states : inspection.states,
    coverage: { requested: plan.points.length, viewed: coveredStates,
      unviewed: Math.max(0, plan.points.length - coveredStates) },
    review: { scope: "Only identified screenshots of the exact delivered HTML were attested as viewed; continuous visual playback and user aesthetic judgment remain separate." } };
  report.checks.html = "reviewed";
  appendIssues(report, additions, "html", context.parent.id);
}

/** Repeated observations of one exact state count once; all distinct issues and attestations remain visible. */
function unionEntries(entries) {
  const unique = new Map();
  for (const entry of entries) {
    const key = canonicalJson([entry.pointId ?? entry.id, entry.timeMs, entry.view]);
    const previous = unique.get(key);
    const observations = [...(previous?.attestations ?? []), { reviewer: entry.reviewer, reviewRecord: entry.reviewRecord, sourceRevision: entry.sourceRevision, sha256: entry.sha256, observations: entry.observations }];
    unique.set(key, { ...entry, issues: unionValues([...(previous?.issues ?? []), ...(entry.issues ?? [])]), attestations: unionValues(observations) });
  }
  return [...unique.values()];
}
function appendIssues(report, entries, kind, revision) {
  const additions = entries.flatMap((entry) => entry.issues.map((issue) => ({ severity: "warning", stage: `${kind}-review`,
    code: `${kind.toUpperCase()}_REVIEW_ISSUE`, location: `${revision}/${entry.id}`, timeMs: entry.timeMs,
    reason: issue.reason, nextStep: issue.nextStep })));
  report.diagnostics = unionValues([...report.diagnostics, ...additions]);
}
function unionValues(values) {
  return [...new Map(values.map((item) => [canonicalJson(item), item])).values()];
}

/** Source requirements do not prove usable images; only byte-verified captures retain active evidence IDs. */
function reconcileArtifactCaptures(report, evidence, independent, savedInvalid) {
  const verified = new Set([...report.visual.artifactReviews, ...evidence.items.filter((item) => item.status === "captured")]
    .map((item) => item.evidenceId));
  const failed = [...evidence.invalid, ...savedInvalid, ...independent.flatMap(({ invalid }) => (invalid ?? [])
    .filter((item) => item.kind === "artifact").map((item) => ({ evidenceId: item.id, reason: item.reason })))];
  const invalidById = new Map(failed.map((item) => [item.evidenceId, item.reason]));
  report.artifactEvidence.items = unionValues(report.artifactEvidence.items.map((item) => {
    if (item.status !== "captured" || verified.has(item.evidenceId)) return item;
    const { evidenceId, ...registration } = item;
    const reason = invalidById.get(evidenceId);
    return { ...registration, registeredEvidenceId: evidenceId, status: "not-run",
      operationStatus: reason ? "invalid" : "not-verified",
      reason: reason ?? "Registered capture has not been byte-verified for this report; use evidence to verify or recapture it." };
  }));
}

/** Required source surfaces survive even when every submitted observation of that material is invalid. */
function adoptArtifactRequirements(report, context) {
  const source = context.artifactEvidenceSource.source.artifactEvidence;
  report.artifactEvidence.items = unionValues([...report.artifactEvidence.items, ...source.items]);
}

/** Preserve every requested formal surface and each attestation; later clean observations retain prior issues. */
function applyArtifact(report, context, material, recordId) {
  const items = report.artifactEvidence.items;
  const additions = material.entries.map((entry) => ({ ...entry, reviewer: material.review.reviewer, reviewRecord: recordId }));
  const byEvidence = new Map();
  for (const entry of [...(report.visual.artifactReviews ?? []), ...additions]) {
    const previous = byEvidence.get(entry.evidenceId);
    const attestations = [...(previous?.attestations ?? []), { reviewer: entry.reviewer, reviewRecord: entry.reviewRecord,
      evidenceId: entry.evidenceId, sha256: entry.sha256, observations: entry.observations }];
    byEvidence.set(entry.evidenceId, { ...entry, issues: unionValues([...(previous?.issues ?? []), ...(entry.issues ?? [])]), attestations: unionValues(attestations) });
  }
  report.visual.artifactReviews = [...byEvidence.values()];
  report.checks.artifactVisual = "reviewed";
  updateArtifactCoverage(report, items);
  appendIssues(report, additions.map((entry) => ({ ...entry, id: entry.evidenceId })), "artifact", context.parent.id);
}
