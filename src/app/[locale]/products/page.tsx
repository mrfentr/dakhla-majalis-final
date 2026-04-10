import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LandingNavbar, LandingFooter } from '@/components/landing';
import { LandingProducts } from '@/components/landing/LandingProducts';

// SSR on each request - needed because LandingProducts uses Convex client hooks
// that require the ConvexProvider (unavailable during SSG build).
// SSR is also better for SEO here since product data changes frequently.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata');
  const baseUrl = 'https://www.dakhlamajalis.com';
  return {
    title: t('products.title'),
    description: t('products.description'),
    openGraph: {
      title: t('products.title'),
      description: t('products.description'),
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/products`,
      languages: {
        'ar': `${baseUrl}/ar/products`,
        'fr': `${baseUrl}/fr/products`,
        'en': `${baseUrl}/en/products`,
        'x-default': `${baseUrl}/ar/products`,
      },
    },
  };
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <LandingNavbar />
      <LandingProducts />
      <LandingFooter />
    </div>
  );
}
