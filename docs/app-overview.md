# Mulligan — App Overview

A plain-English tour of what Mulligan is and how its parts fit together. Read
this before diving into individual files.

## The one-line version

Mulligan is a mobile-first, offline-first PWA that lets one person keep score
for a small group of golfers on a Norwegian course — with correct handicap
math, a few popular formats, and optional skins.

## Who it's for

- **One scorer, one device.** No accounts, no realtime sync, no spectator mode.
  The scorer's phone is the source of truth for the round.
- **Casual league play.** Thursday groups, club matches, weekend outings — the
  kind of round where rules matter but administrative overhead shouldn't.
- **Bergen/Stavanger first.** The bundled course catalog is seeded with local
  clubs (Bergen, Fana, Meland, Sola, Stavanger, Bjaavann, …). Adding courses
  elsewhere is a manifest edit + a sync script run.

## The core loop

1. **Manage players** once — name, Handicap Index, optional home club. Stored
   locally in IndexedDB via Dexie.
2. **Start a competition** from the dashboard: pick course, format, players,
   per-player tees, optionally toggle skins. The competition snapshots the
   course (tees, hole pars, stroke indexes, yardages) so scoring keeps working
   even if the catalog is updated later.
3. **Score hole by hole** in the round view (the "Fairway" screen):
   - hole strip across the top with the current hole enlarged
   - big `Par N` hero + SI/yards meta
   - one tappable row per player/side with HCP, stroke dots, score box, hole
     points, and running total
   - sticky leaderboard footer with gap indicators, always visible
   - tap a row → bottom-sheet number pad with par/par±1/par±2 quick chips
4. **Finish** and mark the round complete. The review/leaderboard stays in the
   app; nothing is uploaded anywhere.

## Supported formats

All formats honor the allowance rules configured in `src/lib/golf.ts`:

| Format                    | What it is                                       |
| ------------------------- | ------------------------------------------------ |
| Individual stroke play    | Lowest gross/net total                           |
| Individual Stableford     | Points per hole from net score (2 = par)         |
| Individual match play     | Hole-by-hole balance using relative handicaps    |
| Four-ball stroke          | Best net score per hole counts for the side      |
| Four-ball Stableford      | Best Stableford points per hole counts           |
| 2-player scramble         | One shared score per side, side-level handicap   |

**Skins** is a side game layered on top of any stroke-based format. Gross or
net mode, carryover on ties, no separate event tracking — winners are derived
from the hole scores already entered.

## Scoring math — where it lives

All the sharp edges are in `src/lib/golf.ts`:

- `computeCourseHandicap` / `computePlayingHandicap` — Handicap Index → Course
  → Playing, with format-specific allowance rules (e.g. 85% individual
  Stableford, 95% individual stroke, scramble pair 35/15).
- `getStrokeAdjustments(playingHandicap, strokeIndexes)` — spreads strokes
  across holes by stroke index, handles plus handicaps and wrap-around.
- `getStablefordPoints(par, netScore)` — `max(0, 2 + par - net)`.
- `buildCompetitionSummary(competition)` — the single function that computes
  the live leaderboard, skins carry chain, and match-play balance from the raw
  scores. The UI reads this; it does not re-derive.

**Rule:** components never reimplement handicap or scoring math. If the UI
needs a derived value, add it to `buildCompetitionSummary` (or a sibling
pure function) and consume it from there.

## Architecture at a glance

```
+----------------------------+    +--------------------------+
|  Vue 3 components (views)  |    |  Pinia stores            |
|  - DashboardView            |--->|  - usePlayersStore       |
|  - PlayersView              |    |  - useCompetitionsStore  |
|  - CompetitionSetupView     |    +--------------------------+
|  - CompetitionRoundView     |               |
+----------------------------+               v
               |                      +--------------+
               v                      |  Dexie (IDB) |
        +---------------+             +--------------+
        |  lib/golf.ts  |  <-- pure scoring + handicap math
        +---------------+

        +----------------------+
        |  data/course-catalog |  built-in JSON seeded at dev time
        +----------------------+
```

- **Views** are thin — they derive what they need from stores + `golf.ts`.
- **Stores** own persistence and hydration from IndexedDB.
- **`lib/golf.ts`** is the canonical home for types and scoring logic. Unit
  tests live next to it.
- **`data/`** holds the bundled course catalog and the manifest that the
  developer-only `scripts/sync-courses.mjs` reads.

## Design language — the "Fairway" look

- **Palette:** pine (`#1E4A3A`) + emerald on warm sand (`#EFEAD8`) in light,
  deep green in dark.
- **Type:** Fraunces serif for numerals and hero labels, JetBrains Mono for
  uppercase meta labels (HCP, SI, PTS), Geist for everything else. Tabular
  figures everywhere a number could jitter.
- **Chrome:** minimal. No heavy shadows, no dashboard cards on the scoring
  screen. The scorer sees one screen doing one job.
- **Round route runs full-bleed.** The app sidebar and page header are
  suppressed on `/competitions/:id` (via a `layout: 'bare'` route meta flag)
  so the mobile workspace owns the viewport.

## Non-goals for v1

- No multi-device sync or cloud backup
- No accounts, auth, or player-facing mobile clients
- No live GPS, rangefinder, or shot tracking
- No WHS-compliant handicap calculation beyond per-round Playing Handicap
- No tournament admin UI (brackets, schedules, pairings) beyond a single round

If a feature would push one of those doors open, it goes in a docs note first,
not straight into the UI.
