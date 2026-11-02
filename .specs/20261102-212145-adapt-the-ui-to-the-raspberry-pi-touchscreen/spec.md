# 20261102-212145-adapt-the-ui-to-the-raspberry-pi-touchscreen: Adapt the UI to the Raspberry Pi touchscreen

## Requirements

### REQ1: 3-column reading grid at tablet width

Delta: modified

See the visual prototype at [prototypes/1024x714-3col.html](prototypes/1024x714-3col.html) for the expected layout at 1024×714.

Change the breakpoint for the 3-column current readings grid from 1101px to 1024px.
At the tablet viewport (1024×714) the three device cards must display in a single
row of 3 columns, fitting without vertical scrolling for the current readings section.

Before: 3 columns activated at `(min-width: 1101px)`, so at 1024px the grid used
2 columns (`md:grid-cols-2`) and three cards occupied two rows.

Verified by: [AC1](#ac1-three-cards-in-one-row-at-1024px)

#### AC1: Three cards in one row at 1024px

1. Probe: Set viewport to 1024×714 with the populated dashboard showing 3 devices
2. Expected result: The current readings section renders 3 cards in a single row
   (1 row × 3 columns). All three meters are visible without scrolling.
3. Example: With devices garden, living room, and bedroom, at 1024×714 the section
   with `aria-label="Current readings"` shows 3 `article` elements in one row.
   The `grid-template-columns` resolves to `repeat(3, minmax(0, 1fr))`.

### REQ2: Update documented target resolutions

Delta: modified

Replace the tablet target resolution in project documentation.
- `packages/web/AGENTS.md`: change "Tablet: 768 × 1024" to "Tablet: 1024 × 714"
- `README.md`: change "(768 × 1024)" to "(1024 × 714)" in the visual snapshots section

Before: The documented tablet target was 768×1024 (portrait orientation), which
does not match the Raspberry Pi touchscreen.

Verified by: [AC2](#ac2-tablet-resolution-in-agentsmd-and-readme)

#### AC2: Tablet resolution in AGENTS.md and README

1. Probe: Read `packages/web/AGENTS.md` and `README.md`
2. Expected result: Both files list the tablet target as 1024×714
3. Example: `AGENTS.md` line "  - Tablet: 1024 × 714" and `README.md` line
   containing "tablet (1024 × 714)"

### REQ3: Update R-07 roadmap entry

Delta: modified

Change the resolution in the R-07 roadmap entry from 1024×600 to 1024×714 in
both the table row and the detailed description in `ROADMAP.md`.

Before: R-07 referenced 1024×600, which was an incorrect screen size for the
owner's 7-inch touchscreen.

Verified by: [AC3](#ac3-r07-resolution-in-roadmap)

#### AC3: R-07 resolution in roadmap

1. Probe: Read `ROADMAP.md`
2. Expected result: All references to the R-07 screen resolution say 1024×714
3. Example: Table row contains "1024×714" and the detailed description contains
   "7-inch 1024×714 IPS LCD HDMI capacitive touchscreen"

### REQ4: Update tablet viewport in visual test

Delta: modified

Change the tablet viewport in `e2e/dashboard.visual.spec.ts` from
`{ width: 768, height: 1024 }` to `{ width: 1024, height: 714 }`.

Before: The visual test tablet viewport was 768×1024 (portrait), which does
not match the Raspberry Pi touchscreen.

Verified by: [AC4](#ac4-tablet-viewport-in-visual-test)

#### AC4: Tablet viewport in visual test

1. Probe: Read `packages/web/e2e/dashboard.visual.spec.ts`
2. Expected result: The tablet viewport in the viewport array is
   `{ label: 'tablet', width: 1024, height: 714 }`
3. Example: The loop iterates over viewports including
   `{ label: 'tablet', width: 1024, height: 714 }`