/** Compose editable Skill pages around opaque public SDK output; all playback remains SDK-owned. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ToolError } from "./runtime.mjs";

const PAGE_START = "<!-- flowsvg:player:start -->";
const PAGE_END = "<!-- flowsvg:player:end -->";
const PAGE_DATA = /^\s*<script id="flowsvg-page-data" type="application\/json">([^]*?)<\/script>/u;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Read the selected editable page once before allocating a revision; malformed slots fail without writes. */
export async function readHtmlPage(path) {
  if (path === undefined) return null;
  let bytes;
  try { bytes = await readFile(path); }
  catch (cause) { throw pageError(`Cannot read HTML page: ${cause.message}`, path, cause); }
  const text = bytes.toString("utf8");
  const start = text.indexOf(PAGE_START);
  const end = text.indexOf(PAGE_END);
  if (start < 0 || end < start || text.indexOf(PAGE_START, start + PAGE_START.length) >= 0
    || text.indexOf(PAGE_END, end + PAGE_END.length) >= 0) {
    throw pageError("HTML requires exactly one ordered flowsvg:player:start/end region.", path);
  }
  const contentStart = start + PAGE_START.length;
  const outer = text.slice(0, start) + text.slice(end + PAGE_END.length);
  if (/\bid\s*=\s*(?:["']flowsvg-page-(?:player|data)["']|flowsvg-page-(?:player|data)(?=[\s>]))/iu.test(outer)) {
    throw pageError("Reserved playback IDs must occur only inside the managed region.", path);
  }
  const block = text.slice(contentStart, end);
  let data = null;
  if (block.trim()) {
    const match = block.match(PAGE_DATA);
    try { data = match ? JSON.parse(match[1]) : null; }
    catch (cause) { throw pageError(`Invalid page data JSON: ${cause.message}`, path, cause); }
    if (!data || data.version !== 1) throw pageError("Unsupported or missing Skill page data version.", path);
    verifyManagedBlock(block, data, path);
  }
  return { text, before: text.slice(0, contentStart), after: text.slice(end), block, data,
    source: { sha256: hash(bytes), bytes: bytes.length }, selection: { kind: "html" } };
}

/** Reuse only a selected saved parent's registered page; external edits require an explicit --html input. */
export async function inheritHtmlPage(report, page) {
  if (page || !report.provenance.parent) return page;
  const { directory, id } = report.provenance.parent;
  let record;
  try { record = JSON.parse(await readFile(join(directory, "report.json"), "utf8")); }
  catch (cause) { throw pageError(`Cannot read parent HTML provenance: ${cause.message}`, directory, cause); }
  if (!record.htmlPage) return null;
  const inherited = await readHtmlPage(join(directory, "diagram.html"));
  if (inherited.source.sha256 !== record.htmlPage.outputSha256
    || record.htmlInspection?.file?.sha256 && inherited.source.sha256 !== record.htmlInspection.file.sha256) {
    throw pageError("Selected parent HTML differs from its recorded file identity. Supply edited HTML explicitly with --html.", directory);
  }
  return { ...inherited, selection: { kind: "parent", revision: id } };
}

/** Fill only the Skill-owned region. Existing pages match exactly unless the caller explicitly synchronizes a verified region. */
export function composeHtmlPage(page, playerHtml, report, synchronize = false) {
  const data = { version: 1, inputSha256: report.input.sha256,
    sdk: { version: report.sdk.version, integrity: report.sdk.integrity }, theme: report.theme,
    playerSha256: hash(playerHtml) };
  const block = managedBlock(data, playerHtml);
  if (page.data && page.block !== block && !synchronize) {
    throw pageError("HTML playback region does not match this diagram, theme or SDK. Confirm the selected JSON and use --sync-html to update the verified playback region while preserving page layout.", "html");
  }
  if (page.data && synchronize && (page.data.sdk.version !== data.sdk.version || page.data.sdk.integrity !== data.sdk.integrity)) {
    throw pageError("HTML playback SDK identity differs from the installed baseline.", "html");
  }
  const html = page.before + block + page.after;
  report.htmlPage = { schemaVersion: 1, source: page.source, selection: page.selection, inputSha256: data.inputSha256,
    sdk: data.sdk, theme: data.theme, playerSha256: data.playerSha256, outputSha256: hash(html),
    ...(synchronize && page.data ? { synchronizedFrom: { inputSha256: page.data.inputSha256, playerSha256: page.data.playerSha256 } } : {}) };
  return html;
}

// Verify the complete Skill region before replacement; metadata alone cannot bless damaged playback.
function verifyManagedBlock(block, data, path) {
  const validHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
  const source = block.match(/<iframe id="flowsvg-page-player"[^>]* srcdoc="([^]*?)"><\/iframe>/u)?.[1];
  const playerHtml = source?.replace(/&(amp|lt|gt|quot|#39);/gu,
    (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[entity]);
  const identity = { version: 1, inputSha256: data.inputSha256,
    sdk: { version: data.sdk?.version, integrity: data.sdk?.integrity }, theme: data.theme, playerSha256: data.playerSha256 };
  if (!validHash(data.inputSha256) || !validHash(data.playerSha256)
    || !data.sdk || typeof data.sdk.version !== "string" || typeof data.sdk.integrity !== "string"
    || !["light", "dark"].includes(data.theme) || playerHtml === undefined
    || hash(playerHtml) !== data.playerSha256 || block !== managedBlock(identity, playerHtml)) {
    throw pageError("HTML playback region is damaged or its embedded playback hash is invalid.", path);
  }
}

function managedBlock(data, playerHtml) {
  const metadata = JSON.stringify(data).replace(/</gu, "\\u003c");
  const source = escapeAttribute(playerHtml);
  return `\n<script id="flowsvg-page-data" type="application/json">${metadata}</script>\n<iframe id="flowsvg-page-player" title="Diagram player" style="display:block;width:100%;border:0" srcdoc="${source}"></iframe>\n<script>\n(()=>{const frame=document.getElementById("flowsvg-page-player");let observer;const connect=()=>{observer?.disconnect();const body=frame.contentDocument?.body;if(!body)return;const resize=()=>{frame.style.height=Math.ceil(body.getBoundingClientRect().height)+"px"};observer=new ResizeObserver(resize);observer.observe(body);resize()};frame.addEventListener("load",connect);connect()})();\n</script>\n`;
}

function escapeAttribute(value) {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function pageError(message, location, cause) {
  return new ToolError("html-page", "HTML_PAGE_INVALID", message,
    "Use the installed HTML page starter, preserve its single managed playback region, and retry with matching diagram JSON.", location, cause);
}
