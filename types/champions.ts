import type { BaseStats, NormalizedPokemon } from './pokemon'

export type RegulationSet = 'M-A' | 'M-B'

export type NatureName =
  | 'Hardy' | 'Lonely' | 'Brave' | 'Adamant' | 'Naughty'
  | 'Bold' | 'Docile' | 'Relaxed' | 'Impish' | 'Lax'
  | 'Timid' | 'Hasty' | 'Serious' | 'Jolly' | 'Naive'
  | 'Modest' | 'Mild' | 'Quiet' | 'Bashful' | 'Rash'
  | 'Calm' | 'Gentle' | 'Sassy' | 'Careful' | 'Quirky'

export const SP_TOTAL = 66
export const SP_MAX_PER_STAT = 32

/** 66 SP total, max 32 per stat. Replaces EVs in Champions. */
export interface SPSpread {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

export const EMPTY_SP_SPREAD: SPSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

export function totalSP(spread: SPSpread): number {
  return spread.hp + spread.atk + spread.def + spread.spa + spread.spd + spread.spe
}

export function remainingSP(spread: SPSpread): number {
  return SP_TOTAL - totalSP(spread)
}

export function isValidSpread(spread: SPSpread): boolean {
  return (
    totalSP(spread) <= SP_TOTAL &&
    Object.values(spread).every((v) => v >= 0 && v <= SP_MAX_PER_STAT)
  )
}

export interface MegaEvolution {
  baseName: string
  megaName: string
  megaTypes: string[]
  megaBaseStats: BaseStats
  megaAbility: string
  stone: string
}

export interface ChampionsPokemon extends NormalizedPokemon {
  hasMega: boolean
  megaEvolution?: MegaEvolution
  allowedIn: RegulationSet[]
  competitiveRole: CompetitiveRole[]
}

export type CompetitiveRole =
  | 'Sweeper'
  | 'Support'
  | 'Trick Room Setter'
  | 'Trick Room Abuser'
  | 'Redirector'
  | 'Weather Setter'
  | 'Terrain Setter'
  | 'Wall'
  | 'Pivot'
  | 'Lead'

export type PokemonStatus = '' | 'brn' | 'par' | 'psn' | 'tox'

export interface DamageCalcInput {
  attacker: {
    species: string
    nature: NatureName
    spSpread: SPSpread
    ability?: string
    item?: string
    boosts?: Partial<{ atk: number; spa: number; def: number; spd: number; spe: number }>
    megaBaseStats?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }
    status?: PokemonStatus
  }
  defender: {
    species: string
    nature: NatureName
    spSpread: SPSpread
    ability?: string
    item?: string
    boosts?: Partial<{ atk: number; spa: number; def: number; spd: number; spe: number }>
    megaBaseStats?: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }
    status?: PokemonStatus
    currentHpPercent?: number
  }
  move: string
  moveOptions?: {
    isCrit?: boolean
  }
  fieldConditions?: {
    weather?: 'Sun' | 'Rain' | 'Sand' | 'Snow'
    terrain?: 'Electric' | 'Grassy' | 'Misty' | 'Psychic'
    isGravity?: boolean
  }
  attackerSide?: {
    isHelpingHand?: boolean
    isTailwind?: boolean
    isBattery?: boolean
    isPowerSpot?: boolean
  }
  defenderSide?: {
    isFriendGuard?: boolean
    isReflect?: boolean
    isLightScreen?: boolean
    isAuroraVeil?: boolean
  }
}

export interface DamageCalcResult {
  move: string
  attacker: string
  defender: string
  damage: {
    min: number
    max: number
    rolls: number[]
  }
  defenderHP: number
  percentMin: number
  percentMax: number
  koChance: string
  description: string
}

export interface SPOptimizationGoal {
  type: 'survive' | 'ohko' | 'speed_tie' | 'custom_stat'
  attackerSpecies?: string
  attackerSpread?: SPSpread
  move?: string
  targetStat?: keyof SPSpread
  targetValue?: number
  requireGuarantee?: boolean
}

export interface SPOptimizationResult {
  spread: SPSpread
  finalStats: BaseStats
  achieves: boolean
  margin: number
  explanation: string
}
