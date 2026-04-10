import {setRequestLocale} from 'next-intl/server';
import {
  LandingNavbar,
  LandingAboutUs,
  LandingFooter,
} from '@/components/landing';

type Props = {
  params: Promise<{locale: string}>;
};

export default async function AboutPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  return (
    <div
      className="min-h-screen w-full max-w-full"
      style={{
        fontFamily: "'Noto Naskh Arabic', serif",
        backgroundColor: '#FDFBF7',
        overflowX: 'hidden',
      }}
    >
      <LandingNavbar />
      <LandingAboutUs />
      <LandingFooter />
    </div>
  );
}
