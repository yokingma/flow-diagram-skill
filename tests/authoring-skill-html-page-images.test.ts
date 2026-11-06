/** Copied-install delivery keeps page prose and source-bound standalone images independently observable. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const diagram = { version: 1, title: "审批教学图", viewport: { width: 720, height: 360 },
  typography: { nodeLabel: 22, edgeLabel: 18, flowLabel: 16 },
  nodes: [
    { id: "scope", kind: "rect", x: 32, y: 20, width: 656, height: 54, label: "审批流程 · 教学示意" },
    { id: "request", kind: "roundedRect", x: 48, y: 130, width: 180, height: 90, label: "提交申请" },
    { id: "approved", kind: "roundedRect", x: 490, y: 130, width: 180, height: 90, label: "批准" },
    { id: "limit", kind: "rect", x: 48, y: 270, width: 622, height: 60, label: "限定：仅展示满足条件的路径" }
  ], edges: [{ id: "decision", from: "request", to: "approved", label: "材料齐全" }], scenes: [] };
const pageSource = '<!doctype html><html lang="zh"><meta charset="utf-8"><style>body{font:18px system-ui;margin:32px auto;max-width:900px}iframe{width:100%;border:0}</style><h1>如何理解审批条件</h1><p>页面导读：先读条件，再看方向。</p><!-- flowsvg:player:start -->\n<!-- flowsvg:player:end --><p>阅读提示仅用于网页。</p></html>';
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG page images ")));
  skill = join(root, "installed");
  await cp(resolve(process.env.FLOWSVG_TEST_SKILL ?? "skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", (error) => done({ code: 1, stdout, stderr: error.message }));
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}
async function sources(name: string) {
  const input = join(root, `${name}.json`);
  const html = join(root, `${name}.html`);
  const bytes = JSON.stringify(diagram, null, 4) + "\n";
  await writeFile(input, bytes);
  await writeFile(html, pageSource);
  return { input, html, bytes };
}

test.skipIf(!browser)("delivers an introduced HTML and explicit standalone images with separate source-bound evidence", async () => {
  const { input, html, bytes } = await sources("mixed");
  const result = await command(["author", "--input", input, "--html", html, "--name", "mixed", "--svg", "--png", "--png-width", "720", "--browser", browser!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.completion).toMatchObject({ delivery: "complete", completed: ["json", "html", "svg", "png"] });
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  const images = report.artifacts.filter((item: { kind: string }) => ["svg", "png"].includes(item.kind));
  expect(images).toHaveLength(2);
  for (const artifact of images) {
    expect(artifact).toMatchObject({ sourceSha256: hash(bytes), intrinsicWidth: 720, intrinsicHeight: 360, timeMs: 0 });
    expect(hash(await readFile(artifact.path))).toBe(artifact.sha256);
  }
  const svg = await readFile(images.find((item: { kind: string }) => item.kind === "svg").path, "utf8");
  for (const label of ["审批流程 · 教学示意", "提交申请", "材料齐全", "批准", "限定：仅展示满足条件的路径"]) expect(svg).toContain(label);
  expect(svg).not.toContain("如何理解审批条件");
  expect(svg).not.toContain("阅读提示仅用于网页");
  const instance = await chromium.launch({ executablePath: browser!, headless: true });
  try {
    const page = await instance.newPage({ offline: true });
    await page.goto(pathToFileURL(join(report.revision.directory, "diagram.html")).href);
    expect(await page.locator("h1").textContent()).toBe("如何理解审批条件");
    expect(await page.locator("body > p").last().textContent()).toBe("阅读提示仅用于网页。");
  } finally { await instance.close(); }
  const settings = join(root, "mixed-display.json");
  await writeFile(settings, JSON.stringify({ items: images.map((item: { artifactId: string }) => ({ artifactId: item.artifactId, displayWidth: 720, backdrop: "#ffffff" })) }));
  const captured = await command(["evidence", "--from", report.revision.id, "--name", "mixed", "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(captured.code, captured.stdout + captured.stderr).toBe(0);
  const evidence = JSON.parse(captured.stdout);
  expect(evidence.artifactEvidence.items).toHaveLength(2);
  for (const item of evidence.artifactEvidence.items) {
    expect(item).toMatchObject({ status: "captured", displayWidth: 720, displayHeight: 360, backdrop: "#ffffff" });
    expect(images.find((image: { artifactId: string }) => image.artifactId === item.artifactId)?.sha256).toBe(item.artifactSha256);
    expect(item.artifactSha256).not.toBe(report.htmlInspection.file.sha256);
  }
  expect(report.visual.artifactReviews).toEqual([]);
  expect(report.completion.quality).toBe("incomplete");
}, 90_000);

test("default pages add no images and explicit export preserves original JSON and the selected page bytes", async () => {
  const { input, html, bytes } = await sources("unchanged");
  const initial = await command(["author", "--input", input, "--html", html, "--name", "unchanged", "--browser", "none"]);
  expect(initial.code, initial.stdout + initial.stderr).toBe(0);
  const source = JSON.parse(initial.stdout);
  expect(source.completion.completed).toEqual(["json", "html"]);
  expect((await readdir(source.revision.directory)).some((file) => /\.(svg|png)$/u.test(file))).toBe(false);
  const selectedHtml = join(source.revision.directory, "diagram.html");
  const pageBytes = await readFile(selectedHtml);
  const exported = await command(["author", "--input", input, "--html", selectedHtml, "--name", "unchanged", "--svg", "--browser", "none"]);
  expect(exported.code, exported.stdout + exported.stderr).toBe(0);
  const report = JSON.parse(exported.stdout);
  expect(await readFile(input, "utf8")).toBe(bytes);
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(await readFile(join(report.revision.directory, "diagram.html"))).toEqual(pageBytes);
  const svg = await readFile(join(report.revision.directory, "diagram.svg"), "utf8");
  expect(svg).toContain("审批流程 · 教学示意");
  expect(svg).toContain("限定：仅展示满足条件的路径");
}, 60_000);

test("a missing PNG browser preserves the composed HTML and SVG but leaves the mixed request incomplete", async () => {
  const { input, html } = await sources("partial");
  const result = await command(["author", "--input", input, "--html", html, "--name", "partial", "--svg", "--png", "--browser", "none"]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html", "svg"] });
  expect(report.exports).toEqual([expect.objectContaining({ format: "svg", status: "succeeded" }), expect.objectContaining({ format: "png", status: "failed" })]);
  expect(await readFile(join(report.revision.directory, "diagram.html"), "utf8")).toContain("<h1>如何理解审批条件</h1>");
  expect(await readFile(join(report.revision.directory, "diagram.svg"), "utf8")).toContain("材料齐全");
  await expect(readFile(join(report.revision.directory, "diagram.png"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(report.htmlPage.outputSha256).toBe(report.htmlInspection.file.sha256);
}, 60_000);
