/** Optional text-layout records are observed through the independently copied installed CLI. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG estimated lines ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}
async function measure(name: string, input: unknown, args: string[] = []) {
  const path = join(root, `${name}.json`);
  await writeFile(path, JSON.stringify(input));
  const result = await command(["measure", "--input", path, ...args]);
  return { ...result, report: JSON.parse(result.stdout), path };
}

test("optional records preserve ordered mixed-script text roles without changing baseline estimates", async () => {
  const input = { kind: "rect", width: 180, content: { blocks: [{ type: "list", items: [
    { body: "Task 主体", auxiliary: "Note 辅助", status: "Ready", tags: [{ text: "A" }, { text: "B" }] }
  ] }] } };
  const baseline = await measure("roles-default", input);
  const detailed = await measure("roles-lines", input, ["--lines"]);
  expect(detailed.code, detailed.stdout + detailed.stderr).toBe(0);
  const { estimatedLines, ...rest } = detailed.report.measurement;
  expect(rest).toEqual(baseline.report.measurement);
  expect(baseline.report.measurement).not.toHaveProperty("estimatedLines");
  expect(detailed.report.measurement.estimatedLineCount).toBe(3);
  expect(estimatedLines).toEqual([
    { text: "A", sourcePath: "content.blocks[0].items[0].tags[0].text", versionIndex: 0, blockIndex: 0, itemIndex: 0, tagIndex: 0, role: "tag" },
    { text: "B", sourcePath: "content.blocks[0].items[0].tags[1].text", versionIndex: 0, blockIndex: 0, itemIndex: 0, tagIndex: 1, role: "tag" },
    { text: "Ready", sourcePath: "content.blocks[0].items[0].status", versionIndex: 0, blockIndex: 0, itemIndex: 0, role: "status" },
    { text: "Task 主体", sourcePath: "content.blocks[0].items[0].body", versionIndex: 0, blockIndex: 0, itemIndex: 0, role: "body" },
    { text: "Note 辅助", sourcePath: "content.blocks[0].items[0].auxiliary", versionIndex: 0, blockIndex: 0, itemIndex: 0, role: "auxiliary" }
  ]);
}, 60_000);

test("batch estimates include every content version once and keep labels as metadata", async () => {
  const versions = [{ blocks: [{ type: "title", text: "First" }] }, { blocks: [{ type: "paragraph", text: "English and 中文 mixed paragraph with exact records." }] }];
  const result = await measure("batch-versions", [{ kind: "rect", width: 180, label: "Metadata", content: versions }], ["--lines"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const item = result.report.measurement.items[0];
  expect(item.estimatedLines).toEqual([
    { text: "First", sourcePath: "[0].content[0].blocks[0].text", versionIndex: 0, blockIndex: 0, role: "title" },
    ...["English and 中文", "mixed paragraph", "with exact", "records."].map((text) => ({ text, sourcePath: "[0].content[1].blocks[0].text", versionIndex: 1, blockIndex: 0, role: "body" }))
  ]);
  expect(item.perContent).toHaveLength(2);
  for (const version of item.perContent) expect(version).not.toHaveProperty("estimatedLines");
  expect(item.label).toBe("Metadata");
}, 60_000);

test("draft records locate replacement content and preset labels without expanding ordinary label scope", async () => {
  const input = { version: 1, viewport: { width: 800, height: 400 }, typography: { nodeLabel: 20 }, nodes: [
    { id: "内容.节点", kind: "rect", x: 0, y: 0, width: 180, height: 1, content: { blocks: [{ type: "title", text: "Initial" }] } },
    { id: "ordinary", kind: "rect", x: 200, y: 0, width: 180, height: 1, label: "Ordinary" },
    { id: "preset", kind: "diamond", x: 400, y: 0, width: 180, height: 1, label: "Preset" }
  ], edges: [], scenes: [{ id: "change", label: "Change", beats: [{ durationMs: 100, actions: [
    { type: "updateNode", target: "内容.节点", value: { content: { blocks: [{ type: "paragraph", text: "Replacement" }] } } },
    { type: "updateNode", target: "ordinary", value: { label: "Unmeasured replacement" } },
    { type: "updateNode", target: "preset", value: { label: "Changed" } }
  ] }] }] };
  const output = join(root, "draft-lines-output.json");
  const result = await measure("draft-lines", input, ["--lines", "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const nodes = result.report.measurement.nodes;
  expect(nodes[0].estimatedLines).toEqual([
    { text: "Initial", sourcePath: "nodes[0].content.blocks[0].text", versionIndex: 0, blockIndex: 0, role: "title" },
    { text: "Replacement", sourcePath: "scenes[0].beats[0].actions[0].value.content.blocks[0].text", versionIndex: 1, blockIndex: 0, role: "body" }
  ]);
  expect(nodes[1].estimatedLines).toEqual([{ text: "Ordinary", sourcePath: "nodes[1].label", versionIndex: 0 }]);
  expect(nodes[2].estimatedLines).toEqual([
    { text: "Preset", sourcePath: "nodes[2].label", versionIndex: 0 },
    { text: "Change", sourcePath: "scenes[0].beats[0].actions[2].value.label", versionIndex: 1 },
    { text: "d", sourcePath: "scenes[0].beats[0].actions[2].value.label", versionIndex: 1 }
  ]);
  for (const version of nodes[0].perContent) expect(version).not.toHaveProperty("estimatedLines");
  const written = await readFile(output, "utf8");
  expect(written).not.toContain("estimatedLines");
  expect(await readFile(result.path, "utf8")).toBe(JSON.stringify(input));
  const baseline = await command(["measure", "--input", result.path]);
  expect(nodes.map(({ estimatedLines: _lines, ...rest }: { estimatedLines: unknown }) => rest)).toEqual(JSON.parse(baseline.stdout).measurement.nodes);
}, 60_000);

test("other commands reject lines before allocating history or preparing runtime", async () => {
  const input = join(root, "scope-input.json");
  await writeFile(input, JSON.stringify({ version: 1, viewport: { width: 200, height: 100 }, nodes: [], edges: [], scenes: [] }));
  for (const name of ["doctor", "prepare", "validate", "author", "layout", "evidence", "review", "review-template", "finalize"]) {
    const result = await command([name, "--lines", "--input", input, "--name", "scope"]);
    expect(result.code, name + result.stdout).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ stage: "arguments", artifacts: [], diagnostics: [expect.objectContaining({ code: "ERR_OPTION_SCOPE", location: "lines" })] });
  }
  await expect(readFile(join(root, ".diagrams/.history/scope/v001/diagram.json"))).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test("mixed labels, empty estimates, graph exclusions and long text retain their measurement contract", async () => {
  const mixed = await measure("mixed", { kind: "rect", width: 180, label: "Label", content: [{ blocks: [{ type: "title", text: "Body" }] }, { blocks: [{ type: "paragraph", text: "Later" }] }] }, ["--lines"]);
  expect(mixed.code, mixed.stdout + mixed.stderr).toBe(0);
  expect(mixed.report.measurement.estimatedLines).toEqual([
    { text: "Body", sourcePath: "content[0].blocks[0].text", versionIndex: 0, blockIndex: 0, role: "title" },
    { text: "Later", sourcePath: "content[1].blocks[0].text", versionIndex: 1, blockIndex: 0, role: "body" },
    { text: "Label", sourcePath: "label", versionIndex: 0 }
  ]);
  const empty = await measure("empty", { kind: "diamond", width: 180, label: "" }, ["--lines"]);
  expect(empty.code, empty.stdout).toBe(0);
  expect(empty.report.measurement.estimatedLines).toEqual([]);
  const graphInput = { kind: "rect", width: 180, content: { blocks: [{ type: "graph", height: 140, nodes: [{ id: "g", label: "Graph text", x: 60, y: 60 }], edges: [] }] } };
  const graph = await measure("graph-lines", graphInput, ["--lines"]);
  const baseline = await measure("graph-default", graphInput);
  expect(graph.code, graph.stdout + graph.stderr).toBe(0);
  const { estimatedLines, ...rest } = graph.report.measurement;
  expect(estimatedLines).toEqual([]);
  expect(rest.estimatedLineCount).toBe(1);
  expect(rest).toEqual(baseline.report.measurement);
  const long = await measure("long-lines", { kind: "rect", width: 180, content: { blocks: [{ type: "paragraph", text: "Long content repeated. ".repeat(300) + "THE_END" }] } }, ["--lines"]);
  expect(long.code, long.stdout + long.stderr).toBe(0);
  expect(long.report.measurement.estimatedLines.length).toBeGreaterThan(300);
  expect(long.report.measurement.estimatedLines.at(-1).text).toContain("THE_END");
}, 60_000);

test("lines preserve diagnostic failures and exclusive backfill protections", async () => {
  const standalone = await measure("diagnostic-label", { kind: "diamond", width: 24, label: "界" }, ["--lines"]);
  expect(standalone.code, standalone.stdout).toBe(0);
  expect(standalone.report.measurement.diagnostics.length).toBeGreaterThan(0);
  expect(standalone.report.measurement.estimatedLines).toEqual([{ text: "界", sourcePath: "label", versionIndex: 0 }]);
  const input = { version: 1, viewport: { width: 400, height: 200 }, nodes: [
    { id: "healthy", kind: "rect", x: 0, y: 0, width: 180, height: 40, label: "Healthy" },
    { id: "bad", kind: "diamond", x: 200, y: 0, width: 24, height: 1, label: "界" }
  ], edges: [], scenes: [] };
  const output = join(root, "failed-lines-output.json");
  const failed = await measure("failed-draft", input, ["--lines", "--output", output]);
  expect(failed.code).toBe(1);
  expect(failed.report).not.toHaveProperty("measurement");
  expect(failed.report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_DIAGNOSTIC", location: "nodes[1].label" }));
  await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(failed.path, "utf8")).toBe(JSON.stringify(input));
  const healthy = { ...input, nodes: [input.nodes[0]] };
  await writeFile(output, "existing");
  const existing = await measure("existing-draft", healthy, ["--lines", "--output", output]);
  expect(existing.code).toBe(1);
  expect(existing.report).not.toHaveProperty("measurement");
  expect(existing.report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_OUTPUT_EXISTS" }));
  expect(await readFile(output, "utf8")).toBe("existing");
  const missing = join(root, "missing-parent/output.json");
  const unwritable = await measure("write-failure", healthy, ["--lines", "--output", missing]);
  expect(unwritable.report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_OUTPUT_WRITE_FAILED" }));
  expect(unwritable.report).not.toHaveProperty("measurement");
  await expect(readFile(missing)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test("generated list markers point to the authored block marker field", async () => {
  const result = await measure("marker", { kind: "rect", width: 180, content: { blocks: [{ type: "list", marker: "bullet", items: [{ body: "Item" }] }] } }, ["--lines"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  expect(result.report.measurement.estimatedLines).toEqual([
    { text: "•", sourcePath: "content.blocks[0].marker", versionIndex: 0, blockIndex: 0, itemIndex: 0, role: "marker" },
    { text: "Item", sourcePath: "content.blocks[0].items[0].body", versionIndex: 0, blockIndex: 0, itemIndex: 0, role: "body" }
  ]);
}, 60_000);
