# Design QA — cloud board

- source visual truth path: `work/reference-board.png`
- implementation screenshot path: `work/implementation-board.png`
- combined comparison path: `work/design-qa-comparison.png`
- viewport: 1400 × 1021 CSS px, device scale factor 1
- source pixels: 733 × 1049
- implementation pixels: 629 × 900
- density normalization: both artifacts were rendered side by side at a common visible height of 900 CSS px in `work/design-qa.html`
- state: dark theme, 39-cell board, round 4, seven colored elephant pieces distributed across the track

**Full-view comparison evidence**

The implementation reproduces the important visual structure of the supplied board: a tall dark-blue celestial field, a winding 39-cell route, blue-grey cloud cells, high-contrast hand-drawn-style white numerals, and colored pieces. The route remains legible at desktop and mobile widths.

**Focused region comparison evidence**

No separate crop was needed. At the normalized 900 px height, the cloud silhouette, numeral treatment, star-field contrast, cell spacing, and elephant silhouettes are all readable in the combined comparison.

**Required fidelity surfaces**

- Fonts and typography: board numerals use `Segoe Print` / `Comic Sans MS` / cursive fallbacks to preserve the informal handwritten character; UI text keeps the product's established system font hierarchy.
- Spacing and layout rhythm: the 39 cells follow the same bottom-to-top winding rhythm, with enlarged start cloud and balanced four-lane composition.
- Colors and visual tokens: deep navy background, desaturated blue clouds, white numerals, cyan/purple star accents, and the existing seven player colors match the reference direction while preserving contrast.
- Image quality and asset fidelity: clouds and elephants are local vector SVG assets from Material Design Icons; no raster game pieces are used. The star field is resolution-independent CSS decoration.
- Copy and content: the board adds only the current round marker; game controls and labels remain unchanged and legible.

**Findings**

- No actionable P0/P1/P2 findings remain.
- [P3] The physical board's special-cell pictograms are intentionally absent because this companion does not currently model special association restrictions. This does not block scoring or navigation.

**Comparison history**

1. First pass: [P2] the implementation board was too narrow and short inside its panel, producing excessive empty space and smaller clouds than the reference.
2. Fix: increased the board maximum width from 480 to 560 px, changed the board ratio from 3:4 to 2:3, and applied a handwritten numeral stack.
3. Post-fix evidence: `work/design-qa-comparison.png` shows the route filling the frame with cloud scale and vertical density comparable to the reference; no P0/P1/P2 issue remains.

**Implementation Checklist**

- [x] 39 cloud cells in a continuous infinite scoring loop.
- [x] Local vector elephant pieces, recolored per player.
- [x] Seven pieces remain distinguishable on the field.
- [x] Mobile and desktop layouts remain readable.
- [x] Browser console checked with no errors or warnings during the tested flow.

**Primary interactions tested**

- create a room, then choose color inside the room;
- start with one player;
- submit the leader's card and reveal results as `leaderId`;
- automatically advance from round 1 to round 2.

**Follow-up Polish**

- Add special-cell rule icons only if those physical board restrictions become part of the companion's rules engine.

final result: passed
