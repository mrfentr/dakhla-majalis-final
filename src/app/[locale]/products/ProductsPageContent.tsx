'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingNavbar, LandingFooter } from '@/components/landing';
import {
  Search,
  Star,
  Package,
  Ruler,
  Loader2,
  ShoppingCart,
  Check,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useGetProducts, useGetCategories, useGetActiveFabricVariants } from '@/hooks/useConvex';
import { useCart } from '@/contexts/CartContext';
import { ProductImageCarousel } from '@/components/ProductImageCarousel';
import {useTranslations, useLocale} from 'next-intl';
import { getLocalizedField } from '@/lib/utils';

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
  layoutType?: 'single-wall' | 'l-shape' | 'u-shape' | 'four-walls';
  stockQuantity: number;
  subcategory?: string;
  isFabricVariant?: boolean;
  fabricVariantId?: string;
}

export default function ProductsPageContent({ initialCategory = 'all' }: { initialCategory?: string }) {
  const t = useTranslations('products');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const { addItem } = useCart();

  // Sync with prop changes (e.g. navigating between /products/sets and /products/outdoor)
  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    if (slug === 'all') {
      router.push('/products', { scroll: false });
    } else {
      router.push(`/products/${slug}`, { scroll: false });
    }
  };

  // Fetch products, categories, and fabric variants from Convex
  const dbProducts = useGetProducts();
  const dbCategories = useGetCategories({ activeOnly: true });
  const activeFabricVariants = useGetActiveFabricVariants();

  // Separate top-level categories from subcategories
  const topLevelCategories = (dbCategories ?? []).filter(c => !c.parentCategoryId);

  // Build a map of category ID → slug for fabric variant matching
  const categoryIdToSlug = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of dbCategories ?? []) {
      map[cat._id] = cat.slug;
    }
    return map;
  }, [dbCategories]);

  const categories = [
    { slug: 'all', name: t('filters.all') },
    ...topLevelCategories.map((c) => ({ slug: c.slug, name: getLocalizedField(c.name, locale) })),
  ];

  // Map database products to display format
  const products: Product[] = useMemo(() => {
    if (!dbProducts) return [];

    // Get IDs of products that have a fabricVariantId (to avoid duplicates with fabric variant cards)
    const productsWithFabricVariant = new Set(
      dbProducts.filter(p => p.fabricVariantId).map(p => p._id)
    );

    const mappedProducts: Product[] = dbProducts
      .filter(product => !product.isMandatory && !productsWithFabricVariant.has(product._id))
      .map(product => {
        const isPattern = product.productType === 'majalis_set';
        const type: ProductType = isPattern ? 'pattern' : 'individual';

        let layoutType: 'single-wall' | 'l-shape' | 'u-shape' | 'four-walls' | undefined;

        if (product.category === 'l_shape') {
          layoutType = 'l-shape';
        } else if (product.category === 'u_shape') {
          layoutType = 'u-shape';
        } else if (product.category === 'custom') {
          layoutType = 'four-walls';
        }

        const size = product.specifications?.glassat?.width
          ? `${product.specifications.glassat.width} ${t('size.cm')}`
          : product.specifications?.wsayd?.optimalWidth
            ? `${product.specifications.wsayd.optimalWidth.min}-${product.specifications.wsayd.optimalWidth.max} ${t('size.cm')}`
            : t('size.bySpace');

        const features = product.features?.highlights?.slice(0, 3).map((h: { ar?: string; fr?: string; en?: string }) => getLocalizedField(h, locale)) || [];

        const description = getLocalizedField(product.description, locale);

        return {
          productId: product._id,
          name: getLocalizedField(product.title, locale),
          description,
          category: product.category,
          size,
          price: isPattern ? t('price.calculatedAutomatically') : product.pricing.basePrice.toLocaleString(),
          image: product.image,
          images: [product.image, ...(product.gallery?.map((g: { url: string }) => g.url) || [])],
          features,
          popular: product.isPopular || false,
          rating: product.rating,
          type,
          slug: product.slug,
          layoutType,
          stockQuantity: product.inventory?.stockQuantity ?? 0,
          subcategory: product.subcategory,
        };
      });

    // Merge fabric variants as product cards
    const fabricVariantCards: Product[] = (activeFabricVariants ?? []).map(fv => {
      const categorySlug = fv.categoryId ? categoryIdToSlug[fv.categoryId] : undefined;
      const subcategorySlug = fv.subcategoryId ? categoryIdToSlug[fv.subcategoryId] : undefined;
      const totalStock = fv.stock.glssa + fv.stock.wsaydRegular + fv.stock.wsaydReduced + fv.stock.coudoir + fv.stock.zerbiya;
      // Use linked product's image/gallery if available
      const linkedProduct = dbProducts?.find(p => p.fabricVariantId === fv._id);
      const image = linkedProduct?.image || fv.image;
      const gallery = linkedProduct?.gallery?.map((g: { url: string }) => g.url) || [];

      return {
        productId: fv._id,
        name: getLocalizedField(fv.name, locale),
        description: fv.color,
        category: categorySlug || '',
        size: t('size.bySpace'),
        price: t('price.calculatedAutomatically'),
        image,
        images: [image, ...gallery],
        features: [],
        popular: linkedProduct?.isPopular || false,
        rating: linkedProduct?.rating || 5,
        type: 'pattern' as ProductType,
        slug: undefined,
        layoutType: undefined,
        stockQuantity: totalStock,
        subcategory: subcategorySlug,
        isFabricVariant: true,
        fabricVariantId: fv._id,
      } as Product;
    });

    return [...mappedProducts, ...fabricVariantCards];
  }, [dbProducts, activeFabricVariants, categoryIdToSlug, t, locale]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

  // Find the product ID that links to a given fabric variant
  const getProductIdForFabricVariant = (fabricVariantId: string) => {
    if (!dbProducts) return null;
    const linkedProduct = dbProducts.find(p => p.fabricVariantId === fabricVariantId);
    return linkedProduct?._id ?? null;
  };

  const handleProductClick = (product: Product) => {
    if (product.isFabricVariant && product.fabricVariantId) {
      // Find the majalis_set product linked to this fabric variant
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

  // Get current category name for the heading
  const currentCategoryName = selectedCategory !== 'all'
    ? categories.find(c => c.slug === selectedCategory)?.name
    : null;

  // Loading state
  if (dbProducts === undefined) {
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

  return (
    <div
      className="min-h-screen bg-[#FDFBF7] overflow-x-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
    >
      <LandingNavbar />

      {/* Hero Section */}
      <section className="w-full bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FDFBF7] border border-[#E8E0D5] px-4 sm:px-6 py-2 sm:py-2.5 mb-4 sm:mb-6">
            <Star size={14} className="text-[#B85C38] fill-[#B85C38] sm:w-4 sm:h-4" />
            <span
              className="text-[#B85C38] text-xs sm:text-sm font-bold"
              style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
            >
              {t('badge')}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-[#1A1A1A] text-2xl sm:text-3xl md:text-4xl lg:text-[48px] font-extrabold mb-3 sm:mb-4 leading-tight"
            style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
          >
            {currentCategoryName
              ? t('titleWithCategory', { category: currentCategoryName })
              : t('title')}
          </h1>

          {/* Description */}
          <p className="text-neutral-500 text-sm sm:text-base lg:text-lg max-w-xl mx-auto leading-relaxed px-2">
            {currentCategoryName
              ? t('subtitleWithCategory', { category: currentCategoryName })
              : t('subtitle')}
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="w-full bg-[#FDFBF7] border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Mobile: Search + Filter Toggle */}
          <div className="flex items-center gap-3">
            {/* Search */}
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

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center w-12 h-12 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:border-[#B85C38] hover:text-[#B85C38] transition-all shrink-0"
            >
              <SlidersHorizontal size={20} />
            </button>

            {/* Desktop: Category & Sort inline */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Category Buttons */}
              <div className="flex gap-2">
                {categories.map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={`px-4 xl:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      selectedCategory === category.slug
                        ? 'bg-[#C8764A] text-white border-transparent shadow-md shadow-[#C8764A]/20'
                        : 'bg-white text-[#1A1A1A] border border-neutral-200 hover:border-[#C8764A] hover:text-[#C8764A]'
                    }`}
                    style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none py-2.5 px-4 pr-10 rounded-xl border border-neutral-200 bg-white text-[#1A1A1A] text-sm font-medium outline-none cursor-pointer hover:border-[#B85C38] transition-all"
                  style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                >
                  <option value="popular">{t('sort.popular')}</option>
                  <option value="price-low">{t('sort.priceLow')}</option>
                  <option value="price-high">{t('sort.priceHigh')}</option>
                </select>
                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Expanded Filters */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ${
              showFilters ? 'max-h-[400px] mt-3 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* Category Filter - Horizontal scroll on mobile */}
            <div className="mb-3">
              <p className="text-xs text-neutral-400 font-semibold mb-2">{t('filters.categories')}</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                {categories.map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 min-h-[44px] ${
                      selectedCategory === category.slug
                        ? 'bg-[#C8764A] text-white shadow-md shadow-[#C8764A]/20'
                        : 'bg-white text-[#1A1A1A] border border-neutral-200 active:bg-neutral-50'
                    }`}
                    style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <p className="text-xs text-neutral-400 font-semibold mb-2">{t('sort.label')}</p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none py-3 px-4 pr-4 rounded-xl border border-neutral-200 bg-white text-[#1A1A1A] text-sm font-medium outline-none min-h-[44px]"
                  style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                >
                  <option value="popular">{t('sort.popular')}</option>
                  <option value="price-low">{t('sort.priceLow')}</option>
                  <option value="price-high">{t('sort.priceHigh')}</option>
                </select>
                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="w-full bg-[#FDFBF7] px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto">

          <div>
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
                    {/* Image */}
                    <div className="relative h-[200px] sm:h-[220px] lg:h-[240px] overflow-hidden">
                      <ProductImageCarousel
                        images={product.images}
                        name={product.name}
                        height={240}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        isHovered={isHovered}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                      {/* Popular Badge */}
                      {product.popular && (
                        <div className="absolute top-3 right-3 bg-[#B85C38] text-white px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold">
                          {t('badges.popular')}
                        </div>
                      )}

                      {/* Pattern Badge */}
                      {product.type === 'pattern' && (
                        <div className="absolute top-3 left-3 bg-[#C9A962] text-white px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold">
                          {t('badges.fullMajlis')}
                        </div>
                      )}

                      {/* Sold Out Overlay */}
                      {product.stockQuantity === 0 && (
                        <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-sm sm:text-base bg-red-600/90 px-5 py-2 rounded-lg">
                            {t('badges.soldOut')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 lg:p-6 flex flex-col gap-1.5">
                      {/* Name */}
                      <h3
                        className="text-base sm:text-lg lg:text-xl font-bold text-[#1A1A1A] leading-snug line-clamp-2"
                        style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
                      >
                        {product.name}
                      </h3>

                      {/* Description */}
                      {product.description && (
                        <p className="text-[#5A5A5A] text-xs sm:text-sm leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* Price & CTA */}
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
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-white border-t border-neutral-200 px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="max-w-2xl mx-auto text-center bg-[#FDFBF7] rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 border border-neutral-200">
          <h2
            className="text-xl sm:text-2xl lg:text-[28px] font-extrabold text-[#1A1A1A] mb-2 sm:mb-3"
            style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
          >
            {t('cta.title')}
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 mb-5 sm:mb-6 leading-relaxed px-2">
            {t('cta.description')}
          </p>
          <button
            onClick={() => router.push('/checkout')}
            className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-[#B85C38] hover:bg-[#9C4A2D] text-white rounded-xl text-base sm:text-lg font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#B85C38]/30 active:scale-[0.98] min-h-[48px]"
            style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
          >
            <span>{t('cta.button')}</span>
            <Ruler size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
