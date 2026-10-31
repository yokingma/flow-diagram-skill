/** Formal image observations use the installed CLI and immutable task files; attestations are synthetic fixtures. */
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
  root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-independent-artifact-")));
  skill = join(root, "installed");
  await cp(resolve("skills/flow-svg-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[], environment: Record<string, string> = {}) {
  return new Promise<{ code: number | null; report: Record<string, unknown>; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), DEBUG: "pw:browser", ...environment }
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
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
function complete(review: Record<string, unknown>, field: string) {
  return { ...review, reviewer: "synthetic contract fixture; not actual viewing or approval", viewed: true,
    [field]: (review[field] as Record<string, unknown>[]).map((entry) => ({ ...entry,
      observations: { readingOrder: "Fixture.", density: "Fixture.", occlusion: "Fixture.", narrative: "Fixture." }, issues: [] })) };
}

test.skipIf(!browser)("formal review appends one record without making a design copy or entering browser stages", async () => {
  const name = "formal";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--png", "--background", "transparent", "--browser", browser!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const artifacts = (source.report.artifacts as { kind: string; artifactId: string }[]).filter((item) => ["svg", "png"].includes(item.kind));
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: artifacts.flatMap((artifact) => [
    { artifactId: artifact.artifactId, displayWidth: 300, backdrop: "#ffffff" },
    { artifactId: artifact.artifactId, displayWidth: 600, backdrop: "#111827" }
  ]) }));
  const evidence = await command(["author", "--from", "v001", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(evidence.code, JSON.stringify(evidence)).toBe(0);
  const path = join(workspace, "artifact.json");
  const generated = await command(["review-template", "--from", "v002", "--name", name, "--output", history, "--kind", "artifact", "--template", path]);
  expect(generated.code, JSON.stringify(generated)).toBe(0);
  await writeFile(path, JSON.stringify(complete(JSON.parse(await readFile(path, "utf8")), "items")));
  const before = await tree(history);
  const args = ["review", "--from", "v002", "--name", name, "--output", history, "--artifact-review", path];
  const result = await command(args, { FLOWSVG_CACHE_DIR: input });
  expect(result.code, JSON.stringify(result)).toBe(0);
  expect(result.report).toMatchObject({ revision: null, sourceRevision: "v002", status: "review-recorded", checks: { artifactVisual: "reviewed" } });
  expect(result.stderr).not.toMatch(/<launched> pid=|Capturing|Preparing the isolated/);
  const after = await tree(history);
  for (const [path, bytes] of Object.entries(before)) expect(after[path]).toBe(bytes);
  expect(Object.keys(after).filter((path) => !(path in before))).toHaveLength(1);
  const repeat = await command(args, { FLOWSVG_CACHE_DIR: input });
  expect(repeat.code, JSON.stringify(repeat)).toBe(0);
  expect(repeat.report).toMatchObject({ record: { reused: true, id: (result.report.record as { id: string }).id } });
  expect(await tree(history)).toEqual(after);
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v002", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.visual.surfaces).toHaveLength(4);
  expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact")).toHaveLength(4);
  expect(summary.qualityCoverage.required.filter((item: { kind: string; status: string }) => item.kind === "artifact").every((item: { status: string }) => item.status === "passed")).toBe(true);
  expect(await readFile(join(root, ".diagrams", name, "diagram.svg"))).toEqual(await readFile(join(history, name, "v001/diagram.svg")));
  expect(await readFile(join(root, ".diagrams", name, "diagram.png"))).toEqual(await readFile(join(history, name, "v001/diagram.png")));
}, 90_000);

test.skipIf(!browser)("explicit evidence source can differ from the subject and combine all review kinds without widening partial coverage", async () => {
  const name = "separate";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--svg", "--browser", browser!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const artifact = (source.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: [300, 600].map((width) => ({ artifactId: artifact.artifactId, displayWidth: width, backdrop: "#ffffff" })) }));
  const captured = await command(["author", "--from", "v001", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(captured.code, JSON.stringify(captured)).toBe(0);
  const paths: Record<string, string> = {};
  for (const kind of ["artifact"]) {
    paths[kind] = join(workspace, `${kind}.json`);
    const result = await command(["review-template", "--from", "v001", "--evidence-from", "v002", "--name", name, "--output", history, "--kind", kind, "--template", paths[kind]]);
    if (kind !== "artifact") continue;
    expect(result.code, JSON.stringify(result)).toBe(0);
  }
  for (const kind of ["html", "visual"]) {
    paths[kind] = join(workspace, `${kind}.json`);
    const generated = await command(["review-template", "--from", "v001", "--name", name, "--output", history, "--kind", kind, "--template", paths[kind]]);
    expect(generated.code, JSON.stringify(generated)).toBe(0);
  }
  const original = JSON.parse(await readFile(paths.artifact, "utf8"));
  const partial = complete({ ...original, items: [original.items[0]] }, "items");
  await writeFile(paths.artifact, JSON.stringify(partial));
  for (const kind of ["html", "visual"]) await writeFile(paths[kind], JSON.stringify(complete(JSON.parse(await readFile(paths[kind], "utf8")), kind === "html" ? "states" : "frames")));
  const args = ["review", "--from", "v001", "--evidence-from", "v002", "--name", name, "--output", history, "--artifact-review", paths.artifact,
    "--html-review", paths.html, "--visual-review", paths.visual];
  const result = await command(args, { FLOWSVG_CACHE_DIR: input });
  expect(result.code, JSON.stringify(result)).toBe(0);
  expect(result.report).toMatchObject({ sourceRevision: "v001", completion: { quality: "incomplete" } });
  const required = (result.report.qualityCoverage as { required: { kind: string; status: string }[] }).required.filter((item) => item.kind === "artifact");
  expect(required).toHaveLength(2);
  expect(required.map((item) => item.status).sort()).toEqual(["incomplete", "passed"]);
  const saved = JSON.parse(await readFile((result.report.record as { path: string }).path, "utf8"));
  expect(saved.materials.artifact.source).toMatchObject({ kind: "revision", id: "v002", sourceRevision: "v002", reportSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  expect(saved.subject.sourceRevision).toBe("v001");
}, 90_000);

test.skipIf(!browser)("formal source tampering and duplicate evidence fail without adding or changing records", async () => {
  const name = "separate";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const original = join(history, name, "v001");
  const evidenceDirectory = join(history, name, "v002");
  const source = JSON.parse(await readFile(join(original, "report.json"), "utf8"));
  const evidence = JSON.parse(await readFile(join(evidenceDirectory, "report.json"), "utf8"));
  const artifact = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const path = join(workspace, "artifact.json");
  const review = JSON.parse(await readFile(path, "utf8"));
  const args = ["review", "--from", "v001", "--evidence-from", "v002", "--name", name, "--output", history, "--artifact-review", path];
  for (const target of [join(original, "diagram.json"), artifact.path, join(evidenceDirectory, "artifact-preview-settings.json"), evidence.artifactEvidence.items[0].path]) {
    const bytes = await readFile(target);
    await writeFile(target, "tampered");
    const before = await tree(history);
    const rejected = await command(args);
    expect(rejected.code, target).toBe(1);
    expect(await tree(history)).toEqual(before);
    const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v001", "--keep-work"]);
    expect(finalized.code, target).toBe(target === evidence.artifactEvidence.items[0].path ? 0 : 1);
    if (target === evidence.artifactEvidence.items[0].path) {
      expect(finalized.report).toMatchObject({ completion: { quality: "incomplete" } });
      const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
      expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact").map((item: { displayWidth: number }) => item.displayWidth).sort()).toEqual([300, 600]);
      const invalidSurface = summary.qualityCoverage.required.find((item: { kind: string; displayWidth?: number }) => item.kind === "artifact" && item.displayWidth === 300);
      expect(invalidSurface).toMatchObject({ evidenceId: null, evidenceStatus: "invalid" });
      expect(invalidSurface.reason).toMatch(/recapture/iu);
    }
    await writeFile(target, bytes);
  }
  for (const mutate of [(record: typeof source) => { record.theme = "dark"; },
    (record: typeof source) => { record.sdk.integrity = "changed"; },
    (record: typeof source) => { record.artifactEvidence.items[0].camera.x += 1; },
    (record: typeof source) => { record.artifactEvidence.items[0].displayWidth += 1; },
    (record: typeof source) => { record.artifactEvidence.items[0].backdrop = "#ff0000"; }]) {
    const target = join(evidenceDirectory, "report.json");
    const bytes = await readFile(target);
    const modified = JSON.parse(bytes.toString());
    mutate(modified);
    await writeFile(target, JSON.stringify(modified));
    const before = await tree(history);
    expect((await command(args)).code).toBe(1);
    expect(await tree(history)).toEqual(before);
    await writeFile(target, bytes);
  }
  await writeFile(path, JSON.stringify({ ...review, items: [review.items[0], review.items[0]] }));
  const before = await tree(history);
  expect((await command(args)).code).toBe(1);
  expect(await tree(history)).toEqual(before);
  await writeFile(path, JSON.stringify(review));
  expect((await command([...args.slice(0, 4), "v999", ...args.slice(5)])).code).toBe(1);
}, 90_000);

test.skipIf(!browser)("later clean formal observations preserve issues and portable source identities after cleanup", async () => {
  const name = "formal";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const path = join(workspace, "artifact.json");
  const clean = JSON.parse(await readFile(path, "utf8"));
  const issue = { ...clean, items: [{ ...clean.items[0], issues: [{ reason: "Synthetic density issue.", nextStep: "Request a real user decision." }] }] };
  await writeFile(path, JSON.stringify(issue));
  const args = ["review", "--from", "v002", "--name", name, "--output", history, "--artifact-review", path];
  expect((await command(args)).report).toMatchObject({ completion: { quality: "needs-user-decision" } });
  await writeFile(path, JSON.stringify({ ...clean, reviewer: "another synthetic fixture" }));
  const later = await command(args);
  expect(later.code, JSON.stringify(later)).toBe(0);
  expect(later.report).toMatchObject({ completion: { quality: "needs-user-decision" } });
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v002"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.completion.quality).toBe("needs-user-decision");
  expect(summary.visual.surfaces[0]).toMatchObject({ artifactId: expect.any(String), evidenceId: expect.any(String),
    artifactSourceRevision: "v001", evidenceRevision: "v002", evidenceSource: { kind: "revision", id: "v002" },
    sourceSha256: expect.any(String), sdk: { version: "0.2.2", integrity: expect.any(String) }, timeMs: 0, theme: "light", reducedMotion: false,
    background: "transparent", camera: expect.any(Object), reviewer: expect.any(String), reviewRecord: expect.any(String), attestations: expect.any(Array) });
  expect(summary.visual.surfaces.some((item: { issues: { reason: string }[] }) => item.issues.some((issue) => issue.reason === "Synthetic density issue."))).toBe(true);
  await expect(readFile(join(history, name, "v002/report.json"))).rejects.toMatchObject({ code: "ENOENT" });
}, 90_000);

test.skipIf(!browser)("finalization revalidates revision-recorded formal attestations instead of trusting copied status", async () => {
  const name = "separate";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const path = join(workspace, "artifact.json");
  const authored = await command(["author", "--from", "v002", "--name", name, "--output", history, "--artifact-review", path, "--browser", "none"]);
  expect(authored.code, JSON.stringify(authored)).toBe(0);
  const source = JSON.parse(await readFile(join(history, name, "v002/report.json"), "utf8"));
  await rm(join(history, name, "records"), { recursive: true });
  const screenshot = source.artifactEvidence.items[0].path;
  const bytes = await readFile(screenshot);
  await writeFile(screenshot, "modified after author review");
  const before = await tree(history);
  const result = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v003", "--keep-work"]);
  expect(result.code, JSON.stringify(result)).toBe(0);
  expect(result.report).toMatchObject({ completion: { quality: "incomplete" } });
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.visual.surfaces).toHaveLength(0);
  expect(summary.reviewRecords.invalidSaved).not.toHaveLength(0);
  expect(await tree(history)).toEqual(before);
  await writeFile(screenshot, bytes);
}, 90_000);

test.skipIf(!browser)("named animation exports keep every format and time after formal review and finalization", async () => {
  const name = "batch-formal";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify({ ...document, scenes: [{ id: "s", label: "Change", beats: [{ durationMs: 500, transitionMs: 200,
    actions: [{ type: "updateNode", target: "a", value: { label: "Done" } }] }] }] }));
  const checked = await command(["validate", "--input", input]);
  expect(checked.code, JSON.stringify(checked)).toBe(0);
  const { input: inputIdentity, sdk } = checked.report as { input: { sha256: string }; sdk: { version: string; integrity: string } };
  const manifest = join(root, `${name}-manifest.json`);
  await writeFile(manifest, JSON.stringify({ schemaVersion: 1, sourceSha256: inputIdentity.sha256, sdk: { version: sdk.version, integrity: sdk.integrity },
    frames: [{ name: "start", timeMs: 0, formats: ["svg", "png"] }, { name: "selected", timeMs: 137, formats: ["svg", "png"] }] }));
  const source = await command(["author", "--input", input, "--name", name, "--output", history, "--export-manifest", manifest, "--browser", browser!]);
  expect(source.code, JSON.stringify(source)).toBe(0);
  const artifacts = (source.report.artifacts as { kind: string; artifactId: string }[]).filter((item) => ["svg", "png"].includes(item.kind));
  expect(artifacts).toHaveLength(4);
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: artifacts.map((item) => ({ artifactId: item.artifactId, displayWidth: 300, backdrop: "#ffffff" })) }));
  const evidence = await command(["author", "--from", "v001", "--name", name, "--output", history, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(evidence.code, JSON.stringify(evidence)).toBe(0);
  const path = join(workspace, "artifact.json");
  const generated = await command(["review-template", "--from", "v002", "--name", name, "--output", history, "--kind", "artifact", "--template", path]);
  expect(generated.code, JSON.stringify(generated)).toBe(0);
  await writeFile(path, JSON.stringify(complete(JSON.parse(await readFile(path, "utf8")), "items")));
  const before = await tree(history);
  const recorded = await command(["review", "--from", "v002", "--name", name, "--output", history, "--artifact-review", path]);
  expect(recorded.code, JSON.stringify(recorded)).toBe(0);
  const after = await tree(history);
  expect(Object.keys(after).filter((path) => !(path in before))).toHaveLength(1);
  for (const [path, bytes] of Object.entries(before)) expect(after[path]).toBe(bytes);
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v002"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  const destination = join(root, ".diagrams", name);
  expect((await readdir(join(destination, "exports"))).sort()).toEqual(["selected.png", "selected.svg", "start.png", "start.svg"]);
  const summary = JSON.parse(await readFile(join(destination, "report.json"), "utf8"));
  expect(summary.visual.surfaces.map((item: { timeMs: number }) => item.timeMs).sort((a: number, b: number) => a - b)).toEqual([0, 0, 137, 137]);
  expect(summary.qualityCoverage.required.filter((item: { kind: string }) => item.kind === "artifact")).toHaveLength(4);
}, 90_000);

test.skipIf(!browser)("independent review and finalization both retain invalid saved author observations", async () => {
  const name = "saved-invalid-review";
  const workspace = join(root, ".diagrams/.work", name, "task");
  const history = join(workspace, "history");
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document));
  const base = ["--name", name, "--output", history];
  const original = await command(["author", "--input", input, ...base, "--svg", "--browser", browser!]);
  expect(original.code, JSON.stringify(original)).toBe(0);
  const artifact = (original.report.artifacts as { kind: string; artifactId: string }[]).find((item) => item.kind === "svg")!;
  const settings = join(workspace, "settings.json");
  await writeFile(settings, JSON.stringify({ items: [{ artifactId: artifact.artifactId, displayWidth: 300, backdrop: "#ffffff" }] }));
  const evidence = await command(["author", "--from", "v001", ...base, "--artifact-preview-settings", settings, "--browser", browser!]);
  expect(evidence.code, JSON.stringify(evidence)).toBe(0);
  const artifactForm = join(workspace, "artifact.json");
  expect((await command(["review-template", "--from", "v002", ...base, "--kind", "artifact", "--template", artifactForm])).code).toBe(0);
  await writeFile(artifactForm, JSON.stringify(complete(JSON.parse(await readFile(artifactForm, "utf8")), "items")));
  const saved = await command(["author", "--from", "v002", ...base, "--artifact-review", artifactForm, "--browser", browser!]);
  expect(saved.code, JSON.stringify(saved)).toBe(0);
  await writeFile((evidence.report.artifactEvidence as { items: { path: string }[] }).items[0].path, "damaged saved author observation image");
  const htmlForm = join(workspace, "html.json");
  expect((await command(["review-template", "--from", "v003", ...base, "--kind", "html", "--template", htmlForm])).code).toBe(0);
  await writeFile(htmlForm, JSON.stringify(complete(JSON.parse(await readFile(htmlForm, "utf8")), "states")));
  const reviewed = await command(["review", "--from", "v003", ...base, "--html-review", htmlForm], { FLOWSVG_CACHE_DIR: input });
  expect(reviewed.code, JSON.stringify(reviewed)).toBe(0);
  expect(reviewed.report).toMatchObject({ completion: { quality: "incomplete" } });
  expect((reviewed.report.reviewRecords as { invalidSaved: unknown[] }).invalidSaved).not.toHaveLength(0);
  const finalized = await command(["finalize", "--workspace", workspace, "--name", name, "--from", "v003", "--keep-work"]);
  expect(finalized.code, JSON.stringify(finalized)).toBe(0);
  expect(finalized.report).toMatchObject({ completion: { quality: "incomplete" } });
  const summary = JSON.parse(await readFile(join(root, ".diagrams", name, "report.json"), "utf8"));
  expect(summary.reviewRecords.invalidSaved).toEqual((reviewed.report.reviewRecords as { invalidSaved: unknown[] }).invalidSaved.map((item) => JSON.parse(JSON.stringify(item).replaceAll(workspace, "[temporary task workspace]"))));
  expect(summary.visual.surfaces).toHaveLength(0);
}, 90_000);
