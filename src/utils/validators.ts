/**
 * Input validators and formatters for authentication
 */

export function sanitizeInstitutionCode(code: string): string {
  // Allow letters and numbers, max 7 characters, uppercase
  return code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7).toUpperCase();
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
