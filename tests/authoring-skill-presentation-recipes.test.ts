import { readCommandReport } from "./helpers/cli-report";
import { afterAll, beforeAll, expect, test } from "vitest";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const runFile = promisify(execFile);
const MAX_REPORT_BYTES = 4 * 1024 * 1024;
const RECIPE_TIMEOUT_MS = 90_000;
const RECIPE_CASES = [
  { name: "recipe-capability-overview", duration: 0, labels: ["资料整理", "内容编辑", "发布支持"] },
  { name: "recipe-source-services", duration: 0, labels: ["需求来源", "业务服务", "指南检索", "问题归集"] },
  { name: "recipe-parallel-flow", duration: 9000, labels: ["资料站", "服务台", "公开指南", "服务提示"] }
];

interface RecipeReport {
  checks: Record<string, string>;
  diagnostics: Array<{ severity: string }>;
  completion: { delivery: string; quality?: string };
  compilation: { totalDurationMs: number; beats: Array<{ startMs: number; endMs: number }> };
  revision: { directory: string };
}

let acceptanceRoot: string;
let installedSkill: string;

beforeAll(async () => {
  acceptanceRoot = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG presentation recipes ")));
  installedSkill = join(acceptanceRoot, "installed skill");
  await cp(resolve("skills/flow-diagram"), installedSkill, { recursive: true });
  await cp(resolve("tests/fixtures/teaching-regressions"), join(acceptanceRoot, "teaching-regressions"), { recursive: true });
});

afterAll(async () => {
  if (acceptanceRoot) await rm(acceptanceRoot, { recursive: true, force: true });
});

test.each(RECIPE_CASES)("copied $name fits its content and exports the complete teaching explanation", async ({ name, duration, labels }) => {
  const input = join(acceptanceRoot, "teaching-regressions", `${name}.json`);
  const original = await readFile(input);
  const run = async (args: string[]) => {
    const result = await runFile(process.execPath, [join(installedSkill, "scripts/flowsvg.mjs"), ...args], {
      cwd: acceptanceRoot, maxBuffer: MAX_REPORT_BYTES
    });
    return result.stdout;
  };
  const measured = (await readCommandReport(await run(["measure", "--input", input]))) as {
    measurement: { nodes: Array<{ heightChange: number; diagnostics: unknown[] }> };
  };
  for (const node of measured.measurement.nodes) {
    expect(node.heightChange).toBeLessThanOrEqual(0);
    expect(node.diagnostics).toEqual([]);
  }
  const report = (await readCommandReport(await run([
    "author", "--input", input, "--name", name, "--browser", "none", "--svg",
    "--sources", join(acceptanceRoot, "teaching-regressions", "recipe-sources.json")
  ]))) as RecipeReport;
  expect(report.checks).toMatchObject({ validation: "passed", compilation: "passed", layout: "not-run" });
  expect(report.diagnostics.filter((item) => item.severity !== "info")).toEqual([]);
  expect(report.compilation.totalDurationMs).toBe(duration);
  expect(report.completion.delivery).toBe("complete");
  expect(report.completion.quality).toBeUndefined();
  const svg = await readFile(join(report.revision.directory, "diagram.svg"), "utf8");
  for (const label of labels) expect(svg).toContain(label);
  expect(await readFile(input)).toEqual(original);
}, RECIPE_TIMEOUT_MS);
