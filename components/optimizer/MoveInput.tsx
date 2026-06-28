'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchMoveNameES } from '@/lib/move-names'

const INPUT_CLS = 'w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors'

function toShowdownMove(name: string): string {
  return name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

interface Props {
  value:        string
  onChange:     (v: string) => void
  pokeapiName?: string | null
  placeholder?: string
}

export default function MoveInput({ value, onChange, pokeapiName, placeholder = 'ej. Earthquake' }: Props) {
  const [moves,        setMoves]        = useState<string[]>([])     // English Showdown names
  const [esNames,      setEsNames]      = useState<Record<string, string>>({}) // EN → ES cache
  const [open,         setOpen]         = useState(false)
  const [displayValue, setDisplayValue] = useState(value)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const ownChange  = useRef(false)
  const { lang, t } = useLanguage()

  // ── Fetch moves for the selected Pokémon ─────────────────────────────────
  useEffect(() => {
    if (!pokeapiName) { setMoves([]); return }
    let cancelled = false
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokeapiName}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { moves: Array<{ move: { name: string } }> }) => {
        if (cancelled) return
        const names = data.moves
          .map(m => toShowdownMove(m.move.name))
          .sort((a, b) => a.localeCompare(b))
        setMoves(names)
      })
      .catch(() => { if (!cancelled) setMoves([]) })
    return () => { cancelled = true }
  }, [pokeapiName])

  // ── Filter suggestions ────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!moves.length) return []
    const q = displayValue.toLowerCase().trim()
    return moves.filter(en => {
      const label = lang === 'es' ? (esNames[en] ?? en) : en
      return label.toLowerCase().includes(q)
    }).slice(0, 15)
  }, [moves, displayValue, lang, esNames])

  // ── Fetch Spanish names for current suggestions (lazy) ───────────────────
  const suggestionsKey = suggestions.join('|')
  useEffect(() => {
    if (lang !== 'es' || suggestions.length === 0) return
    const toFetch = suggestions.filter(en => !esNames[en])
    if (toFetch.length === 0) return

    let cancelled = false
    Promise.allSettled(toFetch.map(en => fetchMoveNameES(en).then(es => es ? { en, es } : null)))
      .then(results => {
        if (cancelled) return
        const newEntries: Record<string, string> = {}
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value) newEntries[r.value.en] = r.value.es
        })
        if (Object.keys(newEntries).length > 0) setEsNames(prev => ({ ...prev, ...newEntries }))
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, suggestionsKey])

  // ── Sync displayValue when parent value or lang changes ───────────────────
  useEffect(() => {
    if (ownChange.current) { ownChange.current = false; return }
    if (open) return
    if (lang === 'es' && value && !esNames[value]) {
      // Trigger fetch for current value's Spanish name
      fetchMoveNameES(value).then(es => {
        if (es) setEsNames(prev => ({ ...prev, [value]: es }))
      })
    }
    setDisplayValue(lang === 'es' && esNames[value] ? esNames[value] : value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, lang, esNames, open])

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Select a move from the dropdown ──────────────────────────────────────
  const handleSelect = (en: string) => {
    ownChange.current = true
    onChange(en)
    setDisplayValue(lang === 'es' ? (esNames[en] ?? en) : en)
    setOpen(false)
  }

  const noPokeapiName = !pokeapiName
  const noMatch       = open && !suggestions.length && displayValue.length > 0 && moves.length > 0

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={displayValue}
        onChange={e => { setDisplayValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={INPUT_CLS}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-champ-surface border border-champ-border rounded-lg shadow-xl overflow-y-auto max-h-48 font-body text-sm">
          {suggestions.map(en => {
            const label = lang === 'es' ? (esNames[en] ?? en) : en
            return (
              <li key={en}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-1.5 hover:bg-champ-elevated transition-colors flex items-center justify-between gap-2 ${
                    value === en ? 'text-champ-blue font-semibold' : 'text-white'
                  }`}
                  onMouseDown={e => { e.preventDefault(); handleSelect(en) }}
                >
                  <span>{label}</span>
                  {lang === 'es' && esNames[en] && (
                    <span className="text-[10px] text-champ-muted shrink-0">{en}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && noPokeapiName && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-champ-surface border border-champ-border rounded-lg shadow-xl px-3 py-2 text-xs text-champ-muted font-body">
          {t('move.choosePokemon')}
        </div>
      )}

      {noMatch && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-champ-surface border border-champ-border rounded-lg shadow-xl px-3 py-2 text-xs text-champ-muted font-body">
          {t('move.noMatch')}
        </div>
      )}
    </div>
  )
}
