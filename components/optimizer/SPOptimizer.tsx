'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { NatureName, SPSpread } from '@/types/champions'
import { EMPTY_SP_SPREAD } from '@/types/champions'
import { getPokemonMeta } from '@/lib/champions-meta'
import { getMegas } from '@/data/mega-stones'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { MegaEvolution } from '@/types/champions'
import type { BaseStats } from '@/types/pokemon'
import { calcFinalStat, getNatureMods } from '@/lib/sp-utils'
import { getBaseStats } from '@/lib/base-stats'
import PokemonPicker from '@/components/calculator/PokemonPicker'
import SPSlider from '@/components/calculator/SPSlider'
import { optimizeSurvive, optimizeKO, optimizeSpeedTier } from '@/lib/sp-optimizer'
import type { OptimizeResult } from '@/lib/sp-optimizer'

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

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: 'survive',    label: 'Aguantar golpe',    desc: 'Mínimo HP/Def/SpD para sobrevivir el peor caso' },
  { id: 'ohko',       label: 'Garantizar OHKO',   desc: 'Mínimo Atk/SpA para hacer OHKO siempre' },
  { id: '2hko',       label: 'Garantizar 2HKO',   desc: 'Mínimo Atk/SpA para hacer 2HKO siempre' },
  { id: 'speed_tier', label: 'Alcanzar speed tier', desc: 'Mínimo Spe para superar a un rival' },
]

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

const WEATHERS = [
  { value: '',     label: 'Ninguno' },
  { value: 'Sun',  label: 'Sol' },
  { value: 'Rain', label: 'Lluvia' },
  { value: 'Sand', label: 'Arena' },
  { value: 'Snow', label: 'Nieve' },
]
const TERRAINS = [
  { value: '',          label: 'Ninguno' },
  { value: 'Electric',  label: 'Eléctrico' },
  { value: 'Grassy',    label: 'Herboso' },
  { value: 'Misty',     label: 'Neblinoso' },
  { value: 'Psychic',   label: 'Psíquico' },
]

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
  return (
    <select value={value} onChange={e => onChange(e.target.value as NatureName)} className={INPUT_CLS}>
      {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

function AbilityItemInputs({ ability, item, onAbility, onItem, meta }: {
  ability: string; item: string
  onAbility: (v: string) => void; onItem: (v: string) => void
  meta: ReturnType<typeof getPokemonMeta>
}) {
  const topAb    = meta?.top_abilities?.slice(0, 3) ?? []
  const topItems = meta?.top_items?.slice(0, 3)    ?? []
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">Habilidad</label>
        <input value={ability} onChange={e => onAbility(e.target.value)}
          placeholder="ej. Intimidate" className={INPUT_CLS} />
        {topAb.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {topAb.map(a => (
              <button key={a.name} type="button" onClick={() => onAbility(a.name)}
                className={`${CHIP_BASE} ${ability === a.name ? CHIP_ON : CHIP_OFF}`}>{a.name}</button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">Objeto</label>
        <input value={item} onChange={e => onItem(e.target.value)}
          placeholder="ej. Assault Vest" className={INPUT_CLS} />
        {topItems.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {topItems.map(it => (
              <button key={it.name} type="button" onClick={() => onItem(it.name)}
                className={`${CHIP_BASE} ${item === it.name ? CHIP_ON : CHIP_OFF}`}>{it.name}</button>
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
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">Clima</label>
        <select value={weather} onChange={e => onWeather(e.target.value)} className={INPUT_CLS}>
          {WEATHERS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">Terreno</label>
        <select value={terrain} onChange={e => onTerrain(e.target.value)} className={INPUT_CLS}>
          {TERRAINS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
  // ── My Pokemon
  const [myEntry,   setMyEntry]   = useState<ChampionsPokemonEntry | null>(null)
  const [myNature,  setMyNature]  = useState<NatureName>('Jolly')
  const [myAbility, setMyAbility] = useState('')
  const [myItem,    setMyItem]    = useState('')
  const [myMega,    setMyMega]    = useState<MegaEvolution | null>(null)

  // ── Goal
  const [goal, setGoal] = useState<Goal>('survive')

  // ── Survive form (attacker config)
  const [atkEntry,    setAtkEntry]    = useState<ChampionsPokemonEntry | null>(null)
  const [atkMega,     setAtkMega]     = useState<MegaEvolution | null>(null)
  const [atkNature,   setAtkNature]   = useState<NatureName>('Timid')
  const [atkAbility,  setAtkAbility]  = useState('')
  const [atkItem,     setAtkItem]     = useState('')
  const [atkSpSpread, setAtkSpSpread] = useState<SPSpread>({ ...EMPTY_SP_SPREAD })
  const [moveName,    setMoveName]    = useState('')

  // ── Survive extras
  const [surviveCrit,    setSurviveCrit]    = useState(false)
  const [surviveHH,      setSurviveHH]      = useState(false)
  const [atkBoost,       setAtkBoost]       = useState(0)
  const [surviveWeather, setSurviveWeather] = useState('')
  const [surviveTerrain, setSurviveTerrain] = useState('')

  // ── KO form (defender config)
  const [defEntry,    setDefEntry]    = useState<ChampionsPokemonEntry | null>(null)
  const [defMega,     setDefMega]     = useState<MegaEvolution | null>(null)
  const [defNature,   setDefNature]   = useState<NatureName>('Bold')
  const [defAbility,  setDefAbility]  = useState('')
  const [defItem,     setDefItem]     = useState('')
  const [defSpSpread, setDefSpSpread] = useState<SPSpread>({ ...EMPTY_SP_SPREAD })
  const [statToOpt,   setStatToOpt]   = useState<'atk' | 'spa'>('atk')
  const [koMove,      setKoMove]      = useState('')

  // ── KO extras
  const [myBoost,   setMyBoost]   = useState(0)
  const [koWeather, setKoWeather] = useState('')
  const [koTerrain, setKoTerrain] = useState('')

  // ── Speed tier form
  const [rivalEntry,    setRivalEntry]    = useState<ChampionsPokemonEntry | null>(null)
  const [rivalNature,   setRivalNature]   = useState<NatureName>('Timid')
  const [rivalSpSpe,    setRivalSpSpe]    = useState(0)
  const [myTailwind,    setMyTailwind]    = useState(false)
  const [rivalTailwind, setRivalTailwind] = useState(false)

  // ── Result
  const [result,    setResult]    = useState<OptimizeResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

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
    if (!myEntry) { setCalcError('Selecciona el Pokémon a optimizar.'); return }
    setIsRunning(true)
    await new Promise(r => setTimeout(r, 0))

    try {
      let res: OptimizeResult
      if (goal === 'survive') {
        if (!atkEntry || !moveName.trim()) throw new Error('Selecciona el atacante y el movimiento.')
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
        if (!defEntry || !koMove.trim()) throw new Error('Selecciona el defensor y el movimiento.')
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
        if (!rivalEntry) throw new Error('Selecciona el Pokémon rival.')
        res = optimizeSpeedTier({ baseSpe: myDisplayStats.spe, nature: myNature, rivalFinalSpe, myTailwind })
      }
      setResult(res)
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : 'Error en el cálculo.')
    } finally {
      setIsRunning(false)
    }
  }

  const finalStats = result ? computeFinalStats(myDisplayStats, myNature, result.spSpread) : null
  const optimized  = result ? STATS_OPTIMIZED[goal] : []
  const calcUrl    = (result && myEntry) ? (() => {
    const s = result.spSpread
    const base = `/calculator?atacante=${myEntry.id}&naturaleza=${myNature}&hp=${s.hp}&atk=${s.atk}&def=${s.def}&spa=${s.spa}&spd=${s.spd}&spe=${s.spe}`
    return myMega ? `${base}&mega=${myMega.megaName}` : base
  })() : '#'

  const atkTopMoves = atkMeta?.top_moves?.slice(0, 6) ?? []
  const myTopMoves  = myMeta?.top_moves?.slice(0, 6)  ?? []

  return (
    <div className="space-y-6">

      {/* ── Mi Pokémon ── */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">Mi Pokémon</h2>
        <PokemonPicker value={myEntry} onChange={handleMyEntry} label="Pokémon a optimizar" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">Naturaleza</label>
            <NatureSelect value={myNature} onChange={n => { setMyNature(n); setResult(null) }} />
          </div>
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">Habilidad</label>
            <input value={myAbility} onChange={e => setMyAbility(e.target.value)}
              placeholder="ej. Multiscale" className={INPUT_CLS} />
            {(myMeta?.top_abilities?.length ?? 0) > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {myMeta!.top_abilities.slice(0, 3).map(a => (
                  <button key={a.name} type="button" onClick={() => setMyAbility(a.name)}
                    className={`${CHIP_BASE} ${myAbility === a.name ? CHIP_ON : CHIP_OFF}`}>{a.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">Objeto</label>
          <input value={myItem} onChange={e => setMyItem(e.target.value)}
            placeholder="ej. Assault Vest" className={INPUT_CLS} />
          {(myMeta?.top_items?.length ?? 0) > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {myMeta!.top_items.slice(0, 4).map(it => (
                <button key={it.name} type="button" onClick={() => setMyItem(it.name)}
                  className={`${CHIP_BASE} ${myItem === it.name ? CHIP_ON : CHIP_OFF}`}>{it.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* Mega */}
        {myEntry?.hasMega && (
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">Forma · Omni Ring</label>
            <div className="flex gap-1.5 flex-wrap">
              <button type="button" onClick={() => handleMyMega(null)}
                className={`${CHIP_BASE} px-3 py-1 ${!myMega ? CHIP_ON : CHIP_OFF}`}>Base</button>
              {myMegas.map(mega => (
                <button key={mega.megaName} type="button" onClick={() => handleMyMega(mega)}
                  className={`${CHIP_BASE} px-3 py-1 ${myMega?.megaName === mega.megaName ? GOLD_ON : GOLD_OFF}`}>
                  {megaLabel(mega)}
                </button>
              ))}
            </div>
            {myMega && (
              <p className="text-xs text-champ-muted font-body mt-1">
                Habilidad: <span className="text-champ-gold">{myMega.megaAbility}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Objetivo ── */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">Objetivo</h2>
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
            <p className="text-xs text-champ-muted font-body">Configura el atacante que quieres aguantar.</p>

            <PokemonPicker value={atkEntry} onChange={handleAtkEntry} label="Pokémon atacante" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">Naturaleza atacante</label>
                <NatureSelect value={atkNature} onChange={n => { setAtkNature(n); setResult(null) }} />
              </div>
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">Movimiento</label>
                <input value={moveName} onChange={e => { setMoveName(e.target.value); setResult(null) }}
                  placeholder="ej. Earthquake" className={INPUT_CLS} />
                {atkTopMoves.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {atkTopMoves.map(m => (
                      <button key={m.name} type="button" onClick={() => { setMoveName(m.name); setResult(null) }}
                        className={`${CHIP_BASE} ${moveName === m.name ? CHIP_ON : CHIP_OFF}`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <AbilityItemInputs
              ability={atkAbility} item={atkItem}
              onAbility={v => setAtkAbility(v)} onItem={v => setAtkItem(v)}
              meta={atkMeta}
            />

            {/* Mega atacante */}
            {atkEntry?.hasMega && (
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">Forma atacante · Omni Ring</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => handleAtkMega(null)}
                    className={`${CHIP_BASE} px-3 py-1 ${!atkMega ? CHIP_ON : CHIP_OFF}`}>Base</button>
                  {atkMegas.map(mega => (
                    <button key={mega.megaName} type="button" onClick={() => handleAtkMega(mega)}
                      className={`${CHIP_BASE} px-3 py-1 ${atkMega?.megaName === mega.megaName ? GOLD_ON : GOLD_OFF}`}>
                      {megaLabel(mega)}
                    </button>
                  ))}
                </div>
                {atkMega && (
                  <p className="text-xs text-champ-muted font-body mt-1">
                    Habilidad: <span className="text-champ-gold">{atkMega.megaAbility}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs text-champ-muted font-body mb-2">Inversión SP del atacante</p>
              <SPSlider
                key={`${atkEntry?.id ?? 'empty-atk'}-${atkMega?.megaName ?? 'base'}`}
                baseStats={atkDisplayStats}
                nature={atkNature}
                initialSpread={EMPTY_SP_SPREAD}
                onChange={spread => { setAtkSpSpread(spread); setResult(null) }}
              />
            </div>

            {/* Condiciones de campo */}
            <FieldConditions
              weather={surviveWeather} terrain={surviveTerrain}
              onWeather={v => { setSurviveWeather(v); setResult(null) }}
              onTerrain={v => { setSurviveTerrain(v); setResult(null) }}
            />

            {/* Modificadores del atacante */}
            <div className="space-y-2">
              <label className="text-xs text-champ-muted font-body block">Modificadores del atacante</label>
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button"
                  onClick={() => { setSurviveCrit(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${surviveCrit ? CHIP_ON : CHIP_OFF}`}>
                  Golpe Crítico
                </button>
                <button type="button"
                  onClick={() => { setSurviveHH(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${surviveHH ? CHIP_ON : CHIP_OFF}`}>
                  Ayuda Extra
                </button>
                <div className="ml-auto">
                  <BoostStepper
                    label="Boost Atk/SpA"
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
            <p className="text-xs text-champ-muted font-body">
              Configura el defensor objetivo. Ajusta su spread SP para modelar escenarios reales.
            </p>

            <PokemonPicker value={defEntry} onChange={handleDefEntry} label="Pokémon defensor" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">Naturaleza defensor</label>
                <NatureSelect value={defNature} onChange={n => { setDefNature(n); setResult(null) }} />
              </div>
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">Movimiento a usar</label>
                <input value={koMove} onChange={e => { setKoMove(e.target.value); setResult(null) }}
                  placeholder="ej. Flamethrower" className={INPUT_CLS} />
                {myTopMoves.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {myTopMoves.map(m => (
                      <button key={m.name} type="button" onClick={() => { setKoMove(m.name); setResult(null) }}
                        className={`${CHIP_BASE} ${koMove === m.name ? CHIP_ON : CHIP_OFF}`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <AbilityItemInputs
              ability={defAbility} item={defItem}
              onAbility={v => setDefAbility(v)} onItem={v => setDefItem(v)}
              meta={defMeta}
            />

            {/* Mega defensor */}
            {defEntry?.hasMega && (
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">Forma defensor · Omni Ring</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => handleDefMega(null)}
                    className={`${CHIP_BASE} px-3 py-1 ${!defMega ? CHIP_ON : CHIP_OFF}`}>Base</button>
                  {defMegas.map(mega => (
                    <button key={mega.megaName} type="button" onClick={() => handleDefMega(mega)}
                      className={`${CHIP_BASE} px-3 py-1 ${defMega?.megaName === mega.megaName ? GOLD_ON : GOLD_OFF}`}>
                      {megaLabel(mega)}
                    </button>
                  ))}
                </div>
                {defMega && (
                  <p className="text-xs text-champ-muted font-body mt-1">
                    Habilidad: <span className="text-champ-gold">{defMega.megaAbility}</span>
                  </p>
                )}
              </div>
            )}

            {/* Condiciones de campo */}
            <FieldConditions
              weather={koWeather} terrain={koTerrain}
              onWeather={v => { setKoWeather(v); setResult(null) }}
              onTerrain={v => { setKoTerrain(v); setResult(null) }}
            />

            {/* Boost ofensivo propio */}
            <BoostStepper
              label="Boost Atk/SpA propio"
              value={myBoost}
              onChange={v => { setMyBoost(v); setResult(null) }}
            />

            <div>
              <label className="text-xs text-champ-muted font-body block mb-2">Stat a optimizar</label>
              <div className="flex gap-2">
                {(['atk', 'spa'] as const).map(s => (
                  <button key={s} type="button"
                    onClick={() => { setStatToOpt(s); setResult(null) }}
                    className={`${CHIP_BASE} px-4 py-1.5 ${statToOpt === s ? CHIP_ON : CHIP_OFF}`}>
                    {s === 'atk' ? 'Físico (Atk)' : 'Especial (SpA)'}
                  </button>
                ))}
              </div>
            </div>

            {defEntry && (
              <div>
                <p className="text-xs text-champ-muted font-body mb-2">Inversión SP del defensor</p>
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
            <p className="text-xs text-champ-muted font-body">Define el rival que quieres superar en velocidad.</p>

            <PokemonPicker value={rivalEntry} onChange={e => { setRivalEntry(e); setResult(null) }} label="Pokémon rival" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">Naturaleza rival</label>
                <NatureSelect value={rivalNature} onChange={n => { setRivalNature(n); setResult(null) }} />
              </div>
              <div>
                <label className="text-xs text-champ-muted font-body block mb-1">
                  SP en Spe del rival
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

            {/* Viento Cola */}
            <div>
              <label className="text-xs text-champ-muted font-body block mb-2">Viento Cola activo</label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => { setMyTailwind(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${myTailwind ? CHIP_ON : CHIP_OFF}`}>
                  Mi equipo
                </button>
                <button type="button"
                  onClick={() => { setRivalTailwind(v => !v); setResult(null) }}
                  className={`${CHIP_BASE} px-3 py-1.5 ${rivalTailwind ? CHIP_ON : CHIP_OFF}`}>
                  Equipo rival
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Optimize button ── */}
      <button
        onClick={handleOptimize}
        disabled={isRunning || isLoadingStats}
        className="w-full py-3 bg-champ-gold hover:bg-champ-gold/80 text-black font-display text-lg font-bold rounded-xl transition-colors shadow-lg shadow-champ-gold/20 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isRunning ? 'Optimizando...' : isLoadingStats ? 'Cargando stats...' : 'Optimizar Spread'}
      </button>

      {/* ── Error ── */}
      {calcError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-body text-sm">{calcError}</p>
        </div>
      )}

      {/* ── Result ── */}
      {result && !calcError && (
        <div className={`rounded-xl border-2 p-6 space-y-5 ${
          result.success
            ? 'border-champ-gold/50 bg-champ-gold/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          {result.success && finalStats ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">Distribución óptima</h3>
                  <p className="text-champ-muted text-xs font-body mt-0.5">
                    {result.totalSP} SP invertidos · {' '}
                    <span className="text-champ-gold font-semibold">{result.remainingSP} SP libres</span>
                    {' '}para otras stats
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-champ-gold font-display font-bold text-3xl">{result.totalSP}</span>
                  <span className="text-champ-muted text-sm font-body ml-1">/ 66 SP</span>
                </div>
              </div>

              {/* SP bar chart */}
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

              {/* SP remaining visual */}
              <div>
                <div className="flex justify-between text-xs font-body text-champ-muted mb-1.5">
                  <span>SP usados</span>
                  <span>{result.totalSP} / 66</span>
                </div>
                <div className="h-2 bg-champ-border rounded-full overflow-hidden">
                  <div className="h-full bg-champ-gold rounded-full" style={{ width: `${(result.totalSP / 66) * 100}%` }} />
                </div>
                <p className="text-right text-xs text-champ-gold font-mono mt-1">{result.remainingSP} SP libres</p>
              </div>

              {/* Verification */}
              <div className="border-t border-champ-border/40 pt-4">
                <p className="text-champ-success text-sm font-body font-semibold mb-1">Verificacion</p>
                <p className="text-white text-sm font-mono">{result.verificationText}</p>
              </div>

              {/* Open in calculator */}
              <Link
                href={calcUrl}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-champ-blue/20 hover:bg-champ-blue/30 border border-champ-blue/40 rounded-lg text-champ-blue text-sm font-bold font-body transition-colors"
              >
                Abrir en Calculadora de Daño
              </Link>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-red-400 font-body font-semibold mb-1">Sin solución posible</p>
              <p className="text-champ-muted text-sm font-body">{result.failText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
