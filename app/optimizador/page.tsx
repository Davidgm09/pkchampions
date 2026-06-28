import { Suspense } from 'react'
import type { Metadata } from 'next'
import SPOptimizer from '@/components/optimizer/SPOptimizer'

export const metadata: Metadata = {
  title: 'Optimizador SP',
  description: 'Encuentra la distribución óptima de 66 SP para Pokémon Champions — aguantar golpes, garantizar KOs y alcanzar tiers de velocidad con el mínimo SP posible.',
}

export default function OptimizadorPage() {
  return (
    <Suspense fallback={
      <div className="bg-champ-surface border border-champ-border rounded-xl p-8 text-center">
        <p className="text-champ-muted font-body text-sm animate-pulse">Cargando optimizador...</p>
      </div>
    }>
      <SPOptimizer />
    </Suspense>
  )
}
