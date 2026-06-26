export type StatID = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'

export interface BaseStats {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

export interface PokemonType {
  name: string
  slot: number
}

export interface PokemonAbility {
  name: string
  isHidden: boolean
}

export interface PokemonMove {
  name: string
  type: string
  category: 'Physical' | 'Special' | 'Status'
  power: number | null
  accuracy: number | null
  pp: number
}

export interface PokemonSprite {
  front_default: string | null
  front_shiny: string | null
  other?: {
    'official-artwork'?: {
      front_default: string | null
    }
  }
}

export interface PokeAPIResponse {
  id: number
  name: string
  base_experience: number
  height: number
  weight: number
  types: Array<{ slot: number; type: { name: string; url: string } }>
  abilities: Array<{ ability: { name: string; url: string }; is_hidden: boolean; slot: number }>
  stats: Array<{ base_stat: number; effort: number; stat: { name: string } }>
  sprites: PokemonSprite
  moves: Array<{ move: { name: string; url: string } }>
}

export interface NormalizedPokemon {
  id: number
  name: string
  types: string[]
  baseStats: BaseStats
  abilities: PokemonAbility[]
  sprite: string | null
  artwork: string | null
  height: number
  weight: number
  totalBST: number
}
