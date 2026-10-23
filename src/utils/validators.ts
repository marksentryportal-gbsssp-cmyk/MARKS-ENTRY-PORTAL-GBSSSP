/**
 * Input validators and formatters for authentication and UDISE code
 */

/**
 * Strips any non-digit characters and limits to exactly 11 digits
 */
export function sanitizeUdiseCode(code: string): string {
  if (!code) return '';
  return code.replace(/\D/g, '').slice(0, 11);
}

/**
 * Validates that the School UDISE Code is exactly 11 numeric digits
 */
export function isValidUdiseCode(code: string): boolean {
  if (!code) return false;
  return /^\d{11}$/.test(code.trim());
}

// Deprecated alias for backward compatibility
export function sanitizeInstitutionCode(code: string): string {
  return sanitizeUdiseCode(code);
}

export function validatePasswordCriteria(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('At least 8 characters long');
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('At least one letter (A-Z or a-z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number (0-9)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
