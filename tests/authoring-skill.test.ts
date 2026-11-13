import { readCommandReport } from "./helpers/cli-report";
/** Installed CLI behavior: these tests copy the entire skill away from the repository. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { mkdtemp, cp, writeFile, readFile, mkdir, rm, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const document = { version: 1, viewport: { width: 400, height: 300 }, nodes: [], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG 独立 unit ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], env: Record<string, string> = {}) {
  if (args[0] === "author" && !args.includes("--output")) args = [...args, "--output", join(root, ".diagrams", ".history")];
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "缓存 cache"), ...env }
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => resolveResult({ code, stdout, stderr }));
  });
}

test("CLI help is discoverable and unknown options explain the valid option list", async () => {
  const rootHelp = await command(["--help"]);
  expect(rootHelp.code).toBe(0);
  expect(rootHelp.stdout).toContain("flowsvg <command>");
  expect(rootHelp.stdout).toContain("doctor");
  const authorHelp = await command(["author", "--help"]);
  expect(authorHelp.code).toBe(0);
  expect(authorHelp.stdout).toContain("--visual-review");
  const measureHelp = await command(["measure", "--help"]);
  expect(measureHelp.code).toBe(0);
  expect(measureHelp.stdout).toContain("--input");
  const unknown = await command(["author", "--bogus"]);
  expect(unknown.code).toBe(1);
  const report = (await readCommandReport(unknown.stdout));
  expect(report.diagnostics[0]).toMatchObject({ code: "ERR_PARSE_ARGS_UNKNOWN_OPTION" });
  expect(report.diagnostics[0].nextStep).toContain("flowsvg author --help");
  expect(report.diagnostics[0].nextStep).toContain("--visual-review");
}, 60_000);

test("installed tool saves a draft, pins its isolated SDK and leaves the application untouched", async () => {
  const input = join(root, "输入 document.json");
  await writeFile(input, JSON.stringify(document));
  await writeFile(join(root, "package.json"), '{"dependencies":{"flowsvg":"0.0.0"}}');
  await writeFile(join(root, "package-lock.json"), "application lock unchanged");
  const result = await command(["author", "--browser", "none", "--input", input, "--name", "测试 diagram"]);
  expect(result.code, result.stderr + result.stdout).toBe(0);
  const report = (await readCommandReport(result.stdout));
  expect(report.status).toBe("delivered");
  expect(report.checks.validation).toBe("passed");
  expect(report.checks.compilation).toBe("passed");
  expect(report.sdk.version).toBe("0.4.0");
  expect(report.sdk.path.startsWith(join(root, "缓存 cache"))).toBe(true);
  expect(JSON.parse(await readFile(join(report.revision.directory, "diagram.json"), "utf8"))).toEqual(document);
  expect(JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"))).toEqual(report);
  expect(await readFile(join(root, "package-lock.json"), "utf8")).toBe("application lock unchanged");
}, 60_000);

test("doctor reports missing SDK state without preparing dependencies", async () => {
  const result = await command(["doctor"], { FLOWSVG_CACHE_DIR: join(root, "doctor cache") });
  expect(result.code).toBe(0);
  expect((await readCommandReport(result.stdout)).runtime.state).toBe("missing");
});

test("installed CLI preserves authored emphasis and relation colors through export and continuation", async () => {
  const source = { version: 1, viewport: { width: 600, height: 260 },
    emphasis: { fill: "#fff4db", stroke: "#0f766e", markerText: "#ffffff" },
    nodes: [
      { id: "a", kind: "rect", x: 40, y: 90, width: 160, height: 80, label: "Sender" },
      { id: "b", kind: "rect", x: 400, y: 90, width: 160, height: 80, label: "Receiver" }
    ],
    edges: [{ id: "request", from: "a", to: "b", label: "Contract", style: { stroke: "#c2410a", dashed: true } }],
    scenes: [{ id: "send", label: "Send", beats: [{ durationMs: 1000, transitionMs: 0, actions: [
      { type: "highlight", target: "a" },
      { type: "flow", target: "request", direction: "forward", text: "Payload", highlightEdge: false, highlightParticipants: false }
    ] }] }] };
  const input = join(root, "emphasis.json");
  await writeFile(input, JSON.stringify(source));
  const result = await command(["author", "--input", input, "--name", "emphasis", "--svg", "--time", "500", "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  const report = await readCommandReport(result.stdout);
  expect(report.sdk.version).toBe("0.4.0");
  const svg = await readFile(join(report.revision.directory, "diagram.svg"), "utf8");
  expect(svg).toMatch(/<text[^>]*fill="#c2410a"[^>]*><tspan[^>]*>Contract<\/tspan><\/text>/);
  expect(svg).toContain('fill="#fff4db" stroke="#0f766e"');
  expect(svg.match(/<g[^>]*data-flow-id="request"[^>]*>/)?.[0]).toContain('fill="#0f766e"');
  expect(svg).toMatch(/fill="#ffffff"[^>]*>Payload<\/text>/);
  const continued = await command(["author", "--from", "current", "--name", "emphasis", "--browser", "none"]);
  expect(continued.code, continued.stdout + continued.stderr).toBe(0);
  const updated = await readCommandReport(continued.stdout);
  expect(JSON.parse(await readFile(join(updated.revision.directory, "diagram.json"), "utf8"))).toEqual(source);
  expect(await readFile(join(updated.revision.directory, "diagram.svg"), "utf8")).toBe(svg);
}, 60_000);

test("a changed SDK cannot mark historical exports complete without rendering new files", async () => {
  const input = join(root, "sdk-boundary.json");
  await writeFile(input, JSON.stringify(document));
  const first = await command(["author", "--browser", "none", "--input", input, "--name", "sdk-boundary", "--svg", "--checkpoint"]);
  expect(first.code, first.stdout).toBe(0);
  const source = (await readCommandReport(first.stdout));
  // Synthetic archived metadata isolates the inheritance contract; it is not old-SDK acceptance evidence.
  const oldSdk = { ...source.sdk, version: "0.2.3", integrity: "archived-sdk-integrity" };
  const archived = { ...source, sdk: oldSdk, artifacts: source.artifacts.map((item: { kind: string }) =>
    item.kind === "svg" ? { ...item, sdk: oldSdk } : item) };
  const record = join(source.revision.directory, "report.json");
  const bytes = JSON.stringify(archived);
  await writeFile(record, bytes);
  const continued = await command(["author", "--browser", "none", "--from", source.revision.id, "--name", "sdk-boundary"]);
  const report = (await readCommandReport(continued.stdout));
  expect(report.sdk.version).toBe("0.4.0");
  expect(report.completion.requested).toContain("svg");
  expect(report.completion.completed).toContain("svg");
  expect(report.completion.delivery).toBe("complete");
  expect(report.inheritedArtifacts ?? []).toEqual([]);
  const regenerated = report.artifacts.find((item: { kind: string }) => item.kind === "svg");
  expect(regenerated.sdk.version).toBe("0.4.0");
  expect(regenerated.path).not.toBe(source.artifacts.find((item: { kind: string }) => item.kind === "svg").path);
  expect(regenerated.sourceSha256).toBe(source.input.sha256);
  const rendered = await command(["author", "--browser", "none", "--from", source.revision.id, "--name", "sdk-boundary", "--svg", "--checkpoint"]);
  expect(rendered.code, rendered.stdout).toBe(0);
  expect((await readCommandReport(rendered.stdout)).completion.delivery).toBe("complete");
  expect(await readFile(record, "utf8")).toBe(bytes);
}, 60_000);

test("interrupted installation recovery removes abandoned temporary environments", async () => {
  const cache = join(root, "interrupted cache");
  const env = { FLOWSVG_CACHE_DIR: cache };
  const prepared = (await readCommandReport((await command(["prepare"], env)).stdout));
  const directory = prepared.directory;
  await rm(directory, { recursive: true });
  const orphan = `${directory}.tmp-2147483647-abandoned`;
  await mkdir(orphan);
  await mkdir(`${directory}.lock`);
  await writeFile(join(`${directory}.lock`, "owner.json"), '{"pid":2147483647}');
  const result = await command(["prepare"], env);
  expect(result.code, result.stdout).toBe(0);
  await expect(stat(orphan)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);

test("runtime cache identity includes the tool release content", async () => {
  const first = (await readCommandReport((await command(["prepare"])).stdout));
  await writeFile(join(skill, "scripts", "release-note.mjs"), '// changed tool release\n');
  const second = (await readCommandReport((await command(["prepare"])).stdout));
  expect(second.directory).not.toBe(first.directory);
}, 60_000);

test("unwritable output reports a specific save failure without claiming a saved draft", async () => {
  const input = join(root, "save-failure.json");
  const output = join(root, "output-is-file");
  await writeFile(input, JSON.stringify(document));
  await writeFile(output, "keep");
  const result = await command(["author", "--browser", "none", "--input", input, "--output", output, "--name", "save-failure"]);
  const report = (await readCommandReport(result.stdout));
  expect(result.code).toBe(1);
  expect(report.diagnostics[0]).toMatchObject({ stage: "save", code: "DRAFT_SAVE_FAILED" });
  expect(report.artifacts).toEqual([]);
  expect(await readFile(output, "utf8")).toBe("keep");
});

// These cases extend the original installed-CLI tracer contract to its documented failure branches.
test("field/reference errors and compile errors preserve exact draft bytes and distinct check results", async () => {
  const invalid = { ...document, edges: [{ id: "missing", from: "unknown", to: "absent" }] };
  const input = join(root, "field errors.json");
  const bytes = JSON.stringify(invalid, null, 4) + "\n";
  await writeFile(input, bytes);
  const failed = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "errors", "--checkpoint"])).stdout));
  expect(failed).toMatchObject({ status: "failed", checks: { validation: "failed", compilation: "not-run" } });
  expect(failed.diagnostics).toContainEqual(expect.objectContaining({ location: "edges[0].from", stage: "validation" }));
  expect(await readFile(join(failed.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
  const compileInput = { ...document,
    nodes: [{ id: "a", kind: "rect", x: 0, y: 0, width: 50, height: 50 }, { id: "b", kind: "rect", x: 1e308, y: 0, width: 50, height: 50 }],
    edges: [{ id: "e", from: "a", to: "b" }],
    scenes: [{ id: "s", label: "send", beats: [{ durationMs: 1000, actions: [{ type: "flow", target: "e", direction: "forward" }] }] }]
  };
  await writeFile(input, JSON.stringify(compileInput));
  const compile = (await readCommandReport((await command(["author", "--browser", "none", "--input", input, "--name", "errors", "--checkpoint"])).stdout));
  expect(compile.revision.id).toBe("v002");
  expect(compile).toMatchObject({ status: "failed", checks: { validation: "passed", compilation: "failed" } });
  expect(compile.diagnostics).toContainEqual(expect.objectContaining({ location: "scenes[0].beats[0].durationMs", stage: "compilation" }));
  expect(compile.artifacts.map((artifact: { kind: string }) => artifact.kind)).toEqual(["json", "report-json", "report-markdown"]);
  expect(await readFile(join(failed.revision.directory, "diagram.json"), "utf8")).toBe(bytes);
}, 60_000);

test("complete cache works offline, corruption rebuilds, and no-cache offline failure preserves the draft", async () => {
  const ready = (await readCommandReport((await command(["prepare"])).stdout));
  const offline = { npm_config_offline: "true", npm_config_cache: join(root, "empty npm cache") };
  const cached = (await readCommandReport((await command(["prepare"], offline)).stdout));
  expect(cached).toMatchObject({ status: "ready", reused: true });
  const metadataPath = join(ready.sdk.path, "package.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  await writeFile(metadataPath, JSON.stringify({ ...metadata, version: "999.0.0" }));
  const repaired = (await readCommandReport((await command(["prepare"])).stdout));
  expect(repaired).toMatchObject({ status: "ready", reused: false, sdk: { version: "0.4.0" } });
  const input = join(root, "offline.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--browser", "none", "--input", input, "--name", "offline"], { ...offline, FLOWSVG_CACHE_DIR: join(root, "never prepared") });
  expect(result.code).toBe(1);
  const failed = (await readCommandReport(result.stdout));
  expect(failed).toMatchObject({ status: "failed", stage: "environment", checks: { validation: "not-run" }, sdk: null });
  expect(failed.diagnostics[0]).toMatchObject({ code: "INSTALL_FAILED" });
  expect(JSON.parse(await readFile(join(failed.revision.directory, "diagram.json"), "utf8"))).toEqual(document);
}, 60_000);

test("parallel first runs prepare one environment and reserve different revision directories", async () => {
  const input = join(root, "parallel.json");
  await writeFile(input, JSON.stringify(document));
  const env = { FLOWSVG_CACHE_DIR: join(root, "parallel cache") };
  const results = await Promise.all([command(["author", "--browser", "none", "--input", input, "--name", "parallel-two", "--checkpoint", "--output", join(root, "parallel history")], env), command(["author", "--browser", "none", "--input", input, "--name", "parallel", "--checkpoint", "--output", join(root, "parallel history")], env)]);
  expect(results.map((result) => result.code)).toEqual([0, 0]);
  const reports = await Promise.all(results.map((result) => readCommandReport(result.stdout)));
  expect(new Set(reports.map((report) => report.revision.directory)).size).toBe(2);
  expect(new Set(reports.map((report) => report.sdk.path)).size).toBe(1);
  expect(reports.map((report) => report.environment.reused).sort()).toEqual([false, true]);
}, 60_000);

test("missing npm is diagnosed before SDK installation while the draft remains saved", async () => {
  if (process.platform === "win32") return; // Windows finds npm beside its Node executable rather than invoking a shell shim.
  const input = join(root, "no npm.json");
  await writeFile(input, JSON.stringify(document));
  const result = await command(["author", "--browser", "none", "--input", input, "--name", "no npm"], { PATH: join(root, "empty path") });
  const failed = (await readCommandReport(result.stdout));
  expect(result.code).toBe(1);
  expect(failed.diagnostics[0]).toMatchObject({ stage: "environment", code: "NPM_UNAVAILABLE" });
  expect(failed.artifacts.some((artifact: { kind: string }) => artifact.kind === "json")).toBe(true);
});

test("cancellation keeps a cancelled report and releases its installation lock and temporary environment", async () => {
  const input = join(root, "cancel.json");
  const cache = join(root, "cancel cache");
  await writeFile(input, JSON.stringify(document));
  const result = await new Promise<{ code: number | null; stdout: string }>((resolveResult) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), "author", "--browser", "none", "--input", input, "--name", "cancel"], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: cache }
    });
    let stdout = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { if (String(data).includes("Preparing the isolated")) child.kill("SIGINT"); });
    child.on("close", (code) => resolveResult({ code, stdout }));
  });
  const report = (await readCommandReport(result.stdout));
  expect(result.code).toBe(1);
  expect(report.status).toBe("cancelled");
  expect(JSON.parse(await readFile(join(report.revision.directory, "report.json"), "utf8"))).toEqual(report);
  const { readdir } = await import("node:fs/promises");
  expect((await readdir(cache)).some((entry) => entry.includes(".tmp-") || entry.endsWith(".lock"))).toBe(false);
}, 60_000);

test("registry package integrity failure does not fall back to another SDK or claim SDK checks", async () => {
  const manifestPath = join(skill, "runtime/manifest.json");
  const lockPath = join(skill, "runtime/package-lock.json");
  const originalManifest = await readFile(manifestPath);
  const originalLock = await readFile(lockPath);
  const fakeIntegrity = `sha512-${Buffer.alloc(64).toString("base64")}`;
  const manifest = JSON.parse(originalManifest.toString());
  const lock = JSON.parse(originalLock.toString());
  manifest.sdk.integrity = fakeIntegrity;
  lock.packages["node_modules/flowsvg"].integrity = fakeIntegrity;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await writeFile(lockPath, JSON.stringify(lock, null, 2));
  try {
    const input = join(root, "integrity.json");
    await writeFile(input, JSON.stringify(document));
    const result = await command(["author", "--browser", "none", "--input", input, "--name", "integrity"], {
      FLOWSVG_CACHE_DIR: join(root, "integrity cache"), npm_config_cache: join(root, "integrity npm cache"), npm_config_fetch_retries: "0"
    });
    expect(result.code).toBe(1);
    const report = (await readCommandReport(result.stdout));
    expect(report).toMatchObject({ status: "failed", stage: "environment", sdk: null, checks: { validation: "not-run" } });
    expect(report.diagnostics[0].stage).toBe("environment");
    expect(report.diagnostics[0].reason).toMatch(/integrity|checksum/i);
  } finally {
    await writeFile(manifestPath, originalManifest);
    await writeFile(lockPath, originalLock);
  }
}, 60_000);

test("a damaged cached ESM resolver is rebuilt before it can execute", async () => {
  const ready = (await readCommandReport((await command(["prepare"])).stdout));
  const marker = join(root, "damaged-resolver-executed");
  await writeFile(join(ready.directory, "resolve.mjs"), `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'bad'); throw Error('damaged resolver');`);
  const result = await command(["prepare"]);
  expect(result.code, result.stdout).toBe(0);
  expect((await readCommandReport(result.stdout)).reused).toBe(false);
  await expect(stat(marker)).rejects.toMatchObject({ code: "ENOENT" });
}, 60_000);
