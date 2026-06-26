'use client'

import { useState, useEffect } from 'react'
import type { DamageCalcInput, DamageCalcResult, NatureName, PokemonStatus } from '@/types/champions'
import { EMPTY_SP_SPREAD } from '@/types/champions'
import { runDamageCalc, toSmogonSpecies } from '@/lib/smogon-calc'
import { getPokemonMeta } from '@/lib/champions-meta'
import { getMegas } from '@/data/mega-stones'
import { ROSTER_BY_ID } from '@/data/regulation-mb'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { MegaEvolution } from '@/types/champions'
import type { BaseStats } from '@/types/pokemon'
import { calcFinalStat, getNatureMods } from '@/lib/sp-utils'
import { getBaseStats } from '@/lib/base-stats'
import SPSlider from '@/components/calculator/SPSlider'
import PokemonPicker from '@/components/calculator/PokemonPicker'

// ── Constants ────────────────────────────────────────────────────────────────

const NATURES: NatureName[] = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky',
]

const DEFAULT_STATS: BaseStats = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 }

const INPUT_CLS = 'w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors'
const CHIP_BASE = 'text-xs px-2 py-0.5 rounded border font-body transition-colors cursor-pointer'
const CHIP_ON   = 'bg-champ-blue border-champ-blue text-white'
const CHIP_OFF  = 'border-champ-border text-champ-muted hover:text-white hover:border-champ-blue/50'
const GOLD_ON   = 'bg-champ-gold border-champ-gold text-black'
const GOLD_OFF  = 'border-champ-gold/30 text-champ-gold hover:border-champ-gold'

// ── State types ──────────────────────────────────────────────────────────────

interface PokemonSide {
  entry:        ChampionsPokemonEntry | null
  nature:       NatureName
  spSpread:     typeof EMPTY_SP_SPREAD
  ability:      string
  item:         string
  selectedMega: MegaEvolution | null
  status:       PokemonStatus
  boostAtk:     number
  boostSpa:     number
  boostDef:     number
  boostSpd:     number
  boostSpe:     number
  // attacker-only
  isHelpingHand: boolean
  isCrit:        boolean
  isTailwind:    boolean
  isBattery:     boolean
  isPowerSpot:   boolean
  // defender-only
  isFriendGuard:    boolean
  isReflect:        boolean
  isLightScreen:    boolean
  isAuroraVeil:     boolean
  currentHpPercent: number
}

function makeSide(
  entry: ChampionsPokemonEntry | null,
  nature: NatureName = 'Jolly',
  initialSpSpread?: typeof EMPTY_SP_SPREAD,
  initialMega?: MegaEvolution | null,
): PokemonSide {
  const meta = entry ? getPokemonMeta(entry.displayName) : null
  return {
    entry, nature,
    spSpread:     initialSpSpread ? { ...initialSpSpread } : { ...EMPTY_SP_SPREAD },
    ability:      initialMega?.megaAbility ?? meta?.top_abilities[0]?.name ?? '',
    item:         meta?.top_items[0]?.name ?? '',
    selectedMega: initialMega ?? null,
    status:       '',
    boostAtk: 0, boostSpa: 0, boostDef: 0, boostSpd: 0, boostSpe: 0,
    isHelpingHand: false, isCrit: false, isTailwind: false, isBattery: false, isPowerSpot: false,
    isFriendGuard: false, isReflect: false, isLightScreen: false, isAuroraVeil: false,
    currentHpPercent: 100,
  }
}

// ── Custom hooks ─────────────────────────────────────────────────────────────

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
        const get = (n: string) => data.stats.find(s => s.stat.name === n)?.base_stat ?? 100
        setStats({ hp: get('hp'), atk: get('attack'), def: get('defense'), spa: get('special-attack'), spd: get('special-defense'), spe: get('speed') })
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pokeapiName])

  return { stats, loading }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function megaLabel(mega: MegaEvolution): string {
  const parts = mega.megaName.split('-')
  const idx   = parts.findIndex(p => p === 'mega')
  const suffix = parts.slice(idx + 1).map(s => s.toUpperCase()).join(' ')
  return suffix ? `Mega ${suffix}` : 'Mega'
}

type KOColor = 'green' | 'yellow' | 'red'
interface KOBadge { label: string; color: KOColor }

function getKOBadge(ko: string): KOBadge {
  const t = ko.toLowerCase()
  if (t.includes('guaranteed') && t.includes('ohko'))
    return { label: 'OHKO garantizado', color: 'green' }
  if (t.includes('guaranteed') && t.includes('2hko'))
    return { label: '2HKO garantizado', color: 'yellow' }
  if (t.includes('ohko'))
    return { label: 'OHKO posible', color: 'red' }
  if (t.includes('2hko'))
    return { label: '2HKO posible', color: 'red' }
  return { label: 'No garantiza 2HKO', color: 'red' }
}

const KO_BADGE_CLS: Record<KOColor, string> = {
  green:  'bg-green-500 text-white',
  yellow: 'bg-champ-gold text-black',
  red:    'bg-red-600 text-white',
}
const KO_BORDER_CLS: Record<KOColor, string> = {
  green:  'border-green-500/50 bg-green-500/5',
  yellow: 'border-champ-gold/50 bg-champ-gold/5',
  red:    'border-red-500/30 bg-red-500/5',
}

function calcFinalSpe(
  baseSpe: number,
  nature: NatureName,
  spSpe: number,
  boost: number,
  isTailwind: boolean,
  status: PokemonStatus
): number {
  const mods = getNatureMods(nature)
  const stat = calcFinalStat('spe', baseSpe, spSpe, mods.spe)
  const boosted = boost >= 0
    ? Math.floor(stat * (2 + boost) / 2)
    : Math.floor(stat * 2 / (2 + Math.abs(boost)))
  const withTailwind = isTailwind ? boosted * 2 : boosted
  return status === 'par' ? Math.floor(withTailwind * 0.5) : withTailwind
}

function onlyNonZero(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== 0))
}

// ── Small UI components ───────────────────────────────────────────────────────

function Toggle({ label, value, onChange, gold = false }: {
  label: string; value: boolean; onChange: (v: boolean) => void; gold?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`${CHIP_BASE} px-2.5 py-1 ${value ? (gold ? GOLD_ON : CHIP_ON) : (gold ? GOLD_OFF : CHIP_OFF)}`}
    >
      {label}
    </button>
  )
}

function BoostStepper({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-champ-muted font-body w-7 shrink-0">{label}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(-6, value - 1))}
        disabled={value <= -6}
        className="w-5 h-5 rounded text-xs bg-champ-elevated border border-champ-border text-champ-muted hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors"
      >−</button>
      <span className={`text-xs font-mono w-6 text-center font-bold ${
        value > 0 ? 'text-champ-success' : value < 0 ? 'text-champ-danger' : 'text-champ-muted'
      }`}>
        {value > 0 ? `+${value}` : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(6, value + 1))}
        disabled={value >= 6}
        className="w-5 h-5 rounded text-xs bg-champ-elevated border border-champ-border text-champ-muted hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors"
      >+</button>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DamageCalcProps {
  initialAttacker?:  ChampionsPokemonEntry | null
  initialNature?:    NatureName
  initialSpSpread?:  typeof EMPTY_SP_SPREAD
  initialMega?:      MegaEvolution | null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DamageCalc({ initialAttacker, initialNature, initialSpSpread, initialMega }: DamageCalcProps = {}) {
  const [attacker, setAttacker] = useState<PokemonSide>(() =>
    makeSide(initialAttacker ?? ROSTER_BY_ID.get('garchomp') ?? null, initialNature ?? 'Jolly', initialSpSpread, initialMega)
  )
  const [defender, setDefender] = useState<PokemonSide>(() =>
    makeSide(ROSTER_BY_ID.get('charizard') ?? null, 'Timid')
  )

  const [move,      setMove]      = useState('')
  const [weather,   setWeather]   = useState('')
  const [terrain,   setTerrain]   = useState('')
  const [isGravity, setIsGravity] = useState(false)
  const [result,    setResult]    = useState<DamageCalcResult | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const { stats: atkBaseStats, loading: atkLoading } = usePokemonStats(attacker.entry?.pokeapiName ?? null)
  const { stats: defBaseStats, loading: defLoading } = usePokemonStats(defender.entry?.pokeapiName ?? null)
  const isLoadingStats = atkLoading || defLoading

  const atkDisplayStats = attacker.selectedMega?.megaBaseStats ?? atkBaseStats
  const defDisplayStats = defender.selectedMega?.megaBaseStats ?? defBaseStats

  const atkMeta  = attacker.entry ? getPokemonMeta(attacker.entry.displayName) : null
  const defMeta  = defender.entry ? getPokemonMeta(defender.entry.displayName) : null
  const atkMegas = attacker.entry?.hasMega ? getMegas(attacker.entry.id) : []
  const defMegas = defender.entry?.hasMega ? getMegas(defender.entry.id) : []

  const atkSpe = calcFinalSpe(atkDisplayStats.spe, attacker.nature, attacker.spSpread.spe, attacker.boostSpe, attacker.isTailwind, attacker.status)
  const defSpe = calcFinalSpe(defDisplayStats.spe, defender.nature, defender.spSpread.spe, defender.boostSpe, defender.isTailwind, defender.status)

  const handleEntryChange = (side: 'atk' | 'def', entry: ChampionsPokemonEntry) => {
    if (side === 'atk') { setAttacker(makeSide(entry)); setMove('') }
    else setDefender(makeSide(entry))
    setResult(null)
  }

  const handleMegaSelect = (side: 'atk' | 'def', mega: MegaEvolution | null) => {
    const meta   = side === 'atk' ? atkMeta : defMeta
    const setter = side === 'atk' ? setAttacker : setDefender
    setter(prev => ({
      ...prev,
      selectedMega: mega,
      ability: mega?.megaAbility ?? meta?.top_abilities[0]?.name ?? prev.ability,
    }))
    setResult(null)
  }

  const updateSide = (side: 'atk' | 'def', patch: Partial<PokemonSide>) => {
    const setter = side === 'atk' ? setAttacker : setDefender
    setter(prev => ({ ...prev, ...patch }))
    setResult(null)
  }

  const handleSwap = () => {
    const prevAtk = attacker
    const prevDef = defender
    setAttacker(prevDef)
    setDefender(prevAtk)
    setMove('')
    setResult(null)
  }

  const handleCalc = () => {
    setError(null)
    if (!attacker.entry || !defender.entry) {
      setError('Selecciona los Pokémon atacante y defensor.')
      return
    }
    if (!move.trim()) {
      setError('Introduce el nombre de un movimiento.')
      return
    }
    try {
      const atkBoosts = onlyNonZero({
        atk: attacker.boostAtk, spa: attacker.boostSpa,
        def: attacker.boostDef, spd: attacker.boostSpd, spe: attacker.boostSpe,
      })
      const defBoosts = onlyNonZero({
        def: defender.boostDef, spd: defender.boostSpd,
        atk: defender.boostAtk, spa: defender.boostSpa, spe: defender.boostSpe,
      })

      const atkSideOpts = {
        isHelpingHand: attacker.isHelpingHand || undefined,
        isTailwind:    attacker.isTailwind    || undefined,
        isBattery:     attacker.isBattery     || undefined,
        isPowerSpot:   attacker.isPowerSpot   || undefined,
      }

      const input: DamageCalcInput = {
        attacker: {
          species:       toSmogonSpecies(attacker.entry.pokeapiName),
          nature:        attacker.nature,
          spSpread:      attacker.spSpread,
          ability:       attacker.ability   || undefined,
          item:          attacker.item      || undefined,
          megaBaseStats: attacker.selectedMega?.megaBaseStats,
          status:        attacker.status    || undefined,
          boosts:        Object.keys(atkBoosts).length ? atkBoosts : undefined,
        },
        defender: {
          species:          toSmogonSpecies(defender.entry.pokeapiName),
          nature:           defender.nature,
          spSpread:         defender.spSpread,
          ability:          defender.ability   || undefined,
          item:             defender.item      || undefined,
          megaBaseStats:    defender.selectedMega?.megaBaseStats,
          status:           defender.status    || undefined,
          boosts:           Object.keys(defBoosts).length ? defBoosts : undefined,
          currentHpPercent: defender.currentHpPercent < 100 ? defender.currentHpPercent : undefined,
        },
        move: move.trim(),
        moveOptions: { isCrit: attacker.isCrit || undefined },
        fieldConditions: {
          weather:   (weather || undefined) as never,
          terrain:   (terrain || undefined) as never,
          isGravity: isGravity || undefined,
        },
        attackerSide: Object.values(atkSideOpts).some(Boolean) ? atkSideOpts : undefined,
        defenderSide: (defender.isFriendGuard || defender.isReflect || defender.isLightScreen || defender.isAuroraVeil)
          ? {
              isFriendGuard: defender.isFriendGuard || undefined,
              isReflect:     defender.isReflect     || undefined,
              isLightScreen: defender.isLightScreen || undefined,
              isAuroraVeil:  defender.isAuroraVeil  || undefined,
            }
          : undefined,
      }
      setResult(runDamageCalc(input))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido en el cálculo.')
    }
  }

  const koBadge      = result ? getKOBadge(result.koChance) : null
  const defenderCurHP = result ? Math.round(result.defenderHP * defender.currentHpPercent / 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SideCard
          label="Atacante" isAttacker
          accentCls="text-red-400"
          side={attacker}
          displayStats={atkDisplayStats}
          megas={atkMegas}
          meta={atkMeta}
          onEntryChange={e  => handleEntryChange('atk', e)}
          onMegaSelect={m   => handleMegaSelect('atk', m)}
          onUpdate={patch   => updateSide('atk', patch)}
          move={move}
          onMoveChange={setMove}
        />

        <SideCard
          label="Defensor"
          accentCls="text-blue-400"
          side={defender}
          displayStats={defDisplayStats}
          megas={defMegas}
          meta={defMeta}
          onEntryChange={e => handleEntryChange('def', e)}
          onMegaSelect={m  => handleMegaSelect('def', m)}
          onUpdate={patch  => updateSide('def', patch)}
        />
      </div>

      {/* ── Result ── */}
      {result && !error && koBadge && (
        <div className={`rounded-xl border-2 p-6 space-y-4 ${KO_BORDER_CLS[koBadge.color]}`}>
          {/* Main numbers + badge */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-champ-muted text-xs font-body mb-1">Daño</p>
                <p className="text-white font-mono font-bold text-4xl leading-none">
                  {result.damage.min}–{result.damage.max}
                  <span className="text-champ-muted text-base font-body font-normal ml-1.5">HP</span>
                </p>
              </div>
              <div>
                <p className="text-champ-muted text-xs font-body mb-1">% Vida</p>
                <p className="text-white font-mono font-bold text-4xl leading-none">
                  {result.percentMin}–{result.percentMax}
                  <span className="text-champ-muted text-base font-body font-normal ml-0.5">%</span>
                </p>
              </div>
              {defender.currentHpPercent < 100 && (
                <div>
                  <p className="text-champ-muted text-xs font-body mb-1">HP restante</p>
                  <p className="text-white font-mono font-bold text-4xl leading-none">
                    {Math.max(0, defenderCurHP - result.damage.max)}
                    <span className="text-champ-muted text-base font-body font-normal">/{result.defenderHP}</span>
                  </p>
                </div>
              )}
            </div>
            <span className={`px-4 py-2 rounded-xl text-sm font-bold font-display whitespace-nowrap ${KO_BADGE_CLS[koBadge.color]}`}>
              {koBadge.label}
            </span>
          </div>

          {/* Smogon description */}
          <p className="text-champ-muted text-xs font-mono leading-relaxed break-words border-t border-champ-border/40 pt-4">
            {result.description}
          </p>

          {/* 16 rolls */}
          <div>
            <p className="text-champ-muted text-[10px] font-body uppercase tracking-widest mb-1.5">Rolls (16)</p>
            <div className="flex flex-wrap gap-1">
              {result.damage.rolls.map((dmg, i) => (
                <span
                  key={i}
                  className={`text-xs font-mono rounded px-1.5 py-0.5 border ${
                    dmg === result.damage.max ? 'bg-champ-blue/20 border-champ-blue/40 text-champ-blue' :
                    dmg === result.damage.min ? 'bg-champ-border/60 text-champ-muted border-transparent' :
                    'bg-champ-bg border-champ-border text-champ-muted'
                  }`}
                >
                  {dmg}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Swap + Speed comparison ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleSwap}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-champ-elevated border border-champ-border rounded-lg text-sm text-champ-muted hover:text-white hover:border-champ-blue/50 font-body transition-colors"
        >
          ⇄ Intercambiar
        </button>

        {attacker.entry && defender.entry && (
          <div className="flex-1 w-full bg-champ-surface border border-champ-border rounded-lg px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="text-sm font-body">
              <span className="text-red-400 font-bold">{attacker.entry.displayName}</span>
              <span className="text-white font-mono font-bold ml-2">{atkSpe}</span>
              <span className="text-champ-muted text-xs ml-1">Spe</span>
              {attacker.isTailwind && <span className="ml-1 text-[10px] text-champ-blue border border-champ-blue/40 rounded px-1">TW</span>}
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
              atkSpe > defSpe
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : atkSpe < defSpe
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-champ-elevated border-champ-border text-champ-muted'
            }`}>
              {atkSpe > defSpe ? 'va primero' : atkSpe < defSpe ? 'va segundo' : 'empate'}
            </span>
            <div className="text-sm font-body text-right">
              <span className="text-blue-400 font-bold">{defender.entry.displayName}</span>
              <span className="text-white font-mono font-bold ml-2">{defSpe}</span>
              <span className="text-champ-muted text-xs ml-1">Spe</span>
              {defender.isTailwind && <span className="ml-1 text-[10px] text-champ-blue border border-champ-blue/40 rounded px-1">TW</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Field conditions ── */}
      <div className="bg-champ-surface border border-champ-border rounded-xl p-5">
        <h2 className="font-display text-base font-bold text-white mb-3">Condiciones de campo</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">Clima</label>
            <select value={weather} onChange={e => setWeather(e.target.value)} className={INPUT_CLS}>
              <option value="">Ninguno</option>
              <option value="Sun">Sol</option>
              <option value="Rain">Lluvia</option>
              <option value="Sand">Arena</option>
              <option value="Snow">Nieve</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">Terreno</label>
            <select value={terrain} onChange={e => setTerrain(e.target.value)} className={INPUT_CLS}>
              <option value="">Ninguno</option>
              <option value="Electric">Eléctrico</option>
              <option value="Grassy">Planta</option>
              <option value="Misty">Niebla</option>
              <option value="Psychic">Psíquico</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Toggle label="Gravedad" value={isGravity} onChange={setIsGravity} />
        </div>
      </div>

      {/* ── Calculate ── */}
      <button
        onClick={handleCalc}
        disabled={isLoadingStats}
        className="w-full py-3 bg-champ-blue hover:bg-champ-blue-glow text-white font-display text-lg font-bold rounded-xl transition-colors shadow-lg shadow-champ-blue/25 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoadingStats ? 'Cargando stats...' : 'Calcular Daño'}
      </button>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-body text-sm">{error}</p>
        </div>
      )}

    </div>
  )
}

// ── SideCard ─────────────────────────────────────────────────────────────────

interface SideCardProps {
  label:      string
  isAttacker?: boolean
  accentCls:  string
  side:        PokemonSide
  displayStats: BaseStats
  megas:       MegaEvolution[]
  meta:        ReturnType<typeof getPokemonMeta>
  onEntryChange: (e: ChampionsPokemonEntry) => void
  onMegaSelect:  (m: MegaEvolution | null)  => void
  onUpdate:      (patch: Partial<PokemonSide>) => void
  move?:       string
  onMoveChange?: (m: string) => void
}

function SideCard({
  label, isAttacker = false, accentCls,
  side, displayStats, megas, meta,
  onEntryChange, onMegaSelect, onUpdate,
  move = '', onMoveChange,
}: SideCardProps) {
  const topMoves = meta?.top_moves?.slice(0, 8)    ?? []
  const topAb    = meta?.top_abilities?.slice(0, 3) ?? []
  const topItems = meta?.top_items?.slice(0, 4)    ?? []

  return (
    <div className="bg-champ-surface border border-champ-border rounded-xl p-5 space-y-4">
      <h2 className={`font-display text-lg font-bold ${accentCls}`}>{label}</h2>

      {/* Pokémon picker */}
      <PokemonPicker value={side.entry} onChange={onEntryChange} label="Pokémon" />

      {/* Nature + Ability */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">Naturaleza</label>
          <select
            value={side.nature}
            onChange={e => onUpdate({ nature: e.target.value as NatureName })}
            className={INPUT_CLS}
          >
            {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">Habilidad</label>
          <input
            value={side.ability}
            onChange={e => onUpdate({ ability: e.target.value })}
            placeholder="ej. Rough Skin"
            className={INPUT_CLS}
          />
          {topAb.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {topAb.map(a => (
                <button key={a.name} type="button" onClick={() => onUpdate({ ability: a.name })}
                  className={`${CHIP_BASE} ${side.ability === a.name ? CHIP_ON : CHIP_OFF}`}>
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item */}
      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">Objeto</label>
        <input
          value={side.item}
          onChange={e => onUpdate({ item: e.target.value })}
          placeholder="ej. Life Orb"
          className={INPUT_CLS}
        />
        {topItems.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {topItems.map(it => (
              <button key={it.name} type="button" onClick={() => onUpdate({ item: it.name })}
                className={`${CHIP_BASE} ${side.item === it.name ? CHIP_ON : CHIP_OFF}`}>
                {it.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mega selector */}
      {megas.length > 0 && (
        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">Forma · Omni Ring</label>
          <div className="flex gap-1.5 flex-wrap">
            <button type="button" onClick={() => onMegaSelect(null)}
              className={`${CHIP_BASE} px-3 py-1 ${!side.selectedMega ? CHIP_ON : CHIP_OFF}`}>
              Base
            </button>
            {megas.map(mega => (
              <button key={mega.megaName} type="button" onClick={() => onMegaSelect(mega)}
                className={`${CHIP_BASE} px-3 py-1 ${side.selectedMega?.megaName === mega.megaName ? GOLD_ON : GOLD_OFF}`}>
                {megaLabel(mega)}
              </button>
            ))}
          </div>
          {side.selectedMega && (
            <p className="text-xs text-champ-muted font-body mt-1">
              Habilidad: <span className="text-champ-gold">{side.selectedMega.megaAbility}</span>
            </p>
          )}
        </div>
      )}

      {/* Move picker — attacker only */}
      {isAttacker && onMoveChange && (
        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">Movimiento</label>
          <input
            value={move}
            onChange={e => onMoveChange(e.target.value)}
            placeholder="ej. Earthquake"
            className={INPUT_CLS}
          />
          {topMoves.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {topMoves.map(m => (
                <button key={m.name} type="button" onClick={() => onMoveChange(m.name)}
                  className={`${CHIP_BASE} ${move === m.name ? CHIP_ON : CHIP_OFF}`}>
                  {m.name}
                  <span className="ml-1 opacity-50">{(m.usage * 100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Battle modifiers ── */}
      <div className="border-t border-champ-border/50 pt-3 space-y-2.5">
        <p className="text-[10px] font-bold text-champ-muted uppercase tracking-widest font-body">
          Condiciones de batalla
        </p>

        {isAttacker ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Toggle label="Ayuda Extra"   value={side.isHelpingHand} onChange={v => onUpdate({ isHelpingHand: v })} />
              <Toggle label="Golpe Crítico" value={side.isCrit}        onChange={v => onUpdate({ isCrit: v })} />
              <Toggle label="Viento Cola"   value={side.isTailwind}    onChange={v => onUpdate({ isTailwind: v })} />
              <Toggle label="Batería"       value={side.isBattery}     onChange={v => onUpdate({ isBattery: v })} />
              <Toggle label="Zona de Poder" value={side.isPowerSpot}   onChange={v => onUpdate({ isPowerSpot: v })} />
              <select
                value={side.status}
                onChange={e => onUpdate({ status: e.target.value as PokemonStatus })}
                className="text-xs bg-champ-elevated border border-champ-border rounded px-2 py-0.5 text-champ-muted font-body focus:outline-none focus:border-champ-blue"
              >
                <option value="">Sano</option>
                <option value="brn">Quemado (Atk×½)</option>
                <option value="par">Paralizado</option>
                <option value="psn">Envenenado</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <BoostStepper label="Atk" value={side.boostAtk} onChange={v => onUpdate({ boostAtk: v })} />
              <BoostStepper label="SpA" value={side.boostSpa} onChange={v => onUpdate({ boostSpa: v })} />
              <BoostStepper label="Def" value={side.boostDef} onChange={v => onUpdate({ boostDef: v })} />
              <BoostStepper label="SpD" value={side.boostSpd} onChange={v => onUpdate({ boostSpd: v })} />
              <BoostStepper label="Spe" value={side.boostSpe} onChange={v => onUpdate({ boostSpe: v })} />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Toggle label="Guardia Amigo" value={side.isFriendGuard} onChange={v => onUpdate({ isFriendGuard: v })} />
              <Toggle label="Viento Cola"   value={side.isTailwind}    onChange={v => onUpdate({ isTailwind: v })} />
              <Toggle label="Reflejo"       value={side.isReflect}     onChange={v => onUpdate({ isReflect: v })} />
              <Toggle label="Pantalla Luz"  value={side.isLightScreen} onChange={v => onUpdate({ isLightScreen: v })} />
              <Toggle label="Velo Aurora"   value={side.isAuroraVeil}  onChange={v => onUpdate({ isAuroraVeil: v })} />
            </div>
            <div className="flex flex-wrap gap-3">
              <BoostStepper label="Def" value={side.boostDef} onChange={v => onUpdate({ boostDef: v })} />
              <BoostStepper label="SpD" value={side.boostSpd} onChange={v => onUpdate({ boostSpd: v })} />
              <BoostStepper label="Atk" value={side.boostAtk} onChange={v => onUpdate({ boostAtk: v })} />
              <BoostStepper label="SpA" value={side.boostSpa} onChange={v => onUpdate({ boostSpa: v })} />
              <BoostStepper label="Spe" value={side.boostSpe} onChange={v => onUpdate({ boostSpe: v })} />
            </div>

            {/* HP actual */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-champ-muted uppercase tracking-widest font-body">HP actual</span>
                <span className={`text-xs font-mono font-bold ${side.currentHpPercent < 50 ? 'text-red-400' : side.currentHpPercent < 75 ? 'text-champ-gold' : 'text-champ-muted'}`}>
                  {side.currentHpPercent}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={side.currentHpPercent}
                onChange={e => onUpdate({ currentHpPercent: Number(e.target.value) })}
                className="w-full accent-champ-blue cursor-pointer"
              />
            </div>
          </>
        )}
      </div>

      {/* SP Sliders */}
      <SPSlider
        key={`${side.entry?.id ?? 'empty'}-${side.selectedMega?.megaName ?? 'base'}`}
        baseStats={displayStats}
        nature={side.nature}
        initialSpread={side.spSpread}
        onChange={spread => onUpdate({ spSpread: spread })}
      />
    </div>
  )
}
