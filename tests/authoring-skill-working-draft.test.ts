/** Mutable authoring through a copied installed CLI, with explicit publication and recovery. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 400, height: 240 }, nodes: [], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-working-draft-")));
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
  const summary = JSON.parse(result.stdout);
  const report = summary.detailsPath ? JSON.parse(await readFile(summary.detailsPath, "utf8")) : summary;
  return { ...result, report };
}
async function task(name: string) {
  const workspace = join(root, ".diagrams", ".work", name, "task");
  await mkdir(workspace, { recursive: true });
  const input = join(workspace, "draft.json");
  await writeFile(input, JSON.stringify(document));
  return { workspace, input, output: join(workspace, "history") };
}

test("repeated authoring reuses the current draft and publishes without a version chain", async () => {
  const name = "current-draft";
  const t = await task(name);
  const first = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(first.code, first.stdout + first.stderr).toBe(0);
  expect(first.report.workingDraft).toMatchObject({ id: "current", directory: join(t.output, name, "current") });
  const changed = { ...document, title: "Current version" };
  await writeFile(t.input, JSON.stringify(changed));
  const second = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(second.code, second.stdout + second.stderr).toBe(0);
  expect(second.report.workingDraft.directory).toBe(first.report.workingDraft.directory);
  expect(await readdir(join(t.output, name))).toEqual(["current"]);
  expect(JSON.parse(await readFile(join(first.report.workingDraft.directory, "diagram.json"), "utf8"))).toEqual(changed);
  const delivered = await command(["finalize", "--workspace", t.workspace, "--name", name]);
  expect(delivered.code, delivered.stdout + delivered.stderr).toBe(0);
  expect(JSON.parse(await readFile(join(root, ".diagrams", name, "diagram.json"), "utf8"))).toEqual(changed);
  await expect(readdir(t.workspace)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test("a dead operation owner does not prevent continuing the working draft", async () => {
  const name = "interrupted-owner";
  const t = await task(name);
  const authored = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(authored.code, authored.stdout).toBe(0);
  const lock = join(t.output, name, ".current.lock");
  await mkdir(lock);
  await writeFile(join(lock, "owner.json"), JSON.stringify({ pid: 2147483647 }));
  const continued = await command(["author", "--from", "current", "--output", t.output, "--name", name, "--browser", "none"]);
  expect(continued.code, continued.stdout + continued.stderr).toBe(0);
  expect(await readdir(join(t.output, name))).toEqual(["current"]);
}, 60_000);

test("default publication preserves an unrelated destination instead of replacing it", async () => {
  const name = "existing-destination";
  const t = await task(name);
  const destination = join(root, ".diagrams", name);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "keep.txt"), "Unrelated user file");
  const result = await command(["author", "--input", t.input, "--name", name, "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(1);
  expect(await readFile(join(destination, "keep.txt"), "utf8")).toBe("Unrelated user file");
}, 60_000);

test("editing the same task preserves its Agent page without selecting a historical parent", async () => {
  const name = "current-page";
  const t = await task(name);
  const page = join(t.workspace, "page.html");
  const outer = '<!doctype html><html><body><h1>Keep this authored heading</h1><!-- flowsvg:player:start --><!-- flowsvg:player:end --></body></html>';
  await writeFile(page, outer);
  const first = await command(["author", "--input", t.input, "--html", page, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(first.code, first.stdout).toBe(0);
  await writeFile(t.input, JSON.stringify({ ...document, title: "Changed explanation" }));
  const changed = await command(["author", "--input", t.input, "--sync-html", "--output", t.output, "--name", name, "--browser", "none"]);
  expect(changed.code, changed.stdout + changed.stderr).toBe(0);
  expect(await readFile(join(changed.report.workingDraft.directory, "diagram.html"), "utf8")).toContain("Keep this authored heading");
}, 60_000);

test("failed retries keep one source-bound recovery result and preserve earlier delivery", async () => {
  const name = "failed-current";
  const t = await task(name);
  const first = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(first.code, first.stdout).toBe(0);
  const oldHtml = await readFile(join(first.report.workingDraft.directory, "diagram.html"));
  const published = await command(["finalize", "--workspace", t.workspace, "--name", name, "--keep-work"]);
  expect(published.code, published.stdout).toBe(0);
  await writeFile(t.input, '{"invalid":');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const failed = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
    expect(failed.code).toBe(1);
    expect(failed.report.completion.delivery).toBe("incomplete");
    expect(failed.report.recovery.inputSha256).toBe(first.report.input.sha256);
    expect(await readFile(join(failed.report.recovery.directory, "diagram.html"))).toEqual(oldHtml);
    const refused = await command(["finalize", "--workspace", t.workspace, "--name", name]);
    expect(refused.code).toBe(1);
    expect(await readFile(join(root, ".diagrams", name, "diagram.html"))).toEqual(oldHtml);
    expect((await readdir(join(t.output, name))).sort()).toEqual([".recovery", "current"]);
  }
}, 60_000);

test("finalization carries opaque Agent notes before cleaning the task and rejects changed current bytes", async () => {
  const name = "current-notes";
  const t = await task(name);
  const authored = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(authored.code, authored.stdout).toBe(0);
  const notes = join(t.workspace, "issues.md");
  await writeFile(notes, 'A retained semantic question: confirm the external dependency.\n');
  await writeFile(join(authored.report.workingDraft.directory, "diagram.html"), "changed bytes");
  const tampered = await command(["finalize", "--workspace", t.workspace, "--name", name, "--notes", notes]);
  expect(tampered.code).toBe(1);
  expect(await readFile(notes, "utf8")).toContain("retained semantic question");
  const regenerated = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(regenerated.code, regenerated.stdout).toBe(0);
  const delivered = await command(["finalize", "--workspace", t.workspace, "--name", name, "--notes", notes]);
  expect(delivered.code, delivered.stdout + delivered.stderr).toBe(0);
  expect(await readFile(join(root, ".diagrams", name, "report.md"), "utf8")).toContain("## Agent-authored notes\n\nA retained semantic question");
  expect(JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8")).agentNotes).toContain("retained semantic question");
  await expect(readFile(notes)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test("finalization preserves task files while a live author operation holds the draft", async () => {
  const name = "busy-current";
  const t = await task(name);
  const authored = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(authored.code, authored.stdout).toBe(0);
  // Filesystem-boundary fixture: this live process owns the same reservation an author holds.
  const lock = join(t.output, name, ".current.lock");
  await mkdir(lock);
  await writeFile(join(lock, "owner.json"), JSON.stringify({ pid: process.pid }));
  try {
    const finalized = await command(["finalize", "--workspace", t.workspace, "--name", name]);
    expect(finalized.code, finalized.stdout).toBe(1);
    expect(await readFile(t.input, "utf8")).toBe(JSON.stringify(document));
    expect(JSON.parse(await readFile(join(lock, "owner.json"), "utf8")).pid).toBe(process.pid);
  } finally { await rm(lock, { recursive: true, force: true }); }
}, 60_000);

test("recapturing current keeps the editable draft binding and refuses to delete newer source edits", async () => {
  const name = "recaptured-source";
  const t = await task(name);
  const authored = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(authored.code, authored.stdout).toBe(0);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const resumed = await command(["author", "--from", "current", "--output", t.output, "--name", name, "--browser", "none"]);
    expect(resumed.code, resumed.stdout).toBe(0);
  }
  const changed = JSON.stringify({ ...document, title: "Newer editable source" });
  await writeFile(t.input, changed);
  const rejected = await command(["finalize", "--workspace", t.workspace, "--name", name]);
  expect(rejected.code, rejected.stdout).toBe(1);
  expect(rejected.report.diagnostics).toContainEqual(expect.objectContaining({ code: "FINALIZE_SOURCE" }));
  expect(await readFile(t.input, "utf8")).toBe(changed);
  const regenerated = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  expect(regenerated.code, regenerated.stdout).toBe(0);
  const delivered = await command(["finalize", "--workspace", t.workspace, "--name", name]);
  expect(delivered.code, delivered.stdout).toBe(0);
  expect(await readFile(join(root, ".diagrams", name, "diagram.json"), "utf8")).toBe(changed);
}, 60_000);
