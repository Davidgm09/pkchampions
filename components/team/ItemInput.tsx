'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchItemES } from '@/lib/item-names'

const ITEMS: string[] = [
  'Omni Ring',
  'Assault Vest', 'Choice Band', 'Choice Specs', 'Choice Scarf',
  'Life Orb', 'Leftovers', 'Rocky Helmet', 'Focus Sash',
  'Sitrus Berry', 'Lum Berry', 'Oran Berry',
  'Figy Berry', 'Wiki Berry', 'Mago Berry', 'Aguav Berry', 'Iapapa Berry',
  'Weakness Policy', 'White Herb', 'Power Herb', 'Booster Energy',
  'Clear Amulet', 'Covert Cloak', 'Safety Goggles', 'Loaded Dice',
  'Wide Lens', 'Scope Lens', 'Zoom Lens', 'Bright Powder',
  'Eject Button', 'Eject Pack', 'Red Card', 'Shed Shell', 'Air Balloon',
  'Mental Herb', 'Flame Orb', 'Toxic Orb',
  'Light Clay', 'Terrain Extender', 'Utility Umbrella',
  'Throat Spray', 'Expert Belt', 'Blunder Policy',
  'Protective Pads', 'Punching Glove', 'Mirror Herb', "King's Rock",
  'Electric Seed', 'Grassy Seed', 'Misty Seed', 'Psychic Seed',
  'Mystic Water', 'Charcoal', 'Miracle Seed', 'Magnet',
  'Twisted Spoon', 'Never-Melt Ice', 'Dragon Fang',
  'Poison Barb', 'Soft Sand', 'Hard Stone', 'Silver Powder', 'Silk Scarf',
  'Black Belt', 'Sharp Beak', 'Black Glasses', 'Metal Coat', 'Spell Tag',
  'Muscle Band', 'Wise Glasses', 'Razor Claw', 'Razor Fang',
  'Heat Rock', 'Damp Rock', 'Smooth Rock', 'Icy Rock',
  'Big Root', 'Binding Band', 'Float Stone', 'Ring Target',
  'Adrenaline Orb', 'Leppa Berry', 'Chesto Berry',
]


const INPUT_CLS = 'w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function ItemInput({ value, onChange, placeholder }: Props) {
  const [esNames, setEsNames] = useState<Record<string, string>>({})
  const [displayValue, setDisplayValue] = useState(value)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const ownChange = useRef(false)
  const { lang, t } = useLanguage()

  const ph = placeholder ?? t('team.itemPlaceholder')

  const suggestions = useMemo(() => {
    const q = displayValue.toLowerCase().trim()
    if (!q) return ITEMS.slice(0, 15)
    return ITEMS.filter(en => {
      const label = lang === 'es' ? (esNames[en] ?? en) : en
      return label.toLowerCase().includes(q)
    }).slice(0, 15)
  }, [displayValue, lang, esNames])

  const suggestionsKey = suggestions.join('|')
  useEffect(() => {
    if (lang !== 'es') return
    const toFetch = suggestions.filter(en => !(en in esNames))
    if (!toFetch.length) return
    let cancelled = false
    Promise.allSettled(toFetch.map(en => fetchItemES(en).then(es => es ? { en, es } : null)))
      .then(results => {
        if (cancelled) return
        const next: Record<string, string> = {}
        results.forEach(r => { if (r.status === 'fulfilled' && r.value) next[r.value.en] = r.value.es })
        if (Object.keys(next).length) setEsNames(prev => ({ ...prev, ...next }))
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, suggestionsKey])

  useEffect(() => {
    if (ownChange.current) { ownChange.current = false; return }
    if (open) return
    setDisplayValue(lang === 'es' && esNames[value] ? esNames[value] : value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, lang, esNames, open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (en: string) => {
    ownChange.current = true
    onChange(en)
    setDisplayValue(lang === 'es' ? (esNames[en] ?? en) : en)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={displayValue}
        onChange={e => { setDisplayValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={ph}
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
    </div>
  )
}
