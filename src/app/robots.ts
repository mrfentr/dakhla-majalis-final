import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/*/dashboard/',
          '/checkout/',
          '/*/checkout/',
          '/confirmation/',
          '/*/confirmation/',
          '/thank-you/',
          '/*/thank-you/',
        ],
      },
    ],
    sitemap: 'https://www.dakhlamajalis.com/sitemap.xml',
  }
}
