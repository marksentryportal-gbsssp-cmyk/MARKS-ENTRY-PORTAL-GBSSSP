import { ClassInfo, Student } from '../types';

export const CANONICAL_CLASSES = [
  'Ankur',
  'P.P',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
] as const;

export const DEFAULT_SECTIONS = ['A', 'B', 'C', 'D'] as const;

/**
 * Normalizes text to uppercase and collapses multiple whitespaces
 */
export function normalizeUpperText(str?: string | null): string {
  if (!str) return '';
  return str.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Validates student name:
 * - UPPERCASE
 * - Letters, spaces, dots (.), apostrophes (')
 */
export function validateStudentName(rawName?: string | null): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeUpperText(rawName);
  if (!normalized) {
    return { isValid: false, normalized: '', error: 'Student Full Name is required' };
  }
  // Allow letters, spaces, dots and apostrophes
  const validPattern = /^[A-Z\s.']+$/;
  if (!validPattern.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: "Only letters, spaces, dots (.) and apostrophes (') allowed in name",
    };
  }
  return { isValid: true, normalized };
}

/**
 * Validates parent names
 */
export function validateParentName(
  rawName: string | null | undefined,
  isRequired = true,
  fieldLabel = "Father's Name"
): {
  isValid: boolean;
  normalized: string;
  error?: string;
  warning?: string;
} {
  const normalized = normalizeUpperText(rawName);
  if (!normalized) {
    if (isRequired) {
      return { isValid: false, normalized: '', error: `${fieldLabel} is required` };
    }
    return {
      isValid: true,
      normalized: '',
      warning: `${fieldLabel} is recommended for official records`,
    };
  }
  const validPattern = /^[A-Z\s.']+$/;
  if (!validPattern.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: `Only letters, spaces, dots and apostrophes allowed in ${fieldLabel.toLowerCase()}`,
    };
  }
  return { isValid: true, normalized };
}

/**
 * Validates Current Address: max 200 characters
 */
export function validateCurrentAddress(addr?: string | null): {
  isValid: boolean;
  normalized: string;
  error?: string;
  warning?: string;
} {
  const trimmed = (addr || '').trim();
  if (!trimmed) {
    return {
      isValid: true,
      normalized: '',
      warning: 'Current address is recommended for student record',
    };
  }
  if (trimmed.length > 200) {
    return {
      isValid: false,
      normalized: trimmed,
      error: `Current address exceeds 200 characters limit (${trimmed.length}/200)`,
    };
  }
  return { isValid: true, normalized: trimmed };
}

/**
 * Typical age range by class order (1-based: 1=Ankur, 14=Twelve)
 */
export const CLASS_AGE_RANGES: Record<number, { min: number; max: number }> = {
  1: { min: 3, max: 5 }, // Ankur
  2: { min: 4, max: 6 }, // P.P
  3: { min: 5, max: 8 }, // One
  4: { min: 6, max: 9 }, // Two
  5: { min: 7, max: 10 }, // Three
  6: { min: 8, max: 11 }, // Four
  7: { min: 9, max: 12 }, // Five
  8: { min: 10, max: 13 }, // Six
  9: { min: 11, max: 14 }, // Seven
  10: { min: 12, max: 15 }, // Eight
  11: { min: 13, max: 16 }, // Nine
  12: { min: 14, max: 17 }, // Ten
  13: { min: 15, max: 18 }, // Eleven
  14: { min: 16, max: 20 }, // Twelve
};

/**
 * Calculates age in full years from dd-mm-yyyy date
 */
export function calculateAgeYears(dobStr: string, asOfDate: Date = new Date()): number | null {
  const match = dobStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const year = parseInt(match[3], 10);

  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return null;

  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const m = asOfDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && asOfDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Checks if year is leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Validates days in month: rejects impossible dates like 31-02-2011 or 31-04-2011
 */
function isValidDayMonthYear(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

/**
 * Normalizes and validates Date of Birth in dd-mm-yyyy format.
 * Rejects future dates and impossible dates (31-02-2011).
 * Emits soft warning if age looks unusual for the class.
 */
export function parseAndValidateDob(
  raw: any,
  classOrder?: number,
  className?: string
): {
  dateStr: string;
  isValid: boolean;
  error?: string;
  warning?: string;
  ageYears?: number;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { dateStr: '', isValid: false, error: 'Date of Birth is required (dd-mm-yyyy)' };
  }

  // 1. Convert Excel Date / number serial to dd-mm-yyyy
  let candidateStr = '';
  if (raw instanceof Date) {
    if (!isNaN(raw.getTime())) {
      const d = String(raw.getDate()).padStart(2, '0');
      const m = String(raw.getMonth() + 1).padStart(2, '0');
      candidateStr = `${d}-${m}-${raw.getFullYear()}`;
    }
  } else if (typeof raw === 'number') {
    // Excel base date Dec 30 1899
    const utcDays = Math.floor(raw - 25569);
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const d = String(dateObj.getUTCDate()).padStart(2, '0');
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      candidateStr = `${d}-${m}-${dateObj.getUTCFullYear()}`;
    }
  } else {
    candidateStr = String(raw).trim();
  }

  if (!candidateStr) {
    return { dateStr: '', isValid: false, error: 'Date of Birth is required' };
  }

  // Check formats: dd-mm-yyyy or dd/mm/yyyy or dd.mm.yyyy or yyyy-mm-dd
  let day = 0;
  let month = 0;
  let year = 0;

  const dmyMatch = candidateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  const ymdMatch = candidateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else {
    return {
      dateStr: candidateStr,
      isValid: false,
      error: 'Invalid date format. Use dd-mm-yyyy (e.g. 13-12-2011)',
    };
  }

  // Check valid calendar day
  if (!isValidDayMonthYear(day, month, year)) {
    return {
      dateStr: candidateStr,
      isValid: false,
      error: `Impossible date: ${day}/${month}/${year} does not exist in calendar`,
    };
  }

  const dStr = String(day).padStart(2, '0');
  const mStr = String(month).padStart(2, '0');
  const formatted = `${dStr}-${mStr}-${year}`;

  // Check future date
  const birthDate = new Date(year, month - 1, day);
  const now = new Date();
  if (birthDate.getTime() > now.getTime()) {
    return {
      dateStr: formatted,
      isValid: false,
      error: 'Date of birth cannot be in the future',
    };
  }

  // Check reasonable minimum year (e.g. must be after 1990)
  if (year < 1990) {
    return {
      dateStr: formatted,
      isValid: false,
      error: 'Year of birth must be 1990 or later',
    };
  }

  const ageYears = calculateAgeYears(formatted, now) ?? undefined;

  // Age warning for class
  let warning: string | undefined = undefined;
  if (classOrder && CLASS_AGE_RANGES[classOrder] && ageYears !== undefined) {
    const range = CLASS_AGE_RANGES[classOrder];
    if (ageYears < range.min || ageYears > range.max) {
      warning = `Age (${ageYears} yrs) is outside typical range (${range.min}-${range.max} yrs) for Class ${
        className || classOrder
      }`;
    }
  }

  return {
    dateStr: formatted,
    isValid: true,
    warning,
    ageYears,
  };
}

/**
 * Normalizes gender: 'Male' | 'Female' | 'Other'
 */
export function normaliseGender(raw: any): {
  gender: 'Male' | 'Female' | 'Other';
  isValid: boolean;
  error?: string;
} {
  if (!raw) {
    return { gender: 'Male', isValid: false, error: 'Gender is required (Male/Female/Other)' };
  }
  const str = String(raw).trim().toLowerCase();
  if (str === 'male' || str === 'm' || str === 'boy' || str === 'b') {
    return { gender: 'Male', isValid: true };
  }
  if (str === 'female' || str === 'f' || str === 'girl' || str === 'g') {
    return { gender: 'Female', isValid: true };
  }
  if (str === 'other' || str === 'o' || str === 'transgender' || str === 't') {
    return { gender: 'Other', isValid: true };
  }

  return {
    gender: 'Male',
    isValid: false,
    error: "Gender must be 'Male', 'Female', or 'Other'",
  };
}

/**
 * Class name mapping aliases
 */
const CLASS_ALIASES: Record<string, string> = {
  ankur: 'ankur',
  pp: 'pp',
  'p.p': 'pp',
  'p.p.': 'pp',
  'pre-primary': 'pp',
  preprimary: 'pp',
  lkg: 'pp',
  ukg: 'pp',

  one: 'one',
  '1': 'one',
  i: 'one',
  'class 1': 'one',
  'class-1': 'one',
  'class i': 'one',

  two: 'two',
  '2': 'two',
  ii: 'two',
  'class 2': 'two',
  'class-2': 'two',
  'class ii': 'two',

  three: 'three',
  '3': 'three',
  iii: 'three',
  'class 3': 'three',
  'class-3': 'three',
  'class iii': 'three',

  four: 'four',
  '4': 'four',
  iv: 'four',
  'class 4': 'four',
  'class-4': 'four',
  'class iv': 'four',

  five: 'five',
  '5': 'five',
  v: 'five',
  'class 5': 'five',
  'class-5': 'five',
  'class v': 'five',

  six: 'six',
  '6': 'six',
  vi: 'six',
  'class 6': 'six',
  'class-6': 'six',
  'class vi': 'six',

  seven: 'seven',
  '7': 'seven',
  vii: 'seven',
  'class 7': 'seven',
  'class-7': 'seven',
  'class vii': 'seven',

  eight: 'eight',
  '8': 'eight',
  viii: 'eight',
  'class 8': 'eight',
  'class-8': 'eight',
  'class viii': 'eight',

  nine: 'nine',
  '9': 'nine',
  ix: 'nine',
  'class 9': 'nine',
  'class-9': 'nine',
  'class ix': 'nine',

  ten: 'ten',
  '10': 'ten',
  x: 'ten',
  'class 10': 'ten',
  'class-10': 'ten',
  'class x': 'ten',

  eleven: 'eleven',
  '11': 'eleven',
  xi: 'eleven',
  'class 11': 'eleven',
  'class-11': 'eleven',
  'class xi': 'eleven',

  twelve: 'twelve',
  '12': 'twelve',
  xii: 'twelve',
  'class 12': 'twelve',
  'class-12': 'twelve',
  'class xii': 'twelve',
};

/**
 * Simple Levenshtein distance for fuzzy class typo suggestions (e.g. 'Nien' -> 'Nine')
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Matches raw class name from Excel to system ClassInfo
 */
export function matchClass(
  rawClass: string | null | undefined,
  availableClasses: ClassInfo[]
): {
  matchedClass: ClassInfo | null;
  isValid: boolean;
  isValidClass: boolean;
  classId?: string;
  className?: string;
  suggestion?: string;
  suggestedClass?: ClassInfo;
  didYouMean?: string;
  error?: string;
} {
  if (!rawClass || !String(rawClass).trim()) {
    return {
      matchedClass: null,
      isValid: false,
      isValidClass: false,
      error: 'Class is required',
    };
  }

  const rawClean = String(rawClass).trim().toLowerCase().replace(/class\s+/g, '').trim();

  // 1. Direct ID or Name match
  const direct = availableClasses.find(
    (c) =>
      c.id.toLowerCase() === rawClean ||
      c.name.toLowerCase() === rawClean ||
      c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === rawClean.replace(/[^a-z0-9]/g, '')
  );
  if (direct) {
    return {
      matchedClass: direct,
      isValid: true,
      isValidClass: true,
      classId: direct.id,
      className: direct.name,
    };
  }

  // 2. Check Aliases
  const aliasId = CLASS_ALIASES[rawClean] || CLASS_ALIASES[rawClean.replace(/[^a-z0-9]/g, '')];
  if (aliasId) {
    const fromAlias = availableClasses.find((c) => c.id.toLowerCase() === aliasId);
    if (fromAlias) {
      return {
        matchedClass: fromAlias,
        isValid: true,
        isValidClass: true,
        classId: fromAlias.id,
        className: fromAlias.name,
      };
    }
  }

  // 3. Typo fuzzy match (e.g. 'Nien' -> 'Nine')
  let bestDist = 999;
  let candidateMatch: ClassInfo | null = null;
  for (const c of availableClasses) {
    const dist = levenshtein(rawClean, c.name.toLowerCase());
    if (dist < bestDist && dist <= 2) {
      bestDist = dist;
      candidateMatch = c;
    }
  }

  if (candidateMatch !== null) {
    const candidateName = candidateMatch.name;
    return {
      matchedClass: null,
      isValid: false,
      isValidClass: false,
      suggestion: candidateName,
      didYouMean: candidateName,
      suggestedClass: candidateMatch,
      error: `Class '${rawClass}' not found. Did you mean ${candidateName}?`,
    };
  }

  return {
    matchedClass: null,
    isValid: false,
    isValidClass: false,
    error: `Class '${rawClass}' is not one of the 14 allowed classes`,
  };
}

/**
 * Duplicate student check: (name + fatherName + dob) within class
 */
export function findDuplicateStudent(
  candidate: { name: string; fatherName: string; dob: string; classId?: string },
  existingStudents: Student[],
  ignoreStudentId?: string
): { isDuplicate: boolean; duplicateStudent?: Student; message?: string } {
  const normName = normalizeUpperText(candidate.name);
  const normFather = normalizeUpperText(candidate.fatherName);
  const dob = candidate.dob.trim();

  if (!normName || !normFather || !dob) {
    return { isDuplicate: false };
  }

  const match = existingStudents.find((s) => {
    if (ignoreStudentId && s.id === ignoreStudentId) return false;
    if (candidate.classId && s.classId !== candidate.classId) return false;
    if (s.active === false) return false;

    return (
      normalizeUpperText(s.name) === normName &&
      normalizeUpperText(s.fatherName) === normFather &&
      (s.dob || '').trim() === dob
    );
  });

  if (match) {
    return {
      isDuplicate: true,
      duplicateStudent: match,
      message: `A student with the same name, father's name and DOB already exists in this class (${match.name}, Roll: ${match.rollNo})`,
    };
  }

  return { isDuplicate: false };
}
