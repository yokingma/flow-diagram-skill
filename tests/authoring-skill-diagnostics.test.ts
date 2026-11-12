import { readCommandReport } from "./helpers/cli-report";
/** Exercise diagnostic and revision behavior through an independently copied, installed CLI. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const base = { version: 1, viewport: { width: 500, height: 400 }, nodes: [
  { id: "group", kind: "group", x: 20, y: 20, width: 300, height: 250 },
  { id: "first", parentId: "group", kind: "rect", x: 20, y: 50, width: 100, height: 60, label: "首个节点" },
  { id: "next", parentId: "group", kind: "rect", x: 120, y: 50, width: 100, height: 60 },
  { id: "hidden", kind: "rect", x: -10, y: 0, width: 500, height: 500, visible: false }
], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG 诊断 revisions ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], unit = skill) {
  if (args[0] === "author") args = [...args, "--checkpoint"];
  if (["author", "validate"].includes(args[0])) args = [...args, "--geometry"];
  if (args[0] === "author" && !args.includes("--output")) args = [...args, "--output", join(root, ".diagrams", ".history")];
  if (args[0] === "author" && !args.includes("--browser")) args = [...args, "--browser", "none"];
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult) => {
    const child = spawn(process.execPath, [join(unit, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}

test("optional geometry calculations report evaluated objects and times without changing the draft or blocking HTML", async () => {
  const input = join(root, "warnings.json");
  const draft = { ...base, nodes: [...base.nodes,
    { id: "outside", parentId: "group", kind: "rect", x: 280, y: 100, width: 100, height: 60 },
    { id: "clipped", kind: "rect", x: 470, y: 330, width: 100, height: 60 }
  ], scenes: [{ id: "changes", label: "变化", beats: [
    { durationMs: 1000, transitionMs: 200, actions: [{ type: "updateNode", target: "next", value: { x: 80 } },
      { type: "updateNode", target: "first", value: { label: "很长的中文说明文字".repeat(20) } }] }
  ] }] };
  const bytes = JSON.stringify(draft, null, 2);
  await writeFile(input, bytes);
  const result = await command(["author", "--input", input, "--name", "warnings"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "delivered", checks: { layout: "computed", visual: "not-run" }, userDecisions: [] });
  for (const [code, objectId] of [["text-overflow", "first"], ["node-overlap", "first"], ["child-outside-parent", "outside"], ["canvas-clipping", "clipped"]]) {
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code, objectId, severity: "info", stage: "layout", timeMs: expect.any(Number), method: expect.any(String), limitations: expect.any(String) }));
  }
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "node-overlap", timeMs: 100 }));
  expect(report.layout.samples).toContainEqual(expect.objectContaining({ timeMs: 100, focusTarget: null }));
  expect(await readFile(input, "utf8")).toBe(bytes);
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(await readFile(join(report.revision.directory, "diagram.html"), "utf8")).toContain("很长的中文");
}, 60_000);

test("visible sibling adjacency, normal ancestors, hidden nodes and intentional focus do not produce geometric warnings", async () => {
  const input = join(root, "negatives.json");
  await writeFile(input, JSON.stringify({ ...base, scenes: [{ id: "focus", label: "局部", beats: [
    { durationMs: 500, actions: [{ type: "focus", target: "first" }] },
    { durationMs: 500, actions: [{ type: "hide", target: "group" }] }
  ] }] }));
  const result = await command(["author", "--browser", "none", "--input", input, "--name", "negatives"]);
  expect(result.code, result.stdout).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.checks.layout).toBe("computed");
  expect(report.diagnostics.filter((item: { stage: string }) => item.stage === "layout")).toEqual([]);
  expect(report.layout.samples).toContainEqual(expect.objectContaining({ focusTarget: "first" }));
  expect(report.layout.continuousCoverage).toBe(false);
}, 60_000);

test("parent selection rejects ambiguous history and mismatched parents while preserving failed draft numbers", async () => {
  const input = join(root, "select.json");
  await writeFile(input, JSON.stringify(base));
  const first = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "selection"])).stdout));
  const ambiguous = (await readCommandReport((await command(["author", "--browser", "none", "--input", join(first.revision.directory, "diagram.json"), "--name", "selection"])).stdout));
  expect(ambiguous).toMatchObject({ status: "failed", stage: "revision", revision: { id: "v002" }, checks: { validation: "not-run" } });
  expect(ambiguous.diagnostics[0].code).toBe("PARENT_SELECTION");
  const second = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "selection", "--parent", "v001"])).stdout));
  expect(second.revision.id).toBe("v003");
  const mismatched = (await readCommandReport((await command(["author", "--browser", "none", "--input", join(first.revision.directory, "diagram.json"), "--name", "selection", "--parent", "v003"])).stdout));
  expect(mismatched.status).toBe("failed");
  expect(mismatched.diagnostics[0].code).toBe("PARENT_SELECTION");
  const traversal = (await readCommandReport((await command(["author", "--browser", "none", "--from", "../v001", "--name", "selection"])).stdout));
  expect(traversal.status).toBe("failed");
  expect(traversal.diagnostics[0].code).toBe("PARENT_SELECTION");
}, 60_000);

test("transition-only collisions and externally modified parent JSON remain observable in a fresh revision", async () => {
  const input = join(root, "crossing.json");
  await writeFile(input, JSON.stringify({ version: 1, viewport: { width: 500, height: 200 }, nodes: [
    { id: "moving", kind: "rect", x: 10, y: 30, width: 50, height: 50 },
    { id: "stationary", kind: "rect", x: 150, y: 30, width: 50, height: 50 }
  ], edges: [], scenes: [{ id: "move", label: "跨越", beats: [{ durationMs: 1000, transitionMs: 1000,
    actions: [{ type: "updateNode", target: "moving", value: { x: 300 } }] }] }] }));
  const initial = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "moving"])).stdout));
  const overlaps = initial.diagnostics.filter((issue: { code: string }) => issue.code === "node-overlap");
  expect(overlaps).toEqual([expect.objectContaining({ timeMs: 500, objectId: "moving", relatedObjectIds: ["stationary"] })]);
  const external = JSON.stringify({ ...base, title: "外部修改的父图解" });
  await writeFile(join(initial.revision.directory, "diagram.json"), external);
  const result = await command(["author", "--browser", "none", "--from", "v001", "--name", "moving"]);
  expect(result.code, result.stdout).toBe(0);
  const next = (await readCommandReport(result.stdout));
  expect(next.provenance.parent.externallyModified).toBe(true);
  expect(next.provenance.parent.inputSha256).toBe(next.input.sha256);
  expect(next.provenance.parent.recordedInputSha256).toBe(initial.input.sha256);
  expect(await readFile(join(next.revision.directory, "diagram.json"), "utf8")).toBe(external);
  expect(await readFile(join(initial.revision.directory, "diagram.json"), "utf8")).toBe(external);
}, 60_000);

test("validatable and compilable but unevaluable geometry stops delivery with a saved diagnostic", async () => {
  const input = join(root, "unevaluable.json");
  const bytes = JSON.stringify({ version: 1, viewport: { width: 640, height: 320, fitHeight: { padding: 1e308 } },
    nodes: [{ id: "large", kind: "rect", x: 0, y: 1e308, width: 100, height: 1e308 }], edges: [], scenes: [] });
  await writeFile(input, bytes);
  const result = await command(["author", "--input", input, "--name", "unevaluable", "--svg"]);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "failed", stage: "layout", checks: { validation: "passed", compilation: "passed", layout: "failed" }, completion: { delivery: "incomplete", completed: ["json"] } });
  expect(report.diagnostics[0]).toMatchObject({ code: "FRAME_EVALUATION_FAILED", stage: "layout", location: "timeMs=0" });
  expect(report.diagnostics[0].reason).toContain("finite");
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(report.artifacts.map((artifact: { kind: string }) => artifact.kind)).toEqual(["json", "report-json", "report-markdown"]);
}, 60_000);


test("historical selection does not read a parent directory redirected outside the chosen diagram", async () => {
  const input = join(root, "scope.json");
  await writeFile(input, JSON.stringify(base));
  const parent = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "scope-source"])).stdout));
  const initial = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "scope-target"])).stdout));
  await symlink(parent.revision.directory, join(root, ".diagrams", ".history", "scope-target", "v020"), "junction");
  const result = await command(["author", "--browser", "none", "--from", "v020", "--name", "scope-target"]);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report.diagnostics[0].code).toBe("PARENT_SELECTION");
  expect(report.artifacts.some((artifact: { kind: string }) => artifact.kind === "json")).toBe(false);
  expect(await readFile(join(initial.revision.directory, "diagram.json"), "utf8")).toBe(JSON.stringify(base));
}, 60_000);


test("installed SDK geometry risks retain exact identities without browser or draft changes", async () => {
  const input = join(root, "geometry.json");
  const draft = { version: 1, viewport: { width: 600, height: 400 }, nodes: [
    { id: "from", kind: "rect", x: 20, y: 100, width: 40, height: 40 },
    { id: "to", kind: "rect", x: 400, y: 100, width: 40, height: 40 },
    { id: "barrier", kind: "rect", x: 200, y: 100, width: 40, height: 40 },
    { id: "label", kind: "rect", x: 100, y: 250, width: 80, height: 10, label: "one\ntwo\nthree" },
    { id: "other", kind: "rect", x: 125, y: 225, width: 30, height: 15, label: "two" }
  ], edges: [{ id: "edge", from: "from", to: "to", route: "straight" }], scenes: [] };
  const bytes = JSON.stringify(draft, null, 2);
  await writeFile(input, bytes);
  const result = await command(["author", "--input", input, "--name", "geometry", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  for (const code of ["edge-node-overlap", "label-node-overlap", "label-overlap"]) {
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code, warningKey: expect.any(String), issueId: expect.stringMatching(/^sha256-[a-f0-9]{64}$/),
      sourceRevision: "v001", relatedObjectIds: expect.any(Array), location: expect.any(String), timeMs: 0 }));
  }
  expect(report.layout.continuousCoverage).toBe(false);
  expect(report.checks.visual).toBe("not-run");
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(new Set(report.diagnostics.filter((issue: { issueId?: string }) => issue.issueId).map((issue: { issueId: string }) => issue.issueId)).size)
    .toBe(report.diagnostics.filter((issue: { issueId?: string }) => issue.issueId).length);
}, 60_000);

const pairDraft = { version: 1, viewport: { width: 600, height: 400 }, nodes: [
  { id: "a", kind: "rect", x: 100, y: 100, width: 40, height: 40, label: "A" },
  { id: "b", kind: "rect", x: 100, y: 100, width: 40, height: 40, label: "B" },
  { id: "c", kind: "rect", x: 100, y: 100, width: 40, height: 40, label: "C" }
], edges: [], scenes: [{ id: "wait", label: "wait", beats: [{ durationMs: 100, actions: [] }] }] };

test("warning identity is stable across revisions and separates source bytes, theme, fields and time", async () => {
  const input = join(root, "identity.json");
  const source = JSON.stringify(pairDraft);
  await writeFile(input, source);
  const initial = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "identities"])).stdout));
  const repeat = (await readCommandReport((await command(["author", "--browser", "none", "--from", "v001", "--name", "identities"])).stdout));
  expect(repeat.diagnostics.map((item: { issueId: string }) => item.issueId)).toEqual(initial.diagnostics.map((item: { issueId: string }) => item.issueId));
  expect(new Set(initial.diagnostics.filter((item: { issueId?: string }) => item.issueId).map((item: { issueId: string }) => item.issueId)).size).toBe(initial.diagnostics.filter((item: { issueId?: string }) => item.issueId).length);
  const dark = (await readCommandReport((await command(["author", "--browser", "none", "--from", "v001", "--name", "identities", "--theme", "dark"])).stdout));
  expect(dark.diagnostics[0].issueId).not.toBe(initial.diagnostics[0].issueId);
  await writeFile(input, source + "\n");
  const whitespace = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "identities", "--parent", "v001"])).stdout));
  expect(whitespace.diagnostics[0].issueId).not.toBe(initial.diagnostics[0].issueId);
}, 60_000);

test("historical issues and user choices remain opaque provenance without a new approval workflow", async () => {
  const input = join(root, "legacy.json");
  await writeFile(input, JSON.stringify(pairDraft));
  const initial = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "legacy"])).stdout));
  const oldIssue = { severity: "warning", stage: "layout", code: "node-overlap", objectId: "a", location: "nodes[0]", timeMs: 0, reason: "historical" };
  const oldDecision = { issue: "node-overlap", objectId: "a", decision: "defer", reason: "historical choice", recordedIn: "v001" };
  const prior = { ...initial, diagnostics: [oldIssue], userDecisions: [oldDecision] };
  const priorBytes = JSON.stringify(prior, null, 2);
  await writeFile(join(initial.revision.directory, "report.json"), priorBytes);
  const inherited = (await readCommandReport((await command(["author", "--browser", "none", "--from", "v001", "--name", "legacy"])).stdout));
  expect(inherited.provenance.originalIssues).toEqual([{ ...oldIssue, revision: "v001" }]);
  expect(inherited.userDecisions).toEqual([oldDecision]);
  expect(await readFile(join(initial.revision.directory, "report.json"), "utf8")).toBe(priorBytes);
}, 60_000);
