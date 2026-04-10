import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/clerk-auth';
import rateLimit, { getIPFromRequest } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY || '');

// Rate limit: 10 requests per minute (admin only)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductItem {
  name: string;
  productType?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface LayoutUpdateEmailPayload {
  email: string;
  customerName: string;
  orderRef: string;
  imageUrl?: string;
  products: ProductItem[];
  pricing: {
    subtotal: number;
    total: number;
    currency: string;
  };
  piecesList: string[]; // formatted lines like "3: HD 1m50x70x14"
  language?: string;
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const emailTranslations = {
  ar: {
    dir: 'rtl' as const,
    lang: 'ar',
    font: "'Noto Kufi Arabic', Arial, sans-serif",
    currency: 'درهم',
    subject: 'تحديث تصميم طلبك',
    heading: 'تم تحديث تصميم طلبك',
    greeting: 'مرحبا',
    updateMessage: 'تم تحديث تصميم مجلسك للطلب رقم',
    orderNumber: 'رقم الطلب',
    yourDesign: 'تصميم مجلسك المحدث',
    piecesList: 'قائمة القطع',
    products: 'المنتجات',
    product: 'المنتج',
    quantity: 'الكمية',
    price: 'السعر',
    total: 'الإجمالي',
    grandTotal: 'المجموع الكلي',
    footer: 'شكرا لاختيارك الداخلة المجالس',
    contactUs: 'للاستفسارات',
    reviewNote: 'يرجى مراجعة التصميم المحدث والتواصل معنا في حالة وجود أي ملاحظات',
  },
  fr: {
    dir: 'ltr' as const,
    lang: 'fr',
    font: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    currency: 'MAD',
    subject: 'Mise a jour du design de votre commande',
    heading: 'Votre design a ete mis a jour',
    greeting: 'Bonjour',
    updateMessage: 'Le design de votre majlis a ete mis a jour pour la commande',
    orderNumber: 'N. de commande',
    yourDesign: 'Votre design mis a jour',
    piecesList: 'Liste des pieces',
    products: 'Produits',
    product: 'Produit',
    quantity: 'Quantite',
    price: 'Prix',
    total: 'Total',
    grandTotal: 'Total general',
    footer: 'Merci d\'avoir choisi Dakhla Majalis',
    contactUs: 'Pour toute question',
    reviewNote: 'Veuillez examiner le design mis a jour et nous contacter si vous avez des remarques',
  },
  en: {
    dir: 'ltr' as const,
    lang: 'en',
    font: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    currency: 'MAD',
    subject: 'Your Order Design Has Been Updated',
    heading: 'Your Design Has Been Updated',
    greeting: 'Hello',
    updateMessage: 'The design for your majlis has been updated for order',
    orderNumber: 'Order Number',
    yourDesign: 'Your Updated Design',
    piecesList: 'Pieces List',
    products: 'Products',
    product: 'Product',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    grandTotal: 'Grand Total',
    footer: 'Thank you for choosing Dakhla Majalis',
    contactUs: 'For inquiries',
    reviewNote: 'Please review the updated design and contact us if you have any feedback',
  },
};

type Lang = keyof typeof emailTranslations;

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Auth: admin only
    await requireAdmin();

    // Rate limiting
    const ip = getIPFromRequest(request);
    const { success } = limiter.check(10, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const payload: LayoutUpdateEmailPayload = await request.json();

    if (!payload.email || !payload.orderRef) {
      throw new Error('Missing required information (email or orderRef)');
    }

    const rawLang = payload.language || 'ar';
    const language: Lang = rawLang in emailTranslations ? (rawLang as Lang) : 'ar';
    const t = emailTranslations[language];

    const emailHtml = generateLayoutUpdateEmailHTML(payload, language);
    const emailSubject = `${t.subject} - ${payload.orderRef}`;

    await resend.emails.send({
      from: 'Dakhla Majalis <contact@dakhlamajalis.com>',
      to: payload.email,
      subject: emailSubject,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Layout update email error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    const status = message.includes('Authentication required') ? 401
      : message.includes('Admin access required') ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// Email HTML generator
// ---------------------------------------------------------------------------

function generateLayoutUpdateEmailHTML(payload: LayoutUpdateEmailPayload, lang: Lang): string {
  const t = emailTranslations[lang];
  const isRTL = t.dir === 'rtl';
  const labelAlign = isRTL ? 'right' : 'left';
  const valueAlign = isRTL ? 'left' : 'right';
  const borderSide = isRTL ? 'border-right' : 'border-left';

  const fontsLink = lang === 'ar'
    ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
    : '';

  // ---- Design image section ----
  let imageHTML = '';
  if (payload.imageUrl) {
    imageHTML = `
      <div style="margin-bottom: 30px; text-align: center;">
        <h2 style="color: #BD7C48; font-size: 20px; margin-bottom: 15px; text-align: ${labelAlign};">${t.yourDesign}</h2>
        <img src="${payload.imageUrl}" alt="${t.yourDesign}" style="max-width: 100%; border-radius: 8px; border: 2px solid #e5e5e5;" />
      </div>
    `;
  }

  // ---- Pieces list section ----
  let piecesHTML = '';
  if (payload.piecesList && payload.piecesList.length > 0) {
    const piecesRows = payload.piecesList.map(line => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: ${labelAlign}; font-family: 'Courier New', monospace; font-size: 14px; color: #333;">
          ${line}
        </td>
      </tr>
    `).join('');

    piecesHTML = `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #BD7C48; font-size: 20px; margin-bottom: 15px; text-align: ${labelAlign};">${t.piecesList}</h2>
        <table style="width: 100%; border-collapse: collapse; background-color: #fafaf8; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
          <tbody>
            ${piecesRows}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---- Products table ----
  let productsHTML = '';
  if (payload.products && payload.products.length > 0) {
    const productRows = payload.products.map(product => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${labelAlign};">
          <strong>${product.name}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${product.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${valueAlign}; font-weight: bold; color: #BD7C48;">${product.unitPrice.toLocaleString()} ${t.currency}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${valueAlign}; font-weight: bold; color: #BD7C48;">${product.totalPrice.toLocaleString()} ${t.currency}</td>
      </tr>
    `).join('');

    productsHTML = `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #BD7C48; font-size: 20px; margin-bottom: 15px; text-align: ${labelAlign};">${t.products}</h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f9f9f9;">
              <th style="padding: 12px; text-align: ${labelAlign}; font-weight: bold; color: #333; border-bottom: 2px solid #e5e5e5;">${t.product}</th>
              <th style="padding: 12px; text-align: center; font-weight: bold; color: #333; border-bottom: 2px solid #e5e5e5;">${t.quantity}</th>
              <th style="padding: 12px; text-align: ${valueAlign}; font-weight: bold; color: #333; border-bottom: 2px solid #e5e5e5;">${t.price}</th>
              <th style="padding: 12px; text-align: ${valueAlign}; font-weight: bold; color: #333; border-bottom: 2px solid #e5e5e5;">${t.total}</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="${t.lang}" dir="${t.dir}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.subject} - ${payload.orderRef}</title>
      ${fontsLink}
    </head>
    <body style="margin: 0; padding: 0; font-family: ${t.font}; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #BD7C48 0%, #A0673D 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800;">${t.heading}</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 15px; opacity: 0.95;">${payload.orderRef}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <!-- Greeting -->
                  <div style="margin-bottom: 25px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; text-align: ${labelAlign};">
                      ${t.greeting} ${payload.customerName},
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.6; text-align: ${labelAlign};">
                      ${t.updateMessage} <strong style="color: #BD7C48;">${payload.orderRef}</strong>
                    </p>
                  </div>

                  <!-- Order Reference -->
                  <div style="margin-bottom: 30px; padding: 20px; background-color: #fffbf5; ${borderSide}: 4px solid #BD7C48; border-radius: 8px;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${t.orderNumber}</p>
                    <p style="margin: 0; color: #BD7C48; font-size: 24px; font-weight: 800;">${payload.orderRef}</p>
                  </div>

                  ${imageHTML}
                  ${piecesHTML}
                  ${productsHTML}

                  <!-- Price Summary -->
                  <div style="margin-bottom: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                    <table style="width: 100%;">
                      <tr style="border-top: 2px solid #e5e5e5;">
                        <td style="padding: 12px 8px; text-align: ${labelAlign}; font-size: 18px; font-weight: bold; color: #333;">${t.grandTotal}:</td>
                        <td style="padding: 12px 8px; text-align: ${valueAlign}; font-size: 22px; font-weight: 800; color: #BD7C48;">${payload.pricing.total.toLocaleString()} ${t.currency}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Review Note -->
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #fffbf5; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">${t.reviewNote}</p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #333; padding: 30px; text-align: center;">
                  <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">${t.footer}</p>
                  <p style="color: #999; margin: 0; font-size: 14px;">${t.contactUs}: contact@dakhlamajalis.com</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
