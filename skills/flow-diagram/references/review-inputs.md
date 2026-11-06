# Review input contracts

Read this reference before generating or submitting preview, HTML or formal-image reviews. A review records observations from actual viewing. It does not establish user aesthetic approval. Templates start unviewed and cannot pass submission validation.

## Select the source and generate a template

Use the explicit saved evidence revision, diagram name and history root. No command infers the latest revision. Preview and HTML reviews select the revision that captured those images. Formal-image reviews keep `--from` as the diagram subject; `--evidence-from <revision-or-evidence-record>` selects another registered evidence source when needed. The source must stay in the same task/diagram and match the subject source bytes, theme and locked SDK. Original artifact revision remains independently recorded in each evidence item.

```sh
node <skill-directory>/scripts/flowsvg.mjs review-template \
  --name example --from v001 \
  --output .diagrams/.work/example/task/history \
  --kind html --template .diagrams/.work/example/task/html-review.json
```

`--kind` is `visual`, `html` or `artifact`. The source must contain registered, readable evidence with matching hashes. The tool prepopulates exact IDs and SHA-256 values. The result identifies the source revision, input hash, SDK and theme. It writes only the explicit new template file, inside the same canonical `.diagrams/.work/<name>/<task>/` workspace. The target parent must already exist. Existing targets, symlink escapes, cross-task destinations and absent evidence fail without changing source files. Template generation does not allocate a diagram revision, prepare the runtime, render HTML, open a browser or capture images.

The form contains `reviewer: ""`, `viewed: false`, empty observations and `issues: []`. Open the actual identified images, then fill the reviewer, all observations and discovered issues. Set `viewed: true` only after actual viewing. Keep unavailable viewing explicit instead of submitting the template as a completed review.

## Shared field rules

All review roots are objects with exactly `reviewer`, `viewed`, and the kind-specific array. `reviewer` is a nonempty string naming the viewer/model and host; `viewed` must be the boolean `true`. Each kind-specific array is nonempty. Each entry is an object with exactly its ID field, `sha256`, `observations`, and `issues`. IDs are nonempty strings, unique within the array. `sha256` is the exact 64-character lowercase hexadecimal screenshot hash.

`observations` contains exactly four nonempty strings:

| Field | What to describe from the actual viewed image |
| --- | --- |
| `readingOrder` | Entry point, hierarchy and relationship directions; for repeated cards, compare title starts and number/text reading edges. |
| `density` | Text readability and information density at the recorded display size; identify crowded tags, fragmented wording or repeated categories. |
| `occlusion` | Visible clipping, overlap and connection clearance; compare card padding, adjacent gaps and short-label centering where relevant. |
| `narrative` | Meaning of the viewed state and consistency with the intended explanation, including parallel versus sequential organization and unknown resource status. |

`issues` is an explicit array. Use `[]` when no issue was observed in that viewed scope. Each issue is an object with exactly two nonempty strings: `reason` and `nextStep`. Unknown fields, missing required fields, incorrect types, duplicate IDs and blank strings fail with a field-level diagnostic. Comments and trailing commas are invalid JSON.

## Preview frames

Use `frames`, with `id` from `visual.capturedFrames`. A preview reviews sampled SDK frames, including any explicitly labeled overview projection. It does not cover the actual offline HTML, formal images, unlisted times or continuous playback.

```json
{
  "reviewer": "viewer and host",
  "viewed": true,
  "frames": [{
    "id": "copy captured frame ID",
    "sha256": "copy exact screenshot SHA-256",
    "observations": {
      "readingOrder": "Describe the actual reading order.",
      "density": "Describe readability at this size.",
      "occlusion": "Describe visible overlaps or their absence.",
      "narrative": "Describe this sampled state's meaning."
    },
    "issues": []
  }]
}
```

## Actual offline HTML

Use `states`, with `id` from `htmlInspection.states`. The other entry fields follow the preview example. The tool checks the actual saved `diagram.html` hash and listed screenshot bytes against the registered source. Initial paused state, offline checks, playback facts and display scope remain separate recorded facts. Viewing listed HTML screenshots does not establish continuous visual playback inspection.

```json
{
  "reviewer": "viewer and host",
  "viewed": true,
  "states": [{
    "id": "copy HTML state ID",
    "sha256": "copy exact screenshot SHA-256",
    "observations": {
      "readingOrder": "Describe the actual reading order.",
      "density": "Describe readability at this size.",
      "occlusion": "Describe visible overlaps or their absence.",
      "narrative": "Describe the delivered HTML state."
    },
    "issues": [{ "reason": "Describe an observed issue.", "nextStep": "Describe the proposed correction or decision." }]
  }]
}
```

## Formal SVG/PNG evidence

Use `items`, with `evidenceId` from `artifactEvidence.items`. The tool verifies the original artifact, its source and rendering parameters, saved settings, target dimensions, backdrop, screenshot identity and canonical source paths. Reviewing one format, time, display size or backdrop does not cover another surface. See [formal-image evidence](artifact-evidence.md).

```json
{
  "reviewer": "viewer and host",
  "viewed": true,
  "items": [{
    "evidenceId": "copy registered evidence ID",
    "sha256": "copy exact evidence PNG SHA-256",
    "observations": {
      "readingOrder": "Describe the actual reading order.",
      "density": "Describe readability at the recorded CSS width.",
      "occlusion": "Describe visible overlaps or their absence.",
      "narrative": "Describe the exported state."
    },
    "issues": []
  }]
}
```

## Submit filled HTML and preview forms

Use the independent `review` operation after actual viewing:

```sh
node <skill-directory>/scripts/flowsvg.mjs review \
  --name example --from v001 --output .diagrams/.work/example/task/history \
  --html-review .diagrams/.work/example/task/html-review.json \
  --visual-review .diagrams/.work/example/task/visual-review.json
```

Provide any of the three review kinds. HTML and preview use the explicit subject revision's existing evidence. Add `--artifact-review <json>` for formal images and `--evidence-from <revision-or-evidence-record>` when their evidence source differs. The selector applies only to artifact inputs and defaults to `--from`. One combined submission validates every kind before writing a record. `review` accepts source selection and review inputs only; it rejects rendering, export, browser, input-edit and decision flags. No command infers the latest revision. The tool verifies all forms, saved source bytes, locked SDK, HTML and screenshot identities before publishing one independent record. It does not create a diagram revision, copy JSON/HTML, prepare the runtime, compile, render, launch a browser or capture screenshots. New evidence must be generated and actually viewed before submitting its review.

The result has `revision: null`, `sourceRevision`, `record.id`, `record.path`, `record.reused`, aggregate `checks`, `completion`, `qualityCoverage` and `reviewRecords`. A record is stored at `<history-root>/<name>/records/reviews/review-<sha256>.json`, separate from `v###`. It retains subject input/theme/SDK identity, original report hash, exact reviewed IDs/hashes, viewer, observations and issues. Formal-image materials also store a separate source locator `{kind: "revision" | "evidence-record", id, sourceRevision, reportSha256}`; its report hash and complete original-artifact/evidence identities are rechecked on reuse and finalization. It contains no copied diagram or full report. Semantic identity ignores input JSON whitespace and object-key order; entries are sorted by their evidence ID. An identical submission rechecks its sources and reuses the same record without writes. Different observations append a new record. Complete files are published atomically; failed or cancelled submission does not publish a partial review.

Aggregation considers only the selected revision and its real ancestry with unchanged input/theme/SDK. Every applicable record and its source evidence is reverified. HTML viewing applies only to the exact delivered HTML hash, matching display conditions, and required point IDs and times. Repeated viewing of one state counts once. Coverage keeps the selected required plan, while attestations retain all original source identities. Independent record IDs considered and adopted are explicit. The union preserves every still-valid issue; a later clean observation cannot erase an earlier issue or imply a user decision. Source, artifact, path or record-metadata corruption fails with `REVIEW_RECORD_INVALID` and preserves the task and prior delivery. Missing or damaged formal-image PNGs retain invalid entry history and issues while removing only those entries from viewing coverage. Valid entries from the same material and valid HTML/preview materials in a combined record continue to count. Complete requested source conditions remain required even when that material has no valid viewing entries. Recapture and actually review the affected surface to restore coverage.

`finalize --from <diagram-revision>` loads these records, recalculates coverage and publishes a self-contained report. It keeps all selected and inherited requested exports, then performs the usual scoped task cleanup. Partial viewing remains incomplete. Browser playback facts, sampled visual inspection and user aesthetic judgment remain distinct.

## Formal-image submission and author preflight

Formal-image input retains the exact `items` contract above. Submit it with `review --from <diagram-subject-revision> --evidence-from <evidence-revision> --name <same-name> --output <same-root> --artifact-review <json>`. See [formal-image evidence](artifact-evidence.md#record-actual-viewing-independently) for original artifact and evidence-source selection. Each format, export time, display size and backdrop remains a separate required surface. Partial review cannot reduce that set; exact repeats do not expand it. All issue history remains visible, including later clean observations.

The existing author review options remain preflighted: all supplied forms and evidence are checked before revision allocation, runtime preparation or rendering. An invalid submission returns a kind-specific `*_REVIEW_INVALID` diagnostic and no new revision. A valid author submission still follows the authoring path. Use independent `review` for existing evidence of all three kinds.

Authoring uses `--theme`, then the input document's theme, then `light`. If a source used an explicit theme override, author review submissions must pass that original override. Independent `review` uses the verified source context directly. Input bytes, saved source and locked SDK must match; missing viewing cannot be replaced by an attestation.

When an invalid saved observation or independent entry still has issues, `qualityCoverage` includes a `review-issues` requirement with `needs-user-decision` and the original issue facts. Missing images cannot resolve those issues. Invalid entries without issues contribute only their missing viewing coverage.
