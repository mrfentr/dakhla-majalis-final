'use client';

import { LandingNavbar, LandingFooter } from '@/components/landing';
import { FileText, ShoppingBag, Truck, RotateCcw, Shield, Scale, Phone, Mail } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('terms');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <FileText className="w-4 h-4 text-[#BD7C48]" />
            <span className="text-sm font-bold text-[#BD7C48]">{t('badge')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-neutral-900 mb-6">
            {t('title')}
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            {t('intro')}
          </p>
          <p className="text-sm text-neutral-500 mt-4">
            {t('lastUpdated')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="space-y-12">

            {/* Section 1 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.generalInfo.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.generalInfo.description', { website: t('sections.generalInfo.website'), company: t('sections.generalInfo.company') })}
                </p>
                <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                  <p><strong>{t('sections.generalInfo.tradeName')}</strong> {t('sections.generalInfo.tradeNameValue')}</p>
                  <p><strong>{t('sections.generalInfo.address')}</strong> {t('sections.generalInfo.addressValue')}</p>
                  <p><strong>{t('sections.generalInfo.email')}</strong> {t('sections.generalInfo.emailValue')}</p>
                  <p><strong>{t('sections.generalInfo.phone')}</strong> <span dir="ltr">{t('sections.generalInfo.phoneValue')}</span></p>
                </div>
                <p>
                  {t('sections.generalInfo.governingLaw')}
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.services.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('sections.services.description')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.services.individualProducts')}</strong> {t('sections.services.individualProductsDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.services.customDesigns')}</strong> {t('sections.services.customDesignsDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.services.consultations')}</strong> {t('sections.services.consultationsDesc')}</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-900">
                    <strong>{t('sections.services.importantNote')}</strong> {t('sections.services.importantNoteDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.orderProcess.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('sections.orderProcess.description')}</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#BD7C48] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-bold text-neutral-900 mb-1">{t('sections.orderProcess.step1Title')}</p>
                      <p>{t('sections.orderProcess.step1Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#BD7C48] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-bold text-neutral-900 mb-1">{t('sections.orderProcess.step2Title')}</p>
                      <p>{t('sections.orderProcess.step2Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#BD7C48] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-bold text-neutral-900 mb-1">{t('sections.orderProcess.step3Title')}</p>
                      <p>{t('sections.orderProcess.step3Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#BD7C48] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                    <div>
                      <p className="font-bold text-neutral-900 mb-1">{t('sections.orderProcess.step4Title')}</p>
                      <p>{t('sections.orderProcess.step4Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#BD7C48] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">5</div>
                    <div>
                      <p className="font-bold text-neutral-900 mb-1">{t('sections.orderProcess.step5Title')}</p>
                      <p>{t('sections.orderProcess.step5Desc')}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4">
                  {t('sections.orderProcess.bindingNote')}
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.pricing.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.pricing.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.pricing.customization')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.pricing.finalPrice')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.pricing.taxInclusive')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.pricing.priceChange')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.delivery.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('sections.delivery.description')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.delivery.deliveryTime')}</strong> {t('sections.delivery.deliveryTimeDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.delivery.deliveryArea')}</strong> {t('sections.delivery.deliveryAreaDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.delivery.paymentMethod')}</strong> {t('sections.delivery.paymentMethodDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.delivery.deliveryCost')}</strong> {t('sections.delivery.deliveryCostDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.delivery.inspectionOnDelivery')}</strong> {t('sections.delivery.inspectionOnDeliveryDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.returnsAndExchanges.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.returnsAndExchanges.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.returnsAndExchanges.moneyBackGuarantee')}</strong> {t('sections.returnsAndExchanges.moneyBackGuaranteeDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.returnsAndExchanges.customProducts')}</strong> {t('sections.returnsAndExchanges.customProductsDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.returnsAndExchanges.returnConditions')}</strong> {t('sections.returnsAndExchanges.returnConditionsDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.returnsAndExchanges.refund')}</strong> {t('sections.returnsAndExchanges.refundDesc')}</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-900">
                    {t('sections.returnsAndExchanges.returnContact', { email: 'contact@dakhlamajalis.com', phone: '+212 657-059044' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 7 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.warranty.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.warranty.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.warranty.foamWarranty')}</strong> {t('sections.warranty.foamWarrantyDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.warranty.warrantyCoverage')}</strong> {t('sections.warranty.warrantyCoverageDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.warranty.warrantyExclusions')}</strong> {t('sections.warranty.warrantyExclusionsDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 8 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.liability.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.liability.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.liability.availability')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.liability.colorVariation')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.liability.indirectDamage')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.liability.limitedLiability')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 9 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.intellectualProperty.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.intellectualProperty.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.intellectualProperty.noCopy')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.intellectualProperty.noLogoUse')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.intellectualProperty.noCommercialUse')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 10 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Scale className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.disputes.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.disputes.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.disputes.amicable')}</strong> {t('sections.disputes.amicableDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.disputes.mediation')}</strong> {t('sections.disputes.mediationDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.disputes.jurisdiction')}</strong> {t('sections.disputes.jurisdictionDesc')}</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                  <p className="text-sm">
                    <strong>{t('sections.disputes.consumerProtection')}</strong> {t('sections.disputes.consumerProtectionDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 11 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.contactUs.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.contactUs.description')}
                </p>
                <div className="bg-neutral-50 rounded-xl p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#BD7C48]" />
                    <a href="mailto:contact@dakhlamajalis.com" className="text-[#BD7C48] font-bold hover:underline">
                      contact@dakhlamajalis.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#BD7C48]" />
                    <a href="tel:+212657059044" className="text-[#BD7C48] font-bold hover:underline" dir="ltr">
                      +212 657 059 044
                    </a>
                  </div>
                </div>
                <p className="text-sm text-neutral-600">
                  {t('sections.contactUs.availability')}
                </p>
              </div>
            </div>

            {/* Section 12 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.termsModification.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.termsModification.content1')}
                </p>
                <p>
                  {t('sections.termsModification.content2')}
                </p>
                <p>
                  {t('sections.termsModification.content3')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
