/** Preview contracts use the copied installation, structured CLI results and real Chromium artifacts. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

let root: string;
let skill: string;
const browserPath = process.env.FLOWSVG_TEST_BROWSER;
const diagram = { version: 1, viewport: { width: 820, height: 320 }, nodes: [
  { id: "client", kind: "roundedRect", x: 20, y: 100, width: 180, height: 160, label: "客户端" },
  { id: "server", kind: "roundedRect", x: 620, y: 100, width: 180, height: 160, label: "服务器" }
], edges: [{ id: "request", from: "client", to: "server", fromPort: "right", toPort: "left" }], scenes: [
  { id: "request", label: "发送", beats: [{ durationMs: 40, actions: [{ type: "flow", target: "request", direction: "forward" }] }] },
  { id: "response", label: "返回", beats: [{ durationMs: 1000, transitionMs: 400, actions: [
    { type: "updateNode", target: "server", value: { x: 580, content: { blocks: [{ type: "title", text: "完成" },
      { type: "paragraph", text: "保留长中文内容供视觉检查，不能仅凭截图成功就声称文字可读或没有遮挡。" }] } } },
    { type: "focus", target: "server" }
  ] }] }
] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG preview 独立 ")));
  await mkdir(join(root, "browser temp"));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], interrupt: "cancel" | "crash" | null = null) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), DEBUG: "pw:browser", TMPDIR: join(root, "browser temp"), TMP: join(root, "browser temp"), TEMP: join(root, "browser temp") }
    });
    let stdout = "";
    let stderr = "";
    let interrupted = false;
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => {
      stderr += data;
      if (!interrupted && interrupt === "cancel" && stderr.includes("Capturing preview")) { interrupted = true; child.kill("SIGTERM"); }
      if (!interrupted && interrupt === "crash" && stderr.includes("Capturing screenshot")) {
        interrupted = true;
        const pids = [...stderr.matchAll(/<launched> pid=(\d+)/gu)].map((match) => Number(match[1]));
        const pid = pids.at(-1);
        if (pid) { try { process.kill(pid, "SIGKILL"); } catch (error) { if (!(error instanceof Error) || !("code" in error) || error.code !== "ESRCH") throw error; } }
      }
    });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test.skipIf(!browserPath)("real compiled beats drive full-view and timeline screenshots without inventing visual judgment", async () => {
  const input = join(root, "animated.json");
  await writeFile(input, JSON.stringify(diagram));
  const result = await command(["author", "--input", input, "--name", "animated", "--browser", browserPath!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.compilation.totalDurationMs).toBeGreaterThan(1040);
  expect(report).toMatchObject({ checks: { visual: "not-run" }, visual: { status: "awaiting-review", viewedFrames: [] }, completion: { delivery: "complete", quality: "needs-user-decision" } });
  expect(report.visual.plan.points[0]).toMatchObject({ view: "overview", timeMs: 0 });
  const secondStart = report.compilation.beats[1].startMs;
  expect(report.visual.plan.points).toContainEqual(expect.objectContaining({ timeMs: secondStart, reasons: expect.arrayContaining(["content-change"]) }));
  expect(report.visual.plan.points).toContainEqual(expect.objectContaining({ timeMs: secondStart + 200, reasons: expect.arrayContaining(["transition-midpoint"]) }));
  expect(report.visual.plan.points).toContainEqual(expect.objectContaining({ timeMs: report.compilation.totalDurationMs, reasons: expect.arrayContaining(["final"]) }));
  expect(report.visual.capturedFrames).toHaveLength(report.visual.plan.points.length);
  for (const frame of report.visual.capturedFrames) {
    const bytes = await readFile(frame.path);
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(frame.sha256);
    expect(frame.fonts).toMatchObject({ ready: true, glyphCoverage: "not-verified" });
    expect(report.artifacts).toContainEqual(expect.objectContaining({ kind: "preview", path: frame.path }));
  }
  const initialFrame = report.visual.capturedFrames.find((frame: { view: string; timeMs: number }) => frame.view === "timeline" && frame.timeMs === 0);
  const changedFrame = report.visual.capturedFrames.find((frame: { view: string; timeMs: number }) => frame.view === "timeline" && frame.timeMs === secondStart);
  expect(changedFrame.sha256).not.toBe(initialFrame.sha256);
  expect(report.visual.resources).toMatchObject({ page: "closed", context: "closed", browser: "closed" });
  expect(JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"))).toEqual(report);
  const again = JSON.parse((await command(["author", "--input", input, "--name", "animated", "--browser", browserPath!])).stdout);
  expect(again.visual.plan).toEqual(report.visual.plan);
}, 90_000);

test("static diagrams plan one overview frame and disclose the static review scope", async () => {
  const input = join(root, "static-preview.json");
  await writeFile(input, JSON.stringify({ ...diagram, scenes: [] }));
  const result = await command(["author", "--input", input, "--name", "static-preview", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.visual.plan).toMatchObject({
    mode: "static",
    totalDurationMs: 0,
    coverage: expect.stringContaining("one static frame"),
    points: [{ timeMs: 0, view: "overview", reasons: ["full-view"] }],
    omitted: []
  });
  expect(report.visual.plan.points).toHaveLength(1);
  expect(report.visual.capturedFrames).toEqual([]);
  expect(report.visual.viewedFrames).toEqual([]);
  const markdown = await readFile(join(report.revision.directory, "report.md"), "utf8");
  expect(markdown).toContain("Preview scope: static");
  expect(markdown).toContain("one static frame at time zero");
});

test.skipIf(!browserPath)("static diagrams capture the single planned frame", async () => {
  const input = join(root, "static-capture.json");
  await writeFile(input, JSON.stringify({ ...diagram, scenes: [] }));
  const result = await command(["author", "--input", input, "--name", "static-capture", "--browser", browserPath!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.visual.plan.points).toHaveLength(1);
  expect(report.visual.capturedFrames).toHaveLength(1);
  expect(report.visual.capturedFrames[0]).toMatchObject({ id: "frame-01", timeMs: 0, view: "overview" });
  expect(report.artifacts.filter((artifact: { kind: string }) => artifact.kind === "preview")).toHaveLength(1);
}, 90_000);

test("no browser retains JSON/HTML/SVG and reports planned, captured and unviewed scope in both reports", async () => {
  const input = join(root, "no-browser.json");
  await writeFile(input, JSON.stringify(diagram));
  const result = await command(["author", "--input", input, "--name", "no-browser", "--browser", "none", "--svg"]);
  expect(result.code, result.stdout).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report).toMatchObject({ completion: { delivery: "complete" }, checks: { visual: "not-run" }, visual: { status: "not-run", capturedFrames: [], viewedFrames: [] } });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "BROWSER_UNAVAILABLE" }));
  expect(report.artifacts.map((artifact: { kind: string }) => artifact.kind)).toEqual(expect.arrayContaining(["json", "html", "svg", "report-json", "report-markdown"]));
  const markdown = await readFile(join(report.revision.directory, "report.md"), "utf8");
  expect(markdown).toContain("## Visual coverage");
  expect(markdown).toContain("Captured frames: 0");
  expect(markdown).toContain("Viewed frames: 0");
}, 90_000);

test("long diagrams bound samples, preserve change priorities and disclose omitted points reproducibly", async () => {
  const input = join(root, "long.json");
  await writeFile(input, JSON.stringify({ ...diagram, scenes: [{ id: "long", label: "长流程", beats: Array.from({ length: 25 }, (_, index) => ({
    durationMs: 1000, actions: [{ type: "updateNode", target: "server", value: { label: `状态 ${index}` } }]
  })) }] }));
  const first = JSON.parse((await command(["author", "--input", input, "--name", "long", "--browser", "none"])).stdout);
  const second = JSON.parse((await command(["author", "--input", input, "--name", "long", "--browser", "none"])).stdout);
  expect(first.visual.plan).toEqual(second.visual.plan);
  expect(first.visual.plan.points).toHaveLength(12);
  expect(first.visual.plan.points).toContainEqual(expect.objectContaining({ timeMs: 25000, reasons: ["final"] }));
  expect(first.visual.plan.points.some((point: { reasons: string[] }) => point.reasons.includes("transition-midpoint"))).toBe(false);
  expect(first.visual.plan.omitted).toContainEqual(expect.objectContaining({ reasons: expect.arrayContaining(["content-change"]) }));
  expect(first.visual.plan.coverage).toContain("Discrete points only");
}, 90_000);

test("preview sample count can be selected for a focused visual review", async () => {
  const input = join(root, "focused-samples.json");
  await writeFile(input, JSON.stringify(diagram));
  const result = await command(["author", "--input", input, "--name", "focused-samples", "--browser", "none", "--samples", "5"]);
  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.visual.plan.maxPoints).toBe(5);
  expect(report.visual.plan.points).toHaveLength(5);
}, 90_000);

test.skipIf(!browserPath)("screenshot crash and cancellation clean owned Chrome resources and retain successful default files", async () => {
  const invalidInput = join(root, "screenshot failure.json");
  await writeFile(invalidInput, JSON.stringify(diagram));
  const failedResult = await command(["author", "--input", invalidInput, "--name", "screenshot-failed", "--browser", browserPath!], "crash");
  expect(failedResult.code).toBe(1);
    const browserPids = [...failedResult.stderr.matchAll(/<launched> pid=(\d+)/gu)].map((match) => Number(match[1]));
    const browserPid = browserPids.at(-1);
  expect(browserPid).toBeGreaterThan(0);
  expect(() => process.kill(browserPid, 0)).toThrow();
  const failed = JSON.parse(failedResult.stdout);
  expect(failed).toMatchObject({ status: "failed", stage: "preview", visual: { status: "failed", capturedFrames: [], resources: { page: "closed", context: "closed", browser: "closed" } },
    completion: { delivery: "complete", completed: ["json", "html"] } });
  expect(failed.diagnostics).toContainEqual(expect.objectContaining({ code: "PREVIEW_FAILED" }));
  const input = join(root, "cancel.json");
  await writeFile(input, JSON.stringify(diagram));
  const cancelledResult = await command(["author", "--input", input, "--name", "cancelled", "--browser", browserPath!], "cancel");
  expect(cancelledResult.code).toBe(1);
  const cancelled = JSON.parse(cancelledResult.stdout);
  expect(cancelled).toMatchObject({ status: "cancelled", checks: { visual: "not-run" }, visual: { status: "cancelled", resources: { page: "closed", context: "closed", browser: "closed" } } });
  expect(cancelled.artifacts.filter((artifact: { kind: string }) => artifact.kind === "preview")).toHaveLength(cancelled.visual.capturedFrames.length);
  expect(JSON.parse(await readFile(join(cancelled.revision.directory, "report.json"), "utf8"))).toEqual(cancelled);
}, 90_000);

test("an invalid explicit browser never silently falls back to prepared Chrome", async () => {
  const input = join(root, "invalid-browser.json");
  await writeFile(input, JSON.stringify(diagram));
  const result = await command(["author", "--input", input, "--name", "invalid-browser", "--browser", join(root, "missing Chrome")]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.visual).toMatchObject({ status: "failed", capturedFrames: [], resources: { browser: "not-created" } });
  expect(report.visual.reason).toContain("not a readable executable file");
  expect((await readdir(join(root, "browser temp"))).filter((name) => name.startsWith("playwright_chromiumdev_profile"))).toEqual([]);
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "PREVIEW_FAILED" }));
}, 90_000);

test("review recording requires an explicit source revision and preserves the draft after rejecting fabricated evidence", async () => {
  const input = join(root, "review-draft.json");
  const review = join(root, "review.json");
  await writeFile(input, JSON.stringify(diagram));
  await writeFile(review, JSON.stringify({ reviewer: "model", viewed: true, frames: [] }));
  const result = await command(["author", "--input", input, "--name", "review-invalid", "--visual-review", review, "--browser", "none"]);
  expect(result.code).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.revision).toBe(null);
  expect(report.checks.visual).toBe("not-run");
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "VISUAL_REVIEW_INVALID" }));
  expect(await readFile(input, "utf8")).toBe(JSON.stringify(diagram));
}, 90_000);

test.skipIf(!browserPath)("a later explicit image-review attestation creates a new revision and keeps original reports and screenshot hashes", async () => {
  const input = join(root, "review-source.json");
  const reviewPath = join(root, "review-evidence.json");
  await writeFile(input, JSON.stringify(diagram));
  const originalResult = await command(["author", "--input", input, "--name", "review-history", "--browser", browserPath!]);
  expect(originalResult.code, originalResult.stdout).toBe(0);
  const original = JSON.parse(originalResult.stdout);
  const originalReport = await readFile(join(original.revision.directory, "report.json"));
  const image = original.visual.capturedFrames[0];
  const review = { reviewer: "contract-test actor; synthetic attestation", viewed: true, frames: [{ id: image.id, sha256: image.sha256,
    observations: { readingOrder: "Synthetic left-to-right observation", density: "Synthetic density observation", occlusion: "Synthetic overlap observation", narrative: "Synthetic narrative observation" },
    issues: [{ reason: "Synthetic issue retained for the user's decision", nextStep: "Ask the user whether to adjust spacing" }] }] };
  await writeFile(reviewPath, JSON.stringify(review));
  const result = await command(["author", "--from", original.revision.id, "--name", "review-history", "--browser", "none", "--visual-review", reviewPath]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.revision).toMatchObject({ id: "v002", parent: "v001" });
  expect(report).toMatchObject({ checks: { visual: "reviewed" }, visual: { status: "review-recorded", capturedFrames: [], viewedFrames: [expect.objectContaining({
    id: image.id, path: image.path, sha256: image.sha256, sourceRevision: "v001", timeMs: image.timeMs
  })] } });
  expect(report.visual.review.scope).toContain("Newly generated images");
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "VISUAL_REVIEW_ISSUE", reason: "Synthetic issue retained for the user's decision" }));
  expect(await readFile(join(original.revision.directory, "report.json"))).toEqual(originalReport);
  expect(createHash("sha256").update(await readFile(image.path)).digest("hex")).toBe(image.sha256);
  await writeFile(reviewPath, JSON.stringify({ ...review, frames: [{ ...review.frames[0], sha256: "0".repeat(64) }] }));
  const rejected = JSON.parse((await command(["author", "--from", "v001", "--name", "review-history", "--browser", "none", "--visual-review", reviewPath])).stdout);
  expect(rejected).toMatchObject({ status: "failed", checks: { visual: "not-run" }, visual: { viewedFrames: [] } });
  expect(rejected.diagnostics).toContainEqual(expect.objectContaining({ code: "VISUAL_REVIEW_INVALID" }));
  expect(await readFile(join(original.revision.directory, "report.json"))).toEqual(originalReport);
}, 90_000);

test.skipIf(!browserPath)("complete clean preview review marks quality as passed", async () => {
  const input = join(root, "review-pass.json");
  const reviewPath = join(root, "review-pass-evidence.json");
  await writeFile(input, JSON.stringify(diagram));
  const originalResult = await command(["author", "--input", input, "--name", "review-pass", "--browser", browserPath!]);
  expect(originalResult.code, originalResult.stdout).toBe(0);
  const original = JSON.parse(originalResult.stdout);
  const review = { reviewer: "model", viewed: true, frames: original.visual.capturedFrames.map((frame: { id: string; sha256: string }) => ({
    id: frame.id, sha256: frame.sha256,
    observations: { readingOrder: "Reviewed", density: "Reviewed", occlusion: "Reviewed", narrative: "Reviewed" }, issues: []
  })) };
  await writeFile(reviewPath, JSON.stringify(review));
  const result = await command(["author", "--from", original.revision.id, "--name", "review-pass", "--browser", "none", "--visual-review", reviewPath]);
  expect(result.code, result.stdout).toBe(0);
  expect(JSON.parse(result.stdout).completion.quality).toBe("needs-user-decision");
}, 120_000);
