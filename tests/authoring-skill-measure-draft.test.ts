import { readCommandReport } from "./helpers/cli-report";
/** Installed CLI contract for measuring diagram drafts and creating safe height-filled copies. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG draft measurement ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
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

const shortContent = { blocks: [{ type: "title", text: "订单" }] };
const longContent = { blocks: [
  { type: "title", text: "订单详情" },
  { type: "paragraph", text: "固定宽度节点中的较长内容需要在所有状态中保持完整可读。".repeat(8) }
] };

test("measure reads a draft by node ID and writes a new copy with only required height increases", async () => {
  const input = join(root, "draft.json");
  const output = join(root, "measured-draft.json");
  const original = { version: 1, viewport: { width: 600, height: 300 }, typography: { nodeLabel: 18 }, nodes: [
    { id: "order", kind: "roundedRect", x: 20, y: 20, width: 220, height: 40, content: shortContent },
    { id: "empty", kind: "rect", x: 300, y: 20, width: 100, height: 80, label: "已有高度" }
  ], edges: [], scenes: [{ id: "details", label: "详情", beats: [{ durationMs: 100, actions: [
    { type: "updateNode", target: "order", value: { content: longContent } }
  ] }] }] };
  const bytes = JSON.stringify(original, null, 2) + "\n";
  await writeFile(input, bytes);
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "measured", stage: "measurement", measurement: { kind: "draft", nodes: expect.any(Array), output: output } });
  expect(report.measurement.nodes).toContainEqual(expect.objectContaining({ nodeId: "order", currentHeight: 40, recommendedHeight: expect.any(Number), contentVersions: 2, diagnostics: [] }));
  const written = JSON.parse(await readFile(output, "utf8"));
  expect(written.nodes.find((node: { id: string }) => node.id === "order").height).toBeGreaterThan(40);
  expect(written.nodes.find((node: { id: string }) => node.id === "empty").height).toBe(80);
  expect(await readFile(input, "utf8")).toBe(bytes);
});

test("measure includes label-only nodes with a deterministic height recommendation", async () => {
  const input = join(root, "label-only-draft.json");
  const output = join(root, "label-only-measured.json");
  const original = { version: 1, viewport: { width: 420, height: 180 }, typography: { nodeLabel: 20 }, nodes: [
    { id: "summary", kind: "roundedRect", x: 20, y: 20, width: 90, height: 24, label: "中文摘要需要换行并保留完整说明" },
    { id: "single", kind: "rect", x: 160, y: 20, width: 180, height: 60, label: "Latin summary" }
  ], edges: [], scenes: [] };
  await writeFile(input, JSON.stringify(original, null, 2) + "\n");
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.measurement.nodes).toContainEqual(expect.objectContaining({
    nodeId: "summary", currentHeight: 24, requiredHeight: expect.any(Number), recommendedHeight: expect.any(Number),
    heightChange: expect.any(Number), estimatedLineCount: expect.any(Number), estimatedLineCountMethod: "public-sdk-baseline-y-estimate"
  }));
  const summary = report.measurement.nodes.find((node: { nodeId: string }) => node.nodeId === "summary");
  expect(summary.estimatedLineCount).toBeGreaterThan(1);
  expect(summary.requiredHeight).toBe(summary.recommendedHeight);
  expect(summary.heightChange).toBe(summary.requiredHeight - summary.currentHeight);
  expect(report.measurement.nodes.find((node: { nodeId: string }) => node.nodeId === "single").estimatedLineCount).toBe(1);
  const written = JSON.parse(await readFile(output, "utf8"));
  expect(written.nodes.find((node: { id: string }) => node.id === "summary").height).toBe(summary.requiredHeight);
  expect(await readFile(input, "utf8")).toBe(JSON.stringify(original, null, 2) + "\n");
});

test("measure supports standalone label and mixed label/content inputs", async () => {
  const labelInput = join(root, "label-input.json");
  await writeFile(labelInput, JSON.stringify({ kind: "rect", width: 90, label: "需要换行的标签", typography: { nodeLabel: 20 } }));
  const labelResult = await command(["measure", "--input", labelInput]);
  expect(labelResult.code, labelResult.stdout + labelResult.stderr).toBe(0);
  const labelMeasurement = (await readCommandReport(labelResult.stdout)).measurement;
  expect(labelMeasurement).toMatchObject({ height: expect.any(Number), requiredHeight: expect.any(Number), estimatedLineCount: expect.any(Number) });
  expect(labelMeasurement.estimatedLineCount).toBeGreaterThan(1);

  const mixedInput = join(root, "mixed-input.json");
  await writeFile(mixedInput, JSON.stringify({ kind: "rect", width: 120, label: "标签", content: {
    blocks: [{ type: "paragraph", text: "结构化内容也需要测量".repeat(4) }]
  }, typography: { nodeLabel: 18 } }));
  const mixedResult = await command(["measure", "--input", mixedInput]);
  expect(mixedResult.code, mixedResult.stdout + mixedResult.stderr).toBe(0);
  expect((await readCommandReport(mixedResult.stdout)).measurement).toMatchObject({ height: expect.any(Number), requiredHeight: expect.any(Number), diagnostics: [] });
}, 60_000);

test("mixed standalone labels preserve every content-version result and batch labels remain metadata", async () => {
  const input = join(root, "mixed-versions.json");
  const versions = [shortContent, longContent];
  await writeFile(input, JSON.stringify({ kind: "rect", width: 180, label: "标签", content: versions }));
  const mixed = await command(["measure", "--input", input]);
  expect(mixed.code, mixed.stdout + mixed.stderr).toBe(0);
  const measurement = (await readCommandReport(mixed.stdout)).measurement;
  expect(measurement.perContent).toHaveLength(2);
  expect(measurement.drivenBy).toBe(1);
  expect(measurement.height).toBe(measurement.perContent[1].height);
  expect(measurement.estimatedLineCount).toBe(measurement.perContent[1].estimatedLineCount);

  await writeFile(input, JSON.stringify([{ kind: "rect", width: 180, label: "Descriptive metadata ".repeat(20), content: shortContent }]));
  const batch = await command(["measure", "--input", input]);
  expect(batch.code, batch.stdout + batch.stderr).toBe(0);
  expect((await readCommandReport(batch.stdout)).measurement.items[0]).toMatchObject({ label: "Descriptive metadata ".repeat(20),
    height: measurement.perContent[0].height, estimatedLineCount: measurement.perContent[0].estimatedLineCount });
}, 60_000);

test("animated size changes stop draft height application and protect an existing output", async () => {
  const input = join(root, "animated-draft.json");
  const output = join(root, "existing-output.json");
  await writeFile(input, JSON.stringify({ version: 1, viewport: { width: 400, height: 240 }, nodes: [
    { id: "card", kind: "rect", x: 20, y: 20, width: 180, height: 40, content: longContent }
  ], edges: [], scenes: [{ id: "resize", label: "resize", beats: [{ durationMs: 100, actions: [
    { type: "updateNode", target: "card", value: { width: 240 } }
  ] }] }] }));
  await writeFile(output, "keep me");
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_SIZE_ANIMATION", objectId: "card", location: "nodes[0]" }));
  expect(await readFile(output, "utf8")).toBe("keep me");
});

test("measurement estimates preserve the source and allow the requested output", async () => {
  const input = join(root, "overflow-draft.json");
  const output = join(root, "overflow-output.json");
  const bytes = JSON.stringify({ version: 1, viewport: { width: 400, height: 240 }, nodes: [
    { id: "graph-card", kind: "rect", x: 20, y: 20, width: 40, height: 40, content: { blocks: [{ type: "paragraph", text: "内容".repeat(20) }] } }
  ], edges: [], scenes: [] });
  await writeFile(input, bytes);
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code).toBe(0);
  expect((await readCommandReport(result.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_ESTIMATE", objectId: "graph-card" }));
  expect(JSON.parse(await readFile(output, "utf8")).nodes[0].content).toEqual(JSON.parse(bytes).nodes[0].content);
  expect(await readFile(input, "utf8")).toBe(bytes);
});


test("invalid label draft fields and existing outputs cannot publish a height-filled draft", async () => {
  const input = join(root, "invalid-label-draft.json");
  const output = join(root, "protected-label-output.json");
  const node = { id: "label", kind: "rect", x: 0, y: 0, width: 100, height: 1, label: "Label" };
  const document = { version: 1, viewport: { width: 400, height: 240 }, nodes: [node], edges: [], scenes: [] };
  await writeFile(output, "existing target");
  for (const invalidNode of [{ ...node, id: undefined }, { ...node, width: 0 }]) {
    const bytes = JSON.stringify({ ...document, nodes: [invalidNode] });
    await writeFile(input, bytes);
    const result = await command(["measure", "--input", input, "--output", output]);
    expect(result.code, result.stdout).toBe(1);
    expect(await readFile(input, "utf8")).toBe(bytes);
    expect(await readFile(output, "utf8")).toBe("existing target");
  }
  await writeFile(input, JSON.stringify(document));
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code, result.stdout).toBe(1);
  expect((await readCommandReport(result.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_OUTPUT_EXISTS" }));
  expect(await readFile(output, "utf8")).toBe("existing target");
}, 60_000);

test("standalone label measurement rejects unknown fields and invalid labels", async () => {
  const input = join(root, "invalid-label-input.json");
  for (const measurement of [
    { kind: "rect", width: 120, label: "Label", contentTypo: {} },
    { kind: "rect", width: 120, label: 42 },
    { kind: "rect", width: 0, label: "Label" }
  ]) {
    await writeFile(input, JSON.stringify(measurement));
    const result = await command(["measure", "--input", input]);
    expect(result.code, result.stdout + result.stderr).toBe(1);
    expect((await readCommandReport(result.stdout)).status).toBe("failed");
  }
}, 60_000);

test("draft diagnostics locate every original block and animated version without losing SDK details", async () => {
  const input = join(root, "located-diagnostics.json");
  const output = join(root, "located-output.json");
  const badGraph = { type: "graph", height: 12, nodes: [{ id: "entity", label: "E", x: 200, y: 0 }], edges: [] };
  const overflowing = { blocks: [badGraph, badGraph] };
  const bytes = JSON.stringify({ version: 1, viewport: { width: 600, height: 400 }, nodes: [
    { id: "健康", kind: "rect", x: 0, y: 0, width: 180, height: 40, content: shortContent },
    { id: "节点.一", kind: "rect", x: 200, y: 0, width: 180, height: 40, content: overflowing }
  ], edges: [], scenes: [{ id: "scene", label: "Scene", beats: [{ durationMs: 100, actions: [
    { type: "updateNode", target: "节点.一", value: { content: overflowing } }
  ] }] }] });
  await writeFile(input, bytes);
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.status).toBe("measured");
  expect(report).toHaveProperty("measurement");
  expect(report.diagnostics).toHaveLength(8);
  for (const [versionIndex, prefix] of [[0, "nodes[1].content"], [1, "scenes[0].beats[0].actions[0].value.content"]] as const) {
    for (const blockIndex of [0, 1]) for (const dimension of ["width", "height"]) {
      expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_ESTIMATE", objectId: "节点.一",
        location: `${prefix}.blocks[${blockIndex}]`, sourcePath: `${prefix}.blocks[${blockIndex}]`,
        versionIndex, dimension, path: `content[${versionIndex}].blocks[${blockIndex}]`, nextStep: expect.any(String) }));
    }
  }
  const width = report.diagnostics.find((issue: { dimension: string }) => issue.dimension === "width");
  const height = report.diagnostics.find((issue: { dimension: string }) => issue.dimension === "height");
  expect(width.nextStep).not.toBe(height.nextStep);
  expect(width.nextStep).toContain("width");
  expect(height.nextStep).toContain("negative");
  expect(await readFile(input, "utf8")).toBe(bytes);
  expect(JSON.parse(await readFile(output, "utf8")).nodes[1].content).toEqual(overflowing);
}, 60_000);

test("standalone and batch diagnostics locate version arrays while batch labels stay metadata", async () => {
  const input = join(root, "independent-diagnostics.json");
  const graph = { blocks: [{ type: "graph", height: 10,
    nodes: [{ id: "entity", label: "E", x: 200, y: 100 }], edges: [] }] };
  const item = { kind: "rect", width: 180, content: [shortContent, graph] };
  await writeFile(input, JSON.stringify(item));
  const single = await command(["measure", "--input", input]);
  expect(single.code, single.stdout + single.stderr).toBe(0);
  const measurement = (await readCommandReport(single.stdout)).measurement;
  expect(measurement.diagnostics).toHaveLength(2);
  expect(measurement.diagnostics).toContainEqual(expect.objectContaining({ versionIndex: 1, dimension: "height",
    path: "content[1].blocks[0]", sourcePath: "content[1].blocks[0]", nextStep: expect.any(String) }));
  expect(measurement.perContent[1].diagnostics).toContainEqual(expect.objectContaining({ sourcePath: "content[1].blocks[0]" }));
  await writeFile(input, JSON.stringify([{ ...item, label: "Metadata does not become measured text" }]));
  const batch = await command(["measure", "--input", input]);
  expect(batch.code, batch.stdout + batch.stderr).toBe(0);
  const batchItem = (await readCommandReport(batch.stdout)).measurement.items[0];
  expect(batchItem.label).toBe("Metadata does not become measured text");
  expect(batchItem.height).toBe(measurement.height);
  expect(batchItem.diagnostics).toContainEqual(expect.objectContaining({ versionIndex: 1, dimension: "width",
    path: "content[1].blocks[0]", sourcePath: "[0].content[1].blocks[0]", nextStep: expect.any(String) }));
  expect(batchItem.perContent[1].diagnostics).toContainEqual(expect.objectContaining({ sourcePath: "[0].content[1].blocks[0]" }));
}, 60_000);

test("batch validation and preset label diagnostics retain actual source fields", async () => {
  const input = join(root, "batch-source-fields.json");
  await writeFile(input, JSON.stringify([{ kind: "rect", width: 180, content: { blocks: [{ type: "paragraph", text: "Valid", typo: true }] } }]));
  const invalid = await command(["measure", "--input", input]);
  expect(invalid.code, invalid.stdout + invalid.stderr).toBe(1);
  expect((await readCommandReport(invalid.stdout)).diagnostics).toContainEqual(expect.objectContaining({ location: "[0].content.blocks[0].typo" }));

  await writeFile(input, JSON.stringify({ kind: "diamond", width: 24, label: ["", "界"] }));
  const standalone = await command(["measure", "--input", input]);
  expect(standalone.code, standalone.stdout + standalone.stderr).toBe(0);
  expect((await readCommandReport(standalone.stdout)).measurement.diagnostics).toContainEqual(expect.objectContaining({
    versionIndex: 1, dimension: "width", path: "label[1]", sourcePath: "label[1]" }));

  await writeFile(input, JSON.stringify({ version: 1, viewport: { width: 300, height: 300 }, nodes: [
    { id: "判断.甲", kind: "diamond", x: 0, y: 0, width: 24, height: 100, label: "" }
  ], edges: [], scenes: [{ id: "labels", label: "Labels", beats: [{ durationMs: 100, actions: [
    { type: "updateNode", target: "判断.甲", value: { label: "界" } }
  ] }] }] }));
  const draft = await command(["measure", "--input", input]);
  expect(draft.code, draft.stdout + draft.stderr).toBe(0);
  expect((await readCommandReport(draft.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_ESTIMATE",
    objectId: "判断.甲", versionIndex: 1, path: "label[1]", dimension: "width",
    location: "scenes[0].beats[0].actions[0].value.label", sourcePath: "scenes[0].beats[0].actions[0].value.label" }));
  expect((await readCommandReport(draft.stdout))).toHaveProperty("measurement");
}, 60_000);
