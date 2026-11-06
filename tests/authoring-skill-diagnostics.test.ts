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

test("four layout risks report evaluated objects and times without changing the draft or blocking HTML", async () => {
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
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({ status: "delivered", checks: { layout: "warnings", visual: "not-run" }, userDecisions: [] });
  for (const [code, objectId] of [["text-overflow", "first"], ["node-overlap", "first"], ["child-outside-parent", "outside"], ["canvas-clipping", "clipped"]]) {
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code, objectId, severity: "warning", stage: "layout", timeMs: expect.any(Number), impact: expect.any(String), candidates: expect.any(Array) }));
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
  const report = JSON.parse(result.stdout);
  expect(report.checks.layout).toBe("passed");
  expect(report.diagnostics.filter((item: { stage: string }) => item.stage === "layout")).toEqual([]);
  expect(report.layout.samples).toContainEqual(expect.objectContaining({ focusTarget: "first" }));
  expect(report.layout.continuousCoverage).toBe(false);
}, 60_000);

test("explicit historical revisions retain original issues, decisions and external edits in new versions", async () => {
  const input = join(root, "revision.json");
  const bytes = JSON.stringify({ ...base, nodes: [...base.nodes, { id: "clip", kind: "rect", x: 480, y: 10, width: 80, height: 60 }] }, null, 2);
  await writeFile(input, bytes);
  const initial = JSON.parse((await command(["author", "--input", input, "--name", "history"])).stdout);
  await writeFile(join(initial.revision.directory, "diagram.html"), "USER EXTERNAL EDIT");
  const priorReport = await readFile(join(initial.revision.directory, "report.json"), "utf8");
  const decisions = join(root, "decisions.json");
  await writeFile(decisions, JSON.stringify([{ sourceRevision: initial.revision.id, issueId: initial.diagnostics.find((item: { code: string; objectId: string }) => item.code === "canvas-clipping" && item.objectId === "clip").issueId, decision: "intentional", reason: "用户明确选择保留边缘节点" }]));
  const result = await command(["author", "--from", "v001", "--name", "history", "--decisions", decisions]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.revision).toMatchObject({ id: "v002", parent: "v001" });
  expect(report.provenance.parent).toMatchObject({ directory: initial.revision.directory, inputSha256: initial.input.sha256 });
  expect(report.provenance.originalIssues).toContainEqual(expect.objectContaining({ code: "canvas-clipping", objectId: "clip" }));
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "canvas-clipping", objectId: "clip" }));
  expect(report.userDecisions).toContainEqual(expect.objectContaining({ decision: "intentional", reason: "用户明确选择保留边缘节点" }));
  expect(report.completion.quality).toBe("incomplete");
  expect(report.qualityCoverage.required).toContainEqual(expect.objectContaining({ id: "layout", status: "passed" }));
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(await readFile(join(initial.revision.directory, "report.json"), "utf8")).toBe(priorReport);
  expect(await readFile(join(initial.revision.directory, "diagram.html"), "utf8")).toBe("USER EXTERNAL EDIT");
  const inherited = JSON.parse((await command(["author", "--browser", "none", "--from", "v002", "--name", "history"])).stdout);
  expect(inherited.userDecisions).toEqual(report.userDecisions);
  expect(await readFile(input, "utf8")).toBe(bytes);
  const markdown = await readFile(join(report.revision.directory, "report.md"), "utf8");
  expect(markdown).toContain("用户明确选择保留边缘节点");
  expect(markdown).toContain("canvas-clipping");
}, 60_000);

test("parent selection rejects ambiguous history and mismatched parents while preserving failed draft numbers", async () => {
  const input = join(root, "select.json");
  await writeFile(input, JSON.stringify(base));
  const first = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "selection"])).stdout);
  const ambiguous = JSON.parse((await command(["author", "--browser", "none", "--input", join(first.revision.directory, "diagram.json"), "--name", "selection"])).stdout);
  expect(ambiguous).toMatchObject({ status: "failed", stage: "revision", revision: { id: "v002" }, checks: { validation: "not-run" } });
  expect(ambiguous.diagnostics[0].code).toBe("PARENT_SELECTION");
  const second = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "selection", "--parent", "v001"])).stdout);
  expect(second.revision.id).toBe("v003");
  const mismatched = JSON.parse((await command(["author", "--browser", "none", "--input", join(first.revision.directory, "diagram.json"), "--name", "selection", "--parent", "v003"])).stdout);
  expect(mismatched.status).toBe("failed");
  expect(mismatched.diagnostics[0].code).toBe("PARENT_SELECTION");
  const traversal = JSON.parse((await command(["author", "--browser", "none", "--from", "../v001", "--name", "selection"])).stdout);
  expect(traversal.status).toBe("failed");
  expect(traversal.diagnostics[0].code).toBe("PARENT_SELECTION");
}, 60_000);

test("concurrent imported revisions reserve distinct numbers and a decided fix preserves the parent's warning history", async () => {
  const input = join(root, "concurrent.json");
  await writeFile(input, JSON.stringify(base));
  const results = await Promise.all([0, 1, 2].map(() => command(["author", "--browser", "none", "--input", input, "--name", "parallel", "--output", join(root, "parallel history")])));
  const reports = results.map((result) => { expect(result.code, result.stdout).toBe(0); return JSON.parse(result.stdout); });
  expect(new Set(reports.map((report) => report.revision.id)).size).toBe(3);
  const decisions = join(root, "fix-decisions.json");
  const history = JSON.parse(await readFile(join(root, ".diagrams", ".history", "history", "v001", "report.json"), "utf8"));
  await writeFile(decisions, JSON.stringify([{ sourceRevision: "v001", issueId: history.diagnostics.find((item: { code: string; objectId: string }) => item.code === "canvas-clipping" && item.objectId === "clip").issueId, decision: "revise", reason: "用户要求移回画布" }]));
  const parentBytes = await readFile(join(root, ".diagrams", ".history", "history", "v001", "diagram.json"), "utf8");
  const revised = JSON.parse(parentBytes);
  revised.nodes = revised.nodes.map((node: { id: string; x: number }) => node.id === "clip" ? { ...node, x: 400 } : node);
  await writeFile(input, JSON.stringify(revised));
  const result = await command(["author", "--input", input, "--parent", "v001", "--name", "history", "--decisions", decisions]);
  expect(result.code, result.stdout).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.checks.layout).toBe("passed");
  expect(report.diagnostics.some((issue: { code: string }) => issue.code === "canvas-clipping")).toBe(false);
  expect(report.provenance.originalIssues).toContainEqual(expect.objectContaining({ code: "canvas-clipping" }));
  expect(report.userDecisions).toContainEqual(expect.objectContaining({ decision: "revise" }));
  expect(await readFile(join(root, ".diagrams", ".history", "history", "v001", "diagram.json"), "utf8")).toBe(parentBytes);
}, 60_000);

test("transition-only collisions and externally modified parent JSON remain observable in a fresh revision", async () => {
  const input = join(root, "crossing.json");
  await writeFile(input, JSON.stringify({ version: 1, viewport: { width: 500, height: 200 }, nodes: [
    { id: "moving", kind: "rect", x: 10, y: 30, width: 50, height: 50 },
    { id: "stationary", kind: "rect", x: 150, y: 30, width: 50, height: 50 }
  ], edges: [], scenes: [{ id: "move", label: "跨越", beats: [{ durationMs: 1000, transitionMs: 1000,
    actions: [{ type: "updateNode", target: "moving", value: { x: 300 } }] }] }] }));
  const initial = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "moving"])).stdout);
  const overlaps = initial.diagnostics.filter((issue: { code: string }) => issue.code === "node-overlap");
  expect(overlaps).toEqual([expect.objectContaining({ timeMs: 500, objectId: "moving", relatedObjectIds: ["stationary"] })]);
  const external = JSON.stringify({ ...base, title: "外部修改的父图解" });
  await writeFile(join(initial.revision.directory, "diagram.json"), external);
  const result = await command(["author", "--browser", "none", "--from", "v001", "--name", "moving"]);
  expect(result.code, result.stdout).toBe(0);
  const next = JSON.parse(result.stdout);
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
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({ status: "failed", stage: "layout", checks: { validation: "passed", compilation: "passed", layout: "failed" }, completion: { delivery: "incomplete", completed: ["json"] } });
  expect(report.diagnostics[0]).toMatchObject({ code: "FRAME_EVALUATION_FAILED", stage: "layout", location: "timeMs=0" });
  expect(report.diagnostics[0].reason).toContain("finite");
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(report.artifacts.map((artifact: { kind: string }) => artifact.kind)).toEqual(["json", "report-json", "report-markdown"]);
}, 60_000);


test("historical selection does not read a parent directory redirected outside the chosen diagram", async () => {
  const input = join(root, "scope.json");
  await writeFile(input, JSON.stringify(base));
  const parent = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "scope-source"])).stdout);
  const initial = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "scope-target"])).stdout);
  await symlink(parent.revision.directory, join(root, ".diagrams", ".history", "scope-target", "v020"), "junction");
  const result = await command(["author", "--browser", "none", "--from", "v020", "--name", "scope-target"]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
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
  const report = JSON.parse(result.stdout);
  for (const code of ["edge-node-overlap", "label-node-overlap", "label-overlap"]) {
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code, warningKey: expect.any(String), issueId: expect.stringMatching(/^sha256-[a-f0-9]{64}$/),
      sourceRevision: "v001", relatedObjectIds: expect.any(Array), location: expect.any(String), timeMs: 0 }));
  }
  expect(report.layout.continuousCoverage).toBe(false);
  expect(report.checks.visual).toBe("not-run");
  expect(report.completion.quality).toBe("needs-user-decision");
  expect(await readFile(join(report.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  expect(new Set(report.diagnostics.filter((issue: { issueId?: string }) => issue.issueId).map((issue: { issueId: string }) => issue.issueId)).size)
    .toBe(report.diagnostics.filter((issue: { issueId?: string }) => issue.issueId).length);
}, 60_000);

const pairDraft = { version: 1, viewport: { width: 600, height: 400 }, nodes: [
  { id: "a", kind: "rect", x: 100, y: 100, width: 40, height: 40, label: "A" },
  { id: "b", kind: "rect", x: 100, y: 100, width: 40, height: 40, label: "B" },
  { id: "c", kind: "rect", x: 100, y: 100, width: 40, height: 40, label: "C" }
], edges: [], scenes: [{ id: "wait", label: "wait", beats: [{ durationMs: 100, actions: [] }] }] };

test("precise A-B decision leaves A-C and later samples unresolved while genuine history stays readable", async () => {
  const input = join(root, "pairs.json");
  await writeFile(input, JSON.stringify(pairDraft));
  const initial = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "pairs"])).stdout);
  const issue = initial.diagnostics.find((item: { code: string; objectId: string; relatedObjectIds: string[]; timeMs: number }) =>
    item.code === "label-overlap" && item.objectId === "a" && item.relatedObjectIds.includes("b") && item.timeMs === 0);
  const decisions = join(root, "precise.json");
  await writeFile(decisions, JSON.stringify([{ sourceRevision: "v001", issueId: issue.issueId, decision: "intentional", reason: "用户只接受 A-B 此时点" }]));
  const result = await command(["author", "--from", "v001", "--name", "pairs", "--decisions", decisions, "--browser", "none"]);
  expect(result.code, result.stdout).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.userDecisions).toHaveLength(1);
  expect(report.userDecisions[0]).toMatchObject({ sourceRevision: "v001", issueId: issue.issueId, decision: "intentional", issueContext: issue.issueContext });
  expect(report.diagnostics.filter((item: { stage: string }) => item.stage === "layout")).toHaveLength(initial.diagnostics.filter((item: { stage: string }) => item.stage === "layout").length);
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "label-overlap", objectId: "a", relatedObjectIds: ["c"], timeMs: 0 }));
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "label-overlap", objectId: "a", relatedObjectIds: ["b"], timeMs: 50 }));
  expect(report.completion.quality).toBe("needs-user-decision");
  const grandchild = await command(["author", "--browser", "none", "--from", report.revision.id, "--name", "pairs", "--decisions", decisions]);
  expect(grandchild.code, grandchild.stdout).toBe(0);
  const markdown = await readFile(join(report.revision.directory, "report.md"), "utf8");
  expect(markdown).toContain(issue.issueId);
  expect(markdown).toContain(issue.warningKey);
}, 60_000);

test("warning identity is stable across revisions and separates source bytes, theme, fields and time", async () => {
  const input = join(root, "identity.json");
  const source = JSON.stringify(pairDraft);
  await writeFile(input, source);
  const initial = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "identities"])).stdout);
  const repeat = JSON.parse((await command(["author", "--browser", "none", "--from", "v001", "--name", "identities"])).stdout);
  expect(repeat.diagnostics.map((item: { issueId: string }) => item.issueId)).toEqual(initial.diagnostics.map((item: { issueId: string }) => item.issueId));
  expect(new Set(initial.diagnostics.filter((item: { issueId?: string }) => item.issueId).map((item: { issueId: string }) => item.issueId)).size).toBe(initial.diagnostics.filter((item: { issueId?: string }) => item.issueId).length);
  const dark = JSON.parse((await command(["author", "--browser", "none", "--from", "v001", "--name", "identities", "--theme", "dark"])).stdout);
  expect(dark.diagnostics[0].issueId).not.toBe(initial.diagnostics[0].issueId);
  await writeFile(input, source + "\n");
  const whitespace = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "identities", "--parent", "v001"])).stdout);
  expect(whitespace.diagnostics[0].issueId).not.toBe(initial.diagnostics[0].issueId);
  const decisions = join(root, "old-context.json");
  await writeFile(decisions, JSON.stringify([{ sourceRevision: "v001", issueId: initial.diagnostics[0].issueId, decision: "revise", reason: "用户授权针对原警告修订" }]));
  const changed = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "identities", "--parent", "v001", "--decisions", decisions])).stdout);
  expect(changed.status).toBe("delivered");
  expect(changed.userDecisions[0].issueId).toBe(initial.diagnostics[0].issueId);
  expect(changed.userDecisions[0].issueId).not.toBe(changed.diagnostics[0].issueId);
}, 60_000);

test("new submissions reject broad fallback, forged identity and sibling source revisions", async () => {
  const input = join(root, "reject.json");
  await writeFile(input, JSON.stringify(pairDraft));
  const initial = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "reject"])).stdout);
  const sibling = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "reject"])).stdout);
  const decisions = join(root, "reject-decisions.json");
  const valid = { sourceRevision: "v001", issueId: initial.diagnostics[0].issueId, decision: "intentional", reason: "用户明确选择" };
  for (const invalid of [
    { issue: initial.diagnostics[0].code, objectId: initial.diagnostics[0].objectId, decision: "intentional", reason: "旧式宽泛引用" },
    { ...valid, issueId: "sha256-" + "0".repeat(64) }, { ...valid, sourceRevision: sibling.revision.id },
    { ...valid, sourceRevision: "../v001" }, { ...valid, objectId: "a" }
  ]) {
    await writeFile(decisions, JSON.stringify([invalid]));
    const result = await command(["author", "--browser", "none", "--from", "v001", "--name", "reject", "--decisions", decisions]);
    expect(result.code, result.stdout).toBe(1);
    expect(JSON.parse(result.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "USER_DECISIONS" }));
  }
  await writeFile(decisions, JSON.stringify([valid]));
  const withoutParent = await command(["author", "--browser", "none", "--input", input, "--name", "reject", "--decisions", decisions]);
  expect(withoutParent.code).toBe(1);
}, 60_000);

test("historical records without identities remain unchanged and cannot receive a new broad decision", async () => {
  const input = join(root, "legacy.json");
  await writeFile(input, JSON.stringify(pairDraft));
  const initial = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "legacy"])).stdout);
  const oldIssue = { severity: "warning", stage: "layout", code: "node-overlap", objectId: "a", location: "nodes[0]", timeMs: 0, reason: "historical" };
  const oldDecision = { issue: "node-overlap", objectId: "a", decision: "defer", reason: "historical choice", recordedIn: "v001" };
  const prior = { ...initial, diagnostics: [oldIssue], userDecisions: [oldDecision] };
  const priorBytes = JSON.stringify(prior, null, 2);
  await writeFile(join(initial.revision.directory, "report.json"), priorBytes);
  const inherited = JSON.parse((await command(["author", "--browser", "none", "--from", "v001", "--name", "legacy"])).stdout);
  expect(inherited.provenance.originalIssues).toEqual([{ ...oldIssue, revision: "v001" }]);
  expect(inherited.userDecisions).toEqual([oldDecision]);
  expect(await readFile(join(initial.revision.directory, "report.json"), "utf8")).toBe(priorBytes);
  const decisions = join(root, "legacy-decisions.json");
  await writeFile(decisions, JSON.stringify([{ sourceRevision: "v001", issueId: initial.diagnostics[0].issueId, decision: "intentional", reason: "未登记的身份" }]));
  const rejected = await command(["author", "--browser", "none", "--from", "v001", "--name", "legacy", "--decisions", decisions]);
  expect(rejected.code).toBe(1);
  expect(JSON.parse(rejected.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "USER_DECISIONS" }));
}, 60_000);

test("decision verification rejects edited source bytes, source context and fabricated flattened history", async () => {
  const input = join(root, "tamper.json");
  await writeFile(input, JSON.stringify(pairDraft));
  const initial = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "tamper"])).stdout);
  const second = JSON.parse((await command(["author", "--browser", "none", "--from", "v001", "--name", "tamper"])).stdout);
  const decisions = join(root, "tamper-decisions.json");
  const issue = initial.diagnostics[0];
  await writeFile(decisions, JSON.stringify([{ sourceRevision: "v001", issueId: issue.issueId, decision: "defer", reason: "用户只引用原始问题" }]));
  const reportPath = join(initial.revision.directory, "report.json");
  const originalReport = await readFile(reportPath, "utf8");
  const sourcePath = join(initial.revision.directory, "diagram.json");
  const originalSource = await readFile(sourcePath, "utf8");
  for (const tampered of [
    { ...initial, diagnostics: {} },
    { ...initial, theme: "dark" },
    { ...initial, sdk: { ...initial.sdk, integrity: initial.sdk.integrity + "changed" } },
    { ...initial, diagnostics: initial.diagnostics.map((item: { issueId: string; location: string }) => item.issueId === issue.issueId ? { ...item, location: "nodes[999]" } : item) }
  ]) {
    await writeFile(reportPath, JSON.stringify(tampered));
    const result = await command(["author", "--browser", "none", "--from", second.revision.id, "--name", "tamper", "--decisions", decisions]);
    expect(result.code, result.stdout).toBe(1);
    expect(JSON.parse(result.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "USER_DECISIONS" }));
  }
  await writeFile(reportPath, JSON.stringify({ ...initial, diagnostics: initial.diagnostics.map((item: { issueId: string }) =>
    item.issueId === issue.issueId ? { ...item, location: "nodes[999]" } : item) }));
  const directTamper = await command(["author", "--browser", "none", "--from", "v001", "--name", "tamper", "--decisions", decisions]);
  expect(directTamper.code).toBe(1);
  await writeFile(reportPath, originalReport);
  await writeFile(sourcePath, originalSource + "\n");
  const changed = await command(["author", "--browser", "none", "--from", second.revision.id, "--name", "tamper", "--decisions", decisions]);
  expect(changed.code, changed.stdout).toBe(1);
  await writeFile(sourcePath, originalSource);
  const sibling = JSON.parse((await command(["author", "--browser", "none", "--input", input, "--name", "tamper"])).stdout);
  const parentPath = join(second.revision.directory, "report.json");
  await writeFile(parentPath, JSON.stringify({ ...second, provenance: { ...second.provenance,
    originalIssues: [...second.provenance.originalIssues, { ...sibling.diagnostics[0], revision: sibling.revision.id }] } }));
  await writeFile(decisions, JSON.stringify([{ sourceRevision: sibling.revision.id, issueId: sibling.diagnostics[0].issueId, decision: "intentional", reason: "伪造历史引用" }]));
  const forged = await command(["author", "--browser", "none", "--from", second.revision.id, "--name", "tamper", "--decisions", decisions]);
  expect(forged.code, forged.stdout).toBe(1);
}, 60_000);
