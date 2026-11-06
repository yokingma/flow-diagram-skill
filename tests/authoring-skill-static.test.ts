/** Static delivery is exercised only through an independently installed CLI and its real artifacts. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const document = { version: 1, title: "订单请求", viewport: { width: 640, height: 320 },
  nodes: [
    { id: "g", kind: "group", x: 20, y: 20, width: 600, height: 280, label: "服务" },
    { id: "client", kind: "roundedRect", parentId: "g", x: 40, y: 100, width: 160, height: 80, label: "客户端" },
    { id: "server", kind: "roundedRect", parentId: "g", x: 360, y: 100, width: 160, height: 80,
      content: { blocks: [{ type: "title", text: "服务器" }, { type: "paragraph", text: "处理订单" }] } }
  ], edges: [{ id: "request", from: "client", to: "server", label: "请求", fromPort: "right", toPort: "left" }], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG 静态 delivery ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}

test("author delivers byte-preserving JSON, paused offline HTML and factual reports in a fresh revision", async () => {
  const input = join(root, "draft.json");
  const sources = join(root, "source metadata.json");
  const bytes = JSON.stringify(document, null, 4) + "\n";
  await writeFile(input, bytes);
  await writeFile(sources, JSON.stringify([{ kind: "prompt", reference: "客户端向服务器发送订单请求", description: "用户明确描述" }]));
  const result = await command(["author", "--input", input, "--sources", sources, "--name", "订单"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({ status: "delivered", theme: "light", checks: { validation: "passed", compilation: "passed", layout: "warnings", visual: "not-run" },
    completion: { delivery: "complete", quality: "needs-user-decision", requested: ["json", "html"], completed: ["json", "html"] } });
  expect(report.sources).toContainEqual(expect.objectContaining({ kind: "prompt", reference: "客户端向服务器发送订单请求" }));
  expect(report.input.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  const html = await readFile(join(report.revision.directory, "diagram.html"), "utf8");
  expect(html).toContain('"autoplay":false');
  expect(html).toContain('"controls":true');
  expect(html).toContain("处理订单");
  expect(JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"))).toEqual(report);
  const markdown = await readFile(join(report.revision.directory, "report.md"), "utf8");
  expect(markdown).toContain("客户端向服务器发送订单请求");
  expect(markdown).toContain("quality: needs-user-decision");
  const next = JSON.parse((await command(["author", "--input", input, "--name", "订单"])).stdout);
  expect(next.revision.id).toBe("v002");
  expect(await readFile(join(report.revision.directory, "diagram.html"), "utf8")).toBe(html);
  expect(await readFile(input, "utf8")).toBe(bytes);
}, 60_000);

test("default author delivery uses hidden diagrams history and publishes a byte-identical final copy", async () => {
  const input = join(root, "default output.json");
  const bytes = JSON.stringify(document, null, 2) + "\n";
  await writeFile(input, bytes);
  const result = await command(["author", "--input", input, "--name", "default-output"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  const historyDirectory = join(root, ".diagrams", ".history", "default-output", "v001");
  const finalDirectory = join(root, ".diagrams", "default-output");
  expect(report.revision.directory).toBe(historyDirectory);
  for (const name of ["diagram.json", "diagram.html", "report.json", "report.md"]) {
    expect(await readFile(join(finalDirectory, name))).toEqual(await readFile(join(historyDirectory, name)));
  }
  expect(JSON.parse(await readFile(join(finalDirectory, "report.json"), "utf8"))).toEqual(report);
  const next = JSON.parse((await command(["author", "--input", input, "--name", "default-output"])).stdout);
  expect(next.revision.directory).toBe(join(root, ".diagrams", ".history", "default-output", "v002"));
  expect(await readFile(join(finalDirectory, "diagram.json"))).toEqual(await readFile(join(next.revision.directory, "diagram.json")));
}, 60_000);

test("explicit output keeps revisions in the requested root without publishing into the default root", async () => {
  const input = join(root, "explicit output.json");
  const output = join(root, "custom history");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "explicit-output", "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.revision.directory).toBe(join(output, "explicit-output", "v001"));
  await expect(readFile(join(root, ".diagrams", "explicit-output", "diagram.json"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(JSON.stringify(document));
}, 60_000);

test("measure returns shared and per-version heights without changing inputs or claiming font measurement", async () => {
  const input = join(root, "measurement.json");
  const short = { blocks: [{ type: "title", text: "API" }] };
  const long = { blocks: [{ type: "title", text: "API" }, { type: "paragraph", text: "较长的中文说明文字在固定宽度中折行。".repeat(8) },
    { type: "list", marker: "bullet", items: [{ body: "保留语言", auxiliary: "明确边界", tags: [{ text: "节点内容" }] }] }] };
  await writeFile(input, JSON.stringify({ kind: "roundedRect", width: 220, content: short }));
  const shortResult = await command(["measure", "--input", input]);
  expect(shortResult.code, shortResult.stdout).toBe(0);
  const shortHeight = JSON.parse(shortResult.stdout).measurement.height;
  const bytes = JSON.stringify({ kind: "roundedRect", width: 220, content: [short, long] }, null, 2);
  await writeFile(input, bytes);
  const result = await command(["measure", "--input", input]);
  expect(result.code, result.stdout).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: "measured", stage: "measurement", measurement: { method: "sdk-content-estimate", units: "diagram", diagnostics: [] } });
  expect(JSON.parse(result.stdout).measurement.height).toBeGreaterThan(shortHeight);
  expect(JSON.parse(result.stdout).measurement.perContent).toHaveLength(2);
  expect(JSON.parse(result.stdout).measurement.perContent[0]).toMatchObject({ index: 0, height: shortHeight });
  expect(JSON.parse(result.stdout).measurement.drivenBy).toBe(1);
  expect(await readFile(input, "utf8")).toBe(bytes);
  const batch = join(root, "measurement batch.json");
  await writeFile(batch, JSON.stringify([
    { label: "short", kind: "roundedRect", width: 220, content: short },
    { label: "long", kind: "roundedRect", width: 220, content: long }
  ]));
  const batchResult = await command(["measure", "--input", batch]);
  expect(batchResult.code).toBe(0);
  expect(JSON.parse(batchResult.stdout).measurement.items).toEqual([
    expect.objectContaining({ index: 0, label: "short", height: shortHeight }),
    expect.objectContaining({ index: 1, label: "long" })
  ]);
  await writeFile(input, JSON.stringify({ kind: "ellipse", width: 0, content: [] }));
  const invalid = await command(["measure", "--input", input]);
  expect(invalid.code).toBe(1);
  expect(JSON.parse(invalid.stdout).diagnostics).toContainEqual(expect.objectContaining({ stage: "measurement", location: "width" }));
}, 60_000);

test("requested SVG renders an exact timeline state and shares the selected theme with offline HTML", async () => {
  const input = join(root, "timed.json");
  await writeFile(input, JSON.stringify({ ...document, theme: "light", scenes: [{ id: "step", label: "处理", beats: [
    { durationMs: 1000, actions: [{ type: "updateNode", target: "client", value: { label: "已请求", x: 80 } }] }
  ] }] }));
  const result = await command(["author", "--input", input, "--name", "timed", "--theme", "dark", "--svg", "--time", "1000"]);
  expect(result.code, result.stdout).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.completion).toMatchObject({ requested: ["json", "html", "svg"], completed: ["json", "html", "svg"], delivery: "complete", quality: "needs-user-decision" });
  expect(report.artifacts).toContainEqual(expect.objectContaining({ kind: "svg", timeMs: 1000, theme: "dark" }));
  const svg = await readFile(join(report.revision.directory, "diagram.svg"), "utf8");
  expect(svg).toContain("已请求");
  expect(svg).toMatch(/<rect x="100"[^>]*data-id="client"/);
  expect(svg).toMatch(/<rect[^>]*rx="\d+"[^>]*data-id="g"/);
  const html = await readFile(join(report.revision.directory, "diagram.html"), "utf8");
  expect(html).toContain('"theme":"dark"');
  const failed = JSON.parse((await command(["author", "--input", input, "--name", "timed", "--svg", "--time", "1001"])).stdout);
  expect(failed).toMatchObject({ status: "failed", stage: "export", completion: { delivery: "incomplete", completed: ["json", "html"] } });
  expect(failed.diagnostics).toContainEqual(expect.objectContaining({ code: "SVG_TIME", location: "time" }));
  expect(failed.artifacts.some((artifact: { kind: string }) => artifact.kind === "svg")).toBe(false);
}, 60_000);

test("author rejects malformed JSON and invalid source metadata while retaining the draft and factual failure report", async () => {
  const input = join(root, "broken.json");
  await writeFile(input, '{ "version":');
  const result = await command(["author", "--input", input, "--name", "broken"]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({ status: "failed", checks: { validation: "failed", compilation: "not-run" }, completion: { delivery: "incomplete", completed: ["json"] } });
  expect(report.diagnostics[0]).toMatchObject({ code: "JSON_SYNTAX", stage: "validation", location: "$" });
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe('{ "version":');
  await writeFile(input, JSON.stringify(document));
  const sources = join(root, "invalid sources.json");
  await writeFile(sources, '[{"kind":"repository","reference":"repo","scope":false}]');
  const sourceFailure = JSON.parse((await command(["author", "--input", input, "--sources", sources, "--name", "broken"])).stdout);
  expect(sourceFailure).toMatchObject({ status: "failed", stage: "sources", checks: { validation: "not-run" } });
  expect(sourceFailure.diagnostics[0].code).toBe("SOURCE_METADATA");
  expect(sourceFailure.artifacts.map((artifact: { kind: string }) => artifact.kind)).toEqual(["json", "report-json", "report-markdown"]);
  expect(sourceFailure.revision.id).toBe("v002");
}, 60_000);

test("a requested out-of-range SVG preserves successful JSON/HTML without claiming complete delivery", async () => {
  const input = join(root, "export failure.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "failed-export", "--svg", "--time", "1"]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({ status: "failed", stage: "export", checks: { validation: "passed", compilation: "passed" }, completion: { delivery: "incomplete", completed: ["json", "html"] } });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "SVG_TIME", stage: "export" }));
  expect(report.artifacts.map((artifact: { kind: string }) => artifact.kind)).toEqual(["json", "html", "report-json", "report-markdown"]);
  expect(JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"))).toEqual(report);
  await expect(readFile(join(root, ".diagrams", "failed-export", "diagram.json"))).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("real Chrome opens offline artifacts paused with controls and plays without network", async () => {
  const { chromium } = await import("playwright-core");
  const { pathToFileURL } = await import("node:url");
  const input = join(root, "browser.json");
  await writeFile(input, JSON.stringify({ ...document, scenes: [{ id: "step", label: "请求", beats: [
    { durationMs: 10000, caption: "订单处理", actions: [{ type: "highlight", target: "server" }] }
  ] }] }));
  const result = await command(["author", "--input", input, "--name", "offline-browser", "--svg"]);
  expect(result.code, result.stdout).toBe(0);
  const report = JSON.parse(result.stdout);
  const browser = await chromium.launch({ executablePath: process.env.FLOWSVG_TEST_BROWSER, headless: true });
  try {
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const externalRequests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => { if (/^https?:/u.test(request.url())) externalRequests.push(request.url()); });
    page.on("pageerror", (error) => { errors.push(error.message); });
    await page.goto(pathToFileURL(join(report.revision.directory, "diagram.html")).href);
    await page.locator("svg").waitFor();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.getByRole("button", { name: "Play", exact: true }).count()).toBe(1);
    expect(await page.getByRole("slider", { name: "Progress" }).inputValue()).toBe("0");
    expect(await page.locator("svg").textContent()).toContain("处理订单");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => Number(document.querySelector<HTMLInputElement>('input[aria-label="Progress"]')?.value) > 0);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.goto(pathToFileURL(join(report.revision.directory, "diagram.svg")).href);
    await page.locator('rect[data-id="g"]').waitFor();
    expect(Number(await page.locator('rect[data-id="g"]').getAttribute("rx"))).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally { await browser.close(); }
  expect(report.checks.visual).toBe("not-run"); // Tool rendering/playback verification is separate from a model's visual judgment.
}, 60_000);
