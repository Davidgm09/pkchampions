'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CHAMPIONS_ROSTER, type ChampionsPokemonEntry } from '@/data/regulation-mb'
import { getMetaByPokeapiName } from '@/lib/champions-meta'

function entryLabel(entry: ChampionsPokemonEntry): string {
  return entry.formLabel ? `${entry.displayName} (${entry.formLabel})` : entry.displayName
}

function spriteUrl(entry: ChampionsPokemonEntry): string | null {
  const meta = getMetaByPokeapiName(entry.pokeapiName)
  if (meta?.dex_id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${meta.dex_id}.png`
  }
  return null
}

interface PokemonPickerProps {
  value: ChampionsPokemonEntry | null
  onChange: (entry: ChampionsPokemonEntry) => void
  label?: string
}

export default function PokemonPicker({ value, onChange, label }: PokemonPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search.trim()
    ? CHAMPIONS_ROSTER.filter(e =>
        entryLabel(e).toLowerCase().includes(search.toLowerCase()) ||
        e.id.includes(search.toLowerCase())
      ).slice(0, 50)
    : CHAMPIONS_ROSTER.slice(0, 50)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  const select = useCallback((entry: ChampionsPokemonEntry) => {
    onChange(entry)
    setOpen(false)
    setSearch('')
  }, [onChange])

  const valueSprite = value ? spriteUrl(value) : null

  return (
    <div ref={wrapperRef} className="relative">
      {label && <p className="text-xs text-champ-muted font-body mb-1">{label}</p>}

      <button
        type="button"
        onClick={() => { setSearch(''); setOpen(o => !o) }}
        className="w-full flex items-center gap-2 bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 hover:border-champ-blue transition-colors text-left min-h-[40px]"
      >
        {value ? (
          <>
            {valueSprite ? (
              <img src={valueSprite} alt="" width={28} height={28} className="object-contain shrink-0 w-7 h-7" />
            ) : (
              <div className="w-7 h-7 shrink-0" />
            )}
            <span className="text-sm text-white font-body flex-1 truncate">{entryLabel(value)}</span>
            {value.hasMega && (
              <span className="text-[9px] font-bold text-champ-gold bg-champ-gold/10 px-1 py-0.5 rounded font-body shrink-0">
                MEGA
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-champ-muted font-body flex-1">Elegir Pokémon...</span>
        )}
        <span className="text-champ-muted text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-champ-surface border border-champ-border rounded-xl shadow-2xl overflow-hidden" style={{ minWidth: '220px' }}>
          <div className="p-2 border-b border-champ-border">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-champ-muted text-sm font-body text-center py-4">Sin resultados</p>
            ) : (
              filtered.map(entry => {
                const sprite = spriteUrl(entry)
                const isSelected = value?.id === entry.id
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => select(entry)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-champ-elevated transition-colors text-left ${
                      isSelected ? 'bg-champ-blue/10' : ''
                    }`}
                  >
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                      {sprite ? (
                        <img src={sprite} alt="" width={32} height={32} className="object-contain" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-champ-border" />
                      )}
                    </div>
                    <span className={`text-sm font-body flex-1 truncate ${isSelected ? 'text-champ-blue font-semibold' : 'text-white'}`}>
                      {entryLabel(entry)}
                    </span>
                    {entry.hasMega && (
                      <span className="text-[9px] font-bold text-champ-gold shrink-0">M</span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {!search.trim() && (
            <p className="text-center text-champ-muted text-[10px] font-body py-1.5 border-t border-champ-border">
              Mostrando 50 de {CHAMPIONS_ROSTER.length} · escribe para filtrar
            </p>
          )}
        </div>
      )}
    </div>
  )
}
