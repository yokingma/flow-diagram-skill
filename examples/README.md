# Teaching example workshop

[简体中文](README.zh-CN.md)

Use this directory to make and revise candidates for the [installed teaching library](../skills/flow-diagram/examples/README.md). [Development exercises](development/README.md) are API inputs rather than selected visual examples.

## Preview the example library

From the repository root, use Node 20+, npm and pnpm `10.12.1`:

```sh
pnpm examples:preview
```

Open `examples/.preview/index.html` in a browser. The command scans these two locations without recursion:

| Gallery section | Source files |
| --- | --- |
| Selected teaching examples | `skills/flow-diagram/examples/*.json` |
| Development exercises | `examples/development/*.json` |

Candidates under `examples/<name>/diagram.json` have their own current preview and are outside this gallery. The development-exercise section contains API exercises, not all diagrams under development.

Each card links to its source, adjacent teaching note when present, and full offline player. Animations start paused; use their playback controls. Narrow windows can scroll each diagram horizontally.

After changing, adding or removing a source, rerun the command and reload the page. The command replaces the same `examples/.preview/` directory; it does not watch files or run a server. A failed render returns a nonzero status with the source path and leaves no successful gallery index. Fix the reported input and rerun. Generating previews does not establish visual quality or select an exercise for installation.

Git tracks the [page template](gallery.html), [generator](../scripts/preview-examples.mjs) and original sources. Generated HTML, copied JSON and CLI reports are ignored, reproducible outputs outside the installation unit. The generator uses the installed CLI's exact isolated SDK baseline; the first run may prepare its runtime from npm, then a complete cache supports offline reuse. No browser executable is needed to generate the gallery. Source files remain unchanged, with no second maintained source list or copy.

## Make or revise a candidate

Use English for reusable example titles, diagram text, animation captions and teaching notes. For a new candidate, keep one current source, an openable current preview and a short note stating the reader's question, source facts, composition or animation choices, primary display conditions and limits. Consolidate substantive findings in one temporary `issues.md`. Generated previews and process records stay local and ignored by Git.

Follow [teaching-example maintenance](../docs/development/flow-diagram-maintenance.md#teaching-example-maintenance) to actually view outputs and present candidates for batch user selection. Once selected, move the source and concise note into the installed library and remove candidate copies and duplicate outputs. The installed source is the only publication source. Begin later substantive revisions with a temporary working copy from that source.
