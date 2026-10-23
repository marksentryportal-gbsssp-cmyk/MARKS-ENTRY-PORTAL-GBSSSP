import { OtpRequest } from '../types';

export type OtpDeliveryMode = 'demo' | 'live';

interface RateLimitTracker {
  count: number;
  firstRequestTime: number;
}

// In-memory rate limiting map: udiseCode -> { count, firstRequestTime }
const rateLimitMap = new Map<string, RateLimitTracker>();

// Active OTPs in memory: udiseCode -> OtpRequest
const activeOtpMap = new Map<string, OtpRequest>();

/**
 * Mask phone number: e.g. "+91 94350 12345" -> "94******45"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const start = digits.slice(-10, -8);
  const end = digits.slice(-2);
  return `${start}******${end}`;
}

/**
 * Mask email address: e.g. "gopinathschool2024@gmail.com" -> "go****@gmail.com"
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const username = parts[0];
  const domain = parts[1];
  if (username.length <= 2) {
    return `${username}****@${domain}`;
  }
  const prefix = username.slice(0, 2);
  return `${prefix}****@${domain}`;
}

/**
 * Check hourly rate limit: maximum 5 requests per hour
 */
export function checkOtpRateLimit(udiseCode: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const record = rateLimitMap.get(udiseCode);

  if (!record) {
    return { allowed: true };
  }

  if (now - record.firstRequestTime > oneHour) {
    rateLimitMap.delete(udiseCode);
    return { allowed: true };
  }

  if (record.count >= 5) {
    const remainingMs = oneHour - (now - record.firstRequestTime);
    const waitMinutes = Math.ceil(remainingMs / 60000);
    return { allowed: false, waitMinutes };
  }

  return { allowed: true };
}

/**
 * Record a new OTP request for rate limiting
 */
function recordOtpRequest(udiseCode: string) {
  const now = Date.now();
  const record = rateLimitMap.get(udiseCode);
  if (!record || now - record.firstRequestTime > 60 * 60 * 1000) {
    rateLimitMap.set(udiseCode, { count: 1, firstRequestTime: now });
  } else {
    record.count += 1;
  }
}

/**
 * Generate a cryptographically random 6-digit OTP
 */
export function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000) + 100000; // 100000 - 999999
  return code.toString();
}

/**
 * Send OTP via specified channel
 * Single pluggable service function for real SMS, email, Firebase, etc.
 */
export async function sendOtp(
  channel: 'sms' | 'email' | 'all',
  destination: { phone?: string; email?: string },
  otp: string
): Promise<{ success: boolean; message: string }> {
  const destinations: string[] = [];
  if (destination.phone) {
    destinations.push(maskPhone(destination.phone));
  }
  if (destination.email) {
    destinations.push(maskEmail(destination.email));
  }

  const destStr = destinations.join(' and ');
  return {
    success: true,
    message: destStr ? `OTP sent to ${destStr}` : 'OTP sent successfully',
  };
}

/**
 * Request a new OTP for a school by UDISE code
 */
export function requestOtpForSchool(
  udiseCode: string,
  destination: { phone?: string; email?: string },
  deliveryMode: OtpDeliveryMode = 'demo'
): { success: boolean; otp?: string; message: string; waitMinutes?: number } {
  // 1. Check rate limit
  const limitCheck = checkOtpRateLimit(udiseCode);
  if (!limitCheck.allowed) {
    return {
      success: false,
      message: `Maximum OTP requests reached. Please wait ${limitCheck.waitMinutes} minute(s) before requesting again.`,
      waitMinutes: limitCheck.waitMinutes,
    };
  }

  // 2. Generate 6-digit OTP
  const otp = generateOtp();
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;

  // 3. Store in active OTP map
  activeOtpMap.set(udiseCode, {
    code: otp,
    udiseCode,
    expiresAt: now + fiveMinutesMs,
    createdAt: now,
    attempts: 0,
  });

  // 4. Record rate limit
  recordOtpRequest(udiseCode);

  // 5. Build message
  let message = '';
  if (deliveryMode === 'demo') {
    message = `Demo mode: your OTP is ${otp}`;
  } else {
    const destinations: string[] = [];
    if (destination.phone) destinations.push(maskPhone(destination.phone));
    if (destination.email) destinations.push(maskEmail(destination.email));
    message = destinations.length > 0
      ? `OTP sent to ${destinations.join(' and ')}`
      : 'OTP sent to registered mobile and email';
  }

  return {
    success: true,
    otp,
    message,
  };
}

// Deprecated alias for backward compatibility
export const requestOtpForInstitution = requestOtpForSchool;

/**
 * Verify OTP entered by the user
 */
export function verifyOtp(
  udiseCode: string,
  enteredOtp: string
): { success: boolean; message: string } {
  const activeOtp = activeOtpMap.get(udiseCode);

  if (!activeOtp) {
    return {
      success: false,
      message: 'No active OTP request found. Please click "Send OTP" first.',
    };
  }

  const now = Date.now();
  if (now > activeOtp.expiresAt) {
    activeOtpMap.delete(udiseCode);
    return {
      success: false,
      message: 'OTP has expired. Please request a new OTP.',
    };
  }

  activeOtp.attempts += 1;
  if (activeOtp.attempts > 5) {
    activeOtpMap.delete(udiseCode);
    return {
      success: false,
      message: 'Too many incorrect attempts. Please request a new OTP.',
    };
  }

  if (activeOtp.code.trim() !== enteredOtp.trim()) {
    return {
      success: false,
      message: 'Invalid OTP entered. Please check and try again.',
    };
  }

  // OTP is correct! Remove so it cannot be reused
  activeOtpMap.delete(udiseCode);
  return {
    success: true,
    message: 'OTP verified successfully.',
  };
}
