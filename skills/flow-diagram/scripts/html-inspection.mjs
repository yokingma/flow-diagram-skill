/** Inspect the saved offline playback file in an owned, offline browser context. */
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { ToolError } from "./runtime.mjs";
import { findBrowser, importPlaywright } from "./browser.mjs";
import { createPreviewPlan } from "./preview-plan.mjs";

const HTML_VIEWPORT = { width: 1440, height: 1000 };
const SEEK_SUBMILLISECOND_PRECISION = 1000;
import { validateReviewInput } from "./review-contract.mjs";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Capture facts from the actual delivered HTML; capture never implies human/model approval. */
export async function inspectDeliveredHtml(report, context) {
  const htmlPath = join(report.revision.directory, "diagram.html");
  const htmlSha256 = digest(await readFile(htmlPath));
  const plan = createPreviewPlan(context.document, context.diagram);
  report.stage = "html-inspection";
  report.htmlInspection = {
    schemaVersion: 1, status: "not-run", sourceRevision: report.revision.id,
    file: { path: htmlPath, sha256: htmlSha256 }, inputSha256: report.input.sha256,
    sdk: { version: report.sdk.version, integrity: report.sdk.integrity }, theme: report.theme,
    display: { viewport: HTML_VIEWPORT, background: report.theme === "dark" ? "#111827" : "#ffffff", surface: "actual-file" },
    plan: { ...plan, points: plan.points.map((point) => ({ ...point, view: "html" })) }, states: [],
    playback: { attempted: false }, viewedStates: [],
    resources: { page: "not-created", context: "not-created", browser: "not-created" }
  };
  report.checks.html = "not-run";
  const selected = await findBrowser(context.options.browser).catch((cause) => {
    report.htmlInspection.status = "failed";
    report.htmlInspection.reason = cause.message;
    throw new ToolError("html-inspection", "HTML_BROWSER_FAILED", cause.message, cause.nextStep, "browser", cause);
  });
  if (!selected) {
    report.htmlInspection.reason = "No prepared browser selected or detected; actual HTML inspection was not performed.";
    report.diagnostics.push({ severity: "info", stage: "html-inspection", code: "HTML_BROWSER_UNAVAILABLE", location: "browser",
      reason: report.htmlInspection.reason, nextStep: "Select an installed Chrome/Chromium executable with --browser and retry the HTML inspection." });
    return;
  }
  let browser;
  let browserContext;
  let page;
  try {
    const { chromium } = await importPlaywright(context.runtime);
    browser = await chromium.launch({ executablePath: selected.executablePath, headless: true, timeout: 15_000 });
    report.htmlInspection.resources.browser = "open";
    browserContext = await browser.newContext({ viewport: HTML_VIEWPORT, deviceScaleFactor: 1, offline: true, colorScheme: report.theme, reducedMotion: "no-preference" });
    report.htmlInspection.resources.context = "open";
    page = await browserContext.newPage();
    report.htmlInspection.resources.page = "open";
    page.setDefaultTimeout(15_000);
    const externalRequests = [];
    const htmlUrl = pathToFileURL(htmlPath).href;
    page.on("request", (request) => {
      const url = request.url();
      if (url !== htmlUrl && !/^(?:about|blob|data):/u.test(url)) externalRequests.push(url);
    });
    await page.goto(htmlUrl, { waitUntil: "load" });
    const player = await playerSurface(page, Boolean(report.htmlPage));
    report.htmlInspection.playerSurface = report.htmlPage ? "managed-frame" : "document";
    await player.locator("#flowsvg-player svg").waitFor();
    await player.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.fonts.ready);
    const outerText = await page.locator("body").innerText();
    const initial = await readState(player, externalRequests);
    if (initial.progress !== "0" || initial.playLabel !== "Play") {
      throw new Error("Delivered HTML did not open at time zero in a paused state.");
    }
    report.htmlInspection.initial = { ...initial, paused: true, offline: externalRequests.length === 0 };
    if (context.diagram.totalDuration > 0) {
      const play = player.getByRole("button", { name: "Play", exact: true });
      await play.click();
      await player.waitForFunction(() => Number(document.querySelector('input[aria-label="Progress"]')?.value) > 0);
      const advanced = await player.locator('input[aria-label="Progress"]').inputValue();
      await player.getByRole("button", { name: "Pause", exact: true }).click();
      report.htmlInspection.playback = { attempted: true, advanced: Number(advanced) > 0, paused: true, progress: advanced };
      await seek(player, 0);
    } else {
      report.htmlInspection.playback = { attempted: false, reason: "Static diagram has no timeline to play." };
    }
    await mkdir(join(report.revision.directory, "html-inspection"));
    for (const point of report.htmlInspection.plan.points) {
      context.signal?.throwIfAborted();
      const nextBoundary = context.diagram.beats.find((beat) => beat.startMs > point.timeMs)?.startMs;
      await seek(player, point.timeMs, nextBoundary);
      const state = await readState(player, externalRequests);
      const bytes = await page.screenshot({ type: "png", fullPage: true, animations: "disabled" });
      const path = join(report.revision.directory, "html-inspection", `${point.id}.png`);
      await writeFile(path, bytes, { flag: "wx" });
      report.htmlInspection.states.push({ id: `html-${point.id}`, pointId: point.id, timeMs: point.timeMs,
        path, sha256: digest(bytes), paused: state.playLabel === "Play", offline: externalRequests.length === 0,
        controls: { playLabel: state.playLabel, progress: state.progress }, externalRequests: [...externalRequests],
        caption: state.caption, diagramText: state.diagramText });
    }
    await recordBackseek(report.htmlInspection, player, initial, context.diagram.totalDuration, externalRequests);
    report.htmlInspection.outerPage = { staticTextStable: outerText === await page.locator("body").innerText() };
    if (!report.htmlInspection.outerPage.staticTextStable) throw new Error("Outer HTML text changed during playback or seeking.");
    report.htmlInspection.offline = { passed: externalRequests.length === 0, externalRequests: [...externalRequests] };
    if (externalRequests.length) {
      throw new Error(`Offline HTML attempted external resource requests: ${[...new Set(externalRequests)].join(", ")}`);
    }
    report.htmlInspection.status = "awaiting-review";
    report.checks.html = "captured";
    report.htmlInspection.coverage = { requested: report.htmlInspection.states.length, viewed: 0, unviewed: report.htmlInspection.states.length };
  } catch (cause) {
    report.htmlInspection.status = context.signal?.aborted ? "cancelled" : "failed";
    report.htmlInspection.reason = cause.message;
    throw new ToolError("html-inspection", "HTML_INSPECTION_FAILED", cause.message,
      "Keep the delivered files, inspect the saved HTML and browser state, then retry in a new revision.", htmlPath, cause);
  } finally {
    await closeResources(report.htmlInspection, { page, context: browserContext, browser });
  }
}

/** Record a model/viewer attestation against the exact saved HTML inspection evidence. */
export async function recordHtmlReview(report, options) {
  if (!options["html-review"]) return;
  report.stage = "html-review";
  try {
    const parent = report.provenance?.parent;
    if (!parent) throw new Error("HTML review requires an explicit --from or --parent source revision.");
    const source = JSON.parse(await readFile(join(parent.directory, "report.json"), "utf8"));
    const inspection = source.htmlInspection;
    if (!inspection || !["captured", "awaiting-review", "review-recorded"].includes(source.checks?.html)
      || source.input?.sha256 !== report.input.sha256 || source.theme !== report.theme
      || source.sdk?.version !== report.sdk.version || source.sdk?.integrity !== report.sdk.integrity) {
      throw new Error("The reviewed source must contain captured HTML inspection for the same input, theme and SDK baseline.");
    }
    const htmlBytes = await readFile(join(parent.directory, "diagram.html"));
    if (digest(htmlBytes) !== inspection.file.sha256) throw new Error("The reviewed diagram.html bytes changed after inspection.");
    const deliveredBytes = await readFile(join(report.revision.directory, "diagram.html"));
    if (digest(deliveredBytes) !== inspection.file.sha256) throw new Error("The new diagram.html differs from the reviewed source; inspect and review the new file.");
    const review = JSON.parse((await readFile(options["html-review"], "utf8")).toString("utf8"));
    validateReviewInput(review, "html");
    const viewedStates = [];
    for (const reviewed of review.states) viewedStates.push(await validateState(parent, inspection, reviewed));
    const path = join(report.revision.directory, "html-review.json");
    await writeFile(path, JSON.stringify(review, null, 2) + "\n", { flag: "wx" });
    report.artifacts.push({ kind: "html-review", path });
    report.htmlInspection = { ...inspection, sourceRevision: parent.id, status: "review-recorded", viewedStates,
      review: { reviewer: review.reviewer, sourceRevision: parent.id, sourceReport: join(parent.directory, "report.json"),
        attestation: "The submitting model states it actually viewed the identified screenshots from the delivered HTML file.",
        scope: "Only listed HTML states were viewed; other states and static artifacts remain outside this review." } };
    report.htmlInspection.coverage = { requested: inspection.states.length, viewed: viewedStates.length,
      unviewed: Math.max(0, inspection.states.length - viewedStates.length) };
    report.checks.html = "reviewed";
    for (const state of viewedStates) for (const issue of state.issues) report.diagnostics.push({ severity: "warning", stage: "html-review", code: "HTML_REVIEW_ISSUE",
      location: `${parent.id}/${state.id}`, timeMs: state.timeMs, reason: issue.reason, nextStep: `${issue.nextStep} Wait for the user's decision before changing the diagram.` });
    if (viewedStates.some((state) => state.issues.length)) report.completion.quality = "needs-user-decision";
  } catch (cause) {
    throw new ToolError("html-review", "HTML_REVIEW_INVALID", cause.message,
      "Open the actual diagram.html screenshots and provide their hashes and observations with the explicit source revision.", options["html-review"], cause);
  }
}

/** Inspect controls only in the declared player surface; outer content cannot impersonate playback. */
async function playerSurface(page, managed) {
  if (!managed) return page;
  const host = await page.locator("#flowsvg-page-player").elementHandle();
  const frame = await host?.contentFrame();
  if (!frame) throw new Error("Managed HTML page has no accessible playback frame.");
  return frame;
}

async function readState(player, externalRequests) {
  return player.evaluate(() => {
    /** Canonical public SVG state; excludes volatile DOM ordering and runtime-only attributes. */
    const canonicalVisualSignature = () => {
      const svg = document.querySelector("#flowsvg-player svg");
      if (!svg) return "missing-svg";
      const attributes = ["class", "fill", "stroke", "stroke-width", "d", "transform", "x", "y", "width", "height", "cx", "cy", "rx", "ry"];
      const records = [svg, ...svg.querySelectorAll("*")].map((element) => {
        const computed = getComputedStyle(element);
        const attrs = Object.fromEntries(attributes.map((name) => [name, element.getAttribute(name) ?? ""]));
        return { tag: element.tagName.toLowerCase(), id: element.id || "", attrs,
          visibility: computed.visibility, display: computed.display, opacity: computed.opacity };
      }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
      return JSON.stringify(records);
    };
    return {
      playLabel: document.querySelector('button[aria-label="Play"], button[aria-label="Pause"]')?.getAttribute("aria-label") ?? "missing",
      progress: document.querySelector('input[aria-label="Progress"]')?.value ?? "missing",
      svg: Boolean(document.querySelector("#flowsvg-player svg")),
      caption: document.querySelector(".flowsvg-caption")?.textContent ?? "",
      diagramText: [...document.querySelectorAll("#flowsvg-player svg text")].map((element) => element.textContent).join("\n"),
      visualSignature: canonicalVisualSignature()
    };
  }).then((state) => ({ ...state, externalRequests: [...externalRequests] }));
}

/** Exercise reconstruction through the visible range control, without inspecting player internals. */
async function recordBackseek(inspection, player, initial, duration, externalRequests) {
  if (duration <= 0) return;
  await seek(player, duration);
  await seek(player, 0);
  const restored = await readState(player, externalRequests);
  inspection.backseek = { attempted: true, fromTimeMs: duration, timeMs: 0,
    restored: restored.progress === "0" && restored.playLabel === "Play"
      && restored.caption === initial.caption && restored.diagramText === initial.diagramText
      && restored.visualSignature === initial.visualSignature,
    caption: restored.caption, diagramText: restored.diagramText,
    visualSignature: restored.visualSignature, initialVisualSignature: initial.visualSignature };
  if (!inspection.backseek.restored) throw new Error("Backward seeking did not restore the initial diagram and caption.");
}

async function seek(player, timeMs, nextBoundary) {
  await player.locator('input[aria-label="Progress"]').evaluate((element, value) => {
    const input = element;
    // Keep the request within its beat even when a deliberately tiny beat follows a fractional boundary.
    const rounded = Math.ceil(value.timeMs * value.precision) / value.precision;
    const target = value.nextBoundary === undefined ? rounded : Math.min(rounded, value.timeMs + (value.nextBoundary - value.timeMs) / 2);
    input.value = String(target);
    const actual = Number(input.value);
    const clampedFinal = value.timeMs >= Number(input.max);
    if ((!clampedFinal && actual < value.timeMs) || (value.nextBoundary !== undefined && actual >= value.nextBoundary)) {
      throw new Error("The progress control cannot represent this compiled sample within its beat.");
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, { timeMs, nextBoundary, precision: SEEK_SUBMILLISECOND_PRECISION });
  // The range control serializes finite timeline values, so fractional compiled times may be rounded.
  await player.waitForFunction((value) => {
    const actual = Number(document.querySelector('input[aria-label="Progress"]')?.value);
    return Number.isFinite(actual) && Math.abs(actual - Number(value)) <= 1;
  }, timeMs);
}



/** Verify a listed HTML screenshot inside its explicit source revision without writing records. */
export async function validateState(parent, inspection, reviewed) {
  const captured = inspection.states?.find((state) => state.id === reviewed.id);
  if (!captured || captured.sha256 !== reviewed.sha256) throw new Error(`HTML state ${reviewed.id} does not match a captured source state.`);
  const [directory, path] = await Promise.all([realpath(parent.directory), realpath(captured.path)]);
  if (!path.startsWith(directory + sep)) throw new Error(`HTML state ${reviewed.id} is outside the explicit source revision.`);
  if (digest(await readFile(path)) !== reviewed.sha256) throw new Error(`HTML state ${reviewed.id} bytes changed after capture.`);
  return { id: captured.id, pointId: captured.pointId, path, timeMs: captured.timeMs, sha256: captured.sha256,
    sourceRevision: parent.id, observations: reviewed.observations, issues: reviewed.issues };
}

async function closeResources(record, resources) {
  for (const [kind, resource] of Object.entries(resources)) {
    if (!resource) continue;
    try { await resource.close(); record.resources[kind] = "closed"; }
    catch (error) { record.resources[kind] = "close-failed"; record.cleanupError = error.message; }
  }
}
