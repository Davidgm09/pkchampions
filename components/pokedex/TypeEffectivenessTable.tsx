import { calcAllEffectiveness, calcOffensiveCoverage } from '@/lib/type-effectiveness'
import TypeBadge from '@/components/pokedex/TypeBadge'

interface Props {
  types: string[]
  title?: string
}

const SECTIONS = [
  {
    keys: ['x4', 'x2'] as const,
    label: 'Débil a',
    accent: 'text-red-400',
    divider: 'border-red-500/30',
    tag: (key: 'x4' | 'x2') => ({
      x4: { label: '×4', cls: 'bg-red-500/20 text-red-300 border border-red-500/40' },
      x2: { label: '×2', cls: 'bg-red-500/10 text-red-400/80 border border-red-500/20' },
    }[key]),
  },
  {
    keys: ['x0_5', 'x0_25'] as const,
    label: 'Resiste',
    accent: 'text-blue-400',
    divider: 'border-blue-500/30',
    tag: (key: 'x0_5' | 'x0_25') => ({
      x0_5:  { label: '×½', cls: 'bg-blue-500/10 text-blue-400/80 border border-blue-500/20' },
      x0_25: { label: '×¼', cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/40' },
    }[key]),
  },
  {
    keys: ['x0'] as const,
    label: 'Inmune a',
    accent: 'text-champ-muted',
    divider: 'border-champ-border',
    tag: (_key: 'x0') => ({ label: '×0', cls: 'bg-champ-elevated text-champ-muted border border-champ-border' }),
  },
] as const

export default function TypeEffectivenessTable({ types, title }: Props) {
  const groups = calcAllEffectiveness(types)
  const offensive = calcOffensiveCoverage(types)

  const hasContent = (keys: readonly string[]) =>
    keys.some((k) => (groups[k as keyof typeof groups] as string[]).length > 0)

  const activeSections = SECTIONS.filter((s) => hasContent(s.keys))
  if (activeSections.length === 0 && offensive.x2.length === 0 && offensive.x4.length === 0) return null

  return (
    <div className="bg-champ-surface border border-champ-border rounded-2xl p-6 space-y-5">
      <h2 className="font-display text-xl font-bold text-white">
        {title ?? 'Efectividad de tipos'}
      </h2>

      {/* Ofensiva */}
      {(offensive.x4.length > 0 || offensive.x2.length > 0) && (
        <div className="border-l-2 border-champ-success/40 pl-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 font-body text-champ-success">
            Efectivo contra
          </p>
          <div className="flex flex-col gap-2">
            {offensive.x4.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 bg-green-500/20 text-green-300 border border-green-500/40">
                  ×4
                </span>
                {offensive.x4.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            )}
            {offensive.x2.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 bg-green-500/10 text-green-400/80 border border-green-500/20">
                  ×2
                </span>
                {offensive.x2.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Separador */}
      {(offensive.x4.length > 0 || offensive.x2.length > 0) && activeSections.length > 0 && (
        <div className="border-t border-champ-border" />
      )}

      {/* Defensiva */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {activeSections.map((section) => (
          <div key={section.label} className={`border-l-2 pl-4 ${section.divider}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 font-body ${section.accent}`}>
              {section.label}
            </p>
            <div className="flex flex-col gap-2">
              {section.keys.map((key) => {
                const typeList = groups[key as keyof typeof groups] as string[]
                if (typeList.length === 0) return null
                const tag = section.tag(key as never)
                return (
                  <div key={key} className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${tag.cls}`}>
                      {tag.label}
                    </span>
                    {typeList.map((t) => (
                      <TypeBadge key={t} type={t} size="sm" />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
