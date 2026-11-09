/** Editable pages are exercised through the copied installed CLI and its actual offline output. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
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
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

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

test("accepts an Agent page, preserves outer content and publishes one self-contained HTML", async () => {
  const { input, page } = await sources("static");
  const result = await command(["author", "--input", input, "--html", page, "--name", "static-page", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  const html = await readFile(join(report.revision.directory, "diagram.html"), "utf8");
  expect(html).toContain('<h1>如何生成下一个 token</h1>');
  expect(html).toContain('教学示意 &lt;说明&gt; &amp; 条件');
  expect(html).toContain('id="flowsvg-page-player"');
  expect(report.htmlPage).toMatchObject({ schemaVersion: 1, source: { sha256: sha256(shell) }, outputSha256: sha256(html), inputSha256: report.input.sha256 });
  expect(report.htmlInspection.file.sha256).toBe(sha256(html));
  expect(await readFile(join(root, ".diagrams", "static-page", "diagram.html"), "utf8")).toBe(html);
  expect(JSON.parse(await readFile(join(report.revision.directory, "diagram.json"), "utf8"))).toEqual(diagram);
  expect(report.sdk.version).toBe("0.3.1");
  expect(await readFile(join(report.revision.directory, "report.md"), "utf8")).toContain("## HTML page");
}, 60_000);

test.skipIf(!browser)("inspects the actual outer page and its embedded paused player", async () => {
  const { input, page } = await sources("browser");
  const result = await command(["author", "--input", input, "--html", page, "--name", "browser-page", "--browser", browser!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.checks.html).toBe("captured");
  expect(report.htmlInspection.playerSurface).toBe("managed-frame");
  expect(report.htmlInspection.initial).toMatchObject({ paused: true, offline: true, svg: true });
  expect(report.htmlInspection.states).toEqual([expect.objectContaining({ paused: true, offline: true })]);
  const instance = await chromium.launch({ executablePath: browser!, headless: true });
  try {
    const page = await instance.newPage({ offline: true });
    await page.goto(pathToFileURL(join(report.revision.directory, "diagram.html")).href);
    await expect(page.locator("h1").textContent()).resolves.toBe("如何生成下一个 token");
    await expect(page.locator("body > p").first().textContent()).resolves.toBe("教学示意 <说明> & 条件");
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).fontSize)).toBe("28px");
      const heading = await page.locator("h1").boundingBox();
      expect(heading!.x + heading!.width).toBeLessThanOrEqual(width);
      const host = await page.locator("#flowsvg-page-player").elementHandle();
      const player = await host!.contentFrame();
      await player!.locator("#flowsvg-player svg").waitFor();
      expect(await player!.locator("svg").getByText("输入", { exact: true }).count()).toBe(1);
      expect(await player!.locator("h1").count()).toBe(0);
    }
  } finally { await instance.close(); }
}, 60_000);

test("rejects a reserved playback host outside the managed region before creating a revision", async () => {
  const { input, page } = await sources("duplicate-host", shell.replace('<h1>', '<iframe id="flowsvg-page-player"></iframe><h1>'));
  const result = await command(["author", "--input", input, "--html", page, "--name", "duplicate-host", "--browser", "none"]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.revision).toBeNull();
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID" }));
});


test("retains page-only edits and rejects mismatched or damaged playback", async () => {
  const { input, page } = await sources("retained");
  const initialResult = await command(["author", "--input", input, "--html", page, "--name", "retained", "--browser", "none"]);
  const initial = JSON.parse(initialResult.stdout);
  const html = await readFile(join(initial.revision.directory, "diagram.html"), "utf8");
  const edited = html.replace("如何生成下一个 token", "修改后的页面标题");
  await writeFile(page, edited);
  const accepted = await command(["author", "--input", input, "--html", page, "--name", "retained", "--browser", "none"]);
  expect(accepted.code, accepted.stdout + accepted.stderr).toBe(0);
  const report = JSON.parse(accepted.stdout);
  expect(await readFile(join(report.revision.directory, "diagram.html"), "utf8")).toBe(edited);
  expect(report.htmlPage.source.sha256).toBe(sha256(edited));
  await writeFile(input, JSON.stringify({ ...diagram, title: "另一张图" }));
  const mismatch = await command(["author", "--input", input, "--html", page, "--name", "retained", "--browser", "none"]);
  expect(mismatch.code).toBe(1);
  expect(JSON.parse(mismatch.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID" }));
  expect(await readFile(join(root, ".diagrams", "retained", "diagram.html"), "utf8")).toBe(edited);
  await writeFile(input, JSON.stringify(diagram));
  await writeFile(page, edited.replace('title="Diagram player"', 'title="Changed playback"'));
  const damaged = await command(["author", "--input", input, "--html", page, "--name", "retained", "--browser", "none"]);
  expect(damaged.code).toBe(1);
  expect(JSON.parse(damaged.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID" }));
}, 60_000);

test("rejects malformed page regions and HTML options outside author", async () => {
  const { input, page } = await sources("malformed");
  for (const html of ["<html>missing region</html>", shell + "<!-- flowsvg:player:start -->", shell.replace("<!-- flowsvg:player:end -->", ""), shell.replace("<!-- flowsvg:player:start -->", '<!-- flowsvg:player:start --><script id="flowsvg-page-data" type="application/json">{"version":2}</script>')]) {
    await writeFile(page, html);
    const result = await command(["author", "--input", input, "--html", page, "--name", "malformed", "--browser", "none"]);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ revision: null, diagnostics: [expect.objectContaining({ code: "HTML_PAGE_INVALID" })] });
  }
  const scoped = await command(["doctor", "--html", page]);
  expect(scoped.code).toBe(1);
  expect(JSON.parse(scoped.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "ERR_OPTION_SCOPE", location: "html" }));
});

test("finalize preserves the actual page and portable identities after workspace cleanup", async () => {
  const name = "final-page";
  const workspace = join(root, ".diagrams", ".work", name, "task-1");
  await mkdir(workspace, { recursive: true });
  const input = join(workspace, "draft.json");
  const page = join(workspace, "draft.html");
  await writeFile(input, JSON.stringify(diagram));
  await writeFile(page, shell);
  const authored = await command(["author", "--input", input, "--html", page, "--name", name, "--output", join(workspace, "history"), "--browser", "none"]);
  expect(authored.code, authored.stdout + authored.stderr).toBe(0);
  const source = JSON.parse(authored.stdout);
  const html = await readFile(join(source.revision.directory, "diagram.html"), "utf8");
  const result = await command(["finalize", "--workspace", workspace, "--name", name, "--from", source.revision.id]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const final = join(root, ".diagrams", name);
  expect(await readFile(join(final, "diagram.html"), "utf8")).toBe(html);
  expect((await readdir(final)).sort()).toEqual(["diagram.html", "diagram.json", "report.json", "report.md"]);
  const report = JSON.parse(await readFile(join(final, "report.json"), "utf8"));
  expect(report.htmlPage.outputSha256).toBe(sha256(html));
  expect(JSON.stringify(report.htmlPage)).not.toContain(workspace);
  await expect(readdir(workspace)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);
