import type { Metadata } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/nav/Navbar'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'PkChampions Tools',
    template: '%s | PkChampions',
  },
  description:
    'Herramientas competitivas para Pokémon Champions — calculadora de daño, optimizador SP y Pokédex adaptados al sistema de 66 SP.',
  keywords: ['Pokémon Champions', 'VGC', 'competitivo', 'calculadora de daño', 'optimizador SP'],
  openGraph: {
    type: 'website',
    title: 'PkChampions Tools',
    description: 'Herramientas competitivas para Pokémon Champions VGC',
    siteName: 'PkChampions',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${rajdhani.variable}`}>
      <body className="min-h-screen bg-champ-bg text-white font-body">
        <LanguageProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
