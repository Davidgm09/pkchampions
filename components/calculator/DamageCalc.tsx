'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
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
import MoveInput from '@/components/optimizer/MoveInput'
import AbilityInput from '@/components/team/AbilityInput'
import ItemInput from '@/components/team/ItemInput'
import SpreadComparator from '@/components/calculator/SpreadComparator'
import ErrorToast from '@/components/ui/ErrorToast'
import type { PokemonSide } from '@/components/calculator/calc-types'
import { getKOBadge, KO_BADGE_CLS, KO_BORDER_CLS, onlyNonZero } from '@/components/calculator/calc-types'
import SavedSpreads, { SaveButton, useSavedSpreads } from '@/components/calculator/SavedSpreads'
import { useLanguage } from '@/contexts/LanguageContext'
import { natureLabel } from '@/lib/nature-names'
import { fetchAbilityES } from '@/lib/ability-names'
import { fetchItemES } from '@/lib/item-names'
import { fetchMoveNameES } from '@/lib/move-names'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_BG: Record<string, string> = {
  Normal: 'bg-type-normal', Fire: 'bg-type-fire', Water: 'bg-type-water',
  Electric: 'bg-type-electric', Grass: 'bg-type-grass', Ice: 'bg-type-ice',
  Fighting: 'bg-type-fighting', Poison: 'bg-type-poison', Ground: 'bg-type-ground',
  Flying: 'bg-type-flying', Psychic: 'bg-type-psychic', Bug: 'bg-type-bug',
  Rock: 'bg-type-rock', Ghost: 'bg-type-ghost', Dragon: 'bg-type-dragon',
  Dark: 'bg-type-dark', Steel: 'bg-type-steel', Fairy: 'bg-type-fairy',
}

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

// ── Small UI components ───────────────────────────────────────────────────────

function Toggle({ label, value, onChange, gold = false, title }: {
  label: string; value: boolean; onChange: (v: boolean) => void; gold?: boolean; title?: string
}) {
  return (
    <button
      type="button"
      title={title}
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
  initialAttacker?:         ChampionsPokemonEntry | null
  initialNature?:           NatureName
  initialSpSpread?:         typeof EMPTY_SP_SPREAD
  initialMega?:             MegaEvolution | null
  initialDefender?:         ChampionsPokemonEntry | null
  initialDefenderNature?:   NatureName
  initialDefenderSpSpread?: typeof EMPTY_SP_SPREAD
  initialDefenderMega?:     MegaEvolution | null
  initialMove?:             string
  initialWeather?:          string
  initialTerrain?:          string
  initialGravity?:          boolean
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DamageCalc({
  initialAttacker, initialNature, initialSpSpread, initialMega,
  initialDefender, initialDefenderNature, initialDefenderSpSpread, initialDefenderMega,
  initialMove = '', initialWeather = '', initialTerrain = '', initialGravity = false,
}: DamageCalcProps = {}) {
  const pathname  = usePathname()
  const isMounted = useRef(false)
  const { t } = useLanguage()

  const [attacker, setAttacker] = useState<PokemonSide>(() =>
    makeSide(initialAttacker ?? ROSTER_BY_ID.get('garchomp') ?? null, initialNature ?? 'Jolly', initialSpSpread, initialMega)
  )
  const [defender, setDefender] = useState<PokemonSide>(() =>
    makeSide(
      initialDefender ?? ROSTER_BY_ID.get('charizard') ?? null,
      initialDefenderNature ?? 'Timid',
      initialDefenderSpSpread,
      initialDefenderMega,
    )
  )

  const [move,      setMove]      = useState(initialMove)
  const [weather,   setWeather]   = useState(initialWeather)
  const [terrain,   setTerrain]   = useState(initialTerrain)
  const [isGravity, setIsGravity] = useState(initialGravity)

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }

    const p = new URLSearchParams()

    if (attacker.entry) p.set('atacante', attacker.entry.id)
    if (attacker.nature !== 'Jolly') p.set('naturaleza', attacker.nature)
    const a = attacker.spSpread
    if (a.hp)  p.set('hp',  String(a.hp))
    if (a.atk) p.set('atk', String(a.atk))
    if (a.def) p.set('def', String(a.def))
    if (a.spa) p.set('spa', String(a.spa))
    if (a.spd) p.set('spd', String(a.spd))
    if (a.spe) p.set('spe', String(a.spe))
    if (attacker.selectedMega) p.set('mega', attacker.selectedMega.megaName)

    if (defender.entry) p.set('def_pk', defender.entry.id)
    if (defender.nature !== 'Timid') p.set('def_nat', defender.nature)
    const d = defender.spSpread
    if (d.hp)  p.set('def_hp',  String(d.hp))
    if (d.atk) p.set('def_atk', String(d.atk))
    if (d.def) p.set('def_def', String(d.def))
    if (d.spa) p.set('def_spa', String(d.spa))
    if (d.spd) p.set('def_spd', String(d.spd))
    if (d.spe) p.set('def_spe', String(d.spe))
    if (defender.selectedMega) p.set('def_mega', defender.selectedMega.megaName)

    if (move)      p.set('mov',     move)
    if (weather)   p.set('clima',   weather)
    if (terrain)   p.set('terreno', terrain)
    if (isGravity) p.set('grav',    '1')

    const qs = p.toString()
    window.history.replaceState(null, '', `${pathname}${qs ? `?${qs}` : ''}`)
  }, [attacker, defender, move, weather, terrain, isGravity, pathname])

  const [result,    setResult]    = useState<DamageCalcResult | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [copied,    setCopied]    = useState(false)
  const { spreads, save: saveSpread, remove: removeSpread } = useSavedSpreads()

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
      setError(t('calc.err.selectBoth'))
      return
    }
    if (!move.trim()) {
      setError(t('calc.err.noMove'))
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
      setError(e instanceof Error ? e.message : t('calc.err.unknown'))
    }
  }

  const koBadge      = result ? getKOBadge(result.koChance) : null
  const defenderCurHP = result ? Math.round(result.defenderHP * defender.currentHpPercent / 100) : 0

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="font-display text-4xl font-bold text-white">{t('calc.title')}</h1>
        <p className="text-champ-muted font-body text-sm mt-1">{t('calc.subtitle')}</p>
      </div>

      {/* ── Info strip ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-champ-muted font-body">
        <span className="flex items-center gap-1.5">
          <span className="text-champ-gold">◈</span> {t('calc.infoEngine')}
        </span>
        <span className="text-champ-border hidden sm:block">|</span>
        <span>{t('calc.infoSP')}</span>
        <span className="text-champ-border hidden sm:block">|</span>
        <span className="flex items-center gap-1"><span className="text-champ-gold font-semibold">Mega</span> {t('calc.infoMega').replace('Mega ', '')}</span>
        <span className="text-champ-border hidden sm:block">|</span>
        <span>{t('calc.infoMoves')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SideCard
          label={t('common.attacker')} isAttacker
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
          label={t('common.defender')}
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-champ-muted text-xs font-body mb-1">{t('calc.dmgLabel')}</p>
                <p className="text-white font-mono font-bold text-4xl leading-none">
                  {result.damage.min}–{result.damage.max}
                  <span className="text-champ-muted text-base font-body font-normal ml-1.5">HP</span>
                </p>
              </div>
              <div>
                <p className="text-champ-muted text-xs font-body mb-1">{t('calc.hpLabel')}</p>
                <p className="text-white font-mono font-bold text-4xl leading-none">
                  {result.percentMin}–{result.percentMax}
                  <span className="text-champ-muted text-base font-body font-normal ml-0.5">%</span>
                </p>
              </div>
              {defender.currentHpPercent < 100 && (
                <div>
                  <p className="text-champ-muted text-xs font-body mb-1">{t('calc.hpRemaining')}</p>
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

          <div className="flex items-center gap-2 border-t border-champ-border/40 pt-4">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-body text-white ${TYPE_BG[result.moveType] ?? 'bg-champ-border'}`}>
              {t('type.' + result.moveType.toLowerCase())}
            </span>
            <span className="text-[10px] font-body text-champ-muted px-2 py-0.5 rounded border border-champ-border">
              {t('cat.' + result.moveCategory.toLowerCase())}
            </span>
            <p className="text-champ-muted text-xs font-mono leading-relaxed wrap-break-word flex-1">
              {result.description}
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-champ-muted text-[10px] font-body uppercase tracking-widest mb-1.5">{t('calc.rolls')}</p>
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
            <div className="flex items-center gap-2 shrink-0">
              <SaveButton onSave={saveSpread} />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-body text-xs transition-colors
                  bg-champ-elevated border-champ-border text-champ-muted hover:text-white hover:border-champ-blue/50"
              >
                {copied ? t('calc.copied') : t('calc.copyLink')}
              </button>
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
          {t('calc.swap')}
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
              {atkSpe > defSpe ? t('calc.goesFirst') : atkSpe < defSpe ? t('calc.goesSecond') : t('calc.tie')}
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
        <h2 className="font-display text-base font-bold text-white mb-3">{t('calc.fieldConds')}</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">{t('common.weather')}</label>
            <select value={weather} onChange={e => setWeather(e.target.value)} className={INPUT_CLS}>
              <option value="">{t('common.none')}</option>
              <option value="Sun">{t('weather.sun')}</option>
              <option value="Rain">{t('weather.rain')}</option>
              <option value="Sand">{t('weather.sand')}</option>
              <option value="Snow">{t('weather.snow')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-champ-muted font-body block mb-1">{t('common.terrain')}</label>
            <select value={terrain} onChange={e => setTerrain(e.target.value)} className={INPUT_CLS}>
              <option value="">{t('common.none')}</option>
              <option value="Electric">{t('terrain.electric')}</option>
              <option value="Grassy">{t('terrain.grassy')}</option>
              <option value="Misty">{t('terrain.misty')}</option>
              <option value="Psychic">{t('terrain.psychic')}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Toggle label={t('calc.gravity')} value={isGravity} onChange={setIsGravity} title="Gravity: prohíbe movimientos voladores y aumenta precisión. Afecta a ambos lados." />
        </div>
      </div>

      {/* ── Calculate ── */}
      <button
        onClick={handleCalc}
        disabled={isLoadingStats}
        className="w-full py-3 bg-champ-blue hover:bg-champ-blue-glow text-white font-display text-lg font-bold rounded-xl transition-colors shadow-lg shadow-champ-blue/25 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoadingStats ? t('calc.loadingStats') : t('calc.calculate')}
      </button>

      {/* ── Error ── */}
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}

      {/* ── Spread comparator ── */}
      {result && !error && attacker.entry && defender.entry && (
        <SpreadComparator
          result={result}
          attacker={attacker}
          defender={defender}
          move={move}
          weather={weather}
          terrain={terrain}
          isGravity={isGravity}
          atkBaseStats={atkDisplayStats}
          defBaseStats={defDisplayStats}
        />
      )}

      {/* ── Spreads guardados ── */}
      <SavedSpreads spreads={spreads} onRemove={removeSpread} />
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
  const { t, lang } = useLanguage()
  const topMoves = meta?.top_moves?.slice(0, 8)    ?? []
  const topAb    = meta?.top_abilities?.slice(0, 3) ?? []
  const topItems = meta?.top_items?.slice(0, 4)    ?? []

  const [abES,   setAbES]   = useState<Record<string, string>>({})
  const [itemES, setItemES] = useState<Record<string, string>>({})
  const [moveES, setMoveES] = useState<Record<string, string>>({})

  const abKey   = topAb.map(a => a.name).join(',')
  const itemKey = topItems.map(i => i.name).join(',')
  const moveKey = topMoves.map(m => m.name).join(',')

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

  useEffect(() => {
    if (lang !== 'es') return
    topMoves.forEach(m => fetchMoveNameES(m.name).then(es => { if (es) setMoveES(p => ({ ...p, [m.name]: es })) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, moveKey])

  return (
    <div className="bg-champ-surface border border-champ-border rounded-xl p-5 space-y-4">
      <h2 className={`font-display text-lg font-bold ${accentCls}`}>{label}</h2>

      <PokemonPicker value={side.entry} onChange={onEntryChange} label="Pokémon" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">{t('common.nature')}</label>
          <select
            value={side.nature}
            onChange={e => onUpdate({ nature: e.target.value as NatureName })}
            className={INPUT_CLS}
          >
            {NATURES.map(n => <option key={n} value={n}>{natureLabel(n, lang)}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">{t('common.ability')}</label>
          <AbilityInput
            value={side.ability}
            onChange={v => onUpdate({ ability: v })}
            pokeapiName={side.entry?.pokeapiName}
          />
          {topAb.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {topAb.map(a => (
                <button key={a.name} type="button" onClick={() => onUpdate({ ability: a.name })}
                  className={`${CHIP_BASE} ${side.ability === a.name ? CHIP_ON : CHIP_OFF}`}>
                  {lang === 'es' ? (abES[a.name] ?? a.name) : a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-champ-muted font-body block mb-1">{t('common.item')}</label>
        <ItemInput value={side.item} onChange={v => onUpdate({ item: v })} />
        {topItems.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {topItems.map(it => (
              <button key={it.name} type="button" onClick={() => onUpdate({ item: it.name })}
                className={`${CHIP_BASE} ${side.item === it.name ? CHIP_ON : CHIP_OFF}`}>
                {lang === 'es' ? (itemES[it.name] ?? it.name) : it.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {megas.length > 0 && (
        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">{t('calc.form')}</label>
          <div className="flex gap-1.5 flex-wrap">
            <button type="button" onClick={() => onMegaSelect(null)}
              className={`${CHIP_BASE} px-3 py-1 ${!side.selectedMega ? CHIP_ON : CHIP_OFF}`}>
              {t('common.base')}
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
              {t('calc.ability')}<span className="text-champ-gold">{side.selectedMega.megaAbility}</span>
            </p>
          )}
        </div>
      )}

      {isAttacker && onMoveChange && (
        <div>
          <label className="text-xs text-champ-muted font-body block mb-1">{t('common.move')}</label>
          <MoveInput
            value={move}
            onChange={onMoveChange}
            pokeapiName={side.entry?.pokeapiName}
            placeholder={lang === 'es' ? 'ej. Terremoto' : 'e.g. Earthquake'}
          />
          {topMoves.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {topMoves.map(m => (
                <button key={m.name} type="button" onClick={() => onMoveChange(m.name)}
                  className={`${CHIP_BASE} ${move === m.name ? CHIP_ON : CHIP_OFF}`}>
                  {lang === 'es' ? (moveES[m.name] ?? m.name) : m.name}
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
          {t('calc.battleConds')}
        </p>

        {isAttacker ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Toggle label={t('calc.helpingHand')}   value={side.isHelpingHand} onChange={v => onUpdate({ isHelpingHand: v })} />
              <Toggle label={t('calc.critHit')} value={side.isCrit}        onChange={v => onUpdate({ isCrit: v })} />
              <Toggle label={t('calc.tailwind')}   value={side.isTailwind}    onChange={v => onUpdate({ isTailwind: v })} />
              <Toggle label={t('calc.battery')}       value={side.isBattery}     onChange={v => onUpdate({ isBattery: v })} />
              <Toggle label={t('calc.powerSpot')} value={side.isPowerSpot}   onChange={v => onUpdate({ isPowerSpot: v })} />
              <select
                value={side.status}
                onChange={e => onUpdate({ status: e.target.value as PokemonStatus })}
                className="text-xs bg-champ-elevated border border-champ-border rounded px-2 py-0.5 text-champ-muted font-body focus:outline-none focus:border-champ-blue"
              >
                <option value="">{t('calc.status.healthy')}</option>
                <option value="brn">{t('calc.status.burned')}</option>
                <option value="par">{t('calc.status.paralyzed')}</option>
                <option value="psn">{t('calc.status.poisoned')}</option>
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
              <Toggle label={t('calc.friendGuard')} value={side.isFriendGuard} onChange={v => onUpdate({ isFriendGuard: v })} />
              <Toggle label={t('calc.tailwind')}   value={side.isTailwind}    onChange={v => onUpdate({ isTailwind: v })} />
              <Toggle label={t('calc.reflect')}       value={side.isReflect}     onChange={v => onUpdate({ isReflect: v })} />
              <Toggle label={t('calc.lightScreen')}  value={side.isLightScreen} onChange={v => onUpdate({ isLightScreen: v })} />
              <Toggle label={t('calc.auroraVeil')}   value={side.isAuroraVeil}  onChange={v => onUpdate({ isAuroraVeil: v })} />
            </div>
            <div className="flex flex-wrap gap-3">
              <BoostStepper label="Def" value={side.boostDef} onChange={v => onUpdate({ boostDef: v })} />
              <BoostStepper label="SpD" value={side.boostSpd} onChange={v => onUpdate({ boostSpd: v })} />
              <BoostStepper label="Atk" value={side.boostAtk} onChange={v => onUpdate({ boostAtk: v })} />
              <BoostStepper label="SpA" value={side.boostSpa} onChange={v => onUpdate({ boostSpa: v })} />
              <BoostStepper label="Spe" value={side.boostSpe} onChange={v => onUpdate({ boostSpe: v })} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-champ-muted uppercase tracking-widest font-body">{t('calc.currentHP')}</span>
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
