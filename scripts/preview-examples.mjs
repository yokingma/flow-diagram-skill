/** Build the repository gallery through the pinned installed CLI; generated files stay outside the Skill. */
import { execFile } from "node:child_process";
import { readFile, readdir, rm, mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const runFile = promisify(execFile);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, "examples/.preview");
const CLI = join(ROOT, "skills/flow-diagram/scripts/flowsvg.mjs");
const CONTROL_SPACE_PX = 180;
const MAX_COMMAND_OUTPUT_BYTES = 4 * 1024 * 1024;
const GROUPS = [
  {
    id: "teaching", title: "Teaching examples",
    description: "Selected compositions. Read each teaching note for its purpose, conditions and viewing limits.",
    directory: join(ROOT, "skills/flow-diagram/examples")
  },
  {
    id: "development", title: "Development exercises",
    description: "API exercises, not selected visual teaching examples.",
    directory: join(ROOT, "examples/development")
  }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function localUrl(path) {
  return relative(OUTPUT, path).split(sep).map(encodeURIComponent).join("/");
}

async function renderExample(group, entry) {
  const name = entry.name.slice(0, -".json".length);
  const source = join(group.directory, entry.name);
  const destination = join(OUTPUT, group.id);
  try {
    const { stdout } = await runFile(process.execPath, [
      CLI, "author", "--input", source, "--name", name, "--output", destination, "--browser", "none"
    ], { cwd: ROOT, maxBuffer: MAX_COMMAND_OUTPUT_BYTES });
    const result = JSON.parse(stdout);
    if (result.completion?.delivery !== "complete") throw new Error(stdout);
  } catch (error) {
    throw new Error(`Cannot preview ${relative(ROOT, source)}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  const current = join(destination, name, "current");
  const document = JSON.parse(await readFile(join(current, "diagram.json"), "utf8"));
  const note = join(group.directory, `${name}.md`);
  const hasNote = await access(note).then(() => true, (error) => {
    if (error.code === "ENOENT") return false;
    throw error;
  });
  return { name, document, source, note: hasNote ? note : null, player: join(current, "diagram.html") };
}

function renderCard(group, example) {
  const title = escapeHtml(example.document.title || example.name);
  const { width, height } = example.document.viewport;
  const animated = example.document.scenes?.some((scene) => scene.beats?.length > 0);
  const links = [
    `<a href="${localUrl(example.source)}">JSON source</a>`,
    ...(example.note ? [`<a href="${localUrl(example.note)}">Teaching note</a>`] : []),
    `<a href="${localUrl(example.player)}" target="_blank" rel="noopener">Open full view ↗</a>`
  ].join(" · ");
  return `<article id="${escapeHtml(`${group.id}-${example.name}`)}">
    <header><h3>${title}</h3><span class="kind">${animated ? "Animation" : "Static"}</span>
      <p class="links">${links}</p></header>
    <div class="player"><iframe title="${title}" src="${localUrl(example.player)}" loading="lazy"
      data-ratio="${height / width}" style="height:${height + CONTROL_SPACE_PX}px"></iframe></div>
  </article>`;
}

async function renderGroup(group) {
  const entries = (await readdir(group.directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((first, second) => first.name.localeCompare(second.name, "en"));
  const examples = await Promise.all(entries.map((entry) => renderExample(group, entry)));
  return `<section id="${group.id}"><h2>${group.title} <span class="count">${examples.length}</span></h2>
    <p>${group.description}</p>
    <nav aria-label="${group.title}">${examples.map((example) =>
      `<a href="#${escapeHtml(`${group.id}-${example.name}`)}">${escapeHtml(example.document.title || example.name)}</a>`
    ).join("\n")}</nav>${examples.map((example) => renderCard(group, example)).join("\n")}</section>`;
}

async function main() {
  const template = await readFile(join(ROOT, "examples/gallery.html"), "utf8");
  // This directory owns only disposable outputs; reset it so removed sources cannot remain in the gallery.
  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  const sections = await Promise.all(GROUPS.map(renderGroup));
  await writeFile(join(OUTPUT, "index.html"), template.replace("<!-- EXAMPLE_GROUPS -->", () => sections.join("\n")));
  process.stdout.write(`Example gallery: ${join(OUTPUT, "index.html")}\nOpen this file in a browser. Rerun pnpm examples:preview after source changes.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
