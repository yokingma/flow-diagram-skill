/** Mutable geometry edits through a copied installed CLI and canonical task files. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile, symlink, link, chmod } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readCommandReport } from "./helpers/cli-report";

let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-in-place-")));
  skill = join(root, "installed");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
async function command(args: string[]) {
  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (bytes) => { stdout += bytes; });
    child.stderr.on("data", (bytes) => { stderr += bytes; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
  return { ...result, report: await readCommandReport(result.stdout) };
}
const draft = { version: 1, viewport: { width: 500, height: 240 }, nodes: [
  { id: "first", kind: "rect", x: 50, y: 50, width: 160, height: 30,
    content: { blocks: [{ type: "paragraph", text: "完整保留的来源事实与文字。".repeat(20) }] } },
  { id: "second", kind: "rect", x: 50, y: 50, width: 100, height: 50, label: "下一步" }
], edges: [{ id: "link", from: "first", to: "second" }], scenes: [] };
async function task(name: string) {
  const workspace = join(root, ".diagrams", ".work", name, "task");
  await mkdir(workspace, { recursive: true });
  const input = join(workspace, "draft.json");
  await writeFile(input, JSON.stringify(draft));
  return { workspace, input, output: join(workspace, "history") };
}

test("height backfill repeatedly updates one selected task draft while preserving content versions and semantics", async () => {
  const t = await task("measure-current");
  const animated = { ...draft, scenes: [{ id: "change", label: "内容变化", beats: [{ durationMs: 100,
    actions: [{ type: "updateNode", target: "first", value: { content: { blocks: [{ type: "paragraph", text: "替换版本".repeat(100) }] } } }] }] }] };
  await writeFile(t.input, JSON.stringify(animated));
  const first = await command(["measure", "--input", t.input, "--in-place", "--lines"]);
  expect(first.code, first.stdout + first.stderr).toBe(0);
  expect(first.report.measurement).toMatchObject({ output: t.input, method: "sdk-content-estimate", nodes: [
    expect.objectContaining({ nodeId: "first", contentVersions: 2, requiredHeight: expect.any(Number), estimatedLines: expect.any(Array) }),
    expect.objectContaining({ nodeId: "second" })
  ] });
  const measured = JSON.parse(await readFile(t.input, "utf8"));
  expect(measured.nodes[0].height).toBeGreaterThan(30);
  expect({ ...measured, nodes: measured.nodes.map((node: { height: number }, i: number) => ({ ...node, height: animated.nodes[i].height })) }).toEqual(animated);
  const again = await command(["measure", "--input", t.input, "--in-place"]);
  expect(again.code, again.stdout).toBe(0);
  expect(JSON.parse(await readFile(t.input, "utf8"))).toEqual(measured);
  expect(await readdir(t.workspace)).toEqual(["draft.json", "history"]);
  expect(await readdir(join(t.output, "measure-current"))).toEqual([]);
}, 60_000);

test("layout, validation and authoring reuse the selected source before publishing the latest geometry", async () => {
  const name = "layout-current";
  const t = await task(name);
  const planPath = join(t.workspace, "layout-plan.json");
  await writeFile(planPath, JSON.stringify({ schemaVersion: 1, strategy: "layered", canvas: { padding: 20 },
    gaps: { layer: 30 }, layers: ["first", "second"], overrides: { first: { width: 180 }, second: { x: 80 } } }));
  for (let i = 0; i < 2; i += 1) {
    const laidOut = await command(["layout", "--input", t.input, "--plan", planPath, "--in-place", "--geometry"]);
    expect(laidOut.code, laidOut.stdout + laidOut.stderr).toBe(0);
    expect(laidOut.report.output.path).toBe(t.input);
    expect(laidOut.report).toMatchObject({ status: "laid-out", measuredNodes: expect.any(Array), changes: expect.any(Object) });
    const current = JSON.parse(await readFile(t.input, "utf8"));
    expect(current.nodes[0]).toMatchObject({ id: "first", x: 20, y: 20, width: 180, content: draft.nodes[0].content });
    expect(current.nodes[1]).toMatchObject({ id: "second", x: 80, label: "下一步" });
    expect(current.edges).toEqual(draft.edges);
    expect(current.scenes).toEqual([]);
    expect((await command(["validate", "--input", t.input])).code).toBe(0);
    const authored = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
    expect(authored.code, authored.stdout + authored.stderr).toBe(0);
  }
  expect(await readdir(t.workspace)).toEqual(["draft.json", "history", "layout-plan.json"]);
  expect(await readdir(join(t.output, name))).toEqual(["current"]);
  const source = await readFile(t.input, "utf8");
  const finalized = await command(["finalize", "--workspace", t.workspace, "--name", name]);
  expect(finalized.code, finalized.stdout).toBe(0);
  expect(await readFile(join(root, ".diagrams", name, "diagram.json"), "utf8")).toBe(source);
  await expect(readdir(t.workspace)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test("changed task source cannot publish stale generated files before reauthoring", async () => {
  const name = "stale-output";
  const t = await task(name);
  const authored = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(authored.code, authored.stdout).toBe(0);
  const published = await command(["finalize", "--workspace", t.workspace, "--name", name, "--keep-work"]);
  expect(published.code, published.stdout).toBe(0);
  const recaptured = await command(["author", "--from", "current", "--output", t.output, "--name", name, "--browser", "none"]);
  expect(recaptured.code, recaptured.stdout).toBe(0);
  const priorDelivery = await readFile(join(root, ".diagrams", name, "diagram.json"), "utf8");
  expect((await command(["measure", "--input", t.input, "--in-place"])).code).toBe(0);
  const stale = await command(["finalize", "--workspace", t.workspace, "--name", name]);
  expect(stale.code, stale.stdout).toBe(1);
  expect(stale.report.diagnostics).toContainEqual(expect.objectContaining({ code: "FINALIZE_SOURCE" }));
  expect(await readFile(join(root, ".diagrams", name, "diagram.json"), "utf8")).toBe(priorDelivery);
  expect(await readFile(t.input, "utf8")).not.toBe(priorDelivery);
  const regenerated = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(regenerated.code, regenerated.stdout).toBe(0);
  expect((await command(["finalize", "--workspace", t.workspace, "--name", name])).code).toBe(0);
}, 60_000);

test("in-place writes protect external files, generated current results, checkpoints and aliases", async () => {
  const name = "protected-current";
  const t = await task(name);
  const external = join(root, "external.json");
  await writeFile(external, JSON.stringify(draft));
  const current = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  const checkpoint = await command(["author", "--checkpoint", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(checkpoint.code, checkpoint.stdout).toBe(0);
  const alias = join(t.workspace, "alias.json");
  const hardAlias = join(t.workspace, "hard-alias.json");
  await symlink(external, alias);
  await link(external, hardAlias);
  const plan = join(t.workspace, "plan.json");
  await writeFile(plan, JSON.stringify({ schemaVersion: 1, strategy: "layered", layers: ["first", "second"] }));
  for (const input of [external, join(current.report.workingDraft.directory, "diagram.json"),
    join(checkpoint.report.revision.directory, "diagram.json"), alias, hardAlias]) {
    const before = await readFile(input, "utf8");
    for (const args of [["measure", "--input", input, "--in-place"], ["layout", "--input", input, "--plan", plan, "--in-place"]]) {
      const result = await command(args);
      expect(result.code, result.stdout).toBe(1);
      expect(result.report.diagnostics).toContainEqual(expect.objectContaining({ code: "EDITABLE_DRAFT_INVALID" }));
      expect(await readFile(input, "utf8")).toBe(before);
    }
  }
  expect((await command(["measure", "--input", t.input, "--in-place", "--output", external])).report.diagnostics)
    .toContainEqual(expect.objectContaining({ code: "ERR_OPTION_SCOPE", location: "output" }));
}, 60_000);

test("failed edits and a busy task preserve the selected draft and completed delivery", async () => {
  const name = "failed-edit";
  const t = await task(name);
  const authored = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(authored.code, authored.stdout).toBe(0);
  const before = await readFile(t.input, "utf8");
  const plan = join(t.workspace, "invalid-plan.json");
  await writeFile(plan, JSON.stringify({ schemaVersion: 1, strategy: "layered", layers: ["missing"] }));
  const failed = await command(["layout", "--input", t.input, "--plan", plan, "--in-place"]);
  expect(failed.code, failed.stdout).toBe(1);
  expect(failed.report.artifacts).toEqual([]);
  expect(failed.report.output).toBeUndefined();
  expect(await readFile(t.input, "utf8")).toBe(before);
  const animated = { ...draft, scenes: [{ id: "resize", label: "resize", beats: [{ durationMs: 100,
    actions: [{ type: "updateNode", target: "first", value: { width: 200 } }] }] }] };
  const animatedBytes = JSON.stringify(animated);
  await writeFile(t.input, animatedBytes);
  const unsupported = await command(["measure", "--input", t.input, "--in-place"]);
  expect(unsupported.code).toBe(1);
  expect(unsupported.report.diagnostics).toContainEqual(expect.objectContaining({ code: "MEASUREMENT_SIZE_ANIMATION" }));
  expect(await readFile(t.input, "utf8")).toBe(animatedBytes);
  await writeFile(t.input, before);
  const lock = join(t.output, name, ".current.lock");
  await mkdir(lock);
  await writeFile(join(lock, "owner.json"), JSON.stringify({ pid: process.pid }));
  const busy = await command(["measure", "--input", t.input, "--in-place"]);
  expect(busy.code, busy.stdout).toBe(1);
  expect(busy.report.diagnostics).toContainEqual(expect.objectContaining({ code: "WORKING_DRAFT_INVALID" }));
  expect(await readFile(t.input, "utf8")).toBe(before);
  await rm(lock, { recursive: true });
  expect((await command(["measure", "--input", t.input, "--in-place"])).code).toBe(0);
  expect((await readdir(t.workspace)).filter((entry) => entry.includes(".draft-write-"))).toEqual([]);
}, 60_000);

test.skipIf(process.platform === "win32" || process.getuid?.() === 0)("save failure preserves original bytes and leaves no staged output", async () => {
  const name = "write-failed";
  const t = await task(name);
  await mkdir(join(t.output, name), { recursive: true });
  const before = await readFile(t.input, "utf8");
  await chmod(t.workspace, 0o555);
  try {
    const failed = await command(["measure", "--input", t.input, "--in-place"]);
    expect(failed.code, failed.stdout).toBe(1);
    expect(failed.report.diagnostics).toContainEqual(expect.objectContaining({ code: "EDITABLE_DRAFT_WRITE_FAILED", stage: "save", location: t.input }));
    expect(await readFile(t.input, "utf8")).toBe(before);
  } finally { await chmod(t.workspace, 0o755); }
  expect(await readdir(t.workspace)).toEqual(["draft.json", "history"]);
  expect((await command(["measure", "--input", t.input, "--in-place"])).code).toBe(0);
}, 60_000);

test.skipIf(process.platform === "win32")("cancellation while the selected draft is reserved preserves source bytes and permits retry", async () => {
  const name = "cancelled-edit";
  const t = await task(name);
  const before = await readFile(t.input, "utf8");
  const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), "measure", "--input", t.input, "--in-place"], {
    cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
  });
  let stdout = "";
  child.stdout.on("data", (bytes) => { stdout += bytes; });
  const completed = new Promise<number | null>((done) => child.on("close", done));
  const owner = join(t.output, name, ".current.lock", "owner.json");
  let reserved = false;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try { await readFile(owner); reserved = true; break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await new Promise((done) => setTimeout(done, 5));
  }
  expect(reserved).toBe(true);
  child.kill("SIGTERM");
  expect(await completed).toBe(1);
  expect(JSON.parse(stdout).status).toBe("cancelled");
  expect(await readFile(t.input, "utf8")).toBe(before);
  expect(await readdir(t.workspace)).toEqual(["draft.json", "history"]);
  expect(await readdir(join(t.output, name))).toEqual([]);
  expect((await command(["measure", "--input", t.input, "--in-place"])).code).toBe(0);
}, 60_000);

test("a redirected task history cannot create directories or reservations outside the workspace", async () => {
  const name = "redirected-history";
  const t = await task(name);
  const outside = join(root, "outside-history");
  await mkdir(outside);
  await symlink(outside, t.output, "junction");
  const before = await readFile(t.input, "utf8");
  const result = await command(["measure", "--input", t.input, "--in-place"]);
  expect(result.code, result.stdout).toBe(1);
  expect(await readdir(outside)).toEqual([]);
  expect(await readFile(t.input, "utf8")).toBe(before);
}, 60_000);
