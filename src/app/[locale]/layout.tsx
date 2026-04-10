import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import { Suspense } from 'react';
import { CartSidebar } from '@/components/CartSidebar';
import { FloatingButtons } from '@/components/FloatingButtons';
import LocaleLoading from './loading';
import type { Metadata } from 'next';

import arMessages from '@/messages/ar.json';
import frMessages from '@/messages/fr.json';
import enMessages from '@/messages/en.json';

const allMessages: Record<string, typeof arMessages> = {
  ar: arMessages,
  fr: frMessages,
  en: enMessages,
};

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

const baseUrl = 'https://www.dakhlamajalis.com';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const messages = allMessages[locale] || allMessages.ar;
  const meta = messages.metadata;

  return {
    title: meta.home.title,
    description: meta.home.description,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        ar: `${baseUrl}/ar`,
        fr: `${baseUrl}/fr`,
        en: `${baseUrl}/en`,
        'x-default': `${baseUrl}/ar`,
      },
    },
    openGraph: {
      locale: locale === 'ar' ? 'ar_MA' : locale === 'fr' ? 'fr_MA' : 'en_US',
    },
  };
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = allMessages[locale] || allMessages.ar;

  const isRTL = locale === 'ar';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} lang={locale} className={isRTL ? 'font-arabic' : 'font-latin'}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Suspense fallback={<LocaleLoading />}>
          {children}
        </Suspense>
        <CartSidebar />
        <FloatingButtons />
      </NextIntlClientProvider>
    </div>
  );
}
