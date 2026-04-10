'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {Link} from '@/i18n/navigation';
import { useRouter } from 'next/navigation';
import {
  Star,
  ShoppingBag,
  Phone,
  Ruler,
  User,
  Loader2,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  Check,
  MessageCircle,
  X,
  Images,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { LandingNavbar, LandingFooter } from '@/components/landing';
import { ProductImageCarousel } from '@/components/ProductImageCarousel';
import {
  useGetProductBySlug,
  useGetApprovedProductReviews,
  useCreateReview,
  useGetProducts,
} from '@/hooks/useConvex';
import toast from 'react-hot-toast';
import {useTranslations, useLocale} from 'next-intl';
import { getLocalizedField, getVariantName } from '@/lib/utils';

export function ProductDetails({ slug }: { slug: string }) {
  const t = useTranslations('productDetail');
  const tProducts = useTranslations('products');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const { addItem } = useCart();

  // Convex hooks
  const product = useGetProductBySlug(slug);
  const reviews = useGetApprovedProductReviews(product?._id);
  const createReview = useCreateReview();
  const allProducts = useGetProducts({ status: 'active' });

  // UI State
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for lightbox
  const handleLightboxKeyDown = useCallback((e: KeyboardEvent) => {
    if (!lightboxImage || !product?.colorVariants) return;

    if (e.key === 'Escape') {
      setLightboxImage(null);
      return;
    }

    const activeVariant = selectedColor
      ? product.colorVariants.find((v: { name: string | { ar?: string; fr?: string; en?: string }; gallery?: string[] }) => getVariantName(v.name, locale) === selectedColor)
      : null;
    const variantGallery = activeVariant?.gallery;
    if (!variantGallery || variantGallery.length <= 1) return;

    const currentIdx = variantGallery.indexOf(lightboxImage);
    if (currentIdx === -1) return;

    if (e.key === 'ArrowLeft') {
      const prevIdx = (currentIdx - 1 + variantGallery.length) % variantGallery.length;
      setLightboxImage(variantGallery[prevIdx]);
    } else if (e.key === 'ArrowRight') {
      const nextIdx = (currentIdx + 1) % variantGallery.length;
      setLightboxImage(variantGallery[nextIdx]);
    }
  }, [lightboxImage, selectedColor, product, locale]);

  useEffect(() => {
    if (lightboxImage) {
      document.addEventListener('keydown', handleLightboxKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleLightboxKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [lightboxImage, handleLightboxKeyDown]);

  // Review Form State
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Calculate rating and reviews count
  const { averageRating, reviewsCount } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { averageRating: 0, reviewsCount: 0 };
    }
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { averageRating: Math.round(avg * 10) / 10, reviewsCount: reviews.length };
  }, [reviews]);

  // Related products
  const relatedProducts = useMemo(() => {
    if (!allProducts || !product) return [];
    return allProducts
      .filter(
        (p) =>
          p._id !== product._id &&
          !p.isMandatory &&
          p.status === 'active'
      )
      .slice(0, 4);
  }, [allProducts, product]);

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!product) return;

    if (!selectedRating) {
      toast.error(t('reviews.errorSelectRating'));
      return;
    }
    if (!reviewName.trim()) {
      toast.error(t('reviews.errorEnterName'));
      return;
    }
    if (!reviewEmail.trim()) {
      toast.error(t('reviews.errorEnterEmail'));
      return;
    }
    if (!reviewComment.trim()) {
      toast.error(t('reviews.errorEnterComment'));
      return;
    }

    try {
      setIsSubmittingReview(true);
      await createReview({
        productId: product._id,
        customerInfo: {
          name: reviewName,
          email: reviewEmail,
          language: 'ar',
        },
        rating: selectedRating,
        comment: {
          ar: reviewComment,
        },
      });

      toast.success(t('reviews.successMessage'));

      setSelectedRating(0);
      setReviewName('');
      setReviewEmail('');
      setReviewComment('');
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(t('reviews.errorMessage'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Loading state
  if (product === undefined) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]" dir={isRTL ? 'rtl' : 'ltr'}>
        <LandingNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-[#BD7C48]" />
        </div>
        <LandingFooter />
      </div>
    );
  }

  // Product not found or mandatory
  if (product === null || product?.isMandatory) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]" dir={isRTL ? 'rtl' : 'ltr'}>
        <LandingNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4">
              {t('notFound.title')}
            </h1>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-[#BD7C48] text-white rounded-lg font-bold hover:bg-[#A0673D] transition-colors"
            >
              {t('notFound.backHome')}
            </Link>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const isMajalisSet = product.productType === 'majalis_set';
  const stockQuantity = product.inventory?.stockQuantity ?? 0;
  const trackInventory = product.inventory?.trackInventory ?? false;

  const handleAddToCart = () => {
    if (trackInventory && stockQuantity === 0) return;
    const cartId = selectedColor ? `${product.slug}::${selectedColor}` : product.slug;
    const localizedTitle = getLocalizedField(product.title, locale);
    const displayName = selectedColor ? `${localizedTitle} - ${selectedColor}` : localizedTitle;
    const colorVariant = selectedColor ? product.colorVariants?.find((v: { name: string | { ar?: string; fr?: string; en?: string } }) => getVariantName(v.name, locale) === selectedColor) : null;
    const itemImage = colorVariant?.image || product.image;
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: cartId,
        name: displayName,
        price: product.pricing.basePrice,
        image: itemImage,
        color: selectedColor || undefined,
        stockQuantity: trackInventory ? stockQuantity : undefined,
        trackInventory: trackInventory || undefined,
      });
    }
    toast.success(t('addedToCart'));
  };

  // Get features as array
  const features = product.features?.highlights?.map((h: { ar?: string; fr?: string; en?: string }) => getLocalizedField(h, locale)) || [];

  // Build combined images array (include color variant images and galleries)
  const colorVariantImages = (product.colorVariants || [])
    .filter((v: { image?: string }) => v.image)
    .map((v: { image?: string }) => v.image!);
  const colorVariantGalleryImages = (product.colorVariants || [])
    .flatMap((v: { gallery?: string[] }) => v.gallery || []);
  const allColorImages = [...colorVariantImages, ...colorVariantGalleryImages];
  const images = [
    product.image,
    ...(product.gallery?.map((img) => img.url) || []),
    ...allColorImages.filter((img: string) => img !== product.image && !(product.gallery || []).some((g: { url: string }) => g.url === img)),
  ].filter((img, index, self) => Boolean(img) && self.indexOf(img) === index);

  const currentIndex = selectedImage < images.length ? selectedImage : 0;

  // WhatsApp message
  const whatsappMessage = encodeURIComponent(
    t('whatsapp.message', {
      product: getLocalizedField(product.title, locale),
      price: product.pricing.basePrice.toLocaleString(),
      quantity: String(quantity),
      url: typeof window !== 'undefined' ? window.location.href : '',
    })
  );
  const whatsappLink = `https://wa.me/212657059044?text=${whatsappMessage}`;

  // Build JSON-LD structured data for SEO
  const productName = getLocalizedField(product.title, locale);
  const productDescription = getLocalizedField(product.description, locale);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: productDescription || productName,
    image: images,
    brand: { '@type': 'Brand', name: 'Dakhla Majalis' },
    offers: {
      '@type': 'Offer',
      price: product.pricing.basePrice,
      priceCurrency: 'MAD',
      availability: trackInventory
        ? stockQuantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      url: typeof window !== 'undefined' ? window.location.href : `https://www.dakhlamajalis.com/${locale}/product/${product.slug}`,
    },
    ...(product.slug && { sku: product.slug }),
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      {/* Product JSON-LD structured data for SEO rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm overflow-x-auto whitespace-nowrap pb-1">
          <Link
            href="/"
            className="text-neutral-500 hover:text-[#BD7C48] transition-colors shrink-0"
          >
            {t('breadcrumb.home')}
          </Link>
          {isRTL ? <ChevronLeft size={14} className="text-neutral-400 shrink-0" /> : <ChevronRight size={14} className="text-neutral-400 shrink-0" />}
          <Link
            href="/#products-section"
            className="text-neutral-500 hover:text-[#BD7C48] transition-colors shrink-0"
          >
            {t('breadcrumb.products')}
          </Link>
          {isRTL ? <ChevronLeft size={14} className="text-neutral-400 shrink-0" /> : <ChevronRight size={14} className="text-neutral-400 shrink-0" />}
          <span className="text-[#BD7C48] font-semibold truncate">
            {getLocalizedField(product.title, locale)}
          </span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16">
        <div className="flex flex-col lg:flex-row-reverse gap-6 lg:gap-12">
          {/* Image Gallery - Full width on mobile, half on desktop */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-24 lg:self-start">
            {/* Main Image */}
            <div
              className="relative w-full aspect-square rounded-2xl overflow-hidden bg-neutral-200 shadow-md"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                (e.currentTarget as HTMLElement).dataset.touchStartX = String(touch.clientX);
                (e.currentTarget as HTMLElement).dataset.touchStartY = String(touch.clientY);
              }}
              onTouchEnd={(e) => {
                const startX = Number((e.currentTarget as HTMLElement).dataset.touchStartX);
                const startY = Number((e.currentTarget as HTMLElement).dataset.touchStartY);
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY;
                if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                  if (diffX > 0) {
                    setSelectedImage((currentIndex - 1 + images.length) % images.length);
                  } else {
                    setSelectedImage((currentIndex + 1) % images.length);
                  }
                }
              }}
            >
              <Image
                src={images[currentIndex] || product.image}
                alt={getLocalizedField(product.title, locale)}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 50vw"
              />

              {/* Arrow Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((currentIndex + 1) % images.length)}
                    aria-label={t('gallery.nextImage')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/60 hover:bg-white/90 flex items-center justify-center transition-colors z-10"
                  >
                    <ChevronRight size={22} className="text-neutral-800" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((currentIndex - 1 + images.length) % images.length)}
                    aria-label={t('gallery.prevImage')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/60 hover:bg-white/90 flex items-center justify-center transition-colors z-10"
                  >
                    <ChevronLeft size={22} className="text-neutral-800" />
                  </button>
                </>
              )}

              {/* Image dots indicator - mobile */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentIndex === index
                          ? 'bg-white w-6'
                          : 'bg-white/50'
                      }`}
                      aria-label={t('gallery.imageN', { n: index + 1 })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails - Horizontally scrollable */}
            {images.length > 1 && (
              <div
                ref={thumbnailsRef}
                className="mt-3 flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent snap-x snap-mandatory"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {images.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] min-w-[64px] sm:min-w-[72px] rounded-xl overflow-hidden snap-start transition-all ${
                      currentIndex === index
                        ? 'ring-[3px] ring-[#BD7C48] opacity-100'
                        : 'ring-[3px] ring-transparent opacity-60 hover:opacity-85'
                    }`}
                  >
                    <Image
                      src={imageUrl}
                      alt={`${getLocalizedField(product.title, locale)} - ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="72px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="w-full lg:w-1/2 flex flex-col gap-5">
            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1A1A1A] leading-tight mb-2">
                {getLocalizedField(product.title, locale)}
              </h1>
              {getLocalizedField(product.description, locale) && getLocalizedField(product.description, locale) !== getLocalizedField(product.title, locale) && getLocalizedField(product.description, locale).length > 10 && (
                <p className="text-sm sm:text-base text-neutral-500">
                  {getLocalizedField(product.description, locale).slice(0, 80)}
                </p>
              )}
            </div>

            {/* Rating */}
            {reviewsCount > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      className={
                        star <= averageRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-neutral-300'
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-neutral-500">
                  ({reviewsCount} {t('reviews.count')})
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2">
              {isMajalisSet ? (
                <span className="text-2xl sm:text-3xl font-extrabold text-[#BD7C48]">
                  {t('priceBySize')}
                </span>
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#BD7C48]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {product.pricing.basePrice.toLocaleString()}
                  </span>
                  <span className="text-base sm:text-lg text-neutral-500">
                    {t('price.currency')}
                  </span>
                </>
              )}
            </div>

            {/* Stock Status */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg self-start text-sm font-semibold ${
                trackInventory
                  ? stockQuantity > 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  trackInventory
                    ? stockQuantity > 0
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />
              {trackInventory
                ? stockQuantity > 0
                  ? t('stock.inStock', { count: stockQuantity })
                  : t('stock.outOfStock')
                : t('stock.onDemand')}
            </div>

            {/* Color Variants */}
            {product.colorVariants && product.colorVariants.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-3">
                  {t('chooseColor')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {product.colorVariants.map((variant: { name: string | { ar?: string; fr?: string; en?: string }; hex: string; image?: string; gallery?: string[] }) => {
                    const variantDisplayName = getVariantName(variant.name, locale);
                    const isSelected = selectedColor === variantDisplayName;
                    const hasGallery = variant.gallery && variant.gallery.length > 0;
                    return (
                      <button
                        key={variantDisplayName}
                        onClick={() => {
                          const newSelected = isSelected ? null : variantDisplayName;
                          setSelectedColor(newSelected);
                          if (variant.image && !isSelected) {
                            const variantImageIndex = images.indexOf(variant.image);
                            if (variantImageIndex >= 0) {
                              setSelectedImage(variantImageIndex);
                            }
                          }
                          // Scroll to gallery when selecting a color with gallery images
                          if (!isSelected && hasGallery) {
                            setTimeout(() => {
                              galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }, 100);
                          }
                        }}
                        className={`bg-neutral-100 rounded-xl p-3 sm:p-4 flex flex-col items-center gap-2.5 transition-all ${
                          isSelected
                            ? 'ring-2 ring-[#BD7C48] bg-[#BD7C48]/5'
                            : 'hover:bg-neutral-200/50 hover:shadow-sm'
                        }`}
                      >
                        {variant.image ? (
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                            <Image
                              src={variant.image}
                              alt={variantDisplayName}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <span
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-sm shrink-0"
                            style={{ backgroundColor: variant.hex }}
                          />
                        )}
                        <span className={`text-xs sm:text-sm font-semibold text-center leading-tight ${
                          isSelected ? 'text-[#BD7C48]' : 'text-neutral-700'
                        }`}>
                          {variantDisplayName}
                        </span>
                        {hasGallery && (
                          <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                            <Images size={10} />
                            {variant.gallery!.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Color Variant Gallery */}
                {(() => {
                  const activeVariant = selectedColor
                    ? product.colorVariants?.find((v: { name: string | { ar?: string; fr?: string; en?: string }; gallery?: string[] }) => getVariantName(v.name, locale) === selectedColor)
                    : null;
                  const variantGallery = activeVariant?.gallery;

                  if (!variantGallery || variantGallery.length === 0) return null;

                  return (
                    <div
                      ref={galleryRef}
                      className="mt-4 overflow-hidden"
                      style={{
                        animation: 'colorGallerySlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <div className="bg-gradient-to-br from-[#F8F6F3] to-[#F0ECE4] rounded-2xl p-4 sm:p-5 border border-neutral-200/60">
                        {/* Gallery Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#BD7C48]/10 flex items-center justify-center">
                              <Images size={16} className="text-[#BD7C48]" />
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
                              {t('colorGallery', { color: selectedColor! })}
                            </h4>
                          </div>
                          <button
                            onClick={() => setSelectedColor(null)}
                            className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center transition-colors border border-neutral-200/60"
                            aria-label={t('colorGalleryClose')}
                          >
                            <X size={14} className="text-neutral-500" />
                          </button>
                        </div>

                        {/* Gallery Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                          {variantGallery.map((imgUrl: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setLightboxImage(imgUrl)}
                              className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-200 cursor-pointer ring-0 hover:ring-2 hover:ring-[#BD7C48]/40 transition-all duration-200 hover:shadow-md"
                            >
                              <Image
                                src={imgUrl}
                                alt={`${selectedColor} - ${idx + 1}`}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
                              />
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Description - only show if there's real content */}
            {getLocalizedField(product.description, locale) && getLocalizedField(product.description, locale) !== getLocalizedField(product.title, locale) && getLocalizedField(product.description, locale).length > 10 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-2">
                  {t('description')}
                </h3>
                <p className="text-sm sm:text-[15px] text-neutral-600 leading-7 sm:leading-8 whitespace-pre-line">
                  {getLocalizedField(product.description, locale)}
                </p>
              </div>
            )}

            {/* Features */}
            {features.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-3">
                  {t('features')}
                </h3>
                <div className="flex flex-col gap-2.5">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#BD7C48]/10 flex items-center justify-center shrink-0">
                        <Check size={14} className="text-[#BD7C48]" />
                      </div>
                      <span className="text-sm sm:text-[15px] text-neutral-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Actions */}
            <div className="flex flex-col gap-4 pt-4 border-t border-neutral-200">
              {/* Quantity Selector - hidden for majalis_set */}
              {!isMajalisSet && (
                <div>
                  <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">
                    {t('quantity')}
                  </h3>
                  <div className="inline-flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => {
                        const max = trackInventory ? stockQuantity : Infinity;
                        if (quantity < max) setQuantity(quantity + 1);
                      }}
                      disabled={trackInventory && quantity >= stockQuantity}
                      className="w-12 h-12 bg-white hover:bg-neutral-50 flex items-center justify-center border-l border-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="زيادة الكمية"
                    >
                      <Plus size={20} className="text-[#1A1A1A]" />
                    </button>
                    <span className="w-14 text-center text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-12 bg-white hover:bg-neutral-50 flex items-center justify-center border-r border-neutral-200 transition-colors"
                      aria-label="تقليل الكمية"
                    >
                      <Minus size={20} className="text-[#1A1A1A]" />
                    </button>
                  </div>
                  {trackInventory && stockQuantity > 0 && quantity >= stockQuantity && (
                    <p className="text-xs text-[#B85C38] mt-2">{t('stock.maxReached', { count: stockQuantity })}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {isMajalisSet ? (
                  <>
                    {/* Design your majalis */}
                    <Link
                      href={`/checkout?product=${product._id}`}
                      className="w-full h-14 bg-[#BD7C48] hover:bg-[#A0673D] rounded-xl flex items-center justify-center gap-3 text-white font-bold text-base sm:text-lg transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#BD7C48]/30 active:translate-y-0"
                    >
                      <Ruler size={22} />
                      <span>{t('designNow')}</span>
                    </Link>

                    {/* WhatsApp */}
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-14 rounded-xl border-2 border-[#25D366] bg-[#25D366]/5 hover:bg-[#25D366]/10 flex items-center justify-center gap-3 text-[#25D366] font-semibold text-base sm:text-lg transition-all"
                    >
                      <MessageCircle size={22} />
                      <span>{t('orderWhatsapp')}</span>
                    </a>

                    {/* Contact */}
                    <Link
                      href="/contact"
                      className="w-full h-14 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center gap-3 text-neutral-600 text-base transition-colors"
                    >
                      <Phone size={20} />
                      <span>{t('freeConsultation')}</span>
                    </Link>
                  </>
                ) : (
                  <>
                    {/* Add to Cart */}
                    <button
                      onClick={handleAddToCart}
                      disabled={trackInventory && stockQuantity === 0}
                      className={`w-full h-14 rounded-xl flex items-center justify-center gap-3 font-bold text-base sm:text-lg transition-all ${
                        trackInventory && stockQuantity === 0
                          ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                          : 'bg-[#BD7C48] hover:bg-[#A0673D] text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#BD7C48]/30 active:translate-y-0'
                      }`}
                    >
                      <ShoppingBag size={22} />
                      <span>{trackInventory && stockQuantity === 0 ? t('stock.outOfStock') : t('addToCart')}</span>
                    </button>

                    {/* WhatsApp */}
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-14 rounded-xl border-2 border-[#25D366] bg-[#25D366]/5 hover:bg-[#25D366]/10 flex items-center justify-center gap-3 text-[#25D366] font-semibold text-base sm:text-lg transition-all"
                    >
                      <MessageCircle size={22} />
                      <span>{t('orderWhatsapp')}</span>
                    </a>

                    {/* Buy Now */}
                    <button
                      onClick={() => {
                        router.push(`/checkout/direct?buyNow=${product.slug}&qty=${quantity}${selectedColor ? `&color=${encodeURIComponent(selectedColor)}` : ''}`);
                      }}
                      className="w-full h-14 rounded-xl border-2 border-[#BD7C48] bg-transparent hover:bg-[#BD7C48]/5 flex items-center justify-center gap-3 text-[#BD7C48] font-semibold text-base sm:text-lg transition-colors"
                    >
                      <ShoppingBag size={20} />
                      <span>{t('buyNow')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-4">
              {/* Free Delivery */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-neutral-100 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#BD7C48]/10 flex items-center justify-center mx-auto mb-2">
                  <Truck size={20} className="text-[#BD7C48] sm:w-6 sm:h-6" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#1A1A1A] mb-0.5">
                  {t('trustBadges.freeDelivery')}
                </div>
                <div className="text-[10px] sm:text-xs text-neutral-500 leading-snug">
                  {t('trustBadges.freeDeliveryDesc')}
                </div>
              </div>

              {/* Handmade */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-neutral-100 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#BD7C48]/10 flex items-center justify-center mx-auto mb-2">
                  <Package size={20} className="text-[#BD7C48] sm:w-6 sm:h-6" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#1A1A1A] mb-0.5">
                  {t('trustBadges.handmade')}
                </div>
                <div className="text-[10px] sm:text-xs text-neutral-500 leading-snug">
                  {t('trustBadges.handmadeDesc')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-white py-10 sm:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Reviews Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A]">
              {t('reviews.title')} ({reviewsCount})
            </h2>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-6 py-3 bg-[#BD7C48] text-white rounded-xl font-bold text-sm sm:text-base hover:bg-[#A0673D] transition-colors min-h-[44px]"
            >
              {t('reviews.addReview')}
            </button>
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-8 p-5 sm:p-7 bg-[#F8F6F3] rounded-2xl">
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] mb-5">
                {t('reviews.shareOpinion')}
              </h3>
              <div className="flex flex-col gap-5">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    {t('reviews.yourRating')}
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Star
                          size={28}
                          className={`transition-colors ${
                            star <= selectedRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-transparent text-neutral-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      {t('reviews.name')}
                    </label>
                    <input
                      type="text"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder={t('reviews.namePlaceholder')}
                      className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#BD7C48]/30 focus:border-[#BD7C48] transition-all min-h-[48px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      {t('reviews.email')}
                    </label>
                    <input
                      type="email"
                      value={reviewEmail}
                      onChange={(e) => setReviewEmail(e.target.value)}
                      placeholder="example@email.com"
                      dir="ltr"
                      className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] text-left focus:outline-none focus:ring-2 focus:ring-[#BD7C48]/30 focus:border-[#BD7C48] transition-all min-h-[48px]"
                    />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    {t('reviews.comment')}
                  </label>
                  <textarea
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={t('reviews.commentPlaceholder')}
                    className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#BD7C48]/30 focus:border-[#BD7C48] transition-all resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="px-8 py-3.5 bg-[#BD7C48] text-white rounded-xl font-bold text-base hover:bg-[#A0673D] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {isSubmittingReview && <Loader2 size={18} className="animate-spin" />}
                    {isSubmittingReview ? t('reviews.submitting') : t('reviews.submit')}
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewForm(false);
                      setSelectedRating(0);
                      setReviewName('');
                      setReviewEmail('');
                      setReviewComment('');
                    }}
                    className="px-7 py-3.5 bg-white text-[#1A1A1A] rounded-xl border border-neutral-200 text-base hover:bg-neutral-50 transition-colors min-h-[48px]"
                  >
                    {t('reviews.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="flex flex-col gap-4">
            {reviews && reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  key={review._id}
                  className="p-4 sm:p-6 bg-[#FDFBF7] rounded-2xl"
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#BD7C48]/10 flex items-center justify-center shrink-0">
                      <User size={20} className="text-[#BD7C48] sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-[#1A1A1A]">
                          {review.customerInfo.name}
                        </span>
                        {review.orderId && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[11px] sm:text-xs font-semibold">
                            {t('reviews.verifiedBuyer')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={
                                star <= review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-transparent text-neutral-300'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs text-neutral-400">
                          {new Date(review.createdAt).toLocaleDateString('ar-MA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm sm:text-[15px] text-neutral-600 leading-7">
                    {review.comment.ar || review.comment.fr || ''}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 sm:py-16 bg-[#F8F6F3] rounded-2xl">
                <Star size={40} className="text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 text-sm sm:text-base">
                  {t('reviews.noReviews')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="bg-[#FDFBF7] py-10 sm:py-14 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2
              className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A] mb-6 sm:mb-8"
              style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
            >
              {t('relatedProducts')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {relatedProducts.map((rp) => {
                const isPattern = rp.productType === 'majalis_set';
                const images = [rp.image, ...(rp.gallery?.map((g: { url: string }) => g.url) || [])];
                const href = isPattern
                  ? `/checkout?product=${rp._id}`
                  : `/product/${rp.slug}`;

                return (
                  <Link
                    key={rp._id}
                    href={href}
                    className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-neutral-200 hover:border-[#BD7C48] hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Image Carousel */}
                    <div className="relative h-[180px] sm:h-[200px] lg:h-[220px] overflow-hidden">
                      <ProductImageCarousel
                        images={images}
                        name={getLocalizedField(rp.title, locale)}
                        height={220}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        isHovered={false}
                      />

                      {/* Popular Badge */}
                      {rp.isPopular && (
                        <div className="absolute top-3 right-3 z-10 bg-[#BD7C48] text-white px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold">
                          {tProducts('badges.popular')}
                        </div>
                      )}

                      {/* Pattern Badge */}
                      {isPattern && (
                        <div className="absolute top-3 left-3 z-10 bg-gradient-to-br from-amber-500 to-amber-600 text-white px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center gap-1">
                          <Ruler size={11} />
                          {tProducts('badges.fullMajlis')}
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3 sm:p-4">
                      <h3
                        className="text-sm sm:text-base font-bold text-[#1A1A1A] mb-1 line-clamp-2 group-hover:text-[#BD7C48] transition-colors leading-snug"
                        style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
                      >
                        {getLocalizedField(rp.title, locale)}
                      </h3>

                      {/* Rating */}
                      {rp.rating > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={`${s <= rp.rating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-neutral-300'}`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-lg font-extrabold text-[#BD7C48]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {isPattern ? tProducts('price.calculatedBySize') : rp.pricing.basePrice.toLocaleString()}
                          </span>
                          {!isPattern && (
                            <span className="text-xs text-neutral-500">{t('price.currency')}</span>
                          )}
                        </div>

                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#BD7C48] flex items-center justify-center">
                          <svg width="14" height="14" fill="none" stroke="#FFFFFF" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxImage(null)}
          style={{ animation: 'lightboxFadeIn 0.2s ease-out' }}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors z-10"
            aria-label={t('colorGalleryClose')}
          >
            <X size={22} className="text-white" />
          </button>
          <div
            className="relative w-full max-w-4xl h-[70vh] sm:h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightboxImage}
              alt={selectedColor || ''}
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 95vw, 80vw"
              priority
            />
          </div>

          {/* Navigate between gallery images in lightbox */}
          {(() => {
            const activeVariant = selectedColor
              ? product.colorVariants?.find((v: { name: string | { ar?: string; fr?: string; en?: string }; gallery?: string[] }) => getVariantName(v.name, locale) === selectedColor)
              : null;
            const variantGallery = activeVariant?.gallery;
            if (!variantGallery || variantGallery.length <= 1) return null;

            const currentIdx = variantGallery.indexOf(lightboxImage);
            if (currentIdx === -1) return null;

            return (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIdx = (currentIdx - 1 + variantGallery.length) % variantGallery.length;
                    setLightboxImage(variantGallery[prevIdx]);
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                  aria-label={t('gallery.prevImage')}
                >
                  <ChevronLeft size={22} className="text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIdx = (currentIdx + 1) % variantGallery.length;
                    setLightboxImage(variantGallery[nextIdx]);
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                  aria-label={t('gallery.nextImage')}
                >
                  <ChevronRight size={22} className="text-white" />
                </button>
                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                  {currentIdx + 1} / {variantGallery.length}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Inline styles for animations */}
      <style jsx global>{`
        @keyframes colorGallerySlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 1000px;
          }
        }
        @keyframes lightboxFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <LandingFooter />
    </div>
  );
}
