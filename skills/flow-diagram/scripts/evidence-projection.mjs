/** Load every applicable evidence request before quality calculation, including not-run and unviewed conditions. */
import { loadEvidenceRecords, surfaceKey, verifyIndependentEvidence } from "./evidence-records.mjs";

/** Verify new captures and retain missing images as explicit gaps; source/record metadata errors remain fatal. */
export async function loadEvidenceProjection(records) {
  const operations = await loadEvidenceRecords(records);
  const subject = { parent: { id: records[0].report.revision.id, directory: records[0].directory }, source: records[0].report, report: records[0].report };
  const items = [];
  const invalid = [];
  for (const operation of operations) for (const requested of operation.record.requested) {
    const item = operation.record.items.find((entry) => surfaceKey(entry) === surfaceKey(requested));
    if (item?.status !== "captured") {
      items.push({ ...requested, status: "not-run", operationStatus: item?.operationStatus ?? "not-run", reason: item?.reason ?? operation.record.reason });
      continue;
    }
    try {
      await verifyIndependentEvidence(subject, operation, item);
      items.push({ ...item, evidenceSource: operation.locator });
    } catch (cause) {
      if (cause.code !== "EVIDENCE_IMAGE_INVALID") throw cause;
      invalid.push({ evidenceId: item.evidenceId, recordId: operation.record.id, reason: cause.message });
      items.push({ ...requested, status: "not-run", operationStatus: "invalid", reason: cause.message });
    }
  }
  return { items, records: operations.map(({ record, locator }) => ({ id: record.id, source: locator, subject: record.subject,
    status: record.status, requested: record.requested, invalidPriorEvidence: record.invalidPriorEvidence,
    items: record.items.map(({ path, ...item }) => item) })), invalid };
}
