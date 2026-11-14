/**
 * Resend Email Service for AfriChat
 * Powered by Resend API: https://resend.com
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export const getResendApiKey = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_RESEND_API_KEY) {
    return (import.meta as any).env.VITE_RESEND_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }
  return '';
};

export const DEFAULT_SENDER = 'onboarding@resend.dev';
export const ADMIN_EMAIL = 'aibytelabs000@gmail.com';

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_SENDER,
}: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const recipients = Array.isArray(to) ? to : [to];
    const emailHtml =
      html ||
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0a1c; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #c084fc; margin-bottom: 12px;">AfriChat Notification</h2>
        <p style="font-size: 15px; color: #e2e8f0; line-height: 1.6;">${text || subject}</p>
        <hr style="border: 0; border-top: 1px solid #2e1065; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a855f7;">Secure Super-App Communication · AfriChat (AGC)</p>
      </div>`;

    // 1. Try local Express backend route first (avoids browser CORS restrictions on Resend API)
    try {
      const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const proxyRes = await fetch(`http://${socketHost}:3002/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: recipients, subject, html: emailHtml }),
      });
      if (proxyRes.ok) {
        const proxyJson = await proxyRes.json();
        return { success: true, id: proxyJson?.data?.id || proxyJson?.id };
      }
    } catch (_) {}

    // 2. Direct Resend API call fallback
    const key = getResendApiKey();
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html: emailHtml,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('Resend error:', data);
      return { success: false, error: data?.message || 'Resend API call rejected' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.warn('Resend connection failure:', err);
    return { success: false, error: err?.message || 'Network error sending email' };
  }
}
