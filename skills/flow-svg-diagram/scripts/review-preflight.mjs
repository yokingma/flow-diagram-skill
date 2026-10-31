/** Read-only review preparation shared by authoring, templates and independent review records. */
import { readFile, realpath } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { ToolError } from "./runtime.mjs";
import { digest, scopedFile } from "./artifact-identity.mjs";
import { validateReviewInput, REVIEW_KINDS } from "./review-contract.mjs";
import { validateFrame } from "./visual-review.mjs";
import { validateState } from "./html-inspection.mjs";
import { loadArtifactEvidenceSource, verifyArtifactReviewEntries } from "./artifact-review-source.mjs";

/** Resolve one explicit saved source without preparing the SDK or allocating a revision. */
export async function loadReviewSource(options) {
  const id = options.from || options.parent;
  if (!/^v\d{3,}$/u.test(id ?? "") || !options.name || basename(options.name) !== options.name || [".", ".."].includes(options.name)
    || (options.from && options.parent && options.from !== options.parent) || (options.from && options.input)) {
    throw new Error("Review requires an explicit --from (or --parent), one diagram name, and unambiguous input selection.");
  }
  const root = resolve(options.output || resolve(".diagrams", ".history"), options.name);
  const canonicalHistory = await realpath(dirname(root));
  const canonicalRoot = await realpath(root);
  if (dirname(canonicalRoot) !== canonicalHistory) throw new Error("Review diagram directory escapes the selected history root.");
  const directory = await realpath(join(root, id));
  if (dirname(directory) !== canonicalRoot) throw new Error("Review source escapes the selected diagram history.");
  const source = JSON.parse((await scopedFile(directory, join(directory, "report.json"))).bytes.toString("utf8"));
  const input = await scopedFile(directory, join(directory, "diagram.json"));
  const manifest = JSON.parse(await readFile(new URL("../runtime/manifest.json", import.meta.url), "utf8"));
  if (source.revision?.id !== id || source.input?.sha256 !== digest(input.bytes)
    || source.sdk?.version !== manifest.sdk.version || source.sdk?.integrity !== manifest.sdk.integrity) throw new Error("Saved source bytes, revision or locked SDK identity changed.");
  if (source.htmlInspection?.file?.sha256) {
    const html = await scopedFile(directory, join(directory, "diagram.html"));
    if (digest(html.bytes) !== source.htmlInspection.file.sha256) throw new Error("Saved source HTML bytes changed after authoring.");
  }
  if (options.input && digest(await readFile(options.input)) !== source.input.sha256) throw new Error("Review input differs from its saved source.");
  if (options.theme !== undefined && options.theme !== source.theme) throw new Error("Review theme differs from its saved source.");
  const parent = { id, directory };
  const report = { ...source, revision: { ...source.revision, directory }, provenance: { ...source.provenance, parent } };
  return { parent, source, report };
}

/** Check every submitted review before authoring can reserve a version or run expensive stages.
 * Returns source context and verified materials keyed by visual/html/artifact; this function writes nothing.
 */
export async function preflightReviews(options, { authoring = false } = {}) {
  const kinds = Object.keys(REVIEW_KINDS).filter((kind) => options[`${kind}-review`] !== undefined);
  if (!kinds.length) return null;
  const materials = {};
  let context;
  for (const kind of kinds) {
    const path = options[`${kind}-review`];
    try {
      const bytes = await readFile(path);
      const review = JSON.parse(bytes.toString("utf8"));
      validateReviewInput(review, kind);
      context ??= await loadReviewSource(options);
      if (kind === "artifact") context.artifactEvidenceSource = await loadArtifactEvidenceSource(context, options["evidence-from"] ?? context.parent.id);
      if (authoring) {
        const input = options.input ? await readFile(options.input) : (await scopedFile(context.parent.directory, join(context.parent.directory, "diagram.json"))).bytes;
        const theme = options.theme ?? JSON.parse(input.toString("utf8")).theme ?? "light";
        if (theme !== context.source.theme) throw new Error("Author effective theme differs from the reviewed source; supply its original --theme explicitly.");
      }
      const entries = await verifyReviewEntries(context, kind, review);
      materials[kind] = { review, bytes, entries, path };
    } catch (cause) { throw reviewError(kind, cause, path); }
  }
  return { ...context, materials };
}

/** Verify exact registered source bytes for each listed frame/state/surface; observations stay caller supplied. */
export async function verifyReviewEntries(context, kind, review) {
  const { parent, source, report } = context;
  if (kind === "visual") return Promise.all(review.frames.map((entry) => validateFrame(parent, source, entry)));
  if (kind === "html") {
    const inspection = source.htmlInspection;
    if (!inspection || !["captured", "awaiting-review", "review-recorded", "reviewed"].includes(source.checks?.html)
      || inspection.inputSha256 !== source.input.sha256 || inspection.theme !== source.theme
      || inspection.sdk?.version !== source.sdk.version || inspection.sdk?.integrity !== source.sdk.integrity) throw new Error("Source has no matching captured HTML inspection.");
    const html = await scopedFile(parent.directory, join(parent.directory, "diagram.html"));
    if (digest(html.bytes) !== inspection.file?.sha256) throw new Error("The reviewed diagram.html bytes changed after inspection.");
    return Promise.all(review.states.map((entry) => validateState(parent, inspection, entry)));
  }
  return verifyArtifactReviewEntries(context, review);
}

/** Adapt read-only review failures to the existing kind-specific CLI diagnostic. */
export function reviewError(kind, cause, path) {
  return new ToolError(`${kind}-review`, `${kind.toUpperCase()}_REVIEW_INVALID`, cause.message,
    "Use review-template for the explicit source; actually view its evidence, then complete every required field.", path, cause);
}
