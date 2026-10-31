/** Layout authoring is exercised through a copied installation, without internal helper calls. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG layout CLI ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-svg-diagram"), skill, { recursive: true });
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
const draft = { version: 1, viewport: { width: 300, height: 100 }, nodes: [
  { id: "first", kind: "rect", x: 50, y: 50, width: 100, height: 80, label: "首张" },
  { id: "next", kind: "rect", x: 50, y: 50, width: 100, height: 80, label: "次张" }
], edges: [{ id: "request", from: "first", to: "next" }], scenes: [] };
const plan = { schemaVersion: 1, strategy: "layered", canvas: { padding: 20 }, gaps: { layer: 30 }, layers: ["first", "next"] };
const hash = (bytes: string) => createHash("sha256").update(bytes).digest("hex");

test("layout creates a deterministic source-bound draft without allocating author history", async () => {
  const input = join(root, "draft.json");
  const planPath = join(root, "layout-plan.json");
  const output = join(root, "laid-out.json");
  const inputBytes = JSON.stringify(draft, null, 3) + "\n";
  const planBytes = JSON.stringify(plan, null, 2) + "\n";
  await Promise.all([writeFile(input, inputBytes), writeFile(planPath, planBytes)]);
  const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  const outputBytes = await readFile(output, "utf8");
  expect(report).toMatchObject({ command: "layout", status: "laid-out", revision: null, strategy: "layered",
    input: { sha256: hash(inputBytes) }, plan: { sha256: hash(planBytes) }, output: { path: output, sha256: hash(outputBytes) },
    checks: { validation: "passed", compilation: "passed", layout: "passed" } });
  expect(JSON.parse(outputBytes).nodes.map((node: { x: number; y: number }) => [node.x, node.y])).toEqual([[20, 20], [20, 130]]);
  expect(await readFile(input, "utf8")).toBe(inputBytes);
  expect(await readFile(planPath, "utf8")).toBe(planBytes);
  expect(await readdir(root)).not.toContain(".diagrams");
  const again = await command(["layout", "--input", input, "--plan", planPath, "--output", join(root, "again.json")]);
  expect(again.code, again.stdout).toBe(0);
  expect(await readFile(join(root, "again.json"), "utf8")).toBe(outputBytes);
}, 60_000);

test("layout refuses existing and source targets and leaves no partial file on write failure", async () => {
  const input = join(root, "protected-draft.json");
  const planPath = join(root, "protected-plan.json");
  const existing = join(root, "existing-target.json");
  const blockedParent = join(root, "parent-is-file");
  const inputBytes = JSON.stringify(draft);
  const planBytes = JSON.stringify(plan);
  await Promise.all([writeFile(input, inputBytes), writeFile(planPath, planBytes), writeFile(existing, "keep target"), writeFile(blockedParent, "keep parent")]);
  for (const [output, code] of [[existing, "LAYOUT_OUTPUT_EXISTS"], [input, "LAYOUT_OUTPUT_CONFLICT"], [planPath, "LAYOUT_OUTPUT_CONFLICT"],
    [join(blockedParent, "output.json"), "LAYOUT_OUTPUT_WRITE_FAILED"]]) {
    const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
    expect(result.code, result.stdout).toBe(1);
    expect(JSON.parse(result.stdout).diagnostics).toContainEqual(expect.objectContaining({ code }));
  }
  expect(await readFile(input, "utf8")).toBe(inputBytes);
  expect(await readFile(planPath, "utf8")).toBe(planBytes);
  expect(await readFile(existing, "utf8")).toBe("keep target");
  expect(await readFile(blockedParent, "utf8")).toBe("keep parent");
  expect((await readdir(root)).filter((name) => name.includes(".tmp-"))).toEqual([]);
}, 60_000);

test("layout measures Chinese content at its final planned width before moving the next layer", async () => {
  const input = join(root, "content-draft.json");
  const planPath = join(root, "content-plan.json");
  const output = join(root, "content-output.json");
  const text = "固定宽度的中文卡片需要根据完整内容估算高度，再安排下一层。".repeat(6);
  const withContent = { ...draft, nodes: [{ id: "first", kind: "rect", x: 0, y: 0, width: 500, height: 40,
    content: { blocks: [{ type: "paragraph", text }] } }, draft.nodes[1]] };
  await writeFile(input, JSON.stringify(withContent));
  await writeFile(planPath, JSON.stringify({ ...plan, overrides: { first: { width: 180 } } }));
  const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  const written = JSON.parse(await readFile(output, "utf8"));
  expect(report.measuredNodes).toContainEqual(expect.objectContaining({ nodeId: "first", width: 180, recommendedHeight: expect.any(Number), diagnostics: [] }));
  expect(written.nodes[0].height).toBeGreaterThan(40);
  expect(written.nodes[1].y).toBe(written.nodes[0].y + written.nodes[0].height + 30);
  expect(written.nodes[0].content.blocks[0].text).toBe(text);
  const measured = await command(["measure", "--input", output]);
  expect(measured.code, measured.stdout).toBe(0);
  const validated = await command(["validate", "--input", output, "--name", "laid-out", "--output", join(root, "history")]);
  expect(validated.code, validated.stdout).toBe(0);
}, 60_000);

test("layout applies label-only height at final width and preserves an explicit narrow override", async () => {
  const input = join(root, "label-only-draft.json");
  const planPath = join(root, "label-only-plan.json");
  const output = join(root, "label-only-output.json");
  const document = { version: 1, viewport: { width: 300, height: 80 }, typography: { nodeLabel: 20 }, nodes: [
    { id: "summary", kind: "roundedRect", x: 0, y: 0, width: 160, height: 20, label: "这是一个需要换行的中文摘要" },
    { id: "next", kind: "rect", x: 0, y: 0, width: 160, height: 20, label: "下一层" }
  ], edges: [], scenes: [] };
  const layoutPlan = { schemaVersion: 1, strategy: "layered", canvas: { padding: 10 }, gaps: { layer: 5 }, layers: ["summary", "next"] };
  await Promise.all([writeFile(input, JSON.stringify(document)), writeFile(planPath, JSON.stringify(layoutPlan))]);
  const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  const summary = report.labelOnlyMeasurements.find((item: { nodeId: string }) => item.nodeId === "summary");
  expect(summary).toMatchObject({ nodeId: "summary", currentHeight: 20, requiredHeight: expect.any(Number), estimatedLineCount: expect.any(Number), labelOnly: true });
  expect(report.appliedHeightChanges).toContainEqual(expect.objectContaining({ objectId: "summary", field: "height", before: 20, after: summary.requiredHeight }));
  const laidOut = JSON.parse(await readFile(output, "utf8"));
  expect(laidOut.nodes[0].height).toBe(summary.requiredHeight);
  expect(laidOut.nodes[1].y).toBe(10 + summary.requiredHeight + 5);

  const narrowPlan = { ...layoutPlan, overrides: { summary: { height: 20 } } };
  const narrowOutput = join(root, "label-only-narrow-output.json");
  await writeFile(planPath, JSON.stringify(narrowPlan));
  const narrow = await command(["layout", "--input", input, "--plan", planPath, "--output", narrowOutput]);
  expect(narrow.code, narrow.stdout + narrow.stderr).toBe(0);
  expect(JSON.parse(await readFile(narrowOutput, "utf8")).nodes[0].height).toBe(20);
  expect(JSON.parse(narrow.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "text-overflow", objectId: "summary" }));
}, 60_000);

test("expanded group labels are measured at child-derived width with exact height overrides", async () => {
  const input = join(root, "group-label.json");
  const planPath = join(root, "group-label-plan.json");
  const output = join(root, "group-label-output.json");
  const label = "这是一段很长的组标题，需要按照最终宽度估算完整高度。".repeat(4);
  const document = { version: 1, viewport: { width: 200, height: 100 }, typography: { nodeLabel: 20 }, nodes: [
    { id: "group", kind: "group", x: 0, y: 0, width: 900, height: 20, label },
    { id: "child", kind: "rect", parentId: "group", x: 0, y: 0, width: 100, height: 40 },
    { id: "next", kind: "rect", x: 0, y: 0, width: 100, height: 40 }
  ], edges: [], scenes: [] };
  const layoutPlan = { schemaVersion: 1, strategy: "layered", gaps: { layer: 10 },
    layers: [{ type: "column", id: "group", children: ["child"] }, "next"] };
  await Promise.all([writeFile(input, JSON.stringify(document)), writeFile(planPath, JSON.stringify(layoutPlan))]);
  const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  const measurement = report.labelOnlyMeasurements[0];
  const laidOut = JSON.parse(await readFile(output, "utf8"));
  expect(measurement.width).toBe(132);
  expect(laidOut.nodes[0]).toMatchObject({ width: 132, height: measurement.requiredHeight });
  expect(measurement.requiredHeight).toBeGreaterThan(104);
  expect(laidOut.nodes[2].y).toBe(measurement.requiredHeight + 10);
  expect(report.diagnostics.filter((item: { code: string }) => item.code === "text-overflow")).toEqual([]);

  const measured = await command(["measure", "--input", output]);
  expect(measured.code, measured.stdout).toBe(0);
  expect(JSON.parse(measured.stdout).measurement.nodes[0].requiredHeight).toBe(measurement.requiredHeight);
  for (const height of [20, measurement.requiredHeight + 10]) {
    const overrideOutput = join(root, `group-height-${height}.json`);
    await writeFile(planPath, JSON.stringify({ ...layoutPlan, overrides: { group: { height } } }));
    const overridden = await command(["layout", "--input", input, "--plan", planPath, "--output", overrideOutput]);
    expect(overridden.code, overridden.stdout).toBe(0);
    expect(JSON.parse(await readFile(overrideOutput, "utf8")).nodes[0].height).toBe(height);
    const warnings = JSON.parse(overridden.stdout).diagnostics.filter((item: { code: string }) => item.code === "text-overflow");
    if (height === 20) expect(warnings).toContainEqual(expect.objectContaining({ objectId: "group", currentHeight: height, requiredHeight: measurement.requiredHeight }));
    else expect(warnings).toEqual([]);
  }
}, 60_000);

test.each([
  ["unknown-id", draft, { ...plan, layers: ["missing"] }, "LAYOUT_UNKNOWN_NODE", "plan"],
  ["negative-gap", draft, { ...plan, gaps: { row: -1 } }, "LAYOUT_PLAN_INVALID", "plan"],
  ["animation", { ...draft, scenes: [{ id: "s", label: "scene", beats: [{ durationMs: 100, actions: [] }] }] }, plan, "LAYOUT_STATIC_ONLY", "plan"],
  ["bad-draft", { ...draft, edges: [{ id: "edge", from: "missing", to: "next" }] }, plan, "DOCUMENT_INVALID", "validation"]
])("layout rejects %s before publishing and marks the failed check", async (name, document, layoutPlan, code, check) => {
  const input = join(root, `${name}.json`);
  const planPath = join(root, `${name}-plan.json`);
  const output = join(root, `${name}-output.json`);
  const sourceBytes = JSON.stringify(document);
  const planBytes = JSON.stringify(layoutPlan);
  await Promise.all([writeFile(input, sourceBytes), writeFile(planPath, planBytes)]);
  const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
  expect(result.code, result.stdout).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.checks[check]).toBe("failed");
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code }));
  await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(input, "utf8")).toBe(sourceBytes);
  expect(await readFile(planPath, "utf8")).toBe(planBytes);
}, 60_000);

test("unreadable input paths identify the file and unresolved measurement blocks publication", async () => {
  const missing = join(root, "missing-draft.json");
  const planPath = join(root, "measurement-plan.json");
  const output = join(root, "measurement-output.json");
  await writeFile(planPath, JSON.stringify(plan));
  const missingResult = await command(["layout", "--input", missing, "--plan", planPath, "--output", output]);
  expect(JSON.parse(missingResult.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "LAYOUT_INPUT_READ_FAILED", location: missing }));
  const input = join(root, "narrow-content.json");
  await writeFile(input, JSON.stringify({ ...draft, nodes: [{ ...draft.nodes[0], label: undefined,
    content: { blocks: [{ type: "paragraph", text: "不可丢失的中文内容" }] } }, draft.nodes[1]] }));
  await writeFile(planPath, JSON.stringify({ ...plan, overrides: { first: { width: 20 } } }));
  const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
  expect(result.code, result.stdout).toBe(1);
  expect(JSON.parse(result.stdout).checks.measurement).toBe("failed");
  expect(JSON.parse(result.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "LAYOUT_MEASUREMENT_DIAGNOSTIC", objectId: "first" }));
  await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test("layout help names its contract and only layout accepts the plan option", async () => {
  const help = await command(["layout", "--help"]);
  expect(help.code).toBe(0);
  expect(help.stdout).toContain("--plan <layout-plan.json>");
  expect(help.stdout).toContain("new-draft.json");
  for (const args of [["measure", "--input", "draft.json", "--plan", "plan.json"],
    ["layout", "--input", "draft.json", "--plan", "plan.json", "--output", "out.json", "--name", "unexpected"]]) {
    const result = await command(args);
    expect(result.code, result.stdout).toBe(1);
    expect(JSON.parse(result.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "ERR_OPTION_SCOPE" }));
  }
  const missing = await command(["layout", "--input", "draft.json"]);
  expect(JSON.parse(missing.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "LAYOUT_ARGUMENT_REQUIRED" }));
});

test("retained warnings identify the new draft and direct decisions through a formal revision", async () => {
  const input = join(root, "warning-draft.json");
  const planPath = join(root, "warning-plan.json");
  const output = join(root, "warning-output.json");
  await Promise.all([writeFile(input, JSON.stringify(draft)), writeFile(planPath, JSON.stringify({ ...plan, overrides: { first: { height: 1 } } }))]);
  const result = await command(["layout", "--input", input, "--plan", planPath, "--output", output]);
  expect(result.code, result.stdout).toBe(0);
  const report = JSON.parse(result.stdout);
  const warning = report.diagnostics.find((item: { code: string; objectId: string }) => item.code === "text-overflow" && item.objectId === "first");
  expect(warning).toMatchObject({ sourceRevision: null, issueId: expect.any(String), warningKey: expect.any(String), timeMs: 0,
    currentHeight: 1, requiredHeight: expect.any(Number), estimatedLineCount: expect.any(Number),
    issueContext: { sourceSha256: report.output.sha256 } });
  expect(warning.reason).toContain("current height 1");
  expect(warning.reason).toContain("required height");
  expect(warning.reason).toContain("estimated line count");
  expect(warning.nextStep).toContain("Run author");
  expect(report.overrides).toEqual([{ nodeId: "first", values: { height: 1 } }]);
  expect(report.preservedSemanticFields).toEqual(expect.arrayContaining(["nodes.id", "nodes.parentId", "edges.from", "edges.to", "nodes array order"]));
  const written = JSON.parse(await readFile(output, "utf8"));
  expect(written.nodes.map((node: { id: string; kind: string; label: string }) => ({ id: node.id, kind: node.kind, label: node.label }))).toEqual(
    draft.nodes.map((node) => ({ id: node.id, kind: node.kind, label: node.label })));
  expect(written.edges).toEqual(draft.edges);
  const validated = await command(["validate", "--input", output, "--name", "layout-warning-validate", "--output", join(root, "validate-history")]);
  expect(validated.code, validated.stdout + validated.stderr).toBe(0);
  expect(JSON.parse(validated.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "text-overflow", objectId: "first",
    currentHeight: 1, requiredHeight: warning.requiredHeight, estimatedLineCount: warning.estimatedLineCount }));
  const authored = await command(["author", "--input", output, "--name", "layout-warnings", "--output", join(root, "history"), "--browser", "none"]);
  expect(authored.code, authored.stdout + authored.stderr).toBe(0);
  const authorReport = JSON.parse(authored.stdout);
  expect(authorReport).toMatchObject({ status: "delivered", revision: { id: "v001" }, checks: { compilation: "passed", layout: "warnings" } });
  expect(authorReport.diagnostics).toContainEqual(expect.objectContaining({ issueId: warning.issueId, sourceRevision: "v001",
    currentHeight: 1, requiredHeight: warning.requiredHeight, estimatedLineCount: warning.estimatedLineCount }));
  const markdown = await readFile(join(authorReport.revision.directory, "report.md"), "utf8");
  expect(markdown).toContain("current height 1");
  expect(markdown).toContain("not browser pixel measurement or formal SVG/PNG artifact evidence");
}, 60_000);
