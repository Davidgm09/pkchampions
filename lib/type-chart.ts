// Gen 9 type chart — sparse map: only non-1× interactions
// 0 = immune, 0.5 = resists, 2 = super effective
const CHART: Record<string, Record<string, number>> = {
  Normal:   { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice:      { Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison:   { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground:   { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying:   { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug:      { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5, Dark: 2, Psychic: 2 },
  Rock:     { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost:    { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark:     { Fighting: 0.5, Dark: 0.5, Psychic: 2, Ghost: 2, Fairy: 0.5 },
  Steel:    { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy:    { Fighting: 2, Poison: 0.5, Bug: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
}

export const ALL_TYPES = [
  'Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison',
  'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy',
]

/** Effectiveness of an attacking type against one defending type (0, 0.5, 1, or 2). */
export function effectiveness(attackType: string, defendType: string): number {
  return CHART[attackType]?.[defendType] ?? 1
}

/** Combined effectiveness vs a dual-type Pokémon. */
export function combinedEffectiveness(attackType: string, types: string[]): number {
  return types.reduce((mult, t) => mult * effectiveness(attackType, t), 1)
}

export interface DefensiveSummary {
  /** types that deal ×4 to this team member */
  x4: string[]
  /** types that deal ×2 */
  x2: string[]
  /** types that deal ×0.5 */
  half: string[]
  /** types that deal ×0.25 */
  quarter: string[]
  /** types that deal ×0 */
  immune: string[]
}

/** Compute defensive type profile for a single Pokémon with given types. */
export function defensiveSummary(types: string[]): DefensiveSummary {
  const result: DefensiveSummary = { x4: [], x2: [], half: [], quarter: [], immune: [] }
  for (const atk of ALL_TYPES) {
    const mult = combinedEffectiveness(atk, types)
    if (mult === 0) result.immune.push(atk)
    else if (mult === 0.25) result.quarter.push(atk)
    else if (mult === 0.5) result.half.push(atk)
    else if (mult === 2) result.x2.push(atk)
    else if (mult === 4) result.x4.push(atk)
  }
  return result
}

export interface TeamDefensiveCoverage {
  /** For each attacking type, how many team Pokémon are ×4 weak */
  x4Count: Record<string, number>
  /** For each attacking type, how many team Pokémon are ×2 weak (not x4) */
  weakCount: Record<string, number>
  /** For each attacking type, how many are immune */
  immuneCount: Record<string, number>
  /** For each attacking type, how many resist (×0.5 or ×0.25) */
  resistCount: Record<string, number>
}

/** Aggregate defensive weaknesses across all active team types. */
export function teamDefensiveCoverage(teamTypes: string[][]): TeamDefensiveCoverage {
  const x4Count: Record<string, number> = {}
  const weakCount: Record<string, number> = {}
  const immuneCount: Record<string, number> = {}
  const resistCount: Record<string, number> = {}

  for (const atk of ALL_TYPES) {
    x4Count[atk] = 0
    weakCount[atk] = 0
    immuneCount[atk] = 0
    resistCount[atk] = 0
    for (const types of teamTypes) {
      const mult = combinedEffectiveness(atk, types)
      if (mult === 0) immuneCount[atk]++
      else if (mult >= 4) x4Count[atk]++
      else if (mult >= 2) weakCount[atk]++
      else if (mult < 1) resistCount[atk]++
    }
  }
  return { x4Count, weakCount, immuneCount, resistCount }
}
