# Example workshop

[简体中文](README.zh-CN.md)

Maintain pinned upstream showcase snapshots for the [installed library](../skills/flow-diagram/examples/README.md). The complete stories are shared by the SDK Native, React and Vue demos. Focused capability examples reuse that catalog or use small Skill-authored exercises for mechanisms without a suitable showcase. Duplicate development exercises are not maintained here.

## Preview the example library

From the repository root, use Node 20+, npm and pnpm `10.12.1`:

```sh
pnpm examples:preview
```

Open `examples/.preview/index.html` in a browser. The command scans two explicit directories without recursion:

| Gallery section | Source files |
| --- | --- |
| Complete examples | `skills/flow-diagram/examples/complete/*.json` |
| SDK capabilities | `skills/flow-diagram/examples/capabilities/*.json` |

Each card links to its source, adjacent note when present and full offline player. The complete documents also supply static reading states; consult the note and current compilation before exporting a later frame. Players start paused with the upstream dark theme, speed 1 and reduced motion off. Narrow windows can scroll each diagram horizontally.

Rerun the command and reload after source additions, changes or removals. It replaces `examples/.preview/`, without a watcher or server. Rendering failure returns nonzero with the source path and leaves no successful index. Correct the reported input and rebuild. Generation does not establish visual quality.

The generator uses the installed CLI's exact isolated SDK baseline; the first run can prepare it from npm, then a complete cache supports offline reuse. No browser executable is needed to generate the gallery. Source bytes stay unchanged. Git tracks the [template](gallery.html), [generator](../scripts/preview-examples.mjs), JSON snapshots and notes; generated HTML, JSON copies and reports are ignored outside the installation unit.

## Import or revise a candidate

Choose the source kind first: preserve complete stories as upstream snapshots; use a small Skill-authored capability exercise only when no suitable focused upstream example exists. For a local exercise, keep the JSON as the author source and record its teaching assumptions and reference material without claiming upstream byte identity.

For an upstream snapshot, pin a commit and generate standalone JSON from its TypeScript author definitions. Record source identity, license, JSON hash and any presentation overrides in the adjacent note; link the [shared execution and viewing conditions](../skills/flow-diagram/examples/README.md#run-and-inspect). Check default theme explicitly: upstream host settings are outside the JSON. Preserve complete document semantics and validate it with the Skill's locked public runtime; upstream acceptance is not current Skill acceptance.

Keep one temporary candidate source, current preview and concise English note under `examples/<name>/`, outside the published gallery. Record material findings in one temporary `issues.md`; generated previews and process records stay ignored. Follow [example maintenance](../docs/development/flow-diagram-maintenance.md#teaching-example-maintenance) for verification, selection, publication and later snapshot updates, applying any existing user authorization. For a user's diagram, use [task-local adaptation](../skills/flow-diagram/examples/README.md#adapt-an-example).
