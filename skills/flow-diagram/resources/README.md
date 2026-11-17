# Execution resources

These inputs support installed commands and are separate from selected teaching diagrams.

- [HTML page starter](html-page.html): copy it into the task workspace and adapt the page through the [editable-page contract](../references/tool-contract.md#editable-html-pages).
- [Multiple-version content input](content-measurement.json): run `measure --input <skill-directory>/resources/content-measurement.json` to inspect content-height estimates at one fixed width. See [content measurement](../references/tool-contract.md#content-measurement) for its limits.
- [Teaching sources](teaching-sources.json): scoped upstream source identities and invented scenario descriptions for complete and capability examples; replace these records with actual sources for real tasks.
- [Complete layout input and plan](../references/layout-plan.md#complete-teaching-input): save the two inline JSON blocks in the task workspace, then run the [layout workflow](../references/static-layout.md#layout-plan-workflow).

Use the [diagram examples](../examples/README.md) for complete compositions, and inspect the rendered result at its intended display size.
