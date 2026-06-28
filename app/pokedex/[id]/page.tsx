import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPokemon } from '@/lib/pokeapi'
import { getMegas } from '@/data/mega-stones'
import { ROSTER_BY_ID } from '@/data/regulation-mb'
import { getPokemonMeta, getMegaMeta, getMetaInfo } from '@/lib/champions-meta'
import { enrichTopMoves } from '@/lib/moves'
import PokemonDetail from '@/components/pokedex/PokemonDetail'
import TypeEffectivenessTable from '@/components/pokedex/TypeEffectivenessTable'
import ChampionsMetaSection from '@/components/pokedex/ChampionsMetaSection'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const entry = ROSTER_BY_ID.get(id)
  if (!entry) return { title: 'Pokémon no encontrado' }
  const displayTitle = entry.formLabel ? `${entry.displayName} (${entry.formLabel})` : entry.displayName
  return {
    title: displayTitle,
    description: `Datos competitivos de ${displayTitle} para Pokémon Champions — stats base, habilidades, cobertura de tipos y Mega Evolución.`,
  }
}

export default async function PokemonDetailPage({ params }: Props) {
  const { id } = await params
  const entry = ROSTER_BY_ID.get(id)
  if (!entry) notFound()

  // Sync lookups from local data
  const megas = getMegas(entry!.id)
  const pokemonMetaData = getPokemonMeta(entry!.displayName)
  const { updated_at } = getMetaInfo()

  // First mega that has its own meta entry
  const firstMegaWithMeta = megas.find((m) => !!getMegaMeta(m.megaName))
  const megaMetaEntry = firstMegaWithMeta ? getMegaMeta(firstMegaWithMeta.megaName) : null

  // Parallel fetches
  const [pokemonResult, enrichedMoves, enrichedMegaMoves] = await Promise.all([
    getPokemon(entry!.pokeapiName).catch(() => null),
    pokemonMetaData ? enrichTopMoves(pokemonMetaData.top_moves) : Promise.resolve([]),
    megaMetaEntry ? enrichTopMoves(megaMetaEntry.top_moves) : Promise.resolve([]),
  ])

  if (!pokemonResult) notFound()

  const displayTitle = entry!.formLabel
    ? `${entry!.displayName} (${entry!.formLabel})`
    : entry!.displayName

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-champ-muted font-body">
        <Link href="/pokedex" className="hover:text-white transition-colors">Pokédex</Link>
        <span>/</span>
        <span className="text-white">{displayTitle}</span>
      </div>

      <PokemonDetail
        pokemon={pokemonResult}
        megas={megas}
        entry={entry!}
        metaEntry={pokemonMetaData}
      />

      <TypeEffectivenessTable types={pokemonResult.types} />

      {megas.map((mega) => {
        const baseKey = pokemonResult.types.slice().sort().join(',')
        const megaKey = mega.megaTypes.slice().sort().join(',')
        if (baseKey === megaKey) return null
        return (
          <TypeEffectivenessTable
            key={mega.megaName}
            types={mega.megaTypes}
            megaName={mega.megaName}
          />
        )
      })}

      {pokemonMetaData && (
        <ChampionsMetaSection
          data={pokemonMetaData}
          enrichedMoves={enrichedMoves}
          megaData={megaMetaEntry}
          megaName={firstMegaWithMeta?.megaName}
          enrichedMegaMoves={enrichedMegaMoves}
          updatedAt={updated_at}
        />
      )}

    </div>
  )
}
