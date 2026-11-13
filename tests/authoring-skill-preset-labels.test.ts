import { readCommandReport } from "./helpers/cli-report";
/** Copied-install contracts for shape-safe labels across measurement, layout and diagnostics. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PRESETS = ["diamond", "parallelogram", "document", "predefinedProcess"];
let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG preset labels ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
  await cp(resolve("tests/fixtures/teaching-regressions"), join(root, "teaching-regressions"), { recursive: true });
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
    child.on("error", (error) => done({ code: 1, stdout, stderr: error.message }));
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

function animatedDraft() {
  return { version: 1, viewport: { width: 1200, height: 300 }, nodes: PRESETS.map((kind, index) => ({
    id: kind, kind, x: index * 280 + 20, y: 20, width: 240, height: 1, label: ""
  })), edges: [], scenes: [{ id: "replace", label: "Replace", beats: [{ durationMs: 1000, transitionMs: 0,
    actions: PRESETS.map((kind) => ({ type: "updateNode", target: kind, value: { label: "审核\nReady\n归档" } }))
  }] }] };
}

test("measurement delegates multiline and empty preset labels without changing source", async () => {
  const kind = "diamond";
  const input = join(root, `${kind}-label.json`);
  for (const label of ["A\nB", ""]) {
    const bytes = JSON.stringify({ kind, width: 240, label });
    await writeFile(input, bytes);
    const result = await command(["measure", "--input", input]);
    expect(result.code, result.stdout + result.stderr).toBe(0);
    const measurement = (await readCommandReport(result.stdout)).measurement;
    expect(measurement.height).toBeGreaterThan(0);
    expect(measurement.requiredHeight).toBeGreaterThan(0);
    expect(measurement.diagnostics).toEqual([]);
    expect(measurement.estimatedLineCount).toBe(label === "" ? 0 : 2);
    expect(await readFile(input, "utf8")).toBe(bytes);
  }
}, 60_000);

test("draft backfill measures all preset label versions and preserves source and existing output", async () => {
  const input = join(root, "animated.json");
  const output = join(root, "animated-measured.json");
  const bytes = JSON.stringify(animatedDraft());
  await writeFile(input, bytes);
  const result = await command(["measure", "--input", input, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const written = JSON.parse(await readFile(output, "utf8"));
  for (const kind of PRESETS) {
    expect(written.nodes.find((node: { id: string }) => node.id === kind).height).toBeGreaterThan(0);
  }
  expect(written.scenes).toEqual(animatedDraft().scenes);
  expect(await readFile(input, "utf8")).toBe(bytes);
  const validation = await command(["validate", "--input", output]);
  expect(validation.code, validation.stdout).toBe(0);
  expect((await readCommandReport(validation.stdout)).diagnostics.filter((item: { code: string }) => item.code === "text-overflow")).toEqual([]);
  const repeated = await command(["measure", "--input", input, "--output", output]);
  expect(repeated.code).toBe(1);
  expect((await readCommandReport(repeated.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_OUTPUT_EXISTS" }));
  expect(JSON.parse(await readFile(output, "utf8"))).toEqual(written);
}, 60_000);

test("static layout measures preset labels at their final widths and retains empty label clearance", async () => {
  const input = join(root, "layout-static.json");
  const output = join(root, "layout-static-output.json");
  const plan = join(root, "layout-static-plan.json");
  const draft = { ...animatedDraft(), scenes: [], nodes: animatedDraft().nodes.map((node, index) => ({
    ...node, width: 400, label: index === 0 ? "" : "A\nB"
  })) };
  const bytes = JSON.stringify(draft);
  await writeFile(input, bytes);
  await writeFile(plan, JSON.stringify({ schemaVersion: 1, strategy: "layered", canvas: { padding: 20 },
    defaults: { width: 240 }, gaps: { layer: 30 }, layers: PRESETS }));
  const result = await command(["layout", "--input", input, "--plan", plan, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const written = JSON.parse(await readFile(output, "utf8"));
  PRESETS.forEach((_, index) => {
    expect(written.nodes[index].height).toBeGreaterThan(0);
    expect(written.nodes[index].width).toBe(240);
    if (index > 0) expect(written.nodes[index].y).toBeCloseTo(written.nodes[index - 1].y + written.nodes[index - 1].height + 30);
  });
  expect(written.scenes).toEqual([]);
  expect(await readFile(input, "utf8")).toBe(bytes);
}, 60_000);

test("preset width estimates remain informational through draft and layout publication", async () => {
  const kind = "predefinedProcess";
  const input = join(root, `${kind}-narrow.json`);
  await writeFile(input, JSON.stringify({ kind, width: 24, label: "界" }));
  const measured = await command(["measure", "--input", input]);
  expect(measured.code, measured.stdout).toBe(0);
  expect((await readCommandReport(measured.stdout)).measurement.diagnostics).toContainEqual(expect.objectContaining({ dimension: "width" }));
  const draft = { ...animatedDraft(), nodes: [{ id: kind, kind, x: 20, y: 20, width: 24, height: 1000, label: "界" }], scenes: [] };
  const bytes = JSON.stringify(draft);
  await writeFile(input, bytes);
  const output = join(root, `${kind}-narrow-output.json`);
  const backfill = await command(["measure", "--input", input, "--output", output]);
  expect(backfill.code, backfill.stdout).toBe(0);
  expect((await readCommandReport(backfill.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_ESTIMATE", severity: "info", objectId: kind, location: "nodes[0].label", sourcePath: "nodes[0].label" }));
  const plan = join(root, `${kind}-narrow-plan.json`);
  await writeFile(plan, JSON.stringify({ schemaVersion: 1, strategy: "layered", layers: [kind] }));
  const layoutOutput = join(root, `${kind}-narrow-layout.json`);
  const layout = await command(["layout", "--input", input, "--plan", plan, "--output", layoutOutput]);
  expect(layout.code, layout.stdout).toBe(0);
  expect((await readCommandReport(layout.stdout)).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_ESTIMATE", severity: "info", location: "nodes[0].label" }));
  expect(JSON.parse(await readFile(output, "utf8")).nodes[0].label).toBe("界");
  expect(JSON.parse(await readFile(layoutOutput, "utf8")).nodes[0].label).toBe("界");
  expect(await readFile(input, "utf8")).toBe(bytes);
  const validation = await command(["validate", "--geometry", "--input", input]);
  expect(validation.code, validation.stdout).toBe(0);
  const warning = (await readCommandReport(validation.stdout)).diagnostics.find((item: { code: string }) => item.code === "text-overflow");
  expect(warning.reason).toContain("width");
  expect(warning.reason).not.toContain("exceeds its height");
}, 60_000);

test("preset measurement rejects structured content and invalid input", async () => {
  const kind = "diamond";
  const input = join(root, `${kind}-invalid.json`);
  for (const item of [{ kind, width: 240, label: "A", content: { blocks: [] } },
    { kind, width: 0, label: "A" }, { kind, width: 240, label: 42 }, { kind, width: 240, label: "A", typo: true }]) {
    await writeFile(input, JSON.stringify(item));
    const result = await command(["measure", "--input", input]);
    expect(result.code, result.stdout).toBe(1);
  }
}, 60_000);


test("preset standalone versions use the largest label and reject an empty collection", async () => {
  const input = join(root, "label-versions.json");
  await writeFile(input, JSON.stringify({ kind: "diamond", width: 240, label: ["A", "审核\nReady\n归档"] }));
  const measured = await command(["measure", "--input", input]);
  expect(measured.code, measured.stdout).toBe(0);
  expect((await readCommandReport(measured.stdout)).measurement).toMatchObject({ estimatedLineCount: 3, diagnostics: [] });
  expect((await readCommandReport(measured.stdout)).measurement.height).toBeGreaterThan(0);
  await writeFile(input, JSON.stringify({ kind: "diamond", width: 240, label: [] }));
  const invalid = await command(["measure", "--input", input]);
  expect(invalid.code, invalid.stdout).toBe(1);
}, 60_000);

test("bundled mixed flow retains measured presets through page and SVG delivery", async () => {
  const input = join(root, "teaching-regressions/mixed-approval-flow.json");
  const output = join(root, "mixed-measured.json");
  const source = await readFile(input, "utf8");
  const measured = await command(["measure", "--input", input, "--output", output]);
  expect(measured.code, measured.stdout).toBe(0);
  const args = ["author", "--input", output, "--name", "mixed-presets", "--output", join(root, "history"),
    "--html", join(skill, "resources/html-page.html"), "--sources", join(root, "teaching-regressions/semantic-pattern-sources.json"),
    "--svg", "--browser", "none"];
  const delivered = await command(args);
  expect(delivered.code, delivered.stdout + delivered.stderr).toBe(0);
  const report = (await readCommandReport(delivered.stdout));
  expect(report.sdk.version).toBe("0.4.0");
  expect(report.completion.delivery).toBe("complete");
  const svg = await readFile(join(report.revision.directory, "diagram.svg"), "utf8");
  for (const label of ["Application", "Materials", "Review", "Draft report"]) expect(svg).toContain(label);
  const html = await readFile(join(report.revision.directory, "diagram.html"), "utf8");
  expect(html).toContain("iframe");
  expect(html).toContain("flowsvg-page-player");
  expect(await readFile(input, "utf8")).toBe(source);
}, 120_000);
