import type { BaseStats } from '@/types/pokemon'
import statsJson from '@/data/base-stats.json'

const DB = statsJson as Record<string, BaseStats>

export function getBaseStats(pokeapiName: string): BaseStats | null {
  return DB[pokeapiName] ?? null
}
