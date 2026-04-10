import { Award, Users, Star, Trophy } from 'lucide-react';
import Image from 'next/image';

export function HeritageSection() {
  return (
    <section id="heritage" className="relative py-24 bg-gradient-to-b from-white to-neutral-50 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#BD7C48]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#BD7C48]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Content */}
          <div className="space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#BD7C48]/10 rounded-full">
              <Award className="w-5 h-5 text-[#BD7C48]" />
              <span className="text-sm font-bold text-[#BD7C48]">الأصالة والتراث</span>
            </div>

            {/* Heading */}
            <div>
              <h2 className="text-4xl lg:text-5xl font-black text-neutral-900 leading-tight">
                من الداخلة إلى
                <span className="block text-[#BD7C48] mt-2">الإشعاع الوطني</span>
              </h2>
            </div>

            {/* Description */}
            <p className="text-xl text-neutral-700 leading-relaxed">
              من قلب الداخلة، نحافظ على أصالة الصناعة التقليدية للجلسات الصحراوية. كل جلسة نصنعها تحمل روح الصحراء المغربية وتراث الأقاليم الجنوبية.
            </p>

            {/* Simple Stats */}
            <div className="flex flex-wrap gap-8 pt-6">
              <div>
                <div className="text-4xl font-black text-[#BD7C48] mb-1">25 سنة</div>
                <div className="text-sm text-neutral-600 font-medium">ضمان على البونج</div>
              </div>

              <div>
                <div className="text-4xl font-black text-[#BD7C48] mb-1">10-15 يوم</div>
                <div className="text-sm text-neutral-600 font-medium">مدة التوصيل</div>
              </div>

              <div>
                <div className="text-4xl font-black text-[#BD7C48] mb-1">100%</div>
                <div className="text-sm text-neutral-600 font-medium">صناعة مغربية</div>
              </div>
            </div>
          </div>

          {/* Right Side - Image Grid */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-6">
              {/* Large Image */}
              <div className="col-span-2 relative h-80 rounded-2xl overflow-hidden shadow-xl group">
                <Image
                  src="https://ik.imagekit.io/fentr/dakhla%20majalis/20250206_185415.jpg?tr=w-1200,f-auto,q-85"
                  alt="Moroccan majlis heritage"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  quality={85}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Small Images */}
              <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group">
                <Image
                  src="https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1513.JPG?tr=w-600,f-auto,q-85"
                  alt="Traditional crafts"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  quality={85}
                  loading="lazy"
                />
              </div>

              <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group">
                <Image
                  src="https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1522.JPG?tr=w-600,f-auto,q-85"
                  alt="Moroccan patterns"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  quality={85}
                  loading="lazy"
                />
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-2xl p-6 border border-neutral-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#BD7C48]/10 rounded-xl flex items-center justify-center">
                  <Award className="w-7 h-7 text-[#BD7C48]" />
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-neutral-900">تراث أصيل</div>
                  <div className="text-xs text-neutral-600">صنع في المغرب</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
