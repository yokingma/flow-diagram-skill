import { readCommandReport } from "./helpers/cli-report";
/** Portable quality acceptance exercises two unrelated diagram shapes through the installed CLI. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

type CommandResult = { code: number | null; stdout: string; stderr: string };
type Report = {
  status: string;
  checks: { validation: string; compilation: string; visual: string };
  completion: { delivery: string };
  formalReview: { status: string };
  visual: { status: string; viewedFrames: unknown[] };
  userDecisions: unknown[];
  sources: unknown[];
  revision: { directory: string };
};

const architecture = {
  version: 1,
  title: "订单服务边界",
  viewport: { width: 720, height: 360 },
  nodes: [
    { id: "service", kind: "group", x: 20, y: 20, width: 680, height: 300, label: "订单服务" },
    { id: "client", parentId: "service", kind: "roundedRect", x: 60, y: 130, width: 150, height: 70, label: "客户端" },
    { id: "api", parentId: "service", kind: "roundedRect", x: 285, y: 130, width: 150, height: 70, label: "订单 API" },
    { id: "store", parentId: "service", kind: "cylinder", x: 510, y: 130, width: 140, height: 70, label: "订单存储" }
  ],
  edges: [
    { id: "submit", from: "client", to: "api", label: "提交订单", fromPort: "right", toPort: "left" },
    { id: "persist", from: "api", to: "store", label: "保存订单", fromPort: "right", toPort: "left" }
  ],
  scenes: []
};

const fanIn = {
  version: 1,
  title: "批处理汇聚",
  viewport: { width: 720, height: 420 },
  nodes: [
    { id: "source-a", kind: "roundedRect", x: 30, y: 40, width: 160, height: 64, label: "来源 A" },
    { id: "source-b", kind: "roundedRect", x: 30, y: 170, width: 160, height: 64, label: "来源 B" },
    { id: "worker", kind: "roundedRect", x: 280, y: 105, width: 180, height: 80, label: "共享处理器" },
    { id: "report", kind: "roundedRect", x: 540, y: 105, width: 150, height: 80, label: "汇总结果" }
  ],
  edges: [
    { id: "source-a-worker", from: "source-a", to: "worker", label: "批次 A", fromPort: "right", toPort: "left" },
    { id: "source-b-worker", from: "source-b", to: "worker", label: "批次 B", fromPort: "right", toPort: "left" },
    { id: "worker-report", from: "worker", to: "report", label: "结果", fromPort: "right", toPort: "left" }
  ],
  scenes: []
};

let root: string;
let skill: string;

beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG quality acceptance ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});

afterAll(async () => { await rm(root, { recursive: true, force: true }); });

function command(args: string[]): Promise<CommandResult> {
  return new Promise((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
      cwd: root,
      env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

async function author(name: string, document: typeof architecture, reference: string): Promise<Report> {
  const input = join(root, `${name}.json`);
  const sources = join(root, `${name}-sources.json`);
  await writeFile(input, JSON.stringify(document, null, 2) + "\n");
  await writeFile(sources, JSON.stringify([{ kind: "prompt", reference, description: "用户明确描述" }]));
  const result = await command(["author", "--input", input, "--sources", sources, "--name", name, "--browser", "none"]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  return (await readCommandReport(result.stdout)) as Report;
}

async function assertFinalDelivery(report: Report, expectedIds: string[]) {
  expect(report).toMatchObject({
    status: "delivered",
    checks: { validation: "passed", compilation: "passed", visual: "not-run" },
    completion: { delivery: "complete" },
    formalReview: { status: "not-requested" },
    visual: { status: "not-requested", viewedFrames: [] },
    userDecisions: []
  });
  expect(report.sources).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "prompt" })]));
  const document = JSON.parse(await readFile(join(report.revision.directory, "diagram.json"), "utf8")) as { edges: Array<{ id: string }> };
  expect(document.edges.map((edge: { id: string }) => edge.id)).toEqual(expectedIds);
  const finalDirectory = join(root, ".diagrams", basename(dirname(report.revision.directory)));
  for (const name of ["diagram.json", "diagram.html", "report.json", "report.md"]) {
    expect(await readFile(join(finalDirectory, name))).toEqual(await readFile(join(report.revision.directory, name)));
  }
  const markdown = await readFile(join(finalDirectory, "report.md"), "utf8");
  expect(markdown).not.toContain("quality:");
  expect(report.completion).not.toHaveProperty("quality");
  expect(markdown).toContain("Status: not-run");
}

test("architecture and fan-in cases retain distinct relationships in final delivery", async () => {
  const architectureReport = await author("architecture-case", architecture, "客户端提交订单，订单 API 保存到订单存储");
  const fanInReport = await author("fan-in-case", fanIn, "两个来源将批次送入共享处理器并生成汇总结果");
  await assertFinalDelivery(architectureReport, ["submit", "persist"]);
  await assertFinalDelivery(fanInReport, ["source-a-worker", "source-b-worker", "worker-report"]);
  expect(architectureReport.revision.directory).toContain(".diagrams/.history/architecture-case/current");
  expect(fanInReport.revision.directory).toContain(".diagrams/.history/fan-in-case/current");
}, 90_000);
