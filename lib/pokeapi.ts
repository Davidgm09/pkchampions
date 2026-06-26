import type { NormalizedPokemon, PokeAPIResponse } from '@/types/pokemon'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'
const CACHE_DURATION = 60 * 60 * 24 // 24h in seconds

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: CACHE_DURATION },
  })
  if (!res.ok) throw new Error(`PokeAPI error ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

function normalizeName(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStatValue(data: PokeAPIResponse, statName: string): number {
  return data.stats.find((s) => s.stat.name === statName)?.base_stat ?? 0
}

export function normalizePokemon(data: PokeAPIResponse): NormalizedPokemon {
  const baseStats = {
    hp: getStatValue(data, 'hp'),
    atk: getStatValue(data, 'attack'),
    def: getStatValue(data, 'defense'),
    spa: getStatValue(data, 'special-attack'),
    spd: getStatValue(data, 'special-defense'),
    spe: getStatValue(data, 'speed'),
  }

  const totalBST = Object.values(baseStats).reduce((a, b) => a + b, 0)

  return {
    id: data.id,
    name: normalizeName(data.name),
    types: data.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    baseStats,
    abilities: data.abilities.map((a) => ({
      name: normalizeName(a.ability.name),
      isHidden: a.is_hidden,
    })),
    sprite: data.sprites.front_default,
    artwork: data.sprites.other?.['official-artwork']?.front_default ?? null,
    height: data.height,
    weight: data.weight,
    totalBST,
  }
}

export async function getPokemon(nameOrId: string | number): Promise<NormalizedPokemon> {
  const key = typeof nameOrId === 'string' ? nameOrId.toLowerCase().replace(/ /g, '-') : nameOrId
  const data = await fetchJSON<PokeAPIResponse>(`${POKEAPI_BASE}/pokemon/${key}`)
  return normalizePokemon(data)
}

export async function getPokemonBatch(ids: number[]): Promise<NormalizedPokemon[]> {
  const results = await Promise.allSettled(ids.map((id) => getPokemon(id)))
  return results
    .filter((r): r is PromiseFulfilledResult<NormalizedPokemon> => r.status === 'fulfilled')
    .map((r) => r.value)
}

export interface PokemonListEntry {
  name: string
  url: string
}

export async function getPokemonList(limit = 100, offset = 0): Promise<PokemonListEntry[]> {
  const data = await fetchJSON<{ results: PokemonListEntry[] }>(
    `${POKEAPI_BASE}/pokemon?limit=${limit}&offset=${offset}`
  )
  return data.results
}


export async function getTypeData(typeName: string): Promise<{
  doubleDamageTo: string[]
  halfDamageTo: string[]
  noDamageTo: string[]
  doubleDamageFrom: string[]
  halfDamageFrom: string[]
  noDamageFrom: string[]
}> {
  const data = await fetchJSON<{
    damage_relations: {
      double_damage_to: Array<{ name: string }>
      half_damage_to: Array<{ name: string }>
      no_damage_to: Array<{ name: string }>
      double_damage_from: Array<{ name: string }>
      half_damage_from: Array<{ name: string }>
      no_damage_from: Array<{ name: string }>
    }
  }>(`${POKEAPI_BASE}/type/${typeName}`)

  const dr = data.damage_relations
  return {
    doubleDamageTo: dr.double_damage_to.map((t) => t.name),
    halfDamageTo: dr.half_damage_to.map((t) => t.name),
    noDamageTo: dr.no_damage_to.map((t) => t.name),
    doubleDamageFrom: dr.double_damage_from.map((t) => t.name),
    halfDamageFrom: dr.half_damage_from.map((t) => t.name),
    noDamageFrom: dr.no_damage_from.map((t) => t.name),
  }
}
