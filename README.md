# Mulligan

Offline-first golf-scoring for lokale runder. En mobil-PWA som lar en gjeng golfere kjøre en turnering på telefonen uten innlogging, uten server — alt lagres lokalt i nettleseren.

## Funksjoner

- **Flere formater**: Stroke Play, Stableford, Match Play, Four-Ball Stroke/Stableford, 2-manns Scramble.
- **Handicap-beregning**: Course Handicap og Playing Handicap beregnes automatisk fra handicap-index, tee, slope og course rating.
- **Live leaderboard**: Oppdateres mens du scorer, med netto, Stableford-poeng og match play-status.
- **Sidegame**: Skins (gross/net) for stroke-baserte format.
- **Offline-first**: Installerbar PWA. All data lagres i IndexedDB via Dexie.
- **Banekatalog**: Lokale norske baner er pakket med appen (Bergen, Fana, Meland, Stavanger, Sola).

## Teknisk

- Vue 3 + `<script setup>` + TypeScript
- Vite + vite-plugin-pwa
- Pinia for state, Vue Router for navigasjon
- Dexie (IndexedDB) for lagring
- Tailwind CSS v4 + shadcn-vue komponenter
- Vitest (enhetstester) + Playwright (e2e)

## Kom i gang

```bash
pnpm install
pnpm dev
```

### Nyttige kommandoer

```bash
pnpm build          # Type-sjekk og produksjonsbygg
pnpm typecheck      # Bare TypeScript-sjekk
pnpm test           # Kjør Vitest-tester én gang
pnpm test:watch     # Vitest i watch-modus
pnpm test:e2e       # Playwright end-to-end-tester
pnpm sync:courses   # Hent/oppdater banekatalogen
pnpm pwa:assets     # Generer PWA-ikoner
```

## Prosjektstruktur

```
src/
  views/            Sidevisninger (liste, oppsett, runde, oppsummering)
  components/ui/    shadcn-vue komponenter
  stores/           Pinia-stores (spillere, runder)
  lib/              Golf-regler, banekatalog, Dexie-db
  data/             Banedata (JSON)
  router/           Vue Router-oppsett
tests/e2e/          Playwright-tester
```
