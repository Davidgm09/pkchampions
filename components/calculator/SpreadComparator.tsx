'use client'

import { useState, useEffect } from 'react'
import type { DamageCalcResult } from '@/types/champions'
import type { BaseStats } from '@/types/pokemon'
import { runDamageCalc, toSmogonSpecies } from '@/lib/smogon-calc'
import { calcFinalStat, getNatureMods } from '@/lib/sp-utils'
import type { PokemonSide } from '@/components/calculator/calc-types'
import { getKOBadge, onlyNonZero } from '@/components/calculator/calc-types'
import { useLanguage } from '@/contexts/LanguageContext'

const SP_STEPS = [0, 4, 8, 12, 16, 20, 24, 28, 32]

interface SpreadComparatorProps {
  result:       DamageCalcResult
  attacker:     PokemonSide
  defender:     PokemonSide
  move:         string
  weather:      string
  terrain:      string
  isGravity:    boolean
  atkBaseStats: BaseStats
  defBaseStats: BaseStats
}

export default function SpreadComparator({
  result: initialResult, attacker, defender, move, weather, terrain, isGravity, atkBaseStats, defBaseStats,
}: SpreadComparatorProps) {
  const [open,      setOpen]      = useState(false)
  const [focusSide, setFocusSide] = useState<'atk' | 'def'>('def')
  const [focusStat, setFocusStat] = useState<'def' | 'spd' | 'atk' | 'spa'>('def')
  const { t } = useLanguage()

  // Auto-select SpD when the move is Special, Def when Physical
  useEffect(() => {
    const isSpecial = initialResult.description.includes(' SpA ')
    setFocusStat(isSpecial ? 'spd' : 'def')
  }, [initialResult.description])

  const atkBoosts = onlyNonZero({
    atk: attacker.boostAtk, spa: attacker.boostSpa,
    def: attacker.boostDef, spd: attacker.boostSpd, spe: attacker.boostSpe,
  })
  const defBoosts = onlyNonZero({
    def: defender.boostDef, spd: defender.boostSpd,
    atk: defender.boostAtk, spa: defender.boostSpa, spe: defender.boostSpe,
  })

  const runAt = (sp: number): DamageCalcResult | null => {
    try {
      const atkSpread = { ...attacker.spSpread }
      const defSpread = { ...defender.spSpread }

      if (focusSide === 'atk') atkSpread[focusStat as 'atk' | 'spa'] = sp
      else defSpread[focusStat as 'def' | 'spd'] = sp

      const atkSideOpts = {
        isHelpingHand: attacker.isHelpingHand || undefined,
        isTailwind:    attacker.isTailwind    || undefined,
        isBattery:     attacker.isBattery     || undefined,
        isPowerSpot:   attacker.isPowerSpot   || undefined,
      }

      return runDamageCalc({
        attacker: {
          species:       toSmogonSpecies(attacker.entry!.pokeapiName),
          nature:        attacker.nature,
          spSpread:      atkSpread,
          ability:       attacker.ability   || undefined,
          item:          attacker.item      || undefined,
          megaBaseStats: attacker.selectedMega?.megaBaseStats,
          status:        attacker.status    || undefined,
          boosts:        Object.keys(atkBoosts).length ? atkBoosts : undefined,
        },
        defender: {
          species:          toSmogonSpecies(defender.entry!.pokeapiName),
          nature:           defender.nature,
          spSpread:         defSpread,
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
      })
    } catch {
      return null
    }
  }

  const atkStatOptions: { stat: 'atk' | 'spa'; label: string }[] = [
    { stat: 'atk', label: `Atk (base ${atkBaseStats.atk})` },
    { stat: 'spa', label: `SpA (base ${atkBaseStats.spa})` },
  ]
  const defStatOptions: { stat: 'def' | 'spd'; label: string }[] = [
    { stat: 'def', label: `Def (base ${defBaseStats.def})` },
    { stat: 'spd', label: `SpD (base ${defBaseStats.spd})` },
  ]

  const focusSideLabel = focusSide === 'atk' ? t('common.attacker') : t('common.defender')
  const focusStatLabel = focusStat === 'atk' ? 'Atk' : focusStat === 'spa' ? 'SpA' : focusStat === 'def' ? 'Def' : 'SpD'

  return (
    <div className="bg-champ-surface border border-champ-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-body text-champ-muted hover:text-white transition-colors"
      >
        <span className="font-semibold text-white">{t('comp.title')}</span>
        <span className="text-champ-muted text-xs">{open ? t('comp.hide') : t('comp.show')}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-champ-border/50">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="space-y-1">
              <p className="text-[10px] text-champ-muted font-body uppercase tracking-widest">{t('comp.vary')}</p>
              <div className="flex gap-1.5">
                <button type="button"
                  onClick={() => {
                    const isSpecial = initialResult.description.includes(' SpA ')
                    setFocusSide('atk')
                    setFocusStat(isSpecial ? 'spa' : 'atk')
                  }}
                  className={`text-xs px-2.5 py-1 rounded border font-body transition-colors ${focusSide==='atk' ? 'bg-red-500/20 border-red-400 text-red-400' : 'border-champ-border text-champ-muted hover:text-white'}`}>
                  {t('common.attacker')}
                </button>
                <button type="button"
                  onClick={() => {
                    const isSpecial = initialResult.description.includes(' SpA ')
                    setFocusSide('def')
                    setFocusStat(isSpecial ? 'spd' : 'def')
                  }}
                  className={`text-xs px-2.5 py-1 rounded border font-body transition-colors ${focusSide==='def' ? 'bg-blue-500/20 border-blue-400 text-blue-400' : 'border-champ-border text-champ-muted hover:text-white'}`}>
                  {t('common.defender')}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-champ-muted font-body uppercase tracking-widest">{t('comp.stat')}</p>
              <div className="flex gap-1.5">
                {(focusSide === 'atk' ? atkStatOptions : defStatOptions).map(({ stat, label }) => (
                  <button key={stat} type="button"
                    onClick={() => setFocusStat(stat)}
                    className={`text-xs px-2.5 py-1 rounded border font-body transition-colors ${focusStat===stat ? 'bg-champ-blue/20 border-champ-blue text-white' : 'border-champ-border text-champ-muted hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Varying indicator */}
          <p className="text-xs font-body text-champ-muted">
            {t('comp.varying')}{' '}
            <span className={`font-semibold ${focusSide === 'atk' ? 'text-red-400' : 'text-blue-400'}`}>
              {focusStatLabel} {t('comp.of')} {focusSideLabel}
            </span>
          </p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-champ-border/50">
                  <th className="text-left text-champ-muted font-body py-1.5 pr-4 font-normal uppercase tracking-widest text-[10px]">{t('calc.spCol')}</th>
                  <th className="text-left text-champ-muted font-body py-1.5 pr-4 font-normal uppercase tracking-widest text-[10px]">{t('calc.finalStat')}</th>
                  <th className="text-left text-champ-muted font-body py-1.5 pr-4 font-normal uppercase tracking-widest text-[10px]">{t('calc.dmgPct')}</th>
                  <th className="text-left text-champ-muted font-body py-1.5 font-normal uppercase tracking-widest text-[10px]">{t('calc.koCol')}</th>
                </tr>
              </thead>
              <tbody>
                {SP_STEPS.map(sp => {
                  const r = runAt(sp)
                  if (!r) return (
                    <tr key={sp} className="border-b border-champ-border/20">
                      <td className="py-1.5 pr-4 text-champ-muted">{sp}</td>
                      <td colSpan={3} className="py-1.5 text-champ-muted/50">—</td>
                    </tr>
                  )
                  const badge = getKOBadge(r.koChance)
                  const naturaleza = focusSide === 'atk' ? attacker.nature : defender.nature
                  const base = focusSide === 'atk'
                    ? (focusStat === 'atk' ? atkBaseStats.atk : atkBaseStats.spa)
                    : (focusStat === 'def' ? defBaseStats.def : defBaseStats.spd)
                  const natureMod = getNatureMods(naturaleza)[focusStat as keyof typeof atkBaseStats] ?? 1
                  const finalStat = calcFinalStat(focusStat as never, base, sp, natureMod)
                  const isCurrentSp = focusSide === 'atk'
                    ? attacker.spSpread[focusStat as 'atk' | 'spa'] === sp
                    : defender.spSpread[focusStat as 'def' | 'spd'] === sp

                  return (
                    <tr key={sp} className={`border-b border-champ-border/20 ${isCurrentSp ? 'bg-champ-blue/5' : ''}`}>
                      <td className={`py-1.5 pr-4 font-bold ${isCurrentSp ? 'text-champ-blue' : 'text-champ-muted'}`}>
                        {sp}{isCurrentSp ? ' ◀' : ''}
                      </td>
                      <td className="py-1.5 pr-4 text-white">{finalStat}</td>
                      <td className="py-1.5 pr-4 text-white">
                        {r.percentMin}–{r.percentMax}%
                      </td>
                      <td className={`py-1.5 text-[10px] font-bold ${
                        badge.color === 'green'  ? 'text-green-400' :
                        badge.color === 'yellow' ? 'text-champ-gold' : 'text-champ-muted'
                      }`}>
                        {badge.label}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
