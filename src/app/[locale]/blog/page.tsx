import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { preloadQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import { BlogPageContent } from './BlogPageContent';

// SSR on each request - needed because BlogPageContent uses Convex client hooks
// that require the ConvexProvider (unavailable during SSG build).
// SSR is also better for SEO here since blog data changes frequently.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata');
  const baseUrl = 'https://www.dakhlamajalis.com';
  return {
    title: t('blog.title'),
    description: t('blog.description'),
    openGraph: {
      title: t('blog.title'),
      description: t('blog.description'),
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/blog`,
      languages: {
        'ar': `${baseUrl}/ar/blog`,
        'fr': `${baseUrl}/fr/blog`,
        'en': `${baseUrl}/en/blog`,
        'x-default': `${baseUrl}/ar/blog`,
      },
    },
  };
}

export default async function BlogPage() {
  const t = await getTranslations('metadata');
  const heading = t('blog.title').replace(' | Dakhla Majalis', '');
  const preloadedBlogs = await preloadQuery(api.blogs.getPublished, {});
  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <BlogPageContent preloadedBlogs={preloadedBlogs} />
    </>
  );
}
