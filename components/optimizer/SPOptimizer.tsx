'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { NatureName, SPSpread } from '@/types/champions'
import { EMPTY_SP_SPREAD } from '@/types/champions'
import { getPokemonMeta } from '@/lib/champions-meta'
import { getMegas } from '@/data/mega-stones'
import { ROSTER_BY_ID } from '@/data/regulation-mb'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { MegaEvolution } from '@/types/champions'
import type { BaseStats } from '@/types/pokemon'
import { calcFinalStat, getNatureMods } from '@/lib/sp-utils'
import { getBaseStats } from '@/lib/base-stats'
import PokemonPicker from '@/components/calculator/PokemonPicker'
import SPSlider from '@/components/calculator/SPSlider'
import MoveInput from '@/components/optimizer/MoveInput'
import AbilityInput from '@/components/team/AbilityInput'
import ItemInput from '@/components/team/ItemInput'
import { optimizeSurvive, optimizeKO, optimizeSpeedTier } from '@/lib/sp-optimizer'
import type { OptimizeResult } from '@/lib/sp-optimizer'
import { useLanguage } from '@/contexts/LanguageContext'
import { natureLabel } from '@/lib/nature-names'
import { fetchAbilityES } from '@/lib/ability-names'
import { fetchItemES } from '@/lib/item-names'
import { fetchMoveNameES } from '@/lib/move-names'
import ErrorToast from '@/components/ui/ErrorToast'

// ── Constants ────────────────────────────────────────────────────────────────

const NATURES: NatureName[] = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky',
]
const DEFAULT_STATS: BaseStats = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 }

type Goal = 'survive' | 'ohko' | '2hko' | 'speed_tier'

const STAT_META: { key: keyof SPSpread; label: string; color: string }[] = [
  { key: 'hp',  label: 'HP',  color: 'bg-champ-success' },
  { key: 'atk', label: 'Atk', color: 'bg-champ-danger'  },
  { key: 'def', label: 'Def', color: 'bg-champ-blue'    },
  { key: 'spa', label: 'SpA', color: 'bg-type-psychic'  },
  { key: 'spd', label: 'SpD', color: 'bg-type-ice'      },
  { key: 'spe', label: 'Spe', color: 'bg-type-electric' },
]

const STATS_OPTIMIZED: Record<Goal, (keyof SPSpread)[]> = {
  survive:    ['hp', 'def', 'spd'],
  ohko:       ['atk', 'spa'],
  '2hko':     ['atk', 'spa'],
  speed_tier: ['spe'],
}

const INPUT_CLS = 'w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors'
const CHIP_BASE = 'text-xs px-2 py-0.5 rounded border font-body transition-colors cursor-pointer'
const CHIP_ON   = 'bg-champ-blue border-champ-blue text-white'
const CHIP_OFF  = 'border-champ-border text-champ-muted hover:text-white hover:border-champ-blue/50'
const GOLD_ON   = 'bg-champ-gold border-champ-gold text-black'
const GOLD_OFF  = 'border-champ-gold/30 text-champ-gold hover:border-champ-gold'

// ── Helpers ───────────────────────────────────────────────────────────────────

function usePokemonStats(pokeapiName: string | null): { stats: BaseStats; loading: boolean } {
  const [stats, setStats] = useState<BaseStats>(() =>
    (pokeapiName && getBaseStats(pokeapiName)) || DEFAULT_STATS
  )
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!pokeapiName) { setStats(DEFAULT_STATS); setLoading(false); return }
    const local = getBaseStats(pokeapiName)
    if (local) { setStats(local); setLoading(false); return }
    setLoading(true)
    let cancelled = false
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokeapiName}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { stats: Array<{ stat: { name: string }; base_stat: number }> }) => {
        if (cancelled) return
        const g = (n: string) => data.stats.find(s => s.stat.name === n)?.base_stat ?? 100
        setStats({ hp: g('hp'), atk: g('attack'), def: g('defense'), spa: g('special-attack'), spd: g('special-defense'), spe: g('speed') })
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pokeapiName])
  return { stats, loading }
}

function computeFinalStats(base: BaseStats, nature: NatureName, spread: SPSpread) {
  const m = getNatureMods(nature)
  return {
    hp:  calcFinalStat('hp',  base.hp,  spread.hp,  1.0),
    atk: calcFinalStat('atk', base.atk, spread.atk, m.atk),
    def: calcFinalStat('def', base.def, spread.def, m.def),
    spa: calcFinalStat('spa', base.spa, spread.spa, m.spa),
    spd: calcFinalStat('spd', base.spd, spread.spd, m.spd),
    spe: calcFinalStat('spe', base.spe, spread.spe, m.spe),
  }
}

function megaLabel(mega: MegaEvolution): string {
  const parts = mega.megaName.split('-')
  const idx   = parts.findIndex(p => p === 'mega')
  const suffix = parts.slice(idx + 1).map(s => s.toUpperCase()).join(' ')
  return suffix ? `Mega ${suffix}` : 'Mega'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBar({ label, sp, finalStat, color, highlight }: {
  label: string; sp: number; finalStat: number; color: string; highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`text-xs font-mono w-8 shrink-0 ${highlight ? 'text-white font-bold' : 'text-champ-muted'}`}>
        {label}
      </span>
      <div className="flex-1 h-2 bg-champ-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(sp / 32) * 100}%` }} />
      </div>
      <span className={`text-xs font-mono w-5 text-right shrink-0 ${highlight ? 'text-champ-gold font-bold' : 'text-champ-muted'}`}>
        {sp}
      </span>
      <span className="text-champ-muted/40 text-xs shrink-0">→</span>
      <span className={`text-xs font-mono w-9 shrink-0 ${highlight ? 'text-white font-bold' : 'text-champ-muted'}`}>
        {finalStat}
      </span>
    </div>
  )
}

function NatureSelect({ value, onChange }: { value: NatureName; onChange: (n: NatureName) => void }) {
  const { lang } = useLanguage()
  return (
    <select value={value} onChange={e => onChange(e.target.value as NatureName)} className={INPUT_CLS}>
      {NATURES.map(n => <option key={n} value={n}>{natureLabel(n, lang)}</option>)}
    </select>
  )
}

function AbilityItemInputs({ ability, item, onAbility, onItem, meta, pokeapiName }: {
  ability: string; item: string
  onAbility: (v: string) => void; onItem: (v: string) => void
  meta: ReturnType<typeof getPokemonMeta>
  pokeapiName?: string | null
}) {
  const { t, lang } = useLanguage()
  const topAb    = meta?.top_abilities?.slice(0, 3) ?? []
  const topItems = meta?.top_items?.slice(0, 3)    ?? []
  const [abES,   setAbES]   = useState<Record<string, string>>({})
  const [itemES, setItemES] = useState<Record<string, string>>({})

  const abKey   = topAb.map(a => a.name).join(',')
  const itemKey = topItems.map(i => i.name).join(',')

  useEffect(() => {
    if (lang !== 'es') return
    topAb.forEach(a => fetchAbilityES(a.name).then(es => { if (es) setAbES(p => ({ ...p, [a.name]: es })) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, abKey])

  useEffect(() => {
    if (lang !== 'es') return
    topItems.forEach(it => fetchItemES(it.name).then(es => { if (es) setItemES(p => ({ ...p, [it.name]: es })) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, itemKey])

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">{t('common.ability')}</label>
        <AbilityInput value={ability} onChange={onAbility} pokeapiName={pokeapiName} />
        {topAb.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {topAb.map(a => (
              <button key={a.name} type="button" onClick={() => onAbility(a.name)}
                className={`${CHIP_BASE} ${ability === a.name ? CHIP_ON : CHIP_OFF}`}>
                {lang === 'es' ? (abES[a.name] ?? a.name) : a.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">{t('common.item')}</label>
        <ItemInput value={item} onChange={onItem} />
        {topItems.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {topItems.map(it => (
              <button key={it.name} type="button" onClick={() => onItem(it.name)}
                className={`${CHIP_BASE} ${item === it.name ? CHIP_ON : CHIP_OFF}`}>
                {lang === 'es' ? (itemES[it.name] ?? it.name) : it.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FieldConditions({ weather, terrain, onWeather, onTerrain }: {
  weather: string; terrain: string
  onWeather: (v: string) => void; onTerrain: (v: string) => void
}) {
  const { t } = useLanguage()
  const WEATHERS = [
    { value: '',     label: t('common.none') },
    { value: 'Sun',  label: t('weather.sun') },
    { value: 'Rain', label: t('weather.rain') },
    { value: 'Sand', label: t('weather.sand') },
    { value: 'Snow', label: t('weather.snow') },
  ]
  const TERRAINS = [
    { value: '',          label: t('common.none') },
    { value: 'Electric',  label: t('terrain.electric') },
    { value: 'Grassy',    label: t('terrain.grassy') },
    { value: 'Misty',     label: t('terrain.misty') },
    { value: 'Psychic',   label: t('terrain.psychic') },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">{t('common.weather')}</label>
        <select value={weather} onChange={e => onWeather(e.target.value)} className={INPUT_CLS}>
          {WEATHERS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">{t('common.terrain')}</label>
        <select value={terrain} onChange={e => onTerrain(e.target.value)} className={INPUT_CLS}>
          {TERRAINS.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
        </select>
      </div>
    </div>
  )
}

function BoostStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-champ-muted font-body">{label}</span>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}
        className="w-6 h-6 rounded bg-champ-elevated border border-champ-border text-champ-muted hover:text-white disabled:opacity-30 text-sm flex items-center justify-center">
        −
      </button>
      <span className="text-sm font-bold font-mono text-white w-5 text-center">+{value}</span>
      <button type="button" onClick={() => onChange(Math.min(6, value + 1))} disabled={value === 6}
        className="w-6 h-6 rounded bg-champ-elevated border border-champ-border text-champ-muted hover:text-white disabled:opacity-30 text-sm flex items-center justify-center">
        +
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SPOptimizer() {
  const params = useSearchParams()
  const { t, lang } = useLanguage()

  const GOALS = [
    { id: 'survive' as Goal,    label: t('opt.survive.label'), desc: t('opt.survive.desc') },
    { id: 'ohko' as Goal,       label: t('opt.ohko.label'),    desc: t('opt.ohko.desc') },
    { id: '2hko' as Goal,       label: t('opt.2hko.label'),    desc: t('opt.2hko.desc') },
    { id: 'speed_tier' as Goal, label: t('opt.speed.label'),   desc: t('opt.speed.desc') },
  ]

  // ── My Pokemon
  const [myEntry,   setMyEntry]   = useState<ChampionsPokemonEntry | null>(() => {
    const pk = params.get('pk')
    return pk ? (ROSTER_BY_ID.get(pk) ?? null) : null
  })
  const [myNature,  setMyNature]  = useState<NatureName>(() => {
    const n = params.get('nat') as NatureName
    return NATURES.includes(n) ? n : 'Jolly'
  })
  const [myAbility, setMyAbility] = useState('')
  const [myItem,    setMyItem]    = useState('')
  const [myMega,    setMyMega]    = useState<MegaEvolution | null>(null)

  // ── Goal
  const [goal, setGoal] = useState<Goal>(() => {
    const g = params.get('goal')
    return (g === 'ohko' || g === '2hko' || g === 'speed_tier') ? g : 'survive'
  })

  // ── Survive form (attacker config)
  const [atkEntry,    setAtkEntry]    = useState<ChampionsPokemonEntry | null>(() => {
    const id = params.get('atk')
    return id ? (ROSTER_BY_ID.get(id) ?? null) : null
  })
  const [atkMega,     setAtkMega]     = useState<MegaEvolution | null>(null)
  const [atkNature,   setAtkNature]   = useState<NatureName>('Timid')
  const [atkAbility,  setAtkAbility]  = useState('')
  const [atkItem,     setAtkItem]     = useState('')
  const [atkSpSpread, setAtkSpSpread] = useState<SPSpread>({ ...EMPTY_SP_SPREAD })
  const [moveName,    setMoveName]    = useState(() => params.get('mov') ?? '')

  // ── Survive extras
  const [surviveCrit,    setSurviveCrit]    = useState(false)
  const [surviveHH,      setSurviveHH]      = useState(false)
  const [atkBoost,       setAtkBoost]       = useState(0)
  const [surviveWeather, setSurviveWeather] = useState('')
  const [surviveTerrain, setSurviveTerrain] = useState('')

  // ── KO form (defender config)
  const [defEntry,    setDefEntry]    = useState<ChampionsPokemonEntry | null>(() => {
    const id = params.get('def')
    return id ? (ROSTER_BY_ID.get(id) ?? null) : null
  })
  const [defMega,     setDefMega]     = useState<MegaEvolution | null>(null)
  const [defNature,   setDefNature]   = useState<NatureName>('Bold')
  const [defAbility,  setDefAbility]  = useState('')
  const [defItem,     setDefItem]     = useState('')
  const [defSpSpread, setDefSpSpread] = useState<SPSpread>({ ...EMPTY_SP_SPREAD })
  const [statToOpt,   setStatToOpt]   = useState<'atk' | 'spa'>('atk')
  const [koMove,      setKoMove]      = useState(() => params.get('komov') ?? '')

  // ── KO extras
  const [myBoost,   setMyBoost]   = useState(0)
  const [koWeather, setKoWeather] = useState('')
  const [koTerrain, setKoTerrain] = useState('')

  // ── Speed tier form
  const [rivalEntry,    setRivalEntry]    = useState<ChampionsPokemonEntry | null>(() => {
    const id = params.get('rival')
    return id ? (ROSTER_BY_ID.get(id) ?? null) : null
  })
  const [rivalNature,   setRivalNature]   = useState<NatureName>('Timid')
  const [rivalSpSpe,    setRivalSpSpe]    = useState(0)
  const [myTailwind,    setMyTailwind]    = useState(false)
  const [rivalTailwind, setRivalTailwind] = useState(false)

  // ── Result
  const [result,    setResult]    = useState<OptimizeResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

  // ── ES translations for "Mi Pokémon" ability/item chips and move chips
  const [myAbES,      setMyAbES]      = useState<Record<string, string>>({})
  const [myItemES,    setMyItemES]    = useState<Record<string, string>>({})
  const [atkMoveES,   setAtkMoveES]   = useState<Record<string, string>>({})
  const [myMoveES,    setMyMoveES]    = useState<Record<string, string>>({})

  // ── Base stats via PokeAPI
  const { stats: myBaseStats,    loading: myLoading }    = usePokemonStats(myEntry?.pokeapiName    ?? null)
  const myDisplayStats  = myMega?.megaBaseStats   ?? myBaseStats
  const { stats: atkBaseStats,   loading: atkLoading }   = usePokemonStats(atkEntry?.pokeapiName   ?? null)
  const atkDisplayStats = atkMega?.megaBaseStats  ?? atkBaseStats
  const { stats: defBaseStats,   loading: defLoading }   = usePokemonStats(defEntry?.pokeapiName   ?? null)
  const defDisplayStats = defMega?.megaBaseStats  ?? defBaseStats
  const { stats: rivalBaseStats, loading: rivalLoading } = usePokemonStats(rivalEntry?.pokeapiName ?? null)
  const isLoadingStats = myLoading || atkLoading || defLoading || rivalLoading

  const myMegas  = myEntry?.hasMega  ? getMegas(myEntry.id)  : []
  const atkMegas = atkEntry?.hasMega ? getMegas(atkEntry.id) : []
  const defMegas = defEntry?.hasMega ? getMegas(defEntry.id) : []
  const myMeta   = myEntry    ? getPokemonMeta(myEntry.displayName)    : null
  const atkMeta  = atkEntry   ? getPokemonMeta(atkEntry.displayName)   : null
  const defMeta  = defEntry   ? getPokemonMeta(defEntry.displayName)   : null

  // Rival's final Spe (×2 with Tailwind)
  const rivalMods     = getNatureMods(rivalNature)
  const rivalFinalSpe = rivalBaseStats.spe > 0
    ? calcFinalStat('spe', rivalBaseStats.spe, rivalSpSpe, rivalMods.spe) * (rivalTailwind ? 2 : 1)
    : 0

  // ── ES name fetching for chips
  const myAbKey   = myMeta?.top_abilities?.map(a => a.name).join(',') ?? ''
  const myItemKey = myMeta?.top_items?.map(i => i.name).join(',') ?? ''
  const atkMoveKey = atkMeta?.top_moves?.map(m => m.name).join(',') ?? ''
  const myMoveKey  = myMeta?.top_moves?.map(m => m.name).join(',') ?? ''

  useEffect(() => {
    if (lang !== 'es') return
    myMeta?.top_abilities?.slice(0, 3).forEach(a => fetchAbilityES(a.name).then(es => { if (es) setMyAbES(p => ({ ...p, [a.name]: es })) }))
    myMeta?.top_items?.slice(0, 4).forEach(it => fetchItemES(it.name).then(es => { if (es) setMyItemES(p => ({ ...p, [it.name]: es })) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, myAbKey, myItemKey])

  useEffect(() => {
    if (lang !== 'es') return
    atkMeta?.top_moves?.slice(0, 6).forEach(m => fetchMoveNameES(m.name).then(es => { if (es) setAtkMoveES(p => ({ ...p, [m.name]: es })) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, atkMoveKey])

  useEffect(() => {
    if (lang !== 'es') return
    myMeta?.top_moves?.slice(0, 6).forEach(m => fetchMoveNameES(m.name).then(es => { if (es) setMyMoveES(p => ({ ...p, [m.name]: es })) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, myMoveKey])

  // ── URL persistence
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const p = new URLSearchParams()
    if (goal !== 'survive') p.set('goal', goal)
    if (myEntry) p.set('pk', myEntry.id)
    if (myNature !== 'Jolly') p.set('nat', myNature)
    if (goal === 'survive') {
      if (atkEntry) p.set('atk', atkEntry.id)
      if (moveName.trim()) p.set('mov', moveName.trim())
    } else if (goal === 'ohko' || goal === '2hko') {
      if (defEntry) p.set('def', defEntry.id)
      if (koMove.trim()) p.set('komov', koMove.trim())
    } else if (goal === 'speed_tier') {
      if (rivalEntry) p.set('rival', rivalEntry.id)
    }
    const qs = p.toString()
    window.history.replaceState(null, '', `/optimizador${qs ? `?${qs}` : ''}`)
  }, [goal, myEntry, myNature, atkEntry, moveName, defEntry, koMove, rivalEntry])

  // ── Handlers
  const handleMyEntry = (entry: ChampionsPokemonEntry) => {
    setMyEntry(entry)
    setMyMega(null)
    const meta = getPokemonMeta(entry.displayName)
    setMyAbility(meta?.top_abilities[0]?.name ?? '')
    setMyItem(meta?.top_items[0]?.name ?? '')
    setResult(null)
  }
  const handleMyMega = (mega: MegaEvolution | null) => {
    setMyMega(mega)
    setMyAbility(mega?.megaAbility ?? myMeta?.top_abilities[0]?.name ?? myAbility)
    setResult(null)
  }
  const handleAtkEntry = (entry: ChampionsPokemonEntry) => {
    setAtkEntry(entry)
    setAtkMega(null)
    setAtkSpSpread({ ...EMPTY_SP_SPREAD })
    const meta = getPokemonMeta(entry.displayName)
    setAtkAbility(meta?.top_abilities[0]?.name ?? '')
    setAtkItem(meta?.top_items[0]?.name ?? '')
    setResult(null)
  }
  const handleAtkMega = (mega: MegaEvolution | null) => {
    setAtkMega(mega)
    setAtkAbility(mega?.megaAbility ?? (atkEntry ? (getPokemonMeta(atkEntry.displayName)?.top_abilities[0]?.name ?? '') : ''))
    setResult(null)
  }
  const handleDefEntry = (entry: ChampionsPokemonEntry) => {
    setDefEntry(entry)
    setDefMega(null)
    setDefSpSpread({ ...EMPTY_SP_SPREAD })
    const meta = getPokemonMeta(entry.displayName)
    setDefAbility(meta?.top_abilities[0]?.name ?? '')
    setDefItem(meta?.top_items[0]?.name ?? '')
    setResult(null)
  }
  const handleDefMega = (mega: MegaEvolution | null) => {
    setDefMega(mega)
    setDefSpSpread({ ...EMPTY_SP_SPREAD })
    setDefAbility(mega?.megaAbility ?? (defEntry ? (getPokemonMeta(defEntry.displayName)?.top_abilities[0]?.name ?? '') : ''))
    setResult(null)
  }

  const handleOptimize = async () => {
    setCalcError(null)
    setResult(null)
    if (!myEntry) { setCalcError(t('opt.err.selectMon')); return }
    setIsRunning(true)
    await new Promise(r => setTimeout(r, 0))

    try {
      let res: OptimizeResult
      if (goal === 'survive') {
        if (!atkEntry || !moveName.trim()) throw new Error(t('opt.err.selectAtkMove'))
        res = optimizeSurvive({
          defPokeapiName: myEntry.pokeapiName, defNature: myNature,
          defAbility: myAbility || undefined, defItem: myItem || undefined,
          defMegaBaseStats: myMega?.megaBaseStats,
          defBaseHP: myDisplayStats.hp,
          atkPokeapiName: atkEntry.pokeapiName, atkNature,
          atkSpSpread, atkAbility: atkAbility || undefined, atkItem: atkItem || undefined,
          atkMegaBaseStats: atkMega?.megaBaseStats,
          moveName: moveName.trim(),
          weather: surviveWeather || undefined,
          terrain: surviveTerrain || undefined,
          isCrit: surviveCrit || undefined,
          isHelpingHand: surviveHH || undefined,
          atkBoost: atkBoost || undefined,
        })
      } else if (goal === 'ohko' || goal === '2hko') {
        if (!defEntry || !koMove.trim()) throw new Error(t('opt.err.selectDefMove'))
        res = optimizeKO({
          atkPokeapiName: myEntry.pokeapiName, atkNature: myNature,
          atkAbility: myAbility || undefined, atkItem: myItem || undefined,
          atkMegaBaseStats: myMega?.megaBaseStats,
          statToOptimize: statToOpt, moveName: koMove.trim(), koType: goal,
          defPokeapiName: defEntry.pokeapiName, defNature,
          defSpSpread,
          defAbility: defAbility || undefined, defItem: defItem || undefined,
          defMegaBaseStats: defMega?.megaBaseStats,
          weather: koWeather || undefined,
          terrain: koTerrain || undefined,
          myBoost: myBoost || undefined,
        })
      } else {
        if (!rivalEntry) throw new Error(t('opt.err.selectRival'))
        res = optimizeSpeedTier({ baseSpe: myDisplayStats.spe, nature: myNature, rivalFinalSpe, myTailwind })
      }
      setResult(res)
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : t('opt.err.calc'))
    } finally {
      setIsRunning(false)
    }
  }

  const finalStats = result ? computeFinalStats(myDisplayStats, myNature, result.spSpread) : null
  const optimized  = result ? STATS_OPTIMIZED[goal] : []
  const calcUrl = (result?.success && myEntry) ? (() => {
    const s = result.spSpread
    const p = new URLSearchParams()

    if (goal === 'survive') {
      if (atkEntry) { p.set('atacante', atkEntry.id); if (atkMega) p.set('mega', atkMega.megaName) }
      p.set('def_pk', myEntry.id)
      if (myMega) p.set('def_mega', myMega.megaName)
      if (myNature !== 'Timid') p.set('def_nat', myNature)
      if (s.hp)  p.set('def_hp',  String(s.hp))
      if (s.def) p.set('def_def', String(s.def))
      if (s.spd) p.set('def_spd', String(s.spd))
      if (moveName.trim()) p.set('mov', moveName.trim())
    } else if (goal === 'ohko' || goal === '2hko') {
      p.set('atacante', myEntry.id)
      if (myMega) p.set('mega', myMega.megaName)
      if (myNature !== 'Jolly') p.set('naturaleza', myNature)
      if (s.atk) p.set('atk', String(s.atk))
      if (s.spa) p.set('spa', String(s.spa))
      if (defEntry) { p.set('def_pk', defEntry.id); if (defMega) p.set('def_mega', defMega.megaName) }
      if (koMove.trim()) p.set('mov', koMove.trim())
    } else {
      p.set('atacante', myEntry.id)
      if (myMega) p.set('mega', myMega.megaName)
      if (myNature !== 'Jolly') p.set('naturaleza', myNature)
      if (s.spe) p.set('spe', String(s.spe))
    }

    return `/calculator?${p.toString()}`
  })() : '#'

  const atkTopMoves = atkMeta?.top_moves?.slice(0, 6) ?? []
  const myTopMoves  = myMeta?.top_moves?.slice(0, 6)  ?? []

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="font-display text-4xl font-bold text-white">{t('opt.title')}</h1>
        <p className="text-champ-muted font-body text-sm mt-1">{t('opt.subtitle')}</p>
      </div>

      {/* ── Mi Pokémon ── */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">{t('opt.myPokemon')}</h2>
        <PokemonPicker value={myEntry} onChange={handleMyEntry} label={t('opt.pokemonToOpt')} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">{t('common.nature')}</label>
            <NatureSelect value={myNature} onChange={n => { setMyNature(n); setResult(null) }} />
          </div>
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">{t('common.ability')}</label>
            <AbilityInput
              value={myAbility}
              onChange={v => { setMyAbility(v); setResult(null) }}
              pokeapiName={myEntry?.pokeapiName}
            />
            {(myMeta?.top_abilities?.length ?? 0) > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {myMeta!.top_abilities.slice(0, 3).map(a => (
                  <button key={a.name} type="button" onClick={() => { setMyAbility(a.name); setResult(null) }}
                    className={`${CHIP_BASE} ${myAbility === a.name ? CHIP_ON : CHIP_OFF}`}>
                    {lang === 'es' ? (myAbES[a.name] ?? a.name) : a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">{t('common.item')}</label>
          <ItemInput value={myItem} onChange={v => { setMyItem(v); setResult(null) }} />
          {(myMeta?.top_items?.length ?? 0) > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {myMeta!.top_items.slice(0, 4).map(it => (
                <button key={it.name} type="button" onClick={() => { setMyItem(it.name); setResult(null) }}
                  className={`${CHIP_BASE} ${myItem === it.name ? CHIP_ON : CHIP_OFF}`}>
                  {lang === 'es' ? (myItemES[it.name] ?? it.name) : it.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mega */}
        {myEntry?.hasMega && (
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">{t('calc.form')}</label>
            <div className="flex gap-1.5 flex-wrap">
              <button type="button" onClick={() => handleMyMega(null)}
                className={`${CHIP_BASE} px-3 py-1 ${!myMega ? CHIP_ON : CHIP_OFF}`}>{t('common.base')}</button>
              {myMegas.map(mega => (
                <button key={mega.megaName} type="button" onClick={() => handleMyMega(mega)}
                  className={`${CHIP_BASE} px-3 py-1 ${myMega?.megaName === mega.megaName ? GOLD_ON : GOLD_OFF}`}>
                  {megaLabel(mega)}
                </button>
              ))}
            </div>
            {myMega && (
              <p className="text-xs text-champ-muted font-body mt-1">
                {t('calc.ability')}<span className="text-champ-gold">{myMega.megaAbility}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Objetivo ── */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">{t('opt.goal')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GOALS.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => { setGoal(g.id); setResult(null) }}
              className={`py-2.5 px-3 rounded-xl text-sm font-bold font-body transition-colors text-left ${
                goal === g.id
                  ? 'bg-champ-blue/20 text-white border border-champ-blue/50'
                  : 'bg-champ-elevated text-champ-muted hover:text-white border border-champ-border'
              }`}
            >
              <span className="block">{g.label}</span>
              <span className="text-[10px] font-normal opacity-60 leading-tight mt-0.5 block">{g.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Survive form ── */}
        {goal === 'survive' && (
          <div className="border-t border-champ-border/50 pt-4 space-y-4">
            <p className="text-xs text-champ-muted font-body">{t('opt.surviveHint')}</p>

            <PokemonPicker value={atkEntry} onChange={handleAtkEntry} label={t('opt.attackerPokemon')} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">{t('opt.attackerNature')}</label>
                <NatureSelect value={atkNature} onChange={n => { setAtkNature(n); setResult(null) }} />
              </div>
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">{t('opt.attackerMove')}</label>
                <MoveInput
                  value={moveName}
                  onChange={v => { setMoveName(v); setResult(null) }}
                  pokeapiName={atkEntry?.pokeapiName}
                  placeholder={lang === 'es' ? 'ej. Terremoto' : 'e.g. Earthquake'}
                />
                {atkTopMoves.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {atkTopMoves.map(m => (
                      <button key={m.name} type="button" onClick={() => { setMoveName(m.name); setResult(null) }}
                        className={`${CHIP_BASE} ${moveName === m.name ? CHIP_ON : CHIP_OFF}`}>
                        {lang === 'es' ? (atkMoveES[m.name] ?? m.name) : m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <AbilityItemInputs
              ability={atkAbility} item={atkItem}
              onAbility={v => setAtkAbility(v)} onItem={v => setAtkItem(v)}
              meta={atkMeta} pokeapiName={atkEntry?.pokeapiName}
            />

            {/* Mega atacante */}
            {atkEntry?.hasMega && (
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">{t('opt.atkMegaForm')}</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => handleAtkMega(null)}
                    className={`${CHIP_BASE} px-3 py-1 ${!atkMega ? CHIP_ON : CHIP_OFF}`}>{t('common.base')}</button>
                  {atkMegas.map(mega => (
                    <button key={mega.megaName} type="button" onClick={() => handleAtkMega(mega)}
                      className={`${CHIP_BASE} px-3 py-1 ${atkMega?.megaName === mega.megaName ? GOLD_ON : GOLD_OFF}`}>
                      {megaLabel(mega)}
                    </button>
                  ))}
                </div>
                {atkMega && (
                  <p className="text-xs text-champ-muted font-body mt-1">
                    {t('calc.ability')}<span className="text-champ-gold">{atkMega.megaAbility}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs text-champ-muted font-body mb-2">{t('opt.atkInvestment')}</p>
              <SPSlider
                key={`${atkEntry?.id ?? 'empty-atk'}-${atkMega?.megaName ?? 'base'}`}
                baseStats={atkDisplayStats}
                nature={atkNature}
                initialSpread={EMPTY_SP_SPREAD}
                onChange={spread => { setAtkSpSpread(spread); setResult(null) }}
              />
            </div>

            <FieldConditions
              weather={surviveWeather} terrain={surviveTerrain}
              onWeather={v => { setSurviveWeather(v); setResult(null) }}
              onTerrain={v => { setSurviveTerrain(v); setResult(null) }}
            />

            <div className="space-y-2">
              <label className="text-xs text-champ-muted font-body block">{t('opt.atkMods')}</label>
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button"
                  onClick={() => { setSurviveCrit(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${surviveCrit ? CHIP_ON : CHIP_OFF}`}>
                  {t('calc.critHit')}
                </button>
                <button type="button"
                  onClick={() => { setSurviveHH(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${surviveHH ? CHIP_ON : CHIP_OFF}`}>
                  {t('calc.helpingHand')}
                </button>
                <div className="ml-auto">
                  <BoostStepper
                    label={`${t('calc.boost')} Atk/SpA`}
                    value={atkBoost}
                    onChange={v => { setAtkBoost(v); setResult(null) }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── KO form ── */}
        {(goal === 'ohko' || goal === '2hko') && (
          <div className="border-t border-champ-border/50 pt-4 space-y-4">
            <p className="text-xs text-champ-muted font-body">{t('opt.koHint')}</p>

            <PokemonPicker value={defEntry} onChange={handleDefEntry} label={t('opt.defenderPokemon')} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">{t('opt.defenderNature')}</label>
                <NatureSelect value={defNature} onChange={n => { setDefNature(n); setResult(null) }} />
              </div>
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">{t('opt.koMove')}</label>
                <MoveInput
                  value={koMove}
                  onChange={v => { setKoMove(v); setResult(null) }}
                  pokeapiName={myEntry?.pokeapiName}
                  placeholder={lang === 'es' ? 'ej. Lanzallamas' : 'e.g. Flamethrower'}
                />
                {myTopMoves.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {myTopMoves.map(m => (
                      <button key={m.name} type="button" onClick={() => { setKoMove(m.name); setResult(null) }}
                        className={`${CHIP_BASE} ${koMove === m.name ? CHIP_ON : CHIP_OFF}`}>
                        {lang === 'es' ? (myMoveES[m.name] ?? m.name) : m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <AbilityItemInputs
              ability={defAbility} item={defItem}
              onAbility={v => setDefAbility(v)} onItem={v => setDefItem(v)}
              meta={defMeta} pokeapiName={defEntry?.pokeapiName}
            />

            {/* Mega defensor */}
            {defEntry?.hasMega && (
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">{t('opt.defMegaForm')}</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => handleDefMega(null)}
                    className={`${CHIP_BASE} px-3 py-1 ${!defMega ? CHIP_ON : CHIP_OFF}`}>{t('common.base')}</button>
                  {defMegas.map(mega => (
                    <button key={mega.megaName} type="button" onClick={() => handleDefMega(mega)}
                      className={`${CHIP_BASE} px-3 py-1 ${defMega?.megaName === mega.megaName ? GOLD_ON : GOLD_OFF}`}>
                      {megaLabel(mega)}
                    </button>
                  ))}
                </div>
                {defMega && (
                  <p className="text-xs text-champ-muted font-body mt-1">
                    {t('calc.ability')}<span className="text-champ-gold">{defMega.megaAbility}</span>
                  </p>
                )}
              </div>
            )}

            <FieldConditions
              weather={koWeather} terrain={koTerrain}
              onWeather={v => { setKoWeather(v); setResult(null) }}
              onTerrain={v => { setKoTerrain(v); setResult(null) }}
            />

            <BoostStepper
              label={`${t('calc.boost')} Atk/SpA`}
              value={myBoost}
              onChange={v => { setMyBoost(v); setResult(null) }}
            />

            <div>
              <label className="text-xs text-champ-muted font-body block mb-2">{t('opt.statToOpt')}</label>
              <div className="flex gap-2">
                {(['atk', 'spa'] as const).map(s => (
                  <button key={s} type="button"
                    onClick={() => { setStatToOpt(s); setResult(null) }}
                    className={`${CHIP_BASE} px-4 py-1.5 ${statToOpt === s ? CHIP_ON : CHIP_OFF}`}>
                    {s === 'atk' ? t('opt.physical') : t('opt.special')}
                  </button>
                ))}
              </div>
            </div>

            {defEntry && (
              <div>
                <p className="text-xs text-champ-muted font-body mb-2">{t('opt.defInvestment')}</p>
                <SPSlider
                  key={`${defEntry.id}-${defMega?.megaName ?? 'base'}`}
                  baseStats={defDisplayStats}
                  nature={defNature}
                  initialSpread={EMPTY_SP_SPREAD}
                  onChange={spread => { setDefSpSpread(spread); setResult(null) }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Speed tier form ── */}
        {goal === 'speed_tier' && (
          <div className="border-t border-champ-border/50 pt-4 space-y-4">
            <p className="text-xs text-champ-muted font-body">{t('opt.speedHint')}</p>

            <PokemonPicker value={rivalEntry} onChange={e => { setRivalEntry(e); setResult(null) }} label={t('opt.rivalPokemon')} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">{t('opt.rivalNature')}</label>
                <NatureSelect value={rivalNature} onChange={n => { setRivalNature(n); setResult(null) }} />
              </div>
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">
                  {t('opt.rivalSPE')}
                  {rivalEntry && rivalFinalSpe > 0 && (
                    <span className="text-champ-gold ml-2 font-mono">{rivalFinalSpe} Spe</span>
                  )}
                </label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range" min={0} max={32} value={rivalSpSpe}
                    onChange={e => { setRivalSpSpe(Number(e.target.value)); setResult(null) }}
                    className="flex-1 accent-champ-blue cursor-pointer"
                  />
                  <span className="text-white font-mono text-sm w-6 text-center">{rivalSpSpe}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-champ-muted font-body block mb-2">{t('opt.tailwind')}</label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => { setMyTailwind(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${myTailwind ? CHIP_ON : CHIP_OFF}`}>
                  {t('opt.myTeam')}
                </button>
                <button type="button"
                  onClick={() => { setRivalTailwind(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${rivalTailwind ? CHIP_ON : CHIP_OFF}`}>
                  {t('opt.rivalTeam')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Optimize button ── */}
      <div className="space-y-2">
        <button
          onClick={handleOptimize}
          disabled={isRunning || isLoadingStats}
          className="w-full py-3 bg-champ-gold hover:bg-champ-gold/80 text-black font-display text-lg font-bold rounded-xl transition-colors shadow-lg shadow-champ-gold/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRunning ? t('opt.optimizing') : isLoadingStats ? t('calc.loadingStats') : t('opt.optimize')}
        </button>
        {isLoadingStats && (
          <p className="text-center text-xs text-champ-muted font-body animate-pulse">
            {t('opt.loadingPokeAPI')}
          </p>
        )}
      </div>

      {/* ── Error ── */}
      {calcError && <ErrorToast message={calcError} onDismiss={() => setCalcError(null)} />}

      {/* ── Result ── */}
      {result && !calcError && (
        <div className={`rounded-xl border-2 p-6 space-y-5 ${
          result.success
            ? 'border-champ-gold/50 bg-champ-gold/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          {result.success && finalStats ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">{t('opt.resultTitle')}</h3>
                  <p className="text-champ-muted text-xs font-body mt-0.5">
                    {t('opt.spInvested', { total: String(result.totalSP) })}{' '}
                    <span className="text-champ-gold font-semibold">{t('opt.spFree', { remaining: String(result.remainingSP) })}</span>
                    {' '}{t('opt.spFreeFor')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-champ-gold font-display font-bold text-3xl">{result.totalSP}</span>
                  <span className="text-champ-muted text-sm font-body ml-1">/ 66 SP</span>
                </div>
              </div>

              <div className="bg-champ-elevated rounded-xl p-4 space-y-1">
                {STAT_META.map(({ key, label, color }) => (
                  <StatBar
                    key={key}
                    label={label}
                    sp={result.spSpread[key]}
                    finalStat={finalStats[key]}
                    color={color}
                    highlight={optimized.includes(key)}
                  />
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs font-body text-champ-muted mb-1.5">
                  <span>{t('opt.spUsed')}</span>
                  <span>{result.totalSP} / 66</span>
                </div>
                <div className="h-2 bg-champ-border rounded-full overflow-hidden">
                  <div className="h-full bg-champ-gold rounded-full" style={{ width: `${(result.totalSP / 66) * 100}%` }} />
                </div>
                <p className="text-right text-xs text-champ-gold font-mono mt-1">
                  {t('opt.spFree', { remaining: String(result.remainingSP) })}
                </p>
              </div>

              <div className="border-t border-champ-border/40 pt-4">
                <p className="text-champ-success text-sm font-body font-semibold mb-1">{t('opt.verification')}</p>
                <p className="text-white text-sm font-mono">{result.verificationText}</p>
              </div>

              <Link
                href={calcUrl}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-champ-blue/20 hover:bg-champ-blue/30 border border-champ-blue/40 rounded-lg text-champ-blue text-sm font-bold font-body transition-colors"
              >
                {t('opt.openInCalc')}
              </Link>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-red-400 font-body font-semibold mb-1">{t('opt.noSolution')}</p>
              <p className="text-champ-muted text-sm font-body">{result.failText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
