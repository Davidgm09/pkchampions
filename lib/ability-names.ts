// Module-level cache shared across all components
const esCache: Record<string, string | null> = {}
const inFlight: Record<string, Promise<string | null> | undefined> = {}

function toAPIName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function getCachedAbilityES(enName: string): string | null {
  return esCache[enName] ?? null
}

export async function fetchAbilityES(enName: string): Promise<string | null> {
  if (enName in esCache) return esCache[enName]
  if (inFlight[enName]) return inFlight[enName]!
  const p = fetch(`https://pokeapi.co/api/v2/ability/${toAPIName(enName)}`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then((d: { names: Array<{ language: { name: string }; name: string }> }) => {
      const es = d.names.find(n => n.language.name === 'es')?.name ?? null
      esCache[enName] = es
      delete inFlight[enName]
      return es
    })
    .catch(() => { esCache[enName] = null; delete inFlight[enName]; return null })
  inFlight[enName] = p
  return p
}
