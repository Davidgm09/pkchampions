import type { Metadata } from 'next'
import { getPokemon } from '@/lib/pokeapi'
import { CHAMPIONS_ROSTER } from '@/data/regulation-mb'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { NormalizedPokemon } from '@/types/pokemon'
import PokemonCard from '@/components/pokedex/PokemonCard'
import { TYPE_NAMES } from '@/components/pokedex/TypeBadge'

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

  const TYPES = ['fire','water','grass','electric','psychic','dragon','steel','ghost','fighting','fairy','normal','ice','rock','ground','poison','bug','flying','dark']

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

      {/* Filtro por tipo */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-4 flex flex-wrap gap-2 items-center">
        <span className="text-champ-muted text-sm font-body mr-1">Tipo:</span>
        {TYPES.map((type) => (
          <button
            key={type}
            className="px-2.5 py-1 text-xs rounded border border-champ-border text-champ-muted hover:text-white hover:border-champ-blue font-body transition-colors"
          >
            {TYPE_NAMES[type] ?? type}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map(({ entry, pokemon }) => (
          <PokemonCard key={entry.id} pokemon={pokemon} entry={entry} />
        ))}
      </div>
    </div>
  )
}
