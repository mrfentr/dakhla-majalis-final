'use client';

import { LandingNavbar, LandingFooter } from '@/components/landing';
import { Shield, Lock, Eye, Database, UserCheck, FileText, Phone, Mail } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('privacy');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <Shield className="w-4 h-4 text-[#BD7C48]" />
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
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.dataController.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.dataController.description', { company: t('sections.dataController.company') })}
                </p>
                <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                  <p><strong>{t('sections.dataController.tradeName')}</strong> {t('sections.dataController.tradeNameValue')}</p>
                  <p><strong>{t('sections.dataController.address')}</strong> {t('sections.dataController.addressValue')}</p>
                  <p><strong>{t('sections.dataController.email')}</strong> {t('sections.dataController.emailValue')}</p>
                  <p><strong>{t('sections.dataController.phone')}</strong> <span dir="ltr">{t('sections.dataController.phoneValue')}</span></p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.dataCollection.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('sections.dataCollection.description')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataCollection.identityInfo')}</strong> {t('sections.dataCollection.identityInfoDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataCollection.contactInfo')}</strong> {t('sections.dataCollection.contactInfoDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataCollection.orderInfo')}</strong> {t('sections.dataCollection.orderInfoDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataCollection.technicalData')}</strong> {t('sections.dataCollection.technicalDataDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.dataUsage.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('sections.dataUsage.description')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataUsage.orderProcessing')}</strong> {t('sections.dataUsage.orderProcessingDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataUsage.communication')}</strong> {t('sections.dataUsage.communicationDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataUsage.improvement')}</strong> {t('sections.dataUsage.improvementDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataUsage.legalCompliance')}</strong> {t('sections.dataUsage.legalComplianceDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.legalBasis.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('sections.legalBasis.description')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.legalBasis.consent')}</strong> {t('sections.legalBasis.consentDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.legalBasis.contractExecution')}</strong> {t('sections.legalBasis.contractExecutionDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.legalBasis.legitimateInterest')}</strong> {t('sections.legalBasis.legitimateInterestDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.dataSharing.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.dataSharing.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataSharing.serviceProviders')}</strong> {t('sections.dataSharing.serviceProvidersDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataSharing.legalObligations')}</strong> {t('sections.dataSharing.legalObligationsDesc')}</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-900">
                    <strong>{t('sections.dataSharing.importantNote')}</strong> {t('sections.dataSharing.importantNoteDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.yourRights.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>{t('sections.yourRights.description')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.yourRights.accessRight')}</strong> {t('sections.yourRights.accessRightDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.yourRights.rectificationRight')}</strong> {t('sections.yourRights.rectificationRightDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.yourRights.deletionRight')}</strong> {t('sections.yourRights.deletionRightDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.yourRights.objectionRight')}</strong> {t('sections.yourRights.objectionRightDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.yourRights.portabilityRight')}</strong> {t('sections.yourRights.portabilityRightDesc')}</p>
                  </div>
                </div>
                <p className="mt-4">
                  {t('sections.yourRights.exerciseRights', { email: 'contact@dakhlamajalis.com' })}
                </p>
              </div>
            </div>

            {/* Section 7 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.dataSecurity.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.dataSecurity.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.dataSecurity.encryption')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.dataSecurity.secureStorage')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.dataSecurity.accessControl')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p>{t('sections.dataSecurity.securityReviews')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 8 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.dataRetention.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.dataRetention.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataRetention.orderData')}</strong> {t('sections.dataRetention.orderDataDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataRetention.accountData')}</strong> {t('sections.dataRetention.accountDataDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.dataRetention.technicalData')}</strong> {t('sections.dataRetention.technicalDataDesc')}</p>
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
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.cookies.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.cookies.description')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.cookies.essentialCookies')}</strong> {t('sections.cookies.essentialCookiesDesc')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#BD7C48] mt-2 flex-shrink-0"></div>
                    <p><strong>{t('sections.cookies.functionalCookies')}</strong> {t('sections.cookies.functionalCookiesDesc')}</p>
                  </div>
                </div>
                <p className="mt-4">
                  {t('sections.cookies.cookieControl')}
                </p>
              </div>
            </div>

            {/* Section 10 */}
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
              </div>
            </div>

            {/* Section 11 - CNDP */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.complaint.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.complaint.description')}
                </p>
                <div className="bg-neutral-50 rounded-xl p-6 space-y-3">
                  <p><strong>{t('sections.complaint.cndpName')}</strong></p>
                  <p>{t('sections.complaint.cndpAddress')}</p>
                  <p>{t('sections.complaint.cndpPhone')} <span dir="ltr">{t('sections.complaint.cndpPhoneValue')}</span></p>
                  <p>{t('sections.complaint.cndpEmail')}</p>
                  <p>{t('sections.complaint.cndpWebsite')} <a href="https://www.cndp.ma" target="_blank" rel="noopener noreferrer" className="text-[#BD7C48] hover:underline">www.cndp.ma</a></p>
                </div>
              </div>
            </div>

            {/* Section 12 */}
            <div className="bg-white border-2 border-neutral-100 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#BD7C48]" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900">{t('sections.policyUpdates.title')}</h2>
              </div>
              <div className="space-y-4 text-neutral-700 leading-relaxed">
                <p>
                  {t('sections.policyUpdates.content1')}
                </p>
                <p>
                  {t('sections.policyUpdates.content2')}
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
