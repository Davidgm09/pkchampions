'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function HomePage() {
  const { t } = useLanguage()

  const FEATURES = [
    {
      href: '/pokedex',
      title: t('home.pokedex.title'),
      subtitle: t('home.pokedex.subtitle'),
      description: t('home.pokedex.desc'),
      icon: '📖',
      color: 'border-champ-blue/40 hover:border-champ-blue',
      badge: t('home.pokedex.badge'),
      badgeColor: 'text-champ-blue-glow border-champ-blue',
    },
    {
      href: '/calculator',
      title: t('home.calc.title'),
      subtitle: t('home.calc.subtitle'),
      description: t('home.calc.desc'),
      icon: '⚔',
      color: 'border-champ-danger/40 hover:border-champ-danger',
      badge: t('home.calc.badge'),
      badgeColor: 'text-champ-danger border-champ-danger',
    },
    {
      href: '/optimizador',
      title: t('home.opt.title'),
      subtitle: t('home.opt.subtitle'),
      description: t('home.opt.desc'),
      icon: '🎯',
      color: 'border-champ-gold/40 hover:border-champ-gold',
      badge: t('home.opt.badge'),
      badgeColor: 'text-champ-gold border-champ-gold',
    },
    {
      href: '/equipo',
      title: t('home.team.title'),
      subtitle: t('home.team.subtitle'),
      description: t('home.team.desc'),
      icon: '🛡',
      color: 'border-champ-success/40 hover:border-champ-success',
      badge: t('home.team.badge'),
      badgeColor: 'text-champ-success border-champ-success',
    },
  ]

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4 py-12">
        <div className="inline-flex items-center gap-2 bg-champ-blue/10 border border-champ-blue/30 rounded-full px-4 py-1.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-champ-success animate-pulse" />
          <span className="text-sm text-champ-blue-glow font-body">{t('home.regBadge')}</span>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight">
          PkChampions{' '}
          <span className="text-champ-gold">Tools</span>
        </h1>

        <p className="text-champ-muted text-lg font-body max-w-xl mx-auto leading-relaxed">
          {t('home.hero.prefix')}{' '}
          <span className="text-white font-semibold">{t('home.hero.gameName')}</span>
          {t('home.hero.suffix')}
        </p>

        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          {(['home.tag1', 'home.tag2', 'home.tag3', 'home.tag4'] as const).map(key => (
            <span key={key} className="text-xs text-champ-muted font-body bg-champ-elevated border border-champ-border rounded-full px-3 py-1">
              {t(key)}
            </span>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`group bg-champ-surface border ${f.color} rounded-2xl p-6 space-y-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{f.icon}</span>
              <span className={`text-xs border rounded-full px-2 py-0.5 font-body font-medium ${f.badgeColor} bg-transparent`}>
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
              {t('home.openTool')}
              <span>→</span>
            </div>
          </Link>
        ))}
      </section>

      {/* Champions system explainer */}
      <section className="bg-champ-surface border border-champ-border rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-white mb-6">
          {t('home.sp.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-champ-gold font-display text-4xl font-bold">{t('home.sp.66.num')}</div>
            <p className="text-white font-semibold font-body">{t('home.sp.66.title')}</p>
            <p className="text-champ-muted text-sm font-body leading-relaxed">{t('home.sp.66.desc')}</p>
          </div>
          <div className="space-y-2">
            <div className="text-champ-blue-glow font-display text-4xl font-bold">{t('home.sp.32.num')}</div>
            <p className="text-white font-semibold font-body">{t('home.sp.32.title')}</p>
            <p className="text-champ-muted text-sm font-body leading-relaxed">{t('home.sp.32.desc')}</p>
          </div>
          <div className="space-y-2">
            <div className="text-champ-success font-display text-4xl font-bold">{t('home.sp.31.num')}</div>
            <p className="text-white font-semibold font-body">{t('home.sp.31.title')}</p>
            <p className="text-champ-muted text-sm font-body leading-relaxed">{t('home.sp.31.desc')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
