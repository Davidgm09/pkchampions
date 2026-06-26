export const TYPE_NAMES: Record<string, string> = {
  fire:     'Fuego',
  water:    'Agua',
  grass:    'Planta',
  electric: 'Eléctrico',
  psychic:  'Psíquico',
  dragon:   'Dragón',
  dark:     'Siniestro',
  steel:    'Acero',
  fighting: 'Lucha',
  ghost:    'Fantasma',
  normal:   'Normal',
  ice:      'Hielo',
  rock:     'Roca',
  ground:   'Tierra',
  poison:   'Veneno',
  bug:      'Bicho',
  fairy:    'Hada',
  flying:   'Volador',
}

// Solid bg + white text — game-accurate style
// electric/ice/flying are light colors so we use dark text there
const TYPE_SOLID: Record<string, string> = {
  fire:     'bg-type-fire     text-white',
  water:    'bg-type-water    text-white',
  grass:    'bg-type-grass    text-white',
  electric: 'bg-type-electric text-gray-900',
  psychic:  'bg-type-psychic  text-white',
  dragon:   'bg-type-dragon   text-white',
  dark:     'bg-type-dark     text-gray-300',
  steel:    'bg-type-steel    text-gray-900',
  fighting: 'bg-type-fighting text-white',
  ghost:    'bg-type-ghost    text-white',
  normal:   'bg-type-normal   text-white',
  ice:      'bg-type-ice      text-gray-900',
  rock:     'bg-type-rock     text-white',
  ground:   'bg-type-ground   text-white',
  poison:   'bg-type-poison   text-white',
  bug:      'bg-type-bug      text-white',
  fairy:    'bg-type-fairy    text-white',
  flying:   'bg-type-flying   text-gray-900',
}

interface TypeBadgeProps {
  type: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[10px] tracking-wide',
  md: 'px-2.5 py-0.5 text-xs tracking-wide',
  lg: 'px-3 py-1 text-sm tracking-wider',
}

export default function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const key = type.toLowerCase()
  const colors = TYPE_SOLID[key] ?? 'bg-champ-elevated text-white'
  const displayName = TYPE_NAMES[key] ?? type

  return (
    <span
      className={`inline-flex items-center font-bold uppercase rounded font-body ${colors} ${SIZE_CLASSES[size]}`}
    >
      {displayName}
    </span>
  )
}
