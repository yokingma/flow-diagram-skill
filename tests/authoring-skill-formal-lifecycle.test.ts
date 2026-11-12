/** Copied-install public CLI lifecycle for explicit immutable formal sources and durable intent. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { readCommandReport } from "./helpers/cli-report";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 400, height: 240 }, nodes: [], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-formal-lifecycle-")));
  skill = join(root, "skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; report: Record<string, unknown> }>((done, reject) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    child.stdout.on("data", (bytes) => { stdout += bytes; });
    child.on("close", (code) => { void readCommandReport(stdout).then((report) => done({ code, report }), reject); });
  });
}

test("formal-only authoring freezes one source; ordinary later edits remain current without inheriting review", async () => {
  const name = "formal-only";
  const history = join(root, ".diagrams/.work", name, "task/history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const args = ["--name", name, "--output", history, "--browser", "none"];
  const ordinary = await command(["author", "--input", input, ...args]);
  expect(ordinary.code).toBe(0);
  const frozen = await command(["author", "--from", "current", ...args, "--formal-review"]);
  expect(frozen.code, JSON.stringify(frozen)).toBe(0);
  expect(frozen.report).toMatchObject({ revision: { id: "v001" }, formalReview: { status: "incomplete" } });
  expect(frozen.report.workingDraft).toBeUndefined();
  const saved = await readFile(join(history, name, "v001/report.json"));
  await writeFile(input, JSON.stringify({ ...document, title: "Edited after request" }));
  const edited = await command(["author", "--input", input, ...args]);
  expect(edited.code).toBe(0);
  expect(edited.report).toMatchObject({ revision: { id: "current" }, formalReview: { status: "not-requested" } });
  expect((await readdir(join(history, name))).sort()).toEqual(["current", "v001"]);
  expect(await readFile(join(history, name, "v001/report.json"))).toEqual(saved);
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("template requests persist incomplete formal intent without rewriting immutable reports", async () => {
  const name = "template-request";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history,
    "--checkpoint", "--browser", process.env.FLOWSVG_TEST_BROWSER!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  expect(source.report.formalReview).toMatchObject({ status: "not-requested" });
  const reportPath = join(history, name, "v001/report.json");
  const original = await readFile(reportPath);
  const template = await command(["review-template", "--from", "v001", "--name", name, "--output", history,
    "--kind", "html", "--template", join(workspace, "review.json")]);
  expect(template.code, JSON.stringify(template)).toBe(0);
  expect(template.report.formalReview).toMatchObject({ status: "incomplete" });
  expect(await readFile(reportPath)).toEqual(original);
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  expect(finalized.report.formalReview).toMatchObject({ status: "incomplete" });
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.completion.quality).toBe("incomplete");
  expect(summary.formalReview.requests).toHaveLength(1);
  expect(summary.formalReview.requests[0]).toMatchObject({ sourceRevision: "v001", kind: "html", reportSha256: expect.any(String) });
  const requestDirectory = join(history, name, "records/formal-requests");
  const files = await readdir(requestDirectory);
  const requestPath = join(requestDirectory, files[0]);
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  request.reportSha256 = "0".repeat(64);
  await writeFile(requestPath, JSON.stringify(request));
  const oldDelivery = await readFile(join(root, ".diagrams", name, "report.json"));
  const rejected = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001"]);
  expect(rejected.code).toBe(1);
  expect(await readFile(join(root, ".diagrams", name, "report.json"))).toEqual(oldDelivery);
  expect(await readFile(reportPath)).toEqual(original);
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("registered full viewing with an issue completes coverage and preserves the viewer action", async () => {
  const name = "viewer-conclusion";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history,
    "--formal-review", "--checkpoint", "--browser", process.env.FLOWSVG_TEST_BROWSER!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const templatePath = join(workspace, "review.json");
  expect((await command(["review-template", "--from", "v001", "--name", name, "--output", history,
    "--kind", "html", "--template", templatePath])).code).toBe(0);
  const form = JSON.parse(await readFile(templatePath, "utf8"));
  form.reviewer = "synthetic lifecycle fixture; not actual visual approval";
  form.viewed = true;
  for (const state of form.states) {
    state.observations = { readingOrder: "Fixture.", density: "Fixture.", occlusion: "Fixture.", narrative: "Fixture." };
    state.issues = [{ reason: "Reader should see the relationship earlier.", nextStep: "Move the relationship label beside its source." }];
  }
  await writeFile(templatePath, JSON.stringify(form));
  const review = await command(["review", "--from", "v001", "--name", name, "--output", history, "--html-review", templatePath]);
  expect(review.code, JSON.stringify(review)).toBe(0);
  expect(review.report.formalReview).toMatchObject({ status: "complete" });
  expect(review.report.completion).toMatchObject({ quality: "unresolved-issues" });
  expect(review.report.diagnostics).toContainEqual(expect.objectContaining({ reason: form.states[0].issues[0].reason,
    nextStep: form.states[0].issues[0].nextStep }));
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  expect(finalized.report.formalReview).toMatchObject({ status: "complete" });
  const authored = await command(["author", "--from", "v001", "--name", name, "--output", history,
    "--html-review", templatePath, "--browser", "none"]);
  expect(authored.code, JSON.stringify(authored)).toBe(0);
  expect(authored.report.diagnostics).toContainEqual(expect.objectContaining({ reason: form.states[0].issues[0].reason,
    nextStep: form.states[0].issues[0].nextStep }));
}, 60_000);
