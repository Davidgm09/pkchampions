export const ALL_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const

export type PokemonType = typeof ALL_TYPES[number]

// Attacking type → defending type → multiplier (omitted = 1)
const CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

function getMultiplier(attacking: string, defending: string): number {
  return CHART[attacking]?.[defending] ?? 1
}

export interface EffectivenessGroups {
  x4: string[]
  x2: string[]
  x1: string[]
  x0_5: string[]
  x0_25: string[]
  x0: string[]
}

export interface OffensiveCoverage {
  x4: string[]
  x2: string[]
}

// Offensive STAB coverage for a Pokémon's types.
// ×4 = every STAB type deals ×2 to this defending type (combined product ≥ 4)
// ×2 = at least one STAB type deals ×2 (but not all of them)
export function calcOffensiveCoverage(attackerTypes: string[]): OffensiveCoverage {
  const x4: string[] = []
  const x2: string[] = []
  for (const def of ALL_TYPES) {
    const best     = Math.max(...attackerTypes.map((atk) => getMultiplier(atk, def)))
    const combined = attackerTypes.reduce((acc, atk) => acc * getMultiplier(atk, def), 1)
    if (combined >= 4) x4.push(def)
    else if (best >= 2) x2.push(def)
  }
  return { x4, x2 }
}

export function calcAllEffectiveness(defenderTypes: string[]): EffectivenessGroups {
  const groups: EffectivenessGroups = { x4: [], x2: [], x1: [], x0_5: [], x0_25: [], x0: [] }
  for (const atk of ALL_TYPES) {
    let mult = 1
    for (const def of defenderTypes) {
      mult *= getMultiplier(atk, def)
    }
    if (mult >= 4)    groups.x4.push(atk)
    else if (mult === 2)    groups.x2.push(atk)
    else if (mult === 0.5)  groups.x0_5.push(atk)
    else if (mult === 0.25) groups.x0_25.push(atk)
    else if (mult === 0)    groups.x0.push(atk)
    else                    groups.x1.push(atk)
  }
  return groups
}
