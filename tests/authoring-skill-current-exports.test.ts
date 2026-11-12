/** Repeated exports consume the installed CLI and observe actual files at the mutable current locator. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readCommandReport } from "./helpers/cli-report";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 160, height: 80 },
  nodes: [{ id: "box", kind: "rect", x: 10, y: 10, width: 40, height: 40, label: "First" }], edges: [],
  scenes: [{ id: "moving", label: "Move", beats: [
    { durationMs: 500, transitionMs: 0, actions: [] },
    { durationMs: 500, transitionMs: 0, actions: [{ type: "updateNode", target: "box", value: { label: "Done", x: 100 } }] }
  ] }] };
const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-current-exports-")));
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

test("current resume regenerates requested SVG with its time, background and theme instead of adopting stale files", async () => {
  const input = join(root, "static.json");
  await writeFile(input, JSON.stringify(document));
  const first = await command(["author", "--input", input, "--name", "static", "--svg", "--time", "500", "--background", "transparent", "--theme", "dark", "--browser", "none"]);
  expect(first.code, first.stdout + first.stderr).toBe(0);
  const old = first.report.artifacts.find((item: { kind: string }) => item.kind === "svg");
  await writeFile(old.path, "stale image");
  const resumed = await command(["author", "--from", "current", "--name", "static", "--browser", "none"]);
  expect(resumed.code, resumed.stdout + resumed.stderr).toBe(0);
  expect(resumed.report.completion).toMatchObject({ delivery: "complete", requested: ["json", "html", "svg"], completed: ["json", "html", "svg"] });
  const image = resumed.report.artifacts.find((item: { kind: string }) => item.kind === "svg");
  expect(image).toMatchObject({ path: old.path, timeMs: 500, background: "transparent", theme: "dark", sourceSha256: resumed.report.input.sha256, sdk: { version: resumed.report.sdk.version, integrity: resumed.report.sdk.integrity } });
  const bytes = await readFile(image.path);
  expect(bytes.toString()).toContain("Done");
  expect(hash(bytes)).toBe(image.sha256);
  expect(await readdir(join(root, ".diagrams", ".history", "static"))).toEqual(["current"]);
  const changed = await command(["author", "--from", "current", "--name", "static", "--svg", "--time", "0", "--theme", "light", "--browser", "none"]);
  expect(changed.code, changed.stdout + changed.stderr).toBe(0);
  expect(changed.report.artifacts.find((item: { kind: string }) => item.kind === "svg")).toMatchObject({ timeMs: 0, theme: "light" });
  expect(await readFile(image.path, "utf8")).toContain("First");
}, 60_000);

test("named exports resume from saved manifest bytes and changed source invalidates their old binding", async () => {
  const input = join(root, "batch-source.json");
  const bytes = JSON.stringify(document);
  await writeFile(input, bytes);
  const prepared = await command(["prepare"]);
  const sdk = prepared.report.sdk;
  const manifest = join(root, "batch-manifest.json");
  const selection = JSON.stringify({ schemaVersion: 1, sourceSha256: hash(bytes), sdk: { version: sdk.version, integrity: sdk.integrity }, frames: [
    { name: "first", timeMs: 0, formats: ["svg"] }, { name: "done", timeMs: 500, formats: ["svg"] }
  ] });
  await writeFile(manifest, selection);
  const first = await command(["author", "--input", input, "--name", "batch", "--export-manifest", manifest, "--background", "transparent", "--browser", "none"]);
  expect(first.code, first.stdout + first.stderr).toBe(0);
  await rm(manifest);
  const resumed = await command(["author", "--from", "current", "--name", "batch", "--browser", "none"]);
  expect(resumed.code, resumed.stdout + resumed.stderr).toBe(0);
  expect(resumed.report.exports).toHaveLength(2);
  expect(resumed.report.exports.every((item: { status: string }) => item.status === "succeeded")).toBe(true);
  expect(await readFile(join(resumed.report.revision.directory, "export-manifest.json"), "utf8")).toBe(selection);
  expect(await readFile(join(resumed.report.revision.directory, "exports/done.svg"), "utf8")).toContain("Done");
  await writeFile(input, bytes + "\n");
  const changed = await command(["author", "--input", input, "--name", "batch", "--browser", "none"]);
  expect(changed.code, changed.stdout + changed.stderr).toBe(1);
  expect(changed.report.diagnostics).toContainEqual(expect.objectContaining({ code: "EXPORT_MANIFEST_INVALID" }));
  expect(changed.report.completion.delivery).toBe("incomplete");
  await expect(readFile(join(changed.report.revision.directory, "exports/done.svg"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(join(root, ".diagrams", "batch", "exports/done.svg"), "utf8")).toContain("Done");
  expect(changed.report.recovery.inputSha256).toBe(first.report.input.sha256);
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("mixed PNG and GIF resume regenerates actual files with saved settings and keeps one current result", async () => {
  const input = join(root, "animated.json");
  const options = join(root, "gif-settings.json");
  const browser = process.env.FLOWSVG_TEST_BROWSER!;
  await writeFile(input, JSON.stringify(document));
  await writeFile(options, JSON.stringify({ fps: 2, width: 160, includeCaptions: false, finalHoldMs: 0 }));
  const first = await command(["author", "--input", input, "--name", "animated", "--png", "--png-width", "320", "--time", "500", "--gif", "--gif-options", options, "--browser", browser]);
  expect(first.code, first.stdout + first.stderr).toBe(0);
  const gif = first.report.artifacts.find((item: { kind: string }) => item.kind === "gif");
  await writeFile(gif.path, "stale GIF");
  await rm(options);
  const resumed = await command(["author", "--from", "current", "--name", "animated", "--browser", browser]);
  expect(resumed.code, resumed.stdout + resumed.stderr).toBe(0);
  expect(resumed.report.completion).toMatchObject({ delivery: "complete", completed: ["json", "html", "png", "gif"] });
  const png = resumed.report.artifacts.find((item: { kind: string }) => item.kind === "png");
  expect(png).toMatchObject({ intrinsicWidth: 320, intrinsicHeight: 160, timeMs: 500 });
  const fresh = resumed.report.artifacts.find((item: { kind: string }) => item.kind === "gif");
  const bytes = await readFile(fresh.path);
  expect(bytes.subarray(0, 6).toString()).toBe("GIF89a");
  expect(bytes.readUInt16LE(6)).toBe(160);
  expect(hash(bytes)).toBe(fresh.sha256);
  expect(fresh).toMatchObject({ sourceSha256: resumed.report.input.sha256, options: { fps: 2, includeCaptions: false, finalHoldMs: 0 } });
  expect(await readdir(join(root, ".diagrams", ".history", "animated"))).toEqual(["current"]);
  const failed = await command(["author", "--from", "current", "--name", "animated", "--browser", "none"]);
  expect(failed.code).toBe(1);
  expect(failed.report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html"] });
  expect(failed.report.diagnostics).toContainEqual(expect.objectContaining({ code: "PNG_BROWSER_UNAVAILABLE" }));
  expect(failed.report.diagnostics).toContainEqual(expect.objectContaining({ code: "GIF_BROWSER_UNAVAILABLE" }));
  expect(await readFile(join(root, ".diagrams", "animated", "diagram.gif"))).toEqual(bytes);
  await expect(readFile(join(failed.report.revision.directory, "diagram.gif"))).rejects.toMatchObject({ code: "ENOENT" });
  expect((await readdir(join(root, ".diagrams", ".history", "animated"))).sort()).toEqual([".recovery", "current"]);
}, 90_000);

test("selecting a checkpoint as current source regenerates its requested images without borrowing historical completion", async () => {
  const input = join(root, "checkpoint.json");
  await writeFile(input, JSON.stringify(document));
  const saved = await command(["author", "--checkpoint", "--input", input, "--name", "checkpoint", "--svg", "--time", "500", "--browser", "none"]);
  expect(saved.code, saved.stdout + saved.stderr).toBe(0);
  const original = await readFile(join(saved.report.revision.directory, "report.json"));
  const selected = await command(["author", "--from", "v001", "--name", "checkpoint", "--browser", "none"]);
  expect(selected.code, selected.stdout + selected.stderr).toBe(0);
  expect(selected.report.revision.id).toBe("current");
  expect(selected.report.artifacts).toContainEqual(expect.objectContaining({ kind: "svg", artifactSourceRevision: "current", timeMs: 500 }));
  expect(await readFile(join(selected.report.revision.directory, "diagram.svg"), "utf8")).toContain("Done");
  expect(await readFile(join(saved.report.revision.directory, "report.json"))).toEqual(original);
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("current HTML captures retain requested scope and replace superseded animation stages and source identities", async () => {
  const input = join(root, "captures.json");
  const browser = process.env.FLOWSVG_TEST_BROWSER!;
  await writeFile(input, JSON.stringify(document));
  const first = await command(["author", "--input", input, "--name", "captures", "--samples", "2", "--browser", browser]);
  expect(first.code, first.stdout + first.stderr).toBe(0);
  expect(first.report.htmlInspection.states).toHaveLength(2);
  const paths = first.report.htmlInspection.states.map((state: { path: string }) => state.path);
  const repeated = await command(["author", "--from", "current", "--name", "captures", "--browser", browser]);
  expect(repeated.code, repeated.stdout + repeated.stderr).toBe(0);
  expect(repeated.report.htmlInspection.states.map((state: { path: string }) => state.path)).toEqual(paths);
  expect(await readdir(join(repeated.report.revision.directory, "html-inspection"))).toHaveLength(2);
  await writeFile(input, JSON.stringify({ ...document, nodes: [{ ...document.nodes[0], label: "Changed" }] }));
  const changed = await command(["author", "--input", input, "--name", "captures", "--samples", "3", "--theme", "dark", "--browser", browser]);
  expect(changed.code, changed.stdout + changed.stderr).toBe(0);
  expect(changed.report.htmlInspection).toMatchObject({ inputSha256: changed.report.input.sha256, theme: "dark" });
  expect(changed.report.input.sha256).not.toBe(first.report.input.sha256);
  expect(changed.report.htmlInspection.states).toHaveLength(3);
  expect(changed.report.htmlInspection.states.some((state: { diagramText: string }) => state.diagramText.includes("Changed"))).toBe(true);
  const reduced = await command(["author", "--from", "current", "--name", "captures", "--samples", "2", "--browser", browser]);
  expect(reduced.code, reduced.stdout + reduced.stderr).toBe(0);
  expect(await readdir(join(reduced.report.revision.directory, "html-inspection"))).toHaveLength(2);
  expect(await readdir(join(root, ".diagrams", ".history", "captures"))).toEqual(["current"]);
}, 90_000);
