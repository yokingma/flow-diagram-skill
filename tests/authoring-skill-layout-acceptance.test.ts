/** High-density static layout acceptance through the copied CLI contract. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG layout acceptance ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
  await cp(resolve("skills/flow-diagram/examples/layout-assistance.json"), join(root, "layout-assistance.json"));
  await cp(resolve("skills/flow-diagram/examples/layout-assistance-plan.json"), join(root, "layout-assistance-plan.json"));
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
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}
type JsonNode = { id: string; kind: string; parentId?: string; label?: string; content?: unknown; x?: number; y?: number; height?: number; [key: string]: unknown };
type JsonEdge = { id: string; from: string; to: string; label?: string; [key: string]: unknown };
type JsonDraft = { nodes: JsonNode[]; edges: JsonEdge[]; scenes: unknown[]; [key: string]: unknown };
const json = async (path: string) => JSON.parse(await readFile(path, "utf8")) as JsonDraft;
const semantic = (draft: JsonDraft) => ({
  nodes: draft.nodes.map((node) => ({ id: node.id, kind: node.kind, parentId: node.parentId, label: node.label, content: node.content })),
  edges: draft.edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to, label: edge.label })), scenes: draft.scenes
});

test("31-node fixture measures and lays out deterministically while preserving semantics", async () => {
  const source = join(root, "layout-assistance.json");
  const plan = join(root, "layout-assistance-plan.json");
  const measured = join(root, "measured.json");
  const first = join(root, "layout.json");
  const repeat = join(root, "layout-repeat.json");
  expect((await json(source)).nodes).toHaveLength(31);
  expect((await json(source)).nodes.filter((node) => node.kind === "group")).toHaveLength(7);
  expect((await json(source)).edges).toHaveLength(4);
  const sourceBytes = await readFile(source, "utf8");
  const planBytes = await readFile(plan, "utf8");
  const measuredResult = await command(["measure", "--input", source, "--output", measured]);
  expect(measuredResult.code, measuredResult.stdout + measuredResult.stderr).toBe(0);
  const measuredReport = JSON.parse(measuredResult.stdout);
  expect(measuredReport.measurement.nodes).toHaveLength(31);
  expect(measuredReport.measurement.nodes.filter((node: { contentVersions?: number }) => node.contentVersions === undefined)).toHaveLength(19);
  expect(measuredReport.measurement.nodes.filter((node: { requiredHeight?: number; estimatedLineCount?: number }) =>
    Number.isFinite(node.requiredHeight) && Number.isFinite(node.estimatedLineCount))).toHaveLength(31);
  const result = await command(["layout", "--input", measured, "--plan", plan, "--output", first]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({ command: "layout", status: "laid-out", checks: { validation: "passed", plan: "passed", compilation: "passed" }, strategy: "layered" });
  expect(report.overrides).toContainEqual(expect.objectContaining({ nodeId: "control-plane" }));
  expect(report.diagnostics.some((item: { code?: string }) => item.code === "node-overlap")).toBe(true);
  const original = await json(source);
  const laidOut = await json(first);
  expect(semantic(laidOut)).toEqual(semantic(original));
  expect(laidOut.nodes).toHaveLength(31);
  expect(await readFile(source, "utf8")).toBe(sourceBytes);
  expect(await readFile(plan, "utf8")).toBe(planBytes);
  const repeated = await command(["layout", "--input", measured, "--plan", plan, "--output", repeat]);
  expect(repeated.code, repeated.stdout + repeated.stderr).toBe(0);
  expect(await readFile(first, "utf8")).toBe(await readFile(repeat, "utf8"));
}, 90_000);

test("Chinese content changes reuse the same plan and move later geometry without manual coordinates", async () => {
  const source = join(root, "layout-assistance.json");
  const plan = join(root, "layout-assistance-plan.json");
  const changed = join(root, "layout-assistance-changed.json");
  const measured = join(root, "changed-measured.json");
  const output = join(root, "changed-layout.json");
  const original = await json(source);
  const changedDocument = { ...original, nodes: original.nodes.map((node) => node.id === "card-01" || node.id === "card-10"
    ? { ...node, content: { blocks: [{ type: "title", text: "修改后的中文标题" }, { type: "paragraph", text: "这段较长的中文教学内容用于验证完整测量、稳定分层和后续层位置调整。".repeat(8) }] } }
    : node.id === "summary-1" || node.id === "control-plane"
      ? { ...node, label: `${node.label} · 修改后的中文说明` } : node) };
  await writeFile(changed, JSON.stringify(changedDocument, null, 2) + "\n");
  const measuredResult = await command(["measure", "--input", changed, "--output", measured]);
  expect(measuredResult.code, measuredResult.stdout + measuredResult.stderr).toBe(0);
  const result = await command(["layout", "--input", measured, "--plan", plan, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.measuredNodes).toEqual(expect.arrayContaining([expect.objectContaining({ nodeId: "card-01" }), expect.objectContaining({ nodeId: "card-10" })]));
  expect(report.labelOnlyMeasurements).toEqual(expect.arrayContaining([
    expect.objectContaining({ nodeId: "summary-1", requiredHeight: expect.any(Number) }),
    expect.objectContaining({ nodeId: "control-plane", requiredHeight: expect.any(Number) })
  ]));
  const written = await json(output);
  const changedCard = written.nodes.find((node) => node.id === "card-01");
  const originalCard = original.nodes.find((node) => node.id === "card-01");
  const secondLayer = written.nodes.find((node) => node.id === "layer-2");
  expect(changedCard?.height).toBeGreaterThan(originalCard?.height ?? 0);
  expect(secondLayer?.y).toBeGreaterThan(300);
  expect(semantic(written)).toEqual(semantic(changedDocument));
}, 90_000);

test("layout output remains subject to author quality gates and PNG is incomplete without a browser", async () => {
  const input = join(root, "layout-assistance.json");
  const plan = join(root, "layout-assistance-plan.json");
  const output = join(root, "quality-layout.json");
  const authorRoot = join(root, "history");
  const result = await command(["layout", "--input", input, "--plan", plan, "--output", output]);
  expect(result.code, result.stdout).toBe(0);
  const authored = await command(["author", "--input", output, "--name", "layout-assistance", "--output", authorRoot, "--svg", "--png", "--browser", "none"]);
  expect(authored.code).toBe(1);
  const report = JSON.parse(authored.stdout);
  expect(report.completion.delivery).toBe("incomplete");
  expect(report.completion.completed).toContain("svg");
  expect(report.completion.completed).not.toContain("png");
  expect(["incomplete", "needs-user-decision"]).toContain(report.qualityCoverage.status);
  expect(report.qualityCoverage.required).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: "artifact", format: "png", status: "incomplete" })
  ]));
}, 90_000);
