'use client';

// HeroSection - Main landing section for Dakhla Majalis

import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Star, Clock, CheckCircle2, Award } from 'lucide-react';
import Image from 'next/image';

export function HeroSection() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('home.hero');
  const isRtl = locale === 'ar';

  const handleMeasureClick = () => {
    router.push(`/${locale}/checkout`);
  };

  const handleViewProducts = () => {
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="relative pt-24 pb-32 overflow-hidden bg-gradient-to-b from-white via-neutral-50/30 to-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(189,124,72,0.04),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.15fr,1fr] gap-16 lg:gap-24 items-center">
          {/* Content */}
          <div className={`text-center ${isRtl ? 'lg:text-right' : 'lg:text-left'} space-y-8`}>
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-[#BD7C48]/8 to-[#BD7C48]/4 rounded-full border border-[#BD7C48]/10">
              <Award className="w-4 h-4 text-[#BD7C48]" />
              <span className="text-sm font-semibold text-[#BD7C48] tracking-wide">{t('badge')}</span>
            </div>

            {/* Heading with enhanced typography */}
            <div className="space-y-8 pb-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[72px] font-black text-neutral-900 leading-[1.05] tracking-tight">
                {t('titleLine1')}
              </h1>
              <h1 className={`text-4xl sm:text-5xl lg:text-[72px] font-black leading-[1.05] tracking-tight ${isRtl ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-[#BD7C48] to-[#9A6439] bg-clip-text text-transparent pb-2`}>
                {t('titleLine2')}
              </h1>
            </div>

            {/* Description with perfect contrast */}
            <div className="space-y-3 max-w-xl mx-auto lg:mx-0">
              <p className="text-lg sm:text-xl text-neutral-800 leading-relaxed font-semibold">
                {t('subtitle')}
              </p>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                {t('description')}
              </p>
            </div>

            {/* Enhanced CTA Buttons */}
            <div className={`flex flex-col sm:flex-row flex-wrap items-center justify-center ${isRtl ? 'lg:justify-start' : 'lg:justify-start'} gap-4 pt-4`}>
              <Button
                onClick={handleMeasureClick}
                className="w-full sm:w-auto h-14 px-10 bg-[#BD7C48] hover:bg-[#A0673D] text-white text-base font-bold rounded-xl transition-all shadow-lg shadow-[#BD7C48]/25 hover:shadow-xl hover:shadow-[#BD7C48]/35 hover:-translate-y-1"
              >
                {t('ctaPrimary')}
                {isRtl ? <ArrowLeft className="w-5 h-5 mr-2" /> : <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
              <button
                onClick={handleViewProducts}
                className="w-full sm:w-auto h-14 px-10 bg-white hover:bg-neutral-50 text-neutral-900 text-base font-semibold rounded-xl border-2 border-neutral-200 hover:border-[#BD7C48] transition-all shadow-sm hover:shadow-md"
              >
                {t('ctaSecondary')}
              </button>
            </div>

            {/* Enhanced Social Proof */}
            <div className={`flex flex-wrap items-center justify-center ${isRtl ? 'lg:justify-start' : 'lg:justify-start'} gap-8 pt-4`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="text-sm font-bold text-neutral-900">{t('socialProof1Title')}</div>
                  <div className="text-xs text-neutral-600">{t('socialProof1Sub')}</div>
                </div>
              </div>
              <div className="hidden sm:block h-12 w-px bg-neutral-200" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-[#BD7C48] fill-[#BD7C48]" />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="text-sm font-bold text-neutral-900">{t('socialProof2Title')}</div>
                  <div className="text-xs text-neutral-600">{t('socialProof2Sub')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Visual - Enhanced */}
          <div className="relative lg:mr-[-4rem]">
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-[#BD7C48]/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-[#BD7C48]/5 rounded-full blur-3xl" />

            {/* Main Image Container */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-neutral-200/50 group">
                <Image
                  src="https://ik.imagekit.io/fentr/dakhla%20majalis/20250119_133300.jpg?tr=w-1600,f-auto,q-90"
                  alt={t('titleLine1')}
                  width={800}
                  height={600}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                  quality={90}
                />

                {/* Clean Overlay Badge */}
                <div className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} bg-[#BD7C48] backdrop-blur-sm px-5 py-2.5 rounded-xl shadow-lg transition-transform duration-300 hover:scale-105`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold text-white">{t('delivery')}</span>
                  </div>
                </div>
              </div>

              {/* Clean Floating Card */}
              <div className={`hidden lg:block absolute -bottom-6 ${isRtl ? '-left-6' : '-right-6'} bg-white rounded-xl shadow-2xl p-5 border border-neutral-100 min-w-[220px] transition-all duration-300 hover:shadow-3xl hover:-translate-y-1`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <CheckCircle2 className="w-6 h-6 text-[#BD7C48]" />
                  </div>
                  <div className={isRtl ? 'text-right' : 'text-left'}>
                    <div className="text-sm font-black text-neutral-900 mb-0.5">{t('guarantee')}</div>
                    <div className="text-xs text-neutral-600 font-medium">{t('guaranteeSub')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
