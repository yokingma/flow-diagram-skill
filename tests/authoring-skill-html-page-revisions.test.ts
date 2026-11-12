import { readCommandReport } from "./helpers/cli-report";
/** Page continuations use only the copied installed CLI and saved delivery files. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const diagram = { version: 1, title: "教学图", viewport: { width: 480, height: 220 },
  nodes: [{ id: "source", kind: "roundedRect", x: 20, y: 60, width: 140, height: 80, label: "输入" },
    { id: "target", kind: "roundedRect", x: 320, y: 60, width: 140, height: 80, label: "输出" }],
  edges: [{ id: "request", from: "source", to: "target" }], scenes: [] };
const shell = '<!doctype html><html><head><meta charset="utf-8"><style>body{padding:29px}h1{color:navy}</style></head><body><h1>保留页面设计</h1><!-- flowsvg:player:start -->\n<!-- flowsvg:player:end --><aside>保留说明</aside></body></html>';
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG page revisions ")));
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
async function sources(name: string) {
  const input = join(root, `${name}.json`);
  const page = join(root, `${name}.html`);
  await writeFile(input, JSON.stringify(diagram));
  await writeFile(page, shell);
  return { input, page };
}

test("an explicitly selected parent keeps its page, while damaged parent files fail closed", async () => {
  const { input, page } = await sources("parent");
  const output = join(root, "parent-history");
  const initialResult = await command(["author", "--input", input, "--html", page, "--output", output, "--name", "parent", "--browser", "none", "--checkpoint"]);
  expect(initialResult.code, initialResult.stdout + initialResult.stderr).toBe(0);
  const initial = (await readCommandReport(initialResult.stdout));
  const htmlPath = join(initial.revision.directory, "diagram.html");
  const html = await readFile(htmlPath, "utf8");
  const result = await command(["author", "--from", initial.revision.id, "--output", output, "--name", "parent", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(await readFile(join(report.revision.directory, "diagram.html"), "utf8")).toBe(html);
  expect(report.htmlPage.selection).toEqual({ kind: "parent", revision: initial.revision.id });
  expect(report.htmlPage.source.sha256).toBe(sha256(html));
  expect(report.htmlInspection.viewedStates).toEqual([]);
  expect(report.completion.requested).toEqual(["json", "html"]);
  await writeFile(htmlPath, html.replace("保留页面设计", "外部破坏"));
  const damaged = await command(["author", "--from", initial.revision.id, "--output", output, "--name", "parent", "--browser", "none"]);
  expect(damaged.code).toBe(1);
  expect((await readCommandReport(damaged.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID" }));
  await rm(htmlPath);
  const missing = await command(["author", "--from", initial.revision.id, "--output", output, "--name", "parent", "--browser", "none"]);
  expect(missing.code).toBe(1);
  expect((await readCommandReport(missing.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID" }));
}, 60_000);

test("diagram changes require explicit synchronization and reject damaged playback even when synchronization is requested", async () => {
  const { input, page } = await sources("sync");
  const output = join(root, "sync-history");
  const authored = await command(["author", "--input", input, "--html", page, "--output", output, "--name", "sync", "--browser", "none", "--checkpoint"]);
  expect(authored.code, authored.stdout + authored.stderr).toBe(0);
  const initial = (await readCommandReport(authored.stdout));
  const html = await readFile(join(initial.revision.directory, "diagram.html"), "utf8");
  await writeFile(input, JSON.stringify({ ...diagram, nodes: [diagram.nodes[0], { ...diagram.nodes[1], label: "新输出" }] }));
  const args = ["author", "--input", input, "--parent", initial.revision.id, "--output", output, "--name", "sync", "--browser", "none"];
  const mismatch = await command(args);
  expect(mismatch.code).toBe(1);
  expect((await readCommandReport(mismatch.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID" }));
  const synchronized = await command([...args, "--sync-html"]);
  expect(synchronized.code, synchronized.stdout + synchronized.stderr).toBe(0);
  const report = (await readCommandReport(synchronized.stdout));
  const updated = await readFile(join(report.revision.directory, "diagram.html"), "utf8");
  expect(updated).toContain("新输出");
  expect(updated.slice(0, updated.indexOf("<!-- flowsvg:player:start -->"))).toBe(html.slice(0, html.indexOf("<!-- flowsvg:player:start -->")));
  expect(updated.slice(updated.indexOf("<!-- flowsvg:player:end -->"))).toBe(html.slice(html.indexOf("<!-- flowsvg:player:end -->")));
  expect(report.htmlPage.synchronizedFrom).toEqual({ inputSha256: initial.input.sha256, playerSha256: initial.htmlPage.playerSha256 });
  expect(report.htmlPage.inputSha256).toBe(report.input.sha256);
  expect(report.htmlPage.outputSha256).toBe(sha256(updated));
  expect(report.htmlInspection.file.sha256).toBe(sha256(updated));
  expect(report.htmlInspection.viewedStates).toEqual([]);
  expect(await readFile(join(initial.revision.directory, "diagram.html"), "utf8")).toBe(html);
  for (const damaged of [html.replace('title="Diagram player"', 'title="Changed"'), html.replace("&lt;title&gt;教学图", "&lt;title&gt;篡改图"), html.replace('"playerSha256":"', '"playerSha256":"bad')]) {
    await writeFile(page, damaged);
    const rejected = await command(["author", "--input", input, "--html", page, "--sync-html", "--name", "damaged-sync", "--browser", "none"]);
    expect(rejected.code).toBe(1);
    expect((await readCommandReport(rejected.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID" }));
  }
}, 60_000);

test("delivered HTML and JSON can be edited and finalized again after every task workspace is removed", async () => {
  const name = "portable";
  const final = join(root, ".diagrams", name);
  async function workspace(task: string) {
    const path = join(root, ".diagrams", ".work", name, task);
    await mkdir(path, { recursive: true });
    return path;
  }
  const first = await workspace("first");
  await writeFile(join(first, "draft.json"), JSON.stringify(diagram));
  await writeFile(join(first, "draft.html"), shell);
  const initial = await command(["author", "--input", join(first, "draft.json"), "--html", join(first, "draft.html"), "--output", join(first, "history"), "--name", name, "--browser", "none"]);
  expect(initial.code, initial.stdout + initial.stderr).toBe(0);
  const published = await command(["finalize", "--workspace", first, "--name", name, "--from", (await readCommandReport(initial.stdout)).revision.id]);
  expect(published.code, published.stdout + published.stderr).toBe(0);
  await expect(readdir(first)).rejects.toMatchObject({ code: "ENOENT" });
  const originalJson = await readFile(join(final, "diagram.json"), "utf8");
  const originalHtml = await readFile(join(final, "diagram.html"), "utf8");
  const second = await workspace("second");
  const editedPage = join(second, "edited.html");
  const edited = originalHtml.replace("保留页面设计", "页面独立修改").replace("color:navy", "color:teal");
  await writeFile(editedPage, edited);
  const pageEdit = await command(["author", "--input", join(final, "diagram.json"), "--html", editedPage, "--output", join(second, "history"), "--name", name, "--browser", "none"]);
  expect(pageEdit.code, pageEdit.stdout + pageEdit.stderr).toBe(0);
  const pageReport = (await readCommandReport(pageEdit.stdout));
  expect(pageReport.htmlPage.selection).toEqual({ kind: "html" });
  expect(pageReport.htmlPage.source.sha256).toBe(sha256(edited));
  expect(await readFile(join(pageReport.revision.directory, "diagram.json"), "utf8")).toBe(originalJson);
  expect(await readFile(join(pageReport.revision.directory, "diagram.html"), "utf8")).toBe(edited);
  expect(pageReport.htmlInspection.viewedStates).toEqual([]);
  expect(pageReport.completion.requested).toEqual(["json", "html"]);
  const republished = await command(["finalize", "--workspace", second, "--name", name, "--from", pageReport.revision.id]);
  expect(republished.code, republished.stdout + republished.stderr).toBe(0);
  await expect(readdir(second)).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(join(final, "diagram.html"), "utf8")).toBe(edited);
  const third = await workspace("third");
  const changedInput = join(third, "changed.json");
  const changedJson = JSON.stringify({ ...diagram, nodes: [diagram.nodes[0], { ...diagram.nodes[1], label: "续编后的输出" }] });
  await writeFile(changedInput, changedJson);
  const args = ["author", "--input", changedInput, "--html", join(final, "diagram.html"), "--output", join(third, "history"), "--name", name, "--browser", "none"];
  const mismatch = await command(args);
  expect(mismatch.code).toBe(1);
  expect(await readFile(join(final, "diagram.html"), "utf8")).toBe(edited);
  const synced = await command([...args, "--sync-html"]);
  expect(synced.code, synced.stdout + synced.stderr).toBe(0);
  const syncedReport = (await readCommandReport(synced.stdout));
  const thirdFinal = await command(["finalize", "--workspace", third, "--name", name, "--from", syncedReport.revision.id]);
  expect(thirdFinal.code, thirdFinal.stdout + thirdFinal.stderr).toBe(0);
  await expect(readdir(third)).rejects.toMatchObject({ code: "ENOENT" });
  const finalHtml = await readFile(join(final, "diagram.html"), "utf8");
  expect(finalHtml).toContain("页面独立修改");
  expect(finalHtml).toContain("color:teal");
  expect(finalHtml).toContain("续编后的输出");
  expect(await readFile(join(final, "diagram.json"), "utf8")).toBe(changedJson);
  expect(JSON.parse(await readFile(join(final, "report.json"), "utf8")).htmlPage.outputSha256).toBe(sha256(finalHtml));
  expect((await readdir(final)).sort()).toEqual(["diagram.html", "diagram.json", "report.json", "report.md"]);
}, 60_000);

test("synchronization requires authoring and an explicitly selected or inherited page", async () => {
  const { input } = await sources("flag-scope");
  const scoped = await command(["validate", "--input", input, "--sync-html"]);
  expect(scoped.code).toBe(1);
  expect((await readCommandReport(scoped.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "ERR_OPTION_SCOPE", location: "sync-html" }));
  const missing = await command(["author", "--input", input, "--sync-html", "--name", "missing-page", "--browser", "none"]);
  expect(missing.code).toBe(1);
  expect((await readCommandReport(missing.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_PAGE_INVALID", location: "sync-html" }));
});

test.skipIf(!browser)("an old HTML review cannot cover changed page bytes or replace the previous default delivery", async () => {
  const { input, page } = await sources("review-boundary");
  const name = "review-boundary";
  const authored = await command(["author", "--input", input, "--html", page, "--name", name, "--browser", browser!, "--formal-review"]);
  expect(authored.code, authored.stdout + authored.stderr).toBe(0);
  const source = (await readCommandReport(authored.stdout));
  const sourceHtml = await readFile(join(source.revision.directory, "diagram.html"), "utf8");
  const reviewPath = join(root, "old-html-review.json");
  await writeFile(reviewPath, JSON.stringify({ reviewer: "synthetic regression fixture", viewed: true,
    states: source.htmlInspection.states.map((state: { id: string; sha256: string }) => ({ id: state.id, sha256: state.sha256,
      observations: { readingOrder: "Fixture", density: "Fixture", occlusion: "Fixture", narrative: "Fixture" }, issues: [] })) }));
  const edited = sourceHtml.replace("保留页面设计", "新页面需要重新查看");
  await writeFile(page, edited);
  const result = await command(["author", "--from", source.revision.id, "--html", page, "--name", name, "--html-review", reviewPath, "--browser", "none"]);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report.revision).toBeNull();
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_REVIEW_INVALID" }));
  expect(await readFile(join(root, ".diagrams", name, "diagram.html"), "utf8")).toBe(sourceHtml);
}, 90_000);
