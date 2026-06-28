'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { TeamSlot } from '@/types/team'
import { emptySlot } from '@/types/team'
import type { NatureName } from '@/types/champions'
import { SP_TOTAL, SP_MAX_PER_STAT, remainingSP } from '@/types/champions'
import type { StatID } from '@/types/pokemon'
import { calcFinalStat, getNatureMods, spSpreadToEVs } from '@/lib/sp-utils'
import { getBaseStats } from '@/lib/base-stats'
import { MEGA_EVOLUTIONS } from '@/data/mega-stones'
import { getCachedSprite, fetchSprite } from '@/lib/sprite-cache'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import { CHAMPIONS_ROSTER, ROSTER_BY_ID } from '@/data/regulation-mb'
import { teamDefensiveCoverage, ALL_TYPES } from '@/lib/type-chart'
import PokemonPicker from '@/components/calculator/PokemonPicker'
import MoveInput from '@/components/optimizer/MoveInput'
import AbilityInput from '@/components/team/AbilityInput'
import ItemInput from '@/components/team/ItemInput'
import { useLanguage } from '@/contexts/LanguageContext'
import { natureLabel } from '@/lib/nature-names'

// ─── Constants ───────────────────────────────────────────────────────────────

const NATURES: NatureName[] = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky',
]

const STAT_IDS: StatID[] = ['hp','atk','def','spa','spd','spe']
const STAT_LABELS: Record<StatID, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' }
const STAT_BAR: Record<StatID, string> = {
  hp: 'bg-champ-success',
  atk: 'bg-champ-danger',
  def: 'bg-champ-blue',
  spa: 'bg-type-psychic',
  spd: 'bg-type-ice',
  spe: 'bg-type-electric',
}

const STORAGE_KEY      = 'pkchampions-team'
const STORAGE_NAME_KEY = 'pkchampions-team-name'

// ─── Type colours ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-[#929da3]', Fire: 'bg-[#ff9d54]', Water: 'bg-[#4d90d5]',
  Electric: 'bg-[#f3d23b]', Grass: 'bg-[#63bc5a]', Ice: 'bg-[#74cec0]',
  Fighting: 'bg-[#ce406a]', Poison: 'bg-[#ab6ac8]', Ground: 'bg-[#d97845]',
  Flying: 'bg-[#8fa8dd]', Psychic: 'bg-[#f97176]', Bug: 'bg-[#90c12c]',
  Rock: 'bg-[#c5b78c]', Ghost: 'bg-[#5269ac]', Dragon: 'bg-[#0a6dc4]',
  Dark: 'bg-[#595761]', Steel: 'bg-[#5a8ea2]', Fairy: 'bg-[#ec8fe6]',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slotLabel(entry: ChampionsPokemonEntry | null, emptyLabel: string): string {
  if (!entry) return emptyLabel
  return entry.formLabel ? `${entry.displayName} (${entry.formLabel})` : entry.displayName
}

function toShowdownName(displayName: string): string {
  return displayName
    .replace(/\s*\(M\)\s*$/, '')
    .replace(/\s*\(F\)\s*$/, '-F')
    .replace(/\s*\(([^)]+)\)\s*$/, '-$1')
}

function generateShowdownPaste(slots: TeamSlot[]): string {
  const blocks: string[] = []
  for (const slot of slots) {
    if (!slot.entry) continue
    const name = toShowdownName(slot.entry.displayName)
    const item = slot.item || (slot.mega ? 'Omni Ring' : '')
    const lines: string[] = []
    lines.push(item ? `${name} @ ${item}` : name)
    if (slot.ability) lines.push(`Ability: ${slot.ability}`)
    lines.push('Level: 50')
    const evs = spSpreadToEVs(slot.spSpread)
    const evParts = (
      [['hp','HP'],['atk','Atk'],['def','Def'],['spa','SpA'],['spd','SpD'],['spe','Spe']] as const
    ).filter(([k]) => evs[k] > 0).map(([k, label]) => `${evs[k]} ${label}`)
    if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`)
    lines.push(`${slot.nature} Nature`)
    slot.moves.forEach(m => { if (m.trim()) lines.push(`- ${m}`) })
    blocks.push(lines.join('\n'))
  }
  return blocks.join('\n\n')
}


function usedSP(spread: TeamSlot['spSpread']): number {
  return STAT_IDS.reduce((s, k) => s + spread[k], 0)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Small components ─────────────────────────────────────────────────────────

function TypePill({ type, count }: { type: string; count?: number }) {
  const { t } = useLanguage()
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white font-body ${
      TYPE_COLORS[type] ?? 'bg-champ-border'
    }`}>
      {t('type.' + type.toLowerCase())}
      {count !== undefined && count > 1 && <span className="text-white/70">×{count}</span>}
    </span>
  )
}

function SlotCard({
  slot, index, active, onClick, onClear, emptyLabel,
}: { slot: TeamSlot; index: number; active: boolean; onClick: () => void; onClear: () => void; emptyLabel: string }) {
  const label = slotLabel(slot.entry, emptyLabel)
  const { lang } = useLanguage()
  const [asyncSprite, setAsyncSprite] = useState<string | null>(null)

  useEffect(() => {
    if (!slot.entry) { setAsyncSprite(null); return }
    const cached = getCachedSprite(slot.entry.pokeapiName)
    if (cached) return
    fetchSprite(slot.entry.pokeapiName).then(url => { if (url) setAsyncSprite(url) })
  }, [slot.entry?.pokeapiName])

  const sprite = slot.entry
    ? (getCachedSprite(slot.entry.pokeapiName) ?? asyncSprite)
    : null
  const sp = usedSP(slot.spSpread)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className={`relative w-full text-left rounded-xl border transition-all duration-150 p-3 cursor-pointer ${
        active
          ? 'border-champ-blue bg-champ-blue/10'
          : slot.entry
          ? 'border-champ-border bg-champ-elevated hover:border-champ-blue/50'
          : 'border-dashed border-champ-border bg-champ-elevated/20 hover:border-champ-blue/40 hover:bg-champ-elevated/40'
      }`}
    >
      {slot.entry && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onClear() }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-champ-muted hover:text-white hover:bg-champ-danger/20 hover:border-champ-danger/40 border border-transparent transition-colors text-xs leading-none"
          aria-label="Eliminar"
        >
          ✕
        </button>
      )}

      {slot.entry ? (
        <div className="flex items-center gap-2.5 pr-5">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center">
            {sprite ? (
              <img src={sprite} alt="" width={40} height={40} className="object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-champ-border text-champ-muted flex items-center justify-center font-display font-bold text-sm">
                {index + 1}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold font-body truncate text-white">{label}</span>
              {slot.mega && (
                <span className="text-[9px] font-bold text-champ-gold bg-champ-gold/10 px-1 py-0.5 rounded font-body shrink-0">MEGA</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] text-champ-muted font-body">{natureLabel(slot.nature, lang)}</span>
              <span className="text-champ-border">·</span>
              <div className="h-1 flex-1 bg-champ-border rounded-full overflow-hidden max-w-15">
                <div className="h-full bg-champ-blue rounded-full transition-all" style={{ width: `${(sp / SP_TOTAL) * 100}%` }} />
              </div>
              <span className="text-[10px] text-champ-muted font-mono">{sp}/{SP_TOTAL}</span>
            </div>
            {slot.moves.some(Boolean) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {slot.moves.filter(Boolean).map((m, i) => (
                  <span key={i} className="text-[9px] text-champ-muted font-body bg-champ-surface px-1 py-0.5 rounded truncate max-w-17.5">{m}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 py-3 min-h-18">
          <span className={`text-xl font-display font-bold ${active ? 'text-champ-blue' : 'text-champ-border'}`}>+</span>
          <span className={`text-xs font-body ${active ? 'text-champ-blue' : 'text-champ-muted/50'}`}>Slot {index + 1}</span>
        </div>
      )}
    </div>
  )
}

interface SPRowProps {
  stat: StatID; base: number; sp: number; natureMod: number; remaining: number
  onChange: (sp: number) => void
}

function SPRow({ stat, base, sp, natureMod, remaining, onChange }: SPRowProps) {
  const finalStat = calcFinalStat(stat, base, sp, natureMod)
  const isBoosted = natureMod > 1
  const isReduced = natureMod < 1

  const clamp = (raw: number) => {
    const next = Math.max(0, Math.min(SP_MAX_PER_STAT, raw))
    if (next > sp && remaining <= 0) return
    onChange(next)
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`w-8 text-xs font-semibold font-body text-right shrink-0 ${
        isBoosted ? 'text-champ-success' : isReduced ? 'text-champ-danger' : 'text-champ-muted'
      }`}>
        {STAT_LABELS[stat]}{isBoosted && '▲'}{isReduced && '▼'}
      </span>
      <span className="w-7 text-xs text-champ-muted font-body text-right shrink-0">{base}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => clamp(sp - 1)} disabled={sp === 0}
          className="w-5 h-5 rounded bg-champ-surface border border-champ-border text-champ-muted hover:text-white hover:border-champ-blue disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors flex items-center justify-center">
          −
        </button>
        <span className="text-sm font-bold text-white font-mono w-5 text-center">{sp}</span>
        <button type="button" onClick={() => clamp(sp + 1)} disabled={sp >= SP_MAX_PER_STAT || remaining <= 0}
          className="w-5 h-5 rounded bg-champ-surface border border-champ-border text-champ-muted hover:text-white hover:border-champ-blue disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors flex items-center justify-center">
          +
        </button>
      </div>
      <div className="flex-1 h-1.5 bg-champ-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${STAT_BAR[stat]}`}
          style={{ width: `${(sp / SP_MAX_PER_STAT) * 100}%` }} />
      </div>
      <span className="w-9 text-sm font-bold text-white font-mono text-right shrink-0">{finalStat}</span>
    </div>
  )
}

// ─── Analysis panels ──────────────────────────────────────────────────────────

interface SpeedEntry { name: string; spe: number; nature: NatureName; sp: number }

function SpeedTierPanel({ entries }: { entries: SpeedEntry[] }) {
  const { t } = useLanguage()
  const sorted = [...entries].sort((a, b) => b.spe - a.spe)
  return (
    <div>
      <h3 className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body mb-3">
        {t('team.speedTier')}
      </h3>
      {sorted.length === 0 ? (
        <p className="text-champ-muted text-sm font-body">{t('team.addPokemon')}</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((e, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-champ-muted font-mono w-4 shrink-0 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-body truncate block">{e.name}</span>
                <span className="text-[10px] text-champ-muted font-body">
                  {e.nature}{e.sp > 0 ? ` · ${t('team.speedSP', { sp: String(e.sp) })}` : ''}
                </span>
              </div>
              <span className="text-xl font-bold font-mono text-white shrink-0">{e.spe}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TypeCoveragePanel({ teamTypes, stabTypes }: { teamTypes: string[][]; stabTypes: string[] }) {
  const { t } = useLanguage()
  const coverage = useMemo(() => teamDefensiveCoverage(teamTypes), [teamTypes])

  const x4Types   = ALL_TYPES.filter(tp => coverage.x4Count[tp] > 0)
    .sort((a, b) => coverage.x4Count[b] - coverage.x4Count[a])
  const weakTypes = ALL_TYPES.filter(tp => coverage.weakCount[tp] > 0)
    .sort((a, b) => coverage.weakCount[b] - coverage.weakCount[a])
  const immuneTypes = ALL_TYPES.filter(tp => coverage.immuneCount[tp] > 0)

  const hasWeaknesses = x4Types.length > 0 || weakTypes.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body mb-3">
          {t('team.teamWeaknesses')}
        </h3>
        {teamTypes.length === 0 ? (
          <p className="text-champ-muted text-sm font-body">{t('team.addForAnalysis')}</p>
        ) : !hasWeaknesses ? (
          <p className="text-champ-muted text-sm font-body">{t('team.noCommonWeak')}</p>
        ) : (
          <div className="space-y-2">
            {x4Types.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 shrink-0">×4</span>
                {x4Types.map(tp => (
                  <TypePill key={tp} type={tp} count={coverage.x4Count[tp]} />
                ))}
              </div>
            )}
            {weakTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/80 border border-red-500/20 shrink-0">×2</span>
                {weakTypes.map(tp => (
                  <TypePill key={tp} type={tp} count={coverage.weakCount[tp]} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {immuneTypes.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body mb-3">
            {t('team.immunities')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {immuneTypes.map(tp => (
              <TypePill key={tp} type={tp} count={coverage.immuneCount[tp]} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body mb-3">
          {t('team.stabTypes')}
        </h3>
        {stabTypes.length === 0 ? (
          <p className="text-champ-muted text-sm font-body">{t('team.addPokemon')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {stabTypes.map(tp => <TypePill key={tp} type={tp} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Showdown import ─────────────────────────────────────────────────────────

function evToSP(ev: number): number {
  return Math.min(32, Math.max(0, Math.round(ev * 66 / 512)))
}

// Build a name → entry lookup once at module level
const DISPLAY_MAP = new Map<string, ChampionsPokemonEntry>()
for (const entry of CHAMPIONS_ROSTER) {
  // By pokeapiName (exact PokéAPI id)
  DISPLAY_MAP.set(entry.pokeapiName, entry)
  // By displayName (first match wins, covers the base form)
  const key = entry.displayName.toLowerCase()
  if (!DISPLAY_MAP.has(key)) DISPLAY_MAP.set(key, entry)
}

function importShowdownPaste(paste: string): { slots: TeamSlot[]; unrecognized: string[] } {
  const slots: TeamSlot[] = []
  const unrecognized: string[] = []

  for (const block of paste.trim().split(/\n\s*\n/)) {
    if (slots.length >= 6) break
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    // First line: "Name @ Item" or "Nickname (Species) @ Item"
    let first = lines[0]
    let item = ''
    if (first.includes(' @ ')) {
      const idx = first.indexOf(' @ ')
      item = first.slice(idx + 3).trim()
      first = first.slice(0, idx).trim()
    }
    // "Nickname (Species)" → use species
    const nicknameMatch = first.match(/\(([^)]+)\)\s*$/)
    const pokemonName = (nicknameMatch && !['M', 'F'].includes(nicknameMatch[1]))
      ? nicknameMatch[1].trim()
      : first.replace(/\s*\([MF]\)\s*$/, '').trim()

    // Normalise: "Garchomp-Mega" → "garchomp-mega", "Basculegion-M" → "basculegion-m"
    const normalised = pokemonName.toLowerCase().replace(/'/g, '').replace(/\s+/g, '-')
    const entry = ROSTER_BY_ID.get(normalised)
      ?? DISPLAY_MAP.get(normalised)
      ?? DISPLAY_MAP.get(pokemonName.toLowerCase())

    if (!entry) { unrecognized.push(pokemonName); continue }

    const slot = emptySlot()
    slot.entry = entry
    const moves: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('Ability:')) {
        slot.ability = line.slice(8).trim()
      } else if (line.startsWith('EVs:')) {
        const MAP: Record<string, keyof typeof slot.spSpread> = {
          HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe',
        }
        for (const part of line.slice(4).split('/')) {
          const [n, k] = part.trim().split(/\s+/)
          const key = MAP[k]
          if (key) slot.spSpread[key] = evToSP(parseInt(n) || 0)
        }
      } else if (line.endsWith(' Nature')) {
        const n = line.replace(' Nature', '').trim() as NatureName
        if (NATURES.includes(n)) slot.nature = n
      } else if (line.startsWith('- ') && moves.length < 4) {
        moves.push(line.slice(2).trim())
      }
    }

    slot.item = item
    slot.moves = [moves[0] ?? '', moves[1] ?? '', moves[2] ?? '', moves[3] ?? '']

    // Auto-set mega if Omni Ring and only one mega variant
    if (item === 'Omni Ring' && entry.hasMega) {
      const base = entry.pokeapiName.split('-')[0]
      const megas = MEGA_EVOLUTIONS.filter(m => m.baseName.toLowerCase() === base)
      if (megas.length === 1) slot.mega = megas[0]
    }

    slots.push(slot)
  }

  return { slots, unrecognized }
}

// ─── URL share encoding ───────────────────────────────────────────────────────

function encodeTeamToURL(name: string, slots: TeamSlot[]): string {
  const data = {
    n: name,
    s: slots.map(s => s.entry ? [
      s.entry.pokeapiName,
      s.nature,
      [s.spSpread.hp, s.spSpread.atk, s.spSpread.def, s.spSpread.spa, s.spSpread.spd, s.spSpread.spe],
      s.ability,
      s.item,
      s.mega?.megaName ?? '',
      s.moves,
    ] : null),
  }
  const b64 = btoa(JSON.stringify(data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${window.location.origin}/equipo?team=${b64}`
}

function decodeTeamFromURL(encoded: string): { name: string; slots: TeamSlot[] } | null {
  try {
    const pad = encoded.length % 4
    const padded = pad ? encoded + '='.repeat(4 - pad) : encoded
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    const data = JSON.parse(json) as { n: string; s: (unknown[] | null)[] }
    const slots: TeamSlot[] = data.s.map(s => {
      if (!s || !Array.isArray(s)) return emptySlot()
      const [pokeapiName, nature, sp, ability, item, megaName, moves] =
        s as [string, string, number[], string, string, string, string[]]
      const entry = ROSTER_BY_ID.get(pokeapiName) ?? null
      if (!entry) return emptySlot()
      const mega = megaName ? (MEGA_EVOLUTIONS.find(m => m.megaName === megaName) ?? null) : null
      return {
        entry,
        nature: nature as NatureName,
        spSpread: { hp: sp[0] ?? 0, atk: sp[1] ?? 0, def: sp[2] ?? 0, spa: sp[3] ?? 0, spd: sp[4] ?? 0, spe: sp[5] ?? 0 },
        ability: ability ?? '',
        item: item ?? '',
        mega,
        moves: [moves[0] ?? '', moves[1] ?? '', moves[2] ?? '', moves[3] ?? ''] as [string, string, string, string],
      }
    })
    while (slots.length < 6) slots.push(emptySlot())
    return { name: data.n ?? '', slots: slots.slice(0, 6) }
  } catch {
    return null
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_SLOTS: TeamSlot[] = Array.from({ length: 6 }, emptySlot)

function loadFromStorage(): TeamSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SLOTS
    const parsed = JSON.parse(raw) as TeamSlot[]
    if (!Array.isArray(parsed) || parsed.length !== 6) return DEFAULT_SLOTS
    return parsed
  } catch {
    return DEFAULT_SLOTS
  }
}

export default function TeamBuilder() {
  const { t, lang } = useLanguage()
  const [slots, setSlots] = useState<TeamSlot[]>(DEFAULT_SLOTS)
  const [teamName, setTeamName] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  const [hydrated, setHydrated] = useState(false)
  const [confirmReset,  setConfirmReset]  = useState(false)
  const [shareCopied,   setShareCopied]   = useState(false)
  const [exportCopied,  setExportCopied]  = useState(false)
  const [importOpen,    setImportOpen]    = useState(false)
  const [importText,    setImportText]    = useState('')
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [sharedTeam,    setSharedTeam]    = useState<{ name: string; slots: TeamSlot[] } | null>(null)
  const [typeCache, setTypeCache] = useState<Record<string, string[]>>({})
  const [extraSprites, setExtraSprites] = useState<Record<string, string>>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('team')
    if (encoded) {
      const decoded = decodeTeamFromURL(encoded)
      if (decoded) setSharedTeam(decoded)
      // Remove param from URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('team')
      window.history.replaceState(null, '', url.toString())
    }
    setSlots(loadFromStorage())
    setTeamName(localStorage.getItem(STORAGE_NAME_KEY) ?? t('team.defaultName'))
    setHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slots)) } catch { /* ignore */ }
  }, [slots, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_NAME_KEY, teamName) } catch { /* ignore */ }
  }, [teamName, hydrated])

  // Fetch sprites for slot entries not in meta
  useEffect(() => {
    slots.forEach(s => {
      if (!s.entry) return
      const cached = getCachedSprite(s.entry.pokeapiName)
      if (cached || extraSprites[s.entry.pokeapiName]) return
      fetchSprite(s.entry.pokeapiName).then(url => {
        if (url) setExtraSprites(prev => ({ ...prev, [s.entry!.pokeapiName]: url }))
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.map(s => s.entry?.pokeapiName).join('|')])

  // Fetch types from PokéAPI for each slot's entry (cached by pokeapiName)
  useEffect(() => {
    const toFetch = slots
      .filter(s => s.entry && !typeCache[s.entry.pokeapiName])
      .map(s => s.entry!)
    if (toFetch.length === 0) return
    for (const entry of toFetch) {
      fetch(`https://pokeapi.co/api/v2/pokemon/${entry.pokeapiName}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((data: { types: Array<{ type: { name: string } }> }) => {
          const types = data.types.map(tp => capitalize(tp.type.name))
          setTypeCache(prev => ({ ...prev, [entry.pokeapiName]: types }))
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.map(s => s.entry?.pokeapiName).join('|')])

  const updateSlot = useCallback((index: number, patch: Partial<TeamSlot>) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s))
  }, [])

  const clearSlot = useCallback((index: number) => {
    setSlots(prev => prev.map((s, i) => i === index ? emptySlot() : s))
  }, [])

  const slot = slots[selectedSlot]
  const baseStats = slot.entry ? getBaseStats(slot.entry.pokeapiName) : null
  const activeBaseStats = slot.mega ? slot.mega.megaBaseStats : baseStats
  const natureMods = getNatureMods(slot.nature)
  const remaining = remainingSP(slot.spSpread)
  const sp = usedSP(slot.spSpread)

  const availableMegas = slot.entry?.hasMega
    ? MEGA_EVOLUTIONS.filter(m => {
        const basePart = slot.entry!.pokeapiName.split('-')[0]
        return m.baseName.toLowerCase() === basePart
      })
    : []

  const teamTypes = useMemo<string[][]>(() =>
    slots
      .filter(s => s.entry !== null)
      .map(s => {
        if (!s.entry) return []
        if (s.mega) return s.mega.megaTypes
        return typeCache[s.entry.pokeapiName] ?? []
      })
  , [slots, typeCache])

  const stabTypes = useMemo<string[]>(() => {
    const seen = new Set<string>()
    teamTypes.forEach(types => types.forEach(tp => seen.add(tp)))
    return [...seen]
  }, [teamTypes])

  const speedEntries = useMemo<SpeedEntry[]>(() =>
    slots
      .filter(s => s.entry !== null)
      .map(s => {
        const bs = s.mega ? s.mega.megaBaseStats : getBaseStats(s.entry!.pokeapiName)
        const mods = getNatureMods(s.nature)
        const spe = bs ? calcFinalStat('spe', bs.spe, s.spSpread.spe, mods.spe) : 0
        return { name: slotLabel(s.entry, t('common.empty')), spe, nature: s.nature, sp: s.spSpread.spe }
      })
  , [slots, t])

  const activeSlots = slots.filter(s => s.entry !== null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-4xl font-bold text-white">{t('team.title')}</h1>
            </div>
            <p className="text-champ-muted font-body text-sm mt-1">
              {t('team.regInfo', { count: String(activeSlots.length) })}
              {activeSlots.length > 0 && ' ' + t('team.totalSP', { sp: String(activeSlots.reduce((acc, s) => acc + usedSP(s.spSpread), 0)) })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Import from Showdown */}
            <button
              type="button"
              onClick={() => { setImportOpen(true); setImportWarning(null) }}
              className="px-3 py-1.5 text-sm font-semibold border border-champ-border text-champ-muted rounded-lg hover:text-white hover:border-champ-gold/50 transition-colors font-body"
            >
              {t('team.importShowdown')}
            </button>

            {/* Share link */}
            {activeSlots.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const url = encodeTeamToURL(teamName, slots)
                  navigator.clipboard.writeText(url).then(() => {
                    setShareCopied(true)
                    setTimeout(() => setShareCopied(false), 2500)
                  })
                }}
                className="px-3 py-1.5 text-sm font-semibold border border-champ-gold/40 text-champ-gold rounded-lg hover:bg-champ-gold/10 transition-colors font-body"
              >
                {shareCopied ? '✓ Enlace copiado' : '⎘ Compartir equipo'}
              </button>
            )}

            {/* Export to Showdown */}
            {activeSlots.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const paste = generateShowdownPaste(slots)
                  navigator.clipboard.writeText(paste).then(() => {
                    setExportCopied(true)
                    setTimeout(() => setExportCopied(false), 2000)
                  })
                }}
                className="px-3 py-1.5 text-sm font-semibold border border-champ-blue/40 text-champ-blue rounded-lg hover:bg-champ-blue/10 transition-colors font-body"
              >
                {exportCopied ? t('team.exportCopied') : t('team.exportShowdown')}
              </button>
            )}

          {/* Reset with confirmation */}
          {confirmReset ? (
            <div className="flex items-center gap-2 bg-champ-elevated border border-champ-danger/40 rounded-lg px-3 py-2">
              <span className="text-xs text-champ-muted font-body">{t('team.confirmReset')}</span>
              <button
                type="button"
                onClick={() => { setSlots(Array.from({ length: 6 }, emptySlot)); setSelectedSlot(0); setConfirmReset(false) }}
                className="text-xs font-semibold text-champ-danger font-body hover:text-red-400 transition-colors"
              >
                {t('team.confirmYes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-xs text-champ-muted font-body hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3 py-1.5 text-sm font-semibold border border-champ-border text-champ-muted rounded-lg hover:text-white hover:border-champ-border/80 transition-colors font-body"
            >
              {t('team.resetTeam')}
            </button>
          )}
          </div>
        </div>

        {/* Team name */}
        <div className="flex items-center gap-2 max-w-sm">
          <input
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            maxLength={40}
            placeholder={t('team.namePlaceholder')}
            className="flex-1 bg-champ-elevated border border-champ-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-blue transition-colors"
          />
        </div>
      </div>

      {/* Shared team banner */}
      {sharedTeam && (
        <div className="flex items-center gap-3 bg-champ-gold/10 border border-champ-gold/40 rounded-xl px-4 py-3">
          <span className="text-champ-gold text-lg">⎘</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white font-body">
              {lang === 'es' ? 'Equipo compartido' : 'Shared team'}
              {sharedTeam.name && <span className="text-champ-gold"> · {sharedTeam.name}</span>}
            </p>
            <p className="text-xs text-champ-muted font-body">
              {lang === 'es' ? 'Esto reemplazará tu equipo guardado.' : 'This will replace your saved team.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSlots(sharedTeam.slots)
              setTeamName(sharedTeam.name || t('team.defaultName'))
              setSelectedSlot(0)
              setSharedTeam(null)
            }}
            className="px-3 py-1.5 text-sm font-semibold bg-champ-gold text-black rounded-lg hover:bg-champ-gold/90 transition-colors font-body shrink-0"
          >
            {lang === 'es' ? 'Cargar equipo' : 'Load team'}
          </button>
          <button
            type="button"
            onClick={() => setSharedTeam(null)}
            className="text-champ-muted hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Team selector */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-champ-blue/10 border border-champ-blue/40 text-sm font-semibold text-white font-body"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-champ-blue" />
          {teamName || t('team.defaultName')}
        </button>
        <button
          type="button"
          disabled
          title="Disponible en PkChampions Pro"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-champ-border text-sm text-champ-muted/50 font-body cursor-not-allowed select-none"
        >
          <span className="text-base leading-none">+</span>
          {lang === 'es' ? 'Nuevo equipo' : 'New team'}
          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-champ-gold/20 text-champ-gold font-body leading-none">PRO</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: slots grid + editor */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((s, i) => (
              <SlotCard
                key={i}
                slot={s}
                index={i}
                active={selectedSlot === i}
                onClick={() => setSelectedSlot(i)}
                onClear={() => clearSlot(i)}
                emptyLabel={t('common.empty')}
              />
            ))}
          </div>

          {/* Edit panel */}
          <div className="bg-champ-surface border border-champ-border rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">
                {t('team.slotN', { n: String(selectedSlot + 1) })}
              </h2>
              {slot.entry && (
                <button type="button" onClick={() => clearSlot(selectedSlot)}
                  className="text-xs text-champ-muted hover:text-champ-danger transition-colors font-body">
                  {t('team.clearSlot')}
                </button>
              )}
            </div>

            <PokemonPicker
              value={slot.entry}
              onChange={(entry) => updateSlot(selectedSlot, { entry, mega: null, ability: '', moves: ['', '', '', ''] })}
            />

            {!slot.entry && (
              <div className="border border-dashed border-champ-border rounded-xl p-6 text-center space-y-2">
                <div className="text-3xl opacity-20">◈</div>
                <p className="text-champ-muted text-sm font-body">
                  {t('team.emptyHint')}
                </p>
                <p className="text-champ-muted/50 text-xs font-body">
                  {t('team.emptyCount', { count: String(slots.filter(s => !s.entry).length) })}
                </p>
              </div>
            )}

            {slot.entry && (
              <>
                {/* Nature + Mega */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-champ-muted font-body block mb-1">{t('common.nature')}</label>
                    <select
                      value={slot.nature}
                      onChange={e => updateSlot(selectedSlot, { nature: e.target.value as NatureName })}
                      className="w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-champ-blue transition-colors"
                    >
                      {NATURES.map(n => <option key={n} value={n}>{natureLabel(n, lang)}</option>)}
                    </select>
                  </div>

                  {availableMegas.length > 0 ? (
                    <div>
                      <label className="text-xs text-champ-muted font-body block mb-1">{t('team.megaEvol')}</label>
                      <select
                        value={slot.mega?.megaName ?? ''}
                        onChange={e => {
                          const found = availableMegas.find(m => m.megaName === e.target.value) ?? null
                          updateSlot(selectedSlot, { mega: found })
                        }}
                        className="w-full bg-champ-elevated border border-champ-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-champ-blue transition-colors"
                      >
                        <option value="">{t('team.noMega')}</option>
                        {availableMegas.map(m => <option key={m.megaName} value={m.megaName}>{m.megaName}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-champ-muted font-body block mb-1">{t('common.item')}</label>
                      <ItemInput
                        value={slot.item}
                        onChange={v => updateSlot(selectedSlot, { item: v })}
                      />
                    </div>
                  )}
                </div>

                {/* Ability + Item (when mega row taken) */}
                <div className={`grid gap-3 ${availableMegas.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <label className="text-xs text-champ-muted font-body block mb-1">{t('common.ability')}</label>
                    <AbilityInput
                      value={slot.ability}
                      onChange={v => updateSlot(selectedSlot, { ability: v })}
                      pokeapiName={slot.entry?.pokeapiName}
                    />
                  </div>
                  {availableMegas.length > 0 && (
                    <div>
                      <label className="text-xs text-champ-muted font-body block mb-1">{t('common.item')}</label>
                      <ItemInput
                        value={slot.item}
                        onChange={v => updateSlot(selectedSlot, { item: v })}
                      />
                    </div>
                  )}
                </div>

                {/* SP spread */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body">
                      {t('team.spDist')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono ${remaining === 0 ? 'text-champ-gold font-bold' : 'text-champ-muted'}`}>
                        {sp}/{SP_TOTAL} SP
                      </span>
                      <button
                        type="button"
                        onClick={() => updateSlot(selectedSlot, { spSpread: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } })}
                        className="text-xs text-champ-muted hover:text-white font-body transition-colors"
                      >
                        {t('common.reset')}
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 bg-champ-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${remaining === 0 ? 'bg-champ-gold' : 'bg-champ-blue'}`}
                      style={{ width: `${(sp / SP_TOTAL) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {activeBaseStats && STAT_IDS.map(stat => (
                      <SPRow
                        key={stat}
                        stat={stat}
                        base={activeBaseStats[stat]}
                        sp={slot.spSpread[stat]}
                        natureMod={natureMods[stat]}
                        remaining={remaining}
                        onChange={v => updateSlot(selectedSlot, { spSpread: { ...slot.spSpread, [stat]: v } })}
                      />
                    ))}
                  </div>
                </div>

                {/* Moves */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body">
                    {t('team.moves')}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {([0, 1, 2, 3] as const).map(i => (
                      <MoveInput
                        key={i}
                        value={slot.moves[i]}
                        onChange={v => {
                          const moves: [string, string, string, string] = [...slot.moves] as [string, string, string, string]
                          moves[i] = v
                          updateSlot(selectedSlot, { moves })
                        }}
                        pokeapiName={slot.entry?.pokeapiName}
                        placeholder={t('team.moveN', { n: String(i + 1) })}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: analysis */}
        <div className="space-y-4">
          <div className="bg-champ-surface border border-champ-border rounded-2xl p-5">
            <SpeedTierPanel entries={speedEntries} />
          </div>

          <div className="bg-champ-surface border border-champ-border rounded-2xl p-5">
            <TypeCoveragePanel teamTypes={teamTypes} stabTypes={stabTypes} />
          </div>

          {activeSlots.length > 0 && (
            <div className="bg-champ-surface border border-champ-border rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-champ-muted uppercase tracking-widest font-body">
                {t('team.teamStats')}
              </h3>
              {slots.map((s, i) => {
                if (!s.entry) return null
                const bs = s.mega ? s.mega.megaBaseStats : getBaseStats(s.entry.pokeapiName)
                if (!bs) return null
                const mods = getNatureMods(s.nature)
                const stats = STAT_IDS.map(stat => calcFinalStat(stat, bs[stat], s.spSpread[stat], mods[stat]))
                const sprite = getCachedSprite(s.entry.pokeapiName) ?? extraSprites[s.entry.pokeapiName] ?? null
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedSlot(i)}
                    className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors text-left ${
                      selectedSlot === i ? 'bg-champ-blue/10' : 'hover:bg-champ-elevated'
                    }`}
                  >
                    {sprite && <img src={sprite} alt="" width={28} height={28} className="object-contain shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white font-body truncate">{slotLabel(s.entry, t('common.empty'))}</p>
                      <div className="flex gap-2 mt-0.5">
                        {STAT_IDS.map((stat, j) => (
                          <span key={stat} className="text-[9px] font-mono text-champ-muted">
                            <span className="text-champ-muted/50">{STAT_LABELS[stat][0]}</span>{stats[j]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-champ-muted font-mono shrink-0">{usedSP(s.spSpread)}/{SP_TOTAL}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Import modal ── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-champ-surface border border-champ-border rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">{t('team.importShowdown')}</h2>
              <button
                type="button"
                onClick={() => { setImportOpen(false); setImportWarning(null) }}
                className="text-champ-muted hover:text-white text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={t('team.importPlaceholder')}
              className="w-full h-64 bg-champ-elevated border border-champ-border rounded-xl px-4 py-3 text-sm text-white placeholder-champ-muted font-mono resize-none focus:outline-none focus:border-champ-blue transition-colors"
              autoFocus
            />
            {importWarning && (
              <p className="text-sm text-champ-danger font-body">{importWarning}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setImportOpen(false); setImportWarning(null) }}
                className="px-4 py-2 text-sm border border-champ-border text-champ-muted rounded-lg hover:text-white font-body transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!importText.trim()) return
                  const { slots: imported, unrecognized } = importShowdownPaste(importText)
                  if (imported.length === 0) {
                    setImportWarning(t('team.importNoMatch'))
                    return
                  }
                  setSlots(prev => {
                    const next = [...prev]
                    imported.forEach((imp, i) => { next[i] = imp })
                    return next
                  })
                  setSelectedSlot(0)
                  setImportOpen(false)
                  setImportText('')
                  if (unrecognized.length > 0) {
                    setImportWarning(t('team.importWarning', {
                      count: String(unrecognized.length),
                      names: unrecognized.join(', '),
                    }))
                  } else {
                    setImportWarning(null)
                  }
                }}
                className="px-4 py-2 text-sm font-semibold bg-champ-gold text-black rounded-lg hover:bg-champ-gold/90 font-body transition-colors"
              >
                {t('team.importBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
