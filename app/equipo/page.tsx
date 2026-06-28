import type { Metadata } from 'next'
import { Suspense } from 'react'
import TeamBuilder from '@/components/team/TeamBuilder'

export const metadata: Metadata = {
  title: 'Constructor de Equipo',
  description: 'Crea tu equipo competitivo para Pokémon Champions — 6 slots con naturaleza, SP, movimientos y análisis de tipos.',
}

export default function EquipoPage() {
  return (
    <Suspense>
      <TeamBuilder />
    </Suspense>
  )
}
