import './globals.css'
import 'react-datepicker/dist/react-datepicker.css'
import Script from 'next/script'
import type { Metadata } from 'next'
import { Noto_Naskh_Arabic, Noto_Kufi_Arabic, Playfair_Display, DM_Sans, Plus_Jakarta_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ConvexProvider } from '@/components/convex-provider'
import { CartProvider } from '@/contexts/CartContext'

// Primary body font - Noto Naskh Arabic (elegant Arabic body text)
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['latin', 'arabic'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  weight: ['400', '700'],
  variable: '--font-noto-naskh',
})

// Arabic headings/titles font
const notoKufi = Noto_Kufi_Arabic({
  subsets: ['latin', 'arabic'],
  display: 'swap',
  preload: false,
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-kufi',
})

// Decorative Latin headings font
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
})

// English/French UI body font
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
})

// Latin body font (secondary)
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  weight: ['400', '600'],
  variable: '--font-plus-jakarta',
})

// Optimize metadata
export const generateViewport = () => ({
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
})

export const metadata: Metadata = {
  title: 'الداخلة مجالس | أول ماركة متخصصة في المجالس الصحراوية بالأقاليم الجنوبية',
  description: 'نصنع جلسات صحراوية أرضية وخيام شعر تقليدية من قلب الداخلة. بونج دوليدول بضمان 25 سنة وتوب قطني راقي. توصيل لجميع المدن المغربية في 10-15 يوم.',
  metadataBase: new URL('https://www.dakhlamajalis.com'),
  alternates: {
    canonical: '/',
    languages: {
      'ar': '/ar',
      'fr': '/fr',
      'en': '/en',
      'x-default': '/ar',
    },
  },
  openGraph: {
    title: 'الداخلة مجالس | مجالس صحراوية أصيلة من قلب الصحراء',
    description: 'أول ماركة متخصصة في المجالس الصحراوية بالأقاليم الجنوبية. ظهرنا على القناة الأولى وصممنا جناح جهة الداخلة بالمعرض الدولي للفلاحة 2026.',
    url: 'https://www.dakhlamajalis.com',
    siteName: 'الداخلة مجالس',
    locale: 'ar_MA',
    type: 'website',
    images: [{
      url: 'https://x619bxlezd.ufs.sh/f/hTbn04GjgYB4jGj90rC2Fbmlsd8HkYD4MrRywzX5IfuVaGtN',
      width: 1200,
      height: 630,
      alt: 'الداخلة مجالس',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'الداخلة مجالس | مجالس صحراوية أصيلة',
    description: 'من قلب الداخلة، نصنع جلسات صحراوية أرضية وخيام شعر تقليدية بجودة استثنائية.',
    images: ['https://x619bxlezd.ufs.sh/f/hTbn04GjgYB4jGj90rC2Fbmlsd8HkYD4MrRywzX5IfuVaGtN'],
  },
  keywords: [
    'مجالس صحراوية',
    'مجالس مغربية',
    'جلسات أرضية',
    'بونج دوليدول',
    'خيام شعر',
    'مجالس الداخلة',
    'مجالس الصحراء',
  ],
  authors: [{ name: 'الداخلة مجالس' }],
  creator: 'الداخلة مجالس',
  publisher: 'الداخلة مجالس',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" suppressHydrationWarning className={`${notoNaskh.variable} ${notoKufi.variable} ${playfairDisplay.variable} ${dmSans.variable} ${plusJakartaSans.variable} ${notoNaskh.className}`}>
      <head>
        {/* Bing Webmaster verification */}
        <meta name="msvalidate.01" content="9143F5DB705EA3B8E8B8311ADCCA0124" />

        {/* Preconnect for external resources */}
        <link rel="preconnect" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />

        {/* Preload hero image for LCP */}
        <link rel="preload" as="image" href="https://x619bxlezd.ufs.sh/f/hTbn04GjgYB4jGj90rC2Fbmlsd8HkYD4MrRywzX5IfuVaGtN" />

        {/* Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'الداخلة مجالس',
              url: 'https://www.dakhlamajalis.com',
              logo: 'https://www.dakhlamajalis.com/favicon.svg',
              description: 'أول ماركة متخصصة في المجالس الصحراوية بالأقاليم الجنوبية',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'الداخلة',
                addressCountry: 'MA',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+212657059044',
                contactType: 'customer service',
              },
              sameAs: [
                'https://www.instagram.com/dakhla.majalis',
                'https://www.facebook.com/dakhlamajalis',
              ],
            }),
          }}
        />

        {/* Structured Data - Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'الداخلة مجالس',
              url: 'https://www.dakhlamajalis.com',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.dakhlamajalis.com/products?search={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="bg-gray-50">
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-BLRQE2D5J0" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-BLRQE2D5J0');
          `}
        </Script>
        <ClerkProvider>
          <ConvexProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ConvexProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
