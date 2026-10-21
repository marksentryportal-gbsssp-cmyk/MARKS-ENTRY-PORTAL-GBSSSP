import * as XLSX from 'xlsx';
import { formatDate } from './dateUtils';

// Standard expected headers
export const EXPECTED_HEADERS = [
  'Registration No',
  'Student Name',
  'Father Name',
  'Mother Name',
  'DOB',
  'Gender',
  'Section',
  'Roll No',
  'Admission No',
] as const;

export type StandardHeaderKey =
  | 'registrationNo'
  | 'name'
  | 'fatherName'
  | 'motherName'
  | 'dob'
  | 'gender'
  | 'section'
  | 'rollNo'
  | 'admissionNo';

export const HEADER_MAPPING_RULES: Record<StandardHeaderKey, string[]> = {
  registrationNo: ['registration no', 'registrationno', 'reg no', 'reg_no', 'regno', 'registration'],
  name: ['student name', 'name', 'student_name', 'candidate name', 'studentname', 'full name'],
  fatherName: ["father's name", 'father name', 'father_name', 'fathername', 'fathers name'],
  motherName: ["mother's name", 'mother name', 'mother_name', 'mothername', 'mothers name'],
  dob: ['dob', 'date of birth', 'date_of_birth', 'birth date', 'birthdate'],
  gender: ['gender', 'sex'],
  section: ['section', 'sec'],
  rollNo: ['roll no', 'rollno', 'roll_no', 'roll number', 'roll'],
  admissionNo: ['admission no', 'admissionno', 'adm no', 'admission_no', 'adm_no'],
};

/**
 * Normalizes header string by trimming, lowercase, removing punctuation
 */
export function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Auto-detects matching standard key for a file header
 */
export function matchHeaderToKey(fileHeader: string): StandardHeaderKey | null {
  const normalized = normalizeHeader(fileHeader);
  for (const [key, aliases] of Object.entries(HEADER_MAPPING_RULES) as [StandardHeaderKey, string[]][]) {
    for (const alias of aliases) {
      if (normalized === alias || normalized.includes(alias)) {
        return key;
      }
    }
  }
  return null;
}

/**
 * Normalizes dates from various formats (dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd, or Excel serial numbers)
 */
export function normalizeDateInput(raw: any): { dateStr: string; isValid: boolean } {
  if (raw === undefined || raw === null || raw === '') {
    return { dateStr: '', isValid: false };
  }

  // Handle Excel Date object or serial number
  if (raw instanceof Date) {
    if (!isNaN(raw.getTime())) {
      return { dateStr: formatDate(raw), isValid: true };
    }
  }

  if (typeof raw === 'number') {
    // Excel serial date to JS Date
    // Excel base date is Dec 30 1899
    const utcDays = Math.floor(raw - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (!isNaN(dateInfo.getTime())) {
      return { dateStr: formatDate(dateInfo), isValid: true };
    }
  }

  const str = String(raw).trim();

  // Try dd-mm-yyyy or dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1990 && year <= 2030) {
      const d = String(day).padStart(2, '0');
      const m = String(month).padStart(2, '0');
      return { dateStr: `${d}-${m}-${year}`, isValid: true };
    }
  }

  // Try yyyy-mm-dd
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = String(day).padStart(2, '0');
      const m = String(month).padStart(2, '0');
      return { dateStr: `${d}-${m}-${year}`, isValid: true };
    }
  }

  return { dateStr: str, isValid: false };
}

/**
 * Normalizes gender input
 */
export function normalizeGender(raw: any): 'Male' | 'Female' | 'Other' {
  if (!raw) return 'Male';
  const str = String(raw).trim().toLowerCase();
  if (str === 'm' || str === 'male' || str.startsWith('m')) return 'Male';
  if (str === 'f' || str === 'female' || str.startsWith('f')) return 'Female';
  return 'Other';
}

/**
 * Generates and downloads the official sample Excel template (.xlsx)
 */
export function downloadSampleExcelTemplate(className: string, academicYear: string): void {
  const wb = XLSX.utils.book_new();

  const data = [
    [
      'Registration No',
      'Student Name',
      'Father Name',
      'Mother Name',
      'DOB',
      'Gender',
      'Section',
      'Roll No',
      'Admission No',
    ],
    [
      '06/RP/1003/637691/26',
      'BHUPEN HAZARIKA',
      'NILAKANTA HAZARIKA',
      'SHANTIPRIYA HAZARIKA',
      '15-08-2011',
      'Male',
      'A',
      '13',
      'ADM-2026-0913',
    ],
    [
      '06/RP/1003/637692/26',
      'MAMONI RAISOM GOSWAMI',
      'DEBENDRA GOSWAMI',
      'AMRITAPRABHA DEVI',
      '14-11-2011',
      'Female',
      'A',
      '14',
      'ADM-2026-0914',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column width hints
  ws['!cols'] = [
    { wch: 24 }, // Registration No
    { wch: 28 }, // Student Name
    { wch: 24 }, // Father Name
    { wch: 24 }, // Mother Name
    { wch: 14 }, // DOB
    { wch: 10 }, // Gender
    { wch: 10 }, // Section
    { wch: 10 }, // Roll No
    { wch: 16 }, // Admission No
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Student Roster');
  const filename = `Sample_Student_Roster_Class_${className.replace(/\s+/g, '_')}_${academicYear}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generates and downloads an Excel error report with invalid rows + reason column
 */
export function downloadErrorReport(invalidRows: Array<{ rowNumber: number; data: any; reason: string }>): void {
  const wb = XLSX.utils.book_new();

  const exportData = invalidRows.map((item) => ({
    'Row Number': item.rowNumber,
    'Registration No': item.data.registrationNo || '',
    'Student Name': item.data.name || '',
    'Father Name': item.data.fatherName || '',
    'Mother Name': item.data.motherName || '',
    'DOB': item.data.dob || '',
    'Gender': item.data.gender || '',
    'Section': item.data.section || '',
    'Roll No': item.data.rollNo || '',
    'Failure Reason': item.reason,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 28 },
    { wch: 24 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
  XLSX.writeFile(wb, `Student_Import_Errors_${formatDate(new Date())}.xlsx`);
}
