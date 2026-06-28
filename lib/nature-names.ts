import type { Lang } from '@/lib/translations'
import type { NatureName } from '@/types/champions'

const ES_NAMES: Record<string, string> = {
  Hardy:   'Serio',
  Lonely:  'Solitario',
  Brave:   'Audaz',
  Adamant: 'Firme',
  Naughty: 'Pícaro',
  Bold:    'Osado',
  Docile:  'Dócil',
  Relaxed: 'Plácido',
  Impish:  'Agitado',
  Lax:     'Flojo',
  Timid:   'Miedoso',
  Hasty:   'Activo',
  Serious: 'Serio',
  Jolly:   'Alegre',
  Naive:   'Ingenuo',
  Modest:  'Modesto',
  Mild:    'Afable',
  Quiet:   'Quieto',
  Bashful: 'Tímido',
  Rash:    'Alocado',
  Calm:    'Sereno',
  Gentle:  'Amable',
  Sassy:   'Bravucón',
  Careful: 'Cauto',
  Quirky:  'Raro',
}

export function natureLabel(name: NatureName, lang: Lang): string {
  return lang === 'es' ? (ES_NAMES[name] ?? name) : name
}
