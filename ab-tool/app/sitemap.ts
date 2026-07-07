import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.getvariante.com'

  const pages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/imprint`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  ]

  // Dynamische Results-Seiten — nur completed tests (haben verwertbare Daten)
  try {
    const { data: tests } = await supabase
      .from('tests')
      .select('id, ended_at')
      .eq('status', 'done')
      .order('ended_at', { ascending: false })
      .limit(100)

    if (tests) {
      for (const t of tests) {
        pages.push({
          url: `${baseUrl}/results/${t.id}`,
          lastModified: t.ended_at ? new Date(t.ended_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.4,
        })
      }
    }
  } catch {
    // Supabase nicht verfügbar → nur statische Seiten ausliefern
  }

  return pages
}
