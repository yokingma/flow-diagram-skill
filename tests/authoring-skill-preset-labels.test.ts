/** Copied-install contracts for shape-safe labels across measurement, layout and diagnostics. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PRESETS = [
  { kind: "diamond", height: 128, emptyHeight: 48, animatedHeight: 168 },
  { kind: "parallelogram", height: 64, emptyHeight: 24, animatedHeight: 84 },
  { kind: "document", height: 256 / 3, emptyHeight: 32, animatedHeight: 108 },
  { kind: "predefinedProcess", height: 64, emptyHeight: 24, animatedHeight: 84 }
];
let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG preset labels ")));
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
    child.on("error", (error) => done({ code: 1, stdout, stderr: error.message }));
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

function animatedDraft() {
  return { version: 1, viewport: { width: 1200, height: 300 }, nodes: PRESETS.map(({ kind }, index) => ({
    id: kind, kind, x: index * 280 + 20, y: 20, width: 240, height: 1, label: ""
  })), edges: [], scenes: [{ id: "replace", label: "Replace", beats: [{ durationMs: 1000, transitionMs: 0,
    actions: PRESETS.map(({ kind }) => ({ type: "updateNode", target: kind, value: { label: "审核\nReady\n归档" } }))
  }] }] };
}

test.each(PRESETS)("$kind measurement uses its safe area and accepts empty labels", async ({ kind, height, emptyHeight }) => {
  const input = join(root, `${kind}-label.json`);
  const cases: [string, number][] = [["A\nB", height], ["", emptyHeight]];
  for (const [label, expectedHeight] of cases) {
    const bytes = JSON.stringify({ kind, width: 240, label });
    await writeFile(input, bytes);
    const result = await command(["measure", "--input", input]);
    expect(result.code, result.stdout + result.stderr).toBe(0);
    const measurement = JSON.parse(result.stdout).measurement;
    expect(measurement.height).toBeCloseTo(expectedHeight);
    expect(measurement.requiredHeight).toBeCloseTo(expectedHeight);
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
  for (const { kind, animatedHeight } of PRESETS) {
    expect(written.nodes.find((node: { id: string }) => node.id === kind).height).toBeCloseTo(animatedHeight);
  }
  expect(written.scenes).toEqual(animatedDraft().scenes);
  expect(await readFile(input, "utf8")).toBe(bytes);
  const validation = await command(["validate", "--input", output]);
  expect(validation.code, validation.stdout).toBe(0);
  expect(JSON.parse(validation.stdout).diagnostics.filter((item: { code: string }) => item.code === "text-overflow")).toEqual([]);
  const repeated = await command(["measure", "--input", input, "--output", output]);
  expect(repeated.code).toBe(1);
  expect(JSON.parse(repeated.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_OUTPUT_EXISTS" }));
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
    defaults: { width: 240 }, gaps: { layer: 30 }, layers: PRESETS.map(({ kind }) => kind) }));
  const result = await command(["layout", "--input", input, "--plan", plan, "--output", output]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const written = JSON.parse(await readFile(output, "utf8"));
  PRESETS.forEach(({ height, emptyHeight }, index) => {
    expect(written.nodes[index].height).toBeCloseTo(index === 0 ? emptyHeight : height);
    expect(written.nodes[index].width).toBe(240);
    if (index > 0) expect(written.nodes[index].y).toBeCloseTo(written.nodes[index - 1].y + written.nodes[index - 1].height + 30);
  });
  expect(written.scenes).toEqual([]);
  expect(await readFile(input, "utf8")).toBe(bytes);
}, 60_000);

test.each(PRESETS)("$kind keeps width diagnostics and prevents unsafe draft or layout publication", async ({ kind }) => {
  const input = join(root, `${kind}-narrow.json`);
  await writeFile(input, JSON.stringify({ kind, width: 24, label: "界" }));
  const measured = await command(["measure", "--input", input]);
  expect(measured.code, measured.stdout).toBe(0);
  expect(JSON.parse(measured.stdout).measurement.diagnostics).toContainEqual(expect.objectContaining({ dimension: "width" }));
  const draft = { ...animatedDraft(), nodes: [{ id: kind, kind, x: 20, y: 20, width: 24, height: 1000, label: "界" }], scenes: [] };
  const bytes = JSON.stringify(draft);
  await writeFile(input, bytes);
  const output = join(root, `${kind}-narrow-output.json`);
  const backfill = await command(["measure", "--input", input, "--output", output]);
  expect(backfill.code, backfill.stdout).toBe(1);
  expect(JSON.parse(backfill.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_DIAGNOSTIC", objectId: kind, location: "nodes[0].label", sourcePath: "nodes[0].label" }));
  const plan = join(root, `${kind}-narrow-plan.json`);
  await writeFile(plan, JSON.stringify({ schemaVersion: 1, strategy: "layered", layers: [kind] }));
  const layout = await command(["layout", "--input", input, "--plan", plan, "--output", output]);
  expect(layout.code, layout.stdout).toBe(1);
  expect(JSON.parse(layout.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "LAYOUT_MEASUREMENT_DIAGNOSTIC", location: "nodes[0].label" }));
  await expect(readFile(output, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(input, "utf8")).toBe(bytes);
  const validation = await command(["validate", "--input", input]);
  expect(validation.code, validation.stdout).toBe(0);
  const warning = JSON.parse(validation.stdout).diagnostics.find((item: { code: string }) => item.code === "text-overflow");
  expect(warning.reason).toContain("width");
  expect(warning.reason).not.toContain("exceeds its height");
}, 60_000);

test.each(PRESETS)("$kind rejects structured content and invalid measurement input", async ({ kind }) => {
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
  expect(JSON.parse(measured.stdout).measurement).toMatchObject({ height: 168, estimatedLineCount: 3, diagnostics: [] });
  await writeFile(input, JSON.stringify({ kind: "diamond", width: 240, label: [] }));
  const invalid = await command(["measure", "--input", input]);
  expect(invalid.code, invalid.stdout).toBe(1);
}, 60_000);

test("bundled mixed flow retains measured presets through page and image delivery", async () => {
  const input = join(skill, "examples/mixed-approval-flow.json");
  const output = join(root, "mixed-measured.json");
  const source = await readFile(input, "utf8");
  const measured = await command(["measure", "--input", input, "--output", output]);
  expect(measured.code, measured.stdout).toBe(0);
  const browser = process.env.FLOWSVG_TEST_BROWSER;
  const args = ["author", "--input", output, "--name", "mixed-presets", "--output", join(root, "history"),
    "--html", join(skill, "examples/html-page.html"), "--sources", join(skill, "examples/semantic-pattern-sources.json"),
    "--svg", "--browser", browser ?? "none"];
  if (browser) args.push("--png", "--gif");
  const delivered = await command(args);
  expect(delivered.code, delivered.stdout + delivered.stderr).toBe(0);
  const report = JSON.parse(delivered.stdout);
  expect(report.sdk.version).toBe("0.3.1");
  expect(report.completion.delivery).toBe("complete");
  const svg = await readFile(join(report.revision.directory, "diagram.svg"), "utf8");
  for (const label of ["Application", "Materials", "Review", "Draft report"]) expect(svg).toContain(label);
  const html = await readFile(join(report.revision.directory, "diagram.html"), "utf8");
  expect(html).toContain("iframe");
  expect(html).toContain("flowsvg-page-player");
  if (browser) {
    expect(report.checks.html).toBe("captured");
    expect((await readFile(join(report.revision.directory, "diagram.png"))).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect((await readFile(join(report.revision.directory, "diagram.gif"))).subarray(0, 6).toString()).toBe("GIF89a");
  }
  expect(await readFile(input, "utf8")).toBe(source);
}, 120_000);
