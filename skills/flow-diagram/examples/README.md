# Diagram examples

Use [complete examples](complete/README.md) to study composition and animation, or [SDK capabilities](capabilities/README.md) for focused authoring techniques. Before adapting an example, use [diagram selection](../references/semantic-patterns.md#choose-by-the-readers-question) to match the reader's question to a diagram type, then choose a suitable example.

Each JSON has a note explaining its composition, animation stages and static export states. Adapt examples using the user's sources; fictional scenario data is only a starting point.

## Run and inspect

Use Node 20+ and npm. Replace `<skill-directory>` with the absolute installed path and `<task-workspace>` with a canonical task workspace under `.diagrams/.work/<name>/<task-id>/`. Run from the user's working directory. The example JSON stays unchanged:

```sh
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/complete/project-architecture.json" --name project-architecture --theme dark --svg --time 0 --output "<task-workspace>/history" --browser none
```

This generates JSON, paused offline HTML, SVG and reports without a browser. For a later static export, read the returned `detailsPath`, find the note's named scene in `compilation.beats` by `sceneId`, and choose a compiled time that shows the intended state. Use `compilation.totalDurationMs` for the completed final state. Static exports contain the diagram without playback captions or controls. Supply a prepared Chrome/Chromium executable instead of `none` for HTML capture and request PNG with `--png`. View the generated files after export. See [exports](../references/export.md) and [actual viewing](../references/visual-checks.md).

The examples use dark theme, speed 1 and reduced motion off. Pass `--theme dark` to keep that presentation. Full examples support static reading through a selected overview or key state and animation through the same JSON; do not maintain a separate static copy merely to remove scenes.

## Display conditions and limits

Inspect HTML at 1440 × 1000 CSS pixels and exported images at their reported intrinsic dimensions. Each note states the document's canvas size; fitted and focused states can change the rendered dimensions. Tall HTML diagrams can require vertical page scrolling. Other themes, platforms, smaller placements and host embedding require their own inspection.

View the saved HTML, requested exports and relevant animation stages under the task's actual display conditions. Judge animation pacing and captions through continuous playback. Report the files and stages viewed, and any remaining problems.

## Adapt an example

Copy a selected JSON into the task's editable draft, replace scenario data, measure changed content and inspect affected states and exports. Follow [task workspace rules](../references/tool-contract.md#task-workspace).

Keep the installed JSON unchanged while adapting the task draft. [Execution resources](../resources/README.md) retain the independent measurement input and HTML starter.

## Source provenance

FlowSVG examples retain their MIT attribution and links to the original definitions. [Source records](../resources/teaching-sources.json) contain source commits, JSON hashes and scenario descriptions. The Skill runs installed JSON directly; no SDK source checkout or showcase build is required.
