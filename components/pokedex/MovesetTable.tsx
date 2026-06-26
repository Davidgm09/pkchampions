'use client'

import { useState, useMemo } from 'react'
import type { PokemonMove } from '@/types/pokemon'
import TypeBadge from '@/components/pokedex/TypeBadge'

interface Props {
  moves: PokemonMove[]
}

const CATEGORY_ICON: Record<PokemonMove['category'], string> = {
  Physical: '⚔',
  Special:  '✦',
  Status:   '—',
}

const CATEGORY_COLOR: Record<PokemonMove['category'], string> = {
  Physical: 'text-champ-danger',
  Special:  'text-champ-blue-glow',
  Status:   'text-champ-muted',
}

type SortKey = 'name' | 'type' | 'category' | 'power' | 'accuracy'

export default function MovesetTable({ moves }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('power')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return moves.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    )
  }, [moves, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'power')    cmp = (a.power ?? -1) - (b.power ?? -1)
      else if (sortKey === 'accuracy') cmp = (a.accuracy ?? -1) - (b.accuracy ?? -1)
      else if (sortKey === 'name')     cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'type')     cmp = a.type.localeCompare(b.type)
      else if (sortKey === 'category') cmp = a.category.localeCompare(b.category)
      return sortAsc ? cmp : -cmp
    })
  }, [filtered, sortKey, sortAsc])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortHeader({ colKey, label }: { colKey: SortKey; label: string }) {
    const active = sortKey === colKey
    return (
      <th
        className={`px-3 py-2 text-left text-xs font-semibold font-body cursor-pointer select-none whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-champ-muted hover:text-white'}`}
        onClick={() => handleSort(colKey)}
      >
        {label}
        {active && <span className="ml-1 opacity-60">{sortAsc ? '▲' : '▼'}</span>}
      </th>
    )
  }

  return (
    <div className="bg-champ-surface border border-champ-border rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-white">
          Moveset
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar movimiento..."
          className="bg-champ-elevated border border-champ-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors w-48"
        />
      </div>

      {sorted.length === 0 ? (
        <p className="text-champ-muted font-body text-sm py-4 text-center">
          {query ? 'Sin resultados.' : 'No hay movimientos disponibles.'}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-champ-border">
                <SortHeader colKey="name"     label="Movimiento" />
                <SortHeader colKey="type"     label="Tipo" />
                <SortHeader colKey="category" label="Cat." />
                <SortHeader colKey="power"    label="Potencia" />
                <SortHeader colKey="accuracy" label="Precisión" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr
                  key={m.name}
                  className="border-b border-champ-border/40 hover:bg-champ-elevated/50 transition-colors"
                >
                  <td className="px-3 py-2 text-white font-body">{m.name}</td>
                  <td className="px-3 py-2">
                    <TypeBadge type={m.type} size="sm" />
                  </td>
                  <td className={`px-3 py-2 font-mono font-bold ${CATEGORY_COLOR[m.category]}`}>
                    {CATEGORY_ICON[m.category]}
                  </td>
                  <td className="px-3 py-2 font-mono text-white">
                    {m.power ?? <span className="text-champ-muted">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-white">
                    {m.accuracy !== null ? `${m.accuracy}%` : <span className="text-champ-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-champ-muted text-xs font-body">
        {sorted.length} de {moves.length} movimientos
      </p>
    </div>
  )
}
