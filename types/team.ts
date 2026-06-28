import type { ChampionsPokemonEntry } from '@/data/regulation-mb'
import type { NatureName, SPSpread, MegaEvolution } from '@/types/champions'
import { EMPTY_SP_SPREAD } from '@/types/champions'

export interface TeamSlot {
  entry: ChampionsPokemonEntry | null
  nature: NatureName
  spSpread: SPSpread
  ability: string
  item: string
  mega: MegaEvolution | null
  moves: [string, string, string, string]
}

export function emptySlot(): TeamSlot {
  return {
    entry: null,
    nature: 'Hardy',
    spSpread: { ...EMPTY_SP_SPREAD },
    ability: '',
    item: '',
    mega: null,
    moves: ['', '', '', ''],
  }
}
