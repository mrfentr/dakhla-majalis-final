'use client';

import { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'كم من الوقت يستغرق تصنيع وتوصيل المجلس؟',
      answer: 'مدة تسليم الجلسة الصحراوية من 10 إلى 15 يوم ابتداء من تاريخ التوصل بالتسبيق. نحرص على الجودة العالية في كل مرحلة من مراحل التصنيع.'
    },
    {
      question: 'كيف تتم عملية الدفع والتوصيل؟',
      answer: 'الدفع على مرحلتين: تسبيق 50% عبر حسابنا البنكي، و50% المتبقية يتم أداؤها لشركة التوصيل "أمانة" عند الاستلام. مصاريف التوصيل رمزية 100 درهم فقط ويتم أداؤها عند التوصل بالبونج.'
    },
    {
      question: 'ما هي المواد المستخدمة في صناعة المجالس؟',
      answer: 'نستخدم توب قطني منسوج راقي وبونج دوليدول HD 5 Bassmat - جودة رقم 1 مع ضمان 25 سنة. الجلسة الصحراوية الأصيلة لا يمكن أن تصنع إلا بخامات أصيلة.'
    },
    {
      question: 'ما هي مقاسات الجلسة الصحراوية؟',
      answer: 'نصنع جلسات صحراوية أرضية ارتفاعها 15 سم وعرضها 70 سم. إذا كنتم تريدون جلسة بارتفاع أكثر من 15 سم يمكنكم وضع الجلسة على خشب مرتفع.'
    },
    {
      question: 'هل يمكنني إرجاع المجلس إذا لم يعجبني؟',
      answer: 'نعم، لتشجيعكم على الطلب من عندنا نعطيكم الحق في استرجاع نقودكم كاملة إذا لم تعجبكم الجلسة الصحراوية داخل أجل 3 أيام من تاريخ التسليم.'
    },
    {
      question: 'هل يمكنني معاينة جودة المواد قبل الطلب؟',
      answer: 'بخصوص البونج: يمكنكم سؤال أقرب صانع أفرشة عن جودة بونج HD Dolidol 5 Bassmat. بخصوص التوب: يمكننا أن نرسل لكم عينة من التوب لمعاينة الجودة.'
    },
    {
      question: 'كيف أعتني بالمجلس الصحراوي؟',
      answer: 'يُفضل غسل الأقمشة بعد قلبها على الوجه الداخلي، باستخدام ماء بارد أو بدرجة حرارة لا تتجاوز 30 درجة مئوية. يُمنع استخدام آلة التجفيف، ويُفضل ترك الأقمشة لتجف طبيعيًا. يُرجى تجنب وخز القماش أو سحبه بالأدوات الحادة، حفاظًا على نسيجه الفاخر ولمعانه الطبيعي.'
    },
    {
      question: 'هل يمكن استخدام المجالس في الداخل أو الخارج؟',
      answer: 'تُصنع منتجاتنا يدويًا بجودة عالية لتناسب مختلف الفضاءات مثل الصالونات، الخيام، المطاعم، المكاتب ما يجعلها مثالية للاستخدام الداخلي أو الخارجي. يمكن استخدامها في الصالون، السيجور، البالكون، الخيمة، أو الجردة.'
    }
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-white to-neutral-50 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#BD7C48]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#BD7C48]/5 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <MessageCircle className="w-4 h-4 text-[#BD7C48]" />
            <span className="text-sm font-bold text-[#BD7C48]">الأسئلة الشائعة</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-neutral-900 mb-4">
            أسئلة يطرحها العملاء
          </h2>
          <p className="text-xl text-neutral-600">
            إجابات واضحة لكل ما تحتاج معرفته
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl border-2 border-neutral-200 hover:border-[#BD7C48]/30 transition-all duration-300 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-right transition-all"
              >
                <span className="text-lg font-bold text-neutral-900 group-hover:text-[#BD7C48] transition-colors pr-4">
                  {faq.question}
                </span>
                <div
                  className={`w-10 h-10 bg-neutral-100 group-hover:bg-[#BD7C48]/10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180 bg-[#BD7C48]/10' : ''
                  }`}
                >
                  <ChevronDown
                    className={`w-5 h-5 transition-colors ${
                      openIndex === index ? 'text-[#BD7C48]' : 'text-neutral-600'
                    }`}
                  />
                </div>
              </button>
              <div
                className={`transition-all duration-300 ease-in-out ${
                  openIndex === index
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6 pr-10">
                  <div className="h-px bg-neutral-200 mb-4" />
                  <p className="text-base text-neutral-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-neutral-600 mb-4">لديك سؤال آخر؟</p>
          <a
            href="tel:+212657059044"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <MessageCircle className="w-5 h-5" />
            <span>تواصل معنا مباشرة</span>
          </a>
        </div>
      </div>
    </section>
  );
}
