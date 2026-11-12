# Execution resources

These inputs support installed commands and are separate from selected teaching diagrams.

- [HTML page starter](html-page.html): copy it into the task workspace and adapt the page through the [editable-page contract](../references/tool-contract.md#editable-html-pages).
- [Multiple-version content input](content-measurement.json): run `measure --input <skill-directory>/resources/content-measurement.json` to inspect content-height estimates at one fixed width. See [content measurement](../references/tool-contract.md#content-measurement) for its limits.
- [Teaching sources](teaching-sources.json): scoped fictional facts and unknowns for the selected examples; replace these records with actual sources for real tasks.
- [Complete layout input and plan](../references/layout-plan.md#complete-teaching-input): save the two inline JSON blocks in the task workspace, then run the [layout workflow](../references/static-layout.md#layout-plan-workflow).

The estimates and successful execution do not establish visual quality. Use the [teaching examples](../examples/README.md) for reusable complete compositions.
