'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { NormalizedPokemon } from '@/types/pokemon'
import type { MegaEvolution } from '@/types/champions'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { ChampionsUsageEntry } from '@/lib/champions-meta'
import TypeBadge from '@/components/pokedex/TypeBadge'
import { calcFinalStat } from '@/lib/sp-utils'
import type { StatID } from '@/types/pokemon'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  pokemon: NormalizedPokemon
  megas?: MegaEvolution[]
  entry: ChampionsPokemonEntry
  metaEntry?: ChampionsUsageEntry | null
}

const STAT_CONFIG: Record<string, { label: string; color: string }> = {
  hp:  { label: 'HP',  color: '#f87171' },
  atk: { label: 'Atk', color: '#fb923c' },
  def: { label: 'Def', color: '#facc15' },
  spa: { label: 'SpA', color: '#60a5fa' },
  spd: { label: 'SpD', color: '#4ade80' },
  spe: { label: 'Spe', color: '#f472b6' },
}

function DetailImage({ src, alt }: { src: string | null; alt: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <div className="w-40 h-40 flex items-center justify-center opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full fill-champ-muted">
          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" fill="none" />
          <path d="M2 50 Q2 2 50 2 Q98 2 98 50" fill="currentColor" opacity="0.6" />
          <rect x="2" y="47" width="96" height="6" fill="currentColor" />
          <circle cx="50" cy="50" r="12" fill="currentColor" />
          <circle cx="50" cy="50" r="7" fill="#1C2333" />
        </svg>
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={220}
      height={220}
      className="object-contain drop-shadow-2xl"
      unoptimized
      onError={() => setError(true)}
    />
  )
}

function StatRow({ stat, value, max = 255, color, base }: {
  stat: string; value: number; max?: number; color: string; base?: number
}) {
  const pct = Math.min(100, (value / max) * 100)
  const diff = base !== undefined ? value - base : null
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 text-xs font-semibold font-body text-right shrink-0" style={{ color }}>
        {STAT_CONFIG[stat]?.label ?? stat}
      </span>
      <span className="w-9 text-sm font-bold font-mono text-right shrink-0 text-white">
        {value}
      </span>
      <div className="flex-1 h-2 bg-champ-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {diff !== null && diff !== 0 && (
        <span className={`text-xs font-mono w-8 shrink-0 ${diff > 0 ? 'text-champ-success' : 'text-champ-danger'}`}>
          {diff > 0 ? '+' : ''}{diff}
        </span>
      )}
    </div>
  )
}

export default function PokemonDetail({ pokemon, megas = [], entry, metaEntry }: Props) {
  const { t } = useLanguage()
  const { types, baseStats, abilities, artwork, sprite, id, height, weight, totalBST } = pokemon
  const paddedId = String(id).padStart(4, '0')
  const imgSrc = artwork ?? sprite
  const displayTitle = entry.formLabel ? `${entry.displayName} (${entry.formLabel})` : entry.displayName

  return (
    <div className="bg-champ-surface border border-champ-border rounded-2xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-champ-border flex flex-wrap items-center gap-3">
        <span className="text-champ-muted font-mono text-sm shrink-0">#{paddedId}</span>
        <h1 className="font-display text-2xl font-bold text-white">{displayTitle}</h1>
        <div className="flex gap-1.5">
          {types.map((t) => <TypeBadge key={t} type={t} size="md" />)}
        </div>
        {metaEntry && (
          <span className="text-champ-muted font-body text-sm">
            {'Rank '}
            <span className="text-white font-semibold">#{metaEntry.rank}</span>
            {' · '}
            <span className="text-champ-blue-glow font-semibold">{(metaEntry.usage_rate * 100).toFixed(2)}%</span>
            {' '}{t('dex.usageLabel')}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {entry.hasMega && (
            <span className="text-xs font-semibold px-2 py-1 rounded bg-champ-gold/15 border border-champ-gold/50 text-champ-gold font-body">
              MEGA
            </span>
          )}
          <Link
            href={`/optimizador?pk=${entry.id}`}
            className="px-3 py-1.5 text-sm font-semibold bg-champ-elevated border border-champ-border text-champ-muted rounded-lg hover:text-white hover:border-champ-blue/50 transition-colors font-body whitespace-nowrap"
          >
            {t('dex.optimizeBtn')}
          </Link>
          <Link
            href={`/calculator?atacante=${entry.id}`}
            className="px-3 py-1.5 text-sm font-semibold bg-champ-gold/15 border border-champ-gold/50 text-champ-gold rounded-lg hover:bg-champ-gold/25 transition-colors font-body whitespace-nowrap"
          >
            {t('dex.calcBtn')}
          </Link>
        </div>
      </div>

      {/* ── Sprite + Stats base ── */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
        <div className="flex flex-col items-center justify-center gap-4 p-8 bg-champ-elevated/20 border-b md:border-b-0 md:border-r border-champ-border">
          <DetailImage src={imgSrc} alt={displayTitle} />
          <div className="text-xs text-champ-muted font-body flex gap-3">
            <span>{(height / 10).toFixed(1)} m</span>
            <span>·</span>
            <span>{(weight / 10).toFixed(1)} kg</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {abilities.map((a) => (
              <span key={a.name} className={`text-xs px-2 py-0.5 rounded font-body border ${
                a.isHidden
                  ? 'border-champ-gold/50 text-champ-gold bg-champ-gold/10'
                  : 'border-champ-border text-champ-muted bg-champ-elevated'
              }`}>
                {a.name}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Base stats */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body">{t('dex.statsBase')}</span>
              <span className="text-sm font-mono font-bold text-champ-gold">BST {totalBST}</span>
            </div>
            <div className="space-y-2.5">
              {(Object.entries(baseStats) as [string, number][]).map(([stat, val]) => (
                <StatRow
                  key={stat}
                  stat={stat}
                  value={val}
                  color={STAT_CONFIG[stat]?.color ?? '#60a5fa'}
                />
              ))}
            </div>
          </div>

          {/* Stats a nivel 50 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body">{t('dex.statsLv50')}</span>
              <div className="flex gap-2 text-[10px] font-body text-champ-muted">
                <span className="px-1.5 py-0.5 rounded border border-champ-border">0 SP</span>
                <span className="px-1.5 py-0.5 rounded border border-champ-gold/40 text-champ-gold">32 SP</span>
              </div>
            </div>
            <div className="space-y-2">
              {(Object.entries(baseStats) as [StatID, number][]).map(([stat, base]) => {
                const min = calcFinalStat(stat, base, 0,  1.0)
                const max = calcFinalStat(stat, base, 32, 1.0)
                return (
                  <div key={stat} className="flex items-center gap-2.5">
                    <span className="w-8 text-xs font-semibold font-body text-right shrink-0" style={{ color: STAT_CONFIG[stat]?.color }}>
                      {STAT_CONFIG[stat]?.label}
                    </span>
                    <span className="w-9 text-sm font-bold font-mono text-right shrink-0 text-champ-muted">{min}</span>
                    <div className="flex-1 h-1.5 bg-champ-elevated rounded-full overflow-hidden relative">
                      <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${(min / 400) * 100}%`, backgroundColor: STAT_CONFIG[stat]?.color }} />
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(max / 400) * 100}%`, backgroundColor: STAT_CONFIG[stat]?.color }} />
                    </div>
                    <span className="w-9 text-sm font-bold font-mono shrink-0 text-champ-gold">{max}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mega stats */}
          {megas.map((mega) => {
            const megaBST = Object.values(mega.megaBaseStats).reduce((a, b) => a + b, 0)
            return (
              <div key={mega.megaName}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-champ-gold uppercase tracking-widest font-body">
                      {mega.megaName}
                    </span>
                    <div className="flex gap-1">
                      {mega.megaTypes.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-champ-gold">BST {megaBST}</span>
                </div>
                <div className="space-y-2.5">
                  {(Object.entries(mega.megaBaseStats) as [string, number][]).map(([stat, val]) => (
                    <StatRow
                      key={stat}
                      stat={stat}
                      value={val}
                      color="#c9a24a"
                      base={baseStats[stat as keyof typeof baseStats]}
                    />
                  ))}
                </div>
              </div>
            )
          })}


        </div>
      </div>
    </div>
  )
}
