import {setRequestLocale} from 'next-intl/server';
import dynamic from 'next/dynamic';
import {
  LandingNavbar,
  LandingHero,
  LandingProducts,
} from '@/components/landing';

// Dynamically import below-the-fold / heavy components
const LandingCoupDeCoeur = dynamic(
  () => import('@/components/landing/LandingCoupDeCoeur').then(mod => mod.LandingCoupDeCoeur),
  {
    loading: () => <div className="min-h-[400px]" />,
  }
);

const LandingHowItWorks = dynamic(
  () => import('@/components/landing/LandingHowItWorks').then(mod => mod.LandingHowItWorks),
  {
    loading: () => <div className="min-h-[400px]" />,
  }
);

const LandingGallery = dynamic(
  () => import('@/components/landing/LandingGallery').then(mod => mod.LandingGallery),
  {
    loading: () => <div className="min-h-[500px]" />,
  }
);

const LandingFAQ = dynamic(
  () => import('@/components/landing/LandingFAQ').then(mod => mod.LandingFAQ),
  {
    loading: () => <div className="min-h-[300px]" />,
  }
);

const LandingCTA = dynamic(
  () => import('@/components/landing/LandingCTA').then(mod => mod.LandingCTA),
  {
    loading: () => <div className="min-h-[200px]" />,
  }
);

const LandingFooter = dynamic(
  () => import('@/components/landing/LandingFooter').then(mod => mod.LandingFooter),
  {
    loading: () => <div className="min-h-[200px]" />,
  }
);

type Props = {
  params: Promise<{locale: string}>;
};

export default async function LocalePage({params}: Props) {
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
      <LandingHero />
      <LandingProducts />
      <LandingCoupDeCoeur />
      <LandingHowItWorks />
      <LandingGallery />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
