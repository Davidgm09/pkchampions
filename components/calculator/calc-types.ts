import type { SPSpread, NatureName, MegaEvolution, PokemonStatus } from '@/types/champions'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'

export interface PokemonSide {
  entry:        ChampionsPokemonEntry | null
  nature:       NatureName
  spSpread:     SPSpread
  ability:      string
  item:         string
  selectedMega: MegaEvolution | null
  status:       PokemonStatus
  boostAtk:     number
  boostSpa:     number
  boostDef:     number
  boostSpd:     number
  boostSpe:     number
  // attacker-only
  isHelpingHand: boolean
  isCrit:        boolean
  isTailwind:    boolean
  isBattery:     boolean
  isPowerSpot:   boolean
  // defender-only
  isFriendGuard:    boolean
  isReflect:        boolean
  isLightScreen:    boolean
  isAuroraVeil:     boolean
  currentHpPercent: number
}

export type KOColor = 'green' | 'yellow' | 'red'
export interface KOBadge { label: string; color: KOColor }

export function getKOBadge(ko: string): KOBadge {
  const t = ko.toLowerCase()
  if (t.includes('guaranteed') && t.includes('ohko'))
    return { label: 'OHKO garantizado', color: 'green' }
  if (t.includes('guaranteed') && t.includes('2hko'))
    return { label: '2HKO garantizado', color: 'yellow' }
  if (t.includes('ohko'))
    return { label: 'OHKO posible', color: 'red' }
  if (t.includes('2hko'))
    return { label: '2HKO posible', color: 'red' }
  return { label: 'No garantiza 2HKO', color: 'red' }
}

export const KO_BADGE_CLS: Record<KOColor, string> = {
  green:  'bg-green-500 text-white',
  yellow: 'bg-champ-gold text-black',
  red:    'bg-red-600 text-white',
}

export const KO_BORDER_CLS: Record<KOColor, string> = {
  green:  'border-green-500/50 bg-green-500/5',
  yellow: 'border-champ-gold/50 bg-champ-gold/5',
  red:    'border-red-500/30 bg-red-500/5',
}

export function onlyNonZero(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== 0))
}
