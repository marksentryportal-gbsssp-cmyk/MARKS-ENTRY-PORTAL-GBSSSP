export type NavigationTab = 
  | 'login'
  | 'forgot-password'
  | 'dashboard'
  | 'marks-entry'
  | 'result'
  | 'exam-setup'
  | 'checklist'
  | 'final-submit'
  | 'users';

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

export type MarkComponentType = 'descriptive' | 'practical' | 'ia';

export interface SubjectExamComponentConfig {
  descriptive?: number; // Theory / Descriptive part
  practical?: number;   // Practical part
  ia?: number;          // Internal Assessment part
}

export interface StudentMarksEntry {
  status: MarksStatus;
  updatedAt?: string;
  marks?: Record<string, number | string>;
}

export interface Subject {
  id: string;
  classId: string;
  name: string;
  code?: string; // e.g. "C1", "C2", "1", "40"
  fullMarks: number;
  passMarks: number;
  order: number;
  type: 'marks' | 'grade';
  includeInTotal?: boolean;
  isOptional?: boolean;
  hidden?: boolean;
  // Mark components breakdown per exam type (eval-1, eval-2, half-yearly, annual)
  componentsByExamType?: Record<string, SubjectExamComponentConfig>;
  // Fallback default components
  components?: SubjectExamComponentConfig;
}

export interface MarkRecord {
  examId: string;
  studentId: string;
  subjectId: string;
  component?: MarkComponentType; // 'descriptive' | 'practical' | 'ia'
  obtained: number | null;
  absent: boolean;
  grade?: string; // for grade-type subjects (e.g. "A+", "B")
}

export interface StudentExamStatusRecord {
  examId: string;
  studentId: string;
  status: 'appearing' | 'absent_all' | 'not_appearing';
  includeInNextExam: boolean; // default true
  updatedAt?: string;
  updatedBy?: string;
}

export interface MarksAuditLog {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  action: 'submit' | 'draft' | 'mark_absent' | 'undo_absent' | 'delete';
  updatedAt: string;
  updatedBy: string;
  notes?: string;
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
  email?: string;
  phone?: string;
  logoUrl?: string;
}

export interface SupportContact {
  title: string;
  numbers: string[];
  availability: string;
  email?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export type UserRole = 'admin' | 'teacher' | 'viewer';

export interface User {
  id: string;
  institutionCode: string; // e.g. "06H1003"
  name: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  mustChangePassword: boolean;
  failedAttempts: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  active: boolean;
}

export interface AuthSession {
  userId: string;
  user: User;
  token: string;
  expiresAt: string; // ISO date string
  keepSignedIn: boolean;
  lastActivityAt: string; // ISO timestamp
}

export interface AuthAuditLog {
  id: string;
  type: 'login_success' | 'login_failure' | 'password_change' | 'password_reset' | 'logout';
  userCode: string;
  userName?: string;
  timestamp: string;
  details?: string;
}

export interface OtpRequest {
  code: string;
  institutionCode: string;
  expiresAt: number; // timestamp in ms
  createdAt: number;
  attempts: number;
}

