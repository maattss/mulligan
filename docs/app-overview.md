# Mulligan – Appoversikt

Dette dokumentet forklarer hvordan Mulligan fungerer i praksis, fra oppsett av
spillere til ferdig scoret runde.

## Kort fortalt

Mulligan er en mobilvennlig, offline-first PWA for golfscoring. Én person
fører score for hele gruppen, og appen lagrer både spillerprofiler,
konkurranser og banedata lokalt i IndexedDB.

## Hvem appen er laget for

- Små flights på 2 til 4 spillere
- Lokale runder og uformelle konkurranser
- Situasjoner der én telefon fungerer som felles scoreenhet
- Baner der dekning ikke kan tas for gitt

## Hovedflyten i appen

### 1. Opprett spillere

I spillerbildet lagres:

- navn
- Handicap Index
- eventuell hjemmeklubb
- valgfrie notater

Disse profilene brukes som kilde når en ny konkurranse opprettes.

### 2. Opprett konkurranse

I konkurranseoppsettet velger brukeren:

- navn på konkurransen
- dato
- format
- 9 eller 18 hull
- bane fra lokal katalog
- tee per spiller
- om Skins skal være aktivt

Når konkurransen opprettes, snapshotter appen:

- bane og tee-data
- handicapgrunnlag
- valgt format og handicaptildeling
- spillerlisten slik den så ut ved start

Det gjør at eldre runder ikke endrer seg selv om spillerprofiler eller
banekatalog oppdateres senere.

### 3. Registrer score hull for hull

Rundevisningen viser:

- aktivt hull
- scorefelt per spiller eller lag
- løpende stilling
- sidekonkurranser som Skins

Oppsummeringen bygges løpende fra de registrerte scores, uten ekstra manuell
føring utover selve hullscorene.

### 4. Marker runden som ferdig

Når runden er ferdig kan den markeres som avsluttet, men den blir fortsatt
liggende lokalt og kan åpnes igjen senere for gjennomgang eller videre redigering.

## Formatstøtte

Mulligan støtter følgende formater:

- Individuell Stroke Play
- Individuell Stableford
- Individuell Match Play
- Four-Ball Stroke Play
- Four-Ball Stableford
- 2-spiller Scramble

Skins kan aktiveres for stroke-baserte formater der det gir mening.

Se `docs/spilleformater.md` for detaljer om spillergrenser og hvordan hvert
format beregnes.

## Hvor logikken ligger

### `src/views/`

Inneholder de rutebaserte skjermene:

- `DashboardView.vue`
- `PlayersView.vue`
- `CompetitionSetupView.vue`
- `CompetitionRoundView.vue`

### `src/stores/`

Pinia-storeene håndterer hydrering og lagring mot Dexie:

- `players.ts`
- `competitions.ts`

### `src/lib/golf.ts`

Dette er kjernen i domenelogikken. Filen inneholder:

- typer for spillere, konkurranser og tees
- formatmetadata
- handicapberegning
- Stableford-poengberegning
- Match Play-status
- Skins-oppsummering
- leaderboard-bygging

Regel: UI-komponenter skal ikke beregne golfregler selv. Hvis UI trenger en
avledet verdi, skal den komme fra `src/lib/golf.ts`.

## Lokal lagring og offline-oppførsel

Mulligan lagrer data i IndexedDB via Dexie. Appen holder lokalt på:

- spillerprofiler
- konkurranser
- scorekort

Banekatalogen ligger som statisk JSON i repoet og er en del av frontend-bygget.
Dermed er appen ikke avhengig av et eksternt API når brukeren faktisk scorer en runde.

## Banekatalogen

Baner vedlikeholdes gjennom:

- `src/data/course-manifest.json`
- `src/data/course-overrides.json`
- `scripts/sync-courses.mjs`

Synk-skriptet brukes bare av utviklere. Appen leser kun den genererte katalogen.

## Viktige produktgrenser i dagens løsning

- Ingen brukerinnlogging
- Ingen skylagring eller flerbrukersynk
- Ingen live deling mellom flere enheter
- Ingen GPS- eller slagsporing
- Ingen turneringsadministrasjon utover én konkurranse om gangen

Disse grensene er bevisste for å holde appen rask, lokal og enkel å bruke ute på banen.