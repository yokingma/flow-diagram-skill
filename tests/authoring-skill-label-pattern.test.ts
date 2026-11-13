import { readCommandReport } from "./helpers/cli-report";
/** Former heuristic fixtures remain valid source inputs, with design judgment left to actual viewing. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

let root: string;
let skill: string;
const fixtureDirectory = resolve("tests/fixtures/label-pattern");
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG label inputs ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });

function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (bytes) => { stdout += bytes; });
    child.stderr.on("data", (bytes) => { stderr += bytes; });
    child.on("error", reject);
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test.each([
  "label-vertical-run.json", "label-horizontal-run.json", "label-two-character-wrap.json", "label-explicit-lines.json",
  "label-hidden-label.json", "label-reasonable-wrap.json", "label-long-path.json"
])("%s validates without a heuristic design diagnosis or altered source", async (filename) => {
  const input = join(root, filename);
  await cp(join(fixtureDirectory, filename), input);
  const bytes = await readFile(input, "utf8");
  for (const options of [[], ["--geometry"]]) {
    const result = await command(["validate", "--input", input, ...options]);
    expect(result.code, result.stdout + result.stderr).toBe(0);
    const report = (await readCommandReport(result.stdout));
    expect(report.diagnostics.some((issue: { code: string }) => issue.code === "LABEL_VERTICAL_RUN")).toBe(false);
    expect(report.diagnostics.every((issue: { severity: string }) => issue.severity === "info")).toBe(true);
    expect(report).toMatchObject({ revision: null, validation: { snapshotCreated: false } });
    expect(report.sdk.version).toBe("0.4.0");
    expect(await readFile(input, "utf8")).toBe(bytes);
  }
  expect(await readdir(root)).not.toContain(".diagrams");
}, 60_000);
