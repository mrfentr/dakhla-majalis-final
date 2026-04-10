'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LandingNavbar, LandingFooter } from '@/components/landing';
import {
  Package,
  Loader2,
  ShoppingCart,
  Check,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useGetCategories, useGetProducts, useGetActiveFabricVariants } from '@/hooks/useConvex';
import { useCart } from '@/contexts/CartContext';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { ProductImageCarousel } from '@/components/ProductImageCarousel';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedField } from '@/lib/utils';
import { useRouter as useI18nRouter } from '@/i18n/navigation';

type ProductType = 'individual' | 'pattern';

interface Product {
  productId?: string;
  name: string;
  description: string;
  category: string;
  size: string;
  price: string;
  image: string;
  images: string[];
  features: string[];
  popular: boolean;
  rating: number;
  type: ProductType;
  slug?: string;
  stockQuantity: number;
  subcategory?: string;
  isFabricVariant?: boolean;
  fabricVariantId?: string;
}

interface Props {
  categorySlug: string;
}

export default function CategorySubcategoriesContent({ categorySlug }: Props) {
  const t = useTranslations('products');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useI18nRouter();
  const nextRouter = useRouter();
  const searchParams = useSearchParams();

  // Redirect old ?sub= URLs to new route
  useEffect(() => {
    const sub = searchParams?.get('sub');
    if (sub) {
      nextRouter.replace(`/${locale}/products/${categorySlug}/${sub}`);
    }
  }, [searchParams, categorySlug, locale, nextRouter]);

  const dbCategories = useGetCategories({ activeOnly: true });
  const dbProducts = useGetProducts();
  const activeFabricVariants = useGetActiveFabricVariants();
  const { addItem } = useCart();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  // Find the parent category
  const parentCategory = (dbCategories ?? []).find(c => c.slug === categorySlug && !c.parentCategoryId);
  const categoryName = parentCategory ? getLocalizedField(parentCategory.name, locale) : categorySlug;

  // Get subcategories for this category
  const subcategories = parentCategory
    ? (dbCategories ?? []).filter(c => c.parentCategoryId === parentCategory._id)
    : [];

  // Build category ID → slug map
  const categoryIdToSlug = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of dbCategories ?? []) {
      map[cat._id] = cat.slug;
    }
    return map;
  }, [dbCategories]);

  // Count products per subcategory (including fabric variants)
  const productCountBySubcategory = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!dbProducts) return counts;

    for (const p of dbProducts) {
      if (p.category === categorySlug && p.subcategory && p.status === 'active' && !p.isMandatory) {
        counts[p.subcategory] = (counts[p.subcategory] || 0) + 1;
      }
    }

    // Count fabric variants too
    for (const fv of activeFabricVariants ?? []) {
      const subcatSlug = fv.subcategoryId ? categoryIdToSlug[fv.subcategoryId] : undefined;
      if (subcatSlug) {
        counts[subcatSlug] = (counts[subcatSlug] || 0) + 1;
      }
    }

    return counts;
  }, [dbProducts, activeFabricVariants, categoryIdToSlug, categorySlug]);

  // If no subcategories, show products directly (fallback)
  const hasSubcategories = subcategories.length > 0;

  // Build product list for fallback (no subcategories case)
  const products: Product[] = useMemo(() => {
    if (hasSubcategories || !dbProducts) return [];

    // Only exclude a product if its linked fabric variant will actually appear in fabricVariantCards
    const fabricVariantIdsInThisCategory = new Set(
      (activeFabricVariants ?? [])
        .filter(fv => {
          const catSlug = fv.categoryId ? categoryIdToSlug[fv.categoryId] : undefined;
          return catSlug === categorySlug;
        })
        .map(fv => fv._id)
    );
    const productsReplacedByFabricVariant = new Set(
      dbProducts
        .filter(p => p.fabricVariantId && fabricVariantIdsInThisCategory.has(p.fabricVariantId))
        .map(p => p._id)
    );

    const mappedProducts: Product[] = dbProducts
      .filter(product => !product.isMandatory && !productsReplacedByFabricVariant.has(product._id) && product.category === categorySlug && product.status === 'active')
      .map(product => {
        const isPattern = product.productType === 'majalis_set';
        const type: ProductType = isPattern ? 'pattern' : 'individual';
        const size = product.specifications?.glassat?.width
          ? `${product.specifications.glassat.width} ${t('size.cm')}`
          : product.specifications?.wsayd?.optimalWidth
            ? `${product.specifications.wsayd.optimalWidth.min}-${product.specifications.wsayd.optimalWidth.max} ${t('size.cm')}`
            : t('size.bySpace');

        return {
          productId: product._id,
          name: getLocalizedField(product.title, locale),
          description: getLocalizedField(product.description, locale),
          category: product.category,
          size,
          price: isPattern ? t('price.calculatedAutomatically') : product.pricing.basePrice.toLocaleString(),
          image: product.image,
          images: [product.image, ...(product.gallery?.map((g: { url: string }) => g.url) || [])],
          features: [],
          popular: product.isPopular || false,
          rating: product.rating,
          type,
          slug: product.slug,
          stockQuantity: product.inventory?.stockQuantity ?? 0,
          subcategory: product.subcategory,
        };
      });

    // Merge fabric variants for this category
    const fabricVariantCards: Product[] = (activeFabricVariants ?? [])
      .filter(fv => {
        const catSlug = fv.categoryId ? categoryIdToSlug[fv.categoryId] : undefined;
        return catSlug === categorySlug;
      })
      .map(fv => {
        const totalStock = fv.stock.glssa + fv.stock.wsaydRegular + fv.stock.wsaydReduced + fv.stock.coudoir + fv.stock.zerbiya;
        // Use linked product's image/gallery if available
        const linkedProduct = dbProducts?.find(p => p.fabricVariantId === fv._id);
        const image = linkedProduct?.image || fv.image;
        const gallery = linkedProduct?.gallery?.map((g: { url: string }) => g.url) || [];
        return {
          productId: fv._id,
          name: getLocalizedField(fv.name, locale),
          description: fv.color,
          category: categorySlug,
          size: t('size.bySpace'),
          price: t('price.calculatedAutomatically'),
          image,
          images: [image, ...gallery],
          features: [],
          popular: linkedProduct?.isPopular || false,
          rating: linkedProduct?.rating || 5,
          type: 'pattern' as ProductType,
          slug: undefined,
          stockQuantity: totalStock,
          isFabricVariant: true,
          fabricVariantId: fv._id,
        } as Product;
      });

    return [...mappedProducts, ...fabricVariantCards];
  }, [hasSubcategories, dbProducts, activeFabricVariants, categoryIdToSlug, categorySlug, t, locale]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'popular') return b.rating - a.rating;
    if (sortBy === 'price-low') {
      const priceA = a.price === t('price.calculatedAutomatically') ? 0 : parseInt(a.price.replace(/,/g, ''));
      const priceB = b.price === t('price.calculatedAutomatically') ? 0 : parseInt(b.price.replace(/,/g, ''));
      return priceA - priceB;
    }
    if (sortBy === 'price-high') {
      const priceA = a.price === t('price.calculatedAutomatically') ? 999999 : parseInt(a.price.replace(/,/g, ''));
      const priceB = b.price === t('price.calculatedAutomatically') ? 999999 : parseInt(b.price.replace(/,/g, ''));
      return priceB - priceA;
    }
    return 0;
  });

  const getProductIdForFabricVariant = (fabricVariantId: string) => {
    if (!dbProducts) return null;
    const linkedProduct = dbProducts.find(p => p.fabricVariantId === fabricVariantId);
    return linkedProduct?._id ?? null;
  };

  const handleProductClick = (product: Product) => {
    if (product.isFabricVariant && product.fabricVariantId) {
      const linkedProductId = getProductIdForFabricVariant(product.fabricVariantId);
      if (linkedProductId) {
        router.push(`/checkout?product=${linkedProductId}`);
      } else {
        router.push(`/checkout`);
      }
    } else if (product.type === 'individual' && product.slug) {
      router.push(`/product/${product.slug}`);
    } else if (product.type === 'pattern') {
      router.push(`/checkout?product=${product.productId}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stockQuantity === 0) return;
    if (product.type === 'individual') {
      addItem({
        id: product.slug || product.name,
        name: product.name,
        price: parseFloat(product.price.replace(/,/g, '')),
        image: product.image,
        size: product.size,
      });
      setAddedToCart(product.slug || product.name);
      setTimeout(() => setAddedToCart(null), 1500);
    }
  };

  // Loading state
  if (dbCategories === undefined) {
    return (
      <div
        className="min-h-screen bg-[#FDFBF7] overflow-x-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
      >
        <LandingNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mx-auto mb-4 text-[#B85C38]" />
            <p className="text-neutral-500 text-sm sm:text-base">{t('loading')}</p>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div
      className="min-h-screen bg-[#FDFBF7] overflow-x-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
    >
      <LandingNavbar />

      {/* Hero Section */}
      <section className="w-full bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-4 sm:mb-6">
            <button
              onClick={() => router.push('/products')}
              className="hover:text-[#B85C38] transition-colors"
              style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
            >
              {t('breadcrumb.products')}
            </button>
            <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} />
            <span className="text-[#1A1A1A] font-semibold">{categoryName}</span>
          </nav>

          {/* Back button + Title */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push('/products')}
              className="w-10 h-10 rounded-xl border border-neutral-200 bg-white flex items-center justify-center hover:border-[#B85C38] hover:text-[#B85C38] transition-all"
            >
              <BackIcon size={20} />
            </button>
            <div>
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1A1A1A] leading-tight"
                style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
              >
                {categoryName}
              </h1>
            </div>
          </div>

          <p className="text-neutral-500 text-sm sm:text-base max-w-xl leading-relaxed">
            {t('subtitleWithCategory', { category: categoryName })}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full bg-[#FDFBF7] px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto">
          {hasSubcategories ? (
            <>
              {/* Subcategory count */}
              <div className="mb-4 sm:mb-6">
                <p className="text-neutral-400 text-xs sm:text-sm">
                  {subcategories.length} {t('filters.subcategories')}
                </p>
              </div>

              {/* Subcategory Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                {subcategories
                  .sort((a, b) => a.order - b.order)
                  .map((sub) => {
                    const count = productCountBySubcategory[sub.slug] || 0;
                    return (
                      <CategoryCard
                        key={sub._id}
                        id={sub._id}
                        slug={sub.slug}
                        name={sub.name}
                        image={sub.image}
                        itemCount={count}
                        locale={locale}
                        isArabic={isRTL}
                        isMobile={false}
                        isTablet={false}
                        href={`/products/${categorySlug}/${sub.slug}`}
                        countLabel={count === 1 ? t('search.product') : t('search.product')}
                      />
                    );
                  })}
              </div>
            </>
          ) : (
            /* Fallback: show products directly if no subcategories */
            <>
              {/* Search + Sort */}
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="flex-1 relative">
                  <Search
                    size={18}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('search.placeholder')}
                    className="w-full py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 rounded-xl border border-neutral-200 bg-white text-[#1A1A1A] text-sm sm:text-[15px] outline-none focus:border-[#B85C38] focus:ring-2 focus:ring-[#B85C38]/20 transition-all"
                    style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                  />
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none py-3 sm:py-3.5 px-4 pr-10 rounded-xl border border-neutral-200 bg-white text-[#1A1A1A] text-sm font-medium outline-none cursor-pointer hover:border-[#B85C38] transition-all"
                    style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                  >
                    <option value="popular">{t('sort.popular')}</option>
                    <option value="price-low">{t('sort.priceLow')}</option>
                    <option value="price-high">{t('sort.priceHigh')}</option>
                  </select>
                  <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Results Count */}
              <div className="mb-4 sm:mb-6">
                <p className="text-neutral-400 text-xs sm:text-sm">
                  {t('search.showing')}{' '}
                  <span className="font-bold text-[#1A1A1A]">{sortedProducts.length}</span>{' '}
                  {t('search.product')}
                </p>
              </div>

              {/* Products Grid */}
              {sortedProducts.length === 0 ? (
                <div className="text-center py-16 sm:py-20 bg-white rounded-2xl border border-neutral-200">
                  <Package size={48} className="text-neutral-300 mx-auto mb-4 sm:mb-5 sm:w-16 sm:h-16" />
                  <h3
                    className="text-lg sm:text-xl lg:text-2xl font-bold text-[#1A1A1A] mb-2"
                    style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
                  >
                    {t('empty.title')}
                  </h3>
                  <p className="text-neutral-500 text-sm sm:text-base">
                    {t('empty.description')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                  {sortedProducts.map((product, index) => {
                    const cardKey = product.slug || `product-${index}`;
                    const isHovered = hoveredCard === cardKey;
                    const justAdded = addedToCart === (product.slug || product.name);

                    return (
                      <div
                        key={cardKey}
                        onClick={() => handleProductClick(product)}
                        onMouseEnter={() => setHoveredCard(cardKey)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`bg-[#FDFBF7] rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 ${
                          isHovered
                            ? 'border-[#B85C38] shadow-lg -translate-y-1'
                            : 'border-[#E8E0D5] shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="relative h-[200px] sm:h-[220px] lg:h-[240px] overflow-hidden">
                          <ProductImageCarousel
                            images={product.images}
                            name={product.name}
                            height={240}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            isHovered={isHovered}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          {product.popular && (
                            <div className="absolute top-3 right-3 bg-[#B85C38] text-white px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold">
                              {t('badges.popular')}
                            </div>
                          )}
                          {product.type === 'pattern' && (
                            <div className="absolute top-3 left-3 bg-[#C9A962] text-white px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold">
                              {t('badges.fullMajlis')}
                            </div>
                          )}
                          {product.stockQuantity === 0 && (
                            <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold text-sm sm:text-base bg-red-600/90 px-5 py-2 rounded-lg">
                                {t('badges.soldOut')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 sm:p-5 lg:p-6 flex flex-col gap-1.5">
                          <h3
                            className="text-base sm:text-lg lg:text-xl font-bold text-[#1A1A1A] leading-snug line-clamp-2"
                            style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
                          >
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-[#5A5A5A] text-xs sm:text-sm leading-relaxed line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-3 sm:pt-4 mt-2 border-t border-[#E8E0D5]">
                            <span
                              className="text-[#B85C38] text-base sm:text-lg font-bold"
                              style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                            >
                              {product.type === 'individual'
                                ? `${product.price} ${t('price.currency')}`
                                : product.price}
                            </span>
                            {product.type === 'individual' ? (
                              <button
                                onClick={(e) => handleAddToCart(e, product)}
                                disabled={product.stockQuantity === 0}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-300 active:scale-95 ${
                                  product.stockQuantity === 0
                                    ? 'bg-neutral-300 cursor-not-allowed'
                                    : justAdded
                                      ? 'bg-green-500'
                                      : 'bg-[#B85C38] hover:bg-[#9C4A2D] hover:scale-105'
                                }`}
                              >
                                {justAdded ? (
                                  <Check size={16} color="#FFFFFF" />
                                ) : (
                                  <ShoppingCart size={16} color="#FFFFFF" />
                                )}
                              </button>
                            ) : (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#B85C38] flex items-center justify-center">
                                {isRTL ? <ArrowLeft size={16} color="#FFFFFF" /> : <ArrowRight size={16} color="#FFFFFF" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
