/** Consume the selected installed examples through a copied installation, without the authoring workspace. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { readCommandReport } from "./helpers/cli-report.js";

const runFile = promisify(execFile);
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const CASES = [
  { group: "capabilities", id: "basic-shapes", text: "Start" },
  { group: "capabilities", id: "emphasis-flow", text: "Data link" },
  { group: "complete", id: "project-architecture", text: "FlowSVG" },
  { group: "complete", id: "rag-workflow", text: "RAG:" },
  { group: "complete", id: "order-fulfillment", text: "订单校验" },
  { group: "complete", id: "job-lifecycle", text: "Queued" },
  { group: "complete", id: "order-event-pipeline", text: "Event queue" },
  { group: "complete", id: "web-service-deployment", text: "HTTPS" },
  { group: "complete", id: "cache-aside-sequence", text: "Client" }
];
interface AuthorReport {
  checks: { validation: string; compilation: string };
  compilation: { totalDurationMs: number; beats: Array<{ startMs: number; endMs: number }> };
  completion: { delivery: string; completed: string[] };
  revision: { directory: string };
  sdk: { version: string; integrity: string };
  theme: string;
}
let root: string;
let skill: string;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG showcase library ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

test.each(CASES)("copied $id delivers its real source and reconstructs its initial and final exports", async ({ group, id, text }) => {
  const input = join(skill, "examples", group, `${id}.json`);
  const original = await readFile(input);
  async function author(time: number): Promise<AuthorReport> {
    const { stdout } = await runFile(process.execPath, [join(skill, "scripts/flowsvg.mjs"), "author",
      "--input", input, "--name", id, "--output", join(root, "output"), "--theme", "dark",
      "--browser", "none", "--svg", "--time", String(time)], { cwd: root, maxBuffer: MAX_OUTPUT_BYTES });
    return await readCommandReport(stdout);
  }
  const first = await author(0);
  expect(first.checks).toMatchObject({ validation: "passed", compilation: "passed" });
  expect(first.completion).toMatchObject({ delivery: "complete", completed: ["json", "html", "svg"] });
  expect(first.sdk.version).toBe("0.4.2");
  expect(first.compilation.totalDurationMs).toBeGreaterThan(0);
  const initialSvg = await readFile(join(first.revision.directory, "diagram.svg"), "utf8");
  expect(initialSvg).toContain(text);
  const last = await author(first.compilation.totalDurationMs);
  expect(await readFile(join(last.revision.directory, "diagram.svg"), "utf8")).toContain(text);
  const back = await author(0);
  expect(await readFile(join(back.revision.directory, "diagram.svg"), "utf8")).toBe(initialSvg);
  expect(await readFile(input)).toEqual(original);
  expect(await readFile(join(back.revision.directory, "diagram.json"))).toEqual(original);
}, 90_000);

test("records order fulfillment provenance against its installed source bytes", async () => {
  const input = await readFile(join(skill, "examples/complete/order-fulfillment.json"));
  const digest = createHash("sha256").update(input).digest("hex");
  const records = JSON.parse(await readFile(join(skill, "resources/teaching-sources.json"), "utf8")) as Array<{
    kind: string; reference: string; scope: string; description: string;
  }>;
  const source = records.find((record) => record.scope === "examples/complete/order-fulfillment.json");
  expect(source).toMatchObject({ kind: "prompt" });
  expect(source?.reference).toContain("hy4 flash");
  expect(source?.reference).toContain("Flow Diagram Skill");
  expect(source?.description).toContain(`JSON SHA-256 ${digest}`);
});
