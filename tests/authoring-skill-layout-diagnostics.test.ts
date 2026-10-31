/** Diagnostics and estimates are observed through the copied installed CLI. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG diagnostics ")));
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
    child.stdout.on("data", (data) => { stdout += data; }); child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("measure reports deterministic baseline estimates for each content version", async () => {
  const input = join(root, "versions.json");
  await writeFile(input, JSON.stringify({ kind: "rect", width: 180, typography: { nodeLabel: 18 }, content: [
    { blocks: [{ type: "paragraph", text: "第一版中文内容" }] },
    { blocks: [{ type: "paragraph", text: "第二版中文内容需要更长并换行。".repeat(8) }] }
  ] }));
  const result = await command(["measure", "--input", input]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.measurement).toMatchObject({ estimatedLineCount: expect.any(Number), estimatedLineCountMethod: "public-sdk-baseline-y-estimate",
    perContent: [
      { index: 0, estimatedLineCount: expect.any(Number), estimatedLineCountMethod: "public-sdk-baseline-y-estimate" },
      { index: 1, estimatedLineCount: expect.any(Number), estimatedLineCountMethod: "public-sdk-baseline-y-estimate" }
    ] });
  expect(report.measurement.estimatedLineCount).toBe(Math.max(...report.measurement.perContent.map((item: { estimatedLineCount: number }) => item.estimatedLineCount)));
}, 60_000);

test("warning groups retain each time and identity while leaving flat decisions intact", async () => {
  const input = join(root, "warning-groups.json");
  await writeFile(input, JSON.stringify({ version: 1, viewport: { width: 400, height: 240 }, nodes: [
    { id: "a", kind: "rect", x: 20, y: 20, width: 100, height: 60, label: "a" },
    { id: "b", kind: "rect", x: 60, y: 40, width: 100, height: 60, label: "b" }
  ], edges: [], scenes: [{ id: "move", label: "move", beats: [{ durationMs: 100, transitionMs: 20, actions: [{ type: "updateNode", target: "b", value: { x: 220 } }] }] }] }));
  const result = await command(["author", "--input", input, "--name", "warning-groups", "--output", join(root, "history"), "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.layout.warningGroups.length).toBeGreaterThan(0);
  const group = report.layout.warningGroups.find((item: { code: string }) => item.code === "node-overlap");
  expect(group).toMatchObject({ objectId: expect.any(String), relatedObjectIds: expect.any(Array), count: expect.any(Number), records: expect.any(Array) });
  expect(group.records.every((record: { issueId: string; warningKey: string; timeMs: number; location: string }) => record.issueId && record.warningKey && Number.isFinite(record.timeMs) && record.location)).toBe(true);
  expect(report.diagnostics.filter((item: { code: string }) => item.code === "node-overlap").length).toBeGreaterThanOrEqual(group.count);
  const saved = JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"));
  expect(saved.diagnostics.length).toBe(report.diagnostics.length);
  expect(saved.layout.warningGroups).toEqual(report.layout.warningGroups);
}, 60_000);


test.each([
  ["rect", 16, "中文\n标签", 64],
  ["group", 20, "Latin\nheading", 74],
  ["ellipse", 24, "中文\nLatin", 84]
])("%s label estimates agree across measure, layout and validate at font size %s", async (kind, fontSize, label, requiredHeight) => {
  const input = join(root, `label-${kind}.json`);
  const plan = join(root, `label-${kind}-plan.json`);
  const output = join(root, `label-${kind}-output.json`);
  const document = { version: 1, viewport: { width: 400, height: 240 }, typography: { nodeLabel: fontSize }, nodes: [
    { id: "label", kind, x: 0, y: 0, width: 200, height: 1, label }
  ], edges: [], scenes: [] };
  await writeFile(input, JSON.stringify(document));
  const measured = await command(["measure", "--input", input]);
  const repeat = await command(["measure", "--input", input]);
  expect(measured.code, measured.stdout).toBe(0);
  expect(repeat.stdout).toBe(measured.stdout);
  expect(JSON.parse(measured.stdout).measurement.nodes[0]).toMatchObject({ requiredHeight, estimatedLineCount: 2 });
  await writeFile(plan, JSON.stringify({ schemaVersion: 1, strategy: "layered", layers: ["label"], overrides: { label: { height: 1 } } }));
  const layout = await command(["layout", "--input", input, "--plan", plan, "--output", output]);
  expect(layout.code, layout.stdout).toBe(0);
  expect(JSON.parse(layout.stdout).labelOnlyMeasurements[0]).toMatchObject({ requiredHeight, estimatedLineCount: 2 });
  const validated = await command(["validate", "--input", output, "--name", `label-${kind}`, "--output", join(root, "history")]);
  expect(validated.code, validated.stdout).toBe(0);
  expect(JSON.parse(validated.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "text-overflow", currentHeight: 1, requiredHeight, estimatedLineCount: 2 }));
}, 60_000);
