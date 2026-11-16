/**
 * KudiSMS OTP Verification Service for AfriChat
 * Backend-generated 6-digit numeric OTP with 5-minute TTL (300 seconds),
 * rate limiting, and SMS delivery via KudiSMS API.
 */

export interface RequestOtpResponse {
  success: boolean;
  message?: string;
  expiresInSeconds?: number;
  expiresAt?: number;
  isTestMode?: boolean;
  devCode?: string;
  error?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  expired?: boolean;
}

/**
 * Request backend to generate a 6-digit OTP (5-minute TTL)
 * and dispatch it via KudiSMS to the given phone number.
 */
export async function requestBackendOtp(phoneNumber: string): Promise<RequestOtpResponse> {
  if (!phoneNumber || phoneNumber.trim().length < 7) {
    return {
      success: false,
      error: 'Please enter a valid phone number.',
    };
  }

  try {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phoneNumber }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to send OTP. Please try again.',
      };
    }

    return {
      success: true,
      message: data.message,
      expiresInSeconds: data.expiresInSeconds || 300,
      expiresAt: data.expiresAt || (Date.now() + 300 * 1000),
      isTestMode: Boolean(data.isTestMode),
      devCode: data.devCode,
    };
  } catch (err: any) {
    console.error('KudiSMS request OTP error:', err);
    return {
      success: false,
      error: err?.message || 'Unable to connect to verification server. Please check your network.',
    };
  }
}

/**
 * Verify the user-entered OTP against the backend store.
 * Validates expiration (5-minute window), max attempts, and single-use invalidation.
 */
export async function verifyBackendOtp(phoneNumber: string, code: string): Promise<VerifyOtpResponse> {
  if (!phoneNumber || !code) {
    return {
      success: false,
      error: 'Phone number and verification code are required.',
    };
  }

  const cleanCode = code.trim();
  if (cleanCode.length !== 6) {
    return {
      success: false,
      error: 'Verification code must be 6 digits.',
    };
  }

  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber,
        code: cleanCode,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Invalid or expired verification code.',
        expired: Boolean(data.expired),
      };
    }

    return {
      success: true,
      message: data.message || 'Phone number verified successfully.',
    };
  } catch (err: any) {
    console.error('KudiSMS verify OTP error:', err);
    return {
      success: false,
      error: err?.message || 'Verification failed. Please check your network and try again.',
    };
  }
}
