import { readCommandReport } from "./helpers/cli-report";
/** Required quality coverage follows the final files and their actual display conditions. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 480, height: 280 }, nodes: [
  { id: "source", kind: "roundedRect", x: 20, y: 80, width: 140, height: 80, label: "来源" },
  { id: "target", kind: "roundedRect", x: 320, y: 80, width: 140, height: 80, label: "目标" }
], edges: [{ id: "request", from: "source", to: "target", fromPort: "right", toPort: "left" }], scenes: [] };

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG required quality ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  // This suite explicitly exercises registered review coverage and immutable source identity.
  if (args[0] === "author") args = [...args, "--formal-review", "--checkpoint"];
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

 test("quality coverage names the actual HTML file when HTML is the only visual delivery", async () => {
  const input = join(root, "html.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "html", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.completion).toMatchObject({ delivery: "complete", quality: "incomplete" });
  expect(report.qualityCoverage).toMatchObject({ status: "incomplete", required: expect.arrayContaining([
    expect.objectContaining({ kind: "html", status: "incomplete", fileSha256: expect.stringMatching(/^[a-f0-9]{64}$/u) })
  ]) });
  expect(report.qualityCoverage.required.some((item: { kind: string }) => item.kind === "artifact")).toBe(false);
  expect(await readFile(join(report.revision.directory, "report.md"), "utf8")).toContain("Required quality coverage");
 });

test("quality coverage keeps each requested static artifact and its default native surface distinct", async () => {
  const input = join(root, "images.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "images", "--svg", "--png", "--browser", "none"]);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  const required = report.qualityCoverage.required;
  expect(required.filter((item: { kind: string }) => item.kind === "artifact")).toEqual(expect.arrayContaining([
    expect.objectContaining({ format: "svg", displayWidth: 480, displayHeight: 280, backdrop: "#ffffff", status: "incomplete" }),
    expect.objectContaining({ format: "png", status: "incomplete", reason: expect.stringContaining("not produced") })
  ]));
  expect(new Set(required.filter((item: { kind: string }) => item.kind === "artifact").map((item: { artifactId: string }) => item.artifactId)).size).toBe(2);
  expect(report.completion.delivery).toBe("incomplete");
});

test("a missing requested export cannot be represented as a passed quality result or replace a prior final", async () => {
  const input = join(root, "missing.json");
  await writeFile(input, JSON.stringify(document));
  const first = (await readCommandReport((await command(["author", "--input", input, "--name", "missing", "--browser", "none"])).stdout));
  expect(first.completion.delivery).toBe("complete");
  const failed = (await readCommandReport((await command(["author", "--input", input, "--name", "missing", "--png", "--browser", "none"])).stdout));
  expect(failed.completion.delivery).toBe("incomplete");
  expect(failed.qualityCoverage.status).not.toBe("passed");
  expect(failed.qualityCoverage.required).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: "artifact", format: "png", status: "incomplete" })
  ]));
  expect(failed.completion.completed).not.toContain("png");
});

test("review-only revisions keep prior requested static artifacts in the required coverage set", async () => {
  const input = join(root, "review-carry.json");
  await writeFile(input, JSON.stringify(document));
  const first = (await readCommandReport((await command(["author", "--input", input, "--name", "review-carry", "--svg", "--browser", "none"])).stdout));
  const reviewed = (await readCommandReport((await command(["author", "--from", first.revision.id, "--name", "review-carry", "--browser", "none"])).stdout));
  expect(reviewed.completion.requested).toContain("svg");
  expect(reviewed.completion.completed).toContain("svg");
  expect(reviewed.qualityCoverage.required).toContainEqual(expect.objectContaining({ kind: "artifact", format: "svg", status: "incomplete" }));
});

test("missing artifact evidence explains the native surface and the explicit capture step in both reports", async () => {
  const input = join(root, "native-surface.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "native-surface", "--svg", "--theme", "dark", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.completion).toMatchObject({ delivery: "complete", quality: "incomplete" });
  const artifact = report.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const surface = report.qualityCoverage.required.find((item: { kind: string }) => item.kind === "artifact");
  expect(surface).toMatchObject({ artifactId: artifact.artifactId, displayWidth: 480, displayHeight: 280, backdrop: "#111827", evidenceId: null, status: "incomplete" });
  for (const detail of [artifact.artifactId, "480 x 280", "#111827", "--artifact-preview-settings", "displayWidth", "backdrop"]) {
    expect(surface.reason).toContain(detail);
  }
  const markdown = await readFile(join(report.revision.directory, "report.md"), "utf8");
  const saved = JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"));
  expect(saved.qualityCoverage.required).toContainEqual(surface);
  expect(markdown).toContain("delivery: complete");
  expect(markdown).toContain("formal review coverage: incomplete");
  expect(markdown).toContain(surface.reason);
});

const browser = process.env.FLOWSVG_TEST_BROWSER;
const REVIEW_OBSERVATIONS = { readingOrder: "Synthetic contract fixture.", density: "Synthetic contract fixture.", occlusion: "Synthetic contract fixture.", narrative: "Synthetic contract fixture." };

async function saveScreenshotReview(path: string, kind: "frames" | "states", images: ReadonlyArray<{ id: string; sha256: string }>) {
  await writeFile(path, JSON.stringify({ reviewer: "synthetic test attestation", viewed: true,
    [kind]: images.map(({ id, sha256 }) => ({ id, sha256, observations: REVIEW_OBSERVATIONS, issues: [] })) }));
}

test.skipIf(!browser)("HTML and ordinary previews leave static coverage incomplete until explicit artifact evidence is reviewed", async () => {
  const input = join(root, "preview-gap.json");
  const name = "preview-gap";
  await writeFile(input, JSON.stringify(document));
  const sourceResult = await command(["author", "--input", input, "--name", name, "--preview", "--svg", "--browser", browser!]);
  expect(sourceResult.code, sourceResult.stdout + sourceResult.stderr).toBe(0);
  const source = (await readCommandReport(sourceResult.stdout));
  const artifact = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const surface = source.qualityCoverage.required.find((item: { kind: string }) => item.kind === "artifact");
  expect(source.visual.capturedFrames.length).toBeGreaterThan(0);
  expect(surface).toMatchObject({ artifactId: artifact.artifactId, displayWidth: 480, displayHeight: 280, evidenceId: null, status: "incomplete" });
  expect(surface.reason).toContain("Ordinary preview 1440 x 1000");
  expect(surface.reason).toContain("does not cover");

  const previewReview = join(root, "preview-only-review.json");
  const htmlReview = join(root, "html-only-review.json");
  await saveScreenshotReview(previewReview, "frames", source.visual.capturedFrames);
  await saveScreenshotReview(htmlReview, "states", source.htmlInspection.states);
  const reviewedResult = await command(["author", "--from", source.revision.id, "--name", name, "--visual-review", previewReview, "--html-review", htmlReview, "--browser", "none"]);
  expect(reviewedResult.code, reviewedResult.stdout + reviewedResult.stderr).toBe(0);
  const reviewed = (await readCommandReport(reviewedResult.stdout));
  expect(reviewed).toMatchObject({ checks: { html: "reviewed", visual: "reviewed" }, completion: { delivery: "complete", quality: "incomplete" } });
  expect(reviewed.qualityCoverage.required).toContainEqual(expect.objectContaining({ kind: "html", status: "passed" }));
  expect(reviewed.qualityCoverage.required).toContainEqual(expect.objectContaining({ kind: "artifact", evidenceId: null, status: "incomplete", reason: expect.stringContaining("does not cover") }));
  const markdown = await readFile(join(reviewed.revision.directory, "report.md"), "utf8");
  expect(markdown).toContain("delivery: complete");
  expect(markdown).toContain("formal review coverage: incomplete");
  expect(markdown).toContain(artifact.artifactId);

  const settings = join(root, "explicit-display.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 240, backdrop: "#111827" }] }));
  const capturedResult = await command(["author", "--from", source.revision.id, "--name", name, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(capturedResult.code, capturedResult.stdout + capturedResult.stderr).toBe(0);
  const captured = (await readCommandReport(capturedResult.stdout));
  const evidence = captured.artifactEvidence.items[0];
  expect(captured.qualityCoverage.required).toContainEqual(expect.objectContaining({ artifactId: artifact.artifactId, displayWidth: 240, displayHeight: 140, backdrop: "#111827", status: "incomplete", evidenceId: evidence.evidenceId }));
  const artifactReview = join(root, "artifact-review.json");
  await writeFile(artifactReview, JSON.stringify({ reviewer: "synthetic test attestation", viewed: true,
    items: [{ evidenceId: evidence.evidenceId, sha256: evidence.sha256, observations: REVIEW_OBSERVATIONS, issues: [] }] }));
  await saveScreenshotReview(htmlReview, "states", captured.htmlInspection.states);
  const completeResult = await command(["author", "--from", captured.revision.id, "--name", name, "--artifact-review", artifactReview, "--html-review", htmlReview, "--browser", "none"]);
  expect(completeResult.code, completeResult.stdout + completeResult.stderr).toBe(0);
  const complete = (await readCommandReport(completeResult.stdout));
  expect(complete.completion, JSON.stringify(complete.qualityCoverage)).toMatchObject({ delivery: "complete", quality: "passed" });
  expect(complete.qualityCoverage.incomplete).toEqual([]);
  expect(complete.qualityCoverage.required).toContainEqual(expect.objectContaining({ artifactId: artifact.artifactId, displayWidth: 240, displayHeight: 140, backdrop: "#111827", status: "passed", evidenceId: evidence.evidenceId }));

  const fresh = (await readCommandReport((await command(["author", "--from", captured.revision.id, "--name", name, "--browser", "none"])).stdout));
  expect(fresh.artifactEvidence.items).toHaveLength(1);
  expect(fresh.artifactEvidence.items[0]).toMatchObject({ evidenceId: evidence.evidenceId, evidenceRevision: captured.revision.id });
  await expect(readFile(join(fresh.revision.directory, "artifact-preview-settings.json"))).rejects.toMatchObject({ code: "ENOENT" });
}, 90_000);
