'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { NormalizedPokemon } from '@/types/pokemon'
import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import TypeBadge from '@/components/pokedex/TypeBadge'
import StatBar from '@/components/ui/StatBar'

interface PokemonCardProps {
  pokemon: NormalizedPokemon
  entry: ChampionsPokemonEntry
}

function PokeballPlaceholder() {
  return (
    <div className="w-28 h-28 flex items-center justify-center opacity-20">
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

export default function PokemonCard({ pokemon, entry }: PokemonCardProps) {
  const [imgError, setImgError] = useState(false)
  const { types, baseStats, artwork, sprite, id, totalBST } = pokemon
  const imgSrc = artwork ?? sprite
  const paddedId = String(id).padStart(4, '0')

  return (
    <Link
      href={`/pokedex/${entry.id}`}
      className="group block bg-champ-surface border border-champ-border rounded-xl overflow-hidden hover:border-champ-blue transition-all duration-200 hover:shadow-lg hover:shadow-champ-blue/10"
    >
      {/* Image area */}
      <div className="relative bg-champ-elevated aspect-square flex items-center justify-center p-4">
        {imgSrc && !imgError ? (
          <Image
            src={imgSrc}
            alt={entry.displayName}
            width={160}
            height={160}
            className="object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <PokeballPlaceholder />
        )}

        <span className="absolute top-2 left-2 text-xs text-champ-muted font-mono">
          #{paddedId}
        </span>

        {entry.hasMega && (
          <span className="absolute top-2 right-2 text-xs bg-champ-gold/20 border border-champ-gold text-champ-gold px-1.5 py-0.5 rounded font-body font-semibold">
            MEGA
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-display font-semibold text-white text-base leading-tight truncate">
            {entry.displayName}
          </h3>
          {entry.formLabel && (
            <span className="inline-block text-xs text-champ-blue-glow border border-champ-blue/30 bg-champ-blue/10 rounded px-1.5 py-0.5 mt-0.5 font-body">
              {entry.formLabel}
            </span>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {types.map((t) => (
            <TypeBadge key={t} type={t} size="sm" />
          ))}
        </div>

        <div className="space-y-1 pt-1">
          <StatBar label="hp"  value={baseStats.hp} />
          <StatBar label="atk" value={baseStats.atk} />
          <StatBar label="def" value={baseStats.def} />
          <StatBar label="spa" value={baseStats.spa} />
          <StatBar label="spd" value={baseStats.spd} />
          <StatBar label="spe" value={baseStats.spe} />
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-champ-border">
          <span className="text-xs text-champ-muted font-body">BST</span>
          <span className="text-xs font-bold text-champ-gold font-mono">{totalBST}</span>
        </div>
      </div>
    </Link>
  )
}
