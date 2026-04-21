# Mulligan – Spilleformater

Denne oversikten beskriver hvilke golfformater Mulligan støtter, hvor mange
spillere som er gyldige for hvert format, og hvordan appen beregner stillingen.

Golfuttrykk som Stroke Play, Stableford, Match Play, Four-Ball, Scramble,
Gross, Net og Skins beholdes som etablerte golfbegreper.

## Formatoversikt

| Format | Spillere | Hvordan det beregnes | Skins |
| --- | --- | --- | --- |
| Individuell Stroke Play | 2, 3 eller 4 | Laveste totalscore vinner. Appen viser både brutto og netto. | Ja |
| Individuell Stableford | 2, 3 eller 4 | Poeng per hull basert på netto score mot par. Høyest poengsum vinner. | Nei |
| Individuell Match Play | 2 | Hvert hull avgjøres separat. Laveste netto score vinner hullet. | Nei |
| Four-Ball Stroke Play | 4 | To lag med to spillere. Lagets beste score teller per hull. | Ja |
| Four-Ball Stableford | 4 | To lag med to spillere. Lagets beste Stableford-poeng teller per hull. | Nei |
| 2-spiller Scramble | 2 eller 4 | Appen registrerer én lagscore per side per hull. | Ja |

## Handicap og tildeling

Mulligan bruker tee-dataene i snapshotet for å regne ut:

1. Course Handicap
2. Playing Handicap
3. Eventuelle slag per hull

Standardoppsett per format:

- Individuell Stroke Play: 100 %
- Individuell Stableford: 100 %
- Individuell Match Play: 100 %
- Four-Ball Stroke Play: 85 %
- Four-Ball Stableford: 85 %
- 2-spiller Scramble: 35 % lav / 15 % høy

For prosentbaserte formater kan handicapprosenten justeres i oppsettet før runden starter.

## Match Play

I Match Play bruker appen relative slag fra spilleren med lavest Playing Handicap.
Stillingen presenteres med Match Play-uttrykk som:

- `All square`
- `1 up`
- `1 down`
- `2&1`

## Four-Ball

I Four-Ball-formatene må det være nøyaktig fire spillere, fordelt på to lag.
Appen auto-plasserer spillerne i `Lag 1` og `Lag 2` basert på rekkefølgen de er valgt i.

## 2-spiller Scramble

Scramble-formatet støtter to scenarier:

- 2 spillere som ett lag
- 4 spillere som to lag á to spillere

I begge tilfeller registreres én felles lagscore per hull for hvert lag.

## Skins

Skins beregnes direkte fra de samme hullscorene som hovedkonkurransen bruker.
Det er ingen separat hendelseslogg for Skins. Ved lik hullvinner går verdien videre
som carryover til neste hull.

## Hvor reglene ligger i koden

Formatmetadata og scoringslogikk ligger i:

- `src/lib/golf.ts`

Dette inkluderer:

- spillergrenser per format
- labels og hjelpetekster for formatene
- handicapberegning
- Stableford-poeng
- Match Play-status
- Skins-oppsummering