import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/clerk-auth';
import rateLimit, { getIPFromRequest } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY || '');

// Rate limit: 10 requests per minute (admin only)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

// Status labels in Arabic
const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending_payment: 'في انتظار الدفع',
  confirmed: 'تم التأكيد',
  in_production: 'قيد الإنتاج',
  in_production_tissu_ponj: 'قيد الإنتاج: القماش والبنج',
  delivered_ponj: 'تم توصيل البنج',
  shipping_tissu: 'جاري توصيل القماش',
  delivered_tissu: 'تم توصيل القماش',
  ready_for_delivery: 'جاهز للتوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي'
};

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

    const { email, customerName, orderRef, newStatus } = await request.json();

    if (!email || !orderRef || !newStatus) {
      throw new Error('Missing required information');
    }

    const statusLabel = statusLabels[newStatus] || newStatus;
    const emailHtml = generateStatusEmailHTML(customerName, orderRef, statusLabel);
    const emailSubject = `تحديث حالة طلبك ${orderRef}`;

    await resend.emails.send({
      from: 'Dakhla Majalis <contact@dakhlamajalis.com>',
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status email error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    const status = message.includes('Authentication required') ? 401
      : message.includes('Admin access required') ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function generateStatusEmailHTML(customerName: string, orderRef: string, statusLabel: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
              <tr>
                <td style="text-align: center; padding-bottom: 20px;">
                  <h1 style="color: #BD7C48; margin: 0; font-size: 24px;">تحديث حالة الطلب</h1>
                </td>
              </tr>
              <tr>
                <td style="text-align: right; padding-bottom: 15px;">
                  <p style="margin: 0; color: #666;">مرحباً ${customerName}،</p>
                </td>
              </tr>
              <tr>
                <td style="text-align: right; padding-bottom: 20px;">
                  <p style="margin: 0; color: #333;">تم تحديث حالة طلبك رقم <strong style="color: #BD7C48;">${orderRef}</strong></p>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">الحالة الجديدة</p>
                  <p style="margin: 0; color: #BD7C48; font-size: 22px; font-weight: bold;">${statusLabel}</p>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-top: 25px;">
                  <p style="margin: 0; color: #666; font-size: 14px;">شكراً لاختيارك الداخلة المجالس</p>
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
