import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
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
