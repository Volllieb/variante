import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── AI Crawlers & Scrapers: komplett aussperren ──
      // Diese Bots crawlen für KI-Training, Screenshots, oder generieren
      // visuelle Snapshots. Kein Grund, sie auf der Seite zu haben.
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'GoogleOther',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'cohere-ai',
          'PerplexityBot',
          'Amazonbot',
          'Bytespider',
          'OAI-SearchBot',
          'Applebot-Extended',
          'FacebookBot',
          'Meta-ExternalAgent',
          'Diffbot',
          'ImagesiftBot',
          'omgili',
          'peer39_crawler',
          'TurnitinBot',
        ].join(', '),
        disallow: '/',
      },
      // ── Alle anderen: normale Crawling-Regeln ──
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/login/',
          '/signup/',
          '/api/',
          '/update-password/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://www.getvariante.com/sitemap.xml',
  }
}
