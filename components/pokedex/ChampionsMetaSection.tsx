'use client'

import Link from 'next/link'
import type { ChampionsUsageEntry } from '@/lib/champions-meta'
import type { EnrichedMove } from '@/lib/moves'
import TypeBadge from '@/components/pokedex/TypeBadge'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  data: ChampionsUsageEntry
  enrichedMoves: EnrichedMove[]
  megaData?: ChampionsUsageEntry | null
  megaName?: string
  enrichedMegaMoves?: EnrichedMove[]
  updatedAt: string
}

const CATEGORY_COLOR: Record<string, string> = {
  Physical: 'text-champ-danger',
  Special:  'text-champ-blue-glow',
  Status:   'text-champ-muted',
}

function UsageBar({ pct, color = 'bg-champ-blue' }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="flex-1 h-1.5 bg-champ-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-champ-muted w-11 text-right shrink-0">
        {(pct * 100).toFixed(1)}%
      </span>
    </div>
  )
}

function UsageRow({ name, usage, sprite }: { name: string; usage: number; sprite?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {sprite && (
        <img src={sprite} alt={name} width={24} height={24} className="object-contain shrink-0 w-6 h-6" />
      )}
      <span className="text-sm text-white font-body truncate w-32 shrink-0">{name}</span>
      <UsageBar pct={usage} />
    </div>
  )
}

function itemSprite(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/['.]/g, '')
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
}

function MoveCard({ move }: { move: EnrichedMove }) {
  const { t } = useLanguage()
  const catKey = move.category?.toLowerCase() as 'physical' | 'special' | 'status' | undefined
  return (
    <div className="bg-champ-elevated border border-champ-border rounded-xl p-3 flex flex-col gap-2 hover:border-champ-blue/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-white font-body leading-tight">{move.name}</span>
        <span className="text-sm font-bold font-mono text-champ-blue-glow shrink-0">
          {(move.usage * 100).toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {move.type && <TypeBadge type={move.type} size="sm" />}
        {catKey && (
          <span className={`text-xs font-body ${CATEGORY_COLOR[move.category!] ?? 'text-champ-muted'}`}>
            {t(`cat.${catKey}`)}
          </span>
        )}
        {move.power != null && (
          <span className="text-xs font-mono text-champ-gold ml-auto">{move.power} BP</span>
        )}
      </div>
    </div>
  )
}

function TeammateCard({ teammate }: { teammate: { id: number; name: string; usage: number } }) {
  const slug = teammate.name.toLowerCase().replace(/\s+/g, '-')
  return (
    <Link
      href={`/pokedex/${slug}`}
      className="flex flex-col items-center gap-2 p-4 bg-champ-elevated border border-champ-border rounded-xl hover:border-champ-blue/40 transition-colors min-w-[110px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${teammate.id}.png`}
        alt={teammate.name}
        width={96}
        height={96}
        className="object-contain"
      />
      <span className="text-sm text-white font-body text-center leading-tight">{teammate.name}</span>
      <span className="text-xs font-mono text-champ-muted">{(teammate.usage * 100).toFixed(1)}%</span>
    </Link>
  )
}

function MetaBlock({
  entry,
  moves,
  title,
  isGold = false,
}: {
  entry: ChampionsUsageEntry
  moves: EnrichedMove[]
  title: string
  isGold?: boolean
}) {
  const { t } = useLanguage()
  const headerColor = isGold ? 'text-champ-gold' : 'text-white'
  const border = isGold ? 'border-champ-gold/30' : 'border-champ-border'

  return (
    <div className={`bg-champ-surface border ${border} rounded-2xl overflow-hidden`}>
      <div className="px-6 py-4 border-b border-champ-border/60 flex items-center justify-between flex-wrap gap-2">
        <h2 className={`font-display text-xl font-bold ${headerColor}`}>{title}</h2>
        <span className="text-sm font-body text-champ-muted">
          {t('meta.rankUsage', { rank: String(entry.rank), pct: (entry.usage_rate * 100).toFixed(2) })}
        </span>
      </div>

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {entry.top_abilities.length > 0 && (
            <div>
              <p className="text-xs font-bold text-champ-muted uppercase tracking-widest mb-3 font-body">
                {t('meta.abilities')}
              </p>
              <div className="space-y-2">
                {entry.top_abilities.map((a) => <UsageRow key={a.name} name={a.name} usage={a.usage} />)}
              </div>
            </div>
          )}
          {entry.top_items.length > 0 && (
            <div>
              <p className="text-xs font-bold text-champ-muted uppercase tracking-widest mb-3 font-body">
                {t('meta.items')}
              </p>
              <div className="space-y-2">
                {entry.top_items.map((it) => (
                  <UsageRow key={it.name} name={it.name} usage={it.usage} sprite={itemSprite(it.name)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {moves.length > 0 && (
          <div>
            <p className="text-xs font-bold text-champ-muted uppercase tracking-widest mb-3 font-body">
              {t('meta.moves')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {moves.map((m) => <MoveCard key={m.name} move={m} />)}
            </div>
          </div>
        )}

        {entry.top_teammates.length > 0 && (
          <div>
            <p className="text-xs font-bold text-champ-muted uppercase tracking-widest mb-3 font-body">
              {t('dex.teammates')}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {entry.top_teammates.map((tm) => <TeammateCard key={tm.name} teammate={tm} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChampionsMetaSection({
  data, enrichedMoves, megaData, megaName, enrichedMegaMoves = [], updatedAt,
}: Props) {
  const { t, lang } = useLanguage()
  const locale = lang === 'es' ? 'es-ES' : 'en-US'
  const date = new Date(updatedAt).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-4">
      <MetaBlock entry={data} moves={enrichedMoves} title="Meta Champions" />
      {megaData && megaName && (
        <MetaBlock entry={megaData} moves={enrichedMegaMoves} title={`Meta — ${megaName}`} isGold />
      )}
      <p className="text-xs text-champ-muted font-body text-right">
        {t('meta.updatedAt', { date })}
      </p>
    </div>
  )
}
