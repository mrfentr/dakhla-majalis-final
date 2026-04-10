import type { Metadata } from 'next';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { ProductDetails } from '@/components/product/ProductDetails';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function getLocalizedField(
  field: { ar?: string; fr?: string; en?: string } | undefined,
  locale: string
): string {
  if (!field) return '';
  const loc = locale as keyof typeof field;
  return field[loc] || field.fr || field.ar || '';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;

  try {
    const product = await convex.query(api.products.getProductBySlug, { slug });

    if (!product) {
      return {
        title: 'Product Not Found',
      };
    }

    const title = getLocalizedField(product.title, locale);
    const description = getLocalizedField(product.description, locale) || title;
    const image = product.image;

    const baseUrl = 'https://www.dakhlamajalis.com';

    return {
      title,
      description: description.slice(0, 160),
      openGraph: {
        title,
        description: description.slice(0, 160),
        type: 'website',
        url: `${baseUrl}/${locale}/product/${slug}`,
        images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
        siteName: 'الداخلة مجالس',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: description.slice(0, 160),
        images: image ? [image] : undefined,
      },
      alternates: {
        canonical: `${baseUrl}/${locale}/product/${slug}`,
        languages: {
          'ar': `${baseUrl}/ar/product/${slug}`,
          'fr': `${baseUrl}/fr/product/${slug}`,
          'en': `${baseUrl}/en/product/${slug}`,
          'x-default': `${baseUrl}/ar/product/${slug}`,
        },
      },
    };
  } catch {
    return {
      title: 'Product',
    };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;

  let jsonLd = null;
  let breadcrumbLd = null;

  try {
    const product = await convex.query(api.products.getProductBySlug, { slug });
    if (product) {
      const title = getLocalizedField(product.title, locale);
      const description = getLocalizedField(product.description, locale);
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: title,
        description: description,
        image: product.image,
        url: `https://www.dakhlamajalis.com/${locale}/product/${slug}`,
        brand: {
          '@type': 'Brand',
          name: 'الداخلة مجالس',
        },
        offers: {
          '@type': 'Offer',
          price: product.pricing?.basePrice || 0,
          priceCurrency: product.pricing?.currency || 'MAD',
          availability: product.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `https://www.dakhlamajalis.com/${locale}/product/${slug}`,
        },
        ...(product.rating > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount || 1,
          },
        } : {}),
      };

      breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الداخلة مجالس', item: `https://www.dakhlamajalis.com/${locale}` },
          { '@type': 'ListItem', position: 2, name: locale === 'ar' ? 'المنتجات' : 'Produits', item: `https://www.dakhlamajalis.com/${locale}/products` },
          { '@type': 'ListItem', position: 3, name: title, item: `https://www.dakhlamajalis.com/${locale}/product/${slug}` },
        ],
      };
    }
  } catch {}

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {breadcrumbLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />}
      <ProductDetails slug={slug} />
    </>
  );
}
