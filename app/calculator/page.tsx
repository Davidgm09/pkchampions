import { Suspense } from 'react'
import type { Metadata } from 'next'
import DamageCalcWrapper from '@/components/calculator/DamageCalcWrapper'

export const metadata: Metadata = {
  title: 'Calculadora de Daño',
  description: 'Calculadora de daño para Pokémon Champions con sistema de 66 SP — soporta Mega Evoluciones, clima, terreno y condiciones de campo.',
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <div className="bg-champ-surface border border-champ-border rounded-xl p-8 text-center">
        <p className="text-champ-muted font-body text-sm animate-pulse">Cargando calculadora...</p>
      </div>
    }>
      <DamageCalcWrapper />
    </Suspense>
  )
}
