# 0017: Skill owns HTML page composition

Status: accepted

Date: 2026-11-05

Global titles, introductions and supporting explanations need page typography and responsive layout independent of diagram coordinates. The user confirmed that this composition belongs to the Skill, that Agents author its HTML/CSS, and that the SDK and its exact runtime baseline remain unchanged. SDK rendering, playback, captions and controls retain their existing responsibilities under [ADR 0016](0016-independent-sdk-and-skill-repositories.md).

The Skill owns the outer page and embeds the complete offline output of public `renderHtml` in an iframe. This keeps the SDK output opaque: the Skill neither extracts private playback assets nor patches the exporter's internal script or markup structure. The alternative of bundling the public browser entry would introduce additional packaging work; extending the SDK to own explanatory page layout would cross the agreed product boundary. The user explicitly selected the embedded playback area.

The delivered HTML is both the offline playback file and the editable page. Keep the diagram JSON and reports alongside it, with no second page-source HTML or duplicate page-description JSON. Skill-owned managed regions associate the page with its diagram and runtime identity. Agents edit surrounding content and styles; tools validate and update the declared integration regions. A revised page belongs to a new diagram revision and receives checks against its actual bytes. Retained mismatches must fail explicitly rather than display stale diagram data.

Browser checks operate the selected iframe's player and inspect the complete outer page. Full-file identity and whole-page evidence continue to govern review and publication under [ADR 0014](0014-independent-review-records.md); capture alone does not establish actual viewing. Page-preserving continuation extends [ADR 0010](0010-final-diagram-files-by-default.md): after scoped task cleanup, the final HTML, diagram JSON and portable report must suffice to continue editing in a new task.

The trade-off is an additional Skill integration contract and iframe sizing and inspection work. In return, Agents can compose readable pages while the SDK remains a separately versioned public dependency. Default diagram exports remain independent of page prose; each requested standalone image still needs its own necessary context and inspection.
