'use client'

import { useSearchParams } from 'next/navigation'
import DamageCalc from '@/components/calculator/DamageCalc'
import { CHAMPIONS_ROSTER, ROSTER_BY_ID } from '@/data/regulation-mb'
import { MEGA_EVOLUTIONS } from '@/data/mega-stones'
import type { NatureName, SPSpread, MegaEvolution } from '@/types/champions'

export default function DamageCalcWrapper() {
  const params = useSearchParams()

  const raw = params.get('atacante')
  const initialAttacker = raw
    ? (ROSTER_BY_ID.get(raw) ??
       CHAMPIONS_ROSTER.find(e => e.displayName.toLowerCase() === raw.toLowerCase()) ??
       null)
    : null

  const initialNature = (params.get('naturaleza') as NatureName) ?? undefined

  const sp = (k: string) => { const v = Number(params.get(k)); return Number.isFinite(v) ? Math.min(32, Math.max(0, v)) : 0 }
  const hasSpParams = ['hp','atk','def','spa','spd','spe'].some(k => params.has(k))
  const initialSpSpread: SPSpread | undefined = hasSpParams
    ? { hp: sp('hp'), atk: sp('atk'), def: sp('def'), spa: sp('spa'), spd: sp('spd'), spe: sp('spe') }
    : undefined

  const megaParam = params.get('mega')
  const initialMega: MegaEvolution | null = megaParam
    ? (MEGA_EVOLUTIONS.find(m => m.megaName === megaParam) ?? null)
    : null

  return <DamageCalc initialAttacker={initialAttacker} initialNature={initialNature} initialSpSpread={initialSpSpread} initialMega={initialMega} />
}
