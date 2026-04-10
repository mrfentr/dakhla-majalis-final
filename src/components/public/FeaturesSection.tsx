import { Clock, CheckCircle2, Award, Sparkles, Zap, Shield } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 bg-white overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#BD7C48]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#BD7C48]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#BD7C48]" />
            <span className="text-sm font-bold text-[#BD7C48]">مميزات فريدة</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-neutral-900 mb-4">
            لماذا الداخلة مجالس؟
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            الجودة والأصالة في كل تفصيلة
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Shield,
              color: 'from-[#BD7C48] to-[#A0673D]',
              title: 'ضمان 25 سنة',
              description: 'بونج دوليدول HD 5 Bassmat بأفضل جودة وضمان طويل المدى',
              highlight: '25 سنة ضمان'
            },
            {
              icon: CheckCircle2,
              color: 'from-[#BD7C48] to-[#A0673D]',
              title: 'استرجاع المال',
              description: 'لديك 3 أيام لاسترجاع مقودك كاملة إذا لم تعجبك الجلسة',
              highlight: '3 أيام'
            },
            {
              icon: Award,
              color: 'from-[#BD7C48] to-[#A0673D]',
              title: 'توب قطني راقي',
              description: 'قماش منسوج بجودة عالية مع حشوة دوليدول الأصلية',
              highlight: 'جودة استثنائية'
            },
            {
              icon: Sparkles,
              color: 'from-[#BD7C48] to-[#A0673D]',
              title: 'سهولة العناية',
              description: 'غسل بماء بارد (30°) وتجفيف طبيعي. مناسب للاستخدام الداخلي والخارجي',
              highlight: 'عناية بسيطة'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-white to-neutral-50 rounded-3xl p-8 border border-neutral-200 hover:border-[#BD7C48] hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
            >
              {/* Icon with gradient background */}
              <div className={`relative w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <feature.icon className="w-10 h-10 text-white" />

                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
              </div>

              {/* Highlight Badge */}
              <div className="inline-block px-3 py-1 bg-[#BD7C48]/10 rounded-full mb-4">
                <span className="text-xs font-bold text-[#BD7C48]">{feature.highlight}</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-black text-neutral-900 mb-3 group-hover:text-[#BD7C48] transition-colors duration-300">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-neutral-700 leading-relaxed text-base">
                {feature.description}
              </p>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#BD7C48] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
