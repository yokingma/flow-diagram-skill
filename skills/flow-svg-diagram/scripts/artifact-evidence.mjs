/** Target-size evidence consumes registered SVG/PNG bytes, separately from sampled SDK frame previews. */
import { renderArtifactSurface } from "./artifact-capture.mjs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ToolError } from "./runtime.mjs";
import { findBrowser, importPlaywright } from "./browser.mjs";
import { digest, loadArtifactRevision, readArtifact, saveComplete } from "./artifact-identity.mjs";

const MAX_SIDE = 8192;
const MAX_PIXELS = 32_000_000;
const TIMEOUT_MS = 15_000;

/** Bind source file, exact display surface and captured bytes; revisions retain their original roles. */
export function evidenceIdentity(item) {
  return digest(JSON.stringify(["flowsvg-artifact-evidence-v1", item.artifactSourceRevision, item.evidenceRevision,
    item.artifactId, item.artifactSha256, item.sourceSha256, item.sdk, item.timeMs, item.theme, item.reducedMotion,
    item.background, item.camera, item.intrinsicWidth, item.intrinsicHeight, item.viewBox ?? null,
    item.displayWidth, item.displayHeight, item.backdrop, item.path, item.sha256, item.fonts]));
}

/** Validate every selection before browser work; never re-evaluate the diagram as the reviewed surface. */
export async function captureArtifactEvidence(report, context) {
  const path = context.options["artifact-preview-settings"];
  if (!path) return;
  report.stage = "artifact-preview";
  report.artifactEvidence = { status: "pending", items: [] };
  let browser;
  const abort = () => { browser?.close().catch((error) => { report.artifactEvidence.cleanupError = error.message; }); };
  try {
    const parent = report.provenance?.parent;
    if (!parent) throw new Error("Artifact previews require an explicit source parent.");
    const bytes = await readFile(path);
    const settings = JSON.parse(bytes.toString("utf8"));
    validateSettings(settings);
    await loadArtifactRevision(report, parent.id);
    const selected = [];
    for (const item of settings.items) selected.push(await prepareItem(report, parent.id, item));
    const savedPath = join(report.revision.directory, "artifact-preview-settings.json");
    await saveComplete(savedPath, bytes, context.signal);
    report.artifacts.push({ kind: "artifact-preview-settings", path: savedPath, sha256: digest(bytes) });
    Object.assign(report.artifactEvidence, { settings, settingsSha256: digest(bytes), items: selected.map(({ evidence }) => evidence) });
    const prepared = await findBrowser(context.options.browser);
    if (!prepared) {
      report.artifactEvidence.status = "not-run";
      throw new Error("No prepared browser; target-size artifact evidence and inspection were not performed.");
    }
    const { chromium } = await importPlaywright(context.runtime);
    context.signal?.throwIfAborted();
    context.signal?.addEventListener("abort", abort, { once: true });
    browser = await chromium.launch({ executablePath: prepared.executablePath, headless: true, timeout: TIMEOUT_MS });
    const browserContext = await browser.newContext({ offline: true, deviceScaleFactor: 1 });
    await mkdir(join(report.revision.directory, "artifact-evidence"));
    for (const item of selected) {
      // Each surface owns a page so browser resources and decoded images have a bounded lifetime.
      const page = await browserContext.newPage();
      page.setDefaultTimeout(TIMEOUT_MS);
      try { await captureItem(report, context, page, item); }
      finally { await page.close(); }
    }
    report.artifactEvidence.status = "awaiting-review";
  } catch (cause) {
    if (context.signal?.aborted) { report.artifactEvidence.status = "cancelled"; throw context.signal.reason; }
    if (report.artifactEvidence.status !== "not-run") report.artifactEvidence.status = "failed";
    report.artifactEvidence.reason = cause.message;
    throw new ToolError("artifact-preview", "ARTIFACT_PREVIEW_INVALID", cause.message,
      "Keep completed exports. Select registered source artifacts and a prepared browser; generate evidence in a new revision.", path, cause);
  } finally {
    context.signal?.removeEventListener("abort", abort);
    if (browser) await browser.close();
    updateArtifactCoverage(report, report.artifactEvidence.items);
  }
}

export function validateSettings(settings) {
  if (!settings || Object.keys(settings).some((key) => key !== "items") || !Array.isArray(settings.items) || !settings.items.length) throw new Error("Settings require a nonempty items array.");
  const seen = new Set();
  for (const item of settings.items) {
    if (!item || Object.keys(item).some((key) => !["artifactId", "displayWidth", "backdrop"].includes(key))
      || typeof item.artifactId !== "string" || !Number.isInteger(item.displayWidth) || item.displayWidth <= 0
      || item.displayWidth > MAX_SIDE || typeof item.backdrop !== "string" || !/^#[0-9a-f]{6}$/iu.test(item.backdrop)) throw new Error("Each item requires artifactId, positive integer displayWidth and opaque #RRGGBB backdrop.");
    const key = JSON.stringify([item.artifactId, item.displayWidth, item.backdrop.toLowerCase()]);
    if (seen.has(key)) throw new Error("Duplicate artifact display surface.");
    seen.add(key);
  }
}

async function prepareItem(report, revision, settings) {
  const { artifact, bytes } = await readArtifact(report, revision, settings.artifactId);
  const displayHeight = Math.max(1, Math.round(settings.displayWidth * artifact.intrinsicHeight / artifact.intrinsicWidth));
  if (!Number.isFinite(displayHeight) || displayHeight > MAX_SIDE || settings.displayWidth * displayHeight > MAX_PIXELS) throw new Error("Artifact evidence exceeds 8192 pixels per side or 32,000,000 pixels.");
  const { kind, name, path, relativePath, sha256, ...metadata } = artifact;
  return { kind, bytes, evidence: { ...metadata, artifactSha256: sha256, evidenceRevision: report.revision.id,
    displayWidth: settings.displayWidth, displayHeight, backdrop: settings.backdrop, status: "not-run" } };
}

/** Decode actual artifact bytes and encode the displayed pixels directly, avoiding unreliable compositor readback. */
async function captureItem(report, context, page, { kind, bytes, evidence }) {
  context.signal?.throwIfAborted();
  const rendered = await renderArtifactSurface(page, { kind, bytes, evidence }, context.signal);
  const path = join(report.revision.directory, "artifact-evidence", `evidence-${String(report.artifactEvidence.items.indexOf(evidence) + 1).padStart(2, "0")}.png`);
  const image = rendered.bytes;
  await saveComplete(path, image, context.signal);
  Object.assign(evidence, { path, sha256: digest(image), fonts: rendered.fonts, status: "captured" });
  evidence.evidenceId = evidenceIdentity(evidence);
  report.artifacts.push({ kind: "artifact-preview", path, sha256: evidence.sha256, evidenceId: evidence.evidenceId });
}

/** Coverage is a count of explicitly selected surfaces; new sizes and newly captured files remain unviewed. */
export function updateArtifactCoverage(report, items) {
  const groups = new Map();
  for (const item of items) {
    const key = JSON.stringify([item.artifactId, item.displayWidth, item.displayHeight, item.backdrop?.toLowerCase()]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const reviews = report.visual.artifactReviews ?? [];
  const surfaces = [...groups.values()].map((candidates) => {
    const viewed = candidates.find((item) => item.status === "captured" && typeof item.evidenceId === "string"
      && reviews.some((review) => review.evidenceId === item.evidenceId));
    const item = viewed ?? candidates.find((candidate) => candidate.status === "captured") ?? candidates[0];
    return { artifactId: item.artifactId, evidenceId: item.evidenceId ?? null, displayWidth: item.displayWidth,
      displayHeight: item.displayHeight, backdrop: item.backdrop, status: viewed ? "viewed" : "unviewed" };
  });
  const viewed = surfaces.filter((item) => item.status === "viewed").length;
  report.artifactEvidenceCoverage = { requested: surfaces.length, viewed, unviewed: surfaces.length - viewed, items: surfaces };
}
