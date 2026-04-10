'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useGetProducts } from '@/hooks/useConvex';
import {useTranslations, useLocale} from 'next-intl';
import { getLocalizedField } from '@/lib/utils';

const theme = {
  colors: {
    cream: '#FDFBF7',
    white: '#FFFFFF',
    primary: '#B85C38',
    primaryLight: '#B85C3815',
    textDark: '#1A1A1A',
    textMedium: '#5A5A5A',
    textLight: '#8A8A8A',
    border: '#E8E0D5',
    lightFill: '#F5F0E8',
    red: '#DC2626',
    redLight: '#FEF2F2',
  },
  fonts: {
    arabic: "'Noto Naskh Arabic', 'Noto Kufi Arabic', Arial, sans-serif",
    heading: "'Noto Kufi Arabic', 'Noto Naskh Arabic', Arial, sans-serif",
    latin: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",
    latinTitle: "'Playfair Display', Georgia, serif",
  },
};

function ProductSuggestions({
  onAddItem,
  onClose,
  router,
  cartItemIds,
}: {
  onAddItem: (item: { id: string; name: string; price: number; image: string }) => void;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  cartItemIds?: string[];
}) {
  const t = useTranslations('cart');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const products = useGetProducts({ status: 'active' }) ?? [];
  const [addedId, setAddedId] = useState<string | null>(null);

  // Filter to only direct-purchase products (have a price > 0, not majalis_set)
  // Exclude items already in cart when showing as suggestions
  const directProducts = products.filter(
    p => p.productType !== 'majalis_set' && p.pricing.basePrice > 0 && !p.isMandatory
      && (!cartItemIds || !cartItemIds.includes(p._id))
  );

  // Majalis sets (custom measurement products)
  const majalisSets = products.filter(
    p => p.productType === 'majalis_set' && !p.isMandatory
  );

  const handleAdd = (product: typeof products[0]) => {
    onAddItem({
      id: product._id,
      name: getLocalizedField(product.title, locale),
      price: product.pricing.basePrice,
      image: product.image,
    });
    setAddedId(product._id);
    setTimeout(() => setAddedId(null), 1200);
  };

  if (directProducts.length === 0 && majalisSets.length === 0) return null;

  return (
    <>
      {/* Direct purchase products */}
      {directProducts.length > 0 && (
        <div>
          <h4 style={{
            fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
            fontSize: 13,
            fontWeight: 'bold',
            color: theme.colors.textDark,
            margin: '0 0 10px',
          }}>
            {cartItemIds ? t('suggestions.addAlso') : t('suggestions.readyProducts')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {directProducts.map(product => (
              <div
                key={product._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: theme.colors.white,
                  borderRadius: 10,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div style={{
                  position: 'relative',
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: theme.colors.lightFill,
                  flexShrink: 0,
                }}>
                  <Image
                    src={product.image}
                    alt={getLocalizedField(product.title, locale)}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: theme.colors.textDark,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {getLocalizedField(product.title, locale)}
                  </p>
                  <p style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: theme.colors.primary,
                    margin: '2px 0 0',
                    fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                  }}>
                    {product.pricing.basePrice.toLocaleString()} {t('currency')}
                  </p>
                </div>
                <button
                  onClick={() => handleAdd(product)}
                  style={{
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: addedId === product._id ? '#16a34a' : theme.colors.primary,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {addedId === product._id ? (
                    <Check size={16} color="#fff" />
                  ) : (
                    <Plus size={16} color="#fff" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Majalis sets - link to designer */}
      {majalisSets.length > 0 && (
        <div>
          <h4 style={{
            fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
            fontSize: 13,
            fontWeight: 'bold',
            color: theme.colors.textDark,
            margin: '0 0 10px',
          }}>
            {t('suggestions.customMajlis')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {majalisSets.slice(0, 3).map(product => (
              <div
                key={product._id}
                onClick={() => {
                  onClose();
                  router.push('/checkout');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: theme.colors.white,
                  borderRadius: 10,
                  border: `1px solid ${theme.colors.border}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = theme.colors.primary)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = theme.colors.border)}
              >
                <div style={{
                  position: 'relative',
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: theme.colors.lightFill,
                  flexShrink: 0,
                }}>
                  <Image
                    src={product.image}
                    alt={getLocalizedField(product.title, locale)}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: theme.colors.textDark,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {getLocalizedField(product.title, locale)}
                  </p>
                  <p style={{
                    fontSize: 11,
                    color: theme.colors.textMedium,
                    margin: '2px 0 0',
                    fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                  }}>
                    {t('suggestions.calculatedBySize')}
                  </p>
                </div>
                {isArabic ? <ArrowLeft size={16} color={theme.colors.textLight} style={{ flexShrink: 0 }} /> : <ArrowRight size={16} color={theme.colors.textLight} style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function CartSidebar() {
  const t = useTranslations('cart');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    totalItems,
    totalPrice,
    isOpen,
    closeCart
  } = useCart();

  // Prevent body scroll when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start' }}>
      {/* Overlay */}
      <div
        onClick={closeCart}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(26, 26, 26, 0.4)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sidebar */}
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        style={{
          position: 'relative',
          backgroundColor: theme.colors.cream,
          height: '100%',
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
          boxShadow: '8px 0 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: theme.colors.white,
            borderBottom: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={20} color={theme.colors.primary} />
            <h2 style={{
              fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
              fontSize: 17,
              fontWeight: 'bold',
              color: theme.colors.textDark,
              margin: 0,
            }}>
              {t('title')}
            </h2>
            {totalItems > 0 && (
              <span style={{
                backgroundColor: theme.colors.primary,
                color: '#fff',
                fontSize: 11,
                fontWeight: 'bold',
                fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                borderRadius: 10,
                padding: '2px 8px',
                minWidth: 20,
                textAlign: 'center',
              }}>
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            style={{
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.colors.lightFill)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={18} color={theme.colors.textMedium} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0 24px', gap: 16 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: theme.colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ShoppingCart size={28} color={theme.colors.primary} />
              </div>
              <p style={{
                fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                fontSize: 15,
                fontWeight: 'bold',
                color: theme.colors.textDark,
                margin: 0,
              }}>{t('empty.title')}</p>
              <p style={{
                fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                fontSize: 13,
                color: theme.colors.textMedium,
                margin: 0,
                textAlign: 'center',
              }}>{t('empty.description')}</p>
              <div style={{ width: '100%', marginTop: 8 }}>
                <ProductSuggestions
                  onAddItem={addItem}
                  onClose={closeCart}
                  router={router}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    backgroundColor: theme.colors.white,
                    borderRadius: 12,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  {/* Image */}
                  <div style={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.lightFill,
                    flexShrink: 0,
                  }}>
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{
                        fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                        fontSize: 13,
                        fontWeight: 'bold',
                        color: theme.colors.textDark,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.name}
                      </h3>
                      {item.size && (
                        <p style={{
                          color: theme.colors.textLight,
                          fontSize: 12,
                          margin: '2px 0 0 0',
                        }}>{item.size}</p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      {/* Quantity Controls */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0,
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.border}`,
                        overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{
                            width: 30,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: theme.colors.textMedium,
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{
                          width: 28,
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: 'bold',
                          color: theme.colors.textDark,
                          fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                          borderLeft: `1px solid ${theme.colors.border}`,
                          borderRight: `1px solid ${theme.colors.border}`,
                          lineHeight: '28px',
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            const atMax = item.trackInventory && item.stockQuantity != null && item.quantity >= item.stockQuantity;
                            if (!atMax) updateQuantity(item.id, item.quantity + 1);
                          }}
                          disabled={!!(item.trackInventory && item.stockQuantity != null && item.quantity >= item.stockQuantity)}
                          style={{
                            width: 30,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: 'none',
                            cursor: item.trackInventory && item.stockQuantity != null && item.quantity >= item.stockQuantity ? 'not-allowed' : 'pointer',
                            color: item.trackInventory && item.stockQuantity != null && item.quantity >= item.stockQuantity ? theme.colors.border : theme.colors.textMedium,
                            opacity: item.trackInventory && item.stockQuantity != null && item.quantity >= item.stockQuantity ? 0.4 : 1,
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Price */}
                      <span style={{
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: theme.colors.primary,
                        fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                      }}>
                        <span style={{ direction: 'ltr', display: 'inline-block' }}>{(item.price * item.quantity).toLocaleString()} {t('currency')}</span>
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      color: theme.colors.textLight,
                      transition: 'all 0.15s',
                      alignSelf: 'flex-start',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = theme.colors.redLight;
                      e.currentTarget.style.color = theme.colors.red;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.colors.textLight;
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              {/* Separator + Product Suggestions */}
              <div style={{
                borderTop: `1px solid ${theme.colors.border}`,
                marginTop: 4,
                paddingTop: 16,
              }}>
                <ProductSuggestions
                  onAddItem={addItem}
                  onClose={closeCart}
                  router={router}
                  cartItemIds={items.map(i => i.id)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            backgroundColor: theme.colors.white,
            borderTop: `1px solid ${theme.colors.border}`,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {/* Total */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                fontSize: 14,
                fontWeight: 'bold',
                color: theme.colors.textDark,
              }}>{t('total')}</span>
              <span style={{
                fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                fontSize: 22,
                fontWeight: 'bold',
                color: theme.colors.primary,
              }}>
                <span style={{ direction: 'ltr', display: 'inline-block' }}>{totalPrice.toLocaleString()} <span style={{ fontSize: 13, color: theme.colors.textMedium }}>{t('currency')}</span></span>
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => {
                closeCart();
                router.push('/checkout/direct');
              }}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: theme.colors.primary,
                color: '#fff',
                fontFamily: isArabic ? theme.fonts.heading : theme.fonts.latinTitle,
                fontSize: 15,
                fontWeight: 'bold',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <span>{t('checkout')}</span>
              {isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>

            {/* Continue Shopping */}
            <button
              onClick={() => {
                closeCart();
                router.push('/products');
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: 'none',
                border: 'none',
                fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                fontSize: 13,
                fontWeight: 'bold',
                color: theme.colors.textMedium,
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.colors.textDark)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.colors.textMedium)}
            >
              {t('continueShopping')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
