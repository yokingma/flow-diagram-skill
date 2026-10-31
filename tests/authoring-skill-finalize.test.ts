/** Installed CLI acceptance: temporary task revisions collapse into one self-contained delivery. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 400, height: 240 }, nodes: [], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG final-only ")));
  skill = join(root, "skill");
  await cp(resolve("skills/flow-svg-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (bytes) => { stdout += bytes; });
    child.stderr.on("data", (bytes) => { stderr += bytes; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}
async function task(name: string, id = "task-1") {
  const workspace = join(root, ".diagrams", ".work", name, id);
  await mkdir(workspace, { recursive: true });
  const input = join(workspace, "draft.json");
  await writeFile(input, JSON.stringify(document));
  return { workspace, input, output: join(workspace, "history") };
}

test("finalize preserves exports across unchanged review revisions and removes only this task workspace", async () => {
  const name = "final-exports";
  const t = await task(name);
  const other = await task(name, "other-task");
  const first = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--svg", "--browser", "none"]);
  expect(first.code, first.stdout + first.stderr).toBe(0);
  const source = JSON.parse(first.stdout);
  const svg = await readFile(join(source.revision.directory, "diagram.svg"));
  const reviewed = await command(["author", "--from", "v001", "--output", t.output, "--name", name, "--browser", "none"]);
  expect(reviewed.code, reviewed.stdout).toBe(0);
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v002"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const final = join(root, ".diagrams", name);
  expect((await readdir(final)).sort()).toEqual(["diagram.html", "diagram.json", "diagram.svg", "report.json", "report.md"]);
  expect(await readFile(join(final, "diagram.svg"))).toEqual(svg);
  const report = JSON.parse(await readFile(join(final, "report.json"), "utf8"));
  expect(report.completion).toMatchObject({ requested: ["json", "html", "svg"], completed: ["json", "html", "svg"], delivery: "complete" });
  expect(report.artifacts.every((item: { path: string }) => !item.path.startsWith("/") && !item.path.includes(".."))).toBe(true);
  expect(JSON.stringify(report)).not.toContain(".work");
  expect(await readFile(join(final, "report.md"), "utf8")).not.toContain(".work");
  await expect(readdir(t.workspace)).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(other.input, "utf8")).toBe(JSON.stringify(document));
}, 60_000);

test("finalize publishes complete files when optional browser checks fail", async () => {
  const name = "quality-gap";
  const t = await task(name);
  const failed = await command(["author", "--input", t.input, "--output", t.output, "--name", name,
    "--browser", join(root, "missing-browser")]);
  expect(failed.code).toBe(1);
  const source = JSON.parse(failed.stdout);
  expect(source.status).toBe("failed");
  expect(source.completion).toMatchObject({ delivery: "complete" });
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v001"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.completion).toMatchObject({ delivery: "complete", quality: "incomplete" });
}, 60_000);

test("failed or tampered exports never replace the final delivery or remove working files", async () => {
  const name = "tampered-exports";
  const original = await task(name, "original-task");
  await command(["author", "--input", original.input, "--output", original.output, "--name", name, "--svg", "--browser", "none"]);
  await command(["finalize", "--workspace", original.workspace, "--name", name, "--from", "v001"]);
  const before = await readFile(join(root, ".diagrams", name, "diagram.svg"));
  const t = await task(name, "damaged-task");
  const source = JSON.parse((await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--svg", "--browser", "none"])).stdout);
  await writeFile(join(source.revision.directory, "diagram.svg"), "tampered");
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v001"]);
  expect(result.code).toBe(1);
  expect(await readFile(join(root, ".diagrams", name, "diagram.svg"))).toEqual(before);
  expect(await readFile(t.input, "utf8")).toBe(JSON.stringify(document));
}, 60_000);

test("finalize rejects broad and symlink workspace paths before deleting anything", async () => {
  const name = "unsafe";
  const t = await task(name);
  const alias = join(root, ".diagrams", ".work", name, "alias");
  await symlink(t.workspace, alias, "junction");
  for (const workspace of [root, join(root, ".diagrams"), join(root, ".diagrams", ".work", name), alias]) {
    const result = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001"]);
    expect(result.code, result.stdout).toBe(1);
    expect(JSON.parse(result.stdout).diagnostics[0].code).toBe("FINALIZE_WORKSPACE");
  }
  expect(await readFile(t.input, "utf8")).toBe(JSON.stringify(document));
});

test("history retention is explicit and changed input never inherits stale images", async () => {
  const name = "keep-explicit";
  const t = await task(name);
  await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--svg", "--browser", "none"]);
  await writeFile(t.input, JSON.stringify({ ...document, title: "changed" }));
  await command(["author", "--input", t.input, "--parent", "v001", "--output", t.output, "--name", name, "--browser", "none"]);
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v002", "--keep-work"]);
  expect(result.code, result.stdout).toBe(0);
  expect(await readdir(join(root, ".diagrams", name))).not.toContain("diagram.svg");
  expect(await readdir(t.output)).toContain(name);
}, 60_000);

test("an unfinished requested PNG cannot disappear during review-only finalization", async () => {
  const name = "missing-request";
  const t = await task(name);
  const failed = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--svg", "--png", "--browser", "none"]);
  expect(failed.code).toBe(1);
  await command(["author", "--from", "v001", "--output", t.output, "--name", name, "--browser", "none"]);
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v002"]);
  expect(result.code).toBe(1);
  expect(JSON.parse(result.stdout).diagnostics[0].code).toBe("FINALIZE_INCOMPLETE");
  expect(await readFile(t.input, "utf8")).toBe(JSON.stringify(document));
}, 60_000);

const browserPath = process.env.FLOWSVG_TEST_BROWSER;
test.skipIf(!browserPath)("a reviewed PNG/SVG delivery stays complete after all screenshots and temporary revisions are removed", async () => {
  const name = "reviewed-images";
  const t = await task(name);
  const exported = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--svg", "--png", "--samples", "2", "--browser", browserPath!]);
  expect(exported.code, exported.stdout + exported.stderr).toBe(0);
  const source = JSON.parse(exported.stdout);
  const png = await readFile(join(source.revision.directory, "diagram.png"));
  const reviewPath = join(t.workspace, "review.json");
  await writeFile(reviewPath, JSON.stringify({ reviewer: "contract test; synthetic viewing attestation", viewed: true,
    frames: source.visual.capturedFrames.map((item: { id: string; sha256: string }) => ({ id: item.id, sha256: item.sha256,
      observations: { readingOrder: "Contract fixture", density: "Contract fixture", occlusion: "Contract fixture", narrative: "Contract fixture" }, issues: [] })) }));
  const reviewed = await command(["author", "--from", "v001", "--output", t.output, "--name", name, "--visual-review", reviewPath, "--browser", "none"]);
  expect(reviewed.code, reviewed.stdout).toBe(0);
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v002"]);
  expect(result.code, result.stdout).toBe(0);
  const final = join(root, ".diagrams", name);
  expect((await readdir(final)).sort()).toEqual(["diagram.html", "diagram.json", "diagram.png", "diagram.svg", "report.json", "report.md"]);
  expect(await readFile(join(final, "diagram.png"))).toEqual(png);
  const summary = JSON.parse(await readFile(join(final, "report.json"), "utf8"));
  expect(summary.completion).toMatchObject({ quality: "incomplete", requested: ["json", "html", "svg", "png"] });
  expect(summary.visual.frames).toHaveLength(1);
  await expect(readdir(t.workspace)).rejects.toMatchObject({ code: "ENOENT" });
}, 90_000);


test("finalize protects an unrelated final folder even if it contains report.json", async () => {
  const name = "unrelated-folder";
  const t = await task(name);
  await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--browser", "none"]);
  const final = join(root, ".diagrams", name);
  await mkdir(final);
  await writeFile(join(final, "report.json"), "{}");
  await writeFile(join(final, "notes.txt"), "user notes");
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v001"]);
  expect(result.code, result.stdout).toBe(1);
  expect(await readFile(join(final, "notes.txt"), "utf8")).toBe("user notes");
  expect(await readFile(t.input, "utf8")).toBe(JSON.stringify(document));
}, 60_000);

test.skipIf(!browserPath)("a later review-only revision cannot hide recorded visual issues from the final summary", async () => {
  const name = "unresolved-visual";
  const t = await task(name);
  const exported = JSON.parse((await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--samples", "2", "--browser", browserPath!])).stdout);
  const reviewPath = join(t.workspace, "review.json");
  await writeFile(reviewPath, JSON.stringify({ reviewer: "synthetic regression attestation", viewed: true,
    frames: exported.visual.capturedFrames.map((item: { id: string; sha256: string }) => ({ id: item.id, sha256: item.sha256,
      observations: { readingOrder: "Fixture", density: "Fixture", occlusion: "Fixture", narrative: "Fixture" },
      issues: [{ reason: "Fixture issue remains unresolved", nextStep: "Ask the user" }] })) }));
  expect((await command(["author", "--from", "v001", "--output", t.output, "--name", name, "--visual-review", reviewPath, "--browser", "none"])).code).toBe(0);
  expect((await command(["author", "--from", "v002", "--output", t.output, "--name", name, "--browser", "none"])).code).toBe(0);
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v003"]);
  expect(result.code, result.stdout).toBe(0);
  const final = join(root, ".diagrams", name);
  const summary = JSON.parse(await readFile(join(final, "report.json"), "utf8"));
  expect(summary.completion.quality).toBe("needs-user-decision");
  expect(await readFile(join(final, "report.md"), "utf8")).toContain("Fixture issue remains unresolved");
}, 90_000);

test("finalize preserves named batch exports with portable punctuation, Unicode and spaces", async () => {
  const name = "named-batch";
  const t = await task(name);
  const source = JSON.parse((await command(["author", "--browser", "none", "--input", t.input, "--output", t.output, "--name", name])).stdout);
  const manifest = join(t.workspace, "exports.json");
  await writeFile(manifest, JSON.stringify({ schemaVersion: 1, sourceSha256: source.input.sha256,
    sdk: { version: source.sdk.version, integrity: source.sdk.integrity },
    frames: [{ name: "phase (1) 🚀", timeMs: 0, formats: ["svg"] }, { name: "总览", timeMs: 0, formats: ["svg"] }] }));
  const exported = await command(["author", "--from", "v001", "--output", t.output, "--name", name, "--export-manifest", manifest, "--browser", "none"]);
  expect(exported.code, exported.stdout).toBe(0);
  const reviewed = await command(["author", "--from", "v002", "--output", t.output, "--name", name, "--browser", "none"]);
  expect(reviewed.code, reviewed.stdout).toBe(0);
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v003"]);
  expect(result.code, result.stdout).toBe(0);
  const final = join(root, ".diagrams", name);
  expect((await readdir(join(final, "exports"))).sort()).toEqual(["phase (1) 🚀.svg", "总览.svg"]);
  expect(await readFile(join(final, "report.md"), "utf8")).toContain("(<exports/phase (1) 🚀.svg>)");
}, 60_000);

test("a failed batch preflight blocks finalization until a successful replacement batch exists", async () => {
  const name = "retry-batch";
  const t = await task(name);
  const manifest = join(t.workspace, "exports.json");
  await writeFile(manifest, "{}");
  const failed = await command(["author", "--input", t.input, "--output", t.output, "--name", name, "--export-manifest", manifest, "--browser", "none"]);
  expect(failed.code).toBe(1);
  const source = JSON.parse(failed.stdout);
  await command(["author", "--from", "v001", "--output", t.output, "--name", name, "--browser", "none"]);
  expect((await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v002"])).code).toBe(1);
  await writeFile(manifest, JSON.stringify({ schemaVersion: 1, sourceSha256: source.input.sha256,
    sdk: { version: source.sdk.version, integrity: source.sdk.integrity }, frames: [{ name: "fixed", timeMs: 0, formats: ["svg"] }] }));
  const fixed = await command(["author", "--from", "v002", "--output", t.output, "--name", name, "--export-manifest", manifest, "--browser", "none"]);
  expect(fixed.code, fixed.stdout).toBe(0);
  const result = await command(["finalize", "--workspace", t.workspace, "--name", name, "--from", "v003"]);
  expect(result.code, result.stdout).toBe(0);
  expect(JSON.parse(result.stdout).completion.requested).toEqual(["json", "html", "svg"]);
  expect(await readFile(join(root, ".diagrams", name, "exports", "fixed.svg"), "utf8")).toContain("<svg");
}, 60_000);
