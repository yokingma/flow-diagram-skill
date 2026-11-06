/** Batch contracts run only through a copied skill and its isolated installed SDK. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

let root: string;
let skill: string;
let input: string;
let sdk: { version: string; integrity: string };
let sourceSha256: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const document = { version: 1, viewport: { width: 960, height: 600 }, nodes: [{ id: "a", kind: "rect", x: 80, y: 80, width: 180, height: 100, label: "请求" }], edges: [],
  scenes: [{ id: "s", label: "处理", beats: [{ durationMs: 1000, actions: [] }] }] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG manifest 独立 ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
  input = join(root, "source.json");
  const bytes = JSON.stringify(document, null, 4) + "\n";
  await writeFile(input, bytes);
  sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const prepared = await command(["prepare"]);
  expect(prepared.code, prepared.stdout + prepared.stderr).toBe(0);
  sdk = JSON.parse(prepared.stdout).sdk;
}, 60_000);
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], onBrowser?: (child: ChildProcess) => void) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], { cwd: root,
      env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), DEBUG: "pw:browser" } });
    let stdout = "";
    let stderr = "";
    let observed = false;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; if (!observed && stderr.includes("<launched>")) { observed = true; onBrowser?.(child); } });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}
async function manifest(name: string, frames: unknown = [{ name: "overview", timeMs: 0, formats: ["svg"] }], overrides = {}) {
  const path = join(root, `${name}.json`);
  const bytes = JSON.stringify({ schemaVersion: 1, sourceSha256, sdk: { version: sdk.version, integrity: sdk.integrity }, frames, ...overrides }, null, 2) + "\n";
  await writeFile(path, bytes);
  return { path, bytes };
}
function author(name: string, path: string, flags: string[] = []) {
  return command(["author", "--input", input, "--name", name, "--export-manifest", path, "--browser", "none", ...flags]);
}

test("bound manifests save original bytes and allow separately named identical times", async () => {
  const saved = await manifest("same-time", [{ name: "总览", timeMs: 137, formats: ["svg"] }, { name: "same-time", timeMs: 137, formats: ["svg"] }]);
  const result = await author("same-time", saved.path, ["--background", "transparent"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.completion).toMatchObject({ delivery: "complete", requested: ["json", "html", "svg"], completed: ["json", "html", "svg"] });
  expect(report.exports).toEqual([expect.objectContaining({ name: "总览", format: "svg", timeMs: 137, status: "succeeded", background: "transparent" }), expect.objectContaining({ name: "same-time", status: "succeeded" })]);
  expect(await readFile(join(report.revision.directory, "export-manifest.json"), "utf8")).toBe(saved.bytes);
  expect(report.exportManifest).toMatchObject({ sha256: createHash("sha256").update(saved.bytes).digest("hex"), settings: { background: "transparent", theme: "light", reducedMotion: false } });
  expect(report.artifacts.filter((item: { kind: string }) => item.kind === "svg").map((item: { relativePath: string }) => item.relativePath)).toEqual(["exports/总览.svg", "exports/same-time.svg"]);
  expect(report.checks.visual).toBe("not-run");
}, 60_000);

test("whole preflight rejects invalid names, formats, timeline and source/SDK bindings before any static file", async () => {
  const cases = [
    { name: "traversal", frames: [{ name: "../escape", timeMs: 0, formats: ["svg"] }] },
    { name: "reserved", frames: [{ name: "CON.txt", timeMs: 0, formats: ["svg"] }] },
    { name: "trailing", frames: [{ name: "name.", timeMs: 0, formats: ["svg"] }] },
    { name: "case", frames: [{ name: "Overview", timeMs: 0, formats: ["svg"] }, { name: "overview", timeMs: 0, formats: ["png"] }] },
    { name: "unicode", frames: [{ name: "é", timeMs: 0, formats: ["svg"] }, { name: "e\u0301", timeMs: 0, formats: ["svg"] }] },
    { name: "repeat", frames: [{ name: "one", timeMs: 0, formats: ["svg", "svg"] }] },
    { name: "format", frames: [{ name: "one", timeMs: 0, formats: ["jpg"] }] },
    { name: "empty", frames: [{ name: "one", timeMs: 0, formats: [] }] },
    { name: "late", frames: [{ name: "one", timeMs: 0, formats: ["svg"] }, { name: "late", timeMs: 1001, formats: ["svg"] }] },
    { name: "string-time", frames: [{ name: "one", timeMs: "0", formats: ["svg"] }] },
    { name: "hash", overrides: { sourceSha256: "0".repeat(64) } },
    { name: "version", overrides: { sdk: { version: "9.9.9", integrity: sdk.integrity } } },
    { name: "integrity", overrides: { sdk: { version: sdk.version, integrity: "sha512-changed" } } },
    { name: "missing-sdk", overrides: { sdk: { version: sdk.version } } },
    { name: "unknown", overrides: { arbitraryOutput: "escape.svg" } }
  ];
  for (const scenario of cases) {
    const saved = await manifest(`invalid-${scenario.name}`, scenario.frames, scenario.overrides);
    const result = await author(`invalid-${scenario.name}`, saved.path);
    expect(result.code, scenario.name + result.stdout).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.diagnostics, scenario.name).toContainEqual(expect.objectContaining({ code: "EXPORT_MANIFEST_INVALID" }));
    expect(report.artifacts.some((item: { kind: string }) => ["svg", "png"].includes(item.kind)), scenario.name).toBe(false);
    expect(report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html"] });
    expect(await readFile(join(report.revision.directory, "export-manifest.json"), "utf8")).toBe(saved.bytes);
  }
  const saved = await manifest("changed-whitespace");
  const original = await readFile(input, "utf8");
  await writeFile(input, original + " ");
  const changed = await author("changed-whitespace", saved.path);
  expect(changed.code).toBe(1);
  expect(JSON.parse(changed.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "EXPORT_MANIFEST_INVALID" }));
  await writeFile(input, original);
}, 60_000);

test("shared PNG options and single-frame selection are checked before a batch writes images", async () => {
  const saved = await manifest("shared", [{ name: "svg-first", timeMs: 0, formats: ["svg"] }, { name: "png-later", timeMs: 0, formats: ["png"] }]);
  for (const width of ["", "0", "Infinity", "9000", "8000"]) {
    const result = await author(`width-${width || "empty"}`, saved.path, ["--png-width", width]);
    expect(result.code, result.stdout).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "EXPORT_MANIFEST_INVALID" }));
    expect(report.artifacts.some((item: { kind: string }) => ["svg", "png"].includes(item.kind))).toBe(false);
  }
  const svgOnly = await manifest("svg-only");
  const orphan = await author("orphan-width", svgOnly.path, ["--png-width", "480"]);
  expect(JSON.parse(orphan.stdout).diagnostics).toContainEqual(expect.objectContaining({ code: "EXPORT_MANIFEST_INVALID" }));
  for (const flags of [["--svg"], ["--png"], ["--time", "0"]]) {
    const result = await author("selection", saved.path, flags);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout).stage).toBe("arguments");
  }
}, 60_000);

test("runtime PNG failure continues later SVG items and leaves the PNG category incomplete", async () => {
  const saved = await manifest("independent", [{ name: "one", timeMs: 0, formats: ["png", "svg"] }, { name: "two", timeMs: 1000, formats: ["svg", "png"] }]);
  const result = await author("independent", saved.path);
  expect(result.code, result.stdout).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.exports.map((item: { status: string }) => item.status)).toEqual(["failed", "succeeded", "succeeded", "failed"]);
  expect(report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html", "svg"] });
  expect(report.exportManifest.status).toBe("failed");
  expect(report.exports[0]).toMatchObject({ format: "png", width: 960, height: 600, path: expect.stringContaining("exports/one.png"), error: { code: "PNG_BROWSER_UNAVAILABLE" } });
}, 60_000);


test.skipIf(!browser)("one failed SVG cannot complete its category and existing destination bytes survive", async () => {
  const saved = await manifest("collision", [{ name: "slow", timeMs: 137, formats: ["png"] }, { name: "blocked", timeMs: 0, formats: ["svg"] }, { name: "good", timeMs: 1000, formats: ["svg"] }]);
  const collision = join(root, ".diagrams", ".history", "collision", "v001", "exports", "blocked.svg");
  let observed = false;
  const result = await command(["author", "--input", input, "--name", "collision", "--export-manifest", saved.path, "--png-width", "480", "--browser", browser!], () => {
    writeFileSync(collision, "external destination", { flag: "wx" }); observed = true;
  });
  expect(observed).toBe(true);
  expect(result.code, result.stdout + result.stderr).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.exports.map((item: { status: string }) => item.status)).toEqual(["succeeded", "failed", "succeeded"]);
  expect(report.completion).toMatchObject({ delivery: "incomplete", completed: ["json", "html", "png"] });
  expect(report.exports[1].error.code).toBe("SVG_EEXIST");
  expect(await readFile(collision, "utf8")).toBe("external destination");
  expect(report.artifacts.some((item: { name: string }) => item.name === "blocked")).toBe(false);
}, 60_000);

test.skipIf(!browser)("cancellation retains finished images, records unexecuted items and retries in a new revision", async () => {
  const saved = await manifest("cancel", [{ name: "first", timeMs: 0, formats: ["svg", "png"] }, { name: "later", timeMs: 1000, formats: ["svg", "png"] }]);
  const result = await command(["author", "--input", input, "--name", "cancel", "--export-manifest", saved.path, "--browser", browser!], (child) => { child.kill("SIGTERM"); });
  expect(result.code, result.stdout + result.stderr).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.status).toBe("cancelled");
  expect(report.exportManifest.status).toBe("cancelled");
  expect(report.exports.map((item: { status: string }) => item.status)).toEqual(["succeeded", "cancelled", "not-run", "not-run"]);
  expect(report.exports[2].error).toMatchObject({ code: "BATCH_NOT_EXECUTED", reason: expect.stringContaining("cancel") });
  expect(report.completion.completed).toEqual(["json", "html"]);
  const history = await Promise.all(["diagram.json", "diagram.html", "export-manifest.json", "exports/first.svg", "report.json", "report.md"].map((name) => readFile(join(report.revision.directory, name))));
  const retry = await command(["author", "--from", "v001", "--name", "cancel", "--export-manifest", saved.path, "--png-width", "480", "--browser", browser!]);
  expect(retry.code, retry.stdout + retry.stderr).toBe(0);
  expect(JSON.parse(retry.stdout).revision).toMatchObject({ id: "v002", parent: "v001" });
  expect(JSON.parse(retry.stdout).completion.delivery).toBe("complete");
  const after = await Promise.all(["diagram.json", "diagram.html", "export-manifest.json", "exports/first.svg", "report.json", "report.md"].map((name) => readFile(join(report.revision.directory, name))));
  expect(after).toEqual(history);
}, 60_000);

test.skipIf(!browser)("report write failure stays explicit after all requested images have been saved", async () => {
  const saved = await manifest("report-failure", [{ name: "one", timeMs: 0, formats: ["png", "svg"] }]);
  const result = await command(["author", "--input", input, "--name", "report-failure", "--export-manifest", saved.path, "--png-width", "480", "--browser", browser!], () => {
    mkdirSync(join(root, ".diagrams", ".history", "report-failure", "v001", "report.json.tmp"));
  });
  expect(result.code, result.stdout + result.stderr).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.exports.every((item: { status: string }) => item.status === "succeeded")).toBe(true);
  expect(report.status).toBe("failed");
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "REPORT_SAVE_FAILED" }));
  expect(report.artifacts.some((item: { kind: string }) => item.kind.startsWith("report-"))).toBe(false);
}, 60_000);

test("explicitly rebuilt bindings retain the rejected parent manifest and confirmation source", async () => {
  const old = await manifest("old-binding", undefined, { sdk: { version: sdk.version, integrity: "sha512-old" } });
  const rejected = JSON.parse((await author("rebind", old.path)).stdout);
  const oldBytes = await readFile(join(rejected.revision.directory, "export-manifest.json"));
  const saved = await manifest("confirmed-binding");
  const sources = join(root, "rebind-confirmation.json");
  await writeFile(sources, JSON.stringify([{ kind: "prompt", reference: "Test-only explicit confirmation of overview at 0ms after reading installed SDK and compiled beats." }]));
  const result = await command(["author", "--from", "v001", "--name", "rebind", "--export-manifest", saved.path, "--sources", sources, "--browser", "none"]);
  expect(result.code, result.stdout).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.provenance.exportManifests).toEqual([expect.objectContaining({ revision: "v001", sha256: rejected.exportManifest.sha256, source: old.path, status: "preflight-failed" })]);
  expect(report.sources).toContainEqual(expect.objectContaining({ reference: expect.stringContaining("explicit confirmation") }));
  expect(await readFile(join(rejected.revision.directory, "export-manifest.json"))).toEqual(oldBytes);
}, 60_000);

test.skipIf(!browser)("mixed batch evidence and viewing scope remain separate by artifact, format and display width", async () => {
  const saved = await manifest("batch-evidence", [{ name: "selected", timeMs: 137, formats: ["png", "svg"] }, { name: "other", timeMs: 500, formats: ["svg"] }]);
  const sourceResult = await command(["author", "--input", input, "--name", "batch-evidence", "--export-manifest", saved.path, "--png-width", "480", "--background", "transparent", "--browser", browser!]);
  expect(sourceResult.code, sourceResult.stdout + sourceResult.stderr).toBe(0);
  const source = JSON.parse(sourceResult.stdout);
  expect(source.completion.delivery).toBe("complete");
  expect(source.exports.map((item: { format: string }) => item.format)).toEqual(["png", "svg", "svg"]);
  const images = source.artifacts.filter((item: { kind: string }) => ["svg", "png"].includes(item.kind));
  const settings = join(root, "batch display.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: images[0].artifactId, displayWidth: 720, backdrop: "#ffffff" },
    { artifactId: images[1].artifactId, displayWidth: 720, backdrop: "#111827" }, { artifactId: images[1].artifactId, displayWidth: 1280, backdrop: "#ffffff" },
    { artifactId: images[2].artifactId, displayWidth: 720, backdrop: "#ffffff" }] }));
  const captureResult = await command(["author", "--from", "v001", "--name", "batch-evidence", "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(captureResult.code, captureResult.stdout + captureResult.stderr).toBe(0);
  const captured = JSON.parse(captureResult.stdout);
  expect(captured.artifactEvidence.items).toHaveLength(4);
  expect(captured.artifactEvidence.items.map((item: { displayWidth: number }) => item.displayWidth)).toEqual([720, 720, 1280, 720]);
  const evidence = captured.artifactEvidence.items[0];
  const review = join(root, "batch viewing.json");
  await writeFile(review, JSON.stringify({ reviewer: "contract test only; no acceptance", viewed: true, items: [{ evidenceId: evidence.evidenceId, sha256: evidence.sha256,
    observations: { readingOrder: "Fixture scope.", density: "720px PNG only.", occlusion: "Fixture scope.", narrative: "137ms only." }, issues: [] }] }));
  const reviewedResult = await command(["author", "--from", "v002", "--name", "batch-evidence", "--artifact-review", review, "--browser", "none"]);
  expect(reviewedResult.code, reviewedResult.stdout).toBe(0);
  const reviewed = JSON.parse(reviewedResult.stdout);
  expect(reviewed.artifactEvidenceCoverage).toMatchObject({ requested: 4, viewed: 1, unviewed: 3 });
  expect(reviewed.visual.artifactReviews).toHaveLength(1);
  expect(reviewed.visual.artifactReviews[0]).toMatchObject({ artifactSourceRevision: "v001", evidenceRevision: "v002", artifactId: images[0].artifactId });
  expect(reviewed.completion.quality).toBe("incomplete");
  expect(reviewed.provenance.exportManifests).toHaveLength(1);
}, 90_000);

test("unreadable or malformed manifests explain failure and preserve default delivery without static files", async () => {
  const malformed = join(root, "malformed-manifest.json");
  await writeFile(malformed, "{not JSON\n");
  for (const path of [join(root, "missing-manifest.json"), malformed]) {
    const result = await author("unreadable-manifest", path);
    expect(result.code, result.stdout).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "EXPORT_MANIFEST_INVALID", stage: "export-manifest" }));
    expect(report.completion.completed).toEqual(["json", "html"]);
    expect(report.artifacts.some((item: { kind: string }) => ["svg", "png"].includes(item.kind))).toBe(false);
  }
}, 60_000);

test("an empty manifest path cannot silently become default delivery", async () => {
  const result = await author("empty-manifest-path", "");
  expect(result.code, result.stdout).toBe(1);
  expect(JSON.parse(result.stdout).stage).toBe("arguments");
});


test("named export identities survive multiple review-only revisions", async () => {
  const name = "transitive-exports";
  const saved = await manifest(name);
  const first = JSON.parse((await author(name, saved.path)).stdout);
  const second = JSON.parse((await command(["author", "--from", first.revision.id, "--name", name, "--browser", "none"])).stdout);
  const thirdResult = await command(["author", "--from", second.revision.id, "--name", name, "--browser", "none"]);
  expect(thirdResult.code, thirdResult.stdout + thirdResult.stderr).toBe(0);
  const third = JSON.parse(thirdResult.stdout);
  expect(third.inheritedExports).toEqual(first.exports);
  expect(third.qualityCoverage.required).toContainEqual(expect.objectContaining({ artifactId: first.exports[0].artifactId, kind: "artifact", format: "svg", status: "incomplete" }));
});
