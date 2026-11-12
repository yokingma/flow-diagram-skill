# 0019: Separate visual inspection from formal review

Status: accepted

Date: 2026-11-11

The user confirmed one default authoring workflow that reports machine checks, actual viewing scope, discovered issues and unperformed checks without requiring registered review records or a universal quality pass. Explicit requests for traceable review or audit add evidence and review steps to the current task, retaining the source identities, display conditions, observations and coverage required by ADRs [0014](0014-independent-review-records.md) and [0015](0015-on-demand-artifact-evidence.md). Animation, complex architecture or SVG/PNG exports do not by themselves request those additional steps.

This narrows the default application of [ADR 0011](0011-delivery-quality-follows-required-checks.md) while preserving its distinction between file completion and inspection coverage. A generated screenshot is not actual viewing, an absent formal review record does not establish absent viewing, and authoring without completed formal review cannot claim it passed. The trade-off is less registered evidence by default in exchange for fewer mandatory forms and repeated inspection steps.

The primary goal is accurate, understandable and visually clear diagrams. Existing design guidance supports authoring and visual revision; it is not an acceptance gate or a compliance checklist. Viewers judge the artifacts against the reader's question and display conditions. Cost measurements describe workflow overhead; they do not cap necessary reading, rendering or revision, and lower token use alone does not establish success.

CLI diagnostics report verifiable input, execution and artifact failures. On-demand geometry and measurement results state their method, objects, time and scope; estimates and sampling remain explicitly limited. A computed box intersection does not establish visible obstruction. Remove heuristic design diagnostics, including short-line and vertical-text patterns, and their approval or exception gates. Auxiliary estimates do not block height application, authoring or publication. Actual operation failures still fail.

Users or LLMs judge layout, hierarchy, connections, readability and narrative by viewing the rendered artifacts against the existing design standards. Formal review adds source, record and coverage verification; its design observations and conclusions still belong to the viewer. This narrows the diagnostic and warning-decision responsibilities retained by ADRs [0008](0008-shared-sdk-geometry-diagnostics.md) and [0013](0013-read-only-validation.md). Machine success and evidence coverage do not establish design approval.

The CLI implements this boundary through explicit geometry and formal-review requests. Installed guidance uses actual viewing and visual revision by default; formal records retain traceable scope without a design-approval gate.
