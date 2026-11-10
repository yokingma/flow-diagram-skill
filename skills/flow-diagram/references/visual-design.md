# Visual design

Use explicit design methods to guide production. Automated checks and AI image inspection help identify defects and provide observations; the user judges the final design. Report tool check results separately from user acceptance.

## Shared quality standards

Apply these standards to the diagram and its node, group and label text across usage contexts. Choose concrete type sizes, colors, spacing, and shapes for the intended context and display size. Supporting information in these standards means diagram-bound text, not outer HTML prose; the page's allowed blocks are fixed by [keep the HTML page minimal](delivery-contexts.md#keep-the-html-page-minimal).

| Standard | Observable result |
| --- | --- |
| Clear hierarchy | The reader can identify the subject and entry point, then distinguish main content, secondary explanations and status tags. Position, type size, weight and color work together to express emphasis. |
| Balanced composition | Grouping, alignment and whitespace have a clear organizing logic. Containers fit their content, and local density supports the overall visual balance. |
| Consistent visual language | Objects with the same role, text roles, tags and connections follow consistent styling rules. Emphasis and state changes have explicit meanings. |
| Readable, structured text | Text and tags are readable at the intended display size. Titles, paragraphs, lists and supporting information have distinct roles. Line breaks preserve meaningful units. |
| Purposeful color | Background, content, emphasis, and status colors have defined roles. Text has sufficient contrast with its carrying background. Important meanings are also expressed through text, shapes, or line styles. |
| Traceable relationships | The reader can follow each connection to its source, destination, and arrowhead, and identify which relationship a label describes. Routes, arrowheads, and label placement work together. |
| Continuous, readable animation | Each stage retains the context needed for understanding. Object identity and the reasons for changes remain clear. Text stays visible long enough to read, and focus changes follow the explanation's sequence. |

## Choose a visual direction

Use the usage context, audience, intended display size, and any user-provided brand requirements or visual references to choose the visual direction. Apply the shared quality standards to every direction.

| Usage context | Visual direction | Design priorities |
| --- | --- | --- |
| Technical documentation and knowledge explanations | Clear, orderly, and easy to consult | Stable grouping and alignment, explicit relationship labels, sufficient context, and a density suitable for repeated reading. |
| Presentations and live explanations | Focused, with distinct hierarchy | Larger text, a clear visual focus, readability at viewing distance, and staged presentation that supports the speaker's explanation. |
| Web and article illustrations | Coordinated with the surrounding content and column width | Composition, text, and tags adapted to the actual embedded size. Define the diagram's explanatory scope in relation to the surrounding prose. |
| Interactive explanations and demonstrations | Clear states and continuous changes | An understandable initial view, readable paused states, focus and emphasis that follow the explanation, and controls coordinated with the content. |

Combine contexts when the diagram serves several uses. Preserve a consistent visual language while adapting display size and information organization for each use.

Translate the direction into coordinated choices:

- **Typography.** Use the [typography and content layout recipe](#typography-and-content-layout) to define text roles and content structures.
- **Color roles.** Use [color roles and palette](#color-roles-and-palette) to assign colors by purpose and reuse them consistently.
- **Space and containers.** Use [spacing and spatial hierarchy](#spacing-and-spatial-hierarchy) to coordinate alignment, spacing, and whitespace. Choose canvas proportions, shapes, and borders for the visual direction.
- **Content components.** Use [cards, groups, and tags](#cards-groups-and-tags) to define reusable structures for objects, membership, and attributes.
- **Connections.** Use [connections and relationship labels](#connections-and-relationship-labels) to coordinate routing, line styles, and label placement.
- **Animation.** Use [animation rhythm and visual continuity](#animation-rhythm-and-visual-continuity) to plan explanatory stages, transitions, and reading pauses.

Use [delivery contexts](delivery-contexts.md) for concrete canvas and typography starting points and display-size requirements. Map the choices to supported fields in the [document model](document-model.md); for animation, also read [timeline](timeline.md).

Before implementation, record the visual choices in the task's existing plan or draft: text roles and sizes, palette values by role, spacing values, card and tag structures, and connection styles. For animation, include the stage plan. These choices must fit the usage context and the shared quality standards.

## Design methods and recipes

### Composition recipes

Select a recipe when its structure matches the explanation. Keep the semantic pattern's source-supported objects and relationships; the recipe chooses their visual organization. Record concrete choices in the existing plan or draft. Combine recipes or use direct coordinates when needed. Static and animated presentation remain separate choices.

#### Capability inventory without runtime edges

Use when the reader needs to compare capabilities or ownership rather than follow a process. Structure: `scope heading / comparable capability cards / explicit status or limits`.

Choose a shared title position, body hierarchy and card rhythm. Name the basis of grouping. Use explicit text for proposed, available and unknown states, including access or authorization that remains undecided. Add an edge only when this page must explain a source-supported relationship; a row of cards supplies no execution order.

Starting point: [recipe-capability-overview.json](../examples/recipe-capability-overview.json). Its parallel cards compare three responsibilities and intentionally contain no edges. See [checked conditions](../examples/README.md#presentation-recipe-checks).

#### Source mapping and service cards

Use when the page must connect a compact account of sources or transformed needs to comparable services. Structure: `source heading / aligned source rows → labelled mapping channel → service heading / repeated cards`.

1. Allocate the actual target display area using [delivery context](delivery-contexts.md) before laying out the two regions. Reserve a channel for the mapping explanation and keep headings on their regions' outer left edges.
2. Give repeated source rows a shared number column, text column and row rhythm. Keep `number + object + context` as distinct roles; use `source heading + corresponding result` when the explanation is a mapping. A number describes only the quantity established by the source, never maturity or delivery commitment.
3. Give services a title, core explanation and optional supporting state. Use body text for long names and sentences. Repeating a card title as a pill adds density without a new meaning; retain tags only for a distinct category, attribute or status.

For short labels whose shape safe area prevents the intended reading edge, consider a border group with a separate borderless text rect. Measure its actual typography, account for parent-local coordinates and inspect the result. Ordinary structured cards remain suitable when their safe area fits the design; this composition is an option, not a replacement for all rounded nodes.

Starting point: [recipe-source-services.json](../examples/recipe-source-services.json). The mapping is explanatory, not a runtime call. Its numbers, spacing and content are teaching choices; preserve the user's facts when adapting it. See [checked conditions](../examples/README.md#presentation-recipe-checks).

#### Layered architecture and sidebar

Use for comparing layers with repeated columns and governance or explanatory notes beside them. Structure: `layer heading / aligned columns → relationship channel → next layer`, with the sidebar outside the main channels.

1. Select [relationship scope and endpoints](semantic-patterns.md#relationship-scope-and-endpoints), then fix the main columns and reserve group-heading space. Align comparable card edges and title starts across layers.
2. Place cross-layer endpoints and allocate label or explanation space before placing the sidebar. Use an unlabelled arrow plus a nearby explanation when a short vertical path cannot carry the label legibly.
3. Place the sidebar beyond those channels. Its heading and content must state whether it expresses membership, governance or commentary; position alone does not establish a runtime dependency.

Choose column widths from content and display width. Apply the [spacing system](#spacing-and-spatial-hierarchy) to heading areas, padding and channels. Recompute affected layers when widths, labels or sidebar content change. Preserve layer order without inventing call timing.

Design starting point: [recipe-layered-architecture.json](../examples/recipe-layered-architecture.json), derived from the existing layered teaching example. Its annotation nodes describe the two existing cross-layer relations. See [sample conditions and observations](../examples/README.md#recipe-display-checks) before reusing its geometry.

#### Process with branches and returns

Use for a source-supported process with conditional branches or a return path. Structure: `entry → decision stage → result`, with a separate branch and an outer return channel.

1. Set one main reading direction and identify each branch's source, destination and condition.
2. Reserve separate branch channels and keep condition labels close to their paths. Place the return outside the forward sequence, with distinct entry and exit ports where possible.
3. Trace all paths to their arrowheads in the paused overview. Keep incoming paths distinguishable when they converge on one port; explain only merges supported by the source.

Start with direct forward paths and a curved return when that creates separation. Adjust ports and channels together if a stage moves. A return does not imply a retry count, delay or guarantee of success. The static recipe can also organize key paused states in an animated explanation.

Design starting point: [recipe-process-return.json](../examples/recipe-process-return.json), an explicit teaching extension of the basic collect/review/archive sample. Its pass, revision and resubmission conditions are invented teaching facts, not inferred behavior of the original example. See [sample conditions and observations](../examples/README.md#recipe-display-checks).

#### Repeated cards and longer content

After [content placement](delivery-contexts.md#content-placement) assigns necessary text to diagram objects, use for comparable objects that need titles, explanations, lists and short tags. Structure: `title / core explanation / consistent list-and-tag area`, repeated along a stable alignment grid.

1. Choose card width and text roles for the target display width. Use a stable left reading edge for longer content and the same content order for comparable cards.
2. Measure every card at its final width and typography. For comparison cards, choose a shared height that contains the largest result plus intentional whitespace. Different roles or content may retain different heights.
3. Recompute the surrounding row and group after content changes. Adjust width or organization before considering content removal; follow source-fidelity decisions when meaning would change.

Use numbered lists for sequences and bullets for parallel points. Keep tags short, near their content and less prominent than titles. Equal heights are a comparison choice, not a reason to shrink text, remove facts or enforce a fixed height-difference threshold.

Design starting point: [recipe-content-cards.json](../examples/recipe-content-cards.json), a static comparison of three authoring concerns using titles, paragraphs, bullet lists and pill tags. Its horizontal order does not establish execution dependencies. See [sample conditions and observations](../examples/README.md#recipe-display-checks).

#### Parameter choices and scale

Use the existing body-size spacing system below rather than a second fixed table. Layout's group padding of 16 and heading reserve of 32 are runtime defaults, not universal visual minima; a layer gap of 36 is an example starting value, not a runtime default. Heading reserve is not a font size or wrapping estimate. Title/body combinations such as 19:15 or 18:14 are limited-sample starting values only; record their display conditions before making a readability claim.

Diagram units shrink with the displayed image. At a 720 CSS-pixel display width, an unzoomed 1280-unit-wide image scales 15-unit text to about 8.4 CSS pixels. Higher file resolution does not enlarge that text. Recheck the actual target size when changing the canvas, placement or content.

### Typography and content layout

Choose the body-text size for the usage context and intended display size, using [delivery contexts](delivery-contexts.md) for starting points. Coordinate the other text roles around that baseline.

| Text role | Purpose | Treatment |
| --- | --- | --- |
| Diagram title | State what the whole diagram explains | Give it the highest text hierarchy, concise wording, and clear separation from the main composition. |
| Node title | Identify an object, stage, or concept | Make it more prominent than body text. Use consistent size, weight, and position across comparable nodes. |
| Body text | Explain responsibilities, behavior, or details | Use it as the reading baseline. Left-align longer content; short names can be centered. |
| Supporting information | Provide conditions, units, notes, or tags | Give it less visual weight than body text while keeping it readable at the target size. |

Style connection labels and pill tags for their specific roles. Keep text styling consistent across comparable relationships and tags.

Use simple labels for short names and structured content for longer explanations. Use numbered lists for sequence and bullet lists for parallel items. Use the [card recipe](#cards-groups-and-tags) for the order of titles, core content, and supporting information.

- **Establish hierarchy before adding content.** Reuse styles by text role. Use deliberate weight or color changes for local emphasis.
- **Break lines by meaning.** Keep terms, and numbers with their units, together where possible. Separate titles from body text.
- **Allocate space for the content.** When text is crowded, first adjust card width, layout, or content grouping. Follow [source fidelity and information choices](source-fidelity.md) when considering information removal.
- **Allocate emphasis deliberately.** Keep body styling stable so key phrases and states receive meaningful emphasis. Preserve a clear hierarchy within each card.
- **Measure with the selected typography.** Measure content and size containers with the same typography settings used in the draft.

### Spacing and spatial hierarchy

Use distance to express membership and consistent spacing to establish order. Keep related content close together, with larger gaps between separate objects and groups.

Let `B` be the chosen body-text size in diagram units and use `u = B / 4` as the base spacing unit. Choose concrete values from the following starting ranges, then adjust for content, connections, and intended display size.

| Spatial role | Starting range | Purpose |
| --- | --- | --- |
| Between list items | 1–2u | Keep the list compact while distinguishing items. |
| Between content blocks | 2–3u | Separate titles, paragraphs, lists, and supporting information. |
| Card padding | 4–6u | Give content comfortable clearance from the border. |
| Between nodes in one group | 6–8u | Distinguish objects and reserve room for connections. |
| Between groups | 8–12u | Express boundaries between larger content units. |
| Outer canvas margin | 8–12u | Give the overall composition breathing room. |

For example, a body-text size of 20 diagram units gives `u = 5`; card padding can start at 20–30 diagram units. Apply concrete values through the supported content styles and authored geometry in the [document model](document-model.md).

- **Reuse spacing by role.** Use consistent padding for comparable cards and consistent gaps in repeated arrangements.
- **Align deliberately.** Align card edges, title starting positions, and nodes in the same group. Keep a stable left reading edge for longer content.
- **Reserve space for group titles.** Separate each group title from its child nodes so the heading has its own area.
- **Reserve connection channels.** Allow space for arrowheads, relationship labels, and return paths. Widen the relevant channel when a label needs more room.
- **Adjust density coherently.** When the composition is crowded, first adjust layout, grouping, or canvas dimensions. Keep spacing consistent within each hierarchy level.

Use the selected values as a reusable spacing system. Smaller gaps within content and larger gaps between objects and groups are a starting point for expressing hierarchy. Adapt them when connection channels, compact layers or the intended composition need different proportions. Judge the result by clear membership, traceable relationships and readability at the target display size.

### Color roles and palette

Define what each color does before choosing concrete values. Reuse the same palette roles throughout the diagram.

| Color role | Treatment |
| --- | --- |
| Canvas background | Establish the overall light or dark tone and make the main content easy to identify. |
| Group and card fills | Distinguish containment levels with restrained tonal differences between canvas, groups, and cards. |
| Borders | Clarify container boundaries with less visual weight than the core content. |
| Primary text | Keep titles and body text clearly contrasted with their carrying backgrounds. |
| Supporting text | Give notes and units less visual weight while preserving readability. |
| Connections | Start with a stable neutral color. Add color when distinguishing relationships or emphasizing a path. |
| Accent | Identify the current focus, a key path, or an important object. Limit its use to the intended emphasis. |
| Categories and states | Express explicit categories or source-supported states. Keep each meaning consistent. |

- **Build a neutral foundation.** Choose background, card, text, and connection colors first, then allocate accents. An ordinary explanatory diagram can start with one accent color.
- **Add category colors as needed.** When comparing categories requires color, choose distinguishable colors with similar visual strength and label the categories explicitly.
- **Ground state colors in the sources.** Use success, failure, and warning colors only for states supported by the material. Pair color with state text or another explicit marker.
- **Coordinate tag fills and text.** Ordinary tags can use soft fills and darker text. Reserve strong solid fills for information that needs emphasis.
- **Compose light and dark palettes separately.** Coordinate text, border, and fill contrast within each theme to preserve clear hierarchy.
- **Map brand colors to roles.** When the user supplies brand requirements, assign those colors to suitable roles and preserve text, tag, and connection readability on their actual backgrounds.

### Cards, groups, and tags

Define each element's explanatory role before coordinating its appearance.

| Element | Role | Structure |
| --- | --- | --- |
| Card | Represent one object, stage, or concept | Title, core content, then supporting information. Keep the content order consistent across comparable cards. |
| Group container | Express membership or a shared scope | Group title followed by the child-node area, with dedicated space between the title and children. |
| Tag or pill | Express a category, attribute, or state | Short text with consistent styling, placed near its associated content or in a consistent tag area. |

#### Cards

- Reuse shape, border, and title position across comparable cards; apply the selected spacing system to padding.
- Coordinate widths within a row or column. Choose heights for the content and layout, with appropriate whitespace.
- Give shape differences explicit meanings. For example, use cylinders consistently when they represent data stores.

#### Groups

- Use restrained fills or borders so the contained objects remain the visual focus.
- Name the grouping basis, such as a logical module, processing stage, or deployment location. Use the meaning supported by the sources.
- Establish nested hierarchy through titles, whitespace, and restrained tonal differences.
- Size group boundaries to include the heading space and connection channels from the [spacing recipe](#spacing-and-spatial-hierarchy).

#### Tags

- Decide whether each tag expresses a category, attribute, or state before choosing its text and color.
- Reuse shape, type size, weight, and palette roles across comparable tags.
- Use short phrases for tags. Place explanatory sentences in body text or supporting information.
- Use a tag for information beyond the card's own title or grouping. When tags compete with the title, wrap into awkward fragments or repeat the same category, reorganize them as body text or subcards while preserving source meaning. Assess density at the target display size; character counts alone are not a universal limit.
- Arrange multiple tags in a stable order with consistent spacing. When space is insufficient, use supported content structures to wrap them or adjust the layout.
- Match visual emphasis to importance. Give ordinary attribute tags less visual weight than the title.

### Connections and relationship labels

Make relationships easy to trace and coordinate their appearance with the overall composition. Establish the main flow before arranging branches, return paths, and labels.

| Relationship structure | Layout starting point |
| --- | --- |
| Sequential process | Arrange stages in the main reading direction and favor direct, simple paths. |
| Branching and merging | Reserve separate channels for branches and place condition labels near their branches. |
| Return or loop | Route around the main composition with enough separation from forward paths to distinguish directions. |
| Cross-group relationship | Reserve a channel across boundaries and keep endpoints and direction clear. |
| Parallel relationships | Separate paths and their labels. Use distinct directed connections for requests and responses. |

- **Select endpoint scope first.** Follow [relationship scope and endpoints](semantic-patterns.md#relationship-scope-and-endpoints) before choosing ports or routes. Apply that scope to forward, return and explanatory relationships alike.
- **Choose ports and routes together.** Start with ports that face the intended direction. Choose the simplest traceable path with clear arrowheads and label space, using the table below. Grouping, layering and off-axis ports alone do not require bends. Reconsider ports or node positions when the rendered path is crowded.
- **Reserve channels before labels and sidebars.** Treat path clearance as layout space. Keep unrelated cards and explanatory sidebars outside the channel; where a component edge crosses a group boundary, keep that crossing distinct from a group endpoint.
- **Establish line hierarchy.** Keep default line width and color consistent. Emphasize key paths when needed and give secondary relationships less visual weight.
- **Give line styles explicit meanings.** Map solid lines, dashed lines, and color differences to defined relationship categories. Explain those categories through labels or a legend.
- **Place labels near their paths.** Choose an identifiable segment with clearance from arrowheads, bends, and other text. Reserve layout space for longer labels.
- **Resolve ambiguity first.** Keep directions traceable through crossings and relationship ownership clear along shared segments. Depict a junction as a meaningful merge only when the sources support that meaning.
- **Coordinate routes across the composition.** Consider affected connections together when adjusting nodes or channels so local detours preserve the overall order. When routes share a busy gap, apply [shared-channel guidance](rendering-gotchas.md#independent-edges-share-a-routing-channel).

| Route candidate | When to use it | What to verify |
| --- | --- | --- |
| `straight` | A direct segment is clear and easy to follow, including a diagonal between off-axis ports. | The segment avoids unrelated content and leaves independently traceable endpoints, arrowheads and labels. |
| `orthogonal` | Bends make a relationship clearer or help it follow a planned gap. | Inspect the actual bends and shared segments; this mode does not assign exclusive lanes or guarantee obstacle avoidance. |
| `curved` | A curve separates a return or another relationship from nearby paths. | Check the whole curve, its crossings and its arrowhead; changing route style alone does not establish separation. |

For example, keep a clear diagonal between two offset components; compare a bent path when that diagonal crosses a card; reconsider the ports or layout when several bent paths collapse into one track. Keep the same source-supported relationship during these geometry changes. Connection inspection is complete when each edge can be traced independently to its intended boundary at the target display size, or its remaining ambiguity is recorded in review `issues`.

### Animation rhythm and visual continuity

Give each change an explanatory purpose and allow time to recognize, read, and understand it. Define the explanation sequence before choosing animation actions.

| Explanatory purpose | Animation method | Design priority |
| --- | --- | --- |
| Establish context | Present the objects and relationships needed to understand the subject | Give the initial view a clear entry point. |
| Guide attention | Emphasize the current node, relationship, or region | Make the current focus explicit while retaining necessary context. |
| Explain transfer | Show a flow marker along a relationship | Keep path and direction clear and label what is transferred. |
| Explain state change | Update text, state, or visual emphasis | Preserve object identity and make the difference and reason for the change clear. |
| Expand local detail | Reveal content in stages and adjust the view when needed | Keep the relationship between detail and overall context understandable. |
| Present the result | Retain the result state and allow a pause | Give the reader time to understand the result and its connection to the preceding process. |

- **Stage by explanatory unit.** Give each stage one local question to answer. Keep simultaneous changes part of the same event.
- **Separate transition time from reading time.** Use transitions to make changes perceptible and pauses to support reading. Set each according to content length and complexity.
- **Preserve object identity.** Reuse object names and stable positions. When an object moves, make its path and resulting membership clear.
- **Establish consistent rhythm.** Coordinate speed and emphasis across comparable transitions. Give important changes a more distinct reading pause.
- **Coordinate the view with content.** Help the reader locate the relevant region before expanding its details. Preserve orientation cues when changing the view.
- **Make paused states understandable.** At key stages, retain text, relationship direction, and current-state information needed to explain the paused view.
- **Ground motion meaning in the sources.** Let speed, repetition count, and waiting time represent actual quantities or durations only when supported by the material. Use explanatory pacing for ordinary teaching animation.

Record each stage's explanatory purpose, changes, transition, and reading pause in the plan. Follow [animation authoring](timeline.md) for supported actions and inherited state. Verify actual compiled timing before selecting export times or reporting duration.

## Inspect the visual design

Use AI inspection to identify visible defects and provide observations for human review. Compare the actual rendered result with the recorded visual choices and shared quality standards at the intended display size.

1. Inspect the whole composition for entry point, emphasis, balance, and fit to the usage context.
2. Inspect text, containers, tags, and connections for readability, consistent styling, clearance, and unambiguous ownership. Use the relevant recipes above to locate deviations.
3. For animation, inspect key paused states for continuity and use playback to assess pacing. State when only sampled still images were viewed.

Record each observed issue with its specific location, visible symptom, and effect on understanding or visual quality. For example: "At the article column width, the supporting text in the retrieval node is crowded, and its pill tags attract more attention than the title, weakening the content hierarchy."

For repeated cards and text in any language, compare title starts, number/text columns, adjacent gaps and text-to-border clearance at the recorded display size. Check whether short labels appear vertically centered and whether punctuation or digits disrupt the reading edge. Geometric anchors and browser bounding boxes provide evidence about position; optical balance still requires actual viewing. Describe a visible defect rather than inferring quality from equal coordinates alone.

Use the existing [review workflows](visual-checks.md) and observation fields; record specific design problems in `issues`. For final SVG/PNG files, follow [target-size artifact inspection](artifact-evidence.md). Apply authorized corrections and inspect the affected views again.

Inspection is complete when each required view has been inspected or its missing inspection is explicit, observed issues have recorded handling decisions, and affected views have been checked again after corrections. Present the result and observations for the user's design judgment; report uninspected sizes and animation stages as coverage gaps.
