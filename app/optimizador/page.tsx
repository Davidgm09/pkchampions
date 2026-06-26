import { Suspense } from 'react'
import type { Metadata } from 'next'
import SPOptimizer from '@/components/optimizer/SPOptimizer'

export const metadata: Metadata = {
  title: 'Optimizador SP',
  description: 'Encuentra la distribución óptima de 66 SP para Pokémon Champions — aguantar golpes, garantizar KOs y alcanzar speed tiers con el mínimo SP posible.',
}

export default function OptimizadorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold text-white">Optimizador de Spread SP</h1>
        <p className="text-champ-muted font-body text-sm mt-1">
          Define un objetivo competitivo y encuentra el mínimo SP necesario, dejando el resto libre para otras stats.
        </p>
      </div>

      <Suspense fallback={
        <div className="bg-champ-surface border border-champ-border rounded-xl p-8 text-center">
          <p className="text-champ-muted font-body text-sm animate-pulse">Cargando optimizador...</p>
        </div>
      }>
        <SPOptimizer />
      </Suspense>
    </div>
  )
}
