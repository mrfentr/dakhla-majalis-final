import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import rateLimit, { getIPFromRequest } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY || '');

// Rate limit: 5 requests per minute per IP (public route, no auth)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const emailTranslations = {
  ar: {
    dir: 'rtl' as const,
    lang: 'ar',
    font: "'Noto Kufi Arabic', Arial, sans-serif",
    currency: 'درهم',
    orderConfirmation: 'تأكيد طلبك رقم',
    thankYou: 'شكراً لطلبك!',
    orderReceived: 'تم استلام طلبك بنجاح',
    orderNumber: 'رقم الطلب',
    customerInfo: 'معلومات العميل',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    address: 'العنوان',
    roomMeasurements: 'قياسات الغرفة',
    designType: 'نوع التصميم',
    carpet: 'الزربية (السجاد)',
    yes: 'نعم',
    carpetCount: 'زربية',
    yourDesign: 'تصميم مجلسك',
    products: 'المنتجات',
    product: 'المنتج',
    quantity: 'الكمية',
    price: 'السعر',
    total: 'الإجمالي',
    subtotal: 'الإجمالي الفرعي',
    shipping: 'التوصيل',
    grandTotal: 'المجموع الكلي',
    notes: 'ملاحظات',
    thankYouFooter: 'شكراً لاختيارك الداخلة المجالس',
    contactUs: 'للاستفسارات',
    // Component totals
    totalJelsa: 'إجمالي الجلسات (أسيس)',
    totalCoussin: 'إجمالي الوسائد (وسادة)',
    totalCoudoir: 'إجمالي المساندات (كودوار)',
    totalZerbiya: 'الزربية (السجاد)',
    totalPoufs: 'البوف',
    pieces: 'قطعة',
    // Layout types
    layoutUShape: 'شكل U',
    layoutLShape: 'شكل L',
    layoutStraight: 'جدار واحد',
    layoutFourWalls: 'أربع جدران',
    layoutCustom: 'تصميم خاص',
    additionalItems: 'منتجات إضافية',
    // Dimension labels
    wallLength: 'طول الجدار',
    horizontalWall: 'الجدار الأفقي',
    verticalWall: 'الجدار العمودي',
    leftWall: 'الجدار الأيسر',
    middleWall: 'الجدار الأوسط',
    rightWall: 'الجدار الأيمن',
    topWall: 'الجدار العلوي',
    leftToDoor: 'من اليسار إلى الباب',
    doorToRight: 'من الباب إلى اليمين',
  },
  fr: {
    dir: 'ltr' as const,
    lang: 'fr',
    font: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    currency: 'MAD',
    orderConfirmation: 'Confirmation de votre commande n°',
    thankYou: 'Merci pour votre commande !',
    orderReceived: 'Votre commande a été reçue avec succès',
    orderNumber: 'N° de commande',
    customerInfo: 'Informations client',
    name: 'Nom',
    email: 'E-mail',
    phone: 'Téléphone',
    address: 'Adresse',
    roomMeasurements: 'Dimensions de la pièce',
    designType: 'Type de design',
    carpet: 'Tapis (Zerbiya)',
    yes: 'Oui',
    carpetCount: 'tapis',
    yourDesign: 'Design de votre salon',
    products: 'Produits',
    product: 'Produit',
    quantity: 'Quantité',
    price: 'Prix',
    total: 'Total',
    subtotal: 'Sous-total',
    shipping: 'Livraison',
    grandTotal: 'Total général',
    notes: 'Notes',
    thankYouFooter: 'Merci d\'avoir choisi Dakhla Majalis',
    contactUs: 'Pour toute question',
    // Component totals
    totalJelsa: 'Total assises (jelsa)',
    totalCoussin: 'Total coussins (wssada)',
    totalCoudoir: 'Total accoudoirs (coudoir)',
    totalZerbiya: 'Tapis (Zerbiya)',
    totalPoufs: 'Poufs',
    pieces: 'pièce(s)',
    additionalItems: 'Produits supplémentaires',
    layoutUShape: 'Forme U',
    layoutLShape: 'Forme L',
    layoutStraight: 'Mur simple',
    layoutFourWalls: 'Quatre murs',
    layoutCustom: 'Design personnalisé',
    wallLength: 'Longueur du mur',
    horizontalWall: 'Mur horizontal',
    verticalWall: 'Mur vertical',
    leftWall: 'Mur gauche',
    middleWall: 'Mur central',
    rightWall: 'Mur droit',
    topWall: 'Mur supérieur',
    leftToDoor: 'De la gauche à la porte',
    doorToRight: 'De la porte à la droite',
  },
  en: {
    dir: 'ltr' as const,
    lang: 'en',
    font: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    currency: 'MAD',
    orderConfirmation: 'Your Order Confirmation #',
    thankYou: 'Thank You for Your Order!',
    orderReceived: 'Your order has been received successfully',
    orderNumber: 'Order Number',
    customerInfo: 'Customer Information',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    roomMeasurements: 'Room Measurements',
    designType: 'Design Type',
    carpet: 'Carpet (Zerbiya)',
    yes: 'Yes',
    carpetCount: 'carpet(s)',
    yourDesign: 'Your Majlis Design',
    products: 'Products',
    product: 'Product',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    grandTotal: 'Grand Total',
    notes: 'Notes',
    thankYouFooter: 'Thank you for choosing Dakhla Majalis',
    contactUs: 'For inquiries',
    // Component totals
    totalJelsa: 'Total seats (jelsa)',
    totalCoussin: 'Total cushions (wssada)',
    totalCoudoir: 'Total armrests (coudoir)',
    totalZerbiya: 'Carpet (Zerbiya)',
    totalPoufs: 'Poufs',
    pieces: 'piece(s)',
    additionalItems: 'Additional Items',
    layoutUShape: 'U-Shape',
    layoutLShape: 'L-Shape',
    layoutStraight: 'Single Wall',
    layoutFourWalls: 'Four Walls',
    layoutCustom: 'Custom Design',
    wallLength: 'Wall Length',
    horizontalWall: 'Horizontal Wall',
    verticalWall: 'Vertical Wall',
    leftWall: 'Left Wall',
    middleWall: 'Middle Wall',
    rightWall: 'Right Wall',
    topWall: 'Top Wall',
    leftToDoor: 'Left to Door',
    doorToRight: 'Door to Right',
  },
};

type Lang = keyof typeof emailTranslations;

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getIPFromRequest(request);
    const { success } = limiter.check(5, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const order = await request.json();

    if (!order.customerInfo?.email || !order.reference) {
      throw new Error('Missing required order information');
    }

    // Determine customer language (default to Arabic)
    const rawLang = order.language || order.customerInfo?.language || 'ar';
    const language: Lang = rawLang in emailTranslations ? (rawLang as Lang) : 'ar';
    const t = emailTranslations[language];

    // Generate email HTML in the customer's language
    const emailHtml = generateOrderEmailHTML(order, language);
    const emailSubject = `${t.orderConfirmation} ${order.reference}`;

    // Send email to customer
    await resend.emails.send({
      from: 'Dakhla Majalis <contact@dakhlamajalis.com>',
      to: order.customerInfo.email,
      subject: emailSubject,
      html: emailHtml,
    });

    // Small delay before sending owner email
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send email to owner — ALWAYS in Arabic
    const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL || process.env.OWNER_EMAIL || 'dakhlamajalis@gmail.com';
    try {
      const ownerSubject = `🛒 طلب جديد رقم ${order.reference} - ${order.customerInfo.name}`;
      const ownerHtml = generateOwnerEmailHTML(order);

      console.log('[send-order-email] Sending owner email to:', ownerEmail);
      const ownerResult = await resend.emails.send({
        from: 'Dakhla Majalis <contact@dakhlamajalis.com>',
        to: ownerEmail,
        subject: ownerSubject,
        html: ownerHtml,
      });
      console.log('[send-order-email] Owner email sent:', ownerResult);
    } catch (ownerError) {
      console.error('[send-order-email] Failed to send owner email to', ownerEmail, ':', ownerError);
      // Don't block the response — customer email was already sent
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Locale-aware layout type label
// ---------------------------------------------------------------------------

function getLayoutTypeLabel(layoutType: string, lang: Lang = 'ar'): string {
  const t = emailTranslations[lang];
  const labels: Record<string, string> = {
    'u_shape': t.layoutUShape,
    'u-shape': t.layoutUShape,
    'l_shape': t.layoutLShape,
    'l-shape': t.layoutLShape,
    'straight': t.layoutStraight,
    'single-wall': t.layoutStraight,
    'four-walls': t.layoutFourWalls,
    'custom': t.layoutCustom,
  };
  return labels[layoutType] || layoutType;
}

// ---------------------------------------------------------------------------
// Customer email — language-aware
// ---------------------------------------------------------------------------

function generateOrderEmailHTML(order: any, lang: Lang): string {
  const t = emailTranslations[lang];
  const isRTL = t.dir === 'rtl';
  const isRoomMeasurement = order.orderType === "room_measurement";

  // Direction-aware helpers
  const labelAlign = isRTL ? 'right' : 'left';
  const valueAlign = isRTL ? 'left' : 'right';
  const borderSide = isRTL ? 'border-right' : 'border-left';

  // Google Fonts link — only needed for Arabic
  const fontsLink = lang === 'ar'
    ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
    : '';

  // ---- Products rows ----
  // Customer email: always show the clean products array (majlis set as one line with bundled price).
  // The aggregated component breakdown (totalGlassat, totalWsayd, totalCoudoir) is only shown
  // in the owner email — customers should not see individual component counts.
  let productsHTML = "";
  if (order.products && order.products.length > 0) {
    // Show raw product list — clean view for the customer
    productsHTML = order.products.map((product: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${labelAlign};">
          <strong>${product.name}</strong>
          ${product.size ? `<br/><span style="color: #666; font-size: 14px;">${product.size}</span>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${product.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${valueAlign}; font-weight: bold; color: #BD7C48;">${product.unitPrice.toLocaleString()} ${t.currency}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${valueAlign}; font-weight: bold; color: #BD7C48;">${product.totalPrice.toLocaleString()} ${t.currency}</td>
      </tr>
    `).join('');
  }

  // ---- Room measurements section ----
  let measurementsHTML = "";
  if (isRoomMeasurement && order.roomMeasurements) {
    const rm = order.roomMeasurements;
    let dimensionsRows = '';
    const dims = rm.dimensions;
    if (dims) {
      if (dims.singleWall) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.wallLength}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.singleWall} cm</td></tr>`;
      if (dims.lShapeH) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.horizontalWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.lShapeH} cm</td></tr>`;
      if (dims.lShapeV) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.verticalWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.lShapeV} cm</td></tr>`;
      if (dims.uShapeL) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.leftWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.uShapeL} cm</td></tr>`;
      if (dims.uShapeH) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.middleWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.uShapeH} cm</td></tr>`;
      if (dims.uShapeR) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.rightWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.uShapeR} cm</td></tr>`;
      if (dims.fourWallsTop) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.topWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.fourWallsTop} cm</td></tr>`;
      if (dims.fourWallsLeft) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.leftWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.fourWallsLeft} cm</td></tr>`;
      if (dims.fourWallsRight) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.rightWall}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.fourWallsRight} cm</td></tr>`;
      if (dims.fourWallsBottomLeft) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.leftToDoor}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.fourWallsBottomLeft} cm</td></tr>`;
      if (dims.fourWallsBottomRight) dimensionsRows += `<tr><td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.doorToRight}:</td><td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${dims.fourWallsBottomRight} cm</td></tr>`;
    }
    measurementsHTML = `
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #BD7C48; font-size: 20px; margin-bottom: 15px; text-align: ${labelAlign};">${t.roomMeasurements}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.designType}:</td>
            <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${getLayoutTypeLabel(rm.layoutType, lang)}</td>
          </tr>
          ${dimensionsRows}
          ${order.calculations?.carpetSelection ? `
          <tr>
            <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.carpet}:</td>
            <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${t.yes} (${order.calculations.carpetSelection.baseTypeQuantity} ${t.carpetCount} - ${order.calculations.carpetSelection.label})</td>
          </tr>
          ` : rm.includeZerbiya ? `
          <tr>
            <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.carpet}:</td>
            <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${t.yes} (${rm.zerbiyaCount || 0} ${t.carpetCount})</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }

  // ---- Image section ----
  let imageHTML = "";
  if (order.imageUrl) {
    imageHTML = `
      <div style="margin-bottom: 30px; text-align: center;">
        <h2 style="color: #BD7C48; font-size: 20px; margin-bottom: 15px; text-align: ${labelAlign};">${t.yourDesign}</h2>
        <img src="${order.imageUrl}" alt="${t.yourDesign}" style="max-width: 100%; border-radius: 8px; border: 2px solid #e5e5e5;" />
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="${t.lang}" dir="${t.dir}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.orderConfirmation} ${order.reference}</title>
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">${t.thankYou}</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">${t.orderReceived}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <!-- Order Info -->
                  <div style="margin-bottom: 30px; padding: 20px; background-color: #fffbf5; ${borderSide}: 4px solid #BD7C48; border-radius: 8px;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${t.orderNumber}</p>
                    <p style="margin: 0; color: #BD7C48; font-size: 24px; font-weight: 800;">${order.reference}</p>
                  </div>

                  <!-- Customer Info -->
                  <div style="margin-bottom: 30px;">
                    <h2 style="color: #BD7C48; font-size: 20px; margin-bottom: 15px; text-align: ${labelAlign};">${t.customerInfo}</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.name}:</td>
                        <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${order.customerInfo.name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.email}:</td>
                        <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${order.customerInfo.email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.phone}:</td>
                        <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${order.customerInfo.phone}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.address}:</td>
                        <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">
                          ${order.customerInfo.address.street}<br/>
                          ${order.customerInfo.address.city}, ${order.customerInfo.address.country}
                        </td>
                      </tr>
                    </table>
                  </div>

                  ${measurementsHTML}
                  ${imageHTML}

                  <!-- Products -->
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
                        ${productsHTML}
                      </tbody>
                    </table>
                  </div>

                  ${order.additionalItems && order.additionalItems.length > 0 ? `
                  <!-- Additional Items -->
                  <div style="margin-bottom: 30px;">
                    <h2 style="color: #BD7C48; font-size: 20px; margin-bottom: 15px; text-align: ${labelAlign};">${t.additionalItems}</h2>
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
                        ${order.additionalItems.map((item: any) => `
                        <tr>
                          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${labelAlign};"><strong>${item.name}</strong></td>
                          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
                          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${valueAlign}; font-weight: bold; color: #BD7C48;">${item.unitPrice.toLocaleString()} ${t.currency}</td>
                          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: ${valueAlign}; font-weight: bold; color: #BD7C48;">${item.totalPrice.toLocaleString()} ${t.currency}</td>
                        </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                  ` : ''}

                  <!-- Price Summary -->
                  <div style="margin-bottom: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.subtotal}:</td>
                        <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${order.pricing.subtotal.toLocaleString()} ${t.currency}</td>
                      </tr>
                      ${order.pricing.shipping ? `
                      <tr>
                        <td style="padding: 8px; text-align: ${labelAlign}; color: #666;">${t.shipping}:</td>
                        <td style="padding: 8px; text-align: ${valueAlign}; font-weight: bold;">${order.pricing.shipping.toLocaleString()} ${t.currency}</td>
                      </tr>
                      ` : ''}
                      <tr style="border-top: 2px solid #e5e5e5;">
                        <td style="padding: 12px 8px; text-align: ${labelAlign}; font-size: 18px; font-weight: bold; color: #333;">${t.grandTotal}:</td>
                        <td style="padding: 12px 8px; text-align: ${valueAlign}; font-size: 22px; font-weight: 800; color: #BD7C48;">${order.pricing.total.toLocaleString()} ${t.currency}</td>
                      </tr>
                    </table>
                  </div>

                  ${order.notes ? `
                  <div style="margin-bottom: 30px; padding: 15px; background-color: #fffbf5; border-radius: 8px;">
                    <h3 style="color: #BD7C48; font-size: 16px; margin: 0 0 10px 0; text-align: ${labelAlign};">${t.notes}:</h3>
                    <p style="margin: 0; color: #666; line-height: 1.6;">${order.notes}</p>
                  </div>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #333; padding: 30px; text-align: center;">
                  <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">${t.thankYouFooter}</p>
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

// ---------------------------------------------------------------------------
// Owner email — ALWAYS in Arabic (unchanged)
// ---------------------------------------------------------------------------

function generateOwnerEmailHTML(order: any): string {
  const isRoomMeasurement = order.orderType === "room_measurement";

  // Format products list — show aggregated component counts (no extra wssada line)
  let productsHTML = "";
  const ownerCalc = order.calculations;
  if (ownerCalc && (ownerCalc.totalGlassat != null || ownerCalc.totalWsayd != null || ownerCalc.totalCoudoir != null)) {
    const ownerRows: string[] = [];

    if (ownerCalc.totalGlassat != null && ownerCalc.totalGlassat > 0) {
      ownerRows.push(`
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"><strong>إجمالي الجلسات (أسيس)</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${ownerCalc.totalGlassat}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">—</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">—</td>
        </tr>
      `);
    }

    if (ownerCalc.totalWsayd != null && ownerCalc.totalWsayd > 0) {
      ownerRows.push(`
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"><strong>إجمالي الوسائد (وسادة)</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${ownerCalc.totalWsayd}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">—</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">—</td>
        </tr>
      `);
    }

    if (ownerCalc.totalCoudoir != null && ownerCalc.totalCoudoir > 0) {
      ownerRows.push(`
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"><strong>إجمالي المساندات (كودوار)</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${ownerCalc.totalCoudoir}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">—</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">—</td>
        </tr>
      `);
    }

    if (ownerCalc.totalZerbiya != null && ownerCalc.totalZerbiya > 0) {
      const carpetProduct = order.products?.find((p: any) => p.productType === 'zerbiya');
      ownerRows.push(`
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"><strong>الزربية (السجاد)</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${ownerCalc.totalZerbiya}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">${carpetProduct ? carpetProduct.unitPrice.toLocaleString() + ' درهم' : '—'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">${carpetProduct ? carpetProduct.totalPrice.toLocaleString() + ' درهم' : '—'}</td>
        </tr>
      `);
    }

    if (ownerCalc.poufsCount != null && ownerCalc.poufsCount > 0) {
      const poufsProduct = order.products?.find((p: any) => p.productType === 'poufs');
      ownerRows.push(`
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"><strong>البوف</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${ownerCalc.poufsCount}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">${poufsProduct ? poufsProduct.unitPrice.toLocaleString() + ' درهم' : '—'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">${poufsProduct ? poufsProduct.totalPrice.toLocaleString() + ' درهم' : '—'}</td>
        </tr>
      `);
    }

    productsHTML = ownerRows.join('');
  } else if (order.products && order.products.length > 0) {
    productsHTML = order.products.map((product: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
          <strong>${product.name}</strong>
          ${product.size ? `<br/><span style="color: #666; font-size: 13px;">${product.size}</span>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${product.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">${product.unitPrice.toLocaleString()} درهم</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">${product.totalPrice.toLocaleString()} درهم</td>
      </tr>
    `).join('');
  }

  // Room measurements section for owner
  let measurementsHTML = "";
  if (isRoomMeasurement && order.roomMeasurements) {
    const rm = order.roomMeasurements;
    let dimensionsRows = '';
    const dims = rm.dimensions;
    if (dims) {
      if (dims.singleWall) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">طول الجدار:</td><td style="padding: 5px;"><strong>${dims.singleWall} cm</strong></td></tr>`;
      if (dims.lShapeH) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار الأفقي:</td><td style="padding: 5px;"><strong>${dims.lShapeH} cm</strong></td></tr>`;
      if (dims.lShapeV) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار العمودي:</td><td style="padding: 5px;"><strong>${dims.lShapeV} cm</strong></td></tr>`;
      if (dims.uShapeL) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار الأيسر:</td><td style="padding: 5px;"><strong>${dims.uShapeL} cm</strong></td></tr>`;
      if (dims.uShapeH) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار الأوسط:</td><td style="padding: 5px;"><strong>${dims.uShapeH} cm</strong></td></tr>`;
      if (dims.uShapeR) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار الأيمن:</td><td style="padding: 5px;"><strong>${dims.uShapeR} cm</strong></td></tr>`;
      if (dims.fourWallsTop) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار العلوي:</td><td style="padding: 5px;"><strong>${dims.fourWallsTop} cm</strong></td></tr>`;
      if (dims.fourWallsLeft) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار الأيسر:</td><td style="padding: 5px;"><strong>${dims.fourWallsLeft} cm</strong></td></tr>`;
      if (dims.fourWallsRight) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">الجدار الأيمن:</td><td style="padding: 5px;"><strong>${dims.fourWallsRight} cm</strong></td></tr>`;
      if (dims.fourWallsBottomLeft) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">من اليسار إلى الباب:</td><td style="padding: 5px;"><strong>${dims.fourWallsBottomLeft} cm</strong></td></tr>`;
      if (dims.fourWallsBottomRight) dimensionsRows += `<tr><td style="padding: 5px; color: #666;">من الباب إلى اليمين:</td><td style="padding: 5px;"><strong>${dims.fourWallsBottomRight} cm</strong></td></tr>`;
    }
    measurementsHTML = `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 6px;">
        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">قياسات الغرفة</h3>
        <table style="width: 100%;">
          <tr><td style="padding: 5px; color: #666;">نوع التصميم:</td><td style="padding: 5px;"><strong>${getLayoutTypeLabel(rm.layoutType, 'ar')}</strong></td></tr>
          ${dimensionsRows}
          ${order.calculations?.carpetSelection ? `<tr><td style="padding: 5px; color: #666;">الزربية:</td><td style="padding: 5px;"><strong>نعم (${order.calculations.carpetSelection.baseTypeQuantity} - ${order.calculations.carpetSelection.label})</strong></td></tr>` : rm.includeZerbiya ? `<tr><td style="padding: 5px; color: #666;">الزربية:</td><td style="padding: 5px;"><strong>نعم (${rm.zerbiyaCount || 0})</strong></td></tr>` : ''}
        </table>
      </div>
    `;
  }

  // Image section
  let imageHTML = "";
  if (order.imageUrl) {
    imageHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">تصميم المجلس</h3>
        <img src="${order.imageUrl}" alt="تصميم المجلس" style="max-width: 100%; border-radius: 6px; border: 1px solid #ddd;" />
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>طلب جديد</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background-color: #2563eb; padding: 25px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🛒 طلب جديد!</h1>
                  <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px;">رقم الطلب: ${order.reference}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 25px;">
                  <!-- Quick Summary -->
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #fef3c7; border-right: 4px solid #f59e0b; border-radius: 6px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="font-size: 24px; font-weight: bold; color: #b45309;">${order.pricing.total.toLocaleString()} درهم</td>
                        <td style="text-align: left; color: #666;">المجموع الكلي</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Customer Info -->
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 6px;">
                    <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">معلومات العميل</h3>
                    <table style="width: 100%;">
                      <tr><td style="padding: 5px; color: #666; width: 100px;">الاسم:</td><td style="padding: 5px;"><strong>${order.customerInfo.name}</strong></td></tr>
                      <tr><td style="padding: 5px; color: #666;">الهاتف:</td><td style="padding: 5px;"><strong><a href="tel:${order.customerInfo.phone}" style="color: #2563eb;">${order.customerInfo.phone}</a></strong></td></tr>
                      <tr><td style="padding: 5px; color: #666;">البريد:</td><td style="padding: 5px;"><a href="mailto:${order.customerInfo.email}" style="color: #2563eb;">${order.customerInfo.email}</a></td></tr>
                      <tr><td style="padding: 5px; color: #666;">العنوان:</td><td style="padding: 5px;">${order.customerInfo.address.street}, ${order.customerInfo.address.city}, ${order.customerInfo.address.country}</td></tr>
                    </table>
                  </div>

                  ${measurementsHTML}
                  ${imageHTML}

                  <!-- Products -->
                  <div style="margin-bottom: 20px;">
                    <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">المنتجات</h3>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                      <thead>
                        <tr style="background-color: #f0f0f0;">
                          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">المنتج</th>
                          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">الكمية</th>
                          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">السعر</th>
                          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${productsHTML}
                      </tbody>
                    </table>
                  </div>

                  ${order.additionalItems && order.additionalItems.length > 0 ? `
                  <!-- Additional Items -->
                  <div style="margin-bottom: 20px;">
                    <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">منتجات إضافية</h3>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                      <thead>
                        <tr style="background-color: #f0f0f0;">
                          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">المنتج</th>
                          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">الكمية</th>
                          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">السعر</th>
                          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${order.additionalItems.map((item: any) => `
                        <tr>
                          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${item.name}</strong></td>
                          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">${item.unitPrice.toLocaleString()} درهم</td>
                          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">${item.totalPrice.toLocaleString()} درهم</td>
                        </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                  ` : ''}

                  <!-- Price Summary -->
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 6px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 5px; color: #666;">الإجمالي الفرعي:</td>
                        <td style="padding: 5px; text-align: left;">${order.pricing.subtotal.toLocaleString()} درهم</td>
                      </tr>
                      ${order.pricing.shipping ? `
                      <tr>
                        <td style="padding: 5px; color: #666;">التوصيل:</td>
                        <td style="padding: 5px; text-align: left;">${order.pricing.shipping.toLocaleString()} درهم</td>
                      </tr>
                      ` : ''}
                      <tr style="border-top: 2px solid #ddd;">
                        <td style="padding: 10px 5px; font-weight: bold; font-size: 18px;">المجموع:</td>
                        <td style="padding: 10px 5px; text-align: left; font-weight: bold; font-size: 18px; color: #b45309;">${order.pricing.total.toLocaleString()} درهم</td>
                      </tr>
                    </table>
                  </div>

                  ${order.notes ? `
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #fef3c7; border-radius: 6px;">
                    <h3 style="color: #b45309; margin: 0 0 8px 0; font-size: 14px;">ملاحظات العميل:</h3>
                    <p style="margin: 0; color: #666;">${order.notes}</p>
                  </div>
                  ` : ''}

                  <!-- Action Required -->
                  <div style="padding: 15px; background-color: #dcfce7; border: 2px solid #22c55e; border-radius: 6px; text-align: center;">
                    <p style="margin: 0; color: #166534; font-weight: bold;">يرجى التواصل مع العميل لتأكيد الطلب وإرسال تفاصيل الدفع</p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #333; padding: 20px; text-align: center;">
                  <p style="color: #999; margin: 0; font-size: 12px;">هذا البريد مرسل تلقائياً من نظام الداخلة المجالس</p>
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
