# Target-size artifact evidence

Before submitting any review, read [the complete field contracts and unviewed template workflow](review-inputs.md). Invalid review input is rejected before version allocation or rendering.
Use this workflow when SVG or PNG is part of the requested final delivery. Timeline sampling and `--visual-review` remain separate: they review sampled SDK frames, not the actual static file at its target width. A generated image does not establish actual viewing or complete `quality`.

`qualityCoverage` lists each missing static surface with its artifact ID, expected display dimensions and carrying backdrop. Without registered evidence, these dimensions are the file's native size and the backdrop follows the resolved theme. The reason includes explicit settings and the next capture step. Ordinary preview screenshots retain their own viewport; they do not cover the actual static file, even after HTML or preview review. Capture at a user-selected width requires explicit `--artifact-preview-settings`; later revisions retain existing evidence with its original display scope but do not automatically capture new evidence.

## Collect evidence from existing artifacts

1. Select the explicit diagram subject with `--from <revision>`, its name and task history root. Use `evidence`; existing SVG/PNG files remain the capture source.
2. When the delivery needs specific widths or backgrounds, save `{"items":[{"artifactId":"registered artifact ID","displayWidth":720,"backdrop":"#ffffff"}]}` and pass `--artifact-preview-settings <json>`. Each item requires a positive integer CSS width and opaque `#RRGGBB` backdrop. Duplicate surfaces fail. Each image must fit 8192 pixels per side and 32,000,000 pixels.
3. Run `evidence --from <revision> --name <same-name> --output <task-workspace>/history --browser <prepared-executable>`, with the settings option when needed. The result lists the complete requested conditions, per-item `operationStatus`, and any independent `record.id`.
4. Open newly captured PNGs with the host image viewer. Record unavailable viewing explicitly. Generate and fill a review template only after actual viewing.

The default request includes every selected SVG/PNG, including named exports. An artifact without recorded or explicit conditions uses its rounded native CSS width and resolved theme backdrop (`#ffffff` for light, `#111827` for dark). Explicit conditions set the first target for their artifact; other artifacts keep their defaults. Later requests retain all conditions already requested in the unchanged source context. An explicit subset cannot remove them. Height follows the original intrinsic ratio.

The command verifies original file bytes and reusable screenshot bytes, source JSON, locked SDK version/integrity, theme, selected export time/camera/background, intrinsic and display dimensions, backdrop, capture method and saved host rendering metadata. A valid repeated request starts no runtime or browser and writes no files. A new condition captures only its missing surface. Source or record metadata changes reject the operation; changed diagram content requires a new authoring snapshot and fresh applicable evidence.

New captures and terminal operation facts live in `<history-root>/<name>/records/evidence/evidence-<uuid>/`, outside `v###`. Only missing PNGs and one immutable `record.json` are written. The source report remains unchanged. Each reused item retains its original evidence ID, locator and actual-viewing identity. New evidence starts unviewed. `revision` is null; `sourceRevision` remains the real diagram revision. `evidence-reused` can return `record: null` when existing valid sources jointly cover the request; use the returned `evidenceSources` to select each source for review.

Transparent artifacts are decoded from the actual SVG/PNG and drawn onto a canvas at the target CSS dimensions and backdrop, then directly encoded as PNG. Device scale factor is 1. This avoids page-screenshot readback that can omit or duplicate scaled tiles. Recorded browser version, capture method and font readiness describe this capture; they do not guarantee identical glyphs across hosts or prove readability.

After a valid request is planned, browser lookup or launch failures (including an invalid explicit executable), capture failure and cancellation retain the complete requested condition set, complete source files, prior evidence, completed new captures and every requested condition. The terminal record distinguishes reused, captured, not-run, failed and cancelled items. A later authorized retry verifies and reuses completed images, then captures missing conditions. A missing or damaged evidence PNG becomes an explicit coverage gap and can be recaptured. Original source/artifact, path or identity metadata corruption remains a blocking error.

## Record actual viewing independently

After viewing each listed screenshot, save an attestation:

```json
{
  "reviewer":"the model and host that actually viewed these images",
  "viewed":true,
  "items":[{
    "evidenceId":"copy from artifactEvidence.items",
    "sha256":"copy the screenshot's exact SHA-256",
    "observations":{
      "readingOrder":"Describe actual entry point and relationship directions.",
      "density":"Describe readability at the recorded CSS width.",
      "occlusion":"Describe visible clipping or overlap within this surface.",
      "narrative":"Describe the selected state and its source-supported meaning."
    },
    "issues":[]
  }]
}
```

Use `issues: []` only when that viewed surface has no observed issue. Otherwise use objects with `reason` and `nextStep` strings. Offer candidate corrections, ask when a choice changes meaning, and apply already authorized mechanical corrections in a new revision.

Run `review --from <diagram-subject-revision> --evidence-from <evidence-source> --name <same-name> --output <same-root> --artifact-review <review.json>`. The diagram subject, original artifact version and evidence source are explicit and can differ. Omit `--evidence-from` only when the subject itself registered the evidence. Maintain the same source JSON bytes, theme and locked SDK identity. This appends one review record without allocating a diagram version, preparing the SDK, compiling, generating HTML, exporting, starting a browser or capturing an image. A repeated identical submission revalidates and reuses the record without writes. The tool verifies original artifacts, saved settings, screenshot bytes and both revision path scopes. Changed files, context, rendering parameters, missing registration and escaped paths are rejected.

`visual.artifactReviews` contains only the identified viewed evidence. `artifactEvidenceCoverage` lists requested surfaces and counts viewed/unviewed surfaces. `checks.artifactVisual: reviewed` describes that scope; it does not change sampled `viewedFrames`, imply other sizes were seen, or complete the diagram's quality. Original files and reports remain unchanged during the task. [Finalization](tool-contract.md#finalize-the-task) retains final files and review facts, then removes temporary evidence unless the user requested history.

Generate the unviewed form with `review-template --from <diagram-subject-revision> --evidence-from <evidence-source> --name <same-name> --output <same-root> --kind artifact --template <new-task-file.json>`. Actual viewing and observations stay caller-supplied. Multiple registered surfaces from that selected source can share one form; it can be submitted with HTML and preview forms in one `review` call.

Each independent artifact material stores `source: {kind: "revision" | "evidence-record", id, sourceRevision, reportSha256}` separately from the subject. Every accepted entry retains its original artifact revision, evidence source, source/SDK/theme, export time/camera/background, intrinsic and target dimensions, carrying backdrop and both hashes. Finalization verifies those files again and retains all identities, attestations and issues in the portable report. All requested surfaces remain required, including unviewed ones. A later clean observation does not erase an earlier issue. Original evidence remains unchanged until successful scoped task cleanup.

Independent evidence record IDs can be passed directly to `--evidence-from`. Finalization loads all applicable requests even when no review exists. It retains complete conditions, operation outcomes, identities and review issues in the portable report. Damaged screenshots invalidate only their affected observation entries for coverage. Other valid surfaces, HTML states and preview frames in the same combined review remain effective; the invalid observations and issues remain visible as history. A fresh verified capture and actual review can restore coverage.

When an invalid saved observation or independent entry still has issues, `qualityCoverage` includes a `review-issues` requirement with `needs-user-decision` and the original issue facts. Missing images cannot resolve those issues. Invalid entries without issues contribute only their missing viewing coverage.

Required surfaces report `evidenceStatus` separately from quality. Byte-verified images keep active `evidenceId` values. A damaged image reports `evidenceStatus: "invalid"`, `evidenceId: null`, its validation reason and an exact-condition recapture command. A source registration alone retains the required surface and its original registration ID, without claiming a usable capture. Valid reviewed legacy images continue to count.
