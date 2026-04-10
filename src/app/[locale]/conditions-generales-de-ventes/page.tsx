'use client';

import { LandingNavbar, LandingFooter } from '@/components/landing';
import { FileText, ShoppingCart, CreditCard, Package, Edit3, Shield } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export default function CGVPage() {
  const t = useTranslations('cgv');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 md:pb-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <FileText className="w-4 h-4 text-[#BD7C48]" />
            <span className="text-sm font-bold text-[#BD7C48]">{t('badge')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-neutral-900 mb-6">
            {t('title')}
          </h1>
          <p className="text-base md:text-lg text-neutral-600 max-w-2xl mx-auto">
            {t('intro')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 md:space-y-12">

            {/* Section 1 - Purpose */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('s1Title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed text-sm md:text-base">
                <p className="break-words">{t('s1Desc')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s1Item1')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s1Item2')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s1Item3')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s1Item4')}</p>
                  </div>
                </div>
                <p className="mt-4 text-neutral-600 italic break-words">{t('s1Note')}</p>
              </div>
            </div>

            {/* Section 2 - Order Process */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('s2Title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed text-sm md:text-base">
                <p className="break-words">{t('s2Desc')}</p>
              </div>
            </div>

            {/* Section 3 - Payment Terms */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('s3Title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed text-sm md:text-base">
                <p className="break-words">{t('s3Desc')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s3Item1')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s3Item2')}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 md:p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs md:text-sm text-amber-900 break-words">
                    {t('s3Note')}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 - Product Availability */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('s4Title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed text-sm md:text-base">
                <p className="break-words">{t('s4Desc')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s4Item1')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s4Item2')}</p>
                  </div>
                </div>
                <p className="mt-4 text-neutral-600 italic break-words">{t('s4Note')}</p>
              </div>
            </div>

            {/* Section 5 - Order Modification */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Edit3 className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('s5Title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed text-sm md:text-base">
                <p className="break-words">{t('s5Desc')}</p>
              </div>
            </div>

            {/* Section 6 - Fraud Protection */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('s6Title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed text-sm md:text-base">
                <p className="break-words">{t('s6Desc')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s6Item1')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s6Item2')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p className="break-words">{t('s6Item3')}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 md:p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs md:text-sm text-amber-900 break-words">
                    {t('s6Note')}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
