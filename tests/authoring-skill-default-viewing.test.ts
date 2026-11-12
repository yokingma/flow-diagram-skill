/** Default viewing contracts exercise copied installed commands and actual captured files. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readCommandReport } from "./helpers/cli-report";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const diagram = { version: 1, viewport: { width: 500, height: 300 }, nodes: [
  { id: "one", kind: "rect", x: 60, y: 60, width: 240, height: 120, label: "One step" }
], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG default viewing ")));
  skill = join(root, "installed");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
  await writeFile(join(root, "diagram.json"), JSON.stringify(diagram));
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], { cwd: root,
      env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") } });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject); child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("default no-browser delivery has no formal quality judgment or required viewing count", async () => {
  const result = await command(["author", "--input", join(root, "diagram.json"), "--name", "no-browser", "--browser", "none", "--svg"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = await readCommandReport(result.stdout);
  expect(report.formalReview).toEqual({ status: "not-requested" });
  expect(report.completion.delivery).toBe("complete");
  expect(report.completion).not.toHaveProperty("quality");
  expect(report).not.toHaveProperty("qualityCoverage");
  expect(report.htmlInspection.status).toBe("not-run");
  expect(report.htmlInspection).not.toHaveProperty("coverage");
  expect(report.visual.status).toBe("not-requested");
  expect(report.diagnostics.some((item: { code: string }) => item.code === "HTML_BROWSER_UNAVAILABLE")).toBe(true);
  const markdown = await readFile(join(report.revision.directory, "report.md"), "utf8");
  expect(markdown).not.toContain("quality:");
  expect(markdown).not.toContain("Viewed frames: 0");
  expect(markdown).not.toContain("viewed 0");
}, 60_000);

test.skipIf(!browser)("default actual HTML capture is not a formal review and SDK capture is explicit", async () => {
  const result = await command(["author", "--input", join(root, "diagram.json"), "--name", "actual", "--browser", browser!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = await readCommandReport(result.stdout);
  expect(report.htmlInspection.status).toBe("captured");
  expect(report.htmlInspection.states).toHaveLength(1);
  expect(report.htmlInspection).not.toHaveProperty("coverage");
  expect(report.visual.status).toBe("not-requested");
  expect(report.artifacts.filter((item: { kind: string }) => item.kind === "preview")).toHaveLength(0);
  expect(await readdir(report.revision.directory)).not.toContain("previews");
  expect((await readFile(report.htmlInspection.states[0].path)).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  const preview = await command(["author", "--input", join(root, "diagram.json"), "--name", "preview", "--browser", browser!, "--preview"]);
  expect(preview.code, preview.stdout + preview.stderr).toBe(0);
  const requested = await readCommandReport(preview.stdout);
  expect(requested.visual.capturedFrames).toHaveLength(1);
  expect(requested.visual.status).toBe("captured");
  expect(requested.formalReview.status).toBe("not-requested");
}, 90_000);


test("unrequested formal review stays unrequested in the published report", async () => {
  const workspace = join(root, ".diagrams", ".work", "publish", "default");
  const history = join(workspace, "history");
  const authored = await command(["author", "--input", join(root, "diagram.json"), "--name", "publish", "--output", history, "--browser", "none"]);
  expect(authored.code, authored.stdout + authored.stderr).toBe(0);
  const source = await readCommandReport(authored.stdout);
  const finalized = await command(["finalize", "--workspace", workspace, "--name", "publish", "--from", source.revision.id]);
  expect(finalized.code, finalized.stdout + finalized.stderr).toBe(0);
  const report = JSON.parse(await readFile(join(root, ".diagrams", "publish", "report.json"), "utf8"));
  expect(report.formalReview).toEqual({ status: "not-requested" });
  expect(report.completion).not.toHaveProperty("quality");
  expect(report).not.toHaveProperty("qualityCoverage");
  const markdown = await readFile(join(root, ".diagrams", "publish", "report.md"), "utf8");
  expect(markdown).not.toContain("Quality:");
  expect(markdown).not.toContain("HTML states viewed:");
}, 60_000);


test.skipIf(!browser)("explicit formal HTML review records coverage without a geometry approval", async () => {
  const history = join(root, "formal-history");
  const authored = await command(["author", "--input", join(root, "diagram.json"), "--name", "formal", "--output", history,
    "--checkpoint", "--formal-review", "--browser", browser!]);
  expect(authored.code, authored.stdout + authored.stderr).toBe(0);
  const source = await readCommandReport(authored.stdout);
  expect(source.formalReview.status).toBe("incomplete");
  expect(source.checks.layout).toBe("not-run");
  expect(source.qualityCoverage.required.some((item: { kind: string }) => item.kind === "layout")).toBe(false);
  const form = join(root, "formal.json");
  await writeFile(form, JSON.stringify({ reviewer: "Synthetic coverage fixture, not visual acceptance", viewed: true,
    states: source.htmlInspection.states.map((state: { id: string; sha256: string }) => ({ id: state.id, sha256: state.sha256,
      observations: { readingOrder: "Fixture", density: "Fixture", occlusion: "Fixture", narrative: "Fixture" }, issues: [] })) }));
  const reviewed = await command(["review", "--name", "formal", "--from", source.revision.id, "--output", history, "--html-review", form]);
  expect(reviewed.code, reviewed.stdout + reviewed.stderr).toBe(0);
  const result = JSON.parse(reviewed.stdout);
  expect(result.formalReview.status).toBe("complete");
  expect(result.formalReview.meaning).toContain("design conclusions belong to the viewer");
  expect(result.completion.quality).toBe("passed");
}, 90_000);

test.skipIf(!browser)("two actual HTML samples cover distinct initial and final animation states without duplicate time-zero captures", async () => {
  const input = join(root, "two-stages.json");
  await writeFile(input, JSON.stringify({ ...diagram, scenes: [{ id: "stages", label: "Stages", beats: [
    { durationMs: 1000, transitionMs: 0, caption: "Initial explanation", actions: [] },
    { durationMs: 1000, transitionMs: 0, caption: "Completed explanation", actions: [{ type: "updateNode", target: "one", value: { label: "Completed step" } }] }
  ] }] }));
  const result = await command(["author", "--input", input, "--name", "two-stages", "--samples", "2", "--browser", browser!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = await readCommandReport(result.stdout);
  expect(report.htmlInspection.states.map((state: { timeMs: number }) => state.timeMs)).toEqual([0, 2000]);
  expect(report.htmlInspection.states[0].diagramText).toContain("One step");
  expect(report.htmlInspection.states[1].diagramText).toContain("Completed step");
  expect(report.htmlInspection.states[0].sha256).not.toBe(report.htmlInspection.states[1].sha256);
  expect(await readdir(join(report.revision.directory, "html-inspection"))).toHaveLength(2);
  expect(report.htmlInspection.plan.omitted.some((point: { timeMs: number }) => point.timeMs === 1000)).toBe(true);
}, 90_000);
