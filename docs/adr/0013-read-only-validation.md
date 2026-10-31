# ADR 0013: Validate without a design snapshot

- Status: accepted

来源：FlowSVG [`86bb7ad`](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/adr/0013-read-only-validation.md)。本仓保留与 Skill 有关的决策和职责边界。
- Date: 2026-10-30
- Supersedes: only the `validate` revision-allocation behavior retained by [ADR 0010](0010-final-diagram-files-by-default.md).

## Context

Repeated draft checks copied identical JSON and wrote two reports per invocation. These files represent a check, rather than a design change. The user approved reducing this work while retaining all required diagnostics and quality coverage. The approved tickets and CLI/test boundaries are recorded in [原仓历史工作记录](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/.scratch/flowsvg-authoring-lightweight/README.md).

## Decision

`validate --input` reads the exact input bytes once and returns their identity, the actual SDK baseline, structural checks and finite layout diagnostics on stdout. It writes no diagram snapshot, report or delivery file and starts no browser. Runtime preparation may update its isolated dependency cache. The caller keeps the draft and can explicitly redirect diagnostics into the task workspace.

`validate --from <revision> --name <name> --output <history-root>` selects only an explicit saved source, verifies canonical scope and the registered input hash, and runs the same checks. The report records that source under `validation.sourceRevision`. In both forms, `revision` remains null and `validation.snapshotCreated` is false. Validation-run warnings use `sourceRevision: null`: no new persisted warning report exists to authorize a formal decision.

`author` continues to save and check the bytes actually supplied to that invocation. Formal decisions reference exact warnings in real saved authoring reports under the selected parent ancestry. Draft validation cannot record decisions or source metadata. Changed bytes, SDK or theme receive current checks and cannot inherit an earlier validation pass.

## Consequences

Repeated checks retain their full computation and diagnostic coverage while avoiding design-history writes. A failed or cancelled validation returns its state on stdout and preserves the original draft. Saved authoring failures retain existing recovery behavior. Validation is not a visual check or a quality approval; [ADR 0011](0011-delivery-quality-follows-required-checks.md) and final task cleanup remain in force.
