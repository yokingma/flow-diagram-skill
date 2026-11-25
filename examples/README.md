# Example workshop

[简体中文](README.zh-CN.md)

Preview and maintain the [diagram examples](../skills/flow-diagram/examples/README.md). Complete examples include pinned FlowSVG snapshots and Skill-authored stories; focused exercises demonstrate individual authoring features.

## Preview the example library

From the repository root, use Node 20+, npm and pnpm `10.12.1`:

```sh
pnpm examples:preview
```

Open `examples/.preview/index.html` in a browser. The command scans installed `examples/` without recursion and selects sources by filename prefix:

| Gallery section | Source files |
| --- | --- |
| Complete examples | `skills/flow-diagram/examples/complete-*.json` |
| SDK capabilities | `skills/flow-diagram/examples/capabilities-*.json` |

Each card links to its source, adjacent note when present and full offline player. The complete documents also supply static reading states; consult the note and current compilation before exporting a later frame. Players start paused with the upstream dark theme, speed 1 and reduced motion off. Narrow windows can scroll each diagram horizontally.

Rerun the command and reload after source additions, changes or removals. It replaces `examples/.preview/`, without a watcher or server. Rendering failure returns nonzero with the source path and leaves no successful index. Correct the reported input and rebuild. View the resulting diagrams in the browser.

The generator uses the installed CLI's exact isolated SDK baseline; the first run can prepare it from npm, then a complete cache supports offline reuse. No browser executable is needed to generate the gallery. Source bytes stay unchanged. Git tracks the [template](gallery.html), [generator](../scripts/preview-examples.mjs), JSON snapshots and notes; generated HTML, JSON copies and reports are ignored outside the installation unit.

## Import or revise a candidate

Choose the source kind first: preserve imported FlowSVG stories as pinned upstream snapshots; use Skill-authored complete stories for distinct teaching questions and focused capability exercises for uncovered SDK features. For local examples, keep the JSON as the author source and record teaching assumptions and reference material without claiming upstream identity.

For an upstream snapshot, pin a commit and generate standalone JSON from its TypeScript author definitions. Keep the source commit, JSON hash, presentation overrides, source links and license attribution with the candidate note. Link the [shared execution and viewing conditions](../skills/flow-diagram/examples/README.md#run-and-inspect). Check default theme explicitly: upstream host settings are outside the JSON. Preserve the complete document semantics, then validate and view it with the Skill's runtime.

For a Skill-authored example, record its authoring workflow, any AI model/tool used, fictional assumptions, license and JSON hash in the note and scoped source metadata. Do not present it as an upstream snapshot or imply byte identity. Link the shared viewing conditions, use the intended dark presentation and verify the rendered output with the Skill's runtime.

Keep one temporary candidate source, current preview and concise English note under `examples/<name>/`, outside the published gallery. Record material findings in one temporary `issues.md`; generated previews and process records stay ignored. Follow [example maintenance](../docs/development/flow-diagram-maintenance.md#teaching-example-maintenance) for verification, selection, publication and later snapshot updates, applying any existing user authorization. After selection, publish the source and short note, and transfer its applicable source identity, JSON hash and presentation overrides to `skills/flow-diagram/resources/teaching-sources.json`. Finish when the selected source matches its metadata and installed links resolve. For a user's diagram, use [task-local adaptation](../skills/flow-diagram/examples/README.md#adapt-an-example).
