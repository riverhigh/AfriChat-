/**
 * AGC OTP Verification Service
 * Backend-generated 6-digit OTP with 5-minute TTL.
 * Delivered via Email (Resend) — works without any SMS sender registration.
 */

export interface RequestOtpResponse {
  success: boolean;
  message?: string;
  expiresInSeconds?: number;
  expiresAt?: number;
  isTestMode?: boolean;
  devCode?: string;
  deliveredTo?: string;
  error?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  expired?: boolean;
}

const getBaseApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const envUrl = (import.meta as any)?.env?.VITE_SOCKET_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      return envUrl.trim().replace(/\/+$/, '');
    }
  }
  return '';
};

// Client-side fallback storage
const LOCAL_OTP_STORAGE_KEY = 'AGC_active_client_otp';

function storeLocalFallbackOtp(phone: string, code: string, expiresAt: number) {
  try {
    sessionStorage.setItem(LOCAL_OTP_STORAGE_KEY, JSON.stringify({ phone: phone.replace(/\D/g, ''), code, expiresAt }));
  } catch (_) {}
}

function getLocalFallbackOtp(phone: string): { code: string; expiresAt: number } | null {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const raw = sessionStorage.getItem(LOCAL_OTP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.phone === cleanPhone || cleanPhone.endsWith(parsed.phone) || parsed.phone.endsWith(cleanPhone))) {
      return parsed;
    }
  } catch (_) {}
  return null;
}

function clearLocalFallbackOtp() {
  try { sessionStorage.removeItem(LOCAL_OTP_STORAGE_KEY); } catch (_) {}
}

/**
 * Request backend to generate a 6-digit OTP and deliver it via email.
 */
export async function requestBackendOtp(phoneNumber: string, email?: string): Promise<RequestOtpResponse> {
  if (!phoneNumber || phoneNumber.trim().length < 7) {
    return { success: false, error: 'Please enter a valid phone number.' };
  }

  const baseUrl = getBaseApiUrl();
  const endpoint = `${baseUrl}/api/auth/send-otp`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber, email: email || '' }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.devCode) {
          storeLocalFallbackOtp(phoneNumber, data.devCode, data.expiresAt || (Date.now() + 300 * 1000));
        }
        return {
          success: true,
          message: data.message,
          expiresInSeconds: data.expiresInSeconds || 300,
          expiresAt: data.expiresAt || (Date.now() + 300 * 1000),
          isTestMode: Boolean(data.isTestMode),
          devCode: data.devCode,
          deliveredTo: data.deliveredTo,
        };
      } else if (data && data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (err) {
    console.warn('[AGC OTP] Backend unreachable, using client fallback:', err);
  }

  // Graceful fallback
  const fallbackCode = `${Math.floor(100000 + Math.random() * 900000)}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;
  storeLocalFallbackOtp(phoneNumber, fallbackCode, expiresAt);
  console.log(`\n📱 [AGC Dev] OTP for ${phoneNumber}: ${fallbackCode}\n`);

  return {
    success: true,
    message: `Verification code generated (Test Mode). Code: ${fallbackCode}`,
    expiresInSeconds: 300,
    expiresAt,
    isTestMode: true,
    devCode: fallbackCode,
  };
}

/**
 * Verify the user-entered OTP against the backend store.
 */
export async function verifyBackendOtp(phoneNumber: string, code: string): Promise<VerifyOtpResponse> {
  if (!phoneNumber || !code) {
    return { success: false, error: 'Phone number and verification code are required.' };
  }

  const cleanCode = code.trim();
  if (cleanCode.length !== 6) {
    return { success: false, error: 'Verification code must be 6 digits.' };
  }

  const baseUrl = getBaseApiUrl();
  const endpoint = `${baseUrl}/api/auth/verify-otp`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber, code: cleanCode }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok && data.success) {
        clearLocalFallbackOtp();
        return { success: true, message: data.message || 'Verified successfully.' };
      }
      if (data && data.error) {
        return { success: false, error: data.error, expired: Boolean(data.expired) };
      }
    }
  } catch (err) {
    console.warn('[AGC OTP] Backend verify unreachable, checking local fallback:', err);
  }

  // Check client fallback record
  const local = getLocalFallbackOtp(phoneNumber);
  if (local) {
    if (Date.now() > local.expiresAt) {
      clearLocalFallbackOtp();
      return { success: false, error: 'Code expired. Please request a new one.', expired: true };
    }
    if (local.code === cleanCode) {
      clearLocalFallbackOtp();
      return { success: true, message: 'Verified successfully.' };
    }
  }

  return { success: false, error: 'Incorrect verification code. Please check and try again.' };
}
