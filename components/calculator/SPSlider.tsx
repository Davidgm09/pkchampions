'use client'

import { useState, useCallback } from 'react'
import type { SPSpread } from '@/types/champions'
import { SP_TOTAL, SP_MAX_PER_STAT, remainingSP, isValidSpread } from '@/types/champions'
import type { BaseStats, StatID } from '@/types/pokemon'
import { calcFinalStat, getNatureMods } from '@/lib/sp-utils'
import { useLanguage } from '@/contexts/LanguageContext'

const STATS: { id: StatID; label: string; color: string }[] = [
  { id: 'hp',  label: 'HP',  color: 'accent-champ-success' },
  { id: 'atk', label: 'Atk', color: 'accent-champ-danger' },
  { id: 'def', label: 'Def', color: 'accent-champ-blue' },
  { id: 'spa', label: 'SpA', color: 'accent-type-psychic' },
  { id: 'spd', label: 'SpD', color: 'accent-champ-blue' },
  { id: 'spe', label: 'Spe', color: 'accent-type-electric' },
]

const STAT_BAR_COLORS: Record<StatID, string> = {
  hp:  'bg-champ-success',
  atk: 'bg-champ-danger',
  def: 'bg-champ-blue',
  spa: 'bg-type-psychic',
  spd: 'bg-type-ice',
  spe: 'bg-type-electric',
}

interface SPSliderProps {
  baseStats: BaseStats
  nature?: string
  initialSpread?: SPSpread
  onChange?: (spread: SPSpread) => void
}

const DEFAULT_SPREAD: SPSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

export default function SPSlider({
  baseStats,
  nature = 'Hardy',
  initialSpread = DEFAULT_SPREAD,
  onChange,
}: SPSliderProps) {
  const [spread, setSpread] = useState<SPSpread>(initialSpread)
  const { t } = useLanguage()
  const natureMods = getNatureMods(nature)

  const remaining = remainingSP(spread)
  const valid = isValidSpread(spread)

  const handleChange = useCallback(
    (stat: StatID, raw: number) => {
      const newVal = Math.max(0, Math.min(SP_MAX_PER_STAT, raw))
      const next = { ...spread, [stat]: newVal }
      const total = Object.values(next).reduce((a, b) => a + b, 0)
      if (total > SP_TOTAL) return
      setSpread(next)
      onChange?.(next)
    },
    [spread, onChange]
  )

  const handleReset = () => {
    const empty = DEFAULT_SPREAD
    setSpread(empty)
    onChange?.(empty)
  }

  const usedPct = ((SP_TOTAL - remaining) / SP_TOTAL) * 100

  return (
    <div className="bg-champ-surface border border-champ-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-white">{t('calc.spreadSP')}</h3>
        <button
          onClick={handleReset}
          className="text-xs text-champ-muted hover:text-white font-body transition-colors"
        >
          {t('common.reset')}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-body">
          <span className={remaining === 0 ? 'text-champ-gold font-bold' : 'text-champ-muted'}>
            {t('calc.spUsed', { used: String(SP_TOTAL - remaining), total: String(SP_TOTAL) })}
          </span>
          <span className={remaining > 0 ? 'text-champ-success' : 'text-champ-muted'}>
            {t('calc.spRemaining', { remaining: String(remaining) })}
          </span>
        </div>
        <div className="h-2 bg-champ-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              remaining === 0 ? 'bg-champ-gold' : 'bg-champ-blue'
            }`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {STATS.map(({ id, label, color }) => {
          const sp = spread[id]
          const finalStat = calcFinalStat(id, baseStats[id], sp, natureMods[id])
          const maxForStat = SP_MAX_PER_STAT
          const natureMod = natureMods[id]
          const isNeutral = natureMod === 1
          const isBoosted = natureMod > 1
          const isReduced = natureMod < 1

          return (
            <div key={id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold font-body w-7 ${
                      isBoosted ? 'text-champ-success' : isReduced ? 'text-champ-danger' : 'text-champ-muted'
                    }`}
                  >
                    {label}
                    {isBoosted && ' ▲'}
                    {isReduced && ' ▼'}
                  </span>
                  <span className="text-xs text-champ-muted font-body">
                    Base&nbsp;{baseStats[id]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleChange(id, sp - 1)}
                      disabled={sp === 0}
                      className="w-5 h-5 rounded bg-champ-elevated border border-champ-border text-champ-muted hover:text-white hover:border-champ-blue disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-white font-mono w-5 text-center">
                      {sp}
                    </span>
                    <button
                      onClick={() => handleChange(id, sp + 1)}
                      disabled={sp >= maxForStat || remaining === 0}
                      className="w-5 h-5 rounded bg-champ-elevated border border-champ-border text-champ-muted hover:text-white hover:border-champ-blue disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-bold text-white font-mono w-10 text-right">
                    {finalStat}
                  </span>
                </div>
              </div>

              <div className="relative h-1.5 bg-champ-border rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-150 ${STAT_BAR_COLORS[id]}`}
                  style={{ width: `${(sp / SP_MAX_PER_STAT) * 100}%` }}
                />
              </div>

              <input
                type="range"
                min={0}
                max={maxForStat}
                value={sp}
                onChange={(e) => handleChange(id, parseInt(e.target.value))}
                className={`w-full h-1 appearance-none bg-transparent cursor-pointer ${color} [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-current [&::-webkit-slider-thumb]:bg-champ-bg -mt-2.5`}
                style={{ marginTop: '-8px' }}
              />
            </div>
          )
        })}
      </div>

      {!valid && (
        <p className="text-champ-danger text-xs font-body text-center">
          {t('calc.invalid')}
        </p>
      )}
    </div>
  )
}
