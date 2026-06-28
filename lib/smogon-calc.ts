import { Pokemon, Move, Field, calculate, Generations } from '@smogon/calc'
import type { DamageCalcInput, DamageCalcResult } from '@/types/champions'
import { spSpreadToEVs } from '@/lib/sp-utils'

const gen = Generations.get(9)

/** Converts pokeapiName slug → Pokémon Showdown species name.
 *  e.g. 'raichu-alola' → 'Raichu-Alola', 'charizard' → 'Charizard'
 */
export function toSmogonSpecies(slug: string): string {
  return slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-')
}

function buildPokemon(
  species: string,
  nature: string,
  spSpread: Parameters<typeof spSpreadToEVs>[0],
  ability?: string,
  item?: string,
  boosts?: Record<string, number>,
  megaBaseStats?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number },
  status?: string,
  curHpPercent = 100
): Pokemon {
  const evs = spSpreadToEVs(spSpread)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    nature: nature,
    evs: { hp: evs.hp, atk: evs.atk, def: evs.def, spa: evs.spa, spd: evs.spd, spe: evs.spe },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    ability: ability,
    item: item,
    boosts: boosts,
    status: status || '',
    level: 50,
    // Override base stats for Champion mega evolutions (they don't exist natively in Gen 9)
    overrides: megaBaseStats ? { baseStats: megaBaseStats } : undefined,
  }

  if (curHpPercent < 100) {
    const temp = new Pokemon(gen, species, opts as never)
    const maxHP = temp.maxHP()
    const curHP = Math.max(1, Math.round(maxHP * curHpPercent / 100))
    return new Pokemon(gen, species, { ...opts, curHP } as never)
  }

  return new Pokemon(gen, species, opts as never)
}

export function runDamageCalc(input: DamageCalcInput): DamageCalcResult {
  const attacker = buildPokemon(
    input.attacker.species,
    input.attacker.nature,
    input.attacker.spSpread,
    input.attacker.ability,
    input.attacker.item,
    input.attacker.boosts as Record<string, number> | undefined,
    input.attacker.megaBaseStats,
    input.attacker.status
  )

  const defender = buildPokemon(
    input.defender.species,
    input.defender.nature,
    input.defender.spSpread,
    input.defender.ability,
    input.defender.item,
    input.defender.boosts as Record<string, number> | undefined,
    input.defender.megaBaseStats,
    input.defender.status,
    input.defender.currentHpPercent ?? 100
  )

  const move = new Move(gen, input.move, {
    isCrit: input.moveOptions?.isCrit,
  })

  const field = new Field({
    gameType: 'Doubles',  // Champions is always doubles
    weather: input.fieldConditions?.weather as never,
    terrain: input.fieldConditions?.terrain as never,
    isGravity: input.fieldConditions?.isGravity ?? false,
    attackerSide: {
      isHelpingHand: input.attackerSide?.isHelpingHand ?? false,
      isTailwind: input.attackerSide?.isTailwind ?? false,
      isBattery: input.attackerSide?.isBattery ?? false,
      isPowerSpot: input.attackerSide?.isPowerSpot ?? false,
    },
    defenderSide: {
      isFriendGuard: input.defenderSide?.isFriendGuard ?? false,
      isReflect: input.defenderSide?.isReflect ?? false,
      isLightScreen: input.defenderSide?.isLightScreen ?? false,
      isAuroraVeil: input.defenderSide?.isAuroraVeil ?? false,
    },
  } as never)

  const result = calculate(gen, attacker, defender, move, field)

  if (!Array.isArray(result.damage) || (result.damage as number[]).every(d => d === 0)) {
    throw new Error(`"${input.move}" no causa daño directo — usa un movimiento de ataque.`)
  }

  const rolls = result.damage as number[]
  const defenderHP = defender.maxHP()
  const minDmg = Math.min(...rolls)
  const maxDmg = Math.max(...rolls)
  const percentMin = parseFloat(((minDmg / defenderHP) * 100).toFixed(1))
  const percentMax = parseFloat(((maxDmg / defenderHP) * 100).toFixed(1))

  return {
    move: input.move,
    moveType: move.type as string,
    moveCategory: move.category as 'Physical' | 'Special' | 'Status',
    attacker: input.attacker.species,
    defender: input.defender.species,
    damage: { min: minDmg, max: maxDmg, rolls },
    defenderHP,
    percentMin,
    percentMax,
    koChance: result.kochance().text,
    description: result.desc(),
  }
}

export function formatCalcResult(result: DamageCalcResult): string {
  return `${result.percentMin}–${result.percentMax}% (${result.koChance})`
}

export function calcDamageDelta(
  input: DamageCalcInput,
  targetSide: 'attacker' | 'defender',
  stat: 'atk' | 'spa' | 'def' | 'spd',
  spDelta: number
): { before: DamageCalcResult; after: DamageCalcResult } {
  const before = runDamageCalc(input)
  const modified = JSON.parse(JSON.stringify(input)) as DamageCalcInput
  modified[targetSide].spSpread[stat] = Math.max(
    0,
    Math.min(32, modified[targetSide].spSpread[stat] + spDelta)
  )
  const after = runDamageCalc(modified)
  return { before, after }
}
