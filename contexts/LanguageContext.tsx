'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Lang, type TKey } from '@/lib/translations'

const LANG_KEY = 'pkchampions-lang'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey | string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'es',
  setLang: () => {},
  t: (key) => key as string,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null
    if (saved === 'es' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem(LANG_KEY, l)
  }

  const t = (key: TKey | string, vars?: Record<string, string | number>): string => {
    const dict = translations[lang] as Record<string, string>
    let str = dict[key as string] ?? (key as string)
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v))
      })
    }
    return str
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
