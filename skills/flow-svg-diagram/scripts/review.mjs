/** Submit verified existing evidence as an independent append-only record without preparing or running renderers. */
import { readSavedRevisions } from "./saved-revisions.mjs";
import { dirname, join } from "node:path";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { preflightReviews } from "./review-preflight.mjs";
import { appendReviewRecord, buildReviewRecord, loadReviewRecords } from "./review-records.mjs";
import { loadEvidenceProjection } from "./evidence-projection.mjs";
import { aggregateReviews } from "./review-projection.mjs";
import { ToolError } from "./runtime.mjs";

/** All validation and aggregation complete before one complete record becomes visible; duplicate content reuses its ID. */
export async function submitReview(options, signal) {
  if (!options.from || !options.name || !["visual-review", "html-review", "artifact-review"].some((key) => options[key] !== undefined)) {
    throw new ToolError("arguments", "REVIEW_ARGUMENT_REQUIRED", "review requires --from, --name and at least one --visual-review or --html-review or --artifact-review.", "Run `flowsvg review --help`.");
  }
  if (options["evidence-from"] && !options["artifact-review"]) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--evidence-from requires --artifact-review.", "Run `flowsvg review --help`.", "evidence-from");
  const context = await preflightReviews(options);
  const records = await readSavedRevisions(dirname(context.parent.directory), context.parent.id);
  const existing = await loadReviewRecords(records);
  const record = await buildReviewRecord(context);
  const html = await scopedFile(context.parent.directory, join(context.parent.directory, "diagram.html"));
  const adopted = { ...existing, records: existing.records.some((item) => item.record.id === record.id)
    ? existing.records : [...existing.records, { record, context }] };
  const evidence = await loadEvidenceProjection(records);
  const projection = aggregateReviews(records, adopted, { htmlSha256: digest(html.bytes), evidence });
  signal?.throwIfAborted();
  const saved = await appendReviewRecord(context, record, signal);
  return { command: "review", status: "review-recorded", stage: "review", revision: null, sourceRevision: context.parent.id,
    record: saved, checks: projection.checks, completion: projection.completion, qualityCoverage: projection.qualityCoverage,
    reviewRecords: projection.reviewRecords, diagnostics: projection.diagnostics, htmlInspection: projection.htmlInspection,
    visual: projection.visual, artifacts: [{ kind: "review-record", path: saved.path }] };
}
