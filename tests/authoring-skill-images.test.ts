import { readCommandReport } from "./helpers/cli-report";
/** Installed CLI contract: requested files and actual-file evidence never imply visual approval. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { chromium, type Page } from "playwright-core";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const document = { version: 1, viewport: { width: 960, height: 600 }, typography: { nodeLabel: 20, edgeLabel: 18, flowLabel: 16 },
  nodes: [{ id: "a", kind: "rect", x: 80, y: 80, width: 180, height: 100, label: "请求" }], edges: [],
  scenes: [{ id: "s", label: "处理", beats: [{ durationMs: 1000, actions: [{ type: "updateNode", target: "a", value: { label: "完成" } }] }] }] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG image 独立 ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], { cwd: root,
      env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

async function compareEvidencePixels(page: Page, original: string, screenshot: string, width: number, height: number, backdrop: string) {
  return page.evaluate(async ({ original, screenshot, width, height, backdrop }) => {
    async function pixels(bytes: string, composite = false) {
      const image = new Image();
      image.src = `data:image/png;base64,${bytes}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas2D unavailable for artifact pixel comparison.");
      if (composite) {
        context.fillStyle = backdrop;
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
      } else {
        if (image.width !== width || image.height !== height) throw new Error("Evidence dimensions differ from the requested surface.");
        context.drawImage(image, 0, 0);
      }
      return context.getImageData(0, 0, width, height).data;
    }
    const expected = await pixels(original, true);
    const actual = await pixels(screenshot);
    let difference = 0;
    for (let index = 0; index < expected.length; index += 4) for (let channel = 0; channel < 3; channel += 1)
      difference += Math.abs(expected[index + channel] - actual[index + channel]);
    return difference / (width * height * 3);
  }, { original, screenshot, width, height, backdrop });
}

test("copied CLI preserves source/default outputs, identifies transparent SVG and retains it when PNG has no browser", async () => {
  const input = join(root, "source.json");
  const bytes = JSON.stringify(document, null, 4) + "\n";
  await writeFile(input, bytes);
  const plain = (await readCommandReport((await command(["author", "--input", input, "--name", "plain", "--browser", "none"])).stdout));
  expect(plain.completion.completed).toEqual(["json", "html"]);
  const result = await command(["author", "--input", input, "--name", "no-browser", "--svg", "--png", "--time", "137", "--background", "transparent", "--browser", "none"]);
  const report = (await readCommandReport(result.stdout));
  expect(result.code, result.stdout + result.stderr).toBe(1);
  expect(report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html", "svg"] });
  const svg = report.artifacts.find((item: { kind: string }) => item.kind === "svg");
  expect(svg).toMatchObject({ artifactSourceRevision: "current", sourceSha256: report.input.sha256, timeMs: 137, background: "transparent", reducedMotion: false,
    intrinsicWidth: 960, intrinsicHeight: 600, sdk: { version: report.sdk.version, integrity: report.sdk.integrity } });
  expect(svg.artifactId).toMatch(/^[0-9a-f]{64}$/u);
  expect(svg.sha256).toMatch(/^[0-9a-f]{64}$/u);
  expect(report.exports).toEqual([expect.objectContaining({ format: "svg", status: "succeeded" }), expect.objectContaining({ format: "png", status: "failed" })]);
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(await readFile(input, "utf8")).toBe(bytes);
  expect(await readFile(svg.path, "utf8")).not.toContain('<rect x="0" y="0" width="960" height="600"');
  expect(report.checks.visual).toBe("not-run");
}, 60_000);

test.skipIf(!browser)("PNG has requested pixels and actual-file evidence stays distinct across widths, backdrops and later reviews", async () => {
  const input = join(root, "png source.json");
  await writeFile(input, JSON.stringify(document));
  const sourceResult = await command(["author", "--input", input, "--name", "evidence", "--checkpoint", "--preview", "--png", "--svg", "--png-width", "1280", "--time", "137", "--background", "transparent", "--browser", browser!]);
  expect(sourceResult.code, sourceResult.stdout + sourceResult.stderr).toBe(0);
  const source = (await readCommandReport(sourceResult.stdout));
  const png = source.artifacts.find((item: { kind: string }) => item.kind === "png");
  const svg = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  expect(png).toMatchObject({ intrinsicWidth: 1280, intrinsicHeight: 800, timeMs: 137, background: "transparent" });
  expect(source.visual.plan.points.some((point: { timeMs: number }) => point.timeMs === 137)).toBe(false);
  const settings = join(root, "display settings.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: svg.artifactId, displayWidth: 720, backdrop: "#ffffff" },
    { artifactId: svg.artifactId, displayWidth: 360, backdrop: "#111827" },
    { artifactId: png.artifactId, displayWidth: 720, backdrop: "#ffffff" },
    { artifactId: png.artifactId, displayWidth: 720, backdrop: "#111827" },
    { artifactId: png.artifactId, displayWidth: 1280, backdrop: "#ffffff" }] }));
  const capturedResult = await command(["author", "--from", source.revision.id, "--name", "evidence", "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(capturedResult.code, capturedResult.stdout + capturedResult.stderr).toBe(0);
  const captured = (await readCommandReport(capturedResult.stdout));
  expect(captured.artifactEvidence).toMatchObject({ status: "awaiting-review", settings: { items: expect.any(Array) } });
  expect(captured.artifactEvidence.items).toHaveLength(5);
  const pngSource = (await readFile(png.path)).toString("base64");
  const browserSession = await chromium.launch({ executablePath: browser!, headless: true });
  try {
    const page = await browserSession.newPage();
    for (const image of captured.artifactEvidence.items.filter((item: { artifactId: string }) => item.artifactId === png.artifactId)) {
      const screenshot = (await readFile(image.path)).toString("base64");
      const mean = await compareEvidencePixels(page, pngSource, screenshot, image.displayWidth, image.displayHeight, image.backdrop);
      expect(mean, `${image.displayWidth}px on ${image.backdrop}`).toBeLessThan(0.05);
    }
  } finally { await browserSession.close(); }
  const evidence = captured.artifactEvidence.items[0];
  expect(evidence).toMatchObject({ artifactSourceRevision: "v001", evidenceRevision: "v002", artifactId: svg.artifactId, artifactSha256: svg.sha256,
    displayWidth: 720, displayHeight: 450, backdrop: "#ffffff", timeMs: 137, background: "transparent", status: "captured", fonts: { ready: true, captureMethod: "decoded-artifact-canvas-png-v1" } });
  expect(captured.visual.viewedFrames).toEqual([]);
  expect(captured.visual.artifactReviews).toEqual([]);
  expect(captured.checks.visual).toBe("not-run");
  const reviewPath = join(root, "actual viewing attestation.json");
  await writeFile(reviewPath, JSON.stringify({ reviewer: "contract test attestation; not acceptance", viewed: true, items: [{ evidenceId: evidence.evidenceId, sha256: evidence.sha256,
    observations: { readingOrder: "Contract fixture.", density: "720px scope.", occlusion: "Contract fixture.", narrative: "137ms scope." }, issues: [] }] }));
  const reviewedResult = await command(["author", "--from", captured.revision.id, "--name", "evidence", "--artifact-review", reviewPath, "--browser", "none"]);
  expect(reviewedResult.code, reviewedResult.stdout).toBe(0);
  const reviewed = (await readCommandReport(reviewedResult.stdout));
  expect(reviewed.visual.artifactReviews).toEqual([expect.objectContaining({ artifactSourceRevision: "v001", evidenceRevision: "v002", evidenceId: evidence.evidenceId, reviewer: "contract test attestation; not acceptance" })]);
  expect(reviewed.visual.viewedFrames).toEqual([]);
  expect(reviewed.completion.quality).toBe("incomplete");
  expect(reviewed.artifactEvidenceCoverage).toMatchObject({ requested: 5, viewed: 1, unviewed: 4 });
  await writeFile(evidence.path, "changed evidence bytes");
  const tampered = await command(["author", "--from", captured.revision.id, "--name", "evidence", "--artifact-review", reviewPath, "--browser", "none"]);
  expect(tampered.code).toBe(1);
  expect((await readCommandReport(tampered.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "ARTIFACT_REVIEW_INVALID" }));
}, 90_000);

test("CLI rejects orphan options and retains explicit evidence-not-run status without a browser", async () => {
  const input = join(root, "orphan.json");
  await writeFile(input, JSON.stringify(document));
  for (const flags of [["--png-width", "400"], ["--background", "transparent"], ["--time", "137"]]) {
    const result = await command(["author", "--input", input, "--browser", "none", ...flags]);
    expect(result.code).toBe(1);
    expect((await readCommandReport(result.stdout)).stage).toBe("arguments");
  }
  const source = (await readCommandReport((await command(["author", "--input", input, "--name", "missing-evidence-browser", "--checkpoint", "--svg", "--browser", "none"])).stdout));
  const svg = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const settings = join(root, "missing browser settings.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: svg.artifactId, displayWidth: 720, backdrop: "#ffffff" }] }));
  const result = await command(["author", "--from", source.revision.id, "--name", "missing-evidence-browser", "--artifact-preview-settings", settings, "--browser", "none"]);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ artifactEvidence: { status: "not-run" }, completion: { delivery: "complete", quality: "incomplete" } });
  expect(report.artifactEvidence.items[0].status).toBe("not-run");
  await writeFile(svg.path, "changed SVG");
  const rejected = (await readCommandReport((await command(["author", "--from", source.revision.id, "--name", "missing-evidence-browser", "--artifact-preview-settings", settings, "--browser", "none"])).stdout));
  expect(rejected.artifactEvidence.status).toBe("failed");
  expect(rejected.diagnostics).toContainEqual(expect.objectContaining({ code: "ARTIFACT_PREVIEW_INVALID", reason: expect.stringMatching(/SVG|bytes|changed/u) }));
}, 60_000);

test.skipIf(!browser)("review rejects changed saved settings, original artifacts, evidence scope and source contexts", async () => {
  const input = join(root, "guard source.json");
  await writeFile(input, JSON.stringify(document));
  const name = "review-guards";
  const source = (await readCommandReport((await command(["author", "--input", input, "--name", name, "--checkpoint", "--svg", "--browser", "none"])).stdout));
  const artifact = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const settingsPath = join(root, "guard settings.json");
  await writeFile(settingsPath, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 360, backdrop: "#ffffff" }] }));
  const captureResult = await command(["author", "--from", source.revision.id, "--name", name, "--artifact-preview-settings", settingsPath, "--browser", browser!]);
  expect(captureResult.code, captureResult.stdout).toBe(0);
  const captured = (await readCommandReport(captureResult.stdout));
  const evidence = captured.artifactEvidence.items[0];
  const reviewPath = join(root, "guard review.json");
  await writeFile(reviewPath, JSON.stringify({ reviewer: "test-only", viewed: true, items: [{ evidenceId: evidence.evidenceId, sha256: evidence.sha256,
    observations: { readingOrder: "Fixture.", density: "360px.", occlusion: "Fixture.", narrative: "Fixture." }, issues: [] }] }));
  const savedSettings = join(captured.revision.directory, "artifact-preview-settings.json");
  const settingsBytes = await readFile(savedSettings);
  await writeFile(savedSettings, '{}');
  const changedSettings = await command(["author", "--from", captured.revision.id, "--name", name, "--artifact-review", reviewPath, "--browser", "none"]);
  expect(changedSettings.code, changedSettings.stdout).toBe(1);
  await writeFile(savedSettings, settingsBytes);
  const reportPath = join(captured.revision.directory, "report.json");
  const reportBytes = await readFile(reportPath);
  for (const mutation of ["path", "sdk", "display", "unregistered"]) {
    const changed = JSON.parse(reportBytes.toString("utf8"));
    if (mutation === "path") changed.artifactEvidence.items[0].path = artifact.path;
    if (mutation === "sdk") changed.sdk.integrity = "changed";
    if (mutation === "display") changed.artifactEvidence.items[0].displayWidth = 361;
    if (mutation === "unregistered") changed.artifactEvidence.items = [];
    await writeFile(reportPath, JSON.stringify(changed));
    const result = await command(["author", "--from", captured.revision.id, "--name", name, "--artifact-review", reviewPath, "--browser", "none"]);
    expect(result.code, `${mutation}: ${result.stdout}`).toBe(1);
  }
  await writeFile(reportPath, reportBytes);
  await writeFile(artifact.path, "modified original");
  const changedArtifact = await command(["author", "--from", captured.revision.id, "--name", name, "--artifact-review", reviewPath, "--browser", "none"]);
  expect(changedArtifact.code).toBe(1);
}, 90_000);

test("image flags cannot be silently ignored by non-author commands", async () => {
  const result = await command(["doctor", "--png-width", "480"]);
  expect(result.code, result.stdout).toBe(1);
  expect((await readCommandReport(result.stdout)).diagnostics[0].reason).toContain("author");
});


test("output aliases fail explicitly while canonical artifact capture rejects escaping files", async () => {
  const real = join(root, "real outputs");
  const alias = join(root, "alias outputs");
  await mkdir(real);
  await symlink(real, alias);
  const input = join(root, "aliased source.json");
  await writeFile(input, JSON.stringify(document));
  const aliased = await command(["author", "--input", input, "--output", alias, "--name", "alias", "--checkpoint", "--svg", "--browser", "none"]);
  expect(aliased.code).toBe(1);
  expect((await readCommandReport(aliased.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "WORKING_DRAFT_INVALID", reason: expect.stringContaining("canonical") }));
  const source = (await readCommandReport((await command(["author", "--input", input, "--output", real, "--name", "alias", "--checkpoint", "--svg", "--browser", "none"])).stdout));
  expect(source.status, JSON.stringify(source)).toBe("delivered");
  const artifact = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const settings = join(root, "aliased settings.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 360, backdrop: "#ffffff" }] }));
  const captured = (await readCommandReport((await command(["author", "--from", source.revision.id, "--output", real, "--name", "alias", "--artifact-preview-settings", settings, "--browser", "none"])).stdout));
  expect(captured.artifactEvidence.status, JSON.stringify(captured.diagnostics)).toBe("not-run");
  const outside = join(root, "outside.svg");
  await writeFile(outside, await readFile(artifact.path));
  await rm(artifact.path);
  await symlink(outside, artifact.path);
  const rejected = (await readCommandReport((await command(["author", "--from", source.revision.id, "--output", real, "--name", "alias", "--artifact-preview-settings", settings, "--browser", "none"])).stdout));
  expect(rejected.artifactEvidence.status).toBe("failed");
  expect(rejected.diagnostics).toContainEqual(expect.objectContaining({ code: "ARTIFACT_PREVIEW_INVALID", reason: expect.stringContaining("escapes") }));
}, 60_000);
