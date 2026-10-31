/** Copied-install CLI review submission rejects mistakes without allocating work. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 400, height: 300 }, nodes: [], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-review-preflight-")));
  skill = join(root, "installed skill");
  await cp(resolve(process.env.FLOWSVG_TEST_SKILL || "skills/flow-svg-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; report: Record<string, unknown>; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => done({ code, report: JSON.parse(stdout), stderr }));
  });
}

async function fileTree(directory: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(files, await fileTree(path));
    else files[path] = (await readFile(path)).toString("base64");
  }
  return files;
}

test("invalid review submission preserves all saved files and skips runtime preparation", async () => {
  const input = join(root, "draft.json");
  const review = join(root, "invalid-review.json");
  const history = join(root, ".diagrams/.work/example/task/history");
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", "example", "--output", history, "--browser", "none"]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const saved = join(history, "example/v001/report.json");
  const original = await readFile(saved);
  const originalTree = await fileTree(history);
  await writeFile(review, JSON.stringify({ reviewer: "viewer", viewed: false, items: [] }));
  const rejected = await command(["author", "--from", "v001", "--name", "example", "--output", history,
    "--artifact-review", review, "--browser", join(root, "must-not-launch")]);
  expect(rejected.code).toBe(1);
  expect(rejected.report).toMatchObject({ status: "failed", revision: null,
    diagnostics: [expect.objectContaining({ code: "ARTIFACT_REVIEW_INVALID" })] });
  expect(await readdir(join(history, "example"))).toEqual(["v001"]);
  expect(await readFile(saved)).toEqual(original);
  expect(await fileTree(history)).toEqual(originalTree);
  expect(rejected.stderr).not.toMatch(/Preparing the isolated|Capturing screenshot/);
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("templates bind all three evidence kinds and remain unviewed, exclusive and task scoped", async () => {
  const input = join(root, "template-source.json");
  const workspace = join(root, ".diagrams/.work/templates/task");
  const history = join(workspace, "history");
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", "templates", "--output", history,
    "--svg", "--browser", process.env.FLOWSVG_TEST_BROWSER!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  for (const kind of ["visual", "html"]) {
    const template = join(workspace, `${kind}.json`);
    const result = await command(["review-template", "--from", "v001", "--name", "templates", "--output", history,
      "--kind", kind, "--template", template]);
    expect(result.code, JSON.stringify(result)).toBe(0);
    expect(result.report).toMatchObject({ status: "template-created", sourceRevision: "v001", kind });
    const saved = JSON.parse(await readFile(template, "utf8"));
    expect(saved).toMatchObject({ reviewer: "", viewed: false });
    const entries = saved[kind === "visual" ? "frames" : "states"];
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: expect.any(String), sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      observations: { readingOrder: "", density: "", occlusion: "", narrative: "" }, issues: [] });
    const repeated = await command(["review-template", "--from", "v001", "--name", "templates", "--output", history,
      "--kind", kind, "--template", template]);
    expect(repeated.code).toBe(1);
    expect(await readFile(template, "utf8")).toBe(JSON.stringify(saved, null, 2) + "\n");
    const rejected = await command(["author", "--from", "v001", "--name", "templates", "--output", history,
      `--${kind}-review`, template, "--browser", "none"]);
    expect(rejected.code).toBe(1);
    expect(rejected.report.revision).toBe(null);
  }
  const artifact = (source.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 300, backdrop: "#ffffff" }] }));
  const evidence = await command(["author", "--from", "v001", "--name", "templates", "--output", history,
    "--artifact-preview-settings", settings, "--browser", process.env.FLOWSVG_TEST_BROWSER!]);
  expect(evidence.code, JSON.stringify(evidence)).toBe(0);
  const artifactTemplate = join(workspace, "artifact.json");
  const artifactResult = await command(["review-template", "--from", "v002", "--name", "templates", "--output", history,
    "--kind", "artifact", "--template", artifactTemplate]);
  expect(artifactResult.code, JSON.stringify(artifactResult)).toBe(0);
  const form = JSON.parse(await readFile(artifactTemplate, "utf8"));
  const item = (evidence.report.artifactEvidence as { items: { evidenceId: string; sha256: string }[] }).items[0];
  expect(form).toMatchObject({ viewed: false, items: [expect.objectContaining({ evidenceId: item.evidenceId, sha256: item.sha256 })] });
  const outside = await command(["review-template", "--from", "v001", "--name", "templates", "--output", history,
    "--kind", "html", "--template", join(root, "outside.json")]);
  expect(outside.code).toBe(1);
  await expect(readFile(join(root, "outside.json"))).rejects.toMatchObject({ code: "ENOENT" });
  const external = join(root, "external-templates");
  await mkdir(external);
  await symlink(external, join(workspace, "escape"));
  const escaped = await command(["review-template", "--from", "v001", "--name", "templates", "--output", history,
    "--kind", "html", "--template", join(workspace, "escape/review.json")]);
  expect(escaped.code).toBe(1);
  await expect(readFile(join(external, "review.json"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readdir(join(history, "templates"))).toEqual(["v001", "v002"]);
}, 90_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("author review detects effective-theme mismatch before allocating work", async () => {
  const input = join(root, "theme-source.json");
  const history = join(root, ".diagrams/.work/theme/task/history");
  const template = join(root, ".diagrams/.work/theme/task/review.json");
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", "theme", "--output", history,
    "--theme", "dark", "--browser", process.env.FLOWSVG_TEST_BROWSER!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const generated = await command(["review-template", "--from", "v001", "--name", "theme", "--output", history,
    "--kind", "html", "--template", template]);
  expect(generated.code, JSON.stringify(generated)).toBe(0);
  const review = JSON.parse(await readFile(template, "utf8"));
  review.reviewer = "synthetic contract fixture; no aesthetic approval";
  review.viewed = true;
  for (const state of review.states) for (const key of ["readingOrder", "density", "occlusion", "narrative"]) state.observations[key] = "Synthetic fixture.";
  await writeFile(template, JSON.stringify(review));
  const rejected = await command(["author", "--from", "v001", "--name", "theme", "--output", history,
    "--html-review", template, "--browser", "none"]);
  expect(rejected.code).toBe(1);
  expect(rejected.report).toMatchObject({ revision: null, diagnostics: [expect.objectContaining({ code: "HTML_REVIEW_INVALID" })] });
  expect(await readdir(join(history, "theme"))).toEqual(["v001"]);
}, 90_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("invalid review fields and combined inputs leave the complete source tree unchanged", async () => {
  const input = join(root, "bounds-source.json");
  const history = join(root, ".diagrams/.work/bounds/task/history");
  await writeFile(input, JSON.stringify(document));
  const authored = await command(["author", "--input", input, "--name", "bounds", "--output", history,
    "--browser", process.env.FLOWSVG_TEST_BROWSER!]);
  expect(authored.code, JSON.stringify(authored)).toBe(0);
  const source = authored.report as { visual: { capturedFrames: { id: string; sha256: string }[] }; htmlInspection: { states: { id: string; sha256: string }[] } };
  const observations = { readingOrder: "Synthetic contract fixture.", density: "Fixture.", occlusion: "Fixture.", narrative: "Fixture." };
  const captured = source.visual.capturedFrames[0];
  const frame = { id: captured.id, sha256: captured.sha256, observations, issues: [] };
  const reviewPath = join(root, "bounds-review.json");
  const htmlPath = join(root, "bounds-html.json");
  await writeFile(htmlPath, JSON.stringify({ reviewer: "test fixture; not acceptance", viewed: true, states: [{ id: source.htmlInspection.states[0].id, sha256: source.htmlInspection.states[0].sha256, observations, issues: [] }] }));
  const reportPath = join(history, "bounds/v001/report.json");
  const original = await readFile(reportPath);
  const valid = { reviewer: "test fixture; not acceptance", viewed: true, frames: [frame] };
  const cases = ["not-json", JSON.stringify({ ...valid, reviewer: "" }), JSON.stringify({ ...valid, frames: {} }),
    JSON.stringify({ ...valid, frames: [frame, frame] }), JSON.stringify({ ...valid, viewed: false }),
    JSON.stringify({ ...valid, frames: [{ ...frame, sha256: "0".repeat(64) }] }),
    JSON.stringify({ ...valid, frames: [{ ...frame, observations: null }] }),
    JSON.stringify({ ...valid, frames: [{ ...frame, issues: {} }] }), JSON.stringify({ ...valid, extra: true })];
  for (const [index, value] of cases.entries()) {
    await writeFile(reviewPath, value);
    const rejected = await command(["author", "--from", "v001", "--name", "bounds", "--output", history,
      "--html-review", htmlPath, "--visual-review", reviewPath, "--browser", "none"]);
    expect(rejected.code, String(index)).toBe(1);
    expect(rejected.report.revision, String(index)).toBe(null);
    expect(await readdir(join(history, "bounds"))).toEqual(["v001"]);
    expect(await readFile(reportPath)).toEqual(original);
  }
  const missing = await command(["author", "--from", "v001", "--name", "bounds", "--output", history,
    "--visual-review", join(root, "does-not-exist.json"), "--browser", "none"]);
  expect(missing.report.revision).toBe(null);
  await writeFile(reviewPath, JSON.stringify(valid));
  const accepted = await command(["author", "--from", "v001", "--name", "bounds", "--output", history,
    "--visual-review", reviewPath, "--html-review", htmlPath, "--browser", "none"]);
  expect(accepted.code, JSON.stringify(accepted)).toBe(0);
  expect(accepted.report).toMatchObject({ checks: { html: "reviewed", visual: "reviewed" } });
}, 90_000);


test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("template rejects a diagram-directory symlink into another task", async () => {
  const input = join(root, "scope-source.json");
  const sourceHistory = join(root, ".diagrams/.work/original/task/history");
  const targetWorkspace = join(root, ".diagrams/.work/escaped/task");
  const targetHistory = join(targetWorkspace, "history");
  await writeFile(input, JSON.stringify(document));
  const authored = await command(["author", "--input", input, "--name", "original", "--output", sourceHistory,
    "--browser", process.env.FLOWSVG_TEST_BROWSER!]);
  expect(authored.code, JSON.stringify(authored)).toBe(0);
  await mkdir(targetHistory, { recursive: true });
  await symlink(join(sourceHistory, "original"), join(targetHistory, "escaped"));
  const template = join(targetWorkspace, "review.json");
  const rejected = await command(["review-template", "--from", "v001", "--name", "escaped", "--output", targetHistory,
    "--kind", "html", "--template", template]);
  expect(rejected.code).toBe(1);
  await expect(readFile(template)).rejects.toMatchObject({ code: "ENOENT" });
}, 90_000);
