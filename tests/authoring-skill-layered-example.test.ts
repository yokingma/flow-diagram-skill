import { expect, test } from "vitest";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";

const readJson = async (path: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(resolve(path), "utf8")) as Record<string, unknown>;

test("bundled layered architecture example declares the teaching semantics at the public files", async () => {
  const [example, sources, patterns, english, chinese, maintenance] = await Promise.all([
    readJson("skills/flow-diagram/examples/layered-architecture.json"),
    readJson("skills/flow-diagram/examples/semantic-pattern-sources.json"),
    readFile(resolve("skills/flow-diagram/references/semantic-patterns.md"), "utf8"),
    readFile(resolve("docs/guides/flow-diagram-guide.md"), "utf8"),
    readFile(resolve("docs/guides/flow-diagram-guide.zh-CN.md"), "utf8"),
    readFile(resolve("docs/development/flow-diagram-maintenance.md"), "utf8")
  ]);
  const nodes = example.nodes as Array<Record<string, unknown>>;
  const edges = example.edges as Array<Record<string, unknown>>;
  const groups = nodes.filter((node) => node.kind === "group");
  expect(example.title).toContain("教学");
  expect(groups.map((node) => node.id)).toEqual(expect.arrayContaining(["layer-ingress", "layer-domain", "layer-data", "governance"]));
  expect(nodes.filter((node) => node.parentId === "layer-ingress").length).toBeGreaterThanOrEqual(2);
  expect(nodes.filter((node) => node.parentId === "layer-domain").length).toBeGreaterThanOrEqual(2);
  expect(nodes.filter((node) => node.parentId === "layer-data").length).toBeGreaterThanOrEqual(2);
  expect(nodes.filter((node) => node.parentId === "governance").length).toBeGreaterThanOrEqual(2);
  expect(edges.filter((edge) => edge.label).length).toBeGreaterThanOrEqual(2);
  expect(groups.find((node) => node.id === "governance")?.style).toMatchObject({ dashed: true });
  const sourceRecords = sources as unknown as Array<Record<string, unknown>>;
  const source = sourceRecords.find((record) => record.scope === "examples/layered-architecture.json");
  expect(source).toMatchObject({ kind: "prompt" });
  expect(source?.description).toEqual(expect.stringContaining("层序不等于调用时间顺序"));
  expect(patterns).toContain("Layered architecture with teaching boundaries");
  expect(patterns).toContain("does not establish call order");
  expect(patterns).toContain("does not imply a deployment or trust boundary");
  expect(english).toContain("layered architecture");
  expect(chinese).toContain("分层架构");
  expect(maintenance).toContain("layered architecture");
});

const browser = process.env.FLOWSVG_TEST_BROWSER;

test("copied skill measures the layered draft, preserves IDs and finalizes the browser-free delivery", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG layered acceptance ")));
  try {
    const skill = join(root, "installed skill");
    await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
    const workspace = join(root, ".diagrams", ".work", "layered-architecture", "task-01");
    await mkdir(workspace, { recursive: true });
    const source = join(root, "layered-source.json");
    const sourceBytes = await readFile(resolve("skills/flow-diagram/examples/layered-architecture.json"));
    await writeFile(source, sourceBytes);
    const run = (args: string[]) => new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
      const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
        cwd: root,
        env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (code) => done({ code, stdout, stderr }));
    });
    const measuredPath = join(workspace, "layered-measured.json");
    const draftPath = join(workspace, "layered-draft.json");
    const draft = JSON.parse(sourceBytes.toString("utf8")) as { nodes: Array<{ id: string; height: number }> };
    for (const node of draft.nodes) {
      if (["ingress-gateway", "request-router"].includes(node.id)) node.height = 90;
      if (["domain-api", "domain-worker"].includes(node.id)) node.height = 110;
      if (node.id === "policy") node.height = 140;
    }
    await writeFile(draftPath, JSON.stringify(draft, null, 2) + "\n");
    const measuredResult = await run(["measure", "--input", draftPath, "--output", measuredPath]);
    expect(measuredResult.code, measuredResult.stdout + measuredResult.stderr).toBe(0);
    const measured = JSON.parse(measuredResult.stdout) as { measurement: { nodes: Array<{ nodeId: string; heightChange: number }> } };
    expect(measured.measurement.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: "ingress-gateway", heightChange: 45 }),
      expect.objectContaining({ nodeId: "domain-api", heightChange: 55.875 })
    ]));
    expect(await readFile(source)).toEqual(sourceBytes);
    const measuredDraft = JSON.parse(await readFile(measuredPath, "utf8")) as { nodes: Array<{ id: string; height: number }> };
    expect(measuredDraft.nodes.find((node) => node.id === "domain-api")?.height).toBe(165.875);
    const history = join(workspace, "history");
    const authoredResult = await run(["author", "--input", measuredPath, "--output", history, "--name", "layered-architecture", "--svg", "--browser", "none"]);
    expect(authoredResult.code, authoredResult.stdout + authoredResult.stderr).toBe(0);
    const authored = JSON.parse(authoredResult.stdout) as {
      revision: { id: string; directory: string };
      checks: Record<string, string>;
      completion: { delivery: string; completed: string[] };
      qualityCoverage: { status: string; required: Array<{ id: string; status: string }> };
      diagnostics: Array<{ stage?: string }>;
    };
    expect(authored.checks).toMatchObject({ validation: "passed", compilation: "passed", layout: "passed" });
    expect(authored.completion).toMatchObject({ delivery: "complete", completed: ["json", "html", "svg"] });
    expect(authored.qualityCoverage.required).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "validation", status: "passed" }),
      expect.objectContaining({ id: "layout", status: "passed" })
    ]));
    expect(authored.diagnostics.filter((item) => item.stage === "layout")).toHaveLength(0);
    const finalizedResult = await run(["finalize", "--workspace", workspace, "--name", "layered-architecture", "--from", authored.revision.id]);
    expect(finalizedResult.code, finalizedResult.stdout + finalizedResult.stderr).toBe(0);
    expect(await readdir(join(root, ".diagrams", "layered-architecture"))).toEqual(expect.arrayContaining(["diagram.json", "diagram.html", "diagram.svg", "report.json", "report.md"]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 90_000);

test.skipIf(!browser)("copied layered example can complete PNG delivery when a prepared browser is supplied", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG layered PNG ")));
  try {
    const skill = join(root, "installed skill");
    await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
    const source = join(root, "layered.json");
    await cp(resolve("skills/flow-diagram/examples/layered-architecture.json"), source);
    const run = (args: string[]) => new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
      const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], {
        cwd: root,
        env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") }
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (code) => done({ code, stdout, stderr }));
    });
    const result = await run(["author", "--input", source, "--name", "layered-png", "--svg", "--png", "--browser", browser!]);
    expect(result.code, result.stdout + result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as { completion: { delivery: string; completed: string[] }; qualityCoverage: { required: Array<{ format?: string; status: string }> } };
    expect(report.completion).toMatchObject({ delivery: "complete", completed: expect.arrayContaining(["png"]) });
    expect(report.qualityCoverage.required).toEqual(expect.arrayContaining([expect.objectContaining({ format: "png", status: "incomplete" })]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120_000);
