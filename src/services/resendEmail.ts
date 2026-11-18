/**
 * Resend Email Service for AfriChat
 * Powered by Resend API via server-side gateway
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

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

    // Dispatch securely via server-side email gateway (no API keys exposed to browser)
    const proxyRes = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: recipients, subject, html: emailHtml }),
    });

    const proxyJson = await proxyRes.json().catch(() => ({}));
    if (proxyRes.ok && (proxyJson?.success || proxyJson?.id || proxyJson?.data?.id)) {
      return { success: true, id: proxyJson?.data?.id || proxyJson?.id };
    }

    return {
      success: false,
      error: proxyJson?.error || proxyJson?.message || `Email service rejected with status ${proxyRes.status}`,
    };
  } catch (err: any) {
    console.warn('Email connection failure:', err);
    return { success: false, error: err?.message || 'Network error sending email' };
  }
}
