/** Compose editable Skill pages around opaque public SDK output; all playback remains SDK-owned. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  }
  return { text, before: text.slice(0, contentStart), after: text.slice(end), block, data,
    source: { sha256: hash(bytes), bytes: bytes.length } };
}

/** Fill only the Skill-owned region. Existing pages must match the exact diagram, theme and SDK output. */
export function composeHtmlPage(page, playerHtml, report) {
  const data = { version: 1, inputSha256: report.input.sha256,
    sdk: { version: report.sdk.version, integrity: report.sdk.integrity }, theme: report.theme,
    playerSha256: hash(playerHtml) };
  const block = managedBlock(data, playerHtml);
  if (page.data && page.block !== block) {
    throw pageError("HTML playback region does not match this diagram, theme or SDK. Keep the page layout and supply a matching page or an empty managed region.", "html");
  }
  const html = page.before + block + page.after;
  report.htmlPage = { schemaVersion: 1, source: page.source, inputSha256: data.inputSha256,
    sdk: data.sdk, theme: data.theme, playerSha256: data.playerSha256, outputSha256: hash(html) };
  return html;
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
