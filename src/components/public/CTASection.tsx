'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export function CTASection() {
  const router = useRouter();

  const handleMeasureClick = () => {
    router.push('/checkout');
  };

  return (
    <section className="relative py-20 lg:py-24 bg-gradient-to-br from-[#BD7C48] to-[#A0673D] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_50%)]" />

      {/* Floating Images - 2 on each side, fully visible */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block z-20">
        {/* LEFT SIDE - Image 1 (Top) */}
        <div className="absolute top-16 left-8 w-48 h-48 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 rotate-[-12deg] hover:rotate-[-8deg] hover:scale-105 border-4 border-white">
          <Image
            src="https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1525.JPG?tr=w-384,f-auto,q-85"
            alt="Traditional Moroccan majlis"
            fill
            sizes="192px"
            className="object-cover"
            quality={85}
            loading="lazy"
          />
        </div>

        {/* LEFT SIDE - Image 2 (Bottom) */}
        <div className="absolute bottom-16 left-12 w-44 h-44 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 rotate-[8deg] hover:rotate-[12deg] hover:scale-105 border-4 border-white">
          <Image
            src="https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1528.JPG?tr=w-352,f-auto,q-85"
            alt="Moroccan interior design"
            fill
            sizes="176px"
            className="object-cover"
            quality={85}
            loading="lazy"
          />
        </div>

        {/* RIGHT SIDE - Image 1 (Top) */}
        <div className="absolute top-16 right-8 w-52 h-52 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 rotate-[10deg] hover:rotate-[14deg] hover:scale-105 border-4 border-white">
          <Image
            src="https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1535.JPG?tr=w-416,f-auto,q-85"
            alt="Saharan majlis setup"
            fill
            sizes="208px"
            className="object-cover"
            quality={85}
            loading="lazy"
          />
        </div>

        {/* RIGHT SIDE - Image 2 (Bottom) */}
        <div className="absolute bottom-16 right-12 w-44 h-44 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 rotate-[-15deg] hover:rotate-[-10deg] hover:scale-105 border-4 border-white">
          <Image
            src="https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1540.JPG?tr=w-352,f-auto,q-85"
            alt="Moroccan handcraft details"
            fill
            sizes="176px"
            className="object-cover"
            quality={85}
            loading="lazy"
          />
        </div>
      </div>

      {/* Content with higher z-index */}
      <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center z-30">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-5 lg:mb-6 leading-tight">
          جاهز لتصميم مجلسك؟
        </h2>
        <p className="text-lg md:text-xl text-white/95 mb-8 lg:mb-10 max-w-2xl mx-auto leading-relaxed">
          من قلب الداخلة، احصل على مجلس صحراوي أصيل بجودة استثنائية وضمان 25 سنة
        </p>
        <Button
          onClick={handleMeasureClick}
          className="w-full sm:w-auto h-14 lg:h-16 px-10 lg:px-12 bg-white text-[#BD7C48] hover:bg-neutral-50 rounded-xl text-base lg:text-lg font-black transition-all shadow-2xl hover:shadow-3xl hover:-translate-y-1"
        >
          صمم مجلسك الآن
          <ArrowLeft className="w-5 h-5 mr-3" />
        </Button>
      </div>
    </section>
  );
}
