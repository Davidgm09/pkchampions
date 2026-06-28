// Module-level cache: English Showdown name → Spanish display name
const esCache: Record<string, string> = {}
const inFlight: Record<string, Promise<string | null> | undefined> = {}

function toPokeAPIName(enShowdown: string): string {
  return enShowdown.toLowerCase().replace(/\s+/g, '-')
}

export function getMoveNameES(enShowdown: string): string | null {
  return esCache[enShowdown] ?? null
}

export async function fetchMoveNameES(enShowdown: string): Promise<string | null> {
  if (esCache[enShowdown] !== undefined) return esCache[enShowdown]
  if (inFlight[enShowdown]) return inFlight[enShowdown]

  const promise = fetch(`https://pokeapi.co/api/v2/move/${toPokeAPIName(enShowdown)}`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then((data: { names: Array<{ language: { name: string }; name: string }> }) => {
      const es = data.names.find(n => n.language.name === 'es')?.name ?? null
      if (es) esCache[enShowdown] = es
      delete inFlight[enShowdown]
      return es
    })
    .catch(() => { delete inFlight[enShowdown]; return null })

  inFlight[enShowdown] = promise
  return promise
}
