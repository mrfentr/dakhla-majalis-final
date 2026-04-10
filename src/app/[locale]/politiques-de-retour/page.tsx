'use client';

import { LandingNavbar, LandingFooter } from '@/components/landing';
import { RotateCcw, CheckCircle2, Phone, Clock, Package } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export default function ReturnPolicyPage() {
  const t = useTranslations('returnPolicy');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-10 md:pb-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <RotateCcw className="w-4 h-4 text-[#BD7C48]" />
            <span className="text-sm font-bold text-[#BD7C48]">{t('badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 mb-4 md:mb-6">
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

            {/* Main Policy Statement */}
            <div className="bg-[#BD7C48]/5 border-2 border-[#BD7C48]/20 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('title')}</h2>
              </div>
              <div className="text-neutral-700 leading-relaxed">
                <p className="text-base md:text-lg font-semibold">{t('mainPolicy')}</p>
              </div>
            </div>

            {/* Conditions Section */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('conditionsTitle')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#BD7C48]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#BD7C48]">1</span>
                    </div>
                    <p>{t('condition1')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#BD7C48]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#BD7C48]">2</span>
                    </div>
                    <p>{t('condition2')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#BD7C48]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#BD7C48]">3</span>
                    </div>
                    <p>{t('condition3')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Info */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900">{t('customerService')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('support')}</p>
                <div className="bg-neutral-50 rounded-xl p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#BD7C48] flex-shrink-0" />
                    <a href="tel:+212657059044" className="text-[#BD7C48] font-bold hover:underline min-h-[44px] flex items-center" dir="ltr">
                      +212 657 059 044
                    </a>
                  </div>
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
