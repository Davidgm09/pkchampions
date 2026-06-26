import type { MegaEvolution } from '@/types/champions'

export const MEGA_EVOLUTIONS: MegaEvolution[] = [
  {
    baseName: 'charizard',
    megaName: 'charizard-mega-x',
    megaTypes: ['fire', 'dragon'],
    megaBaseStats: { hp: 78, atk: 130, def: 111, spa: 130, spd: 85, spe: 100 },
    megaAbility: 'Tough Claws',
    stone: 'Charizardite X',
  },
  {
    baseName: 'charizard',
    megaName: 'charizard-mega-y',
    megaTypes: ['fire', 'flying'],
    megaBaseStats: { hp: 78, atk: 104, def: 78, spa: 159, spd: 115, spe: 100 },
    megaAbility: 'Drought',
    stone: 'Charizardite Y',
  },
  {
    baseName: 'blastoise',
    megaName: 'blastoise-mega',
    megaTypes: ['water'],
    megaBaseStats: { hp: 79, atk: 103, def: 120, spa: 135, spd: 115, spe: 78 },
    megaAbility: 'Mega Launcher',
    stone: 'Blastoisinite',
  },
  {
    baseName: 'venusaur',
    megaName: 'venusaur-mega',
    megaTypes: ['grass', 'poison'],
    megaBaseStats: { hp: 80, atk: 100, def: 123, spa: 122, spd: 120, spe: 80 },
    megaAbility: 'Thick Fat',
    stone: 'Venusaurite',
  },
  {
    baseName: 'lucario',
    megaName: 'lucario-mega',
    megaTypes: ['fighting', 'steel'],
    megaBaseStats: { hp: 70, atk: 145, def: 88, spa: 140, spd: 70, spe: 112 },
    megaAbility: 'Adaptability',
    stone: 'Lucarionite',
  },
  {
    baseName: 'gardevoir',
    megaName: 'gardevoir-mega',
    megaTypes: ['psychic', 'fairy'],
    megaBaseStats: { hp: 68, atk: 85, def: 65, spa: 165, spd: 135, spe: 100 },
    megaAbility: 'Pixilate',
    stone: 'Gardevoirite',
  },
  {
    baseName: 'gengar',
    megaName: 'gengar-mega',
    megaTypes: ['ghost', 'poison'],
    megaBaseStats: { hp: 60, atk: 65, def: 80, spa: 170, spd: 95, spe: 130 },
    megaAbility: 'Shadow Tag',
    stone: 'Gengarite',
  },
  {
    baseName: 'kangaskhan',
    megaName: 'kangaskhan-mega',
    megaTypes: ['normal'],
    megaBaseStats: { hp: 105, atk: 125, def: 100, spa: 60, spd: 100, spe: 100 },
    megaAbility: 'Parental Bond',
    stone: 'Kangaskhanite',
  },
  {
    baseName: 'salamence',
    megaName: 'salamence-mega',
    megaTypes: ['dragon', 'flying'],
    megaBaseStats: { hp: 95, atk: 145, def: 130, spa: 120, spd: 90, spe: 120 },
    megaAbility: 'Aerilate',
    stone: 'Salamencite',
  },
  {
    baseName: 'metagross',
    megaName: 'metagross-mega',
    megaTypes: ['steel', 'psychic'],
    megaBaseStats: { hp: 80, atk: 145, def: 150, spa: 105, spd: 110, spe: 110 },
    megaAbility: 'Tough Claws',
    stone: 'Metagrossite',
  },
  {
    baseName: 'rayquaza',
    megaName: 'rayquaza-mega',
    megaTypes: ['dragon', 'flying'],
    megaBaseStats: { hp: 105, atk: 180, def: 100, spa: 180, spd: 100, spe: 115 },
    megaAbility: 'Delta Stream',
    stone: 'Dragon Ascent (no stone required)',
  },
  {
    baseName: 'garchomp',
    megaName: 'garchomp-mega',
    megaTypes: ['dragon', 'ground'],
    megaBaseStats: { hp: 108, atk: 170, def: 115, spa: 120, spd: 95, spe: 92 },
    megaAbility: 'Sand Force',
    stone: 'Garchompite',
  },
  {
    baseName: 'tyranitar',
    megaName: 'tyranitar-mega',
    megaTypes: ['rock', 'dark'],
    megaBaseStats: { hp: 100, atk: 164, def: 150, spa: 95, spd: 120, spe: 71 },
    megaAbility: 'Sand Stream',
    stone: 'Tyranitarite',
  },
  {
    baseName: 'diancie',
    megaName: 'diancie-mega',
    megaTypes: ['rock', 'fairy'],
    megaBaseStats: { hp: 50, atk: 160, def: 110, spa: 160, spd: 110, spe: 110 },
    megaAbility: 'Magic Bounce',
    stone: 'Diancite',
  },
  {
    baseName: 'lopunny',
    megaName: 'lopunny-mega',
    megaTypes: ['normal', 'fighting'],
    megaBaseStats: { hp: 65, atk: 136, def: 94, spa: 54, spd: 96, spe: 135 },
    megaAbility: 'Scrappy',
    stone: 'Lopunnite',
  },
  {
    baseName: 'scizor',
    megaName: 'scizor-mega',
    megaTypes: ['bug', 'steel'],
    megaBaseStats: { hp: 70, atk: 150, def: 140, spa: 65, spd: 100, spe: 75 },
    megaAbility: 'Technician',
    stone: 'Scizorite',
  },
  {
    baseName: 'gyarados',
    megaName: 'gyarados-mega',
    megaTypes: ['water', 'dark'],
    megaBaseStats: { hp: 95, atk: 155, def: 109, spa: 70, spd: 130, spe: 81 },
    megaAbility: 'Mold Breaker',
    stone: 'Gyaradosite',
  },
  {
    baseName: 'alakazam',
    megaName: 'alakazam-mega',
    megaTypes: ['psychic'],
    megaBaseStats: { hp: 55, atk: 50, def: 65, spa: 175, spd: 95, spe: 150 },
    megaAbility: 'Trace',
    stone: 'Alakazite',
  },
  {
    baseName: 'sableye',
    megaName: 'sableye-mega',
    megaTypes: ['dark', 'ghost'],
    megaBaseStats: { hp: 50, atk: 85, def: 125, spa: 85, spd: 115, spe: 20 },
    megaAbility: 'Magic Bounce',
    stone: 'Sablenite',
  },
  {
    baseName: 'ampharos',
    megaName: 'ampharos-mega',
    megaTypes: ['electric', 'dragon'],
    megaBaseStats: { hp: 90, atk: 95, def: 105, spa: 165, spd: 110, spe: 45 },
    megaAbility: 'Mold Breaker',
    stone: 'Ampharosite',
  },
]

export const MEGA_STONE_MAP = new Map<string, MegaEvolution[]>(
  MEGA_EVOLUTIONS.reduce((acc, mega) => {
    const existing = acc.get(mega.baseName) ?? []
    acc.set(mega.baseName, [...existing, mega])
    return acc
  }, new Map<string, MegaEvolution[]>())
)

export function hasMega(pokemonName: string): boolean {
  return MEGA_STONE_MAP.has(pokemonName.toLowerCase())
}

export function getMegas(pokemonName: string): MegaEvolution[] {
  return MEGA_STONE_MAP.get(pokemonName.toLowerCase()) ?? []
}
