'use client'

import { useState, useMemo } from 'react'
import type { NormalizedPokemon } from '@/types/pokemon'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import PokemonCard from '@/components/pokedex/PokemonCard'
import { TYPE_NAMES } from '@/components/pokedex/TypeBadge'

const ALL_TYPES = [
  'fire','water','grass','electric','psychic','dragon','steel',
  'ghost','fighting','fairy','normal','ice','rock','ground',
  'poison','bug','flying','dark',
]

interface Item {
  entry: ChampionsPokemonEntry
  pokemon: NormalizedPokemon
}

interface Props {
  items: Item[]
}

export default function PokedexClient({ items }: Props) {
  const [search,     setSearch]     = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [onlyMega,   setOnlyMega]   = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter(({ entry, pokemon }) => {
      if (q && !entry.displayName.toLowerCase().includes(q)) return false
      if (onlyMega && !entry.hasMega) return false
      if (activeTypes.size > 0 && !pokemon.types.some(t => activeTypes.has(t))) return false
      return true
    })
  }, [items, search, activeTypes, onlyMega])

  const toggleType = (type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const hasFilters = search || onlyMega || activeTypes.size > 0

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda + Mega */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar Pokémon..."
          className="flex-1 min-w-48 bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors"
        />
        <button
          type="button"
          onClick={() => setOnlyMega(v => !v)}
          className={`text-xs px-3 py-2 rounded-lg border font-body transition-colors ${
            onlyMega
              ? 'bg-champ-gold/20 border-champ-gold text-champ-gold'
              : 'border-champ-border text-champ-muted hover:text-white hover:border-champ-gold/50'
          }`}
        >
          Solo Mega
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setActiveTypes(new Set()); setOnlyMega(false) }}
            className="text-xs px-3 py-2 rounded-lg border border-champ-border text-champ-muted hover:text-white font-body transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Filtro por tipo */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-4 flex flex-wrap gap-2 items-center">
        <span className="text-champ-muted text-xs font-body mr-1 shrink-0">Tipo:</span>
        {ALL_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            className={`px-2.5 py-1 text-xs rounded border font-body transition-colors ${
              activeTypes.has(type)
                ? 'bg-champ-blue/20 border-champ-blue text-white'
                : 'border-champ-border text-champ-muted hover:text-white hover:border-champ-blue/50'
            }`}
          >
            {TYPE_NAMES[type] ?? type}
          </button>
        ))}
      </div>

      {/* Contador */}
      <p className="text-xs text-champ-muted font-body">
        {filtered.length} Pokémon{hasFilters ? ` de ${items.length}` : ''}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(({ entry, pokemon }) => (
          <PokemonCard key={entry.id} pokemon={pokemon} entry={entry} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-champ-muted font-body">
          No hay Pokémon que coincidan con los filtros.
        </div>
      )}
    </div>
  )
}
