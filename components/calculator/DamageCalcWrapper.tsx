'use client'

import { useSearchParams } from 'next/navigation'
import DamageCalc from '@/components/calculator/DamageCalc'
import { CHAMPIONS_ROSTER, ROSTER_BY_ID } from '@/data/regulation-mb'
import { MEGA_EVOLUTIONS } from '@/data/mega-stones'
import type { NatureName, SPSpread, MegaEvolution } from '@/types/champions'

export default function DamageCalcWrapper() {
  const params = useSearchParams()

  function findEntry(key: string) {
    const raw = params.get(key)
    if (!raw) return null
    return (
      ROSTER_BY_ID.get(raw) ??
      CHAMPIONS_ROSTER.find(e => e.displayName.toLowerCase() === raw.toLowerCase()) ??
      null
    )
  }

  function parseMega(key: string): MegaEvolution | null {
    const v = params.get(key)
    return v ? (MEGA_EVOLUTIONS.find(m => m.megaName === v) ?? null) : null
  }

  function parseSP(prefix: string): SPSpread | undefined {
    const k = (s: string) => (prefix ? `${prefix}_${s}` : s)
    const keys = ['hp','atk','def','spa','spd','spe'].map(k)
    if (!keys.some(key => params.has(key))) return undefined
    const sp = (s: string) => {
      const v = Number(params.get(k(s)))
      return Number.isFinite(v) ? Math.min(32, Math.max(0, v)) : 0
    }
    return { hp: sp('hp'), atk: sp('atk'), def: sp('def'), spa: sp('spa'), spd: sp('spd'), spe: sp('spe') }
  }

  return (
    <DamageCalc
      initialAttacker={findEntry('atacante')}
      initialNature={(params.get('naturaleza') as NatureName) ?? undefined}
      initialSpSpread={parseSP('')}
      initialMega={parseMega('mega')}
      initialDefender={findEntry('def_pk')}
      initialDefenderNature={(params.get('def_nat') as NatureName) ?? undefined}
      initialDefenderSpSpread={parseSP('def')}
      initialDefenderMega={parseMega('def_mega')}
      initialMove={params.get('mov') ?? undefined}
      initialWeather={params.get('clima') ?? undefined}
      initialTerrain={params.get('terreno') ?? undefined}
      initialGravity={params.get('grav') === '1'}
    />
  )
}
