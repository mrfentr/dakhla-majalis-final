'use client';

import { useState, useEffect } from 'react';
import {
  LandingNavbar,
  LandingFooter,
  LandingFAQ,
  theme,
} from '@/components/landing';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  MessageCircle,
} from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';

// Form field component
function FormField({
  label,
  placeholder,
  type = 'text',
  isTextarea = false,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  isTextarea?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
      }}
    >
      <label
        style={{
          color: theme.colors.textDark,
          fontFamily: theme.fonts.arabic,
          fontSize: 14,
          fontWeight: 'bold',
        }}
      >
        {label}
      </label>
      {isTextarea ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: 160,
            padding: '14px 16px',
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.cream,
            fontFamily: theme.fonts.arabic,
            fontSize: 15,
            color: theme.colors.textDark,
            resize: 'none',
            outline: 'none',
          }}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: 52,
            padding: '14px 16px',
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.cream,
            fontFamily: theme.fonts.arabic,
            fontSize: 15,
            color: theme.colors.textDark,
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}

// Contact card component
function ContactCard({
  icon: Icon,
  label,
  value,
  isLtr,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  isLtr?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.cream,
        border: `1px solid ${theme.colors.border}`,
        width: '100%',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.primaryLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={theme.colors.primary} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            color: theme.colors.textMedium,
            fontFamily: theme.fonts.arabic,
            fontSize: 14,
          }}
        >
          {label}
        </span>
        <span
          dir={isLtr ? 'ltr' : undefined}
          style={{
            color: theme.colors.textDark,
            fontFamily: theme.fonts.arabic,
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 1024;

  // Contact info data - inside component so t() is available
  const contactInfo = [
    {
      icon: Phone,
      label: t('info.phoneLabel'),
      value: '+212 657-059044',
      isLtr: true,
    },
    {
      icon: Mail,
      label: t('info.emailLabel'),
      value: 'contact@dakhlamajalis.com',
      isLtr: true,
    },
    {
      icon: MapPin,
      label: t('info.addressLabel'),
      value: t('info.addressValue'),
    },
    {
      icon: Clock,
      label: t('info.hoursLabel'),
      value: t('info.hoursValue'),
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build organized WhatsApp message using translation keys
    const lines = [
      t('whatsapp.greeting'),
      ``,
      `${t('whatsapp.nameLabel')} ${formData.firstName} ${formData.lastName}`.trim(),
      formData.phone ? `${t('whatsapp.phoneLabel')} ${formData.phone}` : '',
      formData.email ? `${t('whatsapp.emailLabel')} ${formData.email}` : '',
      formData.subject ? `${t('whatsapp.subjectLabel')} ${formData.subject}` : '',
      formData.message ? `\n${t('whatsapp.messageLabel')}\n${formData.message}` : '',
    ].filter(Boolean).join('\n');

    const encoded = encodeURIComponent(lines);
    window.open(`https://wa.me/212657059044?text=${encoded}`, '_blank');
  };

  return (
    <div
      className="min-h-screen"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        fontFamily: theme.fonts.arabic,
        backgroundColor: theme.colors.cream,
      }}
    >
      <LandingNavbar />

      {/* Hero Section */}
      <section
        style={{
          width: '100%',
          backgroundColor: theme.colors.dark,
          padding: isMobile ? '60px 20px' : isTablet ? '70px 40px' : '80px 120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          minHeight: isMobile ? 300 : 400,
          justifyContent: 'center',
        }}
      >
        {/* Decorative pattern */}
        <span
          style={{
            fontFamily: theme.fonts.decorative,
            fontSize: 24,
            color: `${theme.colors.primary}60`,
          }}
        >
          &#9671; &#9671; &#9671;
        </span>

        {/* Badge */}
        <div
          style={{
            backgroundColor: theme.colors.primaryMedium,
            padding: '8px 20px',
            borderRadius: 4,
          }}
        >
          <span
            style={{
              color: theme.colors.primary,
              fontFamily: theme.fonts.arabic,
              fontSize: 14,
              fontWeight: 'bold',
            }}
          >
            {t('badge')}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            color: theme.colors.white,
            fontFamily: theme.fonts.arabic,
            fontSize: isMobile ? 32 : isTablet ? 42 : 56,
            fontWeight: 'bold',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {t('title')}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.fonts.arabic,
            fontSize: isMobile ? 16 : 20,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 600,
            margin: 0,
          }}
        >
          {t('subtitle')}
        </p>
      </section>

      {/* Main Contact Section */}
      <section
        style={{
          width: '100%',
          backgroundColor: theme.colors.white,
          padding: isMobile ? '48px 20px' : isTablet ? '60px 40px' : '80px 120px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 40 : 60,
        }}
      >
        {/* Form Column */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          }}
        >
          {/* Form Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.arabic,
                fontSize: isMobile ? 24 : 32,
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              {t('form.title')}
            </h2>
            <p
              style={{
                color: theme.colors.textMedium,
                fontFamily: theme.fonts.arabic,
                fontSize: 16,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {t('form.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {/* Name Row */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, width: '100%' }}>
              <FormField
                label={t('form.firstName')}
                placeholder={t('form.firstNamePlaceholder')}
                value={formData.firstName}
                onChange={(value) =>
                  setFormData({ ...formData, firstName: value })
                }
              />
              <FormField
                label={t('form.lastName')}
                placeholder={t('form.lastNamePlaceholder')}
                value={formData.lastName}
                onChange={(value) =>
                  setFormData({ ...formData, lastName: value })
                }
              />
            </div>

            {/* Email */}
            <FormField
              label={t('info.emailLabel')}
              placeholder="example@email.com"
              type="email"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
            />

            {/* Phone */}
            <FormField
              label={t('form.phone')}
              placeholder="+212 6XX XXX XXX"
              type="tel"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
            />

            {/* Subject */}
            <FormField
              label={t('form.subject')}
              placeholder={t('form.subjectPlaceholder')}
              value={formData.subject}
              onChange={(value) => setFormData({ ...formData, subject: value })}
            />

            {/* Message */}
            <FormField
              label={t('form.message')}
              placeholder={t('form.messagePlaceholder')}
              isTextarea
              value={formData.message}
              onChange={(value) => setFormData({ ...formData, message: value })}
            />

            {/* Submit via WhatsApp */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '18px 36px',
                borderRadius: 8,
                backgroundColor: '#25D366',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <MessageCircle size={20} color="#FFFFFF" />
              <span
                style={{
                  color: '#FFFFFF',
                  fontFamily: theme.fonts.arabic,
                  fontSize: 18,
                  fontWeight: 'bold',
                }}
              >
                {t('form.submit')}
              </span>
            </button>
          </form>
        </div>

        {/* Info Column */}
        <div
          style={{
            width: isMobile ? '100%' : 400,
            minWidth: isMobile ? undefined : 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Info Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.arabic,
                fontSize: isMobile ? 24 : 32,
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              {t('info.title')}
            </h2>
            <p
              style={{
                color: theme.colors.textMedium,
                fontFamily: theme.fonts.arabic,
                fontSize: 16,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {t('info.subtitle')}
            </p>
          </div>

          {/* Contact Cards */}
          {contactInfo.map((info, idx) => (
            <ContactCard key={idx} {...info} />
          ))}

          {/* Social Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: '100%',
            }}
          >
            <span
              style={{
                color: theme.colors.textMedium,
                fontFamily: theme.fonts.arabic,
                fontSize: 14,
              }}
            >
              {t('social.followUs')}
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Instagram size={22} color={theme.colors.white} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.colors.dark,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Facebook size={22} color={theme.colors.white} />
              </a>
              <a
                href="https://wa.me/212657059044"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#25D366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={22} color={theme.colors.white} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section
        style={{
          width: '100%',
          backgroundColor: theme.colors.white,
          padding: isMobile ? '0 20px 48px 20px' : isTablet ? '0 40px 60px 40px' : '0 120px 80px 120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* Map Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Badge */}
          <div
            style={{
              backgroundColor: theme.colors.lightFill,
              padding: '8px 20px',
              borderRadius: 4,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <span
              style={{
                color: theme.colors.primary,
                fontFamily: theme.fonts.arabic,
                fontSize: 14,
                fontWeight: 'bold',
              }}
            >
              {t('map.badge')}
            </span>
          </div>

          <h2
            style={{
              color: theme.colors.textDark,
              fontFamily: theme.fonts.arabic,
              fontSize: isMobile ? 28 : isTablet ? 34 : 42,
              fontWeight: 'bold',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {t('map.title')}
          </h2>

          <p
            style={{
              color: theme.colors.textMedium,
              fontFamily: theme.fonts.arabic,
              fontSize: 18,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {t('map.subtitle')}
          </p>
        </div>

        {/* Map Container */}
        <div
          style={{
            width: '100%',
            height: isMobile ? 250 : 400,
            borderRadius: 16,
            border: `1px solid ${theme.colors.border}`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Google Maps iframe */}
          <iframe
            src="https://maps.google.com/maps?q=Dakhla+Majalis,+Dakhla,+Morocco&t=&z=17&ie=UTF8&iwloc=B&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Map Pin Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: theme.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 24px ${theme.colors.primary}40`,
            }}
          >
            <MapPin size={28} color={theme.colors.white} />
          </div>
        </div>

        {/* View on Google Maps link */}
        <a
          href="https://maps.app.goo.gl/1sTqyxkBeMzupPF4A"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: theme.colors.primary,
            fontFamily: isRTL ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: isMobile ? 14 : 15,
            fontWeight: 'bold',
            textDecoration: 'none',
            marginTop: 12,
          }}
        >
          <MapPin size={16} />
          {isRTL ? 'عرض على خرائط Google' : locale === 'fr' ? 'Voir sur Google Maps' : 'View on Google Maps'}
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </a>
      </section>

      <LandingFAQ />

      <LandingFooter />
    </div>
  );
}
