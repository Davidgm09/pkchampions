// Run: node scripts/fetch-champions-meta.mjs
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'data', 'champions-meta.json')
const URL = 'https://playditto-server.vercel.app/trpc/champions.meta'

console.log('Fetching champions meta from PlayDitto...')
const res = await fetch(URL)
if (!res.ok) throw new Error(`HTTP ${res.status}`)

const body = await res.json()
const data = body.result.data

writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8')
console.log(`✓ Saved ${data.pokemon_usage.length} Pokémon — updated_at: ${data.updated_at}`)
