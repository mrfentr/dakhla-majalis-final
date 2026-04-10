import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import SubcategoryProductsContent from './SubcategoryProductsContent';

interface Props {
  params: Promise<{ category: string; subcategory: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params;
  const t = await getTranslations('metadata');

  const title = t('subcategories.fallbackTitle', { subcategory, category });
  const description = t('subcategories.fallbackDescription', { subcategory, category });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical: `/products/${category}/${subcategory}`,
    },
  };
}

export default async function SubcategoryProductsPage({ params }: Props) {
  const { category, subcategory } = await params;
  return (
    <Suspense>
      <SubcategoryProductsContent
        categorySlug={decodeURIComponent(category)}
        subcategorySlug={decodeURIComponent(subcategory)}
      />
    </Suspense>
  );
}
