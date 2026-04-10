'use client';

import { useCart } from '@/contexts/CartContext';
import {Link} from '@/i18n/navigation';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';

export function FloatingButtons() {
  const t = useTranslations('cart');
  const locale = useLocale();
  const { toggleCart, totalItems } = useCart();
  const pathname = usePathname();
  const isRtl = locale === 'ar';
  const [showScrollTop, setShowScrollTop] = useState(false);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    const handleScroll = () => {
      // Show scroll-to-top button when scrolled past viewport height
      setShowScrollTop(window.scrollY > window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide floating buttons on dashboard pages
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  // Show only WhatsApp on room-measurement page
  const isCheckoutMeasurePage = pathname === '/checkout';
  const isCheckoutPage = pathname === '/checkout';

  // Position WhatsApp higher on checkout and room-measurement pages
  const isMinimalPage = isCheckoutMeasurePage || isCheckoutPage;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`fixed z-50 flex flex-col gap-2 ${isRtl ? 'right-4' : 'left-4'} ${isMinimalPage ? 'bottom-24' : 'bottom-4'}`}>
      {/* Scroll to Top Button - Hidden on room-measurement and checkout pages */}
      {!isMinimalPage && showScrollTop && (
        <button
          onClick={scrollToTop}
          className="w-11 h-11 bg-neutral-900/80 hover:bg-neutral-900 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group animate-in slide-in-from-bottom-4"
          aria-label={t('floatingButtons.scrollToTop')}
        >
          <ArrowUp className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Custom Measurement Button - Hidden on room-measurement and checkout pages */}
      {!isMinimalPage && (
        <Link
          href="/checkout"
          className="w-11 h-11 bg-neutral-900/80 hover:bg-neutral-900 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group"
          aria-label={t('floatingButtons.customMeasurement')}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </Link>
      )}

      {/* Cart Button - Hidden on room-measurement and checkout pages */}
      {!isMinimalPage && (
        <button
          onClick={toggleCart}
          className="w-11 h-11 bg-neutral-900/80 hover:bg-neutral-900 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group relative"
          aria-label={t('floatingButtons.shoppingCart')}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#BD7C48] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      )}

      {/* WhatsApp Button - Always visible */}
      <a
        href={`https://wa.me/212657059044?text=${encodeURIComponent(t('floatingButtons.whatsappMessage'))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 bg-[#25D366] hover:bg-[#20BA5A] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group"
        aria-label={t('floatingButtons.whatsapp')}
      >
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.687"/>
        </svg>
      </a>
    </div>
  );
}
