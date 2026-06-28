'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { lang, setLang, t } = useLanguage()

  const NAV_LINKS = [
    { href: '/pokedex',     label: t('nav.pokedex') },
    { href: '/calculator',  label: t('nav.calculator') },
    { href: '/optimizador', label: t('nav.optimizer') },
    { href: '/equipo',      label: t('nav.team') },
  ]

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-50 bg-champ-surface/90 backdrop-blur border-b border-champ-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-xl font-bold text-champ-gold leading-none">
            PkChampions
          </span>
          <span className="hidden sm:inline-block text-xs text-champ-muted font-body border border-champ-border rounded px-1.5 py-0.5">
            {t('nav.tools')}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 ml-2">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium font-body transition-colors ${
                  isActive
                    ? 'bg-champ-blue/20 text-champ-blue-glow border border-champ-blue/40'
                    : 'text-champ-muted hover:text-white hover:bg-champ-elevated'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right: lang toggle + reg badge + hamburger */}
        <div className="ml-auto flex items-center gap-3">
          {/* Language toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-champ-border text-champ-muted hover:text-white hover:border-champ-blue/50 transition-colors"
            aria-label="Toggle language"
          >
            {lang === 'es' ? (
              <img src="https://flagcdn.com/16x12/gb.png" width={16} height={12} alt="EN" className="rounded-[1px]" />
            ) : (
              <img src="https://flagcdn.com/16x12/es.png" width={16} height={12} alt="ES" className="rounded-[1px]" />
            )}
            {lang === 'es' ? 'EN' : 'ES'}
          </button>

          <span className="text-xs text-champ-muted font-body hidden md:block">{t('nav.regActive')}</span>
          <span className="w-2 h-2 rounded-full bg-champ-success animate-pulse" />

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-label="Menú"
            className="sm:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
          >
            <span className={`block h-0.5 w-5 bg-champ-muted transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 w-5 bg-champ-muted transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-champ-muted transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-champ-border bg-champ-surface/95 backdrop-blur px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium font-body transition-colors ${
                  isActive
                    ? 'bg-champ-blue/20 text-champ-blue-glow border border-champ-blue/40'
                    : 'text-champ-muted hover:text-white hover:bg-champ-elevated'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
