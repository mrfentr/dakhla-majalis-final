'use client';

import { useState, useEffect, Suspense } from 'react';
import {Link} from '@/i18n/navigation';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Loader2,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useCart } from '@/contexts/CartContext';
import {useTranslations, useLocale} from 'next-intl';
import { getLocalizedField } from '@/lib/utils';

const theme = {
  colors: {
    cream: '#FDFBF7',
    white: '#FFFFFF',
    dark: '#1A1A1A',
    primary: '#B85C38',
    primaryLight: '#B85C3815',
    green: '#22C55E',
    greenLight: '#22C55E15',
    textDark: '#1A1A1A',
    textMedium: '#5A5A5A',
    textLight: '#8A8A8A',
    textMuted: '#A0A0A0',
    border: '#E8E0D5',
    lightFill: '#F5F0E8',
    cardDark: '#333333',
  },
  fonts: {
    arabic: "'Noto Naskh Arabic', serif",
    heading: "'Noto Kufi Arabic', sans-serif",
    english: "'DM Sans', sans-serif",
  },
};

interface CheckoutItem {
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

export default function DirectCheckoutWrapper() {
  const wrapperLocale = useLocale();
  const wrapperIsRTL = wrapperLocale === 'ar';
  return (
    <Suspense
      fallback={
        <div
          dir={wrapperIsRTL ? 'rtl' : 'ltr'}
          style={{
            minHeight: '100vh',
            backgroundColor: theme.colors.cream,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2 size={48} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
          <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <DirectCheckoutPage />
    </Suspense>
  );
}

const whatsappHelpMessages: Record<string, string> = {
  ar: 'مرحباً، أحتاج مساعدة',
  fr: "Bonjour, j'ai besoin d'aide",
  en: 'Hello, I need help',
};

const countryNames: Record<string, string> = {
  ar: 'المغرب',
  fr: 'Maroc',
  en: 'Morocco',
};

function DirectCheckoutPage() {
  const t = useTranslations('directCheckout');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: cartItems, removeItem, updateQuantity, clearCart, totalPrice: cartTotalPrice } = useCart();

  const steps = [
    { id: 1, label: t('steps.orderSummary'), arabicNum: '1' },
    { id: 2, label: t('steps.deliveryInfo'), arabicNum: '2' },
  ];

  const buyNowSlug = searchParams?.get('buyNow') ?? null;
  const buyNowQty = parseInt(searchParams?.get('qty') || '1', 10);
  const buyNowColor = searchParams?.get('color') ?? null;

  // Fetch product for Buy Now mode
  const buyNowProduct = useQuery(
    api.products.getProductBySlug,
    buyNowSlug ? { slug: buyNowSlug } : 'skip'
  );

  const createOrder = useMutation(api.orders.createDirectPurchaseOrder);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buy Now quantity state
  const [buyNowQuantity, setBuyNowQuantity] = useState(buyNowQty);

  // Contact & Delivery state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkBreakpoints = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 768);
      setIsTablet(w > 768 && w <= 1024);
    };
    checkBreakpoints();
    setIsReady(true);
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Determine checkout items
  const isBuyNowMode = !!buyNowSlug;
  const checkoutItems: CheckoutItem[] = isBuyNowMode
    ? buyNowProduct
      ? [{
          slug: buyNowProduct.slug,
          name: buyNowColor ? `${getLocalizedField(buyNowProduct.title, locale)} - ${buyNowColor}` : getLocalizedField(buyNowProduct.title, locale),
          image: buyNowProduct.image,
          price: buyNowProduct.pricing.basePrice,
          quantity: buyNowQuantity,
          color: buyNowColor || undefined,
        }]
      : []
    : cartItems.map(item => ({
        slug: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      }));

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal; // Free shipping

  // Loading state - wait for breakpoints + data
  if (!isReady || (isBuyNowMode && buyNowProduct === undefined)) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          backgroundColor: theme.colors.cream,
          fontFamily: theme.fonts.arabic,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 size={48} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
        <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Validation
  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePhone = (phone: string) => /^(0[5-7])[0-9]{8}$/.test(phone.replace(/[\s-]/g, ''));

  const validateContactInfo = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = t('validation.nameMinLength');
    }
    if (!email.trim() || !validateEmail(email)) {
      newErrors.email = t('validation.invalidEmail');
    }
    if (!phoneNumber.trim() || !validatePhone(phoneNumber)) {
      newErrors.phoneNumber = t('validation.invalidPhone');
    }
    if (!city.trim()) {
      newErrors.city = t('validation.cityRequired');
    }
    if (!address.trim() || address.trim().length < 10) {
      newErrors.address = t('validation.addressMinLength');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (checkoutItems.length === 0) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateContactInfo()) return;
      await submitOrder();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    try {
      const products = checkoutItems.map(item => ({
        productSlug: item.slug.split('::')[0],
        name: item.name,
        image: item.image,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
      }));

      const result = await createOrder({
        customerInfo: {
          name: fullName,
          email: email,
          phone: phoneNumber,
          address: {
            street: address,
            city: city,
            country: countryNames[locale] || countryNames.ar,
          },
          language: locale as 'ar' | 'fr' | 'en',
        },
        products,
        pricing: {
          subtotal,
          total,
          currency: 'MAD',
        },
        notes: '',
      });

      // Send order confirmation email
      try {
        await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: result.reference,
            customerInfo: {
              name: fullName,
              email: email,
              phone: phoneNumber,
              address: {
                street: address,
                city: city,
                country: countryNames[locale] || countryNames.ar,
              },
            },
            products,
            pricing: {
              subtotal,
              total,
              currency: 'MAD',
            },
            language: locale,
            orderType: 'direct_purchase',
          }),
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      // Clear cart if in cart mode
      if (!isBuyNowMode) {
        clearCart();
      }

      router.push(`/thank-you?ref=${result.reference}`);
    } catch (error: any) {
      console.error('Order submission error:', error);
      // Check for ConvexError with INSUFFICIENT_STOCK code
      if (error?.data?.code === "INSUFFICIENT_STOCK") {
        const details = error.data.details as Array<{ name: string; available: number; requested: number }>;
        const itemsList = details.map((d: any) => `${d.name}: ${d.available} ${locale === 'ar' ? 'متوفر' : 'disponible'}`).join('\n');
        setErrors({ submit: `${locale === 'ar' ? 'المخزون غير كافي' : locale === 'en' ? 'Insufficient stock' : 'Stock insuffisant'}:\n${itemsList}` });
      } else {
        setErrors({ submit: t('validation.submitError') });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator
  const renderStepIndicator = () => (
    <div style={{ display: 'flex', gap: isMobile ? 8 : 32, alignItems: 'center' }}>
      {steps.map((step, index) => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: index < steps.length - 1 ? (isMobile ? 8 : 32) : 0 }}>
          <div style={{ display: 'flex', gap: isMobile ? 4 : 10, alignItems: 'center' }}>
            <div
              style={{
                width: isMobile ? 28 : 32,
                height: isMobile ? 28 : 32,
                borderRadius: 16,
                backgroundColor: step.id < currentStep ? theme.colors.green : step.id === currentStep ? theme.colors.primary : 'transparent',
                border: step.id > currentStep ? `2px solid ${theme.colors.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            >
              {step.id < currentStep ? (
                <Check size={isMobile ? 14 : 16} color="#FFFFFF" />
              ) : (
                <span style={{ color: step.id === currentStep ? '#FFFFFF' : theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 14, fontWeight: 'bold' }}>
                  {step.arabicNum}
                </span>
              )}
            </div>
            {!isMobile && (
              <span style={{ color: step.id < currentStep ? theme.colors.green : step.id === currentStep ? theme.colors.textDark : theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isTablet ? 12 : 14, fontWeight: step.id === currentStep ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            )}
          </div>
          {index < steps.length - 1 && (
            <div style={{ width: isMobile ? 20 : 48, height: 2, backgroundColor: step.id < currentStep ? theme.colors.green : theme.colors.border, transition: 'background-color 0.3s ease' }} />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Order Summary
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 28 }}>
      <div>
        <h2 style={{ color: theme.colors.textDark, fontFamily: theme.fonts.heading, fontSize: isMobile ? 22 : 28, fontWeight: 'bold', margin: 0, marginBottom: 8 }}>
          {t('summary.title')}
        </h2>
        <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15, margin: 0 }}>
          {t('step1.subtitle')}
        </p>
      </div>

      {checkoutItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '60px 40px', backgroundColor: theme.colors.white, borderRadius: 16, border: `1px solid ${theme.colors.border}` }}>
          <ShoppingBag size={48} color={theme.colors.textLight} style={{ marginBottom: 16 }} />
          <h3 style={{ color: theme.colors.textDark, fontFamily: theme.fonts.heading, fontSize: 20, margin: '0 0 8px 0' }}>{t('step1.emptyTitle')}</h3>
          <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 15, margin: '0 0 24px 0' }}>{t('step1.emptySubtitle')}</p>
          <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 32px', minHeight: 44, backgroundColor: theme.colors.primary, color: '#FFFFFF', borderRadius: 8, fontWeight: 'bold', textDecoration: 'none', fontFamily: theme.fonts.arabic }}>
            {t('step1.browseProducts')}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
          {checkoutItems.map((item) => (
            <div
              key={item.slug}
              style={{
                backgroundColor: theme.colors.white,
                borderRadius: 12,
                border: `1px solid ${theme.colors.border}`,
                padding: isMobile ? 12 : 16,
                display: 'flex',
                gap: isMobile ? 12 : 16,
                alignItems: 'center',
              }}
            >
              {/* Product Image */}
              <div style={{ width: isMobile ? 64 : 80, height: isMobile ? 64 : 80, borderRadius: 10, overflow: 'hidden', position: 'relative', flexShrink: 0, backgroundColor: theme.colors.lightFill }}>
                <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} />
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 14 : 16, fontWeight: 'bold', margin: 0, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>
                  {item.name}
                </h3>
                {item.size && (
                  <p style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.arabic, fontSize: 13, margin: '0 0 8px 0' }}>{item.size}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => {
                        if (isBuyNowMode) {
                          setBuyNowQuantity(Math.max(1, buyNowQuantity - 1));
                        } else {
                          updateQuantity(item.slug, item.quantity - 1);
                        }
                      }}
                      style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 8, border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={14} color={theme.colors.textDark} />
                    </button>
                    <span style={{ fontFamily: theme.fonts.english, fontSize: 16, fontWeight: 'bold', color: theme.colors.textDark, width: 28, textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    {(() => {
                      const atMax = isBuyNowMode
                        ? !!(buyNowProduct?.inventory?.trackInventory && buyNowQuantity >= (buyNowProduct?.inventory?.stockQuantity ?? Infinity))
                        : (() => { const ci = cartItems.find(ci => ci.id === item.slug); return !!(ci?.trackInventory && ci.stockQuantity != null && item.quantity >= ci.stockQuantity); })();
                      return (
                        <button
                          onClick={() => {
                            if (atMax) return;
                            if (isBuyNowMode) {
                              setBuyNowQuantity(buyNowQuantity + 1);
                            } else {
                              updateQuantity(item.slug, item.quantity + 1);
                            }
                          }}
                          disabled={atMax}
                          style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 8, border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.white, cursor: atMax ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: atMax ? 0.4 : 1 }}
                        >
                          <Plus size={14} color={theme.colors.textDark} />
                        </button>
                      );
                    })()}
                  </div>

                  {/* Price */}
                  <span style={{ color: theme.colors.primary, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 15 : 16, fontWeight: 'bold' }}>
                    <span style={{ direction: 'ltr', display: 'inline-block' }}>{(item.price * item.quantity).toLocaleString()} {t('summary.currency')}</span>
                  </span>
                </div>
              </div>

              {/* Delete (cart mode only) */}
              {!isBuyNowMode && (
                <button
                  onClick={() => removeItem(item.slug)}
                  style={{ width: isMobile ? 44 : 36, height: isMobile ? 44 : 36, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Trash2 size={18} color={theme.colors.textLight} />
                </button>
              )}
            </div>
          ))}

          {/* Pricing Summary */}
          <div style={{ backgroundColor: theme.colors.lightFill, borderRadius: 12, padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 14 }}>{t('summary.subtotal')}</span>
              <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: 14 }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{subtotal.toLocaleString()} {t('summary.currency')}</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 14 }}>{t('summary.shipping')}</span>
              <span style={{ color: theme.colors.green, fontFamily: theme.fonts.arabic, fontSize: 14, fontWeight: 'bold' }}>{t('summary.free')}</span>
            </div>
            <div style={{ width: '100%', height: 1, backgroundColor: theme.colors.border }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: 16, fontWeight: 'bold' }}>{t('summary.total')}</span>
              <span style={{ color: theme.colors.primary, fontFamily: theme.fonts.arabic, fontSize: 18, fontWeight: 'bold' }}>{total.toLocaleString()} {t('summary.currency')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 2: Contact & Delivery Info
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 28 : 40 }}>
      {/* Contact Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
        <div>
          <h2 style={{ color: theme.colors.textDark, fontFamily: theme.fonts.heading, fontSize: isMobile ? 20 : 24, fontWeight: 'bold', margin: 0, marginBottom: 8 }}>
            {t('step2.title')}
          </h2>
          <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, margin: 0 }}>
            {t('step2.subtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
          <div>
            <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
              {t('form.fullName')}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors(prev => ({ ...prev, fullName: '' })); }}
              placeholder={t('form.fullNamePlaceholder')}
              style={{ width: '100%', backgroundColor: theme.colors.white, borderRadius: 8, border: `1px solid ${errors.fullName ? '#DC2626' : theme.colors.border}`, padding: isMobile ? '12px 14px' : '14px 16px', color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 16 : 15, outline: 'none', boxSizing: 'border-box', minHeight: 44 }}
            />
            {errors.fullName && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.fullName}</span>}
          </div>
          <div>
            <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
              {t('form.phone')}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setErrors(prev => ({ ...prev, phoneNumber: '' })); }}
              placeholder="0612345678"
              style={{ width: '100%', backgroundColor: theme.colors.white, borderRadius: 8, border: `1px solid ${errors.phoneNumber ? '#DC2626' : theme.colors.border}`, padding: isMobile ? '12px 14px' : '14px 16px', color: theme.colors.textDark, fontFamily: theme.fonts.english, fontSize: 16, outline: 'none', boxSizing: 'border-box', minHeight: 44 }}
            />
            {errors.phoneNumber && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.phoneNumber}</span>}
          </div>
        </div>

        <div>
          <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
            {t('form.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
            placeholder="example@email.com"
            style={{ width: '100%', backgroundColor: theme.colors.white, borderRadius: 8, border: `1px solid ${errors.email ? '#DC2626' : theme.colors.border}`, padding: isMobile ? '12px 14px' : '14px 16px', color: theme.colors.textDark, fontFamily: theme.fonts.english, fontSize: 16, outline: 'none', boxSizing: 'border-box', minHeight: 44 }}
          />
          {errors.email && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.email}</span>}
        </div>

        <div>
          <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
            {t('form.city')}
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); setErrors(prev => ({ ...prev, city: '' })); }}
            placeholder={t('form.cityPlaceholder')}
            style={{ width: '100%', backgroundColor: theme.colors.white, borderRadius: 8, border: `1px solid ${errors.city ? '#DC2626' : theme.colors.border}`, padding: isMobile ? '12px 14px' : '14px 16px', color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 16 : 15, outline: 'none', minHeight: 44, boxSizing: 'border-box' }}
          />
          {errors.city && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.city}</span>}
        </div>

        <div>
          <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
            {t('form.address')}
          </label>
          <textarea
            value={address}
            onChange={(e) => { setAddress(e.target.value); setErrors(prev => ({ ...prev, address: '' })); }}
            placeholder={t('form.addressPlaceholder')}
            rows={3}
            style={{ width: '100%', backgroundColor: theme.colors.white, borderRadius: 8, border: `1px solid ${errors.address ? '#DC2626' : theme.colors.border}`, padding: isMobile ? '12px 14px' : '14px 16px', color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 16 : 15, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
          {errors.address && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.address}</span>}
        </div>

        {errors.submit && (
          <div style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginTop: 8 }}>
            <span style={{ color: '#DC2626', fontSize: 14, fontFamily: theme.fonts.arabic }}>{errors.submit}</span>
          </div>
        )}
      </div>

    </div>
  );

  // Summary sidebar
  const renderSummary = () => (
    <div
      style={{
        backgroundColor: currentStep === 2 ? theme.colors.dark : theme.colors.white,
        borderRadius: isMobile ? 12 : 16,
        border: currentStep === 2 ? 'none' : `1px solid ${theme.colors.border}`,
        padding: isMobile ? 14 : 20,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 12 : 16,
      }}
    >
      {/* Header */}
      <span style={{ color: currentStep === 2 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.heading, fontSize: isMobile ? 15 : 17, fontWeight: 'bold' }}>
        {t('summary.title')}
      </span>

      {/* Items preview */}
      <div style={{ backgroundColor: currentStep === 2 ? theme.colors.cardDark : theme.colors.lightFill, borderRadius: 8, padding: isMobile ? 10 : 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checkoutItems.map((item) => (
          <div key={item.slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ color: currentStep === 2 ? theme.colors.textMuted : theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
              {item.name} x{item.quantity}
            </span>
            <span style={{ color: currentStep === 2 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13, flexShrink: 0, whiteSpace: 'nowrap' }}>
              <span style={{ direction: 'ltr', display: 'inline-block' }}>{(item.price * item.quantity).toLocaleString()} {t('summary.currency')}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, backgroundColor: currentStep === 2 ? theme.colors.cardDark : theme.colors.border }} />

      {/* Shipping */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: currentStep === 2 ? '#808080' : theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
          {t('summary.shipping')}
        </span>
        <span style={{ color: theme.colors.green, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13, fontWeight: 'bold' }}>{t('summary.free')}</span>
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, backgroundColor: currentStep === 2 ? theme.colors.cardDark : theme.colors.border }} />

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: currentStep === 2 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 15 : 16, fontWeight: 'bold' }}>
          {t('summary.totalShort')}
        </span>
        <span style={{ color: theme.colors.primary, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 18 : 20, fontWeight: 'bold' }}>
          <span style={{ direction: 'ltr', display: 'inline-block' }}>{total.toLocaleString()} {t('summary.currency')}</span>
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, backgroundColor: currentStep === 2 ? theme.colors.cardDark : theme.colors.border }} />

      {/* Action Buttons - desktop/tablet only (mobile uses sticky bottom bar) */}
      {!isMobile && (
        <>
          <button
            onClick={handleNext}
            disabled={isSubmitting || checkoutItems.length === 0}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: currentStep === 2 ? theme.colors.green : theme.colors.primary,
              cursor: isSubmitting || checkoutItems.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: theme.fonts.arabic,
              fontSize: 15,
              fontWeight: 'bold',
              opacity: isSubmitting || checkoutItems.length === 0 ? 0.6 : 1,
              minHeight: 48,
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting ? (
              <Loader2 size={18} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <span style={{ color: '#FFFFFF' }}>
                  {currentStep === 2 ? t('actions.confirmOrder') : t('actions.nextDelivery')}
                </span>
                {currentStep === 2 ? <Check size={18} color="#FFFFFF" /> : isRTL ? <ArrowLeft size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}
              </>
            )}
          </button>

          {currentStep > 1 && (
            <button
              onClick={handleBack}
              style={{
                width: '100%',
                padding: '10px 20px',
                borderRadius: 8,
                border: currentStep === 2 ? `1px solid ${theme.colors.cardDark}` : `1px solid ${theme.colors.border}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: theme.fonts.arabic,
                fontSize: 14,
                minHeight: 44,
              }}
            >
              {isRTL ? <ArrowRight size={18} color={currentStep === 2 ? '#FFFFFF' : theme.colors.textMedium} /> : <ArrowLeft size={18} color={currentStep === 2 ? '#FFFFFF' : theme.colors.textMedium} />}
              <span style={{ color: currentStep === 2 ? '#FFFFFF' : theme.colors.textMedium }}>{t('actions.back')}</span>
            </button>
          )}
        </>
      )}
    </div>
  );

  // Mobile sticky bottom bar
  const renderMobileBottomBar = () => {
    if (!isMobile) return null;

    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: theme.colors.white,
          borderTop: `1px solid ${theme.colors.border}`,
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          fontFamily: theme.fonts.arabic,
        }}
      >
        {/* Total line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: 'bold', color: theme.colors.textDark }}>
            {t('summary.totalShort')}
          </span>
          <span style={{ direction: 'ltr', display: 'inline-block' }}>
            <span style={{ fontFamily: theme.fonts.heading, fontSize: 22, fontWeight: 'bold', color: theme.colors.primary }}>
              {total.toLocaleString()}
            </span>
            {' '}
            <span style={{ fontFamily: theme.fonts.arabic, fontSize: 13, color: theme.colors.textMedium }}>
              {t('summary.currency')}
            </span>
          </span>
        </div>

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: 8 }}>
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minHeight: 48,
                flexShrink: 0,
              }}
            >
              {isRTL ? <ArrowRight size={16} color={theme.colors.textMedium} /> : <ArrowLeft size={16} color={theme.colors.textMedium} />}
              <span style={{ fontFamily: theme.fonts.arabic, fontSize: 14, color: theme.colors.textMedium }}>{t('actions.back')}</span>
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isSubmitting || checkoutItems.length === 0}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: currentStep === 2 ? theme.colors.green : theme.colors.primary,
              cursor: isSubmitting || checkoutItems.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: theme.fonts.arabic,
              fontSize: 15,
              fontWeight: 'bold',
              opacity: isSubmitting || checkoutItems.length === 0 ? 0.6 : 1,
              minHeight: 48,
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting ? (
              <Loader2 size={18} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <span style={{ color: '#FFFFFF' }}>
                  {currentStep === 2 ? t('actions.confirmOrder') : t('actions.continueMobile')}
                </span>
                {currentStep === 2 ? <Check size={18} color="#FFFFFF" /> : isRTL ? <ArrowLeft size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.cream,
        fontFamily: theme.fonts.arabic,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sticky Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          width: '100%',
          height: isMobile ? 60 : 72,
          backgroundColor: theme.colors.white,
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: isMobile ? '0 16px' : isTablet ? '0 32px' : '0 60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center' }}>
          <Image src="/logo.jpg" alt="Dakhla Majalis" width={isMobile ? 30 : 36} height={isMobile ? 30 : 36} style={{ borderRadius: 4, objectFit: 'cover' }} />
          {!isMobile && (
            <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 'bold' }}>
              {t('brandName')}
            </span>
          )}
        </Link>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Help - WhatsApp */}
        <a
          href={`https://wa.me/212657059044?text=${encodeURIComponent(whatsappHelpMessages[locale] || whatsappHelpMessages.ar)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'none',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 8,
            padding: isMobile ? '6px 8px' : '8px 16px',
            cursor: 'pointer',
            textDecoration: 'none',
            flexShrink: 0,
            minWidth: isMobile ? 44 : 'auto',
            minHeight: isMobile ? 44 : 40,
            justifyContent: 'center',
          }}
        >
          <HelpCircle size={isMobile ? 16 : 18} color={theme.colors.textLight} />
          {!isMobile && (
            <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 13 }}>{t('help')}</span>
          )}
        </a>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          gap: isMobile ? 20 : isTablet ? 24 : 40,
          padding: isMobile ? '20px 16px' : isTablet ? '32px 32px' : '40px 60px',
          paddingBottom: isMobile ? 140 : undefined,
          flexDirection: isMobile || isTablet ? 'column' : 'row',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Main Column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
        </div>

        {/* Sidebar - on mobile: bottom (not top), hidden on step 1 */}
        <div
          style={{
            width: isMobile || isTablet ? '100%' : 360,
            flexShrink: 0,
            position: isMobile || isTablet ? 'static' : 'sticky',
            top: isMobile || isTablet ? 'auto' : 92,
            height: 'fit-content',
            order: isTablet ? -1 : 0,
            display: isMobile && currentStep === 1 ? 'none' : undefined,
          }}
        >
          {renderSummary()}
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {renderMobileBottomBar()}

      <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
