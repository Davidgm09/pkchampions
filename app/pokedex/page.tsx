import type { Metadata } from 'next'
import { getPokemon } from '@/lib/pokeapi'
import { CHAMPIONS_ROSTER } from '@/data/regulation-mb'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { NormalizedPokemon } from '@/types/pokemon'
import { getPokemonMeta } from '@/lib/champions-meta'
import PokedexClient from '@/components/pokedex/PokedexClient'

export const metadata: Metadata = {
  title: 'Pokédex',
  description: 'Pokédex competitivo para Pokémon Champions — stats, tipos, habilidades y Mega Evoluciones para Regulación M-B.',
}

export default async function PokedexPage() {
  const results = await Promise.allSettled(
    CHAMPIONS_ROSTER.map((entry) => getPokemon(entry.pokeapiName))
  )

  const items = CHAMPIONS_ROSTER
    .map((entry, i) => ({
      entry,
      pokemon: results[i].status === 'fulfilled'
        ? (results[i] as PromiseFulfilledResult<NormalizedPokemon>).value
        : null,
      rank: getPokemonMeta(entry.displayName)?.rank ?? null,
    }))
    .filter((item): item is { entry: ChampionsPokemonEntry; pokemon: NormalizedPokemon; rank: number | null } =>
      item.pokemon !== null
    )

  return <PokedexClient items={items} total={items.length} />
}
