'use client'

import { useState, useMemo } from 'react'
import type { NormalizedPokemon } from '@/types/pokemon'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import PokemonCard from '@/components/pokedex/PokemonCard'
import { useLanguage } from '@/contexts/LanguageContext'

const ALL_TYPES = [
  'fire','water','grass','electric','psychic','dragon','steel',
  'ghost','fighting','fairy','normal','ice','rock','ground',
  'poison','bug','flying','dark',
]

type SortKey = 'dex' | 'name' | 'usage' | 'bst' | 'speed' | 'hp' | 'atk' | 'def' | 'spa' | 'spd'

interface Item {
  entry:   ChampionsPokemonEntry
  pokemon: NormalizedPokemon
  rank:    number | null
}

interface Props {
  items: Item[]
  total: number
}

export default function PokedexClient({ items, total }: Props) {
  const { t } = useLanguage()
  const [search,      setSearch]      = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [onlyMega,    setOnlyMega]    = useState(false)
  const [maxRank,     setMaxRank]     = useState<10 | 25 | 50 | null>(null)
  const [sortKey,     setSortKey]     = useState<SortKey>('dex')
  const [sortDesc,    setSortDesc]    = useState(false)

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'dex',   label: t('dex.sort.dex') },
    { key: 'name',  label: t('dex.sort.name') },
    { key: 'usage', label: t('dex.sort.usage') },
    { key: 'bst',   label: t('dex.sort.bst') },
    { key: 'speed', label: t('dex.sort.speed') },
    { key: 'hp',    label: t('dex.sort.hp') },
    { key: 'atk',   label: t('dex.sort.atk') },
    { key: 'def',   label: t('dex.sort.def') },
    { key: 'spa',   label: t('dex.sort.spa') },
    { key: 'spd',   label: t('dex.sort.spd') },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const result = items.filter(({ entry, pokemon, rank }) => {
      if (q && !entry.displayName.toLowerCase().includes(q) && !entry.id.includes(q)) return false
      if (onlyMega && !entry.hasMega) return false
      if (activeTypes.size > 0 && !pokemon.types.some(tp => activeTypes.has(tp))) return false
      if (maxRank !== null && (rank === null || rank > maxRank)) return false
      return true
    })

    result.sort((a, b) => {
      let diff = 0
      if (sortKey === 'dex') {
        diff = a.pokemon.id - b.pokemon.id
      } else if (sortKey === 'name') {
        diff = a.entry.displayName.localeCompare(b.entry.displayName)
      } else if (sortKey === 'usage') {
        const ra = a.rank ?? 9999
        const rb = b.rank ?? 9999
        diff = ra - rb
      } else if (sortKey === 'bst') {
        diff = a.pokemon.totalBST - b.pokemon.totalBST
      } else if (sortKey === 'speed') {
        diff = a.pokemon.baseStats.spe - b.pokemon.baseStats.spe
      } else if (sortKey === 'hp') {
        diff = a.pokemon.baseStats.hp - b.pokemon.baseStats.hp
      } else if (sortKey === 'atk') {
        diff = a.pokemon.baseStats.atk - b.pokemon.baseStats.atk
      } else if (sortKey === 'def') {
        diff = a.pokemon.baseStats.def - b.pokemon.baseStats.def
      } else if (sortKey === 'spa') {
        diff = a.pokemon.baseStats.spa - b.pokemon.baseStats.spa
      } else if (sortKey === 'spd') {
        diff = a.pokemon.baseStats.spd - b.pokemon.baseStats.spd
      }
      const defaultDesc = sortKey !== 'name' && sortKey !== 'dex' && sortKey !== 'usage'
      return (defaultDesc ? !sortDesc : sortDesc) ? -diff : diff
    })

    return result
  }, [items, search, activeTypes, onlyMega, maxRank, sortKey, sortDesc])

  const toggleType = (type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(d => !d)
    } else {
      setSortKey(key)
      setSortDesc(false)
    }
  }

  const hasFilters = search || onlyMega || activeTypes.size > 0 || maxRank !== null

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="font-display text-4xl font-bold text-white">{t('dex.title')}</h1>
        <p className="text-champ-muted font-body text-sm mt-1">
          {t('dex.subtitle', { count: String(total) })}
        </p>
      </div>

      {/* Search + Mega filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('dex.search')}
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
          {t('dex.onlyMega')}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setActiveTypes(new Set()); setOnlyMega(false); setMaxRank(null); setSortKey('dex'); setSortDesc(false) }}
            className="text-xs px-3 py-2 rounded-lg border border-champ-border text-champ-muted hover:text-white font-body transition-colors"
          >
            {t('dex.clear')}
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-4 flex flex-wrap gap-2 items-center">
        <span className="text-champ-muted text-xs font-body mr-1 shrink-0">{t('dex.typeFilter')}</span>
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
            {t('type.' + type)}
          </button>
        ))}
      </div>

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-champ-muted text-xs font-body shrink-0">{t('dex.tierFilter')}</span>
        {([null, 10, 25, 50] as const).map(tier => {
          const active = maxRank === tier
          const label  = tier === null ? t('dex.tier.all') : t(`dex.tier.top${tier}` as 'dex.tier.top10')
          return (
            <button
              key={String(tier)}
              type="button"
              onClick={() => setMaxRank(tier)}
              className={`text-xs px-2.5 py-1 rounded border font-body transition-colors ${
                active
                  ? 'bg-champ-gold/20 border-champ-gold text-champ-gold'
                  : 'border-champ-border text-champ-muted hover:text-white hover:border-champ-gold/50'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Sort */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-champ-muted text-xs font-body shrink-0">{t('dex.sortLabel')}</span>
        {SORT_OPTIONS.map(({ key, label }) => {
          const active = sortKey === key
          const arrow  = active ? (sortDesc ? ' ↑' : ' ↓') : ''
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSort(key)}
              className={`text-xs px-2.5 py-1 rounded border font-body transition-colors ${
                active
                  ? 'bg-champ-blue/20 border-champ-blue text-white'
                  : 'border-champ-border text-champ-muted hover:text-white hover:border-champ-blue/50'
              }`}
            >
              {label}{arrow}
            </button>
          )
        })}
      </div>

      {/* Count */}
      <p className="text-xs text-champ-muted font-body">
        {hasFilters
          ? t('dex.countFiltered', { count: String(filtered.length), total: String(items.length) })
          : t('dex.count', { count: String(filtered.length) })}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(({ entry, pokemon }) => (
          <PokemonCard key={entry.id} pokemon={pokemon} entry={entry} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-champ-muted font-body">
          {t('dex.noMatch')}
        </div>
      )}
    </div>
  )
}
