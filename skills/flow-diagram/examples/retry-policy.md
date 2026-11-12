# Finite retry policy

[Diagram source](retry-policy.json)

**Question:** When does an attempt succeed, wait to retry, or stop?

**Fictional source facts:** This fictional policy permits at most three total attempts including the first. Success exits. A temporary error below attempt three waits, then tries again. A temporary error on attempt three stops with failure. Waiting duration and non-temporary-error handling are unknown.

**Why this composition:** The attempt is the central state; success sits above, failure to the right, and waiting below. Horizontal and vertical exits remain separate. The return uses an outer orthogonal lane and intentionally converges with the start at the attempt’s left port. Borderless notes beside the paths carry long conditions without crowding a shared edge label; those notes are annotations, not extra states.

Relationship words are borderless annotations in the source geometry, placed clear of their paths. These annotations explain the existing relations; they are not additional states.

**Primary display:** Light background, 1240 × 590 units; PNG displayed at 1100 × 523 CSS px. The intended offline HTML viewport is 1440 × 1000. This diagram is static; the SDK page controls do not create animation.

**Use and limits:** Use for a static retry-policy overview where all exit conditions must remain visible. The graph does not implement a counter, execute the policy, model cancellation, or simulate retries.

For current viewing coverage and unperformed checks, read the [library viewing scope](README.md#display-conditions-and-limits).
