/** Installed consumer regression: resized artifact evidence must preserve the actual PNG's visible pixels. */
import { afterAll, beforeAll, expect, test } from "vitest";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright-core";

let root: string;
let skill: string;
const executablePath = process.env.FLOWSVG_TEST_BROWSER;
beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "FlowSVG pixels 独立 ")));
  skill = join(root, "installed skill");
  await cp(resolve("skills/flow-svg-diagram"), skill, { recursive: true });
  await cp(resolve("tests/fixtures/artifact-evidence"), join(root, "fixtures"), { recursive: true });
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
function command(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(skill, "scripts/flowsvg.mjs"), ...args], { cwd: root,
      env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache") } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });
}

test.skipIf(!executablePath)("changing SVG/PNG dimensions and backgrounds preserves original PNG content without compositor bands", async () => {
  const input = join(skill, "examples/staged-data-processing.json");
  const sourceResult = await command(["author", "--input", input, "--name", "resized", "--svg", "--png", "--png-width", "960", "--background", "transparent", "--browser", executablePath!]);
  expect(sourceResult.code, sourceResult.stdout + sourceResult.stderr).toBe(0);
  const source = JSON.parse(sourceResult.stdout);
  const svg = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const png = source.artifacts.find((item: { kind: string }) => item.kind === "png");
  const settings = join(root, "surface switches.json");
  await writeFile(settings, JSON.stringify({ items: [
    { artifactId: svg.artifactId, displayWidth: 720, backdrop: "#ffffff" },
    { artifactId: png.artifactId, displayWidth: 720, backdrop: "#ffffff" },
    { artifactId: png.artifactId, displayWidth: 1280, backdrop: "#ffffff" },
    { artifactId: png.artifactId, displayWidth: 720, backdrop: "#111827" }
  ] }));
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    const original = (await readFile(png.path)).toString("base64");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const captureResult = await command(["author", "--from", source.revision.id, "--name", "resized", "--artifact-preview-settings", settings, "--browser", executablePath!]);
      expect(captureResult.code, captureResult.stdout + captureResult.stderr).toBe(0);
      const captured = JSON.parse(captureResult.stdout);
      for (const item of captured.artifactEvidence.items.filter((item: { artifactId: string }) => item.artifactId === png.artifactId)) {
        const screenshot = (await readFile(item.path)).toString("base64");
        const mean = await comparePng(page, original, screenshot, item);
        expect(mean, `attempt ${attempt}; ${item.displayWidth}px ${item.backdrop}; ${item.path}`).toBeLessThan(0.05);
      }
    }
  } finally { await browser.close(); }
}, 60_000);


/** Decode files at natural size, then calculate bilinear sampling without browser image scaling. */
async function comparePng(page: Page, original: string, screenshot: string, item: { displayWidth: number; displayHeight: number; backdrop: string }) {
  return page.evaluate(async ({ original, screenshot, width, height, backdrop }) => {
    async function naturalPixels(bytes: string) {
      const image = new Image();
      image.src = `data:image/png;base64,${bytes}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas2D unavailable for unscaled pixel decoding.");
      context.drawImage(image, 0, 0);
      return { data: context.getImageData(0, 0, image.width, image.height).data, width: image.width, height: image.height };
    }
    const source = await naturalPixels(original);
    const actual = await naturalPixels(screenshot);
    if (actual.width !== width || actual.height !== height) throw new Error("Evidence pixel dimensions differ from the requested surface.");
    const background = [1, 3, 5].map((offset) => Number.parseInt(backdrop.slice(offset, offset + 2), 16));
    let difference = 0;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * source.width / width - 0.5;
      const sourceY = (y + 0.5) * source.height / height - 0.5;
      const left = Math.floor(sourceX);
      const top = Math.floor(sourceY);
      const fractionX = sourceX - left;
      const fractionY = sourceY - top;
      const colors = [0, 0, 0];
      let alpha = 0;
      for (let row = 0; row < 2; row += 1) for (let column = 0; column < 2; column += 1) {
        const sampleX = Math.max(0, Math.min(source.width - 1, left + column));
        const sampleY = Math.max(0, Math.min(source.height - 1, top + row));
        const index = (sampleY * source.width + sampleX) * 4;
        const weight = (column ? fractionX : 1 - fractionX) * (row ? fractionY : 1 - fractionY);
        const sampleAlpha = source.data[index + 3] / 255;
        alpha += weight * sampleAlpha;
        for (let channel = 0; channel < 3; channel += 1) colors[channel] += source.data[index + channel] * sampleAlpha * weight;
      }
      for (let channel = 0; channel < 3; channel += 1) {
        const expected = Math.round(colors[channel] + background[channel] * (1 - alpha));
        difference += Math.abs(expected - actual.data[(y * width + x) * 4 + channel]);
      }
    }
    return difference / (width * height * 3);
  }, { original, screenshot, width: item.displayWidth, height: item.displayHeight, backdrop: item.backdrop });
}

for (const fixture of [
  { name: "architecture", width: 640, background: "theme" },
  { name: "fan-in-bottleneck", width: 720, background: "transparent" }
]) test.skipIf(!executablePath)(`${fixture.name} PNG1280 retains every pixel at target width ${fixture.width}`, async () => {
  const sourceResult = await command(["author", "--input", join(root, "fixtures", `${fixture.name}.json`),
    "--name", fixture.name, "--svg", "--png", "--png-width", "1280", "--background", fixture.background, "--browser", executablePath!]);
  expect(sourceResult.code, sourceResult.stdout + sourceResult.stderr).toBe(0);
  const source = JSON.parse(sourceResult.stdout);
  const svg = source.artifacts.find((item: { kind: string }) => item.kind === "svg");
  const png = source.artifacts.find((item: { kind: string }) => item.kind === "png");
  const settings = join(root, `${fixture.name} surfaces.json`);
  const backdrops = fixture.background === "transparent" ? ["#ffffff", "#17202b"] : ["#ffffff"];
  await writeFile(settings, JSON.stringify({ items: backdrops.flatMap((backdrop) => [
    { artifactId: svg.artifactId, displayWidth: fixture.width, backdrop },
    { artifactId: png.artifactId, displayWidth: fixture.width, backdrop }
  ]) }));
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    const original = (await readFile(png.path)).toString("base64");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await command(["author", "--from", source.revision.id, "--name", fixture.name,
        "--artifact-preview-settings", settings, "--browser", executablePath!]);
      expect(result.code, result.stdout + result.stderr).toBe(0);
      const captured = JSON.parse(result.stdout);
      for (const item of captured.artifactEvidence.items.filter((item: { artifactId: string }) => item.artifactId === png.artifactId)) {
        const screenshot = (await readFile(item.path)).toString("base64");
        expect(await comparePng(page, original, screenshot, item), `${fixture.name}, attempt ${attempt}, ${item.backdrop}`).toBeLessThan(0.05);
      }
    }
  } finally { await browser.close(); }
}, 60_000);
