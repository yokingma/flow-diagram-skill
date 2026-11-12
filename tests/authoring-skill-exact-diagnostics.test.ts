/** Observe factual CLI diagnostics through a copied installation, without synthetic visual approval. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG factual diagnostics ")));
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
    child.stdout.on("data", (bytes) => { stdout += bytes; });
    child.stderr.on("data", (bytes) => { stderr += bytes; });
    child.on("error", reject);
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("default validation checks structure and compilation without classifying the design", async () => {
  const input = join(root, "vertical-label.json");
  const bytes = await readFile(resolve("tests/fixtures/label-pattern/label-vertical-run.json"), "utf8");
  await writeFile(input, bytes);
  const result = await command(["validate", "--input", input]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.checks).toMatchObject({ validation: "passed", compilation: "passed", layout: "not-run" });
  expect(report.diagnostics).toEqual([]);
  expect(report.validation.snapshotCreated).toBe(false);
  expect(await readFile(input, "utf8")).toBe(bytes);
  expect(await readdir(root)).not.toContain(".diagrams");
}, 60_000);

test("layout uses estimate diagnostics as assistance and preserves real input errors", async () => {
  const input = join(root, "layout-estimates.json");
  const plan = join(root, "layout-plan.json");
  const output = join(root, "layout-estimates-output.json");
  const draft = { version: 1, viewport: { width: 300, height: 200 }, nodes: [
    { id: "narrow", kind: "rect", x: 20, y: 20, width: 40, height: 40,
      content: { blocks: [{ type: "paragraph", text: "完整说明".repeat(10) }] } }
  ], edges: [], scenes: [] };
  await writeFile(input, JSON.stringify(draft));
  await writeFile(plan, JSON.stringify({ schemaVersion: 1, strategy: "layered", layers: ["narrow"] }));
  const result = await command(["layout", "--input", input, "--plan", plan, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.status).toBe("laid-out");
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_ESTIMATE", severity: "info", objectId: "narrow" }));
  expect(JSON.parse(await readFile(output, "utf8")).nodes[0].content).toEqual(draft.nodes[0].content);

  await writeFile(input, JSON.stringify({ ...draft, edges: [{ id: "missing", from: "absent", to: "narrow" }] }));
  const invalid = await command(["validate", "--input", input]);
  expect(invalid.code, invalid.stdout + invalid.stderr).toBe(1);
  expect(JSON.parse(invalid.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "DOCUMENT_INVALID", severity: "error" }));
}, 60_000);

test("estimated overflow remains visible while draft height application completes", async () => {
  const input = join(root, "estimated-overflow.json");
  const output = join(root, "measured-overflow.json");
  const bytes = JSON.stringify({ version: 1, viewport: { width: 400, height: 240 }, nodes: [
    { id: "narrow", kind: "rect", x: 20, y: 20, width: 40, height: 40,
      content: { blocks: [{ type: "paragraph", text: "完整内容".repeat(20) }] } }
  ], edges: [], scenes: [] });
  await writeFile(input, bytes);
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.status).toBe("measured");
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_ESTIMATE", severity: "info",
    objectId: "narrow", location: "nodes[0].content.blocks[0]", method: "sdk-content-estimate" }));
  const written = JSON.parse(await readFile(output, "utf8"));
  expect(written.nodes[0].content).toEqual(JSON.parse(bytes).nodes[0].content);
  expect(written.nodes[0].height).toBeGreaterThanOrEqual(40);
  expect(await readFile(input, "utf8")).toBe(bytes);
}, 60_000);

test("explicit geometry returns limited computation facts without design approval advice", async () => {
  const input = join(root, "geometry.json");
  const bytes = JSON.stringify({ version: 1, viewport: { width: 600, height: 400 }, nodes: [
    { id: "first", kind: "rect", x: 30, y: 30, width: 100, height: 60 },
    { id: "second", kind: "rect", x: 80, y: 30, width: 100, height: 60 },
    { id: "narrow", kind: "rect", x: 250, y: 50, width: 50, height: 20, label: "Very long label text that requires several lines" }
  ], edges: [], scenes: [] });
  await writeFile(input, bytes);
  const result = await command(["validate", "--input", input, "--geometry"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.checks.layout).toBe("computed");
  expect(report.layout).toMatchObject({ continuousCoverage: false, visualJudgment: false });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "node-overlap", severity: "info", objectId: "first",
    relatedObjectIds: ["second"], timeMs: 0, method: "public-sdk-frame-rectangles" }));
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "text-overflow", severity: "info", objectId: "narrow",
    estimatedLineCountMethod: "public-sdk-baseline-y-estimate" }));
  for (const diagnostic of report.diagnostics) {
    expect(diagnostic).not.toHaveProperty("impact");
    expect(diagnostic).not.toHaveProperty("candidates");
    expect(diagnostic.nextStep).not.toMatch(/ask|confirm|decision|approval/i);
    expect(diagnostic.limitations).toContain("not a visual design conclusion");
  }
  expect(await readFile(input, "utf8")).toBe(bytes);
}, 60_000);
