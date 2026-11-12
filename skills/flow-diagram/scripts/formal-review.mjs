/** Separate explicit registered review intent from ordinary capture and viewer design judgment. */

/** An existing explicit request survives subsequent reporting; captures alone do not request review. */
export function hasFormalReviewRequest(report) {
  return Boolean(report.formalReview && report.formalReview.status !== "not-requested");
}

/** Mark a source-bound formal review request without claiming coverage or visual approval. */
export function requestFormalReview(report) {
  if (!hasFormalReviewRequest(report)) report.formalReview = { status: "incomplete" };
}

/** Apply command intent before saving; actual viewing submissions also explicitly request formal review. */
export function configureFormalReview(report, options) {
  report.formalReview ??= { status: "not-requested" };
  if (options["formal-review"] || ["visual-review", "html-review", "artifact-review", "artifact-preview-settings"].some((key) => options[key] !== undefined)) requestFormalReview(report);
  else { delete report.completion.quality; delete report.qualityCoverage; }
}
