/** Ordinary installed-CLI validation reads exact input without creating design history. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 400, height: 300 }, nodes: [], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg validation ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), ...env }
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("repeated validation reports exact source identity and creates no history or artifacts", async () => {
  const input = join(root, "draft.json");
  const bytes = JSON.stringify(document, null, 2) + "\n";
  await writeFile(input, bytes);
  for (const round of [1, 2]) {
    const result = await command(["validate", "--input", input, "--name", "draft", "--output", join(root, "history")]);
    expect(result.code, result.stderr + result.stdout).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ command: "validate", status: "validated", revision: null,
      input: { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: Buffer.byteLength(bytes) },
      validation: { snapshotCreated: false, sourceRevision: null },
      checks: { validation: "passed", compilation: "passed", layout: "passed", visual: "not-run", html: "not-run" }, artifacts: [] });
    expect(report.sdk).toMatchObject({ version: "0.3.1" });
    expect(report.layout).toMatchObject({ continuousCoverage: false });
    expect(await readFile(input, "utf8"), `source after run ${round}`).toBe(bytes);
    expect(await readdir(root)).not.toContain("history");
    expect(await readdir(root)).not.toContain(".diagrams");
  }
}, 60_000);

test("draft warning identity keeps finite static and animated diagnostics without a saved source revision", async () => {
  const input = join(root, "warning.json");
  const warningDocument = { ...document, nodes: [{ id: "a", kind: "rect", x: 380, y: 280, width: 100, height: 100 }] };
  for (const scenes of [[], [{ id: "motion", label: "Move", beats: [{ durationMs: 1000, transitionMs: 400,
    actions: [{ type: "updateNode", target: "a", value: { x: 390 } }] }] }]]) {
    await writeFile(input, JSON.stringify({ ...warningDocument, scenes }));
    const result = await command(["validate", "--input", input, "--name", "warning"]);
    expect(result.code, result.stdout).toBe(0);
    const report = JSON.parse(result.stdout);
    const clipping = report.diagnostics.filter((item: { code: string }) => item.code === "canvas-clipping");
    expect(clipping.length).toBeGreaterThan(0);
    expect(clipping[0]).toMatchObject({ sourceRevision: null, issueContext: { sourceSha256: report.input.sha256, theme: "light" } });
    expect(clipping[0].issueId).toMatch(/^sha256-[0-9a-f]{64}$/u);
    expect(report.layout.samples.length).toBe(scenes.length ? 5 : 1);
    expect(report.layout.continuousCoverage).toBe(false);
    expect(report.completion.quality).toBe("incomplete");
  }
}, 60_000);

test("validating an explicit saved revision creates nothing and rejects changed or escaped sources", async () => {
  const input = join(root, "saved-source.json");
  const output = join(root, "saved-history");
  await writeFile(input, JSON.stringify(document));
  const authored = JSON.parse((await command(["author", "--input", input, "--name", "saved", "--output", output, "--browser", "none"])).stdout);
  const reportPath = join(authored.revision.directory, "report.json");
  const originalReport = await readFile(reportPath, "utf8");
  const result = await command(["validate", "--from", "v001", "--name", "saved", "--output", output]);
  expect(result.code, result.stdout).toBe(0);
  const checked = JSON.parse(result.stdout);
  expect(checked).toMatchObject({ revision: null, validation: { snapshotCreated: false, sourceRevision: "v001" }, input: { sha256: authored.input.sha256 }, artifacts: [] });
  expect(await readdir(join(output, "saved"))).toEqual(["v001"]);
  expect(await readFile(reportPath, "utf8")).toBe(originalReport);
  const other = await command(["validate", "--from", "v001", "--name", "other", "--output", output]);
  expect(other.code).toBe(1);
  await writeFile(join(authored.revision.directory, "diagram.json"), JSON.stringify({ ...document, title: "externally edited" }));
  const tampered = await command(["validate", "--from", "v001", "--name", "saved", "--output", output]);
  expect(tampered.code).toBe(1);
  expect(JSON.parse(tampered.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "VALIDATION_SOURCE_INVALID" }));
  expect(await readFile(reportPath, "utf8")).toBe(originalReport);
}, 60_000);

test("draft validation needs no series name and rejects write-only options", async () => {
  const input = join(root, "unnamed.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["validate", "--input", input]);
  expect(result.code, result.stdout).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ revision: null, status: "validated" });
  for (const option of ["parent", "decisions", "sources", "visual-review", "browser"]) {
    const failed = await command(["validate", "--input", input, `--${option}`, option === "browser" ? "none" : "unused"]);
    expect(failed.code, option).toBe(1);
    expect(JSON.parse(failed.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "ERR_OPTION_SCOPE", location: option }));
    expect(JSON.parse(failed.stdout).artifacts).toEqual([]);
  }
}, 60_000);

test("invalid and unreadable input leaves no snapshots, and author checks newly changed bytes", async () => {
  const input = join(root, "invalid-draft.json");
  for (const bytes of ["{", JSON.stringify({ ...document, edges: [{ id: "bad", from: "missing", to: "absent" }] })]) {
    await writeFile(input, bytes);
    const result = await command(["validate", "--input", input]);
    const report = JSON.parse(result.stdout);
    expect(result.code).toBe(1);
    expect(report).toMatchObject({ revision: null, checks: { validation: "failed", compilation: "not-run" }, artifacts: [] });
    expect(await readFile(input, "utf8")).toBe(bytes);
  }
  const missing = await command(["validate", "--input", join(root, "does-not-exist.json")]);
  expect(missing.code).toBe(1);
  expect(JSON.parse(missing.stdout)).toMatchObject({ revision: null, diagnostics: [expect.objectContaining({ code: "INPUT_UNREADABLE" })], artifacts: [] });
  await writeFile(input, JSON.stringify(document));
  const initial = JSON.parse((await command(["validate", "--input", input])).stdout);
  await writeFile(input, JSON.stringify({ ...document, title: "changed after validation" }));
  const authored = JSON.parse((await command(["author", "--input", input, "--name", "new-bytes", "--output", join(root, "new-bytes-history"), "--theme", "dark", "--browser", "none"])).stdout);
  expect(authored.checks).toMatchObject({ validation: "passed", compilation: "passed" });
  expect(authored.input.sha256).not.toBe(initial.input.sha256);
  expect(authored.theme).toBe("dark");
  expect(await readFile(join(authored.revision.directory, "diagram.json"), "utf8")).toContain("changed after validation");
}, 60_000);

test("compile and environment failures retain accurate check states without persistent writes", async () => {
  const input = join(root, "compile-error.json");
  const bytes = JSON.stringify({ ...document,
    nodes: [{ id: "a", kind: "rect", x: 0, y: 0, width: 50, height: 50 }, { id: "b", kind: "rect", x: 1e308, y: 0, width: 50, height: 50 }],
    edges: [{ id: "e", from: "a", to: "b" }], scenes: [{ id: "s", label: "send", beats: [{ durationMs: 1000, actions: [{ type: "flow", target: "e", direction: "forward" }] }] }] });
  await writeFile(input, bytes);
  const result = await command(["validate", "--input", input]);
  const report = JSON.parse(result.stdout);
  expect(result.code).toBe(1);
  expect(report).toMatchObject({ revision: null, checks: { validation: "passed", compilation: "failed", layout: "not-run" }, artifacts: [] });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "COMPILE_FAILED", location: "scenes[0].beats[0].durationMs" }));
  if (process.platform !== "win32") {
    const unavailable = await command(["validate", "--input", input], { PATH: join(root, "no-npm") });
    expect(unavailable.code).toBe(1);
    expect(JSON.parse(unavailable.stdout)).toMatchObject({ revision: null, stage: "environment", sdk: null,
      checks: { validation: "not-run", compilation: "not-run" }, artifacts: [] });
  }
  expect(await readFile(input, "utf8")).toBe(bytes);
}, 60_000);

test("cancellation reports no saved revision and preserves the original input", async () => {
  const input = join(root, "cancel-validation.json");
  const bytes = JSON.stringify(document);
  await writeFile(input, bytes);
  const result = await new Promise<{ code: number | null; stdout: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), "validate", "--input", input], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cancel-cache") }
    });
    let stdout = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { if (String(data).includes("Preparing the isolated")) child.kill("SIGINT"); });
    child.on("close", (code) => done({ code, stdout }));
  });
  expect(result.code).toBe(1);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: "cancelled", revision: null, artifacts: [] });
  expect(await readFile(input, "utf8")).toBe(bytes);
  expect((await readdir(join(root, "cancel-cache"))).some((entry) => entry.includes(".tmp-") || entry.endsWith(".lock"))).toBe(false);
}, 60_000);
