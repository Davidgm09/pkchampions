# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests (vitest)
npx vitest run lib/__tests__/smogon-calc.test.ts   # Run a single test file
npm run fetch-meta   # Re-scrape champions-meta.json from source
npm run fetch-stats  # Re-scrape base-stats.json from source
```

## Architecture

This is a Next.js 16 app (App Router) for competitive Pokémon Champions VGC tooling — a format that replaces standard EVs with a **66 SP / max 32 per stat** system, with all IVs fixed at 31 and level 50.

### Core mechanic: SP → EV conversion

`lib/sp-utils.ts` is the foundation. Because `@smogon/calc` only speaks EVs, every SP value is linearly scaled: `ev = round(sp × 512/66)`. This conversion is used throughout — damage calc, optimizer, and stat display all go through `spToEV` / `calcFinalStat`.

### Pages and their components

| Route | Page | Key component |
|---|---|---|
| `/` | `app/page.tsx` | Static landing |
| `/pokedex` | `app/pokedex/page.tsx` | `components/pokedex/PokedexClient.tsx` |
| `/pokedex/[id]` | `app/pokedex/[id]/page.tsx` | `components/pokedex/PokemonDetail.tsx` |
| `/calculator` | `app/calculator/page.tsx` | `components/calculator/DamageCalc.tsx` |
| `/optimizador` | `app/optimizador/page.tsx` | `components/optimizer/SPOptimizer.tsx` |
| `/equipo` | `app/equipo/page.tsx` | `components/team/TeamBuilder.tsx` |

### Damage calculator flow

`components/calculator/DamageCalc.tsx` → `lib/smogon-calc.ts` (`runDamageCalc`) → `@smogon/calc`.

Mega Evolutions (via Omni Ring) are not native to Gen 9 in Smogon's data, so their stats are injected via `overrides: { baseStats: megaBaseStats }` on the `Pokemon` constructor.

### SP Optimizer

`lib/sp-optimizer.ts` exposes three functions for the three optimization goals:

- `optimizeSurvive` — O(33²) brute-force over (def, spd) pairs; finds minimum HP separately via `calcFinalStat`.
- `optimizeKO` — linear scan from 0→32 SP on the chosen offensive stat until min damage ≥ defender HP (OHKO) or guaranteed 2HKO.
- `optimizeSpeedTier` — linear scan from 0→32 Spe SP until the stat exceeds the rival's final speed.

### Data

- `data/base-stats.json` — base stats for all Regulation M-B Pokémon (fetched via `scripts/fetch-base-stats.mjs`)
- `data/champions-meta.json` — competitive metadata: allowed regulations, roles, mega evolutions (fetched via `scripts/fetch-champions-meta.mjs`)
- `data/regulation-mb.ts` — static list of Pokémon allowed in Reg M-B
- `data/mega-stones.ts` — mega stone → Omni Ring mapping

`lib/pokeapi.ts` fetches live data from PokéAPI at runtime for the Pokédex pages. Static data files are the source of truth for stats and meta.

### i18n

All UI text goes through `useLanguage().t('key')` from `contexts/LanguageContext.tsx`. The full key→string map is in `lib/translations.ts` (ES + EN mirrors). Language is persisted in `localStorage` under `pkchampions-lang`. The `t()` function supports `{placeholder}` variable substitution.

### Async name translation helpers

`lib/ability-names.ts`, `lib/item-names.ts`, `lib/move-names.ts`, and `lib/nature-names.ts` fetch Spanish display names for Showdown/PokéAPI English identifiers. Each uses a module-level cache (`esCache`) and an in-flight deduplication map to avoid redundant network calls. These are called lazily from components, not server-side.

### Type chart

`lib/type-chart.ts` is a standalone Gen 9 type effectiveness table (sparse map — only non-1× entries). Exports `defensiveSummary(types)` for single-Pokémon analysis and `teamDefensiveCoverage(teamTypes[][])` for team-wide weakness aggregation, both used by the team builder.

### Calculator shared types

`components/calculator/calc-types.ts` defines `PokemonSide` (the full state shape for one side of a damage calc) and the `KOBadge` helpers (`getKOBadge`, `KO_BADGE_CLS`, `KO_BORDER_CLS`) consumed across the calculator components.

### Next.js version note (from AGENTS.md)

This uses **Next.js 16**, which has breaking changes from earlier versions. Before writing any routing, data-fetching, or config code, check `node_modules/next/dist/docs/` for the current API conventions.
