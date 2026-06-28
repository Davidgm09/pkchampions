import { getMetaByPokeapiName } from '@/lib/champions-meta'

// Module-level cache: pokeapiName → sprite URL (null = not found)
const cache: Record<string, string | null> = {}
const inFlight: Record<string, Promise<string | null> | undefined> = {}

/** Fast sync lookup — returns null if not yet fetched */
export function getCachedSprite(pokeapiName: string): string | null {
  // Fast path: meta already has dex_id
  const meta = getMetaByPokeapiName(pokeapiName)
  if (meta?.dex_id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${meta.dex_id}.png`
  }
  return cache[pokeapiName] ?? null
}

/** Async fetch — resolves to sprite URL and fills the cache */
export async function fetchSprite(pokeapiName: string): Promise<string | null> {
  const meta = getMetaByPokeapiName(pokeapiName)
  if (meta?.dex_id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${meta.dex_id}.png`
  }
  if (pokeapiName in cache) return cache[pokeapiName]
  if (inFlight[pokeapiName]) return inFlight[pokeapiName]!

  const p = fetch(`https://pokeapi.co/api/v2/pokemon/${pokeapiName}`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then((d: { sprites: { front_default: string | null } }) => {
      const url = d.sprites?.front_default ?? null
      cache[pokeapiName] = url
      delete inFlight[pokeapiName]
      return url
    })
    .catch(() => { cache[pokeapiName] = null; delete inFlight[pokeapiName]; return null })

  inFlight[pokeapiName] = p
  return p
}
