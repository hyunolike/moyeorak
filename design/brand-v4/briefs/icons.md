You are a senior icon designer at a large Korean consumer app company. Repo root is the current directory. Write output ONLY to ./design/brand-v4/icons/ and ./app/src/components/icons/. Do not modify anything else. Do not commit.

Read first: design/brand-v4/logo/DECISION.md, design/brand-v4/logo/final/symbol.svg (the approved transfer-station mark: two subway lines meeting into one stem that ends at a ringed station), design/brand-v4/maju/small/default.svg (the mascot face, small variant).

## Task: six brand-specific UI icons that sit next to Tabler Icons

The app uses Tabler Icons (@tabler/icons-react 3.50.0) for generic icons. These six are concepts only 모여락 has. They must look like they belong to the Tabler set:
- 24×24 viewBox, 2px stroke, round line caps and joins, 1px safe margin (draw inside 1..23), `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"` on the root <svg>.
- Outline only. No fills (a filled dot of radius ≤ 1.5 is allowed only where noted), no colors, no gradients, no text.

Icons (file name → meaning):
1. maju.svg → the 마주 face, reduced to an outline rounded square with two eye dots (small filled circles r=1.25 allowed) and a short smile. Recognisably the same proportions as maju/small/default.svg.
2. station.svg → a station: a ring (circle r≈4) on a short vertical stem, like the bottom of the logo mark.
3. junction.svg → the logo idea as an icon: two lines coming from left and right at the same height, merging into one stem that ends at a small ring. Simplified for 24px.
4. time-slot.svg → a time grid cell being painted: a 2×2 grid of rounded squares where one cell has a check or diagonal hatching (strokes only).
5. nudge.svg → a gentle nudge: a hand waving (not a bell, not an alarm). Two short motion strokes beside the hand.
6. share.svg → share to a group chat: a speech bubble with an arrow leaving it to the upper right.

Deliverables:
- design/brand-v4/icons/<name>.svg for all six (standalone SVG files with the root attributes above).
- app/src/components/icons/index.tsx exporting React components `IconMaju`, `IconStation`, `IconJunction`, `IconTimeSlot`, `IconNudge`, `IconShare`. Each takes `{ size?: number; className?: string; title?: string }` (size default 24), renders the same paths, sets `aria-hidden="true"` when no title and `role="img"` + `<title>` when a title is given. Use the same root attributes. TypeScript, no default export, Biome-style formatting (double quotes, semicolons).
- design/brand-v4/icons/NOTES.md: one line per icon describing the drawing.

When done, check every SVG yourself: viewBox="0 0 24 24", fill="none", stroke="currentColor", stroke-width="2", all coordinates within 1..23. Report the files you wrote.
