import { readCommandReport } from "./helpers/cli-report";
/** Editable pages are exercised through the copied installed CLI and its actual offline output. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const diagram = { version: 1, title: "教学图", viewport: { width: 480, height: 220 },
  nodes: [{ id: "source", kind: "roundedRect", x: 20, y: 60, width: 140, height: 80, label: "输入" },
    { id: "target", kind: "roundedRect", x: 320, y: 60, width: 140, height: 80, label: "输出" }],
  edges: [{ id: "request", from: "source", to: "target" }], scenes: [] };
const shell = '<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;font-family:system-ui}h1{font-size:28px}iframe{width:100%;border:0}</style></head><body><h1>如何生成下一个 token</h1><p>教学示意 &lt;说明&gt; &amp; 条件</p><!-- flowsvg:player:start -->\n<!-- flowsvg:player:end --><p>补充说明</p></body></html>';

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG editable page ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", (error) => done({ code: 1, stdout, stderr: error.message }));
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}
async function sources(name: string, html = shell, document = diagram) {
  const input = join(root, `${name}.json`);
  const page = join(root, `${name}.html`);
  await writeFile(input, JSON.stringify(document));
  await writeFile(page, html);
  return { input, page };
}

test.skipIf(!browser)("external page dependencies fail offline inspection while retaining completed files", async () => {
  const html = shell.replace("</head>", '<link rel="stylesheet" href="https://example.invalid/page.css"><script src="https://example.invalid/page.js"></script></head>');
  const { input, page } = await sources("external", html);
  const result = await command(["author", "--input", input, "--html", page, "--name", "external", "--browser", browser!]);
  const report = (await readCommandReport(result.stdout));
  expect(report.completion.delivery).toBe("complete");
  expect(await readFile(join(report.revision.directory, "diagram.html"), "utf8")).toContain("https://example.invalid/page.css");
  expect(report.htmlInspection.status).toBe("failed");
  expect(report.checks.html).not.toBe("captured");
  expect(report.htmlInspection.reason).toMatch(/offline.*external|external.*offline/i);
  expect(report).not.toHaveProperty("qualityCoverage");
  expect(report.completion).not.toHaveProperty("quality");
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_INSPECTION_FAILED" }));
}, 90_000);

test.skipIf(!browser)("animated pages report actual captions, compiled boundaries and restoration after backward seeking", async () => {
  const teaching = JSON.parse(await readFile(join(skill, "examples/request-response.json"), "utf8"));
  // Deliberately too brief for reading: this fixture protects the fractional seek boundary only.
  teaching.scenes[0].beats.splice(3, 0, { durationMs: 0.00001, transitionMs: 0,
    caption: "极短边界状态", actions: [{ type: "highlight", target: "client" }] });
  const starter = (await readFile(join(skill, "examples/html-page.html"), "utf8")).replace("</head>", '<link rel="stylesheet" href="data:text/css,h1%7Bfont-weight%3A600%7D"></head>');
  const { input, page } = await sources("animated", starter, teaching);
  const result = await command(["author", "--input", input, "--html", page, "--name", "animated", "--browser", browser!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.htmlInspection.initial).toMatchObject({ progress: "0", paused: true,
    caption: "教学设定：客户端发送一次查询；未定义超时或失败分支。" });
  expect(report.htmlInspection.playback).toMatchObject({ attempted: true, advanced: true, paused: true });
  expect(report.htmlInspection.backseek).toMatchObject({ attempted: true, restored: true, timeMs: 0,
    caption: "教学设定：客户端发送一次查询；未定义超时或失败分支。" });
  expect(report.htmlInspection.outerPage).toMatchObject({ staticTextStable: true });
  for (const beat of report.compilation.beats) {
    expect(report.htmlInspection.states).toContainEqual(expect.objectContaining({ timeMs: beat.startMs, caption: beat.caption }));
  }
  const final = report.htmlInspection.states.find((state: { timeMs: number }) => state.timeMs === report.compilation.totalDurationMs);
  expect(final).toMatchObject({ caption: "本教学路径结束；图中未声明其他业务结果。", diagramText: expect.stringContaining("结果已就绪。") });
  expect(report.htmlInspection.backseek.diagramText).toContain("等待查询请求。");
  expect(report.htmlInspection.backseek.diagramText).not.toContain("结果已就绪。");
  expect(report.htmlInspection.offline).toEqual({ passed: true, externalRequests: [] });
}, 90_000);

for (const theme of ["light", "dark"]) test.skipIf(!browser)(`starter keeps ${theme} narrow diagram readable through an accessible horizontal reading region`, async () => {
  const teaching = JSON.parse(await readFile(join(skill, "examples/request-response.json"), "utf8"));
  const starter = await readFile(join(skill, "examples/html-page.html"), "utf8");
  const { input, page: pageSource } = await sources(`narrow-${theme}`, starter, teaching);
  const result = await command(["author", "--input", input, "--html", pageSource, "--name", `narrow-${theme}`, "--theme", theme, "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  const instance = await chromium.launch({ executablePath: browser!, headless: true });
  try {
    const page = await instance.newPage({ viewport: { width: 390, height: 844 }, offline: true, colorScheme: theme });
    await page.goto(pathToFileURL(join(report.revision.directory, "diagram.html")).href);
    const frameHost = page.locator("#flowsvg-page-player");
    const player = await (await frameHost.elementHandle())!.contentFrame();
    await player!.locator("#flowsvg-player svg").waitFor();
    const dimensions = await frameHost.boundingBox();
    expect(dimensions!.width).toBeGreaterThanOrEqual(720);
    expect(await page.locator("body").evaluate((element) => element.scrollWidth)).toBe(390);
    const region = page.getByRole("region", { name: "Interactive diagram" });
    expect(await region.getAttribute("tabindex")).toBe("0");
    await region.focus();
    await page.keyboard.press("End");
    await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    expect(await region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(await player!.locator("svg").getByText("查询服务", { exact: true }).count()).toBe(1);
    expect(await player!.getByRole("button", { name: "Play", exact: true }).isEnabled()).toBe(true);
    await region.evaluate((element) => { element.scrollLeft = 0; });
    await player!.getByRole("button", { name: "Play", exact: true }).click();
    await player!.getByRole("button", { name: "Pause", exact: true }).click();
    expect(await page.locator("h1").textContent()).toBe("Diagram explanation");
  } finally { await instance.close(); }
}, 90_000);

test.skipIf(!browser)("relative page assets are diagnosed as dependencies of a supposedly single-file page", async () => {
  const { input, page } = await sources("relative", shell.replace("</body>", '<img src="missing-local.svg" alt="External asset"></body>'));
  const result = await command(["author", "--input", input, "--html", page, "--name", "relative", "--browser", browser!]);
  const report = (await readCommandReport(result.stdout));
  expect(report.completion.delivery).toBe("complete");
  expect(report.htmlInspection.status).toBe("failed");
  expect(report.htmlInspection.offline.externalRequests).toContainEqual(expect.stringMatching(/missing-local\.svg$/));
}, 90_000);

test.skipIf(!browser)("backward seeking records visual-only state changes with unchanged text and caption", async () => {
  const html = shell.replace("</body>", `<script>
    (() => {
      const frame = document.getElementById("flowsvg-page-player");
      let advanced = false;
      let changed = false;
      const watch = () => {
        const progress = frame?.contentDocument?.querySelector('input[aria-label="Progress"]');
        if (!progress) return;
        if (Number(progress.value) > 0) advanced = true;
        if (advanced && !changed) {
          const shape = frame.contentDocument.querySelector("#flowsvg-player svg");
          if (shape) { shape.setAttribute("opacity", "0.37"); changed = true; }
        }
      };
      setInterval(watch, 1);
    })();
  </script></body>`);
  const teaching = JSON.parse(await readFile(join(skill, "examples/request-response.json"), "utf8"));
  const { input, page } = await sources("visual-backseek", html, teaching);
  const result = await command(["author", "--input", input, "--html", page, "--name", "visual-backseek", "--browser", browser!]);
  const report = (await readCommandReport(result.stdout));
  expect(result.code, result.stdout + result.stderr).toBe(0);
  expect(report.completion.delivery).toBe("complete");
  expect(report.htmlInspection.initial.visualSignature).toEqual(expect.any(String));
  const sameCaptionStates = report.htmlInspection.states.filter((state: { caption: string }) =>
    state.caption === report.htmlInspection.initial.caption);
  expect(sameCaptionStates[0].visualSignature).toBe(sameCaptionStates[1].visualSignature);
  expect(sameCaptionStates.some((state: { visualSignature: string }) =>
    state.visualSignature !== report.htmlInspection.initial.visualSignature)).toBe(true);
  expect(report.htmlInspection.backseek).toMatchObject({ restored: true,
    visualSignature: report.htmlInspection.initial.visualSignature,
    initialVisualSignature: report.htmlInspection.initial.visualSignature });
}, 90_000);
