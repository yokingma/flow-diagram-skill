/** Exercise the repository preview command against an independent checkout and real installed CLI. */
import { afterEach, beforeEach, expect, test } from "vitest";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

let root: string;
const document = {
  version: 1,
  title: "A < B & C",
  viewport: { width: 400, height: 240 },
  nodes: [{ id: "step", kind: "rect", x: 40, y: 40, width: 160, height: 80, label: "Start" }],
  edges: [],
  scenes: []
};

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "example gallery ")));
  await Promise.all([
    cp(resolve("scripts"), join(root, "scripts"), { recursive: true }),
    cp(resolve("skills/flow-diagram"), join(root, "skills/flow-diagram"), { recursive: true }),
    cp(resolve("examples"), join(root, "examples"), {
      recursive: true, filter: (source) => !source.split(/[\\/]/u).includes(".preview")
    })
  ]);
  await Promise.all([
    rm(join(root, "skills/flow-diagram/examples"), { recursive: true }),
    rm(join(root, "examples/development"), { recursive: true })
  ]);
  await Promise.all([
    mkdir(join(root, "skills/flow-diagram/examples")),
    mkdir(join(root, "examples/development"))
  ]);
  await Promise.all([
    writeFile(join(root, "skills/flow-diagram/examples/selected.json"), JSON.stringify(document)),
    writeFile(join(root, "skills/flow-diagram/examples/selected.md"), "# Selected note\n"),
    writeFile(join(root, "examples/development/exercise.json"), JSON.stringify({ ...document, title: "API exercise" }))
  ]);
});

afterEach(async () => { await rm(root, { recursive: true, force: true }); });

function preview() {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [join(root, "scripts/preview-examples.mjs")], { cwd: tmpdir() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test("builds a portable gallery with separate selected and development sources without changing inputs", async () => {
  const source = join(root, "skills/flow-diagram/examples/selected.json");
  const original = await readFile(source, "utf8");
  const result = await preview();
  expect(result.code, result.stderr + result.stdout).toBe(0);
  const html = await readFile(join(root, "examples/.preview/index.html"), "utf8");
  expect(html).toContain("Teaching examples");
  expect(html).toContain("Development exercises");
  expect(html).toContain("A &lt; B &amp; C");
  expect(html).toContain('src="teaching/selected/current/diagram.html"');
  expect(html).toContain('src="development/exercise/current/diagram.html"');
  expect(html).toContain("../../skills/flow-diagram/examples/selected.md");
  const player = await readFile(join(root, "examples/.preview/teaching/selected/current/diagram.html"), "utf8");
  expect(player).toContain("flowsvg-data");
  expect(await readFile(source, "utf8")).toBe(original);
  expect((await readdir(join(root, "skills/flow-diagram/examples"))).sort()).toEqual(["selected.json", "selected.md"]);
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("keeps the embedded diagram and playback controls visible without vertical player scrolling", async () => {
  const result = await preview();
  expect(result.code, result.stderr + result.stdout).toBe(0);
  const browser = await chromium.launch({ executablePath: process.env.FLOWSVG_TEST_BROWSER, headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [1440, 900, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(pathToFileURL(join(root, "examples/.preview/index.html")).href);
      const frame = page.frameLocator('iframe').first();
      await frame.locator('svg').waitFor();
      const dimensions = await frame.locator('body').evaluate((body) => ({
        contentHeight: body.ownerDocument.documentElement.scrollHeight,
        frameHeight: body.ownerDocument.defaultView?.innerHeight ?? 0
      }));
      expect(dimensions.contentHeight, `player at width ${width}`).toBeLessThanOrEqual(dimensions.frameHeight);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  } finally {
    await browser.close();
  }
}, 60_000);

test("rebuilds current bytes and removes deleted examples instead of accumulating previews", async () => {
  expect((await preview()).code).toBe(0);
  await Promise.all([
    writeFile(join(root, "skills/flow-diagram/examples/selected.json"), JSON.stringify({ ...document, title: "Changed title" })),
    rm(join(root, "examples/development/exercise.json"))
  ]);
  const result = await preview();
  expect(result.code, result.stderr + result.stdout).toBe(0);
  const html = await readFile(join(root, "examples/.preview/index.html"), "utf8");
  expect(html).toContain("Changed title");
  expect(html).not.toContain('id="development-exercise"');
  const generated = await readFile(join(root, "examples/.preview/teaching/selected/current/diagram.json"), "utf8");
  expect(JSON.parse(generated).title).toBe("Changed title");
  expect(await readdir(join(root, "examples/.preview/teaching/selected"))).toEqual(["current"]);
  expect(await readdir(join(root, "examples/.preview"))).not.toContain("development");
}, 60_000);

test("reports invalid input and leaves no stale successful index after a failed rebuild", async () => {
  expect((await preview()).code).toBe(0);
  const source = join(root, "skills/flow-diagram/examples/selected.json");
  await writeFile(source, "{");
  const result = await preview();
  expect(result.code).not.toBe(0);
  expect(result.stderr).toContain("selected.json");
  await expect(readFile(join(root, "examples/.preview/index.html"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(source, "utf8")).toBe("{");
}, 60_000);
