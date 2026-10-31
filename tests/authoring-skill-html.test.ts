/** Actual offline HTML inspection is separate from SDK preview capture and model review. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const document = { version: 1, title: "实际 HTML", viewport: { width: 480, height: 280 },
  nodes: [{ id: "source", kind: "roundedRect", x: 20, y: 80, width: 140, height: 80, label: "来源" },
    { id: "target", kind: "roundedRect", x: 320, y: 80, width: 140, height: 80, label: "目标" }],
  edges: [{ id: "request", from: "source", to: "target", fromPort: "right", toPort: "left" }], scenes: [] };

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG html inspection ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-svg-diagram"), skill, { recursive: true });
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
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("browser-free authoring records that actual HTML inspection was not run", async () => {
  const input = join(root, "static.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "html-static", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.checks.html).toBe("not-run");
  expect(report.htmlInspection).toMatchObject({ status: "not-run", sourceRevision: report.revision.id, states: [] });
  expect(report.htmlInspection.reason).toMatch(/browser|inspection/i);
  expect(await readFile(join(report.revision.directory, "report.json"), "utf8")).toContain('"htmlInspection"');
  expect(await readFile(join(report.revision.directory, "report.md"), "utf8")).toContain("HTML inspection");
});

test("rejects HTML review evidence outside the author command", async () => {
  const reviewPath = join(root, "out-of-scope-review.json");
  await writeFile(reviewPath, "{}");
  const result = await command(["doctor", "--html-review", reviewPath]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "ERR_OPTION_SCOPE", location: "html-review" }));
});

test("an invalid explicit browser leaves a failed, explainable HTML inspection record", async () => {
  const input = join(root, "invalid-browser.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "html-invalid-browser", "--browser", join(root, "missing-browser")]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.htmlInspection).toMatchObject({ status: "failed", reason: expect.stringMatching(/executable|browser/i), resources: { browser: "not-created" } });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_BROWSER_FAILED" }));
});

test.skipIf(!browser)("inspection opens the delivered HTML, verifies paused offline state and records its file identity", async () => {
  const input = join(root, "static-browser.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "html-browser", "--browser", browser!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.checks.html).toBe("captured");
  expect(report.htmlInspection).toMatchObject({ status: "awaiting-review", sourceRevision: report.revision.id,
    file: { path: join(report.revision.directory, "diagram.html"), sha256: expect.stringMatching(/^[a-f0-9]{64}$/u) },
    states: [expect.objectContaining({ id: "html-frame-01", timeMs: 0, paused: true, offline: true })],
    resources: { page: "closed", context: "closed", browser: "closed" } });
  expect(report.htmlInspection.states[0].sha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(report.htmlInspection.states[0].controls).toMatchObject({ playLabel: "Play", progress: "0" });
}, 90_000);

test.skipIf(!browser)("HTML review binds each attestation to the inspected file and rejects changed evidence", async () => {
  const input = join(root, "review-source.json");
  const reviewPath = join(root, "html-review.json");
  await writeFile(input, JSON.stringify(document));
  const sourceResult = await command(["author", "--input", input, "--name", "html-review", "--browser", browser!]);
  const source = JSON.parse(sourceResult.stdout);
  const review = { reviewer: "synthetic HTML viewer", viewed: true, states: source.htmlInspection.states.map((state: { id: string; sha256: string }) => ({
    id: state.id, sha256: state.sha256,
    observations: { readingOrder: "Reviewed", density: "Reviewed", occlusion: "Reviewed", narrative: "Reviewed" }, issues: []
  })) };
  await writeFile(reviewPath, JSON.stringify(review));
  const reviewedResult = await command(["author", "--from", source.revision.id, "--name", "html-review", "--browser", "none", "--html-review", reviewPath]);
  expect(reviewedResult.code, reviewedResult.stdout + reviewedResult.stderr).toBe(0);
  const reviewed = JSON.parse(reviewedResult.stdout);
  expect(reviewed).toMatchObject({ checks: { html: "reviewed" }, htmlInspection: { status: "review-recorded", viewedStates: expect.any(Array) } });
  await writeFile(join(source.revision.directory, "diagram.html"), "tampered");
  const rejected = JSON.parse((await command(["author", "--from", source.revision.id, "--name", "html-review", "--browser", "none", "--html-review", reviewPath])).stdout);
  expect(rejected.status).toBe("failed");
  expect(rejected.diagnostics).toContainEqual(expect.objectContaining({ code: "HTML_REVIEW_INVALID" }));
}, 90_000);

test.skipIf(!browser)("animated HTML inspection records playback and compiled key states", async () => {
  const input = join(root, "animated.json");
  await writeFile(input, JSON.stringify({ ...document, scenes: [{ id: "step", label: "步骤", beats: [
    { durationMs: 500, transitionMs: 200, actions: [{ type: "updateNode", target: "target", value: { label: "完成" } }] }
  ] }] }));
  const result = await command(["author", "--input", input, "--name", "html-animated", "--browser", browser!]);
  const report = JSON.parse(result.stdout);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  expect(report.htmlInspection.playback).toMatchObject({ attempted: true, advanced: true, paused: true });
  expect(report.htmlInspection.plan.mode).toBe("animated");
  expect(report.htmlInspection.states.length).toBeGreaterThan(1);
  expect(report.htmlInspection.states).toContainEqual(expect.objectContaining({ timeMs: report.compilation.totalDurationMs }));
  expect(report.htmlInspection.states.every((state: { paused: boolean; offline: boolean }) => state.paused && state.offline)).toBe(true);
}, 90_000);
