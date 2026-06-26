const POKEAPI_BASE = 'https://pokeapi.co/api/v2'
const CACHE: RequestInit = { next: { revalidate: 86400 } } as RequestInit

interface RawMoveDetail {
  type: { name: string }
  damage_class: { name: string }
  power: number | null
}

function toCategory(damageClass: string): 'Physical' | 'Special' | 'Status' {
  if (damageClass === 'physical') return 'Physical'
  if (damageClass === 'special') return 'Special'
  return 'Status'
}

export interface EnrichedMove {
  name: string
  usage: number
  type: string | null
  category: 'Physical' | 'Special' | 'Status' | null
  power: number | null
}

export async function enrichTopMoves(
  topMoves: Array<{ name: string; usage: number }>
): Promise<EnrichedMove[]> {
  const results = await Promise.allSettled(
    topMoves.map(async (m) => {
      const slug = m.name.toLowerCase().replace(/\s+/g, '-')
      const res = await fetch(`${POKEAPI_BASE}/move/${slug}`, CACHE)
      if (!res.ok) return { ...m, type: null, category: null, power: null }
      const d = await res.json() as RawMoveDetail
      return {
        ...m,
        type: d.type.name,
        category: toCategory(d.damage_class.name),
        power: d.power,
      }
    })
  )
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...topMoves[i], type: null, category: null, power: null }
  )
}
