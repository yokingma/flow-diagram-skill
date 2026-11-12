#!/usr/bin/env node
/** Standalone CLI: stdout is one JSON result; progress and npm output stay on stderr. */
import { parseArgs } from "node:util";
import { diagnoseRuntime, prepareRuntime, ToolError } from "./runtime.mjs";
import { collectEvidence } from "./evidence.mjs";
import { submitReview } from "./review.mjs";
import { createReviewTemplate } from "./review-template.mjs";
import { runRevision } from "./workflow.mjs";
import { validateInput } from "./validation.mjs";
import { measureContent } from "./measurement.mjs";
import { layoutContent } from "./layout.mjs";
import { recordFailure } from "./reports.mjs";
import { finalizeTask } from "./finalize.mjs";

const controller = new AbortController();
const cancel = () => controller.abort(new DOMException("Task cancelled; saved drafts remain available", "AbortError"));
process.once("SIGINT", cancel);
process.once("SIGTERM", cancel);
let result = { status: "pending", stage: "arguments", diagnostics: [], artifacts: [] };
const rawArgs = process.argv.slice(2);
const requestedHelp = rawArgs.includes("--help") || rawArgs.includes("-h");
const helpCommand = rawArgs.find((value) => !value.startsWith("-")) || null;
const HELP = {
  all: [
    "Usage: flowsvg <command> [options]",
    "",
    "Commands:",
    "  doctor    Check Node, npm and the cached isolated runtime",
    "  prepare   Install and verify the locked isolated runtime",
    "  validate  Check diagram bytes without saving a revision",
    "  evidence  Capture or reuse target-size evidence of existing SVG/PNG",
    "  review    Append actual-viewing observations without rendering",
    "  review-template  Generate an unviewed form from registered evidence",
    "  author    Validate and deliver JSON/HTML plus requested exports",
    "  measure   Estimate node content and label heights",
    "  layout    Apply a static layout plan to a new draft",
    "  finalize  Publish the selected result and clean its task workspace",
    "",
    "Run `flowsvg <command> --help` for command-specific options."
  ].join("\n"),
  doctor: ["Usage: flowsvg doctor", "", "No options. Reports environment and cache readiness."].join("\n"),
  prepare: ["Usage: flowsvg prepare", "", "No options. Installs the exact SDK recorded by the runtime manifest and lockfile."].join("\n"),
  validate: [
    "Usage: flowsvg validate --input <json> [--theme light|dark]",
    "       flowsvg validate --from <revision> --name <diagram> [--output <history-root>] [--theme light|dark]",
    "",
    "Reads input once and returns JSON diagnostics; no revision or delivery files are written.",
    "Finite layout checks include LABEL_VERTICAL_RUN; see references/diagnostics-and-revisions.md for limits.",
    "  --input <json>       Diagram draft",
    "  --from <revision>    Explicit unchanged saved revision; requires --name",
    "  --name <diagram>     Saved revision series name; optional for drafts",
    "  --output <directory> History root used only to locate --from",
    "  --theme <light|dark> Rendering theme for this check",
    "  -h, --help           Show this help"
  ].join("\n"),
  author: [
    "Usage: flowsvg author --input <json> --name <diagram> [options]",
    "",
    "Options:",
    "  --input <json>       Diagram draft or imported revision JSON",
    "  --html <html>        Agent-composed Skill page with a managed playback region",
    "  --sync-html          Explicitly update verified playback for the selected JSON/theme",
    "  --name <diagram>     Required revision series name",
    "  --output <directory> Explicit history root",
    "  --parent <revision>  Explicit parent revision",
    "  --from <revision>    Use a saved parent JSON",
    "  --decisions <json>   User decision records",
    "  --sources <json>     Source metadata records",
    "  --theme <light|dark> Rendering theme",
    "  --svg                Export a static SVG",
    "  --png                Export a static PNG",
    "  --png-width <px>     PNG width",
    "  --background <mode>  theme or transparent",
    "  --time <ms>          Static export time",
    "  --gif                Export an animated GIF",
    "  --gif-options <json> GIF range and sampling options",
    "  --browser <path|none> Browser executable selection",
    "  --samples <count>    Maximum preview points",
    "  --visual-review <json> Record reviewed preview frames",
    "  --html-review <json> Record reviewed states from the actual diagram.html",
    "  --export-manifest <json> Named static exports",
    "  --artifact-preview-settings <json> Target-size evidence settings",
    "  --artifact-review <json> Record reviewed artifact evidence",
    "  Review JSON contracts: references/review-inputs.md; generate forms with review-template.",
    "  -h, --help           Show this help"
  ].join("\n"),
  evidence: [
    "Usage: flowsvg evidence --from <revision> --name <diagram> [--output <history-root>] [--artifact-preview-settings <json>] [--browser <path|none>]",
    "", "Reads actual registered artifacts; captures missing surfaces only, without compiling or exporting.",
    "Defaults cover every delivered SVG/PNG and preserve prior explicit surfaces. Valid reuse performs no capture or runtime preparation.",
    "Read references/artifact-evidence.md for source identity, complete conditions and reuse rules."
  ].join("\n"),
  review: [
    "Usage: flowsvg review --from <revision> --name <diagram> [--output <history-root>] [--html-review <json>] [--visual-review <json>] [--artifact-review <json>] [--evidence-from <source>]",
    "  --evidence-from <source> Select formal-image evidence independently; defaults to --from.",
    "", "Verifies existing source evidence and appends one immutable record. Never renders or opens a browser.",
    "Read references/review-inputs.md for full fields and references/diagnostics-and-revisions.md for record identity."
  ].join("\n"),
  "review-template": [
    "Usage: flowsvg review-template --from <revision> --name <diagram> --output <history-root> --kind <visual|html|artifact> --template <new-task-file.json> [--evidence-from <source>]",
    "", "Creates only an unviewed form in the same task workspace; never overwrites a target.",
    "Read references/review-inputs.md for all three complete review JSON contracts."
  ].join("\n"),
  finalize: [
    "Usage: flowsvg finalize --workspace <task-directory> --name <diagram> --from <revision>",
    "",
    "  --workspace <path>   One task under .diagrams/.work/<name>/<task-id>",
    "  --name <diagram>     Diagram name",
    "  --from <revision>    Successful authoring/review revision in workspace/history",
    "  --keep-work          Retain task history only when explicitly requested",
    "  -h, --help           Show this help"
  ].join("\n"),
  layout: [
    "Usage: flowsvg layout --input <draft.json> --plan <layout-plan.json> --output <new-draft.json>",
    "",
    "Options:",
    "  --input <draft.json>       Existing static draft; scenes must be []",
    "  --plan <layout-plan.json>  Versioned geometry plan for existing IDs",
    "  --output <new-draft.json>  Required new file; never overwrites a target",
    "  -h, --help                Show this help",
    "",
    "No author revision is allocated. Warnings remain; successful layout is not visual approval."
  ].join("\n"),
  measure: [
    "Usage: flowsvg measure --input <json> [--lines] [--output <new-draft.json>]",
    "",
    "Input is a diagram draft, one label/content measurement object, or an array of content measurement objects.",
    "Options:",
    "  --input <json>       Measurement JSON path",
    "  --lines              Include source-bound estimated text lines; not actual visible glyphs",
    "  --output <json>      Write a new height-filled draft; never overwrites an existing file",
    "  -h, --help           Show this help",
    "",
    "Results are SDK layout estimates, not actual glyph visibility or design approval.",
    "Draft measurement diagnostics block all results and backfill; inspect location and nextStep."
  ].join("\n")
};
function helpText(command) { return HELP[command] || HELP.all; }

if (requestedHelp) {
  process.stdout.write(`${helpText(helpCommand)}\n`);
  process.exitCode = 0;
} else try {
  const { positionals, values } = parseArgs({ allowPositionals: true, strict: true, options: {
    lines: { type: "boolean" }, "evidence-from": { type: "string" }, kind: { type: "string" }, template: { type: "string" }, input: { type: "string" }, html: { type: "string" }, "sync-html": { type: "boolean" }, plan: { type: "string" }, output: { type: "string" }, name: { type: "string" }, parent: { type: "string" }, from: { type: "string" }, decisions: { type: "string" },
    gif: { type: "boolean" }, "gif-options": { type: "string" }, sources: { type: "string" }, theme: { type: "string" }, svg: { type: "boolean" }, png: { type: "boolean" }, "export-manifest": { type: "string" }, "png-width": { type: "string" }, background: { type: "string" }, "artifact-preview-settings": { type: "string" }, "artifact-review": { type: "string" }, time: { type: "string" }, browser: { type: "string" }, "visual-review": { type: "string" }, "html-review": { type: "string" }, samples: { type: "string" }, workspace: { type: "string" }, "keep-work": { type: "boolean" }
  } });
  const command = positionals[0];
  if (values.lines !== undefined && command !== "measure") throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--lines requires measure.", "Run `flowsvg measure --help`.", "lines");
  if (values.html !== undefined && (command !== "author" || !values.html.trim())) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--html requires author and a nonempty HTML path.", "Run `flowsvg author --help`.", "html");
  if (values["sync-html"] !== undefined && command !== "author") throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--sync-html requires author.", "Run `flowsvg author --help`.", "sync-html");
  checkLayoutOptions(command, values);
  checkValidationOptions(command, values);
  if (command !== "review-template" && ["kind", "template"].some((key) => values[key] !== undefined)) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--kind and --template require review-template.", "Run `flowsvg review-template --help`.");
  if (command === "review-template" && Object.keys(values).some((key) => !["kind", "template", "name", "from", "output", "evidence-from"].includes(key))) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "review-template accepts only --kind, --template, --name, --from and --output.", "Run `flowsvg review-template --help`.");
  if (!["author", "review"].includes(command) && values["visual-review"] !== undefined) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--visual-review requires author or review.", "Run `flowsvg author --help`.", "visual-review");
  if (command === "review" && Object.keys(values).some((key) => !["name", "from", "output", "visual-review", "html-review", "artifact-review", "evidence-from"].includes(key))) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "review accepts only source selection and three-kind review inputs.", "Run `flowsvg review --help`.");
  if (!["review", "review-template"].includes(command) && values["evidence-from"] !== undefined) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--evidence-from requires review or review-template.", "Run `flowsvg review --help`.", "evidence-from");
  if (command === "evidence" && Object.keys(values).some((key) => !["name", "from", "output", "artifact-preview-settings", "browser"].includes(key))) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "evidence accepts only explicit saved source, optional display settings and browser selection.", "Run `flowsvg evidence --help`.");
  const imageOptions = ["export-manifest", "svg", "png", "png-width", "time", "background"];
  if (!["author", "evidence"].includes(command) && values["artifact-preview-settings"] !== undefined) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--artifact-preview-settings requires author or evidence.", "Run `flowsvg evidence --help`.");
  if (command !== "author" && imageOptions.some((key) => values[key] !== undefined)) throw new Error("Image options require author.");
  if (!["author", "review"].includes(command) && values["artifact-review"] !== undefined) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--artifact-review requires author or review.", "Run `flowsvg review --help`.", "artifact-review");
  if (!["author", "review"].includes(command) && values["html-review"] !== undefined) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--html-review requires author or review.", "Run `flowsvg author --help` to list valid options.", "html-review");
  if (positionals.length !== 1) throw new Error("Specify exactly one command: doctor, prepare, validate, author, evidence, review, review-template, measure, layout or finalize.");
  if (command !== "finalize" && (values.workspace !== undefined || values["keep-work"] !== undefined)) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--workspace and --keep-work require finalize.", "Run `flowsvg finalize --help`.");
  if (command === "evidence") result = await collectEvidence(values, controller.signal);
  else if (command === "review") result = await submitReview(values, controller.signal);
  else if (command === "review-template") result = await createReviewTemplate(values, controller.signal);
  else if (command === "finalize") {
    if (Object.keys(values).some((key) => !["workspace", "name", "from", "keep-work"].includes(key))) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "finalize accepts only --workspace, --name, --from and --keep-work.", "Run `flowsvg finalize --help`.");
    result = await finalizeTask(values, controller.signal);
  }
  else if (command === "doctor") { result.stage = "environment"; result = await diagnoseRuntime(controller.signal); }
  else if (command === "prepare") {
    result.stage = "environment";
    const runtime = await prepareRuntime(controller.signal);
    result = { status: "ready", stage: "environment", ...runtime, diagnostics: [], artifacts: [] };
  } else if (command === "layout" && values.input && values.plan && values.output) result = await layoutContent(values, controller.signal);
  else if (command === "measure" && values.input) result = await measureContent(values, controller.signal);
  else if (["validate", "author"].includes(command) && (values.input || values.from)) {
    if (values.samples !== undefined && command !== "author") throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--samples requires author.", "Run `flowsvg author --help` to list valid options.", "samples");
    if (values.samples !== undefined && (!/^\d+$/u.test(values.samples) || Number(values.samples) < 2 || Number(values.samples) > 100)) throw new ToolError("arguments", "ERR_INVALID_SAMPLES", "--samples must be an integer from 2 through 100.", "Choose a preview count from 2 through 100.", "samples");
    if (values["export-manifest"] !== undefined && !values["export-manifest"].trim()) throw new Error("--export-manifest requires a nonempty JSON path.");
    if (values["export-manifest"] && ["svg", "png", "time"].some((key) => values[key] !== undefined)) throw new Error("--export-manifest is mutually exclusive with --svg, --png and --time.");
    if (values.time !== undefined && !values.svg && !values.png) throw new Error("--time requires --svg or --png.");
    if (values["png-width"] !== undefined && !values.png && !values["export-manifest"]) throw new Error("--png-width requires --png.");
    if (values.background !== undefined && !values.svg && !values.png && !values["export-manifest"]) throw new Error("--background requires --svg or --png.");
    if (values.background !== undefined && !["theme", "transparent"].includes(values.background)) throw new Error("--background must be theme or transparent.");
    if (command !== "author" && ["svg", "png", "artifact-preview-settings", "artifact-review", "html-review"].some((key) => values[key])) throw new Error("Image exports, HTML inspection and artifact evidence require author.");
    if (values["gif-options"] && !values.gif) throw new Error("--gif-options requires --gif.");
    if (command !== "author" && values.gif) throw new Error("--gif requires author.");
    result = command === "validate" ? await validateInput(values, controller.signal) : await runRevision(values, controller.signal, command);
  }
  else throw new Error(HELP.all);
} catch (error) {
  if (typeof error?.code === "string" && error.code.startsWith("ERR_PARSE_ARGS_")) {
    error.nextStep = `Run \`flowsvg ${helpCommand || "<command>"} --help\` to list valid options.\n${helpText(helpCommand)}`;
  }
  recordFailure(result, error);
}
finally {
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
}
if (!requestedHelp) {
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exitCode = ["failed", "cancelled"].includes(result.status) ? 1 : 0;
}

/** Layout uses a new draft path rather than revision/export options. */
function checkLayoutOptions(command, values) {
  if (command !== "layout" && values.plan !== undefined) throw new ToolError("arguments", "ERR_OPTION_SCOPE", "--plan requires layout.", "Run `flowsvg layout --help`.", "plan");
  if (command !== "layout") return;
  const unsupported = Object.keys(values).find((key) => !["input", "plan", "output"].includes(key));
  if (unsupported) throw new ToolError("arguments", "ERR_OPTION_SCOPE", `--${unsupported} is not supported by layout.`, "Layout accepts only --input, --plan and --output. Run `flowsvg layout --help`.", unsupported);
  const missing = ["input", "plan", "output"].find((key) => !values[key]?.trim());
  if (missing) throw new ToolError("arguments", "LAYOUT_ARGUMENT_REQUIRED", `layout requires --${missing}.`, "Provide --input <draft.json>, --plan <layout-plan.json> and --output <new-draft.json>.", missing);
}

/** Validation is a read-only command; saved-source options only locate explicit historical bytes. */
function checkValidationOptions(command, values) {
  if (command !== "validate") return;
  const unsupported = Object.keys(values).find((key) => !["input", "from", "name", "output", "theme"].includes(key));
  if (unsupported) throw new ToolError("arguments", "ERR_OPTION_SCOPE", `--${unsupported} is not supported by validate.`,
    "Use author to save revisions, metadata or decisions. Run `flowsvg validate --help`.", unsupported);
}
