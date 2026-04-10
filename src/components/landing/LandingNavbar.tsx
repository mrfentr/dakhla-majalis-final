'use client';

import { theme } from './theme';
import {Link} from '@/i18n/navigation';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, ChevronDown, Facebook, Instagram, Youtube } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import {useTranslations, useLocale} from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/**
 * useIsMobileOrTablet - Only used for interactive behavior (menu open/close),
 * NOT for sizing/layout. Defaults to false (desktop) which is safe because
 * the hamburger menu is hidden via CSS on desktop regardless of this value.
 */
function useIsMobileOrTablet(): boolean {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1280);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobileOrTablet;
}

function HamburgerIcon({ open }: { open: boolean }) {
  const barStyle: React.CSSProperties = {
    display: 'block',
    width: 22,
    height: 2,
    backgroundColor: theme.colors.textDark,
    borderRadius: 2,
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        width: 22,
        height: 22,
      }}
    >
      <span
        style={{
          ...barStyle,
          transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
        }}
      />
      <span
        style={{
          ...barStyle,
          opacity: open ? 0 : 1,
        }}
      />
      <span
        style={{
          ...barStyle,
          transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
        }}
      />
    </div>
  );
}

function CartButton({ size = 20 }: { size?: number }) {
  const t = useTranslations('common');
  const { openCart, totalItems } = useCart();

  return (
    <button
      onClick={openCart}
      aria-label={t('aria.cart')}
      style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 8,
        minWidth: 44,
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ShoppingCart size={size} color={theme.colors.textDark} />
      {totalItems > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 2,
            backgroundColor: theme.colors.primary,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          {totalItems}
        </span>
      )}
    </button>
  );
}

function TikTokIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" fill={color} />
    </svg>
  );
}

function SocialTopBar() {
  const socialLinks = [
    { href: 'https://www.facebook.com/profile.php?id=61550496458618', icon: <Facebook size={14} />, label: 'Facebook' },
    { href: 'https://www.instagram.com/dakhlamajalis/', icon: <Instagram size={14} />, label: 'Instagram' },
    { href: 'https://www.tiktok.com/@dakhlamajalis', icon: <TikTokIcon size={14} />, label: 'TikTok' },
    { href: 'https://www.youtube.com/@DakhlaMajalis', icon: <Youtube size={14} />, label: 'YouTube' },
  ];

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#2C2C2C',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: Nos Produits link */}
      <Link
        href="/products"
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: 11,
          textDecoration: 'none',
          fontWeight: 500,
          letterSpacing: '0.3px',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
      >
        Nos Produits
      </Link>

      {/* Right: Social icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            style={{
              color: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            {link.icon}
          </a>
        ))}
      </div>
    </div>
  );
}

export function LandingNavbar() {
  const t = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const navLinks: { href: string; label: string; hasDropdown?: boolean }[] = [
    { href: '#products', label: t('nav.products'), hasDropdown: true },
    { href: '#gallery', label: t('nav.gallery') },
    { href: '#coup-de-coeur', label: t('nav.coupDeCoeur') },
    { href: '#how-it-works', label: t('nav.howWeWork') },
    { href: '#faq', label: t('nav.faq') },
    { href: '/about', label: t('nav.about') },
    ...(isArabic ? [{ href: '#contact', label: t('nav.contact') }] : []),
  ];
  const isMobileOrTablet = useIsMobileOrTablet();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const fontFamily = isArabic ? theme.fonts.arabic : theme.fonts.latin;
  const titleFontFamily = isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle;

  // Helper: navigate to homepage hash section from any page
  const handleHashNavigation = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (pathname !== '/') {
        e.preventDefault();
        router.push('/' + href);
      }
    },
    [pathname, router]
  );

  const dbCategories = useQuery(api.categories.getCategories, { activeOnly: true });
  const productCategories = (dbCategories || []).map(cat => ({
    label: (cat.name as any)[locale] || cat.name.fr || cat.name.ar,
    slug: cat.slug,
  }));

  const openDesktopDropdown = useCallback(() => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setDesktopDropdownOpen(true);
  }, []);

  const closeDesktopDropdown = useCallback(() => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDesktopDropdownOpen(false);
    }, 150);
  }, []);

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobileOrTablet) {
      setMobileMenuOpen(false);
    }
  }, [isMobileOrTablet]);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setDesktopDropdownOpen(false);
      }
    }
    if (desktopDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [desktopDropdownOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div style={{ width: '100%', position: 'relative', zIndex: 1000 }}>
    <SocialTopBar />
    <header
      className="w-full flex justify-between items-center relative z-[1000] box-border px-5 py-4 md:px-10 md:py-[18px] xl:px-10 xl:py-5"
      style={{
        backgroundColor: theme.colors.cream,
      }}
    >
      {/* Logo Group */}
      <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div className="flex items-center gap-2 md:gap-3">
          <Image
            src="/logo.jpg"
            alt={t('brand')}
            width={48}
            height={48}
            className="w-[38px] h-[38px] md:w-[42px] md:h-[42px] xl:w-12 xl:h-12"
            style={{
              borderRadius: 6,
              objectFit: 'cover',
            }}
          />
          <span
            className="text-lg md:text-xl xl:text-2xl whitespace-nowrap font-bold"
            style={{
              color: theme.colors.textDark,
              fontFamily: titleFontFamily,
            }}
          >
            {t('brand')}
          </span>
        </div>
      </Link>

      {/* Desktop Nav -- hidden below xl breakpoint (1280px) via CSS */}
      <nav className="hidden xl:flex absolute left-1/2 -translate-x-1/2 items-center gap-6">
        {navLinks.map((link) =>
          link.hasDropdown ? (
            <div
              key={link.href}
              ref={dropdownContainerRef}
              onMouseEnter={openDesktopDropdown}
              onMouseLeave={closeDesktopDropdown}
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <a
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  setDesktopDropdownOpen((prev) => !prev);
                }}
                style={{
                  color: theme.colors.textMedium,
                  fontFamily,
                  fontSize: 15,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                {link.label}
                <ChevronDown
                  size={16}
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: desktopDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </a>

              {/* Dropdown */}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  ...(isArabic ? { right: 0 } : { left: 0 }),
                  marginTop: 8,
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  minWidth: 200,
                  padding: '8px 0',
                  opacity: desktopDropdownOpen ? 1 : 0,
                  pointerEvents: desktopDropdownOpen ? 'auto' : 'none',
                  transform: desktopDropdownOpen ? 'translateY(0)' : 'translateY(-8px)',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  zIndex: 1002,
                }}
              >
                {productCategories.map((cat, idx) => (
                  <Link
                    key={idx}
                    href={`/products/${cat.slug}`}
                    onClick={() => setDesktopDropdownOpen(false)}
                    onMouseEnter={() => setHoveredCategory(idx)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      display: 'block',
                      padding: '10px 20px',
                      fontFamily,
                      fontSize: 14,
                      color: hoveredCategory === idx ? theme.colors.primary : theme.colors.textDark,
                      textDecoration: 'none',
                      transition: 'color 0.15s ease, background-color 0.15s ease',
                      backgroundColor: hoveredCategory === idx ? theme.colors.primaryLight : 'transparent',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : link.href.startsWith('/') ? (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: theme.colors.textMedium,
                fontFamily,
                fontSize: 15,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleHashNavigation(e, link.href)}
              style={{
                color: theme.colors.textMedium,
                fontFamily,
                fontSize: 15,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {link.label}
            </a>
          )
        )}
      </nav>

      {/* Right: Controls (lang, cart, CTA) -- desktop only */}
      <div className="hidden xl:flex gap-3 items-center flex-shrink-0">
        <LanguageSwitcher />
        <CartButton size={20} />
        <Link
          href="/checkout"
          style={{
            backgroundColor: theme.colors.primary,
            color: '#FFFFFF',
            fontFamily,
            fontSize: 14,
            fontWeight: 'bold',
            padding: '12px 22px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            borderRadius: 4,
          }}
        >
          {t('cta.designYourMajlis')}
        </Link>
      </div>

      {/* Cart + Hamburger (mobile + tablet) -- hidden on xl via CSS */}
      <div className="flex xl:hidden items-center gap-1">
        <CartButton size={20} />
        <LanguageSwitcher compact />
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? t('aria.closeMenu') : t('aria.openMenu')}
          aria-expanded={mobileMenuOpen}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 11,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
            zIndex: 1001,
          }}
        >
          <HamburgerIcon open={mobileMenuOpen} />
        </button>
      </div>

      {/* Mobile/Tablet Overlay Menu -- always in DOM, visibility controlled by CSS */}
      <>
        {/* Backdrop */}
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="xl:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 998,
            opacity: mobileMenuOpen ? 1 : 0,
            pointerEvents: mobileMenuOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Slide-down Menu Panel */}
        <nav
            className="xl:hidden fixed top-0 left-0 right-0 z-[999] flex flex-col items-stretch px-6 pt-20 pb-8 md:px-10 md:pt-[90px] md:pb-9"
            style={{
              backgroundColor: theme.colors.cream,
              transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: mobileMenuOpen ? '0 4px 24px rgba(0,0,0,0.12)' : 'none',
              boxSizing: 'border-box',
              maxHeight: '100dvh',
              overflowY: 'auto',
            }}
          >
            {navLinks.map((link, index) =>
              link.hasDropdown ? (
                <div key={link.href}>
                  <button
                    onClick={() => setMobileDropdownOpen((prev) => !prev)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: theme.colors.textDark,
                      fontFamily,
                      fontSize: 18,
                      fontWeight: 500,
                      textDecoration: 'none',
                      padding: '16px 0',
                      minHeight: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: `1px solid ${theme.colors.border}`,
                      WebkitTapHighlightColor: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transition: 'transform 0.25s ease',
                        transform: mobileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                  <div
                    style={{
                      overflow: 'hidden',
                      maxHeight: mobileDropdownOpen ? 300 : 0,
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    {productCategories.map((cat, catIdx) => (
                      <Link
                        key={catIdx}
                        href={`/products/${cat.slug}`}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileDropdownOpen(false);
                        }}
                        style={{
                          display: 'block',
                          color: theme.colors.textMedium,
                          fontFamily,
                          fontSize: 16,
                          fontWeight: 400,
                          textDecoration: 'none',
                          padding: '12px 24px',
                          borderBottom:
                            catIdx < productCategories.length - 1
                              ? `1px solid ${theme.colors.border}`
                              : 'none',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    color: theme.colors.textDark,
                    fontFamily,
                    fontSize: 18,
                    fontWeight: 500,
                    textDecoration: 'none',
                    padding: '16px 0',
                    minHeight: 48,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom:
                      index < navLinks.length - 1
                        ? `1px solid ${theme.colors.border}`
                        : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    handleHashNavigation(e, link.href);
                  }}
                  style={{
                    color: theme.colors.textDark,
                    fontFamily,
                    fontSize: 18,
                    fontWeight: 500,
                    textDecoration: 'none',
                    padding: '16px 0',
                    minHeight: 48,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom:
                      index < navLinks.length - 1
                        ? `1px solid ${theme.colors.border}`
                        : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {link.label}
                </a>
              )
            )}

            {/* CTA Button in mobile menu */}
            <Link
              href="/checkout"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                backgroundColor: theme.colors.primary,
                color: '#FFFFFF',
                fontFamily,
                fontSize: 15,
                fontWeight: 'bold',
                padding: '14px 24px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 4,
                marginTop: 20,
                minHeight: 48,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t('cta.designYourMajlis')}
            </Link>

            {/* Language Switcher in mobile menu */}
            <div style={{ marginTop: 16 }}>
              <LanguageSwitcher variant="buttons" />
            </div>
          </nav>
      </>
    </header>
    </div>
  );
}
