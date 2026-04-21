# Mulligan

Mulligan er en offline-first golfapp for lokale konkurranser. Appen er laget
for at én scorer skal kunne håndtere hele flighten på én mobil, med lokal
lagring av spillere, runder og banedata.

Banekatalogen bygges inn i appen ved build-tid, og hver konkurranse tar et
snapshot av bane, tee og handicapgrunnlag når runden opprettes. Det betyr at
scoringen fortsetter å fungere selv om katalogen oppdateres senere, eller hvis
du mister dekning ute på banen.

## Hva appen støtter

- Individuell Stroke Play, Individuell Stableford og Individuell Match Play
- Four-Ball Stroke Play og Four-Ball Stableford
- 2-spiller Scramble
- Skins som valgfri sidekonkurranse i stroke-baserte formater
- 2 til 4 spillere avhengig av valgt format
- Tee per spiller, beregning av Course Handicap og Playing Handicap
- Lokal lagring i IndexedDB via Dexie
- Ingen backend, ingen kontoer og ingen runtime-kall mot ekstern bane-API

## Kom i gang

```bash
pnpm install
pnpm dev
```

Nyttige kommandoer:

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Banekatalog

Appen bruker en ferdig generert katalog i `src/data/course-catalog.json`.
Kilden oppdateres via manifestet i `src/data/course-manifest.json` og den
utviklerstyrte synkskriptet:

```bash
GOLF_COURSE_API_KEY=... pnpm sync:courses
```

Runtime-koden gjør ikke kall mot GolfCourseAPI. All data som trengs for å starte
og score en runde ligger lokalt i appen.

## Prosjektstruktur

```text
src/
	views/        rutebaserte skjermer
	components/   app-shell, scoring, spillerdialoger og UI-primitiver
	stores/       Pinia stores for spillere og konkurranser
	lib/          scoringlogikk, handicapberegning, Dexie og kataloghjelpere
	data/         banekatalog, manifest og overrides
tests/e2e/      Playwright-flyter
scripts/        utviklerskript, blant annet banesynk
docs/           dokumentasjon om appflyt, formater og arkitekturvalg
```

## Dokumentasjon

- `docs/app-overview.md` forklarer hvordan appen brukes og hvordan delene henger sammen.
- `docs/spilleformater.md` beskriver formater, spillergrenser og hvordan scoring beregnes.
- `docs/implementation-plan.md` samler de viktigste tekniske beslutningene i løsningen.

## Teknologi

Vue 3, TypeScript, Vite, Pinia, Dexie, `vite-plugin-pwa`, Tailwind CSS v4 og
`shadcn/vue`.
