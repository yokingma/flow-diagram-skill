/** Exercise focused capability documents through a copied installation and its actual offline player. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium, type Locator } from "playwright-core";
import { readCommandReport } from "./helpers/cli-report.js";

const runFile = promisify(execFile);
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
let root: string;
let skill: string;
interface AuthorReport {
  checks: { validation: string; compilation: string };
  completion: { delivery: string };
  revision: { directory: string };
  compilation: { totalDurationMs: number; beats: Array<{ sceneId: string; startMs: number; endMs: number }> };
}
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG capability examples ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
});
afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

async function author(id: string, time = 0): Promise<AuthorReport> {
  const { stdout } = await runFile(process.execPath, [join(skill, "scripts/flowsvg.mjs"), "author",
    "--input", join(skill, "examples", `capabilities-${id}.json`), "--name", id,
    "--output", join(root, "output"), "--theme", "dark", "--svg", "--time", String(time), "--browser", "none"
  ], { cwd: root, maxBuffer: MAX_OUTPUT_BYTES });
  return await readCommandReport(stdout);
}

function readSvgState(svg: Locator) {
  return svg.evaluate((element) => [element, ...element.querySelectorAll("*")].map((entry) => ({
    tag: entry.tagName,
    attributes: [...entry.attributes].map((attribute) => [attribute.name, attribute.value]).sort(),
    text: [...entry.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent)
  })));
}

async function seekScene(slider: Locator, report: AuthorReport, sceneId: string) {
  const beat = report.compilation.beats.find((entry) => entry.sceneId === sceneId);
  if (!beat) throw new Error(`Missing compiled scene: ${sceneId}`);
  await slider.evaluate((element, value) => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected the playback range input");
    element.value = String(value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, beat.endMs - 1);
}

async function expectHorizontalLink(link: Locator) {
  const verticalSpread = await link.evaluate((element) => {
    if (!(element instanceof SVGPathElement)) throw new Error("Expected the rendered edge path");
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0) {
      throw new Error("Expected a displayed edge stroke");
    }
    const sampleIntervals = 4;
    const length = element.getTotalLength();
    if (length === 0 || style.stroke === "none" || Number.parseFloat(style.strokeWidth) <= 0) {
      throw new Error("Expected a nonempty edge stroke");
    }
    const heights = Array.from({ length: sampleIntervals + 1 }, (_, index) =>
      element.getPointAtLength(length * index / sampleIntervals).y);
    return Math.max(...heights) - Math.min(...heights);
  });
  const renderingTolerance = 0.001;
  expect(verticalSpread, "The rendered connection must remain horizontal").toBeLessThan(renderingTolerance);
}

test("content-layout delivers rich text and local graph entities as a static document", async () => {
  const input = join(skill, "examples/capabilities-content-layout.json");
  const report = await author("content-layout");
  expect(report.checks).toMatchObject({ validation: "passed", compilation: "passed" });
  expect(report.completion.delivery).toBe("complete");
  expect(report.compilation.totalDurationMs).toBe(0);
  const svg = await readFile(join(report.revision.directory, "diagram.svg"), "utf8");
  for (const text of ["Rich", "content", "Measured text", "Ada", "Team", "Topic", "Related views"]) {
    expect(svg).toContain(text);
  }
  const graphLinks = [...svg.matchAll(/<line\b[^>]*>/g)].map(([line]) => {
    const coordinates = ["x1", "y1", "x2", "y2"].map((name) => {
      const value = line.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
      return value === undefined ? NaN : Number(value);
    });
    expect(coordinates.every(Number.isFinite)).toBe(true);
    const [x1, y1, x2, y2] = coordinates;
    return { horizontal: y1 === y2, vertical: x1 === x2 };
  });
  expect(graphLinks).toHaveLength(2);
  for (const link of graphLinks) {
    expect(link.horizontal || link.vertical, "Local graph links must be horizontal or vertical").toBe(true);
  }
  expect(await readFile(join(report.revision.directory, "diagram.json"))).toEqual(await readFile(input));
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("content-layout centers its badge text and connects the cards horizontally", async () => {
  const report = await author("content-layout");
  const browser = await chromium.launch({ executablePath: process.env.FLOWSVG_TEST_BROWSER, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(report.revision.directory, "diagram.html")).href);
    await page.locator("svg").waitFor();
    const offset = await page.locator("svg").evaluate((svg) => {
      const box = svg.querySelector('rect[fill="#134e4a"]');
      const text = [...svg.querySelectorAll("text")].find((entry) => /^ready$/i.test(entry.textContent ?? ""));
      if (!(box instanceof SVGRectElement) || !text) throw new Error("Expected the ready badge and its text");
      const glyph = text.querySelector("tspan") ?? text;
      const style = getComputedStyle(glyph);
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("Expected browser text measurement");
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = context.measureText(glyph.textContent ?? "");
      const baseline = glyph.getStartPositionOfChar(0).y;
      const inkCenter = baseline - (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      return Math.abs(inkCenter - (box.y.baseVal.value + box.height.baseVal.value / 2));
    });
    const opticalTolerance = 1;
    expect(offset, "The badge's visible text must be vertically centered").toBeLessThanOrEqual(opticalTolerance);
    await expectHorizontalLink(page.locator('[data-id="related-views"]'));
  } finally { await browser.close(); }
}, 60_000);

test.skipIf(!process.env.FLOWSVG_TEST_BROWSER)("visibility-camera hides connected geometry, restores the full view and reconstructs earlier states", async () => {
  const report = await author("visibility-camera");
  const browser = await chromium.launch({ executablePath: process.env.FLOWSVG_TEST_BROWSER, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(pathToFileURL(join(report.revision.directory, "diagram.html")).href);
    const svg = page.locator("svg");
    await svg.waitFor();
    const initial = await readSvgState(svg);
    const initialViewBox = await svg.getAttribute("viewBox");
    const slider = page.getByRole("slider");
    const detail = page.locator('[data-id="detail"]');
    const link = page.locator('[data-id="detail-link"]');
    await expectHorizontalLink(link);
    await seekScene(slider, report, "hidden");
    expect(await detail.isVisible()).toBe(false);
    expect(await link.count()).toBe(0);
    await seekScene(slider, report, "shown");
    expect(await detail.isVisible()).toBe(true);
    await expectHorizontalLink(link);
    await seekScene(slider, report, "focused");
    expect(await svg.getAttribute("viewBox")).not.toBe(initialViewBox);
    await expectHorizontalLink(link);
    await seekScene(slider, report, "updated");
    expect(await svg.getAttribute("viewBox")).toBe(initialViewBox);
    expect(await svg.textContent()).toContain("Updated link");
    expect(await link.getAttribute("stroke")).toBe("#5eead4");
    expect(await link.getAttribute("stroke-width")).toBe("4");
    await expectHorizontalLink(link);
    await seekScene(slider, report, "restored");
    expect(await readSvgState(svg)).toEqual(initial);
    await expectHorizontalLink(link);
    await seekScene(slider, report, "hidden");
    expect(await detail.isVisible()).toBe(false);
    expect(await link.count()).toBe(0);
    await seekScene(slider, report, "overview");
    expect(await readSvgState(svg)).toEqual(initial);
    expect(await readFile(join(report.revision.directory, "diagram.json")))
      .toEqual(await readFile(join(skill, "examples/capabilities-visibility-camera.json")));
  } finally { await browser.close(); }
}, 60_000);
