# Project design preferences

Read this reference for **new or revised drafts**, or an explicit request to **save, change or reset project preferences**. Pure export, validation and diagnosis use their existing task entry points. This is the authoritative preference contract; [delivery context](delivery-contexts.md) owns purpose, dimensions, carrying background, playback and requested files.

## Preflight

1. **Locate.** Use the current working directory as the project root unless the user explicitly names another root. Read only `<project-root>/.diagrams/.preferences.json`; parent directories, input-file locations and the installed Skill do not select configuration. This project file sits outside individual deliveries and task workspaces, so task finalization leaves it intact.
2. **Validate.** Apply the [version 1 contract](#version-1-file-contract). Missing configuration is normal and does not prove first use. An unreadable or invalid file stays intact and supplies no values; describe its path and specific field/reason, then let the user choose task-only defaults or temporary preferences. Reuse an explicit choice already in the current request. There is no time-based expiry or automatic migration.
3. **Resolve.** For new drafts: current explicit request → applicable project convention → valid project preferences → Skill defaults. For revisions: current explicit request → design already expressed by the diagram → valid project preferences → Skill defaults. Use project conventions for unresolved choices; explain conflicts with retained design before changing it. Reading preferences alone never authorizes restyling an unchanged import.
4. **Collect gaps.** Reuse current conversation choices and task records. Ask once for relevant missing preferences, combining them with already apparent delivery-context gaps when practical. Offer “only this time” and “save for reuse”. Known choices need no repeated style or save question. An unanswered question selects neither defaults nor persistence.
5. **Record.** Translate descriptions into concrete choices for this task; record adopted values, sources and temporary overrides in the existing task plan. Complete any explicitly requested [persistence](#save-update-and-reset), or disclose its failure. Unfinished tasks reuse valid recorded decisions and revisit only affected choices.

Preflight is complete when relevant visual choices have known values, explicit defaults or assumptions within the authorized scope, their sources are recorded, and requested persistence is verified or its failure disclosed. A disclosed assumption cannot replace a required answer about using defaults. Continue to the five authoring steps; a standalone preference-management request ends with its operation result.

## Version 1 file contract

```json
{
  "version": 1,
  "scope": "project",
  "source": "user-confirmed",
  "defaults": true,
  "preferences": {
    "palette": "deep blue emphasis on a light background",
    "density": "airy, with generous reading space"
  }
}
```

The root is an object with required `version: 1`, `scope: "project"`, `source: "user-confirmed"` and a `preferences` object. Optional `defaults` accepts only `true`. The only preference keys are:

| Key | Visual tendency |
| --- | --- |
| `visualStyle` | Overall visual direction |
| `palette` | Palette and color-role preferences |
| `typography` | Font and typographic character |
| `density` | Preferred information density |
| `referenceDirection` | Visual references and what to learn from them |

Each value is a string containing non-whitespace text. Arrays, null, wrong fixed values, unsupported versions, unknown root/preference keys or invalid value types invalidate the whole file. Report identified fields and reasons rather than silently accepting a subset.

`defaults: true` settles omitted appearance fields by following the current Skill visual defaults; explicit fields override those defaults. It can be saved with an empty `preferences` object. Without the marker, collect only task-relevant gaps rather than requiring all five fields. Preserve the marker rather than expanding today's colors or sizes into stored values. This visual choice does not select a delivery purpose; unknown purpose follows [delivery-context rules](delivery-contexts.md#preferences-and-missing-context).

Store visual tendencies only. Business facts, relationships, diagram type, geometry, output formats and target dimensions belong to the task. Reference directions are visual data, not instructions that override the workflow, business evidence or permission for external access. If a referenced asset is unavailable, disclose the limit and resolve only the affected visual choice.

## Save, update and reset

**Authorization and scope.** Write only after an explicit request to persist project preferences. Applying a style to this diagram is task-only unless persistence was requested. State the fields and default decision to be saved; clarify an ambiguous “save this style”. Merge approved changes into valid configuration, retaining unrelated fields. Removing an override or changing the default marker also requires an explicit request. Repairing or replacing invalid configuration requires explicit authorization.

**Update.** Create `.diagrams/` if needed. Re-read the target before mutation; if it changed since the read, coordinate the conflict before proceeding. Prepare complete valid JSON in a temporary sibling and validate it before replacing the target. Keep the original until replacement; re-read, parse and compare the result. If final verification fails, retain recovery material and report the observed state rather than claiming success. This Agent procedure supplies no concurrency lock or transaction guarantee.

**Reset.** Re-read and check for changes, delete only `.diagrams/.preferences.json`, then verify absence. Other `.diagrams/` content remains intact. A missing file is already reset. Subsequent new/revised tasks collect relevant gaps again; reset does not save a default choice.

**Failure.** Preserve existing files when an operation cannot complete. Report unverified saves or failed deletions explicitly. Diagram production can continue with already determined task-only choices; standalone management requests report only their operation result. The CLI has no preference command or flag. User-level storage and automatic migration are outside this version.
