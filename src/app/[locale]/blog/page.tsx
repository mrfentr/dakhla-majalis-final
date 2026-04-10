'use client';

import Image from 'next/image';
import {Link} from '@/i18n/navigation';
import { useState, useMemo } from 'react';
import { Calendar, ArrowLeft, ArrowRight, BookOpen, Search, Tag, TrendingUp, Loader2 } from 'lucide-react';
import { LandingNavbar, LandingFooter } from '@/components/landing';
import { useGetPublishedBlogs } from '@/hooks/useConvex';
import {useTranslations, useLocale} from 'next-intl';

export default function BlogPage() {
  const t = useTranslations('blog');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [selectedCategory, setSelectedCategory] = useState(t('allCategory'));
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch published blogs from Convex
  const blogs = useGetPublishedBlogs();

  // Extract unique categories from blogs
  const categories = useMemo(() => {
    if (!blogs) return [t('allCategory')];
    const uniqueCategories = new Set(blogs.flatMap(blog => blog.tags));
    return [t('allCategory'), ...Array.from(uniqueCategories)];
  }, [blogs, t]);

  // Calculate read time from content length
  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return t('readTime', { minutes });
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Featured articles (first 2 published blogs)
  const featuredArticles = useMemo(() => {
    if (!blogs) return [];
    return blogs.slice(0, 2);
  }, [blogs]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    if (!blogs) return [];

    return blogs.filter(blog => {
      const matchesCategory = selectedCategory === t('allCategory') || blog.tags.includes(selectedCategory);
      const matchesSearch = blog.title.includes(searchQuery) || blog.excerpt.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [blogs, selectedCategory, searchQuery, t]);

  // Loading state
  if (!blogs) {
    return (
      <div className="min-h-screen w-full max-w-full" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Noto Naskh Arabic', serif", backgroundColor: '#FDFBF7', overflowX: 'hidden' }}>
        <LandingNavbar />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-[#B85C38]" />
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Noto Naskh Arabic', serif", backgroundColor: '#FDFBF7', overflowX: 'hidden' }}>
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden" style={{ background: 'linear-gradient(to bottom right, rgba(184,92,56,0.05), #FDFBF7, #F5F0E8)' }}>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#B85C38]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#B85C38]/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6 sm:mb-8 shadow-sm" style={{ backgroundColor: '#FDFBF7', border: '1px solid #E8E0D5' }}>
              <BookOpen className="w-5 h-5 text-[#B85C38]" />
              <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{t('badge')}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 leading-tight" style={{ color: '#1A1A1A' }}>
              {t('title')}
              <span className="block text-[#B85C38] mt-2">{t('titleHighlight')}</span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl mb-8 sm:mb-10 leading-relaxed" style={{ color: '#5A5A5A' }}>
              {t('subtitle')}
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 ${isRTL ? 'right-5' : 'left-5'}`} style={{ color: '#8A8A8A' }} />
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg focus:outline-none transition-colors shadow-sm ${isRTL ? 'pr-14 pl-6' : 'pl-14 pr-6'}`}
                  style={{ backgroundColor: '#FDFBF7', border: '2px solid #E8E0D5', color: '#1A1A1A' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="py-10 sm:py-16" style={{ backgroundColor: '#FDFBF7' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8 sm:mb-10">
              <TrendingUp className="w-6 h-6 text-[#B85C38]" />
              <h2 className="text-2xl sm:text-3xl font-black" style={{ color: '#1A1A1A' }}>{t('featured')}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              {featuredArticles.map((blog) => (
                <Link
                  key={blog._id}
                  href={`/blog/${blog.slug}`}
                  className="group block"
                >
                  <article className="rounded-2xl sm:rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500" style={{ backgroundColor: '#FDFBF7', border: '2px solid #E8E0D5' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#B85C38')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E8E0D5')}>
                    <div className="relative h-56 sm:h-72 md:h-80">
                      <Image
                        src={blog.imageUrl || 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-2943147_1280.jpg'}
                        alt={blog.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      {blog.tags.length > 0 && (
                        <div className={`absolute top-4 sm:top-6 ${isRTL ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} px-3 sm:px-4 py-1.5 sm:py-2 bg-[#B85C38] rounded-xl shadow-lg`}>
                          <span className="text-xs sm:text-sm font-bold text-white">{blog.tags[0]}</span>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3 leading-tight line-clamp-2 overflow-hidden">
                          {blog.title}
                        </h3>
                        <div className="flex items-center gap-3 sm:gap-4 text-white/90 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            <span>{formatDate(blog.publishedAt || blog._creationTime)}</span>
                          </div>
                          <span>•</span>
                          <span>{calculateReadTime(blog.content)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 sm:p-8">
                      <p className="leading-relaxed mb-4 line-clamp-3 overflow-hidden" style={{ color: '#5A5A5A' }}>
                        {blog.excerpt}
                      </p>
                      <div className="flex items-center gap-2 text-[#B85C38] font-bold group-hover:gap-3 transition-all min-h-[44px]">
                        <span>{t('readFullArticle')}</span>
                        {isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="py-8 sm:py-12" style={{ backgroundColor: '#F5F0E8', borderTop: '1px solid #E8E0D5', borderBottom: '1px solid #E8E0D5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-[#B85C38] text-white shadow-lg'
                    : 'hover:opacity-80'
                }`}
                style={selectedCategory !== category ? { backgroundColor: '#FDFBF7', color: '#1A1A1A', border: '1px solid #E8E0D5' } : undefined}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* All Articles Grid */}
      <section className="py-12 sm:py-20" style={{ backgroundColor: '#FDFBF7' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8 sm:mb-10">
            <Tag className="w-6 h-6 text-[#B85C38]" />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: '#1A1A1A' }}>{t('allArticles')}</h2>
            <span style={{ color: '#8A8A8A' }}>({filteredArticles.length})</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredArticles.map((blog) => (
              <Link
                key={blog._id}
                href={`/blog/${blog.slug}`}
                className="group block"
              >
                <article className="rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500" style={{ background: 'linear-gradient(to bottom, #FDFBF7, #F5F0E8)', border: '1px solid #E8E0D5' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(184,92,56,0.4)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E8E0D5')}>
                  <div className="relative h-48 sm:h-56 overflow-hidden">
                    <Image
                      src={blog.imageUrl || 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-2943147_1280.jpg'}
                      alt={blog.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {blog.tags.length > 0 && (
                      <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} px-3 py-1.5 bg-[#B85C38] rounded-lg`}>
                        <span className="text-xs font-bold text-white">{blog.tags[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm mb-3" style={{ color: '#8A8A8A' }}>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>{formatDate(blog.publishedAt || blog._creationTime)}</span>
                      </div>
                      <span>•</span>
                      <span>{calculateReadTime(blog.content)}</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black mb-3 group-hover:text-[#B85C38] transition-colors line-clamp-2 overflow-hidden" style={{ color: '#1A1A1A' }}>
                      {blog.title}
                    </h3>

                    <p className="text-sm leading-relaxed mb-4 line-clamp-3 overflow-hidden" style={{ color: '#5A5A5A' }}>
                      {blog.excerpt}
                    </p>

                    <div className="flex items-center gap-2 text-sm font-bold text-[#B85C38] group-hover:gap-3 transition-all min-h-[44px]">
                      <span>{t('readMore')}</span>
                      {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#F5F0E8' }}>
                <Search className="w-10 h-10" style={{ color: '#8A8A8A' }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: '#1A1A1A' }}>{t('empty')}</h3>
              <p style={{ color: '#5A5A5A' }}>{t('emptyDescription')}</p>
            </div>
          )}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
