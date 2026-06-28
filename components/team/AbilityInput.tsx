'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchAbilityES, getCachedAbilityES } from '@/lib/ability-names'

interface AbilityOption {
  en: string
  es: string | null
  isHidden: boolean
}

function toDisplayName(apiName: string): string {
  return apiName.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

const INPUT_CLS = 'w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-champ-blue transition-colors'

interface Props {
  value: string
  onChange: (v: string) => void
  pokeapiName?: string | null
}

export default function AbilityInput({ value, onChange, pokeapiName }: Props) {
  const [abilities, setAbilities] = useState<AbilityOption[]>([])
  const [open, setOpen] = useState(false)
  const { lang, t } = useLanguage()
  const wrapRef = useRef<HTMLDivElement>(null)

  // Fetch the Pokémon's abilities
  useEffect(() => {
    if (!pokeapiName) { setAbilities([]); return }
    let cancelled = false
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokeapiName}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { abilities: Array<{ ability: { name: string }; is_hidden: boolean }> }) => {
        if (cancelled) return
        const list: AbilityOption[] = data.abilities.map(a => ({
          en: toDisplayName(a.ability.name),
          es: getCachedAbilityES(toDisplayName(a.ability.name)),
          isHidden: a.is_hidden,
        }))
        setAbilities(list)
      })
      .catch(() => { if (!cancelled) setAbilities([]) })
    return () => { cancelled = true }
  }, [pokeapiName])

  // Fetch Spanish names when lang=es or when abilities change
  useEffect(() => {
    if (lang !== 'es' || abilities.length === 0) return
    const needFetch = abilities.filter(a => a.es === null)
    if (!needFetch.length) return
    let cancelled = false
    Promise.all(needFetch.map(a => fetchAbilityES(a.en).then(es => ({ en: a.en, es }))))
      .then(results => {
        if (cancelled) return
        setAbilities(prev => prev.map(a => {
          const hit = results.find(r => r.en === a.en)
          return hit?.es ? { ...a, es: hit.es } : a
        }))
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, abilities.length])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayValue = lang === 'es'
    ? (abilities.find(a => a.en === value)?.es ?? value)
    : value

  if (!pokeapiName || abilities.length === 0) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('team.abilityPlaceholder')}
        className={`${INPUT_CLS} text-white placeholder-champ-muted`}
      />
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${INPUT_CLS} text-left flex items-center justify-between gap-2 cursor-pointer ${value ? 'text-white' : 'text-champ-muted'}`}
      >
        <span>{value ? displayValue : t('team.abilityPlaceholder')}</span>
        <span className="text-champ-muted text-xs shrink-0">▾</span>
      </button>

      {open && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-champ-surface border border-champ-border rounded-lg shadow-xl overflow-hidden font-body text-sm">
          {abilities.map(ab => {
            const label = lang === 'es' ? (ab.es ?? ab.en) : ab.en
            return (
              <li key={ab.en}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-champ-elevated transition-colors flex items-center justify-between gap-2 ${
                    value === ab.en ? 'text-champ-blue font-semibold' : 'text-white'
                  }`}
                  onMouseDown={e => { e.preventDefault(); onChange(ab.en); setOpen(false) }}
                >
                  <span>{label}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {lang === 'es' && ab.es && (
                      <span className="text-[10px] text-champ-muted/70">{ab.en}</span>
                    )}
                    {ab.isHidden && (
                      <span className="text-[9px] text-champ-muted bg-champ-elevated px-1 py-0.5 rounded">
                        {t('team.hiddenAbility')}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
