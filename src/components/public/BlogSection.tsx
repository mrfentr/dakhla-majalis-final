'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowLeft, BookOpen } from 'lucide-react';
import { useGetPublishedBlogs } from '@/hooks/useConvex';

export function BlogSection() {
  const router = useRouter();
  const blogs = useGetPublishedBlogs();

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get latest 3 blogs
  const articles = blogs?.slice(0, 3) || [];

  return (
    <section className="relative py-24 bg-white overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#BD7C48]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#BD7C48]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <BookOpen className="w-4 h-4 text-[#BD7C48]" />
            <span className="text-sm font-bold text-[#BD7C48]">المدونة</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-neutral-900 mb-4">
            مقالات ونصائح مفيدة
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            اكتشف عالم المجالس الصحراوية مع نصائحنا وإرشاداتنا
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {articles.map((blog) => (
            <Link
              key={blog._id}
              href={`/blog/${blog.slug}`}
              className="group bg-gradient-to-b from-white to-neutral-50 rounded-2xl overflow-hidden border border-neutral-200 hover:border-[#BD7C48]/40 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer block"
            >
              {/* Image */}
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={blog.imageUrl || 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-2943147_1280.jpg'}
                  alt={blog.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Category Badge */}
                {blog.tags.length > 0 && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-[#BD7C48] rounded-lg">
                    <span className="text-xs font-bold text-white">{blog.tags[0]}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(blog.publishedAt || blog._creationTime)}</span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-black text-neutral-900 mb-3 group-hover:text-[#BD7C48] transition-colors line-clamp-2">
                  {blog.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm text-neutral-600 leading-relaxed mb-4 line-clamp-3">
                  {blog.excerpt}
                </p>

                {/* Read More */}
                <div className="flex items-center gap-2 text-sm font-bold text-[#BD7C48] group-hover:gap-3 transition-all">
                  <span>اقرأ المزيد</span>
                  <ArrowLeft className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push('/blog')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-neutral-50 text-neutral-900 font-bold rounded-xl border-2 border-neutral-200 hover:border-[#BD7C48] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <span>عرض جميع المقالات</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
