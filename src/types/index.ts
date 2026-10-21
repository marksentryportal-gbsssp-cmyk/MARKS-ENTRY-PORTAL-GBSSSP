export type NavigationTab = 
  | 'dashboard'
  | 'marks-entry'
  | 'result'
  | 'exam-setup'
  | 'checklist'
  | 'final-submit';

export interface RouteState {
  tab: NavigationTab;
  classId?: string;
  examId?: string;
  studentId?: string;
  isSettings?: boolean;
}

export interface ClassInfo {
  id: string;
  name: string;
  order: number;
  hasStreams: boolean;
}

export interface ExamType {
  id: string;
  name: string;
  shortName: string;
  maxMarksDefault: number;
  order: number;
}

export interface ExamRecord {
  id: string;
  name: string;
  classId: string;
  className: string;
  examTypeId: string;
  examTypeName: string;
  academicYear: string; // e.g. "2026-2027"
  startDate: string;    // dd-mm-yyyy
  endDate: string;      // dd-mm-yyyy
  isFinalSubmitted: boolean;
  finalSubmittedAt?: string;
  totalStudents?: number;
  marksEnteredCount?: number;
}

export type ExamStatus = 'FinalSubmitted' | 'Open' | 'Closed' | 'NotStarted';

export interface Student {
  id: string;
  registrationNo: string; // e.g. "06/RP/1003/637675/26"
  name: string;           // Uppercase Assamese name
  fatherName: string;
  motherName?: string;
  dob: string;            // dd-mm-yyyy
  gender: 'Male' | 'Female' | 'Other';
  classId: string;
  section: string;        // e.g. "A"
  rollNo: string;         // e.g. "01"
  academicYear: string;   // e.g. "2026-2027"
  admissionNo?: string;
  active: boolean;
}

export type MarksStatus = 'not_completed' | 'completed';

export interface StudentMarksEntry {
  status: MarksStatus;
  updatedAt?: string;
  marks?: Record<string, number | string>;
}

export interface Subject {
  id: string;
  classId: string;
  name: string;
  fullMarks: number;
  passMarks: number;
  order: number;
  type: 'marks' | 'grade';
}

export interface MarkRecord {
  examId: string;
  studentId: string;
  subjectId: string;
  obtained: number | null;
  absent: boolean;
}

export interface GradeScaleItem {
  min: number;
  max: number;
  grade: string;
  remark: string;
}

export interface WeightageItem {
  examTypeId: string;
  percent: number;
}

export interface ExamGroup {
  id: string;
  name: string;
  examTypeIds: string[];
  percent: number;
}

export interface GroupScore {
  groupId: string;
  groupName: string;
  obtained: number;
  fullMarks: number;
  percent: number;
  weightedScore: number;
  hasMissingMarks?: boolean;
  isAllAbsent?: boolean;
}

export interface ResultSettings {
  weightage: WeightageItem[];
  examGroups: ExamGroup[];
  showWeightedBreakdown: boolean;
  gradeScale: GradeScaleItem[];
  passPercent: number;
  showRank: boolean;
  showAttendance: boolean;
  showRemarks: boolean;
  principalName: string;
  classTeacherSignatureLabel: string;
  marksheetTitle: string;
  session: string;
  schoolLogoBase64?: string;
  principalSignatureBase64?: string;
  teacherSignatureBase64?: string;
}

export interface SubjectResult {
  subject: Subject;
  examMarks: Record<string, { obtained: number | null; absent: boolean; maxMarks: number }>;
  groupScores: Record<string, GroupScore>;
  weightedObtained: number | null;
  fullMarks: number;
  passMarks: number;
  grade: string;
  isPassed: boolean;
  hasMissingMarks?: boolean;
}

export interface StudentResult {
  student: Student;
  rank: number;
  subjectResults: SubjectResult[];
  totalObtained: number;
  totalFullMarks: number;
  percentage: number;
  overallGrade: string;
  overallRemark: string;
  isPassed: boolean;
  failedSubjectNames: string[];
  hasMissingMarks?: boolean;
  attendance?: string;
  remarks?: string;
}

export interface SchoolInfo {
  name: string;
  code: string;
  boardName: string;
  portalTitle: string;
  district: string;
  academicSession: string;
}

export interface SupportContact {
  title: string;
  numbers: string[];
  availability: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
  actionText?: string;
  onAction?: () => void;
}
