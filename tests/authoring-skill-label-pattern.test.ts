/** Label-risk behavior is observed through a copied CLI and the locked registry SDK. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const fixtureDirectory = resolve("tests/fixtures/label-pattern");
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG label patterns ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), DEBUG: "pw:browser" }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (bytes) => { stdout += bytes; });
    child.stderr.on("data", (bytes) => { stderr += bytes; });
    child.on("error", reject);
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("read-only validation explains a reconstructed Chinese vertical run without saving a revision", async () => {
  const input = join(root, "vertical.json");
  const bytes = await readFile(join(fixtureDirectory, "label-vertical-run.json"), "utf8");
  await writeFile(input, bytes);
  const prepared = await command(["prepare"]);
  expect(prepared.code, prepared.stdout + prepared.stderr).toBe(0);
  const before = (await readdir(root)).sort();
  const result = await command(["validate", "--input", input]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  const warning = report.diagnostics.find((item: { code: string }) => item.code === "LABEL_VERTICAL_RUN");
  expect(warning).toMatchObject({ code: "LABEL_VERTICAL_RUN", severity: "warning", stage: "layout", objectId: "relation",
    location: "edges[0].label", timeMs: 0, sourceRevision: null, estimatedLineCount: 10,
    softWrappedRun: { lineCount: 10, charactersPerLine: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] } });
  expect(warning.reason).toContain("estimate");
  expect(warning.softWrappedRun.baselineSpan).toBeGreaterThan(200);
  expect(warning.candidates).toContain("Increase the label space or adjust the path and ports");
  expect(report).toMatchObject({ revision: null, validation: { snapshotCreated: false } });
  expect(report.sdk.version).toBe("0.2.2");
  expect((await readdir(root)).sort()).toEqual(before);
  expect(await readFile(input, "utf8")).toBe(bytes);
  expect(result.stderr).not.toContain("<launching>");
}, 60_000);

test.each([
  ["label-horizontal-run.json", true],
  ["label-two-character-wrap.json", true],
  ["label-explicit-lines.json", false],
  ["label-hidden-label.json", false],
  ["label-reasonable-wrap.json", false],
  ["label-long-path.json", false]
])("calibrated public-frame fixture %s has risk=%s", async (filename, expected) => {
  const input = join(root, filename);
  await cp(join(fixtureDirectory, filename), input);
  const result = await command(["validate", "--input", input]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).diagnostics.some((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN")).toBe(expected);
}, 60_000);

type Draft = {
  version: number; viewport: { width: number; height: number };
  typography: { nodeLabel: number; edgeLabel: number; flowLabel: number };
  nodes: { id: string; kind: string; x: number; y: number; width: number; height: number; label?: string; visible?: boolean; parentId?: string }[];
  edges: { id: string; from: string; to: string; label: string; visible?: boolean; fromPort?: string; toPort?: string; style?: { stroke?: string; strokeWidth?: number } }[];
  scenes: unknown[];
};
async function validateChanged(name: string, edit: (draft: Draft) => void) {
  const draft = JSON.parse(await readFile(join(fixtureDirectory, "label-vertical-run.json"), "utf8")) as Draft;
  edit(draft);
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(draft));
  const result = await command(["validate", "--input", input]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

test.each(["#0000", "#ffffff00"])("transparent foreground %s is not a readable vertical run", async (stroke) => {
  const report = await validateChanged(`transparent-${stroke.slice(1)}`, (draft) => { draft.edges[0].style = { stroke }; });
  expect(report.diagnostics.some((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN")).toBe(false);
}, 60_000);

test.each([
  ["five-single-character-lines", "跨层调用关", 30, false],
  ["six-single-character-lines", "跨层调用关系", 30, true],
  ["three-two-character-lines", "跨层调用关系", 50, false],
  ["four-two-character-lines", "跨层调用关系说明", 50, true],
  ["four-longer-lines", "跨层调用关系说明文字资料", 70, false],
  ["short-label", "标签", 30, false],
  ["explicit-prefix-with-soft-run", "说明\n跨层调用关系说明文字", 30, true],
  ["several-short-explicit-paragraphs", "跨层\n调用\n关系\n说明", 30, false],
  ["empty-explicit-paragraphs", "\n\n跨层调用关系说明文字\n", 30, true]
])("short-line boundary %s respects calibrated scope", async (name, label, gap, expected) => {
  const report = await validateChanged(name, (draft) => {
    draft.edges[0].label = label;
    draft.nodes[1].y = draft.nodes[0].y + draft.nodes[0].height + gap;
  });
  expect(report.diagnostics.some((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN")).toBe(expected);
}, 60_000);

test("a zero-width edge path still has a readable foreground label", async () => {
  const report = await validateChanged("zero-path-width", (draft) => { draft.edges[0].style = { strokeWidth: 0 }; });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "LABEL_VERTICAL_RUN", objectId: "relation" }));
}, 60_000);

test("finite samples diagnose the current animated label and skip zero-opacity entry", async () => {
  const report = await validateChanged("animated-label", (draft) => {
    draft.edges[0] = { ...draft.edges[0], label: "短", visible: false };
    draft.scenes = [{ id: "labels", label: "标签变化", beats: [
      { durationMs: 100, transitionMs: 100, actions: [{ type: "show", target: "relation" }] },
      { durationMs: 100, transitionMs: 0, actions: [{ type: "updateEdge", target: "relation", value: { label: "跨层调用关系说明文字" } }] },
      { durationMs: 100, transitionMs: 0, actions: [{ type: "updateEdge", target: "relation", value: { label: "短" } }] }
    ] }];
  });
  const warnings = report.diagnostics.filter((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN");
  expect(warnings.length).toBeGreaterThan(0);
  expect(warnings.every((issue: { timeMs: number; labelSummary: string }) => issue.timeMs >= 100 && issue.timeMs < 200
    && issue.labelSummary === "跨层调用关系说明文字")).toBe(true);
  expect(report.layout).toMatchObject({ continuousCoverage: false, samples: expect.arrayContaining([
    expect.objectContaining({ timeMs: 0 }), expect.objectContaining({ timeMs: 100 }), expect.objectContaining({ timeMs: 200 })
  ]) });
}, 60_000);

test("label warning identity binds bytes, field, theme and finite sample time", async () => {
  const input = join(root, "identity.json");
  const bytes = await readFile(join(fixtureDirectory, "label-vertical-run.json"), "utf8");
  await writeFile(input, bytes);
  const first = JSON.parse((await command(["validate", "--input", input])).stdout);
  const repeated = JSON.parse((await command(["validate", "--input", input])).stdout);
  const select = (report: { diagnostics: { code: string; issueId: string; warningKey: string; issueContext: unknown }[] }) =>
    report.diagnostics.find((issue) => issue.code === "LABEL_VERTICAL_RUN")!;
  expect(select(first)).toEqual(select(repeated));
  expect(select(first).issueId).toMatch(/^sha256-[a-f0-9]{64}$/u);
  const dark = JSON.parse((await command(["validate", "--input", input, "--theme", "dark"])).stdout);
  expect(select(dark).warningKey).toBe(select(first).warningKey);
  expect(select(dark).issueId).not.toBe(select(first).issueId);
  await writeFile(input, bytes + "\n");
  const changedBytes = JSON.parse((await command(["validate", "--input", input])).stdout);
  expect(select(changedBytes).warningKey).toBe(select(first).warningKey);
  expect(select(changedBytes).issueId).not.toBe(select(first).issueId);
  const animated = await validateChanged("identity-times", (draft) => {
    draft.scenes = [{ id: "hold", label: "保持", beats: [{ durationMs: 100, transitionMs: 0, actions: [] }] }];
  });
  const warnings = animated.diagnostics.filter((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN");
  expect(warnings.map((issue: { timeMs: number }) => issue.timeMs)).toEqual([0, 50, 100]);
  expect(new Set(warnings.map((issue: { issueId: string }) => issue.issueId)).size).toBe(3);
  expect(new Set(warnings.map((issue: { warningKey: string }) => issue.warningKey)).size).toBe(1);
}, 60_000);

test("one exact label decision leaves another label unresolved and retains required output coverage", async () => {
  const name = "two-labels";
  const workspace = join(root, ".diagrams", ".work", name, "task");
  const history = join(workspace, "history");
  const source = JSON.parse(await readFile(join(fixtureDirectory, "label-vertical-run.json"), "utf8")) as Draft;
  const draft = { ...source, viewport: { width: 1000, height: 600 },
    nodes: [...source.nodes, ...source.nodes.map((node) => ({ ...node, id: `${node.id}-second`, x: node.x + 500 }))],
    edges: [...source.edges, { ...source.edges[0], id: "second-relation", from: "from-second", to: "to-second" }] };
  const input = join(root, "two-labels.json");
  const bytes = JSON.stringify(draft);
  await writeFile(input, bytes);
  const initialResult = await command(["author", "--input", input, "--name", name, "--output", history, "--browser", "none", "--svg"]);
  expect(initialResult.code, initialResult.stdout + initialResult.stderr).toBe(0);
  const initial = JSON.parse(initialResult.stdout);
  const warnings = initial.diagnostics.filter((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN");
  expect(warnings).toHaveLength(2);
  expect(warnings.map((issue: { location: string }) => issue.location)).toEqual(["edges[0].label", "edges[1].label"]);
  expect(new Set(warnings.map((issue: { warningKey: string }) => issue.warningKey)).size).toBe(2);
  const decisions = join(workspace, "decisions.json");
  await writeFile(decisions, JSON.stringify([{ sourceRevision: initial.revision.id, issueId: warnings[0].issueId,
    decision: "intentional", reason: "Synthetic contract decision for the first label only; not visual approval." }]));
  const nextResult = await command(["author", "--from", "v001", "--name", name, "--output", history, "--browser", "none", "--decisions", decisions]);
  expect(nextResult.code, nextResult.stdout + nextResult.stderr).toBe(0);
  const next = JSON.parse(nextResult.stdout);
  const initialLayout = initial.qualityCoverage.required.find((entry: { id: string }) => entry.id === "layout");
  expect(next.qualityCoverage.required).toContainEqual(expect.objectContaining({ id: "layout", status: "needs-user-decision", unresolved: initialLayout.unresolved - 1 }));
  expect(next.qualityCoverage.required).toContainEqual(expect.objectContaining({ id: "html", status: "incomplete" }));
  expect(next.qualityCoverage.required).toContainEqual(expect.objectContaining({ format: "svg", status: "incomplete" }));
  expect(next.provenance.originalIssues).toEqual(expect.arrayContaining(warnings.map((issue: { issueId: string }) => expect.objectContaining({ issueId: issue.issueId }))));
  expect(next.diagnostics.filter((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN")).toHaveLength(2);
  expect(next.userDecisions).toHaveLength(1);
  expect(next.completion.requested).toEqual(expect.arrayContaining(["json", "html", "svg"]));
  expect(await readFile(input, "utf8")).toBe(bytes);
  const finalResult = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v002", "--keep-work"]);
  expect(finalResult.code, finalResult.stdout + finalResult.stderr).toBe(0);
  const final = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(final.qualityCoverage.required).toContainEqual(expect.objectContaining({ id: "layout", unresolved: initialLayout.unresolved - 1 }));
  expect(final.qualityCoverage.required).toContainEqual(expect.objectContaining({ format: "svg", status: "incomplete" }));
  expect(final.completion.quality).toBe("needs-user-decision");
}, 60_000);

test.each([
  ["leading-trailing-whitespace", "  跨层调用关系说明文字  ", true],
  ["empty-and-space-paragraphs", "\n \n跨层调用关系说明文字\n  ", true],
  ["wrapped-space-paragraph", " ".repeat(50) + "\n跨层调用关系说明文字\n", true],
  ["spaced-explicit-characters", "跨 \n 层\n 调\n 用\n 关\n 系", false],
  ["soft-run-after-wide-paragraph", "长段落标题\n跨层调用关系说明文字", true]
])("authored whitespace case %s preserves soft-run scope", async (name, label, expected) => {
  const report = await validateChanged(name, (draft) => { draft.edges[0].label = label; });
  expect(report.diagnostics.some((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN")).toBe(expected);
}, 60_000);

test("a visible edge at zero entry opacity has no label risk until its fade becomes painted", async () => {
  const report = await validateChanged("fade-entry", (draft) => {
    draft.edges[0].visible = false;
    draft.scenes = [{ id: "fade", label: "显示关系", beats: [
      { durationMs: 100, transitionMs: 100, actions: [{ type: "show", target: "relation" }] }
    ] }];
  });
  const warnings = report.diagnostics.filter((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN");
  expect(warnings.map((issue: { timeMs: number }) => issue.timeMs)).toEqual([50, 100]);
}, 60_000);
