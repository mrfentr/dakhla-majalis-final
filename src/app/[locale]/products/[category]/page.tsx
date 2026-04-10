import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import CategorySubcategoriesContent from './CategorySubcategoriesContent';

// SSR on each request - needed because CategorySubcategoriesContent uses Convex
// client hooks that require the ConvexProvider (unavailable during SSG build).
// SSR is also better here since product/category data changes frequently.
export const dynamic = 'force-dynamic';

const knownCategories = ['sets', 'ready', 'outdoor', 'tents', 'accessories'];

interface Props {
  params: Promise<{ locale: string; category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const t = await getTranslations('metadata');
  const baseUrl = 'https://www.dakhlamajalis.com';

  const isKnown = knownCategories.includes(category);

  const title = isKnown
    ? t(`categories.${category}.title` as any)
    : t('categories.fallbackTitle', { category });

  const description = isKnown
    ? t(`categories.${category}.description` as any)
    : t('categories.fallbackDescription', { category });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/products/${category}`,
      languages: {
        'ar': `${baseUrl}/ar/products/${category}`,
        'fr': `${baseUrl}/fr/products/${category}`,
        'en': `${baseUrl}/en/products/${category}`,
        'x-default': `${baseUrl}/ar/products/${category}`,
      },
    },
  };
}

export default async function CategoryProductsPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return (
    <Suspense>
      <CategorySubcategoriesContent categorySlug={decodeURIComponent(category)} />
    </Suspense>
  );
}
