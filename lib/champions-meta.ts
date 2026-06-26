import metaJson from '@/data/champions-meta.json'

export interface ChampionsUsageEntry {
  rank: number
  dex_id: number
  name: string
  form: string | null
  usage_rate: number
  win_rate: number | null
  top_moves: Array<{ id: number; name: string; usage: number }>
  top_items: Array<{ id: number; name: string; usage: number }>
  top_abilities: Array<{ id: number; name: string; usage: number }>
  top_teammates: Array<{ id: number; name: string; usage: number }>
}

export interface ChampionsMeta {
  schema_version: string
  updated_at: string
  season: { id: string; name: string; start_date: string; end_date: string | null }
  pokemon_usage: ChampionsUsageEntry[]
}

const META = metaJson as ChampionsMeta

// Index by lowercased name for O(1) lookup
const BY_NAME = new Map<string, ChampionsUsageEntry>(
  META.pokemon_usage.map((p) => [p.name.toLowerCase(), p])
)

function normalize(s: string) {
  return s.toLowerCase().trim()
}

// Lookup by display name as used in our roster.
// Handles: "Garchomp" → "garchomp", "Basculegion (M)" → "basculegion",
// "Basculegion (F)" → "basculegion-f", regional forms, etc.
export function getPokemonMeta(displayName: string): ChampionsUsageEntry | null {
  const key = normalize(displayName)
  if (BY_NAME.has(key)) return BY_NAME.get(key)!

  // Strip parenthetical form suffixes: "Basculegion (M)" → "Basculegion"
  const withoutParens = key.replace(/\s*\([^)]+\)\s*$/, '').trim()
  if (BY_NAME.has(withoutParens)) return BY_NAME.get(withoutParens)!

  // Female form: "(F)" → "-f"
  if (key.includes('(f)')) {
    const femaleKey = withoutParens + '-f'
    if (BY_NAME.has(femaleKey)) return BY_NAME.get(femaleKey)!
  }

  return null
}

// Lookup a specific mega form, e.g. "Mega Garchomp" or "Mega Charizard X"
export function getMegaMeta(megaName: string): ChampionsUsageEntry | null {
  // "Mega Garchomp" → "garchomp-mega"
  // "Mega Charizard X" → "charizard-mega-x"
  const lower = normalize(megaName)
  const withoutMega = lower.replace(/^mega\s+/, '')
  const parts = withoutMega.split(' ')
  const base = parts[0]
  const suffix = parts.slice(1).join('-')
  const key = suffix ? `${base}-mega-${suffix}` : `${base}-mega`
  return BY_NAME.get(key) ?? null
}

export function getAllMeta(): ChampionsUsageEntry[] {
  return META.pokemon_usage
}

// Lookup by pokeapiName slug for sprite resolution in the calculator picker
export function getMetaByPokeapiName(pokeapiName: string): ChampionsUsageEntry | null {
  return BY_NAME.get(pokeapiName.toLowerCase()) ?? null
}

export function getMetaInfo() {
  return { updated_at: META.updated_at, season: META.season }
}
