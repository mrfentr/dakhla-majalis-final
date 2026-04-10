import type { Metadata } from 'next';
import Image from 'next/image';
import {Link} from '@/i18n/navigation';
import { Calendar, ArrowLeft, ArrowRight, Tag, User } from 'lucide-react';
import { LandingNavbar } from '@/components/landing';
import { LandingFooter } from '@/components/landing';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  const blog = await convex.query(api.blogs.getBySlug, { slug });

  if (!blog) {
    return { title: 'Blog Post Not Found' };
  }

  const title = blog.seoTitle || blog.title;
  const description = blog.metaDescription || blog.excerpt;

  const baseUrl = 'https://www.dakhlamajalis.com';

  return {
    title,
    description,
    keywords: blog.metaKeywords,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${baseUrl}/${locale}/blog/${slug}`,
      publishedTime: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : undefined,
      images: blog.imageUrl ? [{ url: blog.imageUrl, width: 1200, height: 630, alt: title }] : undefined,
      siteName: 'الداخلة مجالس',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: blog.imageUrl ? [blog.imageUrl] : undefined,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/${slug}`,
      languages: {
        'ar': `${baseUrl}/ar/blog/${slug}`,
        'fr': `${baseUrl}/fr/blog/${slug}`,
        'en': `${baseUrl}/en/blog/${slug}`,
        'x-default': `${baseUrl}/ar/blog/${slug}`,
      },
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const t = await getTranslations('blog');
  const isRTL = locale === 'ar';

  const blog = await convex.query(api.blogs.getBySlug, { slug });

  if (!blog) {
    notFound();
  }

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate read time
  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return t('readTime', { minutes });
  };

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: blog.excerpt,
    datePublished: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : new Date(blog._creationTime).toISOString(),
    dateModified: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
    author: { '@type': 'Person', name: blog.author },
    publisher: { '@type': 'Organization', name: 'Dakhla Majalis' },
    image: blog.imageUrl || undefined,
    keywords: blog.tags?.join(', '),
  };

  return (
    <div className="min-h-screen w-full max-w-full" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Noto Naskh Arabic', serif", backgroundColor: '#FDFBF7', overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNavbar />

      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-6 sm:pb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#B85C38] transition-colors font-bold min-h-[44px]"
        >
          {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          <span>{t('backToBlog')}</span>
        </Link>
      </div>

      {/* Hero Image */}
      {blog.imageUrl && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12">
          <div className="relative h-56 sm:h-80 md:h-[500px] rounded-2xl sm:rounded-3xl overflow-hidden">
            <Image
              src={blog.imageUrl}
              alt={blog.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1152px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        </div>
      )}

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
        {/* Tags */}
        {blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            {blog.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#B85C38]/10 text-[#B85C38] text-xs sm:text-sm font-bold rounded-full"
              >
                <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-neutral-900 mb-4 sm:mb-6 leading-tight overflow-hidden">
          {blog.title}
        </h1>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 pb-6 sm:pb-8 mb-6 sm:mb-8 border-b border-neutral-200">
          <div className="flex items-center gap-2 text-neutral-600 text-sm sm:text-base">
            <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="font-bold">{blog.author}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600 text-sm sm:text-base">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>{formatDate(blog.publishedAt || blog._creationTime)}</span>
          </div>
          <span className="text-neutral-400 hidden sm:inline">•</span>
          <span className="text-neutral-600 text-sm sm:text-base">{calculateReadTime(blog.content)}</span>
        </div>

        {/* Excerpt */}
        <p className="text-lg sm:text-xl text-neutral-700 leading-relaxed mb-8 sm:mb-12 font-medium">
          {blog.excerpt}
        </p>

        {/* Content */}
        <div
          className={`prose prose-sm sm:prose-lg prose-neutral max-w-none
            prose-headings:font-black prose-headings:text-neutral-900
            prose-p:text-neutral-700 prose-p:leading-relaxed
            prose-a:text-[#B85C38] prose-a:font-bold prose-a:no-underline hover:prose-a:underline
            prose-strong:text-neutral-900 prose-strong:font-black
            prose-ul:text-neutral-700 prose-ol:text-neutral-700
            prose-img:rounded-2xl prose-img:shadow-lg prose-img:max-w-full prose-img:h-auto
            ${isRTL
              ? 'prose-blockquote:border-r-4 prose-blockquote:border-l-0 prose-blockquote:pr-6 prose-blockquote:pl-0'
              : 'prose-blockquote:border-l-4 prose-blockquote:border-r-0 prose-blockquote:pl-6 prose-blockquote:pr-0'
            } prose-blockquote:border-[#B85C38] prose-blockquote:text-neutral-600 prose-blockquote:italic
          `}
          style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Gallery */}
        {blog.gallery && blog.gallery.length > 0 && (
          <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-neutral-200">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-6 sm:mb-8">{t('gallery')}</h2>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {blog.gallery.map((image, index) => (
                <div key={index} className="relative h-56 sm:h-80 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src={image.url}
                    alt={image.alt || t('imageAlt', { number: index + 1 })}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="text-white text-sm">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


      </article>

      <LandingFooter />
    </div>
  );
}
