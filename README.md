# Mulligan

Offline-first golf scoring for local competitions. Built for the Bergen/Stavanger
scene — where the wind moves and the cell signal doesn't.

Mulligan is a single-device PWA that one scorer runs for the whole group.
Players, handicaps, and courses are stored locally (IndexedDB). The app works
fully offline once loaded: the course catalog is bundled at build time and every
round snapshots its course so scoring keeps working even if the source data
changes later.

## What's inside

- **Formats:** stroke play, Stableford, match play, four-ball stroke, four-ball
  Stableford, 2-player scramble — all with proper handicap allowances.
- **Skins** as an optional side game (gross or net) that lives alongside the
  main leaderboard without extra event tracking.
- **Scoring workspace:** single mobile-first screen — tap a player row, enter a
  score via the number-pad bottom sheet, watch the leaderboard reorder live.
- **Bundled course catalog** seeded from [GolfCourseAPI](https://golfcourseapi.com/)
  via a developer-only sync script; no runtime API calls.
- **No accounts, no backend.** v1 is one scorer, one device, a handful of buddies.

## Tech

Vue 3 · TypeScript · Vite · Pinia · Dexie · `vite-plugin-pwa` ·
Tailwind CSS v4 with `shadcn/vue` primitives · Playwright for e2e.

## Getting started

```bash
pnpm install
pnpm dev           # Vite dev server
pnpm build         # typecheck + production build
pnpm test          # vitest unit tests
pnpm test:e2e      # Playwright against the built app
```

## Refreshing the course catalog

The bundled catalog at `src/data/course-catalog.json` is regenerated from the
manifest (`src/data/course-manifest.json`) via:

```bash
GOLF_COURSE_API_KEY=... pnpm sync:courses
```

Add or remove clubs in the manifest, re-run the script, and commit the updated
JSON. Runtime code never talks to the provider.

## Project layout

```
src/
  views/        route-level screens (Dashboard, Players, CompetitionSetup, CompetitionRound)
  components/   app/ shell, competition/ scoring widgets, players/ CRUD, ui/ shadcn primitives
  stores/       Pinia stores (players, competitions) backed by Dexie
  lib/          golf.ts (scoring/handicap math), db.ts, course-catalog.ts
  data/         bundled course catalog + manifest
docs/           design notes and architecture decisions
tests/e2e/      Playwright flows
scripts/        sync-courses.mjs (dev-only GolfCourseAPI importer)
```

See `docs/` for deeper design notes — the implementation plan documents the
architecture decisions, and `app-overview.md` gives a plain-English tour of what
the app does.
