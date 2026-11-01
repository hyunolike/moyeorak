You are a senior brand designer with 10+ years at a large Korean consumer app company (the craft level of NOL/Yanolja, 여기어때, Toss, Naver). Repo root is the current directory. Write output ONLY inside ./design/brand-v4/. Do not modify anything else (especially design/brand-v3/, design/brand-v2/, design/moraki/, reference/, app/). Do not commit.

## Why this exists
The service "모여락" (Korean friend groups agreeing on a meeting time and place, mobile web) is rebuilding its design system. The owner judged the previous brand (design/brand-v3/) as looking AI-generated: a big 3D clay mascot talking on every screen, pastel tones and identical rounded cards everywhere. The new direction is lively and expressive like NOL and 여기어때, but built from bold flat shapes, strong type and one confident color, not decoration. Read docs/superpowers/specs/2026-11-01-design-system-v4-design.md (sections "왜 다시 만드는가", "실패로 보는 것", "호스트가 정한 것") before you start.

## Task: the mascot "마주", shrunk to a face
마주 stays, but small: it appears only as a 24–64px face next to one line of guidance, and as the base of the logo symbol (made later from your output). No body, arms or legs.

Build a generator `design/brand-v4/tools/build-maju.mjs` (Node 24 ESM, no dependencies beyond what is in design/brand-v4/tools/package.json) that:
- exports `export function majuSvg(expression, { mono = false } = {}): string`
- when run directly (`node build-maju.mjs` from design/brand-v4/tools), writes `design/brand-v4/maju/{default,thinking,happy,sorry,waiting}.svg`
- also write `design/brand-v4/maju/NOTES.md`: one short paragraph on the shape idea, then one line per expression describing eyes and mouth.

Shape rules:
- `viewBox="0 0 64 64"`, no background rect, the face shape fills most of the box.
- Face: a rounded rectangle derived from a subway station name sign (역명판), filled tangerine #FF6A13. Eyes and mouth in ink #17181A. You may use #FFE6D4 or #FFFFFF for a small inner detail only if it survives at 16px; prefer not to.
- Expressions: default (기본), thinking (생각 중), happy (기쁨), sorry (미안함), waiting (기다림). At 24px every pair must be distinguishable: default vs waiting and thinking vs sorry must differ clearly in eye shape or mouth shape.
- At 16px (favicon) the two eyes must remain two separate dark blobs with at least one pixel of face color between them. Keep eyes large and far apart; avoid thin strokes under ~5 units.
- `mono: true`: the whole face in ink #17181A with eyes and mouth cut out (use a single path with fill-rule="evenodd" or equivalent) so the background shows through. No other color.
- Look at design/brand-v3/character/2d/expressions/ only for proportion. Drop the cheeks, highlights and any cute detail. Aim for the boldness and simplicity of NOL / 여기어때 app icons.

Hard bans (an automated check rejects these): any color other than #FF6A13, #FFE6D4, #C24A05, #17181A, #FFFFFF; linearGradient, radialGradient, filter, text, image, foreignObject elements; opacity/fill-opacity/stroke-opacity values other than 0 or 1; purple, glow, sparkle, 3D, emoji.

When done, run `cd design/brand-v4/tools && node build-maju.mjs && node qa.mjs` and make sure qa prints 통과. Report the files you wrote.
