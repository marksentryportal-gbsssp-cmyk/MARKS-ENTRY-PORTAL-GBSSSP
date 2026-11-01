/**
 * Academic Session Normalization and Comparison Utilities
 * Ensures compatibility between different formats (e.g. "2026-2027", "2026-27", "2026–27" with en-dash)
 * without rewriting original Firestore historical document values.
 */

export function normalizeAcademicYear(yearStr?: string | null): string {
  if (!yearStr) return '';
  // Replace all unicode dashes/hyphens with a standard ASCII hyphen
  const cleaned = yearStr.trim().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');
  
  // Match YYYY-YYYY or YYYY-YY
  const match = cleaned.match(/(\d{4})\s*-\s*(\d{2,4})/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    let endYearStr = match[2];
    if (endYearStr.length === 2) {
      const century = Math.floor(startYear / 100) * 100;
      endYearStr = String(century + parseInt(endYearStr, 10));
    }
    return `${startYear}-${endYearStr}`;
  }

  // Fallback for single 4-digit year or irregular string
  return cleaned.replace(/\s+/g, '');
}

/**
 * Returns true if both academic session strings represent the same academic year
 */
export function isSameAcademicYear(year1?: string | null, year2?: string | null): boolean {
  if (!year1 || !year2) return false;
  return normalizeAcademicYear(year1) === normalizeAcademicYear(year2);
}

/**
 * Formats a normalized academic year for display (e.g. "2026-27")
 */
export function formatAcademicYearDisplay(yearStr?: string | null): string {
  const norm = normalizeAcademicYear(yearStr);
  const parts = norm.split('-');
  if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
    return `${parts[0]}-${parts[1].slice(2)}`;
  }
  return yearStr || '';
}
