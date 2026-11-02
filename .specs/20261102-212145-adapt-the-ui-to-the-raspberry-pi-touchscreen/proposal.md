# 20261102-212145-adapt-the-ui-to-the-raspberry-pi-touchscreen: Adapt the UI to the Raspberry Pi touchscreen

## Problem

R-07 has been in the Later column with an outdated screen resolution (1024×600).
The actual Raspberry Pi touchscreen is 1024×714. The current tablet target resolution
is 768×1024 (portrait), which does not match the owner's device. At the new tablet
width (1024px) the dashboard shows 2 columns of cards, requiring the three meters to
be on two rows and scroll.

## Goal and scope

- Update all documentation to refer to 1024×714 instead of 1024×600 or 768×1024.
- Change the tablet viewport target from 768×1024 to 1024×714.
- Lower the 3-column breakpoint so the three current reading cards fit in one row
  at 1024px width, making all three meters visible without scrolling on the
  1024×714 screen.

Touch interaction is already implemented and remains in place. No new visual
snapshots are added.

## Out of scope

- R-05 (CPU temperature), R-06 (trends), R-08 (forecasts), R-09 (alerts).
- Visual redesign or layout changes beyond the 3-column breakpoint adjustment.
- Adding a dedicated raspberry-pi visual snapshot test.
- Changes to card content, chart layout, or the history section.

## Required behavior

See [spec.md](spec.md).