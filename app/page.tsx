import Link from 'next/link'

const FEATURES = [
  {
    href: '/pokedex',
    title: 'Pokédex',
    subtitle: 'Pokédex Competitivo',
    description:
      'Consulta stats base, tipos, habilidades y Mega Evoluciones de todos los Pokémon de la Regulación M-B.',
    icon: '📖',
    color: 'border-champ-blue/40 hover:border-champ-blue',
    badge: 'Reg M-B',
    badgeColor: 'text-champ-blue-glow border-champ-blue',
  },
  {
    href: '/calculator',
    title: 'Calculadora',
    subtitle: 'Calculadora de Daño',
    description:
      'Calcula rangos de daño exactos con el sistema SP de Champions. Soporta Mega Evoluciones via Omni Ring, clima y terreno.',
    icon: '⚔',
    color: 'border-champ-danger/40 hover:border-champ-danger',
    badge: 'Sistema 66 SP',
    badgeColor: 'text-champ-danger border-champ-danger',
  },
  {
    href: '/optimizador',
    title: 'Optimizador SP',
    subtitle: 'Optimizador de Spread',
    description:
      'Define un objetivo — aguantar un golpe, garantizar un OHKO, alcanzar un tier de velocidad — y obtén la distribución óptima de SP.',
    icon: '🎯',
    color: 'border-champ-gold/40 hover:border-champ-gold',
    badge: 'Auto-optimizar',
    badgeColor: 'text-champ-gold border-champ-gold',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4 py-12">
        <div className="inline-flex items-center gap-2 bg-champ-blue/10 border border-champ-blue/30 rounded-full px-4 py-1.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-champ-success animate-pulse" />
          <span className="text-sm text-champ-blue-glow font-body">Regulación M-B Activa</span>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight">
          PkChampions{' '}
          <span className="text-champ-gold">Tools</span>
        </h1>

        <p className="text-champ-muted text-lg font-body max-w-xl mx-auto leading-relaxed">
          Herramientas competitivas para{' '}
          <span className="text-white font-semibold">Pokémon Champions VGC</span>.
          Calculadora de daño, optimizador SP y Pokédex — todo adaptado al nuevo sistema de 66 SP.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <span className="text-xs text-champ-muted font-body bg-champ-elevated border border-champ-border rounded-full px-3 py-1">
            Sin gestión de IVs
          </span>
          <span className="text-xs text-champ-muted font-body bg-champ-elevated border border-champ-border rounded-full px-3 py-1">
            66 SP · Máx. 32/stat
          </span>
          <span className="text-xs text-champ-muted font-body bg-champ-elevated border border-champ-border rounded-full px-3 py-1">
            Mega con Omni Ring
          </span>
          <span className="text-xs text-champ-muted font-body bg-champ-elevated border border-champ-border rounded-full px-3 py-1">
            Nivel 50 · Motor Gen 9
          </span>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`group bg-champ-surface border ${f.color} rounded-2xl p-6 space-y-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{f.icon}</span>
              <span
                className={`text-xs border rounded-full px-2 py-0.5 font-body font-medium ${f.badgeColor} bg-transparent`}
              >
                {f.badge}
              </span>
            </div>
            <div>
              <p className="text-champ-muted text-xs font-body uppercase tracking-widest mb-1">
                {f.subtitle}
              </p>
              <h2 className="font-display text-2xl font-bold text-white group-hover:text-champ-gold transition-colors">
                {f.title}
              </h2>
            </div>
            <p className="text-champ-muted text-sm font-body leading-relaxed">
              {f.description}
            </p>
            <div className="flex items-center gap-1 text-sm font-body text-champ-blue-glow group-hover:gap-2 transition-all">
              Abrir herramienta
              <span>→</span>
            </div>
          </Link>
        ))}
      </section>

      {/* Champions system explainer */}
      <section className="bg-champ-surface border border-champ-border rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-white mb-6">
          Cómo funciona el sistema SP de Champions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-champ-gold font-display text-4xl font-bold">66</div>
            <p className="text-white font-semibold font-body">SP totales por Pokémon</p>
            <p className="text-champ-muted text-sm font-body leading-relaxed">
              Reemplaza el pool de 510 EVs. Distribúyelos entre los 6 stats para personalizar tu Pokémon.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-champ-blue-glow font-display text-4xl font-bold">32</div>
            <p className="text-white font-semibold font-body">SP máximos por stat</p>
            <p className="text-champ-muted text-sm font-body leading-relaxed">
              Reemplaza el límite de 252 EVs. Cada SP añade puntos de stat directamente — sin fórmula EV ÷ 4.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-champ-success font-display text-4xl font-bold">31</div>
            <p className="text-white font-semibold font-body">IVs — siempre máximos</p>
            <p className="text-champ-muted text-sm font-body leading-relaxed">
              Todos los IVs están fijos a 31 en Champions. Sin farming de bottlecaps, sin valores ocultos que gestionar.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
