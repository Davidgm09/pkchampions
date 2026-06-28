'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface SavedSpread {
  id: string
  name: string
  url: string
  savedAt: number
}

const STORAGE_KEY = 'pkchampions-spreads'

function load(): SavedSpread[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

function persist(spreads: SavedSpread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spreads))
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

function capitalize(s: string) {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function previewFromUrl(url: string): string {
  try {
    const p = new URL(url).searchParams
    const atk = p.get('atacante')
    const def = p.get('def_pk')
    const mov = p.get('mov')
    const parts = [
      atk && capitalize(atk),
      mov && mov,
      def && capitalize(def),
    ].filter(Boolean)
    return parts.join(' → ')
  } catch {
    return ''
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSavedSpreads() {
  const [spreads, setSpreads] = useState<SavedSpread[]>([])

  useEffect(() => { setSpreads(load()) }, [])

  const save = (name: string) => {
    const entry: SavedSpread = {
      id: Date.now().toString(),
      name: name.trim() || 'Sin nombre',
      url: window.location.href,
      savedAt: Date.now(),
    }
    const updated = [entry, ...spreads]
    setSpreads(updated)
    persist(updated)
  }

  const remove = (id: string) => {
    const updated = spreads.filter(s => s.id !== id)
    setSpreads(updated)
    persist(updated)
  }

  return { spreads, save, remove }
}

// ── Save button (inline name input) ──────────────────────────────────────────

interface SaveButtonProps { onSave: (name: string) => void }

export function SaveButton({ onSave }: SaveButtonProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => {
    onSave(name)
    setName('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-body text-xs transition-colors
          bg-champ-elevated border-champ-border text-champ-muted hover:text-white hover:border-champ-gold/50"
      >
        {t('spread.saveBtn')}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        placeholder={t('spread.namePlaceholder')}
        className="w-44 bg-champ-elevated border border-champ-gold/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-champ-muted font-body focus:outline-none focus:border-champ-gold transition-colors"
      />
      <button
        type="button"
        onClick={commit}
        className="px-2.5 py-1.5 rounded-lg border border-champ-gold/50 bg-champ-gold/10 text-champ-gold text-xs font-body hover:bg-champ-gold/20 transition-colors"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={() => { setEditing(false); setName('') }}
        className="px-2 py-1.5 rounded-lg border border-champ-border text-champ-muted text-xs font-body hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

// ── Saved spreads list ────────────────────────────────────────────────────────

interface SavedSpreadsProps {
  spreads: SavedSpread[]
  onRemove: (id: string) => void
}

export default function SavedSpreads({ spreads, onRemove }: SavedSpreadsProps) {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  if (spreads.length === 0) return null

  return (
    <div className="bg-champ-surface border border-champ-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-body text-champ-muted hover:text-white transition-colors"
      >
        <span className="font-semibold text-white">
          {t('spread.savedTitle')}
          <span className="ml-2 text-xs text-champ-gold font-normal">({spreads.length})</span>
        </span>
        <span className="text-champ-muted text-xs">{open ? t('spread.hide') : t('spread.show')}</span>
      </button>

      {open && (
        <ul className="border-t border-champ-border/50 divide-y divide-champ-border/30">
          {spreads.map(s => {
            const preview = previewFromUrl(s.url)
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-champ-elevated/50 transition-colors group">
                <a
                  href={s.url}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm text-white font-body truncate group-hover:text-champ-gold transition-colors">
                    {s.name}
                  </p>
                  {preview && (
                    <p className="text-xs text-champ-muted font-body truncate mt-0.5">{preview}</p>
                  )}
                </a>
                <span className="text-[10px] text-champ-muted font-body shrink-0">{formatDate(s.savedAt)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  className="text-champ-muted hover:text-red-400 transition-colors text-xs px-1.5 shrink-0 opacity-0 group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
