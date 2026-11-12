import { readCommandReport } from "./helpers/cli-report";
/** Independent review records are tested at the copied-install CLI and immutable task-file boundary. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const document = { version: 1, viewport: { width: 400, height: 240 },
  nodes: [{ id: "a", kind: "rect", x: 60, y: 60, width: 160, height: 80, label: "Source" }], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-independent-review-")));
  skill = join(root, "installed");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], environment: Record<string, string> = {}) {
  return new Promise<{ code: number | null; report: Record<string, unknown>; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), DEBUG: "pw:browser", ...environment }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => { void readCommandReport(stdout).then((report) => done({ code, report, stderr }), reject); });
  });
}
async function tree(directory: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(files, await tree(path));
    else files[path] = (await readFile(path)).toString("base64");
  }
  return files;
}
async function form(workspace: string, history: string, name: string, kind: string) {
  const path = join(workspace, `${kind}-review.json`);
  const generated = await command(["review-template", "--from", "v001", "--name", name, "--output", history,
    "--kind", kind, "--template", path]);
  expect(generated.code, JSON.stringify(generated)).toBe(0);
  const review = JSON.parse(await readFile(path, "utf8"));
  review.reviewer = "synthetic contract fixture; not actual acceptance";
  review.viewed = true;
  for (const entry of review[kind === "html" ? "states" : "frames"]) {
    entry.observations = { readingOrder: "Fixture.", density: "Fixture.", occlusion: "Fixture.", narrative: "Fixture." };
  }
  await writeFile(path, JSON.stringify(review));
  return { path, review };
}

test.skipIf(!browser)("combined independent review writes one record, repeats without writes, and finalizes the same files", async () => {
  const name = "independent";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--checkpoint", "--preview", "--input", input, "--name", name, "--output", history, "--browser", browser!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const html = await form(workspace, history, name, "html");
  const visual = await form(workspace, history, name, "visual");
  const before = await tree(history);
  const args = ["review", "--from", "v001", "--name", name, "--output", history, "--html-review", html.path, "--visual-review", visual.path];
  const recorded = await command(args, { FLOWSVG_CACHE_DIR: input });
  expect(recorded.code, JSON.stringify(recorded)).toBe(0);
  expect(recorded.report).toMatchObject({ command: "review", status: "review-recorded", sourceRevision: "v001", revision: null,
    record: { id: expect.stringMatching(/^review-[a-f0-9]{64}$/), reused: false }, completion: { quality: "passed" } });
  expect(recorded.stderr).not.toMatch(/<launched> pid=|Capturing|Preparing the isolated/);
  const after = await tree(history);
  for (const [path, bytes] of Object.entries(before)) expect(after[path]).toBe(bytes);
  expect(Object.keys(after).filter((path) => !(path in before))).toHaveLength(1);
  const repeated = await command(args, { FLOWSVG_CACHE_DIR: input });
  expect(repeated.code, JSON.stringify(repeated)).toBe(0);
  expect(repeated.report).toMatchObject({ record: { id: (recorded.report.record as { id: string }).id, reused: true } });
  expect(await tree(history)).toEqual(after);
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary).toMatchObject({ completion: { quality: "passed" }, reviewRecords: { adopted: [(recorded.report.record as { id: string }).id] },
    htmlInspection: { coverage: { viewed: 1, unviewed: 0 } } });
  expect(await readFile(join(root, ".diagrams", name, "diagram.json"), "utf8")).toBe(JSON.stringify(document));
  expect(summary.visual.scope).toMatch(/Only|recorded/);
}, 90_000);

test.skipIf(!browser)("same HTML state reviewed in two ancestors counts once and a later clean observation preserves prior issues", async () => {
  const name = "partial";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify({ ...document, scenes: [{ id: "change", label: "Change", beats: [
    { durationMs: 400, transitionMs: 200, actions: [{ type: "updateNode", target: "a", value: { label: "Done" } }] }
  ] }] }));
  const first = await command(["author", "--checkpoint", "--preview", "--input", input, "--name", name, "--output", history, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  const html = await form(workspace, history, name, "html");
  const all = [...html.review.states];
  expect(all.length).toBeGreaterThan(1);
  html.review.states = [all[0]];
  html.review.states[0].issues = [{ reason: "Synthetic prior issue.", nextStep: "Await a real decision." }];
  await writeFile(html.path, JSON.stringify(html.review));
  const firstReview = await command(["review", "--from", "v001", "--name", name, "--output", history, "--html-review", html.path]);
  expect(firstReview.code, JSON.stringify(firstReview)).toBe(0);
  expect(firstReview.report).toMatchObject({ completion: { quality: "unresolved-issues" } });
  const second = await command(["author", "--checkpoint", "--preview", "--from", "v001", "--name", name, "--output", history, "--browser", browser!]);
  expect(second.code, JSON.stringify(second)).toBe(0);
  const secondReport = second.report as { htmlInspection: { states: { id: string; sha256: string }[] } };
  html.review.states = [{ ...secondReport.htmlInspection.states[0], observations: all[0].observations, issues: [] }];
  delete html.review.states[0].path;
  for (const key of Object.keys(html.review.states[0])) if (!["id", "sha256", "observations", "issues"].includes(key)) delete html.review.states[0][key];
  await writeFile(html.path, JSON.stringify(html.review));
  const secondReview = await command(["review", "--from", "v002", "--name", name, "--output", history, "--html-review", html.path]);
  expect(secondReview.code, JSON.stringify(secondReview)).toBe(0);
  expect(secondReview.report).toMatchObject({ completion: { quality: "unresolved-issues" } });
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v002", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.htmlInspection.coverage.viewed).toBe(1);
  expect(summary.htmlInspection.viewedStates).toHaveLength(1);
  expect(summary.completion.quality).toBe("unresolved-issues");
  expect(summary.htmlInspection.viewedStates[0].issues).toContainEqual({ reason: "Synthetic prior issue.", nextStep: "Await a real decision." });
  expect(summary.reviewRecords.adopted).toHaveLength(2);
}, 90_000);


test.skipIf(!browser)("tampered recorded screenshot, HTML and review bytes cannot pass finalization or replace prior files", async () => {
  const name = "tamper";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--checkpoint", "--preview", "--input", input, "--name", name, "--output", history, "--svg", "--browser", browser!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const html = await form(workspace, history, name, "html");
  const visual = await form(workspace, history, name, "visual");
  const sourceHtmlPath = join(history, name, "v001/diagram.html");
  const sourceHtmlBytes = await readFile(sourceHtmlPath);
  await writeFile(sourceHtmlPath, "changed delivered HTML");
  const invalidVisual = await command(["review", "--from", "v001", "--name", name, "--output", history, "--visual-review", visual.path]);
  expect(invalidVisual.code).toBe(1);
  await writeFile(sourceHtmlPath, sourceHtmlBytes);
  const recorded = await command(["review", "--from", "v001", "--name", name, "--output", history, "--html-review", html.path]);
  expect(recorded.code, JSON.stringify(recorded)).toBe(0);
  const args = ["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"];
  const finalized = await command(args);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const delivered = await tree(join(root, ".diagrams", name));
  expect(Object.keys(delivered).some((path) => path.endsWith("diagram.svg"))).toBe(true);
  const screenshot = (source.report as { htmlInspection: { states: { path: string }[] } }).htmlInspection.states[0].path;
  const htmlFile = join(history, name, "v001/diagram.html");
  const recordFile = (recorded.report.record as { path: string }).path;
  for (const path of [screenshot, htmlFile, recordFile]) {
    const bytes = await readFile(path);
    await writeFile(path, "tampered");
    const rejected = await command(args);
    expect(rejected.code, path).toBe(1);
    expect(await tree(join(root, ".diagrams", name))).toEqual(delivered);
    await writeFile(path, bytes);
  }
}, 90_000);

test("review rejects missing source or unrelated execution flags without creating task files", async () => {
  const missing = await command(["review"]);
  expect(missing.code).toBe(1);
  expect(missing.report).toMatchObject({ diagnostics: [expect.objectContaining({ code: "REVIEW_ARGUMENT_REQUIRED" })] });
  const scoped = await command(["review", "--from", "v001", "--name", "none", "--browser", "none"]);
  expect(scoped.code).toBe(1);
  expect(scoped.report).toMatchObject({ diagnostics: [expect.objectContaining({ code: "ERR_OPTION_SCOPE" })] });
  await expect(readFile(join(root, ".diagrams/.history/none/v001/report.json"))).rejects.toMatchObject({ code: "ENOENT" });
});

test.skipIf(!browser)("ancestor reviews cannot shrink a selected plan or cover a different selected display", async () => {
  const name = "requirements";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const first = await command(["author", "--checkpoint", "--preview", "--input", input, "--name", name, "--output", history, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  const html = await form(workspace, history, name, "html");
  expect((await command(["review", "--from", "v001", "--name", name, "--output", history, "--html-review", html.path])).code).toBe(0);
  const second = await command(["author", "--checkpoint", "--preview", "--from", "v001", "--name", name, "--output", history, "--browser", "none"]);
  expect(second.code, JSON.stringify(second)).toBe(0);
  const reportPath = join(history, name, "v002/report.json");
  const target = JSON.parse(await readFile(reportPath, "utf8"));
  const args = ["finalize", "--workspace", workspace, "--name", name, "--from", "v002", "--keep-work"];
  for (const mutation of ["plan", "display"]) {
    const modified = structuredClone(target);
    if (mutation === "plan") modified.htmlInspection.plan.points.push({ ...modified.htmlInspection.plan.points[0], id: "additional-required-state" });
    else modified.htmlInspection.display.viewport.width = 720;
    await writeFile(reportPath, JSON.stringify(modified));
    const finalized = await command(args);
    if (finalized.code === 0) expect((finalized.report.completion as { quality: string }).quality, mutation).not.toBe("passed");
    else expect(finalized.report.status).toBe("failed");
  }
}, 90_000);

test("removed design decisions are rejected without changing saved sources", async () => {
  const name = "no-design-gate";
  const history = join(root, ".diagrams/.work", name, "task/history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  expect((await command(["author", "--checkpoint", "--input", input, "--name", name, "--output", history, "--browser", "none"])).code).toBe(0);
  const before = await tree(history);
  const rejected = await command(["author", "--from", "v001", "--name", name, "--output", history, "--decisions", "unused.json"]);
  expect(rejected.code).toBe(1);
  expect(rejected.report).toMatchObject({ diagnostics: [expect.objectContaining({ code: "ERR_PARSE_ARGS_UNKNOWN_OPTION" })] });
  expect(await tree(history)).toEqual(before);
});
