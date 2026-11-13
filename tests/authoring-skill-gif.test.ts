import { readCommandReport } from "./helpers/cli-report";
/** Exercise GIF delivery through an installed CLI and observable browser lifetime. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile, readdir, access, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

let root: string;
let skill: string;
let taskTemp: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const animation = { version: 1, viewport: { width: 160, height: 80 },
  nodes: [{ id: "box", kind: "rect", x: 10, y: 10, width: 40, height: 40, style: { fill: "#ff0000", strokeWidth: 0 } }], edges: [],
  scenes: [{ id: "moving", label: "Move", beats: [
    { durationMs: 500, transitionMs: 0, caption: "Ready", actions: [] },
    { durationMs: 500, transitionMs: 0, caption: "Done", actions: [{ type: "updateNode", target: "box", value: { x: 100, fill: "#0000ff" } }] }
  ] }] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG GIF 导出 ")));
  skill = join(root, "installed skill");
  taskTemp = join(root, "owned task temp");
  await mkdir(taskTemp);
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], cancelOnSampling = false, onSampling?: () => void, crashPreview = false) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), DEBUG: "pw:browser", TMPDIR: taskTemp, TMP: taskTemp, TEMP: taskTemp }
    });
    let stdout = "";
    let stderr = "";
    let samplingSeen = false;
    let previewCrashed = false;
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => {
      stderr += data;
      if (crashPreview && !previewCrashed && stderr.includes("Capturing screenshot")) {
        previewCrashed = true;
        const pids = [...stderr.matchAll(/<launched> pid=(\d+)/gu)];
        const pid = Number(pids.at(-1)?.[1]);
        if (pid) process.kill(pid, "SIGKILL");
      }
      if (!samplingSeen && stderr.includes('"phase":"sampling"')) {
        samplingSeen = true;
        onSampling?.();
        if (cancelOnSampling) child.kill("SIGINT");
      }
    });
    child.on("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}
async function inputs(name: string, options: object, document: object = animation) {
  const input = join(root, `${name}.json`);
  const settings = join(root, `${name}-options.json`);
  await writeFile(input, JSON.stringify(document));
  await writeFile(settings, JSON.stringify(options));
  return ["author", "--input", input, "--name", name, "--gif", "--gif-options", settings, "--browser", browser ?? "none"];
}

test.skipIf(!browser)("explicit GIF delivery records the requested export and releases its browser", async () => {
  const result = await command(await inputs("segment", { startMs: 500, endMs: 1000, width: 160, fps: 2, captionHeight: 60, finalHoldMs: 200, loopCount: 1 }));
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "delivered", completion: { delivery: "complete", requested: ["json", "html", "gif"], completed: ["json", "html", "gif"] } });
  expect(report.artifacts).toContainEqual(expect.objectContaining({ kind: "gif", theme: "light", options: expect.objectContaining({ startMs: 500, endMs: 1000 }) }));
  const bytes = await readFile(join(report.revision.directory, "diagram.gif"));
  expect(bytes.subarray(0, 6).toString()).toBe("GIF89a");
  expect(bytes.length).toBeGreaterThan(100);
  expect(result.stderr).toContain('"phase":"complete"');
  await expectResourcesReleased(result.stderr);
  expect(JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"))).toEqual(report);
}, 90_000);

/** Playwright browser logs expose the actual owned OS process and temporary profile, independent of tool internals. */
async function expectResourcesReleased(stderr: string) {
  const pids = [...stderr.matchAll(/<launched> pid=(\d+)/gu)].map((match) => Number(match[1]));
  expect(pids.length, stderr).toBeGreaterThan(0);
  for (const pid of pids) expect(() => process.kill(pid, 0)).toThrow();
  const profiles = [...stderr.matchAll(/--user-data-dir=(.+?) --remote-debugging/gu)].map((match) => match[1]);
  expect(profiles.length).toBeGreaterThan(0);
  for (const path of profiles) await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
  expect((await readdir(taskTemp)).filter((name) => name.startsWith("flowsvg-gif-") || name.startsWith("playwright_chromiumdev_profile-"))).toEqual([]);
}

test("an explicit missing browser fails only GIF, while a default request needs no browser", async () => {
  const args = await inputs("no-browser", {});
  args[args.length - 1] = "none";
  const result = await command(args);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "failed", stage: "gif-export", completion: { delivery: "incomplete", requested: ["json", "html", "gif"], completed: ["json", "html"] } });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "GIF_BROWSER_UNAVAILABLE", location: "browser", nextStep: expect.stringContaining("--browser") }));
  expect(await readdir(report.revision.directory)).not.toContain("diagram.gif");
  expect(await readFile(join(report.revision.directory, "diagram.html"), "utf8")).toContain('"controls":true');
  const normal = await command(["author", "--input", args[2], "--name", "default-no-gif", "--browser", "none"]);
  expect(normal.code).toBe(0);
  const delivered = (await readCommandReport(normal.stdout));
  expect(delivered.completion).toMatchObject({ delivery: "complete", requested: ["json", "html"], completed: ["json", "html"] });
  expect(delivered.artifacts.some((artifact: { kind: string }) => artifact.kind === "gif")).toBe(false);
  expect(normal.stderr).not.toContain('"stage":"gif-export"');
}, 60_000);

test.skipIf(!browser)("real browser caption overflow preserves static delivery and releases browser resources", async () => {
  const result = await command(await inputs("caption-overflow", { captionHeight: 1, fps: 1 }));
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "failed", stage: "gif-export", completion: { delivery: "incomplete", completed: ["json", "html"] } });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "GIF_CAPTION_OVERFLOW", reason: expect.stringContaining("caption") }));
  expect(await readdir(report.revision.directory)).not.toContain("diagram.gif");
  await expectResourcesReleased(result.stderr);
}, 60_000);

test.skipIf(!browser)("SIGINT during actual sampling preserves completed JSON/HTML, records cancellation and releases the owned browser", async () => {
  const document = { ...animation, scenes: [{ id: "long", label: "Long", beats: [
    { durationMs: 60000, caption: "Cancel", actions: [] }
  ] }] };
  const result = await command(await inputs("cancelled", { fps: 30, width: 160, includeCaptions: false }, document), true);
  expect(result.code, result.stdout + result.stderr).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "cancelled", stage: "gif-export", completion: { delivery: "incomplete", requested: ["json", "html", "gif"], completed: ["json", "html"] } });
  expect(result.stderr).not.toContain('"phase":"complete"');
  expect(await readdir(report.revision.directory)).not.toContain("diagram.gif");
  expect(JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"))).toEqual(report);
  await expectResourcesReleased(result.stderr);
}, 60_000);

test("unstartable explicit browser is explained without losing complete static artifacts", async () => {
  const args = await inputs("browser-launch-failure", {});
  args[args.length - 1] = join(root, "missing chromium");
  const result = await command(args);
  expect(result.code).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html"] });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ stage: "gif-export", code: "GIF_ENVIRONMENT", nextStep: expect.stringContaining("Chrome/Chromium") }));
  expect(await readdir(report.revision.directory)).not.toContain("diagram.gif");
  expect((await readdir(taskTemp)).filter((name) => name.startsWith("flowsvg-gif-") || name.startsWith("playwright_chromiumdev_profile-"))).toEqual([]);
  // An existing executable that exits immediately exercises actual launch failure, beyond path validation.
  args[args.length - 1] = process.execPath;
  const crashed = await command(args);
  expect(crashed.code).toBe(1);
  const failed = (await readCommandReport(crashed.stdout));
  expect(failed).toMatchObject({ status: "failed", completion: { delivery: "incomplete", completed: ["json", "html"] } });
  expect(failed.diagnostics).toContainEqual(expect.objectContaining({ stage: "gif-export", code: "GIF_ENVIRONMENT" }));
  expect(await readdir(failed.revision.directory)).not.toContain("diagram.gif");
  await expectResourcesReleased(crashed.stderr);
}, 60_000);

test.skipIf(!browser)("adding GIF to an explicit historical revision creates a new child without modifying the original", async () => {
  const args = await inputs("history-gif", { fps: 2, width: 160, includeCaptions: false, finalHoldMs: 0 });
  const initial = await command(["author", "--checkpoint", "--input", args[2], "--name", "history-gif", "--browser", "none"]);
  expect(initial.code, initial.stdout).toBe(0);
  const parent = (await readCommandReport(initial.stdout));
  const previous = await Promise.all(["diagram.json", "diagram.html", "report.json", "report.md"].map((name) => readFile(join(parent.revision.directory, name))));
  const result = await command(["author", "--checkpoint", "--from", "v001", "--name", "history-gif", "--gif", "--gif-options", args[7], "--browser", browser!]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.revision).toMatchObject({ id: "v002", parent: "v001" });
  expect(report.completion).toMatchObject({ delivery: "complete", requested: ["json", "html", "gif"], completed: ["json", "html", "gif"] });
  expect(report.input.sha256).toBe(parent.input.sha256);
  const after = await Promise.all(["diagram.json", "diagram.html", "report.json", "report.md"].map((name) => readFile(join(parent.revision.directory, name))));
  expect(after).toEqual(previous);
  const bytes = await readFile(join(report.revision.directory, "diagram.gif"));
  expect(bytes.subarray(0, 6).toString()).toBe("GIF89a");
  expect(bytes.length).toBeGreaterThan(100);
}, 60_000);


test.skipIf(!browser)("SDK completion progress cannot register an externally created GIF destination as delivered", async () => {
  const preserved = "externally created file";
  const path = join(root, ".diagrams", ".history", "gif-collision", "v001", "diagram.gif");
  const result = await command([...(await inputs("gif-collision", { fps: 2, includeCaptions: false })), "--checkpoint"], false, () => writeFileSync(path, preserved, { flag: "wx" }));
  expect(result.code, result.stdout + result.stderr).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(result.stderr).toContain('"phase":"complete"');
  expect(report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html"] });
  expect(report.artifacts.some((artifact: { kind: string }) => artifact.kind === "gif")).toBe(false);
  expect(await readFile(path, "utf8")).toBe(preserved);
  await expectResourcesReleased(result.stderr);
}, 60_000);


test.skipIf(!browser)("a failed requested GIF still captures previews and remains incomplete", async () => {
  const result = await command([...(await inputs("combined-gif-failure", { fps: 31 })), "--preview"]);
  expect(result.code, result.stdout + result.stderr).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "failed", stage: "gif-export", completion: { delivery: "incomplete", completed: ["json", "html"] }, visual: { status: "captured" } });
  expect(report.visual.capturedFrames.length).toBeGreaterThan(0);
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "GIF_OPTIONS" }));
  expect(report.artifacts.some((artifact: { kind: string }) => artifact.kind === "gif")).toBe(false);
  await expectResourcesReleased(result.stderr);
}, 60_000);

test.skipIf(!browser)("preview failure preserves a fully delivered requested GIF and records visual failure", async () => {
  const result = await command([...(await inputs("combined-preview-failure", { fps: 2, includeCaptions: false })), "--preview"], false, undefined, true);
  expect(result.code, result.stdout + result.stderr).toBe(1);
  const report = (await readCommandReport(result.stdout));
  expect(report).toMatchObject({ status: "failed", stage: "preview", completion: { delivery: "complete", completed: ["json", "html", "gif"] }, visual: { status: "failed" } });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "PREVIEW_FAILED" }));
  expect((await readFile(join(report.revision.directory, "diagram.gif"))).subarray(0, 6).toString()).toBe("GIF89a");
  await expectResourcesReleased(result.stderr);
}, 60_000);
