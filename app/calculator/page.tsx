import { Suspense } from 'react'
import type { Metadata } from 'next'
import DamageCalcWrapper from '@/components/calculator/DamageCalcWrapper'

export const metadata: Metadata = {
  title: 'Calculadora de Daño',
  description: 'Calculadora de daño para Pokémon Champions con sistema de 66 SP — soporta Mega Evoluciones, clima, terreno y condiciones de campo.',
}

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold text-white">Calculadora de Daño</h1>
        <p className="text-champ-muted font-body text-sm mt-1">
          Sistema SP de Champions · IVs fijos a 31 · Nivel 50 · Motor Gen 9
        </p>
      </div>

      <div className="bg-champ-surface border border-champ-gold/20 rounded-xl p-3 flex items-start gap-3">
        <span className="text-champ-gold text-sm mt-0.5">ℹ</span>
        <p className="text-sm text-champ-muted font-body leading-relaxed">
          Elige Pokémon del roster de Champions con el buscador. Los{' '}
          <span className="text-white font-semibold">SP</span> se convierten a EVs Gen 9 para el cálculo (motor <span className="text-white font-mono">@smogon/calc</span>, Doubles).
          Las <span className="text-champ-gold font-semibold">Mega Evoluciones</span> via Omni Ring usan stats reales guardados localmente.
          Los movimientos más usados en Champions Season 1 aparecen como accesos rápidos al elegir un atacante.
        </p>
      </div>

      <Suspense fallback={
        <div className="bg-champ-surface border border-champ-border rounded-xl p-8 text-center">
          <p className="text-champ-muted font-body text-sm animate-pulse">Cargando calculadora...</p>
        </div>
      }>
        <DamageCalcWrapper />
      </Suspense>
    </div>
  )
}
