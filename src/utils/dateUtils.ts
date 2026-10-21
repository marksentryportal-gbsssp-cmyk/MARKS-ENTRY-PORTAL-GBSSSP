/**
 * Utilities for dd-mm-yyyy date formatting and comparison
 */

// Parse "dd-mm-yyyy" to a Date object (midnight local)
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day, 0, 0, 0, 0);
}

// Format Date object to "dd-mm-yyyy"
export function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

// Convert HTML date input "yyyy-mm-dd" to "dd-mm-yyyy"
export function htmlInputToDateStr(htmlDate: string): string {
  if (!htmlDate) return '';
  const parts = htmlDate.split('-');
  if (parts.length !== 3) return htmlDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Convert "dd-mm-yyyy" to HTML date input "yyyy-mm-dd"
export function dateStrToHtmlInput(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Returns today's date formatted as dd-mm-yyyy, matching system metadata time
 */
export function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Calculates current academic year string (e.g. "2026-2027")
 * Academic year in Assam/India runs from April to March
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 is January, 3 is April
  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Evaluates exam status based on:
 * - isFinalSubmitted
 * - start and end dates compared to today
 */
export function getExamStatus(
  startDateStr: string,
  endDateStr: string,
  isFinalSubmitted: boolean
): 'FinalSubmitted' | 'Open' | 'Closed' | 'NotStarted' {
  if (isFinalSubmitted) {
    return 'FinalSubmitted';
  }

  const today = getTodayDate();
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  if (!start || !end) {
    return 'Open';
  }

  // End of the end date (23:59:59)
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);

  if (today < start) {
    return 'NotStarted';
  }

  if (today > endOfDay) {
    return 'Closed';
  }

  return 'Open';
}
