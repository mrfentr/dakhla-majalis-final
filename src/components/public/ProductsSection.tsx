'use client';

import Image from 'next/image';
import { ArrowLeft, Star, Ruler, Loader2, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGetProducts, useGetCategories } from '@/hooks/useConvex';
import { useCart } from '@/contexts/CartContext';
import { useLocale } from 'next-intl';
import { getLocalizedField } from '@/lib/utils';

export function ProductsSection() {
  const router = useRouter();
  const { addItem } = useCart();
  const locale = useLocale();

  // Fetch products and categories from Convex
  const dbProducts = useGetProducts();
  const dbCategories = useGetCategories({ activeOnly: true });

  // Filter out mandatory products
  const visibleProducts = dbProducts
    ? dbProducts.filter(product => !product.isMandatory)
    : [];

  // Sort categories by order
  const sortedCategories = dbCategories
    ? [...dbCategories].sort((a, b) => a.order - b.order)
    : [];

  // Loading state
  if (dbProducts === undefined || dbCategories === undefined) {
    return (
      <section className="relative py-24 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#BD7C48] animate-spin mx-auto mb-4" />
            <p className="text-neutral-600">جاري تحميل المنتجات...</p>
          </div>
        </div>
      </section>
    );
  }

  const handleProductClick = (product: (typeof visibleProducts)[number]) => {
    if (product.productType !== 'majalis_set' && product.slug) {
      router.push(`/product/${product.slug}`);
    } else {
      router.push(`/checkout?product=${product._id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: (typeof visibleProducts)[number]) => {
    e.stopPropagation();
    if (product.productType !== 'majalis_set') {
      addItem({
        id: product.slug || product.title.ar,
        name: getLocalizedField(product.title, locale),
        price: product.pricing.basePrice,
        image: product.image,
        size: product.specifications?.glassat?.width
          ? `${product.specifications.glassat.width} سم`
          : product.specifications?.wsayd?.optimalWidth
            ? `${product.specifications.wsayd.optimalWidth.min}-${product.specifications.wsayd.optimalWidth.max} سم`
            : 'حسب المساحة',
      });
    }
  };

  // Group products by category slug
  const productsByCategory = sortedCategories
    .map(category => ({
      category,
      products: visibleProducts.filter(p => p.category === category.slug),
    }))
    .filter(group => group.products.length > 0);

  return (
    <section id="products-section" className="relative py-24 bg-gradient-to-b from-neutral-50 to-white overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#BD7C48]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-[#BD7C48]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48]/10 rounded-full mb-6">
            <Star className="w-4 h-4 text-[#BD7C48] fill-[#BD7C48]" />
            <span className="text-sm font-bold text-[#BD7C48]">صنع في الداخلة</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-neutral-900 mb-4">
            منتجاتنا من قلب الصحراء
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            جلسات صحراوية أرضية، خيام شعر تقليدية، وأكسسوارات منزلية. نبدع دائماً لعشاق التراث المغربي.
          </p>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-20">
          {sortedCategories.map((category) => (
            <div
              key={category._id}
              onClick={() => router.push(`/products/${category.slug}`)}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Background Image */}
              {category.image ? (
                <Image
                  src={category.image}
                  alt={getLocalizedField(category.name, locale)}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#BD7C48] to-[#8B5A2B]" />
              )}

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 group-hover:from-black/80 group-hover:via-black/40 transition-all duration-500" />

              {/* Category name centered */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <h3 className="text-xl md:text-2xl font-black text-white text-center drop-shadow-lg">
                  {getLocalizedField(category.name, locale)}
                </h3>
                <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-sm font-bold text-white/90">تصفح المنتجات</span>
                  <ArrowLeft className="w-4 h-4 text-white/90" />
                </div>
              </div>

              {/* Accent border on hover */}
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[#BD7C48]/60 transition-all duration-500" />
            </div>
          ))}
        </div>

        {/* Products by Category Section */}
        {productsByCategory.length > 0 && (
          <div className="mb-16 space-y-12">
            {productsByCategory.map(({ category, products }) => (
              <div key={category._id}>
                {/* Category heading */}
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-2xl md:text-3xl font-black text-neutral-900">
                    {getLocalizedField(category.name, locale)}
                  </h3>
                  <div className="flex-1 h-px bg-neutral-200" />
                  <button
                    onClick={() => router.push(`/products/${category.slug}`)}
                    className="text-sm font-bold text-[#BD7C48] hover:text-[#A0673D] flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    عرض الكل
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Horizontal scrollable product cards */}
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                  {products.map((product) => {
                    const isPattern = product.productType === 'majalis_set';
                    const priceDisplay = isPattern
                      ? 'يحسب تلقائياً'
                      : product.pricing.basePrice.toLocaleString();

                    return (
                      <div
                        key={product._id}
                        onClick={() => handleProductClick(product)}
                        className="group/card flex-shrink-0 w-[220px] md:w-[260px] bg-white rounded-xl overflow-hidden border border-neutral-200 hover:border-[#BD7C48]/40 hover:shadow-xl transition-all duration-300 cursor-pointer"
                      >
                        {/* Product Image */}
                        <div className="relative h-40 md:h-48 overflow-hidden">
                          <Image
                            src={product.image}
                            alt={getLocalizedField(product.title, locale)}
                            fill
                            className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                          />
                          {product.isPopular && (
                            <div className="absolute top-2 right-2 px-2 py-1 bg-[#BD7C48] rounded-md">
                              <span className="text-[10px] font-black text-white">الأكثر طلباً</span>
                            </div>
                          )}
                          {isPattern && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-br from-amber-500 to-amber-600 rounded-md">
                              <span className="text-[10px] font-black text-white">مجلس كامل</span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-3 md:p-4">
                          <h4 className="text-sm md:text-base font-bold text-neutral-900 mb-2 line-clamp-2 group-hover/card:text-[#BD7C48] transition-colors">
                            {getLocalizedField(product.title, locale)}
                          </h4>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-[#BD7C48]">{priceDisplay}</span>
                                {!isPattern && (
                                  <span className="text-xs text-neutral-500">درهم</span>
                                )}
                              </div>
                            </div>
                            {!isPattern ? (
                              <button
                                onClick={(e) => handleAddToCart(e, product)}
                                className="w-8 h-8 bg-[#BD7C48] hover:bg-[#A0673D] rounded-lg flex items-center justify-center transition-all hover:scale-110 shadow-md"
                                aria-label="أضف إلى السلة"
                              >
                                <ShoppingCart className="w-4 h-4 text-white" />
                              </button>
                            ) : (
                              <div className="w-8 h-8 bg-[#BD7C48] group-hover/card:bg-[#A0673D] rounded-lg flex items-center justify-center transition-all shadow-md">
                                <ArrowLeft className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center bg-gradient-to-br from-neutral-50 to-white rounded-2xl border border-neutral-200 p-8">
          <h3 className="text-2xl font-black text-neutral-900 mb-3">
            تريد مجلس حسب مساحتك؟
          </h3>
          <p className="text-neutral-600 mb-6">
            استخدم أداة القياس لحساب المجلس المناسب لصالونك
          </p>
          <button
            onClick={() => router.push('/checkout')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <span>احسب مجلسك الآن</span>
            <Ruler className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
