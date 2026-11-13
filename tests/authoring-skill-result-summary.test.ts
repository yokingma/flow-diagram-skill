/** Command summaries are exercised through a copied installation and real saved details. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const document = { version: 1, title: "Result summary", viewport: { width: 400, height: 240 },
  nodes: [{ id: "step", kind: "rect", x: 40, y: 60, width: 240, height: 100, label: "Current result" }], edges: [], scenes: [] };

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG command results ")));
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
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("saved authoring returns concise identity and a readable details path", async () => {
  const input = join(root, "static.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--input", input, "--name", "summary", "--browser", "none"]);
  expect(result.code, result.stderr + result.stdout).toBe(0);
  const summary = JSON.parse(result.stdout);
  expect(summary.detailsPath).toEqual(expect.any(String));
  const report = JSON.parse(await readFile(summary.detailsPath, "utf8"));
  expect(summary).toMatchObject({ status: "delivered", input: { sha256: report.input.sha256 },
    sdk: { version: "0.4.0", integrity: report.sdk.integrity }, checks: report.checks, completion: report.completion });
  expect(summary).not.toHaveProperty("htmlInspection");
  expect(summary).not.toHaveProperty("samples");
  expect(summary).not.toHaveProperty("visual");
  expect(report).toHaveProperty("htmlInspection");
  expect(summary.artifacts).toContainEqual(expect.objectContaining({ kind: "html" }));
  expect(summary.diagnostics).toEqual(report.diagnostics);
}, 60_000);

test.skipIf(!browser)("animation and review stdout omit full HTML state signatures while durable details remain readable", async () => {
  const input = join(root, "animation.json");
  const workspace = join(root, ".diagrams", ".work", "animation", "summary");
  const history = join(workspace, "history");
  const animation = { ...document, scenes: [{ id: "change", label: "Change", beats: [
    { durationMs: 400, caption: "Changed", actions: [{ type: "updateNode", target: "step", value: { label: "Changed" } }] }
  ] }] };
  await writeFile(input, JSON.stringify(animation));
  const result = await command(["author", "--input", input, "--name", "animation", "--checkpoint", "--output", history, "--browser", browser!]);
  expect(result.code, result.stderr + result.stdout).toBe(0);
  const summary = JSON.parse(result.stdout);
  const report = JSON.parse(await readFile(summary.detailsPath, "utf8"));
  expect(report.htmlInspection.states.length).toBeGreaterThan(1);
  expect(report.htmlInspection.backseek.visualSignature).toEqual(expect.any(String));
  expect(result.stdout).not.toContain("visualSignature");
  expect(summary).not.toHaveProperty("samples");
  const entries = await readdir(report.revision.directory);
  await readFile(summary.detailsPath, "utf8");
  expect(await readdir(report.revision.directory)).toEqual(entries);

  const form = join(workspace, "review.json");
  await writeFile(form, JSON.stringify({ reviewer: "synthetic result contract; not visual acceptance", viewed: true,
    states: report.htmlInspection.states.map(({ id, sha256 }: { id: string; sha256: string }) => ({ id, sha256,
      observations: { readingOrder: "Fixture", density: "Fixture", occlusion: "Fixture", narrative: "Fixture" }, issues: [] })) }));
  const reviewed = await command(["review", "--from", report.revision.id, "--name", "animation", "--output", history, "--html-review", form]);
  expect(reviewed.code, reviewed.stderr + reviewed.stdout).toBe(0);
  const review = JSON.parse(reviewed.stdout);
  expect(review.htmlInspection).not.toHaveProperty("states");
  expect(reviewed.stdout).not.toContain("visualSignature");
  expect(JSON.parse(await readFile(review.detailsPath, "utf8"))).toMatchObject({ kind: "review" });
}, 90_000);
