/** On-demand evidence consumes copied-install artifacts and exposes only source-bound capture/reuse side effects. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const browser = process.env.FLOWSVG_TEST_BROWSER;
const document = { version: 1, viewport: { width: 400, height: 240 },
  nodes: [{ id: "a", kind: "rect", x: 60, y: 60, width: 160, height: 80, label: "Source" }], edges: [], scenes: [] };
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-on-demand-evidence-")));
  skill = join(root, "installed");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], env: Record<string, string> = {}, interruptAt?: string) {
  return new Promise<{ code: number | null; report: Record<string, unknown>; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), DEBUG: "pw:browser", ...env }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => {
      stderr += data;
      if (interruptAt && stderr.includes(interruptAt)) { interruptAt = undefined; child.kill("SIGINT"); }
    });
    child.on("close", (code) => done({ code, report: JSON.parse(stdout), stderr }));
  });
}
async function tree(directory: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(files, await tree(path));
    else files[path] = (await readFile(path)).toString("base64");
  }
  return files;
}

test.skipIf(!browser)("evidence captures existing artifacts once, retains immutable sources and reuses without runtime or browser", async () => {
  const name = "reuse";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const before = await tree(history);
  const args = ["evidence", "--from", "v001", "--name", name, "--output", history];
  const captured = await command([...args, "--browser", browser!]);
  expect(captured.code, JSON.stringify(captured)).toBe(0);
  expect(captured.report).toMatchObject({ command: "evidence", status: "evidence-recorded", revision: null, sourceRevision: "v001",
    record: { id: expect.stringMatching(/^evidence-/), reused: false }, artifactEvidence: { items: [expect.objectContaining({ status: "captured", operationStatus: "captured", displayWidth: 400, displayHeight: 240, backdrop: "#ffffff" })] } });
  expect(captured.stderr.match(/<launched> pid=/g)).toHaveLength(1);
  const after = await tree(history);
  for (const [path, bytes] of Object.entries(before)) expect(after[path]).toBe(bytes);
  expect(Object.keys(after).filter((path) => !(path in before))).toHaveLength(2);
  expect(await readdir(join(history, name))).toEqual(["records", "v001"]);
  const repeated = await command([...args, "--browser", join(root, "must-not-launch")], { FLOWSVG_CACHE_DIR: input });
  expect(repeated.code, JSON.stringify(repeated)).toBe(0);
  expect(repeated.report).toMatchObject({ record: { id: (captured.report.record as { id: string }).id, reused: true },
    artifactEvidence: { items: [expect.objectContaining({ operationStatus: "reused" })] } });
  expect(repeated.stderr).not.toMatch(/<launched> pid=|Capturing|Preparing the isolated/);
  expect(await tree(history)).toEqual(after);
}, 90_000);

async function reviewForm(workspace: string, history: string, name: string, evidenceId: string, suffix: string) {
  const path = join(workspace, `${suffix}-review.json`);
  const generated = await command(["review-template", "--from", "v001", "--name", name, "--output", history,
    "--kind", "artifact", "--evidence-from", evidenceId, "--template", path]);
  expect(generated.code, JSON.stringify(generated)).toBe(0);
  const review = JSON.parse(await readFile(path, "utf8"));
  expect(review.viewed).toBe(false);
  review.viewed = true;
  review.reviewer = "synthetic evidence contract fixture; not actual visual acceptance";
  for (const item of review.items) item.observations = { readingOrder: "Fixture.", density: "Fixture.", occlusion: "Fixture.", narrative: "Fixture." };
  await writeFile(path, JSON.stringify(review));
  return path;
}

test.skipIf(!browser)("new surfaces extend complete requirements, stay unviewed and only capture the added condition", async () => {
  const name = "conditions";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", browser!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const args = ["evidence", "--from", "v001", "--name", name, "--output", history];
  const first = await command([...args, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  const firstId = (first.report.record as { id: string }).id;
  const firstReview = await reviewForm(workspace, history, name, firstId, "first");
  const reviewed = await command(["review", "--from", "v001", "--name", name, "--output", history, "--artifact-review", firstReview, "--evidence-from", firstId]);
  expect(reviewed.code, JSON.stringify(reviewed)).toBe(0);
  const artifact = (source.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "additional.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 240, backdrop: "#111827" }] }));
  const before = await tree(history);
  const added = await command([...args, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(added.code, JSON.stringify(added)).toBe(0);
  expect(added.report).toMatchObject({ artifactEvidence: { items: [expect.objectContaining({ operationStatus: "reused" }), expect.objectContaining({ operationStatus: "captured", displayWidth: 240 })] } });
  expect(added.stderr.match(/<launched> pid=/g)).toHaveLength(1);
  const after = await tree(history);
  expect(Object.keys(after).filter((path) => !(path in before))).toHaveLength(2);
  const finalizeArgs = ["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"];
  const partial = await command(finalizeArgs);
  expect(partial.code, JSON.stringify(partial)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact")).toHaveLength(2);
  expect(summary.qualityCoverage.required.filter((item: { kind: string; status: string }) => item.kind === "artifact" && item.status === "passed")).toHaveLength(1);
  expect(summary.completion.quality).toBe("incomplete");
  const repeat = await command([...args, "--browser", "none"], { FLOWSVG_CACHE_DIR: input });
  expect(repeat.code, JSON.stringify(repeat)).toBe(0);
  expect((repeat.report.artifactEvidence as { items: unknown[] }).items).toHaveLength(2);
  expect(await tree(history)).toEqual(after);
}, 90_000);

test.skipIf(!browser)("changed source and theme start fresh requirements without reusing prior context", async () => {
  const name = "changed";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  expect((await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"])).code).toBe(0);
  const first = await command(["evidence", "--from", "v001", "--name", name, "--output", history, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  await writeFile(input, JSON.stringify({ ...document, title: "Changed source" }));
  const second = await command(["author", "--input", input, "--parent", "v001", "--name", name, "--output", history, "--svg", "--theme", "dark", "--browser", "none"]);
  expect(second.code, JSON.stringify(second)).toBe(0);
  const capture = await command(["evidence", "--from", "v002", "--name", name, "--output", history, "--browser", browser!]);
  expect(capture.code, JSON.stringify(capture)).toBe(0);
  expect(capture.report).toMatchObject({ artifactEvidence: { items: [expect.objectContaining({ operationStatus: "captured", theme: "dark", backdrop: "#111827" })] } });
  expect(capture.stderr.match(/<launched> pid=/g)).toHaveLength(1);
}, 90_000);

test.skipIf(!browser)("revision-owned evidence can be reused alongside one new condition and keep its original identity", async () => {
  const name = "revision-reuse";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const artifact = (source.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 320, backdrop: "#ffffff" }] }));
  const previous = await command(["author", "--from", "v001", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(previous.code, JSON.stringify(previous)).toBe(0);
  const oldItem = (previous.report.artifactEvidence as { items: { evidenceId: string }[] }).items[0];
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 240, backdrop: "#111827" }] }));
  const captured = await command(["evidence", "--from", "v002", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(captured.code, JSON.stringify(captured)).toBe(0);
  expect(captured.report).toMatchObject({ artifactEvidence: { items: [expect.objectContaining({ operationStatus: "reused", evidenceId: oldItem.evidenceId }), expect.objectContaining({ operationStatus: "captured" })] } });
  const id = (captured.report.record as { id: string }).id;
  const path = join(workspace, "review.json");
  const generated = await command(["review-template", "--from", "v002", "--name", name, "--output", history, "--kind", "artifact", "--evidence-from", id, "--template", path]);
  expect(generated.code, JSON.stringify(generated)).toBe(0);
  const form = JSON.parse(await readFile(path, "utf8"));
  expect(form.items.some((item: { evidenceId: string }) => item.evidenceId === oldItem.evidenceId)).toBe(true);
  form.viewed = true;
  form.reviewer = "synthetic revision reuse fixture; not actual acceptance";
  for (const item of form.items) item.observations = { readingOrder: "Fixture.", density: "Fixture.", occlusion: "Fixture.", narrative: "Fixture." };
  await writeFile(path, JSON.stringify(form));
  const reviewed = await command(["review", "--from", "v002", "--name", name, "--output", history, "--artifact-review", path, "--evidence-from", id]);
  expect(reviewed.code, JSON.stringify(reviewed)).toBe(0);
}, 90_000);

test.skipIf(!browser)("missing browser records all conditions and a later request captures only missing surfaces", async () => {
  const name = "no-browser";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  expect((await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"])).code).toBe(0);
  const args = ["evidence", "--from", "v001", "--name", name, "--output", history];
  const missing = await command([...args, "--browser", "none"], { FLOWSVG_CACHE_DIR: input });
  expect(missing.code).toBe(1);
  expect(missing.report).toMatchObject({ artifactEvidence: { status: "not-run", items: [expect.objectContaining({ status: "not-run", operationStatus: "not-run" })] } });
  const capture = await command([...args, "--browser", browser!]);
  expect(capture.code, JSON.stringify(capture)).toBe(0);
  expect(capture.report).toMatchObject({ artifactEvidence: { items: [expect.objectContaining({ operationStatus: "captured" })] } });
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.evidenceRecords.records).toHaveLength(2);
  expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact")).toHaveLength(1);
  expect(summary.completion.quality).toBe("incomplete");
}, 90_000);


test.skipIf(!browser)("corrupt screenshots are recaptured, while changed source or record settings reject reuse without writes", async () => {
  const name = "identity";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const authored = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"]);
  expect(authored.code, JSON.stringify(authored)).toBe(0);
  const args = ["evidence", "--from", "v001", "--name", name, "--output", history];
  const first = await command([...args, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  const original = (first.report.artifactEvidence as { items: { path: string; evidenceId: string }[] }).items[0];
  const id = (first.report.record as { id: string; path: string }).id;
  const review = await reviewForm(workspace, history, name, id, "old");
  expect((await command(["review", "--from", "v001", "--name", name, "--output", history, "--artifact-review", review, "--evidence-from", id])).code).toBe(0);
  await writeFile(original.path, "corrupt screenshot");
  const recaptured = await command([...args, "--browser", browser!]);
  expect(recaptured.code, JSON.stringify(recaptured)).toBe(0);
  const replacement = (recaptured.report.artifactEvidence as { items: { evidenceId: string }[] }).items[0];
  expect(replacement.evidenceId).not.toBe(original.evidenceId);
  expect(recaptured.stderr.match(/<launched> pid=/g)).toHaveLength(1);
  const final = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"]);
  expect(final.code, JSON.stringify(final)).toBe(0);
  expect(final.report).toMatchObject({ completion: { quality: "incomplete" } });
  const freshId = (recaptured.report.record as { id: string }).id;
  const freshReview = await reviewForm(workspace, history, name, freshId, "fresh");
  const recoveredReview = await command(["review", "--from", "v001", "--name", name, "--output", history, "--artifact-review", freshReview, "--evidence-from", freshId]);
  expect(recoveredReview.code, JSON.stringify(recoveredReview)).toBe(0);
  const recoveredFinal = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"]);
  expect(recoveredFinal.code, JSON.stringify(recoveredFinal)).toBe(0);
  const recoveredSummary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(recoveredSummary.reviewRecords.records.some((record: { invalid?: unknown }) => record.invalid)).toBe(true);
  expect(recoveredSummary.qualityCoverage.required.filter((item: { kind: string; status: string }) => item.kind === "artifact" && item.status === "passed")).toHaveLength(1);
  const recordPath = (recaptured.report.record as { path: string }).path;
  const recordBytes = await readFile(recordPath);
  const record = JSON.parse(recordBytes.toString("utf8"));
  record.captureContext.deviceScaleFactor = 2;
  await writeFile(recordPath, JSON.stringify(record));
  const before = await tree(history);
  const changedSettings = await command([...args, "--browser", browser!]);
  expect(changedSettings.code).toBe(1);
  expect(await tree(history)).toEqual(before);
  await writeFile(recordPath, recordBytes);
  const diagramPath = join(history, name, "v001/diagram.json");
  await writeFile(diagramPath, JSON.stringify({ ...document, title: "tampered" }));
  const tamperedSource = await tree(history);
  const rejected = await command([...args, "--browser", browser!]);
  expect(rejected.code).toBe(1);
  expect(await tree(history)).toEqual(tamperedSource);
}, 90_000);


test.skipIf(!browser || process.platform === "win32")("cancellation retains completed evidence and recovery captures only the remaining condition", async () => {
  const name = "cancel";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const artifact = (source.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: [240, 320].map((displayWidth) => ({ artifactId: artifact.artifactId, displayWidth, backdrop: "#ffffff" })) }));
  const args = ["evidence", "--from", "v001", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", browser!];
  const cancelled = await command(args, {}, "Capturing artifact evidence 2/2");
  expect(cancelled.code).toBe(1);
  expect(cancelled.report).toMatchObject({ status: "cancelled", artifactEvidence: { status: "cancelled", items: [
    expect.objectContaining({ status: "captured", operationStatus: "captured" }), expect.objectContaining({ status: "not-run", operationStatus: "cancelled" })] } });
  const retained = (cancelled.report.artifactEvidence as { items: { path: string }[] }).items[0].path;
  const retainedBytes = await readFile(retained);
  const recovered = await command(args);
  expect(recovered.code, JSON.stringify(recovered)).toBe(0);
  expect(recovered.report).toMatchObject({ artifactEvidence: { items: [expect.objectContaining({ operationStatus: "reused" }), expect.objectContaining({ operationStatus: "captured" })] } });
  expect(recovered.stderr).toContain("Capturing artifact evidence 1/1");
  expect(await readFile(retained)).toEqual(retainedBytes);
}, 90_000);


test.skipIf(!browser)("defaults cover named SVG/PNG animation exports and new dimensions capture only one additional surface", async () => {
  const name = "batch";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify({ ...document, scenes: [{ id: "change", label: "Change", beats: [
    { durationMs: 400, actions: [{ type: "updateNode", target: "a", value: { label: "Done" } }] }
  ] }] }));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--browser", "none"]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const manifest = join(workspace, "manifest.json");
  await writeFile(manifest, JSON.stringify({ schemaVersion: 1, sourceSha256: (source.report.input as { sha256: string }).sha256,
    sdk: { version: (source.report.sdk as { version: string }).version, integrity: (source.report.sdk as { integrity: string }).integrity }, frames: [{ name: "start", timeMs: 0, formats: ["svg"] }, { name: "selected", timeMs: 137, formats: ["svg", "png"] }] }));
  const exported = await command(["author", "--from", "v001", "--name", name, "--output", history, "--export-manifest", manifest, "--background", "transparent", "--browser", browser!]);
  expect(exported.code, JSON.stringify(exported)).toBe(0);
  const args = ["evidence", "--from", "v002", "--name", name, "--output", history];
  const first = await command([...args, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  const items = (first.report.artifactEvidence as { items: { artifactId: string; timeMs: number; background: string; operationStatus: string }[] }).items;
  expect(items).toHaveLength(3);
  expect(items.filter((item) => item.timeMs === 137)).toHaveLength(2);
  expect(items.every((item) => item.background === "transparent" && item.operationStatus === "captured")).toBe(true);
  const artifact = items[2];
  const settings = join(workspace, "additional.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 240, backdrop: "#111827" }] }));
  const second = await command([...args, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(second.code, JSON.stringify(second)).toBe(0);
  expect((second.report.artifactEvidence as { items: { operationStatus: string }[] }).items.filter((item) => item.operationStatus === "captured")).toHaveLength(1);
  expect(second.stderr).toContain("Capturing artifact evidence 1/1");
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v002", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.artifacts.filter((item: { kind: string }) => ["svg", "png"].includes(item.kind))).toHaveLength(3);
  expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact")).toHaveLength(4);
}, 90_000);

test("invalid settings and unsupported execution flags fail without snapshot or evidence writes", async () => {
  const name = "invalid";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  expect((await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"])).code).toBe(0);
  const before = await tree(history);
  const settings = join(workspace, "bad-settings.json");
  for (const value of ["not-json", JSON.stringify({ items: [] }), JSON.stringify({ items: [{ artifactId: "missing", displayWidth: 240, backdrop: "#ffffff" }] })]) {
    await writeFile(settings, value);
    const rejected = await command(["evidence", "--from", "v001", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", "none"]);
    expect(rejected.code).toBe(1);
    expect(await tree(history)).toEqual(before);
  }
  const scoped = await command(["evidence", "--from", "v001", "--name", name, "--output", history, "--svg"]);
  expect(scoped.code).toBe(1);
  expect(scoped.report).toMatchObject({ diagnostics: [expect.objectContaining({ code: "ERR_OPTION_SCOPE" })] });
  expect(await tree(history)).toEqual(before);
});

test.skipIf(!browser)("valid new conditions survive an invalid explicit browser and remain required at finalization", async () => {
  const name = "invalid-browser-conditions";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const args = ["evidence", "--from", "v001", "--name", name, "--output", history];
  const first = await command([...args, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  const firstId = (first.report.record as { id: string }).id;
  const review = await reviewForm(workspace, history, name, firstId, "original");
  expect((await command(["review", "--from", "v001", "--name", name, "--output", history, "--artifact-review", review, "--evidence-from", firstId])).code).toBe(0);
  const artifact = (source.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "additional.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 240, backdrop: "#111827" }] }));
  const before = await tree(history);
  const failed = await command([...args, "--artifact-preview-settings", settings, "--browser", join(root, "missing-browser")]);
  expect(failed.code).toBe(1);
  expect(failed.report).toMatchObject({ record: { id: expect.stringMatching(/^evidence-/) }, artifactEvidence: { requested: expect.any(Array) } });
  expect((failed.report.artifactEvidence as { requested: unknown[] }).requested).toHaveLength(2);
  const after = await tree(history);
  expect(Object.keys(after).filter((path) => !(path in before))).toHaveLength(1);
  for (const [path, bytes] of Object.entries(before)) expect(after[path]).toBe(bytes);
  const nonExecutable = await command([...args, "--artifact-preview-settings", settings, "--browser", input]);
  expect(nonExecutable.code).toBe(1);
  expect((nonExecutable.report.artifactEvidence as { requested: unknown[] }).requested).toHaveLength(2);
  expect((nonExecutable.report.record as { id: string }).id).toMatch(/^evidence-/);
  const final = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"]);
  expect(final.code, JSON.stringify(final)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact")).toHaveLength(2);
  expect(summary.qualityCoverage.required.filter((item: { kind: string; status: string }) => item.kind === "artifact").map((item: { status: string }) => item.status).sort()).toEqual(["incomplete", "passed"]);
  const resumed = await command([...args, "--browser", browser!]);
  expect(resumed.code, JSON.stringify(resumed)).toBe(0);
  expect((resumed.report.artifactEvidence as { items: { operationStatus: string }[] }).items.map((item) => item.operationStatus).sort()).toEqual(["captured", "reused"]);
}, 90_000);

test.skipIf(!browser)("one damaged formal image preserves valid combined-review materials and other formal surfaces", async () => {
  const name = "combined-entry-recovery";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  expect((await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--png", "--browser", browser!])).code).toBe(0);
  const base = ["--from", "v001", "--name", name, "--output", history];
  const first = await command(["evidence", ...base, "--browser", browser!]);
  expect(first.code, JSON.stringify(first)).toBe(0);
  const firstId = (first.report.record as { id: string }).id;
  const artifact = await reviewForm(workspace, history, name, firstId, "combined-artifact");
  const forms: Record<string, string> = {};
  for (const [kind, field] of [["html", "states"], ["visual", "frames"]]) {
    const path = join(workspace, `${kind}.json`);
    expect((await command(["review-template", ...base, "--kind", kind, "--template", path])).code).toBe(0);
    const form = JSON.parse(await readFile(path, "utf8"));
    form.viewed = true;
    form.reviewer = "synthetic recovery fixture; not actual viewing";
    for (const item of form[field]) item.observations = { readingOrder: "Fixture.", density: "Fixture.", occlusion: "Fixture.", narrative: "Fixture." };
    await writeFile(path, JSON.stringify(form));
    forms[kind] = path;
  }
  const accepted = await command(["review", ...base, "--artifact-review", artifact, "--evidence-from", firstId, "--html-review", forms.html, "--visual-review", forms.visual]);
  expect(accepted.code, JSON.stringify(accepted)).toBe(0);
  expect(accepted.report).toMatchObject({ completion: { quality: "passed" } });
  const images = (first.report.artifactEvidence as { items: { path: string; evidenceId: string }[] }).items;
  await writeFile(images[0].path, "damaged formal evidence PNG");
  const finalArgs = ["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"];
  expect((await command(finalArgs)).code).toBe(0);
  const summaryPath = join(root, ".diagrams", name, "report.json");
  const partial = JSON.parse(await readFile(summaryPath, "utf8"));
  expect(partial.qualityCoverage.required.find((item: { kind: string }) => item.kind === "html").status).toBe("passed");
  expect(partial.qualityCoverage.required.filter((item: { kind: string; status: string }) => item.kind === "artifact").map((item: { status: string }) => item.status).sort()).toEqual(["incomplete", "passed"]);
  const invalidSurface = partial.qualityCoverage.required.find((item: { kind: string; format?: string }) => item.kind === "artifact" && item.format === "svg");
  expect(invalidSurface).toMatchObject({ status: "incomplete", evidenceId: null, evidenceStatus: "invalid" });
  expect(invalidSurface.reason).toMatch(/recapture/iu);
  expect(invalidSurface.reason).toContain("Invalid PNG header");
  expect(invalidSurface.reason).not.toContain("Open the saved evidence PNG");
  expect(partial.visual.frames.length).toBeGreaterThan(0);
  expect(partial.visual.surfaces.map((item: { evidenceId: string }) => item.evidenceId)).toEqual([images[1].evidenceId]);
  const replacement = await command(["evidence", ...base, "--browser", browser!]);
  expect(replacement.code, JSON.stringify(replacement)).toBe(0);
  const nextId = (replacement.report.record as { id: string }).id;
  const fresh = await reviewForm(workspace, history, name, nextId, "recovered-artifact");
  const freshForm = JSON.parse(await readFile(fresh, "utf8"));
  freshForm.items = freshForm.items.filter((item: { evidenceId: string }) => item.evidenceId !== images[1].evidenceId);
  expect(freshForm.items).toHaveLength(1);
  await writeFile(fresh, JSON.stringify(freshForm));
  const recovered = await command(["review", ...base, "--artifact-review", fresh, "--evidence-from", nextId]);
  expect(recovered.code, JSON.stringify(recovered)).toBe(0);
  expect(recovered.report).toMatchObject({ completion: { quality: "passed" }, checks: { html: "reviewed", visual: "reviewed" } });
  expect((await command(finalArgs)).report).toMatchObject({ completion: { quality: "passed" } });
  freshForm.reviewer = "synthetic issue-history fixture; not actual viewing";
  freshForm.items[0].issues = [{ reason: "Preserve this observed issue after image damage.", nextStep: "Request a user decision." }];
  await writeFile(fresh, JSON.stringify(freshForm));
  expect((await command(["review", ...base, "--artifact-review", fresh, "--evidence-from", nextId])).code).toBe(0);
  const replacementImage = (replacement.report.artifactEvidence as { items: { evidenceId: string; path: string }[] }).items.find((item) => item.evidenceId === freshForm.items[0].evidenceId)!;
  await writeFile(replacementImage.path, "damaged replacement image with historical issue");
  const issueReview = await command(["review", ...base, "--html-review", forms.html]);
  expect(issueReview.report).toMatchObject({ completion: { quality: "needs-user-decision" } });
  expect((issueReview.report.qualityCoverage as { required: { id: string; status: string }[] }).required.find((item) => item.id === "review-issues")?.status).toBe("needs-user-decision");
  expect((await command(finalArgs)).report).toMatchObject({ completion: { quality: "needs-user-decision" } });
  const issueHistory = JSON.parse(await readFile(summaryPath, "utf8"));
  expect(issueHistory.diagnostics.some((item: { reason: string }) => item.reason === "Preserve this observed issue after image damage.")).toBe(true);
  expect(issueHistory.visual.surfaces.map((item: { evidenceId: string }) => item.evidenceId)).toEqual([images[1].evidenceId]);
}, 90_000);

test.skipIf(!browser)("sequential failed capture requests reuse revision evidence through an acyclic operation chain", async () => {
  const name = "acyclic-evidence-reuse";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const original = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", "none"]);
  expect(original.code, JSON.stringify(original)).toBe(0);
  const artifact = (original.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 300, backdrop: "#ffffff" }] }));
  const legacy = await command(["author", "--from", "v001", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(legacy.code, JSON.stringify(legacy)).toBe(0);
  for (const width of [240, 200]) {
    await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: width, backdrop: "#111827" }] }));
    const failed = await command(["evidence", "--from", "v002", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", input]);
    expect(failed.code).toBe(1);
    expect((failed.report.record as { id?: string })?.id).toMatch(/^evidence-/);
  }
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v002", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.evidenceRecords.records).toHaveLength(2);
  expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact").map((item: { displayWidth: number }) => item.displayWidth).sort()).toEqual([200, 240, 300]);
}, 90_000);
