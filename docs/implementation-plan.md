# Mulligan – Teknisk plan og beslutninger

Dette dokumentet samler de viktigste tekniske valgene i løsningen slik den er bygget nå.

## Arkitektur

Mulligan er en frontend-applikasjon uten runtime-backend.

- Vue 3 og Vite for appskallet
- Pinia for applikasjonsstate
- Dexie og IndexedDB for lokal lagring
- `vite-plugin-pwa` for PWA-oppførsel
- `shadcn/vue` og Tailwind CSS for UI-primitiver

Hovedregelen er at rutene og komponentene holder seg tynne, mens domenelogikken
for golfregler og oppsummeringer ligger i `src/lib/golf.ts`.

## Datastrøm

1. Spillere og konkurranser hydreres fra Dexie ved oppstart.
2. Brukeren oppretter en konkurranse i oppsettsskjermen.
3. Appen lager et lokalt snapshot av bane, tees, handicap og deltakere.
4. Rundevisningen skriver bare rå score tilbake til konkurransen.
5. Oppsummeringer, stilling og Skins beregnes fortløpende fra snapshot + score.

## Banekatalog

Banekatalogen er lokal og versjonert i repoet.

- Manifest: `src/data/course-manifest.json`
- Overrides: `src/data/course-overrides.json`
- Generert katalog: `src/data/course-catalog.json`
- Synk-skript: `scripts/sync-courses.mjs`

Banedata oppdateres eksplisitt av utvikler og er ikke en runtime-avhengighet.

## Støttede produktregler

- Appen er bygget for én scorer på én enhet.
- Konkurranser støtter 2 til 4 spillere avhengig av format.
- Individuelle formater støtter 2, 3 eller 4 spillere.
- Match Play støtter 2 spillere.
- Four-Ball-formatene støtter 4 spillere.
- 2-spiller Scramble støtter 2 eller 4 spillere.

## Hvor domenelogikken bor

`src/lib/golf.ts` er canonical source for:

- konkurransetyper og formatmetadata
- handicapberegning
- Stableford-poeng
- Match Play-status
- lagoppsummeringer
- Skins
- leaderboard-beregning

UI-komponenter skal konsumere disse verdiene, ikke regne dem ut selv.

## Testing

Prosjektet bruker to hovednivåer av tester:

- Vitest for ren logikk og komponenter
- Playwright for viktige brukerflyter

Kritiske områder å verifisere ved endringer:

- formatgrenser og spillerantall
- handicap og slagfordeling
- 9- og 18-hulls runder
- lagformater og Skins
- lokal persistering etter reload

## Dokumentasjon

Denne mappen erstatter den tidligere `plans/`-mappen.

- `app-overview.md` beskriver hvordan appen brukes og fungerer
- `spilleformater.md` forklarer formatene og reglene
- denne filen samler tekniske valg og strukturelle føringer