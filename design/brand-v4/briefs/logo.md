You are a senior brand designer with 10+ years at a large Korean consumer app company (the craft level of NOL/Yanolja, 여기어때, Toss, Naver). Repo root is the current directory. Write output ONLY inside ./design/brand-v4/. Do not modify anything else. Do not commit.

Read first: docs/superpowers/specs/2026-11-01-design-system-v4-design.md ("왜 다시 만드는가", "실패로 보는 것", "호스트가 정한 것"), design/brand-v4/maju/NOTES.md, and design/brand-v4/tools/build-maju.mjs (the mascot face you will build on).

## Task: logo for 모여락, three distinct concepts
The logo combines the 마주 face symbol with a Korean wordmark "모여락". Build a generator `design/brand-v4/tools/build-logo.mjs` (Node 24 ESM) that imports `majuSvg` from `./build-maju.mjs` and, when run directly from design/brand-v4/tools, writes for each concept a, b, c:

design/brand-v4/logo/concept-<x>/
- symbol.svg — viewBox 0 0 64 64, based on majuSvg("default") (you may adjust it optically for the concept, but keep it recognisably the same face)
- wordmark.svg — "모여락" drawn as paths (NO <text>, no font files), ink #17181A, viewBox height 64
- horizontal.svg — symbol left + wordmark, vertically centred, sensible gap
- vertical.svg — symbol above wordmark
- horizontal-mono.svg — the horizontal lockup in ink #17181A only; the face uses the mono form (majuSvg(…, { mono: true }) or equivalent cut-out) so eyes and mouth stay visible

Also write design/brand-v4/logo/NOTES.md with one paragraph per concept describing the idea and the letter construction.

The three concepts must be genuinely different:
- A: a bold rounded gothic wordmark (soft terminals, heavy weight), symbol on the left.
- B: an angular gothic wordmark; the final consonant ㄱ of "락" is redrawn as a subway line making a turn, meaning "everyone heads to one point".
- C: an integrated mark where the symbol takes the place of the ㅇ in "여"; still also provide the standalone symbol.svg.

Construction rules for the wordmark:
- Draw each jamo with geometric paths on a consistent grid; consistent stroke weight across 모, 여, 락; optical spacing between syllables.
- Legible at a lockup height of 32px: the final consonant of 락 and the vowels must not merge with neighbouring strokes; keep counters open.
- Bold and simple like the NOL, 여기어때 and 토스 logos. No outlines, no decorative serifs, no italics.

Hard bans (an automated check rejects these): any color other than #FF6A13, #FFE6D4, #C24A05, #17181A, #FFFFFF; linearGradient, radialGradient, filter, text, image, foreignObject elements; opacity/fill-opacity/stroke-opacity other than 0 or 1; purple, glow, sparkle, 3D, emoji. Symbol faces: tangerine #FF6A13 face with ink features (never white features on tangerine).

When done, run `cd design/brand-v4/tools && node build-logo.mjs && node qa.mjs` and make sure qa prints 통과. Report the files you wrote.
