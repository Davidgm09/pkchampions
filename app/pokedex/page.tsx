import type { Metadata } from 'next'
import { getPokemon } from '@/lib/pokeapi'
import { CHAMPIONS_ROSTER } from '@/data/regulation-mb'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { NormalizedPokemon } from '@/types/pokemon'
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
    }))
    .filter((item): item is { entry: ChampionsPokemonEntry; pokemon: NormalizedPokemon } =>
      item.pokemon !== null
    )

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold text-white">Pokédex</h1>
          <p className="text-champ-muted font-body text-sm mt-1">
            Regulación M-B · {items.length} Pokémon disponibles
          </p>
        </div>
        <span className="text-xs text-champ-blue-glow border border-champ-blue/40 rounded-full px-3 py-1 font-body">
          Reg M-B
        </span>
      </div>

      <PokedexClient items={items} />
    </div>
  )
}
