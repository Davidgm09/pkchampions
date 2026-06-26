'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/pokedex',    label: 'Pokédex' },
  { href: '/calculator', label: 'Calculadora' },
  { href: '/optimizador', label: 'Optimizador SP' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-champ-surface/90 backdrop-blur border-b border-champ-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-xl font-bold text-champ-gold leading-none">
            PkChampions
          </span>
          <span className="hidden sm:inline-block text-xs text-champ-muted font-body border border-champ-border rounded px-1.5 py-0.5">
            Herramientas
          </span>
        </Link>

        <nav className="flex items-center gap-1 ml-2">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium font-body transition-colors
                  ${isActive
                    ? 'bg-champ-blue/20 text-champ-blue-glow border border-champ-blue/40'
                    : 'text-champ-muted hover:text-white hover:bg-champ-elevated'
                  }
                `}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-champ-muted font-body hidden md:block">
            Reg M-B activa
          </span>
          <span className="w-2 h-2 rounded-full bg-champ-success animate-pulse" />
        </div>
      </div>
    </header>
  )
}
