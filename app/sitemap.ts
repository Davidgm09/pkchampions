import type { MetadataRoute } from 'next'
import { CHAMPIONS_ROSTER } from '@/data/regulation-mb'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pkchampions.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/pokedex`,       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/calculator`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/optimizador`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/equipo`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]

  const pokemonRoutes: MetadataRoute.Sitemap = CHAMPIONS_ROSTER.map(entry => ({
    url: `${BASE_URL}/pokedex/${entry.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...pokemonRoutes]
}
