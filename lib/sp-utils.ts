import type { SPSpread } from '@/types/champions'
import type { BaseStats, StatID } from '@/types/pokemon'
import { SP_MAX_PER_STAT, SP_TOTAL } from '@/types/champions'

/**
 * Converts SP to the equivalent EV value for use with @smogon/calc.
 *
 * Champions uses 66 SP (max 32/stat) instead of 510 EVs (max 252/stat).
 * We scale linearly: evEquivalent = sp * (512 / 66)
 * This preserves the relative weight of each SP point within @smogon/calc's
 * Gen 9 stat formula without needing a custom engine.
 */
export function spToEV(sp: number): number {
  return Math.round(sp * (512 / SP_TOTAL))
}

export function evToSP(ev: number): number {
  return Math.round(ev * (SP_TOTAL / 512))
}

/**
 * Calculates a final stat value using the Gen 9 formula with SP inputs.
 * IVs are always 31 in Champions. Level is always 50.
 * nature: 1.1 for boosted, 0.9 for reduced, 1.0 for neutral.
 */
export function calcFinalStat(
  stat: StatID,
  base: number,
  sp: number,
  natureMod: number = 1.0
): number {
  const iv = 31
  const ev = spToEV(sp)
  const level = 50

  if (stat === 'hp') {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
  }

  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5
  return Math.floor(raw * natureMod)
}

/**
 * Calculates all final stats for a Pokémon given its base stats and SP spread.
 */
export function calcAllStats(
  baseStats: BaseStats,
  spSpread: SPSpread,
  natureMods: Record<StatID, number> = {
    hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1,
  }
): BaseStats {
  return {
    hp: calcFinalStat('hp', baseStats.hp, spSpread.hp, natureMods.hp),
    atk: calcFinalStat('atk', baseStats.atk, spSpread.atk, natureMods.atk),
    def: calcFinalStat('def', baseStats.def, spSpread.def, natureMods.def),
    spa: calcFinalStat('spa', baseStats.spa, spSpread.spa, natureMods.spa),
    spd: calcFinalStat('spd', baseStats.spd, spSpread.spd, natureMods.spd),
    spe: calcFinalStat('spe', baseStats.spe, spSpread.spe, natureMods.spe),
  }
}

export type NatureEffect = {
  boosted: StatID | null
  reduced: StatID | null
}

const NATURE_EFFECTS: Record<string, NatureEffect> = {
  Hardy:   { boosted: null, reduced: null },
  Lonely:  { boosted: 'atk', reduced: 'def' },
  Brave:   { boosted: 'atk', reduced: 'spe' },
  Adamant: { boosted: 'atk', reduced: 'spa' },
  Naughty: { boosted: 'atk', reduced: 'spd' },
  Bold:    { boosted: 'def', reduced: 'atk' },
  Docile:  { boosted: null, reduced: null },
  Relaxed: { boosted: 'def', reduced: 'spe' },
  Impish:  { boosted: 'def', reduced: 'spa' },
  Lax:     { boosted: 'def', reduced: 'spd' },
  Timid:   { boosted: 'spe', reduced: 'atk' },
  Hasty:   { boosted: 'spe', reduced: 'def' },
  Serious: { boosted: null, reduced: null },
  Jolly:   { boosted: 'spe', reduced: 'spa' },
  Naive:   { boosted: 'spe', reduced: 'spd' },
  Modest:  { boosted: 'spa', reduced: 'atk' },
  Mild:    { boosted: 'spa', reduced: 'def' },
  Quiet:   { boosted: 'spa', reduced: 'spe' },
  Bashful: { boosted: null, reduced: null },
  Rash:    { boosted: 'spa', reduced: 'spd' },
  Calm:    { boosted: 'spd', reduced: 'atk' },
  Gentle:  { boosted: 'spd', reduced: 'def' },
  Sassy:   { boosted: 'spd', reduced: 'spe' },
  Careful: { boosted: 'spd', reduced: 'spa' },
  Quirky:  { boosted: null, reduced: null },
}

export function getNatureMods(nature: string): Record<StatID, number> {
  const effect = NATURE_EFFECTS[nature] ?? { boosted: null, reduced: null }
  const mods: Record<StatID, number> = { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }
  if (effect.boosted) mods[effect.boosted] = 1.1
  if (effect.reduced) mods[effect.reduced] = 0.9
  return mods
}

export function getNatureEffect(nature: string): NatureEffect {
  return NATURE_EFFECTS[nature] ?? { boosted: null, reduced: null }
}

/** Returns full EV spread (keyed for @smogon/calc) from SP spread */
export function spSpreadToEVs(spSpread: SPSpread): Record<string, number> {
  return {
    hp: spToEV(spSpread.hp),
    atk: spToEV(spSpread.atk),
    def: spToEV(spSpread.def),
    spa: spToEV(spSpread.spa),
    spd: spToEV(spSpread.spd),
    spe: spToEV(spSpread.spe),
  }
}

/** Returns remaining SP that can be allocated */
export function remainingSP(spread: SPSpread): number {
  return SP_TOTAL - (spread.hp + spread.atk + spread.def + spread.spa + spread.spd + spread.spe)
}

/** Max SP that can be added to a specific stat without violating constraints */
export function maxAddable(spread: SPSpread, stat: StatID): number {
  const remaining = remainingSP(spread)
  const spaceInStat = SP_MAX_PER_STAT - spread[stat]
  return Math.min(remaining, spaceInStat)
}
