# Diagram examples

Use [complete examples](complete/README.md) to study composition and animation, or [SDK capabilities](capabilities/README.md) to find a focused document-model example. These are pinned FlowSVG showcase snapshots shared by the upstream Native, React and Vue demos. Start with the reader's question in [diagram selection](../references/semantic-patterns.md#choose-by-the-readers-question); no example supplies facts about the user's system.

Each JSON has an adjacent note with its question, source, composition, animation stages, static reading state, display conditions and limits. [Source records](../resources/teaching-sources.json) distinguish the real SDK architecture from fictional teaching scenarios. Replace assumptions with the user's evidence when adapting a diagram.

## Run and inspect

Use Node 20+ and npm. Replace `<skill-directory>` with the absolute installed path and `<task-workspace>` with a canonical task workspace under `.diagrams/.work/<name>/<task-id>/`. Run from the user's working directory. The example JSON stays unchanged:

```sh
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/complete/project-architecture.json" --name project-architecture --theme dark --svg --time 0 --output "<task-workspace>/history" --browser none
```

This generates JSON, paused offline HTML, SVG and reports without a browser. For a later static export, read the returned `detailsPath`, find the note's named scene in `compilation.beats` by `sceneId`, and choose a compiled time that shows the intended state. Use `compilation.totalDurationMs` for the completed final state. Static exports contain the diagram without playback captions or controls. Supply a prepared Chrome/Chromium executable instead of `none` for HTML capture and request PNG with `--png`. Missing browsers leave those checks unavailable; successful validation, compilation and export do not establish visual quality. See [exports](../references/export.md) and [actual viewing](../references/visual-checks.md).

The upstream host supplies dark theme, speed 1 and reduced motion off. `--theme dark` preserves that presentation without editing snapshot bytes. Full examples support static reading through a selected overview or key state and animation through the same JSON; do not maintain a separate static copy merely to remove scenes.

## Display conditions and limits

Inspect HTML at 1440 × 1000 CSS pixels and exported images at their reported intrinsic dimensions. Each note states the document's canvas size; fitted and focused states can change the rendered dimensions. Tall HTML diagrams can require vertical page scrolling. Other themes, platforms, smaller placements and host embedding require their own inspection.

View the saved HTML, requested exports and relevant animation stages under the task's actual display conditions. Judge animation pacing and captions through continuous playback. Report programmatic checks, actual viewing and remaining gaps separately; source attribution and earlier viewing do not establish acceptance for the current output.

## Adapt an example

Copy a selected JSON into the task's one editable draft, replace source facts, measure changed content and inspect affected states and exports. Keep material findings in one temporary `issues.md`; formal records are only for explicit traceability requests. Follow [task workspace rules](../references/tool-contract.md#task-workspace).

Keep the installed JSON unchanged while adapting the task draft. [Execution resources](../resources/README.md) retain the independent measurement input and HTML starter.

## Snapshot provenance

To trace a snapshot, read its adjacent attribution and [source record](../resources/teaching-sources.json). The note identifies the upstream TypeScript definition, fixed commit, generated JSON path and SHA-256. Native, React and Vue demos share these definitions. Upstream exports are generated with `pnpm --filter @flowsvg/showcase build` after preparing the SDK in that checkout; TypeScript remains the author source.

Skill execution consumes the installed JSON through its exact public SDK runtime. It needs neither the upstream workspace nor private showcase packages. Keep generated previews and run-specific verification records outside the installation unit.
