/** Build unviewed review forms from verified registered evidence without producing a diagram. */
import { realpath } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { loadReviewSource, verifyReviewEntries } from "./review-preflight.mjs";
import { loadArtifactEvidenceSource } from "./artifact-review-source.mjs";
import { OBSERVATION_KEYS, REVIEW_KINDS } from "./review-contract.mjs";
import { publishDraftCopy } from "./atomic-draft.mjs";
import { ToolError } from "./runtime.mjs";

/** Write one complete new form inside the source task; empty observations never imply actual viewing. */
export async function createReviewTemplate(options, signal) {
  try {
    const kind = options.kind;
    if (!Object.hasOwn(REVIEW_KINDS, kind) || !options.template || !options.output || !options.from) throw new Error("Provide --kind visual|html|artifact, --template, --output and explicit --from.");
    const context = await loadReviewSource(options);
    if (options["evidence-from"] && kind !== "artifact") throw new Error("--evidence-from applies only to artifact templates.");
    if (kind === "artifact") context.artifactEvidenceSource = await loadArtifactEvidenceSource(context, options["evidence-from"] ?? context.parent.id);
    const target = await taskTarget(options);
    const { field, id } = REVIEW_KINDS[kind];
    const registered = kind === "visual" ? context.source.visual?.capturedFrames
      : kind === "html" ? context.source.htmlInspection?.states : context.artifactEvidenceSource.source.artifactEvidence?.items?.filter((item) => item.status === "captured");
    if (!registered?.length) throw new Error(`The selected source has no registered ${kind} evidence.`);
    const entries = registered.map((entry) => ({ [id]: entry[id], sha256: entry.sha256,
      observations: Object.fromEntries(OBSERVATION_KEYS.map((key) => [key, ""])), issues: [] }));
    const review = { reviewer: "", viewed: false, [field]: entries };
    await verifyReviewEntries(context, kind, review);
    signal?.throwIfAborted();
    await publishDraftCopy(target, JSON.stringify(review, null, 2) + "\n", signal);
    return { command: "review-template", status: "template-created", stage: "review-template", kind,
      sourceRevision: context.parent.id, source: { inputSha256: context.source.input.sha256, sdk: context.source.sdk, theme: context.source.theme },
      evidenceSource: context.artifactEvidenceSource?.locator, revision: null, viewed: false, diagnostics: [], artifacts: [{ kind: "review-template", path: target }] };
  } catch (cause) {
    if (cause.name === "AbortError") throw cause;
    throw new ToolError("review-template", "REVIEW_TEMPLATE_INVALID", cause.message,
      "Select captured evidence and a new file inside the same canonical task workspace; complete the form only after actual viewing.", options.template || "template", cause);
  }
}

/** Require one canonical task and existing canonical target parent before exclusive publication. */
async function taskTarget(options) {
  const history = resolve(options.output);
  const workspace = dirname(history);
  const taskParent = resolve(".diagrams", ".work", options.name);
  const target = resolve(options.template);
  const parent = await realpath(dirname(target));
  if (basename(history) !== "history" || dirname(workspace) !== taskParent || basename(taskParent) !== options.name
    || await realpath(history) !== history || await realpath(workspace) !== workspace || parent !== dirname(target) || !target.startsWith(workspace + sep)) {
    throw new Error("Template target must stay inside the same real .diagrams/.work/<name>/<task> workspace.");
  }
  return target;
}
