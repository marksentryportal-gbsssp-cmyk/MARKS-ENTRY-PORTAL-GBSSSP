import { User, AuthSession } from '../types';

const SESSION_STORAGE_KEY = 'gopinath_portal_auth_session_v1';

/**
 * Generate a cryptographically random salt (hex string)
 */
export function generateSalt(length: number = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password with salt using Web Crypto API SHA-256
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a plain text password against a stored hash and salt
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash.toLowerCase() === storedHash.toLowerCase();
}

/**
 * Standard seed credentials for initial admin
 */
export const DEFAULT_ADMIN_CODE = '06H1003';
export const DEFAULT_ADMIN_PASSWORD = '123456';
export const DEFAULT_ADMIN_SALT = 'salt_06h1003_secure_seed';

// Pre-computed SHA-256 for "123456:salt_06h1003_secure_seed"
// Let's also verify/recompute on demand if needed
export const DEFAULT_ADMIN_HASH = '1f440a2307dece0a80e14ef61019d0e2e92c0192e276b92a4038a8b1ef232f05';

/**
 * Check password strength
 * Returns a score 0-100, label, and validation checks
 */
export function evaluatePasswordStrength(password: string): {
  score: number; // 0-100
  label: 'Too Short' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: string;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  let score = 0;
  if (password.length >= 8) score += 35;
  if (password.length >= 10) score += 15;
  if (hasLetter) score += 20;
  if (hasNumber) score += 20;
  if (hasSpecial) score += 10;

  let label: 'Too Short' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong' = 'Too Short';
  let color = '#ef4444'; // red

  if (password.length === 0) {
    score = 0;
    label = 'Too Short';
    color = '#94a3b8';
  } else if (!hasMinLength) {
    label = 'Too Short';
    color = '#ef4444';
  } else if (score < 55) {
    label = 'Weak';
    color = '#f97316'; // orange
  } else if (score < 75) {
    label = 'Medium';
    color = '#eab308'; // yellow
  } else if (score < 90) {
    label = 'Strong';
    color = '#10b981'; // emerald
  } else {
    label = 'Very Strong';
    color = '#059669'; // dark emerald
  }

  return {
    score,
    label,
    color,
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
  };
}

/**
 * Validate password requirements:
 * Minimum 8 characters with at least one letter and one number
 */
export function isValidPassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter (a-z, A-Z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number (0-9).' };
  }
  return { isValid: true };
}

/**
 * Session storage utilities
 */
export function loadStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);

    const now = Date.now();
    const expiry = new Date(session.expiresAt).getTime();
    if (now > expiry) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch (e) {
    return null;
  }
}

export function saveStoredSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    // ignore
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
