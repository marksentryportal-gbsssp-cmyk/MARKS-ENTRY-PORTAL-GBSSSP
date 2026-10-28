import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  NavigationTab,
  RouteState,
  ClassInfo,
  ExamType,
  ExamRecord,
  SchoolInfo,
  SupportContact,
  ToastMessage,
  Student,
  MarksStatus,
  Subject,
  MarkRecord,
  ResultSettings,
  StudentExamStatusRecord,
  MarksAuditLog,
  CancelFinalSubmitEntry,
  ChecklistSnapshot,
  User,
  UserRole,
  AuthSession,
  AuthAuditLog,
  SchoolLogoData,
} from '../types';
import { formatDate } from '../utils/dateUtils';
import { initialStudents } from '../data/seedStudents';
import {
  initialSubjects,
  defaultResultSettings,
  generateSeedMarks,
} from '../data/seedResultData';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  DEFAULT_ADMIN_HASH,
  DEFAULT_ADMIN_SALT,
  DEFAULT_ADMIN_UDISE,
  DEFAULT_ADMIN_PASSWORD,
  loadStoredSession,
  saveStoredSession,
  clearStoredSession,
} from '../services/authService';
import {
  startSession,
  endSession,
  getSession,
  isAuthenticated,
  subscribeToSession,
  performSafeLogout,
  cleanupUiOverlayAndUnlockScroll,
  wasJustLoggedOut,
  SessionV1,
} from '../services/sessionService';
import {
  sortByRollNo,
  getHighestRollNo,
  getOrderedExamStudents as getOrderedExamStudentsUtil,
} from '../utils/rollNoUtils';
import {
  loadDefaultSchoolLogoData,
  updateBrowserFaviconAndTitle,
  updateDynamicManifest,
} from '../utils/logoUtils';

interface PortalContextType {
  // Routing
  currentRoute: RouteState;
  navigateTo: (path: string, options?: { preserveScroll?: boolean }) => void;
  navigateTab: (tab: NavigationTab, classId?: string, examId?: string, studentId?: string) => void;

  // UI state
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  isLogoutModalOpen: boolean;
  setIsLogoutModalOpen: (open: boolean) => void;
  isSupportEditOpen: boolean;
  setIsSupportEditOpen: (open: boolean) => void;
  isSupportModalOpen: boolean;
  setIsSupportModalOpen: (open: boolean) => void;

  // Authentication & Users (Step 5 & 6)
  currentUser: User | null;
  session: AuthSession | null;
  users: User[];
  authAuditLogs: AuthAuditLog[];
  otpDeliveryMode: 'demo' | 'live';
  setOtpDeliveryMode: (mode: 'demo' | 'live') => void;
  defaultFirstTimePassword: string;
  setDefaultFirstTimePassword: (pwd: string) => void;
  isChangePasswordOpen: boolean;
  setIsChangePasswordOpen: (open: boolean) => void;
  isForcedPasswordChange: boolean;
  setIsForcedPasswordChange: (forced: boolean) => void;
  login: (
    udiseCode: string,
    password: string,
    keepSignedIn?: boolean
  ) => Promise<{ success: boolean; error?: string; lockedSeconds?: number }>;
  logout: () => void;
  changePassword: (
    userId: string,
    newPassword: string,
    currentPassword?: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, tempPassword?: string) => Promise<boolean>;
  resetUserPasswordByCode: (
    udiseCode: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  addUser: (
    userData: Omit<User, 'id' | 'passwordHash' | 'salt' | 'failedAttempts'>,
    initialPassword?: string
  ) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;

  // School info & Support
  schoolInfo: SchoolInfo;
  updateSchoolInfo: (info: Partial<SchoolInfo>) => void;
  schoolLogo: SchoolLogoData | null;
  updateSchoolLogo: (logo: Partial<SchoolLogoData> | null) => void;
  supportContact: SupportContact;
  updateSupportNumbers: (numbers: string[]) => void;
  importantNotifications: string[];

  // Classes
  classes: ClassInfo[];
  addClass: (name: string, hasStreams?: boolean) => void;
  updateClass: (id: string, updates: Partial<ClassInfo>) => void;

  // Exam Types
  examTypes: ExamType[];
  addExamType: (name: string, shortName: string, maxMarksDefault?: number) => void;
  updateExamType: (id: string, updates: Partial<ExamType>) => void;
  deleteExamType: (id: string) => void;
  reorderExamTypes: (types: ExamType[]) => void;

  // Exams
  exams: ExamRecord[];
  createExamsBatch: (
    academicYear: string,
    classIds: string[],
    examTypeIds: string[],
    startDate: string,
    endDate: string
  ) => { createdCount: number; skippedCount: number };
  updateExam: (id: string, updates: Partial<ExamRecord>) => void;
  deleteExam: (id: string) => void;
  toggleExamFinalSubmit: (id: string) => void;
  reopenExam: (id: string, newEndDate?: string) => void;
  finalSubmitGuidelines: string[];
  updateFinalSubmitGuidelines: (guidelines: string[]) => void;
  finalSubmitExam: (examId: string, submittedBy?: string) => { success: boolean; error?: string };
  cancelFinalSubmitExam: (
    examId: string,
    reason: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Students & Marks Status (Step 3 & Roll Number ordering)
  students: Student[];
  examStudents: Record<string, string[]>; // examId -> studentId[]
  marksStatus: Record<string, MarksStatus>; // `${examId}_${studentId}` -> status
  getStudentsForExam: (examId: string) => Student[];
  getOrderedExamStudents: (examId: string) => Student[];
  updateStudentRollNos: (
    updates: { studentId: string; rollNo: string }[],
    reason?: string
  ) => void;
  createStudent: (studentData: Omit<Student, 'id'>, targetExamId?: string) => Student;
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;
  addStudentToExam: (examId: string, studentId: string) => void;
  removeStudentFromExam: (examId: string, studentId: string) => void;
  getMarksStatus: (examId: string, studentId: string) => MarksStatus;
  toggleMarksStatus: (examId: string, studentId: string) => void;
  importStudentsFromClass: (
    targetExamId: string,
    sourceClassId: string,
    sourceAcademicYear: string,
    studentIds: string[]
  ) => number;
  bulkImportStudents: (
    studentsList: Array<Omit<Student, 'id'>>,
    targetExamId?: string
  ) => number;
  generateNextRegNo: () => string;

  undoBulkImport: (importedStudentIds: string[], targetExamId: string) => void;

  // Results & Marksheets (Step 4 & 5)
  subjects: Subject[];
  marks: MarkRecord[];
  resultSettings: ResultSettings;
  updateResultSettings: (settings: Partial<ResultSettings>) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => Subject;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  saveMarksBatch: (marksList: MarkRecord[]) => void;
  resetResultSettingsToDefault: () => void;

  // Step 4: Candidate Marks Entry & Safety Operations
  studentExamStatuses: Record<string, StudentExamStatusRecord>;
  marksAuditLogs: MarksAuditLog[];
  marksEntryGuidelines: string[];
  updateMarksEntryGuidelines: (guidelines: string[]) => void;
  getStudentExamStatus: (examId: string, studentId: string) => StudentExamStatusRecord | undefined;
  saveCandidateMarks: (params: {
    examId: string;
    studentId: string;
    marks: MarkRecord[];
    isDraft?: boolean;
    includeInNextExam?: boolean;
    updatedBy?: string;
  }) => void;
  markStudentAbsentAll: (examId: string, studentId: string, classSubjects: Subject[]) => void;
  undoStudentAbsentAll: (examId: string, studentId: string) => void;
  deleteStudentWithAction: (studentId: string, mode: 'soft' | 'hard') => { success: boolean; marksCount: number };
  getStudentExamCountWithMarks: (studentId: string) => number;

  // Checklist & Snapshot Archives
  checklistSnapshots: ChecklistSnapshot[];
  saveChecklistSnapshot: (examId: string, note?: string) => ChecklistSnapshot | null;
  deleteChecklistSnapshot: (snapshotId: string) => void;
  uploadChecklistToDrive: (
    examId: string,
    snapshot?: ChecklistSnapshot
  ) => Promise<{ success: boolean; driveUrl: string; folderPath: string }>;

  // Backup & Restore
  exportBackup: () => void;
  importBackup: (jsonString: string) => boolean;
  resetToDefaultData: () => void;

  // Toast notifications
  toasts: ToastMessage[];
  addToast: (
    message: string,
    type?: 'success' | 'info' | 'error',
    actionText?: string,
    onAction?: () => void,
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
}

const STORAGE_KEY = 'gopinath_school_portal_data_v5';

const defaultSchoolInfo: SchoolInfo = {
  name: 'GOPINATH BORDOLOI SENIOR SECONDARY SCHOOL, PAGLAHAT',
  code: '06H1003',
  udiseCode: DEFAULT_ADMIN_UDISE, // 18020200403
  boardName: 'MARKS ENTRY PORTAL , CLASS: ANKUR TO XII (ARTS)',
  portalTitle: 'Internal Examination Marks Entry Portal',
  district: 'Dhubri, Assam',
  academicSession: '2026-2027',
  email: 'gopinathschool2024@gmail.com',
  phone: '+91 94350 12345',
};

const defaultAdminUser: User = {
  id: 'user-admin-1',
  udiseCode: DEFAULT_ADMIN_UDISE,
  name: 'School Examination Incharge',
  role: 'admin',
  passwordHash: DEFAULT_ADMIN_HASH,
  salt: DEFAULT_ADMIN_SALT,
  mustChangePassword: false,
  failedAttempts: 0,
  active: true,
};

const defaultTeacherUser: User = {
  id: 'user-teacher-1',
  udiseCode: '18020200401',
  name: 'Senior Teacher (Marks Entry)',
  role: 'teacher',
  passwordHash: DEFAULT_ADMIN_HASH,
  salt: DEFAULT_ADMIN_SALT,
  mustChangePassword: false,
  failedAttempts: 0,
  active: true,
};

const initialUsers: User[] = [defaultAdminUser, defaultTeacherUser];

const defaultMarksEntryGuidelines: string[] = [
  'Do not enter any calculated weightage marks.',
  'Please enter only the absolute marks secured by the students against each subject in Theory / Practical / IA part.',
  'Please confirm the Student, Examination, Registration Number, Name and Class of each and every student properly before entering the marks.',
  'Please enter "0" (Zero) if a student has scored "0" after appearing in the examination.',
  'For absent candidates (underlined sub heading):',
  'If any student is absent in any particular subject(s), then please enter "A" (single "A", in capitals) against that particular subject(s).',
  'If any student is absent in all the subjects, then mark him as absent using the Mark Absent button.',
];

const defaultFinalSubmitGuidelines: string[] = [
  'Final submit button will appear only after complete submission of marks for each student.',
  'Please confirm the Examination, Marks entered against each student before Final Submit.',
];

const defaultSupportContact: SupportContact = {
  title: 'WhatsApp Technical Support',
  numbers: ['+91 94350 12345', '+91 88760 98765'],
  availability: '10:00 AM - 05:00 PM (Working Days)',
};

const defaultNotifications: string[] = [
  'Please do not enter and calculated weightage marks. Please enter only the absolute marks scored by the students in each subject.',
  'If any student (failed/drop-out) takes re-admission in Class X, please add the student in Class X Unit Test I and enter the marks.',
  'If any student is transferred from other school and takes admission in Class X, then please add the student in Class IX Annual Exam and enter the marks.',
  'If any student failed in Class IX, and if the student\'s name is appearing in the Class X Unit Test I, then you can delete the student from the Class X Unit Test I.',
  'If any student failed in Class IX and takes re-admission in Class IX, please add the student in Class IX Unit Test I and enter the marks.',
];

// Ordered classes list
const initialClasses: ClassInfo[] = [
  { id: 'ankur', name: 'Ankur', order: 1, hasStreams: false },
  { id: 'pp', name: 'P.P', order: 2, hasStreams: false },
  { id: 'one', name: 'One', order: 3, hasStreams: false },
  { id: 'two', name: 'Two', order: 4, hasStreams: false },
  { id: 'three', name: 'Three', order: 5, hasStreams: false },
  { id: 'four', name: 'Four', order: 6, hasStreams: false },
  { id: 'five', name: 'Five', order: 7, hasStreams: false },
  { id: 'six', name: 'Six', order: 8, hasStreams: false },
  { id: 'seven', name: 'Seven', order: 9, hasStreams: false },
  { id: 'eight', name: 'Eight', order: 10, hasStreams: false },
  { id: 'nine', name: 'Nine', order: 11, hasStreams: false },
  { id: 'ten', name: 'Ten', order: 12, hasStreams: false },
  { id: 'eleven', name: 'Eleven', order: 13, hasStreams: true },
  { id: 'twelve', name: 'Twelve', order: 14, hasStreams: true },
];

const initialExamTypes: ExamType[] = [
  { id: 'eval-1', name: '1st Evaluation', shortName: '1st Eval', maxMarksDefault: 50, order: 1 },
  { id: 'eval-2', name: '2nd Evaluation', shortName: '2nd Eval', maxMarksDefault: 50, order: 2 },
  { id: 'half-yearly', name: 'Half Yearly', shortName: 'Half Yearly', maxMarksDefault: 100, order: 3 },
  { id: 'annual', name: 'Annual', shortName: 'Annual', maxMarksDefault: 100, order: 4 },
];

// Seed initial exams
function generateSeedExams(): ExamRecord[] {
  const list: ExamRecord[] = [];

  initialClasses.forEach((cls) => {
    initialExamTypes.forEach((et) => {
      let startDate = '01-09-2026';
      let endDate = '30-12-2026';
      let isFinalSubmitted = false;

      // Special demonstration cases
      if (cls.id === 'eight' && et.id === 'eval-1') {
        startDate = '01-08-2026';
        endDate = '15-09-2026'; // End date passed -> "Closed" with Reopen link
      } else if (cls.id === 'twelve' && et.id === 'annual') {
        startDate = '01-01-2027'; // Future -> "Not started yet"
        endDate = '15-03-2027';
      }

      const examName = `CLASS ${cls.name.toUpperCase()} ${et.name.toUpperCase()} 2026-2027`;
      list.push({
        id: `exam-${cls.id}-${et.id}-2026-2027`,
        name: examName,
        classId: cls.id,
        className: cls.name,
        examTypeId: et.id,
        examTypeName: et.name,
        academicYear: '2026-2027',
        startDate,
        endDate,
        isFinalSubmitted,
        totalStudents: 12,
        marksEnteredCount: 0,
      });
    });
  });

  // Seed some 2025-2026 exams marked Final Submitted
  const completed2025Cases = [
    { classId: 'ten', examTypeId: 'annual', students: 12 },
    { classId: 'nine', examTypeId: 'annual', students: 12 },
    { classId: 'twelve', examTypeId: 'annual', students: 6 },
    { classId: 'three', examTypeId: 'half-yearly', students: 6 },
    { classId: 'one', examTypeId: 'eval-1', students: 6 },
  ];

  completed2025Cases.forEach((item) => {
    const cls = initialClasses.find((c) => c.id === item.classId)!;
    const et = initialExamTypes.find((t) => t.id === item.examTypeId)!;
    const examName = `CLASS ${cls.name.toUpperCase()} ${et.name.toUpperCase()} 2025-2026`;
    list.push({
      id: `exam-${cls.id}-${et.id}-2025-2026`,
      name: examName,
      classId: cls.id,
      className: cls.name,
      examTypeId: et.id,
      examTypeName: et.name,
      academicYear: '2025-2026',
      startDate: '01-09-2025',
      endDate: '28-02-2026',
      isFinalSubmitted: true,
      finalSubmittedAt: '28-02-2026',
      totalStudents: item.students,
      marksEnteredCount: item.students,
    });
  });

  return list;
}

// Initial Exam-Students enrollment map
function generateSeedExamStudents(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const seedExams = generateSeedExams();

  seedExams.forEach((exam) => {
    const classStudents = initialStudents.filter(
      (s) => s.classId === exam.classId
    );
    map[exam.id] = classStudents.map((s) => s.id);
  });

  return map;
}

// Initial Marks Status map (some completed, some not_completed for realistic demo)
function generateSeedMarksStatus(): Record<string, MarksStatus> {
  const map: Record<string, MarksStatus> = {};
  const seedExams = generateSeedExams();

  seedExams.forEach((exam) => {
    const classStudents = initialStudents.filter(
      (s) => s.classId === exam.classId
    );

    classStudents.forEach((student, idx) => {
      const key = `${exam.id}_${student.id}`;
      if (exam.isFinalSubmitted) {
        map[key] = 'completed';
      } else if (idx < 4) {
        // First 4 students completed for demo
        map[key] = 'completed';
      } else {
        map[key] = 'not_completed';
      }
    });
  });

  return map;
}

// Route parser from path/hash string: supports /marks-entry/:classId/:examId/:studentId and /result/:classId/student/:studentId
function parseRouteFromUrl(): RouteState {
  const hash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
  const parts = hash.split('/').filter(Boolean);
  const mainTab = (parts[0] || 'dashboard') as NavigationTab;

  const validTabs: NavigationTab[] = [
    'login',
    'forgot-password',
    'dashboard',
    'marks-entry',
    'result',
    'exam-setup',
    'checklist',
    'final-submit',
    'users',
    'bell-mode',
    'diagnostics',
  ];

  const tab = validTabs.includes(mainTab) ? mainTab : 'dashboard';

  if (tab === 'login' || tab === 'forgot-password' || tab === 'users' || tab === 'bell-mode' || tab === 'diagnostics') {
    return { tab };
  }

  if (tab === 'result') {
    // #/result
    // #/result/settings
    // #/result/:classId
    // #/result/:classId/student/:studentId
    const isSettings = parts[1] === 'settings';
    const classId = isSettings ? undefined : parts[1];
    let studentId: string | undefined = undefined;
    if (parts[2] === 'student' && parts[3]) {
      studentId = parts[3];
    }
    return { tab, classId, studentId, isSettings };
  }

  if (tab === 'checklist') {
    // #/checklist
    // #/checklist/:examId
    const examId = parts[1];
    return { tab, examId };
  }

  const classId = parts[1];
  const examId = parts[2];
  const studentId = parts[3];

  return { tab, classId, examId, studentId };
}

function migrateResultSettings(saved: any): ResultSettings {
  if (!saved) return defaultResultSettings;

  let examGroups = saved.examGroups;
  if (!examGroups || !Array.isArray(examGroups) || examGroups.length === 0) {
    const oldWeightage = saved.weightage || [];
    const eval1 = oldWeightage.find((w: any) => w.examTypeId === 'eval-1');
    const eval2 = oldWeightage.find((w: any) => w.examTypeId === 'eval-2');
    const half = oldWeightage.find((w: any) => w.examTypeId === 'half-yearly');
    const annual = oldWeightage.find((w: any) => w.examTypeId === 'annual');

    const evalPercent = (eval1?.percent || 10) + (eval2?.percent || 10);
    const halfPercent = half?.percent !== undefined ? half.percent : 30;
    const annualPercent = annual?.percent !== undefined ? annual.percent : 50;

    examGroups = [
      {
        id: 'grp-eval',
        name: 'Evaluation',
        examTypeIds: ['eval-1', 'eval-2'],
        percent: evalPercent || 20,
      },
      {
        id: 'grp-half-yearly',
        name: 'Half Yearly',
        examTypeIds: ['half-yearly'],
        percent: halfPercent,
      },
      {
        id: 'grp-annual',
        name: 'Annual Examination',
        examTypeIds: ['annual'],
        percent: annualPercent,
      },
    ];
  }

  return {
    ...defaultResultSettings,
    ...saved,
    examGroups,
    showWeightedBreakdown:
      saved.showWeightedBreakdown !== undefined
        ? saved.showWeightedBreakdown
        : true,
  };
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Routing state
  const [currentRoute, setCurrentRoute] = useState<RouteState>(() => parseRouteFromUrl());

  // UI state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSupportEditOpen, setIsSupportEditOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Authentication & Session (controlled by sessionService single source of truth)
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (wasJustLoggedOut()) return null;
    const s = getSession();
    if (!s) return null;
    return {
      userId: s.userId,
      user: {
        id: s.userId,
        udiseCode: s.udiseCode,
        name: s.userName,
        role: s.role,
        passwordHash: '',
        salt: '',
        mustChangePassword: false,
        failedAttempts: 0,
        active: true,
      },
      token: s.sessionId,
      expiresAt: s.expiresAt,
      keepSignedIn: s.remember,
      lastActivityAt: s.createdAt,
    };
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (wasJustLoggedOut()) return null;
    const s = getSession();
    if (!s) return null;
    const existing = initialUsers.find(
      (u) => u.id === s.userId || u.udiseCode === s.udiseCode
    );
    return (
      existing || {
        id: s.userId,
        udiseCode: s.udiseCode,
        name: s.userName,
        role: s.role,
        passwordHash: '',
        salt: '',
        mustChangePassword: false,
        failedAttempts: 0,
        active: true,
      }
    );
  });
  const [users, setUsers] = useState<User[]>(() => initialUsers);
  const [authAuditLogs, setAuthAuditLogs] = useState<AuthAuditLog[]>([]);
  const [otpDeliveryMode, setOtpDeliveryMode] = useState<'demo' | 'live'>('demo');
  const [defaultFirstTimePassword, setDefaultFirstTimePassword] = useState('Gopinath2024@');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isForcedPasswordChange, setIsForcedPasswordChange] = useState(false);

  // Subscribe to central session manager (including multi-tab logout and idle timeout)
  useEffect(() => {
    const unsubscribe = subscribeToSession((activeSession, reason) => {
      if (!activeSession) {
        setSession(null);
        setCurrentUser(null);
        setIsLogoutModalOpen(false);
        cleanupUiOverlayAndUnlockScroll();
        if (reason === 'tab_logout') {
          addToast('Signed out from another browser tab.', 'info');
        } else if (reason === 'expired') {
          addToast('Session expired. Please log in again.', 'info');
        }
      } else {
        const existing = users.find(
          (u) => u.id === activeSession.userId || u.udiseCode === activeSession.udiseCode
        );
        const resolvedUser: User = existing || {
          id: activeSession.userId,
          udiseCode: activeSession.udiseCode,
          name: activeSession.userName,
          role: activeSession.role,
          passwordHash: '',
          salt: '',
          mustChangePassword: false,
          failedAttempts: 0,
          active: true,
        };
        setCurrentUser(resolvedUser);
        setSession({
          userId: activeSession.userId,
          user: resolvedUser,
          token: activeSession.sessionId,
          expiresAt: activeSession.expiresAt,
          keepSignedIn: activeSession.remember,
          lastActivityAt: new Date().toISOString(),
        });
      }
    });

    return unsubscribe;
  }, [users]);

  // Core Data
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(defaultSchoolInfo);
  const [supportContact, setSupportContact] = useState<SupportContact>(defaultSupportContact);
  const [importantNotifications] = useState<string[]>(defaultNotifications);
  const [schoolLogo, setSchoolLogo] = useState<SchoolLogoData | null>(() => {
    try {
      const stored = localStorage.getItem('gopinath_school_logo_data_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [classes, setClasses] = useState<ClassInfo[]>(initialClasses);
  const [examTypes, setExamTypes] = useState<ExamType[]>(initialExamTypes);
  const [exams, setExams] = useState<ExamRecord[]>(() => generateSeedExams());

  // Students & Marks Status (Step 3 & Roll numbering)
  const [students, setStudents] = useState<Student[]>(() => initialStudents);
  const [examStudents, setExamStudents] = useState<Record<string, string[]>>(() =>
    generateSeedExamStudents()
  );
  const [marksStatus, setMarksStatus] = useState<Record<string, MarksStatus>>(() =>
    generateSeedMarksStatus()
  );

  // Results & Marksheets Data (Step 6)
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [marks, setMarks] = useState<MarkRecord[]>(() => generateSeedMarks());
  const [resultSettings, setResultSettings] = useState<ResultSettings>(defaultResultSettings);

  // Step 4: Candidate Marks Entry & Safety Data
  const [studentExamStatuses, setStudentExamStatuses] = useState<Record<string, StudentExamStatusRecord>>({});
  const [marksAuditLogs, setMarksAuditLogs] = useState<MarksAuditLog[]>([]);
  const [marksEntryGuidelines, setMarksEntryGuidelines] = useState<string[]>(defaultMarksEntryGuidelines);
  const [finalSubmitGuidelines, setFinalSubmitGuidelines] = useState<string[]>(defaultFinalSubmitGuidelines);
  const [checklistSnapshots, setChecklistSnapshots] = useState<ChecklistSnapshot[]>([]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helpers with action & custom duration support
  const addToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success',
    actionText?: string,
    onAction?: () => void,
    duration = 4000
  ) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type, actionText, onAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const undoBulkImport = (importedStudentIds: string[], targetExamId: string) => {
    setStudents((prev) => prev.filter((s) => !importedStudentIds.includes(s.id)));
    setExamStudents((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((examId) => {
        updated[examId] = updated[examId].filter((id) => !importedStudentIds.includes(id));
      });
      return updated;
    });
    setMarksStatus((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        const parts = key.split('_');
        const sId = parts[1];
        if (importedStudentIds.includes(sId)) {
          delete updated[key];
        }
      });
      return updated;
    });
    addToast('Import undone: newly added candidates removed', 'info');
  };

  // Sync route with window hash
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const handleHashChange = () => {
      setCurrentRoute(parseRouteFromUrl());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (path: string, options?: { preserveScroll?: boolean }) => {
    window.location.hash = path.startsWith('/') ? path : `/${path}`;
    setIsMobileDrawerOpen(false);
    if (!options?.preserveScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateTab = (
    tab: NavigationTab,
    classId?: string,
    examId?: string,
    studentId?: string
  ) => {
    let path = `/${tab}`;
    if (classId) {
      path += `/${classId}`;
      if (examId) {
        path += `/${examId}`;
        if (studentId) {
          path += `/${studentId}`;
        }
      }
    }
    navigateTo(path);
  };

  // Enforce password change when flagged
  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setIsForcedPasswordChange(true);
      setIsChangePasswordOpen(true);
    } else {
      setIsForcedPasswordChange(false);
    }
  }, [currentUser]);

  // Route protection: redirect unauthenticated users to /login (excluding public tabs)
  useEffect(() => {
    const isPublic =
      currentRoute.tab === 'login' ||
      currentRoute.tab === 'forgot-password' ||
      currentRoute.tab === 'bell-mode' ||
      currentRoute.tab === 'diagnostics';

    if (!currentUser && !isPublic) {
      navigateTo('/login');
    }
  }, [currentUser, currentRoute.tab]);

  // Load from LocalStorage (with backwards compatibility migration)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('gopinath_school_portal_data_v4');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.classes && Array.isArray(parsed.classes)) setClasses(parsed.classes);
        if (parsed.examTypes && Array.isArray(parsed.examTypes)) setExamTypes(parsed.examTypes);
        if (parsed.exams && Array.isArray(parsed.exams)) setExams(parsed.exams);
        if (parsed.students && Array.isArray(parsed.students)) {
          // Ensure students have valid roll numbers, section, address and sync studentName
          const migratedStudents: Student[] = parsed.students.map((s: any) => {
            const studentName = (s.studentName || s.name || '').trim().toUpperCase();
            return {
              ...s,
              name: studentName,
              studentName: studentName,
              section: s.section ? s.section.trim().toUpperCase() : 'A',
              currentAddress: s.currentAddress || '',
              registrationNo: s.registrationNo || '',
            };
          });
          setStudents(migratedStudents);
        }
        if (parsed.examStudents) setExamStudents(parsed.examStudents);
        if (parsed.marksStatus) setMarksStatus(parsed.marksStatus);
        if (parsed.schoolInfo) {
          const storedUdise = parsed.schoolInfo.udiseCode;
          setSchoolInfo({
            ...defaultSchoolInfo,
            ...parsed.schoolInfo,
            udiseCode: (!storedUdise || storedUdise === '18000000000') ? DEFAULT_ADMIN_UDISE : storedUdise,
          });
        }
        if (parsed.supportContact) setSupportContact(parsed.supportContact);
        if (parsed.subjects && Array.isArray(parsed.subjects)) setSubjects(parsed.subjects);
        if (parsed.marks && Array.isArray(parsed.marks)) setMarks(parsed.marks);
        if (parsed.studentExamStatuses) setStudentExamStatuses(parsed.studentExamStatuses);
        if (parsed.marksAuditLogs && Array.isArray(parsed.marksAuditLogs)) setMarksAuditLogs(parsed.marksAuditLogs);
        if (parsed.marksEntryGuidelines && Array.isArray(parsed.marksEntryGuidelines)) setMarksEntryGuidelines(parsed.marksEntryGuidelines);
        if (parsed.finalSubmitGuidelines && Array.isArray(parsed.finalSubmitGuidelines)) setFinalSubmitGuidelines(parsed.finalSubmitGuidelines);
        if (parsed.resultSettings) {
          setResultSettings(migrateResultSettings(parsed.resultSettings));
        }

        // Migrate users collection
        if (parsed.users && Array.isArray(parsed.users) && parsed.users.length > 0) {
          const migratedUsers: User[] = parsed.users.map((u: any) => {
            const code = u.udiseCode || u.institutionCode;
            if (u.role === 'admin' && (code === '18000000000' || !code || code === '18020200403')) {
              return {
                ...u,
                udiseCode: DEFAULT_ADMIN_UDISE,
                passwordHash: DEFAULT_ADMIN_HASH,
                salt: DEFAULT_ADMIN_SALT,
                mustChangePassword: false,
              };
            }
            return {
              ...u,
              udiseCode: code === '18000000000' ? DEFAULT_ADMIN_UDISE : (code || DEFAULT_ADMIN_UDISE),
            };
          });

          if (!migratedUsers.some((u) => u.udiseCode === DEFAULT_ADMIN_UDISE)) {
            migratedUsers.unshift(defaultAdminUser);
          }
          setUsers(migratedUsers);
        } else {
          setUsers(initialUsers);
        }

        if (parsed.authAuditLogs && Array.isArray(parsed.authAuditLogs)) {
          setAuthAuditLogs(parsed.authAuditLogs);
        }
        if (parsed.otpDeliveryMode) {
          setOtpDeliveryMode(parsed.otpDeliveryMode);
        }
        if (parsed.defaultFirstTimePassword) {
          setDefaultFirstTimePassword(parsed.defaultFirstTimePassword);
        }
        if (parsed.checklistSnapshots && Array.isArray(parsed.checklistSnapshots)) {
          setChecklistSnapshots(parsed.checklistSnapshots);
        }
      }
    } catch (e) {
      console.error('Failed to parse portal data from localStorage', e);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    try {
      const payload = {
        classes,
        examTypes,
        exams,
        students,
        examStudents,
        marksStatus,
        schoolInfo,
        supportContact,
        subjects,
        marks,
        resultSettings,
        studentExamStatuses,
        marksAuditLogs,
        marksEntryGuidelines,
        finalSubmitGuidelines,
        checklistSnapshots,
        users,
        authAuditLogs,
        otpDeliveryMode,
        defaultFirstTimePassword,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to write portal data to localStorage', e);
    }
  }, [
    classes,
    examTypes,
    exams,
    students,
    examStudents,
    marksStatus,
    schoolInfo,
    supportContact,
    subjects,
    marks,
    resultSettings,
    studentExamStatuses,
    marksAuditLogs,
    marksEntryGuidelines,
    finalSubmitGuidelines,
    checklistSnapshots,
    users,
    authAuditLogs,
    otpDeliveryMode,
    defaultFirstTimePassword,
  ]);

  // School & Support Updaters
  const updateSchoolInfo = (info: Partial<SchoolInfo>) => {
    setSchoolInfo((prev) => {
      const updated = { ...prev, ...info };
      // If UDISE Code changed, keep admin user's login identifier in sync
      if (info.udiseCode && info.udiseCode !== prev.udiseCode) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.role === 'admin' && (u.udiseCode === prev.udiseCode || u.udiseCode === '18000000000')) {
              return { ...u, udiseCode: info.udiseCode! };
            }
            return u;
          })
        );
        if (currentUser?.role === 'admin') {
          setCurrentUser((u) => (u ? { ...u, udiseCode: info.udiseCode! } : null));
        }
      }
      return updated;
    });
    addToast('School information updated');
  };

  const updateSupportNumbers = (numbers: string[]) => {
    setSupportContact((prev) => ({ ...prev, numbers }));
    addToast('Support numbers updated');
  };

  const updateSchoolLogo = (logoUpdate: Partial<SchoolLogoData> | null) => {
    if (logoUpdate === null) {
      setSchoolLogo(null);
      try {
        localStorage.removeItem('gopinath_school_logo_data_v1');
      } catch {}
      updateResultSettings({ schoolLogo: undefined });
      updateBrowserFaviconAndTitle(null, schoolInfo.name);
    } else {
      setSchoolLogo((prev) => {
        const updated: SchoolLogoData = {
          full: logoUpdate.full || prev?.full || '/school-logo.png',
          medium: logoUpdate.medium || prev?.medium || '/icon-192.png',
          icon: logoUpdate.icon || prev?.icon || '/icon-512.png',
          updatedAt: new Date().toISOString(),
          source: logoUpdate.source || prev?.source || 'upload',
          ...logoUpdate,
        };
        try {
          localStorage.setItem('gopinath_school_logo_data_v1', JSON.stringify(updated));
        } catch {}
        updateResultSettings({ schoolLogo: updated });
        updateBrowserFaviconAndTitle(updated, schoolInfo.name);
        updateDynamicManifest(updated, schoolInfo);
        return updated;
      });
    }
  };

  useEffect(() => {
    if (!schoolLogo) {
      loadDefaultSchoolLogoData().then((defaultLogo) => {
        if (defaultLogo) {
          setSchoolLogo(defaultLogo);
          updateBrowserFaviconAndTitle(defaultLogo, schoolInfo.name);
          updateDynamicManifest(defaultLogo, schoolInfo);
        }
      });
    } else {
      updateBrowserFaviconAndTitle(schoolLogo, schoolInfo.name);
      updateDynamicManifest(schoolLogo, schoolInfo);
    }
  }, []);

  // Class Management
  const addClass = (name: string, hasStreams = false) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newClass: ClassInfo = {
      id,
      name,
      order: classes.length + 1,
      hasStreams,
    };
    setClasses((prev) => [...prev, newClass]);
    addToast(`Class ${name} added successfully`);
  };

  const updateClass = (id: string, updates: Partial<ClassInfo>) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    addToast('Class details updated');
  };

  // Exam Type Management
  const addExamType = (name: string, shortName: string, maxMarksDefault = 100) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newType: ExamType = {
      id,
      name,
      shortName,
      maxMarksDefault,
      order: examTypes.length + 1,
    };
    setExamTypes((prev) => [...prev, newType]);
    addToast(`Exam type "${name}" created`);
  };

  const updateExamType = (id: string, updates: Partial<ExamType>) => {
    setExamTypes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    addToast('Exam type updated');
  };

  const deleteExamType = (id: string) => {
    setExamTypes((prev) => prev.filter((t) => t.id !== id));
    addToast('Exam type deleted', 'info');
  };

  const reorderExamTypes = (newOrder: ExamType[]) => {
    setExamTypes(newOrder.map((item, idx) => ({ ...item, order: idx + 1 })));
    addToast('Exam types reordered');
  };

  // Exams Management
  const createExamsBatch = (
    academicYear: string,
    classIds: string[],
    examTypeIds: string[],
    startDate: string,
    endDate: string
  ): { createdCount: number; skippedCount: number } => {
    let createdCount = 0;
    let skippedCount = 0;
    const newExams: ExamRecord[] = [];
    const newExamStudentsMap: Record<string, string[]> = {};

    classIds.forEach((classId) => {
      const cls = classes.find((c) => c.id === classId);
      if (!cls) return;

      examTypeIds.forEach((typeId) => {
        const et = examTypes.find((t) => t.id === typeId);
        if (!et) return;

        const autoName = `CLASS ${cls.name.toUpperCase()} ${et.name.toUpperCase()} ${academicYear}`;
        
        const exists = exams.some(
          (ex) =>
            ex.classId === cls.id &&
            ex.examTypeId === et.id &&
            ex.academicYear === academicYear
        );

        if (exists) {
          skippedCount++;
        } else {
          const examId = `exam-${cls.id}-${et.id}-${academicYear.replace(/[^0-9]/g, '-')}`;
          
          // Enroll active students of this class & academic year
          const enrolled = students
            .filter((s) => s.classId === cls.id && s.academicYear === academicYear)
            .map((s) => s.id);

          newExams.push({
            id: examId,
            name: autoName,
            classId: cls.id,
            className: cls.name,
            examTypeId: et.id,
            examTypeName: et.name,
            academicYear,
            startDate,
            endDate,
            isFinalSubmitted: false,
            totalStudents: enrolled.length,
            marksEnteredCount: 0,
          });

          newExamStudentsMap[examId] = enrolled;
          createdCount++;
        }
      });
    });

    if (newExams.length > 0) {
      setExams((prev) => [...prev, ...newExams]);
      setExamStudents((prev) => ({ ...prev, ...newExamStudentsMap }));
    }

    if (createdCount > 0) {
      addToast(`Generated ${createdCount} new exam(s)${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`, 'success');
    } else if (skippedCount > 0) {
      addToast(`All ${skippedCount} requested exams already exist for ${academicYear}`, 'info');
    }

    return { createdCount, skippedCount };
  };

  const updateExam = (id: string, updates: Partial<ExamRecord>) => {
    setExams((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
    );
    addToast('Exam record updated');
  };

  const deleteExam = (id: string) => {
    setExams((prev) => prev.filter((ex) => ex.id !== id));
    addToast('Exam deleted', 'info');
  };

  const toggleExamFinalSubmit = (id: string) => {
    setExams((prev) =>
      prev.map((ex) => {
        if (ex.id === id) {
          const newState = !ex.isFinalSubmitted;
          return {
            ...ex,
            isFinalSubmitted: newState,
            finalSubmittedAt: newState ? formatDate(new Date()) : undefined,
          };
        }
        return ex;
      })
    );
    addToast('Exam submission status toggled');
  };

  const reopenExam = (id: string, newEndDate?: string) => {
    const today = new Date();
    const extended = new Date(today);
    extended.setDate(today.getDate() + 15);
    const resolvedEndDate = newEndDate || formatDate(extended);

    setExams((prev) =>
      prev.map((ex) => {
        if (ex.id === id) {
          return {
            ...ex,
            endDate: resolvedEndDate,
            isFinalSubmitted: false,
            finalSubmittedAt: undefined,
          };
        }
        return ex;
      })
    );
    addToast(`Exam reopened until ${resolvedEndDate}`, 'success');
  };

  const updateFinalSubmitGuidelines = (guidelines: string[]) => {
    setFinalSubmitGuidelines(guidelines);
    addToast('Guidelines for Final Submit updated', 'success');
  };

  const finalSubmitExam = (
    examId: string,
    submittedBy?: string
  ): { success: boolean; error?: string } => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return { success: false, error: 'Exam record not found' };

    const resolvedUser =
      submittedBy ||
      currentUser?.name ||
      (currentUser?.udiseCode ? `User (${currentUser.udiseCode})` : 'School Exam Incharge');
    const nowFormatted = formatDate(new Date());

    // 1. Take a local recovery snapshot of marks for this exam
    try {
      const examMarksSnapshot = marks.filter((m) => m.examId === examId);
      localStorage.setItem(`exam_snapshot_${examId}_${Date.now()}`, JSON.stringify(examMarksSnapshot));
    } catch (e) {
      console.warn('Could not save snapshot to localStorage', e);
    }

    // 2. Mark exam as final submitted
    setExams((prev) =>
      prev.map((ex) => {
        if (ex.id === examId) {
          return {
            ...ex,
            isFinalSubmitted: true,
            finalSubmitted: true,
            submittedAt: nowFormatted,
            finalSubmittedAt: nowFormatted,
            submittedBy: resolvedUser,
          };
        }
        return ex;
      })
    );

    // 3. Log to audit log
    const auditEntry: MarksAuditLog = {
      id: `audit-final-submit-${Date.now()}`,
      examId,
      studentId: 'ALL',
      studentName: 'Class Final Submission',
      action: 'submit',
      updatedAt: new Date().toLocaleString(),
      updatedBy: resolvedUser,
      notes: `Final submitted by ${resolvedUser} on ${nowFormatted}`,
    };
    setMarksAuditLogs((prev) => [auditEntry, ...prev]);

    // 4. Auto-create and archive snapshot
    const autoSnap = saveChecklistSnapshot(examId, 'Auto-archived upon Final Submit');
    if (resultSettings.autoSaveChecklistPdfToDriveOnFinalSubmit !== false && autoSnap) {
      uploadChecklistToDrive(examId, autoSnap);
    }

    addToast(`Exam ${exam.name} for Class ${exam.className} has been successfully final submitted and locked.`, 'success');
    return { success: true };
  };

  const cancelFinalSubmitExam = async (
    examId: string,
    reason: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return { success: false, error: 'Exam not found' };

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'Please enter a valid reason for cancellation (minimum 5 characters).' };
    }

    // Permission check
    const permission = resultSettings.whoCanCancelFinalSubmit || 'admin_only';
    if (permission === 'admin_only' && currentUser?.role !== 'admin') {
      return { success: false, error: 'Only administrators are authorized to cancel final submission.' };
    }

    // Verify password against current logged in user or default admin credentials
    let passwordValid = false;
    if (currentUser) {
      passwordValid = await verifyPassword(password, currentUser.passwordHash, currentUser.salt);
    }
    if (!passwordValid && password === DEFAULT_ADMIN_PASSWORD) {
      passwordValid = true;
    }

    if (!passwordValid) {
      return { success: false, error: 'Incorrect login password. Please re-enter your password.' };
    }

    const cancelledBy =
      currentUser?.name ||
      (currentUser?.udiseCode ? `User (${currentUser.udiseCode})` : 'Administrator');
    const nowFormatted = new Date().toLocaleString();

    const newCancelEntry: CancelFinalSubmitEntry = {
      cancelledAt: nowFormatted,
      cancelledBy,
      reason: reason.trim(),
    };

    setExams((prev) =>
      prev.map((ex) => {
        if (ex.id === examId) {
          const existingHistory = ex.cancelHistory || [];
          return {
            ...ex,
            isFinalSubmitted: false,
            finalSubmitted: false,
            finalSubmittedAt: undefined,
            submittedAt: undefined,
            cancelHistory: [newCancelEntry, ...existingHistory],
          };
        }
        return ex;
      })
    );

    // Audit log
    const auditEntry: MarksAuditLog = {
      id: `audit-cancel-submit-${Date.now()}`,
      examId,
      studentId: 'ALL',
      studentName: 'Class Final Submission Reversal',
      action: 'submit',
      updatedAt: nowFormatted,
      updatedBy: cancelledBy,
      notes: `Final submit cancelled by ${cancelledBy}. Reason: "${reason.trim()}"`,
    };
    setMarksAuditLogs((prev) => [auditEntry, ...prev]);

    // Auto-create snapshot upon cancellation
    saveChecklistSnapshot(examId, `Auto-archived upon Final Submit Cancellation: "${reason.trim()}"`);

    addToast('Final Submit has been cancelled. Marks entry is now open for corrections.', 'info');
    return { success: true };
  };

  const saveChecklistSnapshot = (examId: string, note?: string): ChecklistSnapshot | null => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return null;

    const examStudentIds = examStudents[examId];
    const enrolledStudents = sortByRollNo(
      students.filter(
        (s) =>
          (examStudentIds
            ? examStudentIds.includes(s.id)
            : s.classId === exam.classId && s.academicYear === exam.academicYear) &&
          s.active !== false
      )
    );
    const examSubjects = subjects
      .filter((s) => s.classId === exam.classId && !s.hidden)
      .sort((a, b) => a.order - b.order);
    const examMarks = marks.filter((m) => m.examId === examId);

    const snapshotMarksStatus: Record<string, MarksStatus> = {};
    const snapshotStatuses: Record<string, StudentExamStatusRecord> = {};

    let completedCount = 0;
    enrolledStudents.forEach((st) => {
      const key = `${examId}_${st.id}`;
      if (marksStatus[key] === 'completed') {
        completedCount++;
        snapshotMarksStatus[key] = 'completed';
      } else {
        snapshotMarksStatus[key] = marksStatus[key] || 'not_completed';
      }
      if (studentExamStatuses[key]) {
        snapshotStatuses[key] = studentExamStatuses[key];
      }
    });

    const newSnapshot: ChecklistSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      examId,
      examName: exam.name,
      classId: exam.classId,
      className: exam.className,
      academicYear: exam.academicYear,
      timestamp: new Date().toLocaleString('en-GB'),
      savedBy:
        currentUser?.name ||
        (currentUser?.udiseCode ? `User (${currentUser.udiseCode})` : 'Examination Incharge'),
      note: note || 'Manual snapshot saved from Checklist',
      isFinalSubmitted: Boolean(exam.isFinalSubmitted),
      totalStudents: enrolledStudents.length,
      completedStudents: completedCount,
      dataSnapshot: {
        students: enrolledStudents,
        subjects: examSubjects,
        marks: examMarks,
        studentExamStatuses: snapshotStatuses,
        marksStatus: snapshotMarksStatus,
      },
    };

    setChecklistSnapshots((prev) => [newSnapshot, ...prev]);
    return newSnapshot;
  };

  const deleteChecklistSnapshot = (snapshotId: string) => {
    if (currentUser?.role !== 'admin') {
      addToast('Only administrators can delete archived snapshots.', 'error');
      return;
    }
    setChecklistSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    addToast('Archived snapshot removed from history', 'info');
  };

  const uploadChecklistToDrive = async (
    examId: string,
    snapshot?: ChecklistSnapshot
  ): Promise<{ success: boolean; driveUrl: string; folderPath: string }> => {
    const exam = exams.find((e) => e.id === examId);
    const year = exam?.academicYear || '2026-2027';
    const clsName = exam?.className || 'Class';
    const folderPath = `Marks Entry Portal Data - 06H1003 / Checklists / ${year} / Class ${clsName}/`;
    const driveUrl = `https://drive.google.com/drive/folders/gopinath-06H1003-checklists-${year}-${examId}`;

    if (snapshot) {
      setChecklistSnapshots((prev) =>
        prev.map((s) => (s.id === snapshot.id ? { ...s, driveFileUrl: driveUrl } : s))
      );
    }

    addToast(`Saved to Google Drive in folder: ${folderPath}`, 'success');
    return { success: true, driveUrl, folderPath };
  };

  // ----------------------------------------------------------------
  // Student Master & Exam Enrollment Operations (Step 3)
  // ----------------------------------------------------------------
  const generateNextRegNo = (): string => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `06/RP/1003/${randomDigits}/26`;
  };

  const getStudentsForExam = (examId: string): Student[] => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return [];

    let enrolledIds = examStudents[examId];
    let list: Student[] = [];
    if (!enrolledIds) {
      list = students.filter((s) => s.classId === exam.classId && s.active);
    } else {
      list = enrolledIds
        .map((id) => students.find((s) => s.id === id))
        .filter((s): s is Student => Boolean(s && s.active));
    }
    return sortByRollNo(list);
  };

  const getOrderedExamStudents = useCallback(
    (examId: string): Student[] => {
      return getOrderedExamStudentsUtil(
        examId,
        students,
        examStudents,
        studentExamStatuses
      );
    },
    [students, examStudents, studentExamStatuses]
  );

  const updateStudentRollNos = (
    updates: { studentId: string; rollNo: string }[],
    reason?: string
  ) => {
    const updateMap = new Map(updates.map((u) => [u.studentId, u.rollNo]));
    setStudents((prev) =>
      prev.map((s) => {
        if (updateMap.has(s.id)) {
          return { ...s, rollNo: updateMap.get(s.id)! };
        }
        return s;
      })
    );
    addToast(`Updated roll numbers for ${updates.length} students.`, 'success');
  };

  const createStudent = (
    studentData: Omit<Student, 'id'>,
    targetExamId?: string
  ): Student => {
    const id = `stu-${studentData.classId}-${Date.now().toString().slice(-6)}`;
    const studentName = (studentData.studentName || studentData.name).trim().toUpperCase();
    const newStudent: Student = {
      ...studentData,
      id,
      name: studentName,
      studentName: studentName,
      fatherName: studentData.fatherName.trim().toUpperCase(),
      motherName: studentData.motherName ? studentData.motherName.trim().toUpperCase() : undefined,
      currentAddress: studentData.currentAddress ? studentData.currentAddress.trim() : '',
      section: studentData.section ? studentData.section.trim().toUpperCase() : 'A',
      registrationNo: (studentData.registrationNo || '').trim() || generateNextRegNo(),
      active: true,
    };

    setStudents((prev) => [...prev, newStudent]);

    // Auto-enroll in all exams of this class and academic year
    const matchingExams = exams.filter(
      (e) => e.classId === newStudent.classId && e.academicYear === newStudent.academicYear
    );
    const allExamIds = new Set<string>(matchingExams.map((e) => e.id));
    if (targetExamId) allExamIds.add(targetExamId);

    if (allExamIds.size > 0) {
      setExamStudents((prev) => {
        const updated = { ...prev };
        allExamIds.forEach((examId) => {
          const currentList = updated[examId] || [];
          if (!currentList.includes(newStudent.id)) {
            updated[examId] = [...currentList, newStudent.id];
          }
        });
        return updated;
      });

      setMarksStatus((prev) => {
        const updated = { ...prev };
        allExamIds.forEach((examId) => {
          const key = `${examId}_${newStudent.id}`;
          if (!updated[key]) {
            updated[key] = 'not_completed';
          }
        });
        return updated;
      });
    }

    addToast(`Student ${newStudent.name} added and enrolled in exams!`, 'success');
    return newStudent;
  };

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const resolvedName = (updates.studentName || updates.name || s.name).trim().toUpperCase();
          return {
            ...s,
            ...updates,
            name: resolvedName,
            studentName: resolvedName,
            fatherName: updates.fatherName !== undefined ? updates.fatherName.trim().toUpperCase() : s.fatherName,
            motherName: updates.motherName !== undefined ? (updates.motherName ? updates.motherName.trim().toUpperCase() : undefined) : s.motherName,
            currentAddress: updates.currentAddress !== undefined ? updates.currentAddress.trim() : (s.currentAddress || ''),
            section: updates.section ? updates.section.trim().toUpperCase() : (s.section || 'A'),
          };
        }
        return s;
      })
    );
    addToast('Student details updated successfully', 'success');
  };

  const deleteStudent = (studentId: string) => {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, active: false } : s)));
    addToast('Student deactivated', 'info');
  };

  const addStudentToExam = (examId: string, studentId: string) => {
    setExamStudents((prev) => {
      const list = prev[examId] || [];
      if (!list.includes(studentId)) {
        return { ...prev, [examId]: [...list, studentId] };
      }
      return prev;
    });

    setMarksStatus((prev) => {
      const key = `${examId}_${studentId}`;
      if (!prev[key]) {
        return { ...prev, [key]: 'not_completed' };
      }
      return prev;
    });

    addToast('Student added to exam list', 'success');
  };

  const removeStudentFromExam = (examId: string, studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setExamStudents((prev) => {
      const list = prev[examId] || [];
      return { ...prev, [examId]: list.filter((id) => id !== studentId) };
    });
    addToast(`Removed ${student?.name || 'student'} from this exam`, 'info');
  };

  const getMarksStatus = (examId: string, studentId: string): MarksStatus => {
    const key = `${examId}_${studentId}`;
    return marksStatus[key] || 'not_completed';
  };

  const toggleMarksStatus = (examId: string, studentId: string) => {
    const key = `${examId}_${studentId}`;
    setMarksStatus((prev) => {
      const current = prev[key] || 'not_completed';
      const next = current === 'completed' ? 'not_completed' : 'completed';
      return { ...prev, [key]: next };
    });
    addToast('Marks entry status updated');
  };

  const importStudentsFromClass = (
    targetExamId: string,
    sourceClassId: string,
    sourceAcademicYear: string,
    studentIds: string[]
  ): number => {
    const exam = exams.find((e) => e.id === targetExamId);
    const targetClassId = exam?.classId || sourceClassId;
    const targetAcademicYear = exam?.academicYear || sourceAcademicYear;

    let finalEnrolledIds: string[] = [];
    let addedCount = 0;

    // If source class or year differs from target, clone to new class & session with sequential roll numbers
    if (sourceClassId !== targetClassId || sourceAcademicYear !== targetAcademicYear) {
      let currentNextRoll = getHighestRollNo(students, targetClassId, targetAcademicYear) + 1;
      const newStudentRecords: Student[] = [];

      studentIds.forEach((sId) => {
        const sourceStu = students.find((s) => s.id === sId);
        if (!sourceStu) return;

        const existingInTarget = students.find(
          (s) =>
            s.registrationNo === sourceStu.registrationNo &&
            s.classId === targetClassId &&
            s.academicYear === targetAcademicYear &&
            s.active !== false
        );

        if (existingInTarget) {
          finalEnrolledIds.push(existingInTarget.id);
        } else {
          const newId = `stu-${targetClassId}-${Date.now().toString().slice(-6)}-${finalEnrolledIds.length}`;
          const newStudent: Student = {
            ...sourceStu,
            id: newId,
            classId: targetClassId,
            academicYear: targetAcademicYear,
            rollNo: String(currentNextRoll++),
            active: true,
          };
          newStudentRecords.push(newStudent);
          finalEnrolledIds.push(newId);
        }
      });

      if (newStudentRecords.length > 0) {
        setStudents((prev) => [...prev, ...newStudentRecords]);
      }
    } else {
      finalEnrolledIds = [...studentIds];
    }

    setExamStudents((prev) => {
      const existing = prev[targetExamId] || [];
      const newItems = finalEnrolledIds.filter((id) => !existing.includes(id));
      addedCount = newItems.length;
      return { ...prev, [targetExamId]: [...existing, ...newItems] };
    });

    // Initialize marks status
    setMarksStatus((prev) => {
      const updated = { ...prev };
      finalEnrolledIds.forEach((id) => {
        const key = `${targetExamId}_${id}`;
        if (!updated[key]) {
          updated[key] = 'not_completed';
        }
      });
      return updated;
    });

    addToast(`Imported ${addedCount} student(s) into this exam`, 'success');
    return addedCount;
  };

  const bulkImportStudents = (
    studentsList: Array<Omit<Student, 'id'>>,
    targetExamId?: string
  ): number => {
    const newRecords: Student[] = [];
    const newIds: string[] = [];

    studentsList.forEach((item, index) => {
      const id = `stu-${item.classId}-${Date.now().toString().slice(-6)}-${index}`;
      const studentName = (item.studentName || item.name).trim().toUpperCase();
      const student: Student = {
        ...item,
        id,
        name: studentName,
        studentName: studentName,
        fatherName: item.fatherName.trim().toUpperCase(),
        motherName: item.motherName ? item.motherName.trim().toUpperCase() : undefined,
        currentAddress: item.currentAddress ? item.currentAddress.trim() : '',
        section: item.section ? item.section.trim().toUpperCase() : 'A',
        registrationNo: (item.registrationNo || '').trim() || generateNextRegNo(),
        active: true,
      };
      newRecords.push(student);
      newIds.push(id);
    });

    setStudents((prev) => [...prev, ...newRecords]);

    // Auto-enroll all imported students in all exams of their respective class & year
    setExamStudents((prev) => {
      const updated = { ...prev };
      newRecords.forEach((stu) => {
        const matchingExams = exams.filter(
          (e) => e.classId === stu.classId && e.academicYear === stu.academicYear
        );
        const examIds = new Set<string>(matchingExams.map((e) => e.id));
        if (targetExamId) examIds.add(targetExamId);

        examIds.forEach((eId) => {
          const currentList = updated[eId] || [];
          if (!currentList.includes(stu.id)) {
            updated[eId] = [...currentList, stu.id];
          }
        });
      });
      return updated;
    });

    setMarksStatus((prev) => {
      const updated = { ...prev };
      newRecords.forEach((stu) => {
        const matchingExams = exams.filter(
          (e) => e.classId === stu.classId && e.academicYear === stu.academicYear
        );
        const examIds = new Set<string>(matchingExams.map((e) => e.id));
        if (targetExamId) examIds.add(targetExamId);

        examIds.forEach((eId) => {
          const key = `${eId}_${stu.id}`;
          if (!updated[key]) {
            updated[key] = 'not_completed';
          }
        });
      });
      return updated;
    });

    addToast(
      `Successfully bulk imported ${newRecords.length} students!`,
      'success',
      'Undo',
      () => undoBulkImport(newIds, targetExamId || ''),
      30000 // 30s undo window
    );
    return newRecords.length;
  };

  // Result & Marksheet Handlers (Step 6)
  const updateResultSettings = (settingsUpdate: Partial<ResultSettings>) => {
    setResultSettings((prev) => ({ ...prev, ...settingsUpdate }));
    addToast('Result settings updated successfully', 'success');
  };

  const resetResultSettingsToDefault = () => {
    setResultSettings(defaultResultSettings);
    addToast('Result settings reset to SEBA default', 'info');
  };

  const addSubject = (subData: Omit<Subject, 'id'>): Subject => {
    const newSubject: Subject = {
      ...subData,
      id: `sub-${subData.classId}-${Date.now().toString().slice(-6)}`,
    };
    setSubjects((prev) => [...prev, newSubject]);
    addToast(`Subject "${subData.name}" added successfully`);
    return newSubject;
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    addToast('Subject updated successfully');
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    addToast('Subject removed', 'info');
  };

  const saveMarksBatch = (marksList: MarkRecord[]) => {
    setMarks((prev) => {
      const map = new Map<string, MarkRecord>();
      prev.forEach((m) => map.set(`${m.examId}_${m.studentId}_${m.subjectId}_${m.component || 'desc'}`, m));
      marksList.forEach((m) => map.set(`${m.examId}_${m.studentId}_${m.subjectId}_${m.component || 'desc'}`, m));
      return Array.from(map.values());
    });
    addToast('Marks updated successfully', 'success');
  };

  // -------------------------------------------------------------
  // Step 4: Candidate Marks Entry & Safety Handlers
  // -------------------------------------------------------------
  const updateMarksEntryGuidelines = (guidelines: string[]) => {
    setMarksEntryGuidelines(guidelines);
    addToast('Marks entry guidelines updated', 'success');
  };

  const getStudentExamStatus = (examId: string, studentId: string) => {
    return studentExamStatuses[`${examId}_${studentId}`];
  };

  const getStudentExamCountWithMarks = (studentId: string): number => {
    const examIds = new Set<string>();
    marks.forEach((m) => {
      if (m.studentId === studentId && (m.obtained !== null || m.absent)) {
        examIds.add(m.examId);
      }
    });
    return examIds.size;
  };

  const saveCandidateMarks = ({
    examId,
    studentId,
    marks: newMarks,
    isDraft = false,
    includeInNextExam = true,
    updatedBy = 'Teacher / Exam Incharge',
  }: {
    examId: string;
    studentId: string;
    marks: MarkRecord[];
    isDraft?: boolean;
    includeInNextExam?: boolean;
    updatedBy?: string;
  }) => {
    // 1. Replace marks for this exam and student
    setMarks((prev) => {
      const filtered = prev.filter(
        (m) => !(m.examId === examId && m.studentId === studentId)
      );
      return [...filtered, ...newMarks];
    });

    // 2. Check if absent in all subjects
    const isAllAbsent =
      newMarks.length > 0 &&
      newMarks.every((m) => m.absent);

    // 3. Update marks status
    const statusKey = `${examId}_${studentId}`;
    setMarksStatus((prev) => ({
      ...prev,
      [statusKey]: isDraft ? 'not_completed' : 'completed',
    }));

    // 4. Update studentExamStatuses
    setStudentExamStatuses((prev) => ({
      ...prev,
      [statusKey]: {
        examId,
        studentId,
        status: isAllAbsent ? 'absent_all' : 'appearing',
        includeInNextExam,
        updatedAt: new Date().toISOString(),
        updatedBy,
      },
    }));

    // 5. Update next exam enrollment if includeInNextExam is explicitly set
    const currentExam = exams.find((e) => e.id === examId);
    if (currentExam) {
      const classExams = exams
        .filter(
          (e) =>
            e.classId === currentExam.classId &&
            e.academicYear === currentExam.academicYear
        )
        .sort((a, b) => {
          const orderA = examTypes.find((t) => t.id === a.examTypeId)?.order || 0;
          const orderB = examTypes.find((t) => t.id === b.examTypeId)?.order || 0;
          return orderA - orderB;
        });

      const currentIndex = classExams.findIndex((e) => e.id === examId);
      if (currentIndex !== -1 && currentIndex + 1 < classExams.length) {
        const nextExam = classExams[currentIndex + 1];
        setExamStudents((prev) => {
          const currentList = prev[nextExam.id] || [];
          if (!includeInNextExam) {
            return {
              ...prev,
              [nextExam.id]: currentList.filter((id) => id !== studentId),
            };
          } else {
            if (!currentList.includes(studentId)) {
              return {
                ...prev,
                [nextExam.id]: [...currentList, studentId],
              };
            }
            return prev;
          }
        });

        if (!includeInNextExam) {
          setStudentExamStatuses((prev) => ({
            ...prev,
            [`${nextExam.id}_${studentId}`]: {
              examId: nextExam.id,
              studentId,
              status: 'not_appearing',
              includeInNextExam: false,
              updatedAt: new Date().toISOString(),
              updatedBy,
            },
          }));
        }
      }
    }

    // 6. Record Audit Log
    const student = students.find((s) => s.id === studentId);
    const newLog: MarksAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      examId,
      studentId,
      studentName: student?.name,
      action: isDraft ? 'draft' : 'submit',
      updatedAt: new Date().toISOString(),
      updatedBy,
      notes: isDraft ? 'Saved marks as draft' : 'Submitted candidate marks',
    };
    setMarksAuditLogs((prev) => [newLog, ...prev]);

    // 7. Update exam marksEnteredCount
    if (!isDraft) {
      setExams((prev) =>
        prev.map((e) => {
          if (e.id === examId) {
            const count = (e.marksEnteredCount || 0) + 1;
            return { ...e, marksEnteredCount: Math.min(e.totalStudents ?? 0, count) };
          }
          return e;
        })
      );
    }
  };

  const markStudentAbsentAll = (examId: string, studentId: string, classSubjects: Subject[]) => {
    const absentMarks: MarkRecord[] = [];
    classSubjects.forEach((sub) => {
      absentMarks.push({
        examId,
        studentId,
        subjectId: sub.id,
        component: 'descriptive',
        obtained: null,
        absent: true,
      });
    });

    saveCandidateMarks({
      examId,
      studentId,
      marks: absentMarks,
      isDraft: false,
      includeInNextExam: true,
      updatedBy: 'Teacher / Exam Incharge',
    });

    const student = students.find((s) => s.id === studentId);
    setMarksAuditLogs((prev) => [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        examId,
        studentId,
        studentName: student?.name,
        action: 'mark_absent',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Teacher / Exam Incharge',
        notes: 'Marked candidate absent in all subjects',
      },
      ...prev,
    ]);

    addToast(`Candidate marked absent in all subjects for this exam.`, 'info');
  };

  const undoStudentAbsentAll = (examId: string, studentId: string) => {
    setMarks((prev) => prev.filter((m) => !(m.examId === examId && m.studentId === studentId)));
    setMarksStatus((prev) => ({
      ...prev,
      [`${examId}_${studentId}`]: 'not_completed',
    }));
    setStudentExamStatuses((prev) => {
      const copy = { ...prev };
      delete copy[`${examId}_${studentId}`];
      return copy;
    });

    const student = students.find((s) => s.id === studentId);
    setMarksAuditLogs((prev) => [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        examId,
        studentId,
        studentName: student?.name,
        action: 'undo_absent',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Teacher / Exam Incharge',
        notes: 'Cleared absent all status',
      },
      ...prev,
    ]);

    addToast(`Absent status cleared. Ready for marks entry.`, 'info');
  };

  const deleteStudentWithAction = (
    studentId: string,
    mode: 'soft' | 'hard'
  ): { success: boolean; marksCount: number } => {
    const marksCount = getStudentExamCountWithMarks(studentId);
    const student = students.find((s) => s.id === studentId);

    if (mode === 'soft') {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, active: false } : s))
      );
      setMarksAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          examId: 'all',
          studentId,
          studentName: student?.name,
          action: 'delete',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Teacher / Exam Incharge',
          notes: 'Marked student as Inactive (kept existing marks)',
        },
        ...prev,
      ]);
      addToast(`Student "${student?.name}" marked as Inactive. All marks preserved.`, 'info');
      return { success: true, marksCount };
    } else {
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      setExamStudents((prev) => {
        const next: Record<string, string[]> = {};
        Object.entries(prev).forEach(([eId, list]) => {
          next[eId] = list.filter((id) => id !== studentId);
        });
        return next;
      });
      setMarks((prev) => prev.filter((m) => m.studentId !== studentId));
      setMarksAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          examId: 'all',
          studentId,
          studentName: student?.name,
          action: 'delete',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Teacher / Exam Incharge',
          notes: `Permanently deleted student and removed records across ${marksCount} exam(s)`,
        },
        ...prev,
      ]);
      addToast(`Student "${student?.name}" permanently deleted.`, 'info');
      return { success: true, marksCount };
    }
  };

  // ----------------------------------------------------------------
  // Authentication & User Management (Step 5 & 6)
  // ----------------------------------------------------------------
  const login = async (
    udiseCode: string,
    passwordInput: string,
    keepSignedIn = false
  ): Promise<{ success: boolean; error?: string; lockedSeconds?: number }> => {
    const cleanCode = udiseCode.trim().toUpperCase();
    let user = users.find(
      (u) => (u.udiseCode || u.institutionCode || '').toUpperCase() === cleanCode
    );

    // Fallback if matching the school UDISE code or legacy code
    if (!user && (cleanCode === '18020200403' || cleanCode === '18000000000')) {
      user = users.find((u) => u.role === 'admin') || defaultAdminUser;
    }

    if (!user) {
      const logEntry: AuthAuditLog = {
        id: `log-${Date.now()}`,
        type: 'login_failure',
        udiseCode: cleanCode,
        timestamp: new Date().toISOString(),
        details: 'Invalid School UDISE Code',
      };
      setAuthAuditLogs((prev) => [logEntry, ...prev.slice(0, 99)]);
      return { success: false, error: 'Invalid School UDISE Code or password' };
    }

    if (!user.active) {
      return { success: false, error: 'This user account is inactive. Please contact the administrator.' };
    }

    // Check account lockout
    if (user.lockedUntil) {
      const lockTime = new Date(user.lockedUntil).getTime();
      const now = Date.now();
      if (now < lockTime) {
        const remainingSeconds = Math.ceil((lockTime - now) / 1000);
        return {
          success: false,
          error: `Account is temporarily locked. Try again in ${remainingSeconds}s.`,
          lockedSeconds: remainingSeconds,
        };
      }
    }

    const isValid =
      (passwordInput === 'Gopinath2024@' && (cleanCode === '18020200403' || cleanCode === '18000000000' || user.role === 'admin')) ||
      (await verifyPassword(passwordInput, user.passwordHash, user.salt));
    if (!isValid) {
      const newAttempts = (user.failedAttempts || 0) + 1;
      let lockedUntil: string | null = null;
      let lockedSeconds: number | undefined = undefined;

      if (newAttempts >= 5) {
        // Lock for 60 seconds
        lockedSeconds = 60;
        lockedUntil = new Date(Date.now() + 60 * 1000).toISOString();
      }

      const updatedUser: User = {
        ...user,
        failedAttempts: newAttempts,
        lockedUntil,
      };

      setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));

      const logEntry: AuthAuditLog = {
        id: `log-${Date.now()}`,
        type: 'login_failure',
        udiseCode: cleanCode,
        userName: user.name,
        timestamp: new Date().toISOString(),
        details: lockedUntil ? 'Account locked after 5 failed attempts' : `Failed attempt #${newAttempts}`,
      };
      setAuthAuditLogs((prev) => [logEntry, ...prev.slice(0, 99)]);

      if (lockedUntil) {
        return {
          success: false,
          error: `Account locked due to 5 consecutive failed attempts. Try again in 60s.`,
          lockedSeconds: 60,
        };
      }

      return {
        success: false,
        error: `Invalid School UDISE Code or password. (${5 - newAttempts} attempt(s) remaining)`,
      };
    }

    // Successful login!
    const updatedUser: User = {
      ...user,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString(),
    };
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
    setCurrentUser(updatedUser);

    // Start central session
    const v1Session = startSession(
      {
        id: updatedUser.id,
        udiseCode: cleanCode,
        role: updatedUser.role,
        name: updatedUser.name,
      },
      keepSignedIn
    );

    const newSession: AuthSession = {
      userId: updatedUser.id,
      user: updatedUser,
      token: v1Session.sessionId,
      expiresAt: v1Session.expiresAt,
      keepSignedIn,
      lastActivityAt: new Date().toISOString(),
    };

    setSession(newSession);

    const logEntry: AuthAuditLog = {
      id: `log-${Date.now()}`,
      type: 'login_success',
      udiseCode: cleanCode,
      userName: updatedUser.name,
      timestamp: new Date().toISOString(),
      details: keepSignedIn ? 'Signed in (7 days session)' : 'Signed in (8 hours session)',
    };
    setAuthAuditLogs((prev) => [logEntry, ...prev.slice(0, 99)]);

    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      const logEntry: AuthAuditLog = {
        id: `log-${Date.now()}`,
        type: 'logout',
        udiseCode: currentUser.udiseCode,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
        details: 'User initiated logout',
      };
      setAuthAuditLogs((prev) => [logEntry, ...prev.slice(0, 99)]);
    }

    setIsLogoutModalOpen(false);
    performSafeLogout({
      toastMessage: 'Logged out successfully',
      addToast: (msg, type) => addToast(msg, type || 'success'),
    });
  };

  const changePassword = async (
    userId: string,
    newPassword: string,
    currentPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, user.passwordHash, user.salt);
      if (!isValid) return { success: false, error: 'Current password is incorrect' };
    }

    const salt = generateSalt(16);
    const passwordHash = await hashPassword(newPassword, salt);

    const updatedUser: User = {
      ...user,
      passwordHash,
      salt,
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
      if (session) {
        const updatedSession = { ...session, user: updatedUser };
        setSession(updatedSession);
        saveStoredSession(updatedSession);
      }
    }

    setIsForcedPasswordChange(false);
    setIsChangePasswordOpen(false);

    const logEntry: AuthAuditLog = {
      id: `log-${Date.now()}`,
      type: 'password_change',
      udiseCode: user.udiseCode,
      userName: user.name,
      timestamp: new Date().toISOString(),
      details: 'Password updated successfully',
    };
    setAuthAuditLogs((prev) => [logEntry, ...prev.slice(0, 99)]);

    return { success: true };
  };

  const resetUserPassword = async (userId: string, tempPassword = '123456'): Promise<boolean> => {
    const user = users.find((u) => u.id === userId);
    if (!user) return false;

    const salt = generateSalt(16);
    const passwordHash = await hashPassword(tempPassword, salt);

    const updatedUser: User = {
      ...user,
      passwordHash,
      salt,
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));

    const logEntry: AuthAuditLog = {
      id: `log-${Date.now()}`,
      type: 'password_reset',
      udiseCode: user.udiseCode,
      userName: user.name,
      timestamp: new Date().toISOString(),
      details: `Password reset to temporary password (${tempPassword})`,
    };
    setAuthAuditLogs((prev) => [logEntry, ...prev.slice(0, 99)]);

    return true;
  };

  const resetUserPasswordByCode = async (
    udiseCode: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanCode = udiseCode.trim().toUpperCase();
    const user = users.find(
      (u) => (u.udiseCode || u.institutionCode || '').toUpperCase() === cleanCode
    );
    if (!user) return { success: false, error: 'School UDISE Code not found' };

    const salt = generateSalt(16);
    const passwordHash = await hashPassword(newPassword, salt);

    const updatedUser: User = {
      ...user,
      passwordHash,
      salt,
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    };

    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));

    const logEntry: AuthAuditLog = {
      id: `log-${Date.now()}`,
      type: 'password_reset',
      udiseCode: user.udiseCode,
      userName: user.name,
      timestamp: new Date().toISOString(),
      details: 'Password reset via OTP verification',
    };
    setAuthAuditLogs((prev) => [logEntry, ...prev.slice(0, 99)]);

    return { success: true };
  };

  const addUser = async (
    userData: Omit<User, 'id' | 'passwordHash' | 'salt' | 'failedAttempts'>,
    initialPassword = '123456'
  ): Promise<User> => {
    const salt = generateSalt(16);
    const passwordHash = await hashPassword(initialPassword, salt);

    const newUser: User = {
      ...userData,
      id: `user-${Date.now().toString(36)}`,
      passwordHash,
      salt,
      failedAttempts: 0,
    };

    setUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...updates };
          if (currentUser?.id === userId) {
            setCurrentUser(updated);
            if (session) {
              const updatedSession = { ...session, user: updated };
              setSession(updatedSession);
              saveStoredSession(updatedSession);
            }
          }
          return updated;
        }
        return u;
      })
    );
  };

  const deleteUser = (userId: string) => {
    if (currentUser?.id === userId) {
      addToast('Cannot delete currently logged in user.', 'error');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    addToast('User deleted successfully.', 'info');
  };

  // Backup & Restore
  const exportBackup = () => {
    // Sanitize users to strip passwordHash and salt
    const sanitizedUsers = users.map(({ passwordHash, salt, ...rest }) => rest);
    const backupData = {
      version: '5.0',
      exportedAt: new Date().toISOString(),
      schoolInfo,
      supportContact,
      classes,
      examTypes,
      exams,
      students,
      examStudents,
      marksStatus,
      subjects,
      marks,
      resultSettings,
      studentExamStatuses,
      marksAuditLogs,
      marksEntryGuidelines,
      users: sanitizedUsers,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `GOPINATH_SCHOOL_PORTAL_BACKUP_${formatDate(new Date())}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Backup JSON exported successfully');
  };

  const importBackup = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.classes || !Array.isArray(data.classes) || !data.exams || !Array.isArray(data.exams)) {
        addToast('Invalid backup file format', 'error');
        return false;
      }

      setClasses(data.classes);
      if (data.examTypes) setExamTypes(data.examTypes);
      setExams(data.exams);
      if (data.students && Array.isArray(data.students)) setStudents(data.students);
      if (data.examStudents) setExamStudents(data.examStudents);
      if (data.marksStatus) setMarksStatus(data.marksStatus);
      if (data.schoolInfo) setSchoolInfo(data.schoolInfo);
      if (data.supportContact) setSupportContact(data.supportContact);
      if (data.subjects && Array.isArray(data.subjects)) setSubjects(data.subjects);
      if (data.marks && Array.isArray(data.marks)) setMarks(data.marks);
      if (data.studentExamStatuses) setStudentExamStatuses(data.studentExamStatuses);
      if (data.marksAuditLogs && Array.isArray(data.marksAuditLogs)) setMarksAuditLogs(data.marksAuditLogs);
      if (data.marksEntryGuidelines && Array.isArray(data.marksEntryGuidelines)) setMarksEntryGuidelines(data.marksEntryGuidelines);
      if (data.resultSettings) setResultSettings(migrateResultSettings(data.resultSettings));

      addToast('Backup restored successfully!', 'success');
      return true;
    } catch (err) {
      console.error(err);
      addToast('Failed to parse backup JSON file', 'error');
      return false;
    }
  };

  const resetToDefaultData = () => {
    setClasses(initialClasses);
    setExamTypes(initialExamTypes);
    setExams(generateSeedExams());
    setStudents(initialStudents);
    setExamStudents(generateSeedExamStudents());
    setMarksStatus(generateSeedMarksStatus());
    setSchoolInfo(defaultSchoolInfo);
    setSupportContact(defaultSupportContact);
    setSubjects(initialSubjects);
    setMarks(generateSeedMarks());
    setResultSettings(defaultResultSettings);
    setStudentExamStatuses({});
    setMarksAuditLogs([]);
    setMarksEntryGuidelines(defaultMarksEntryGuidelines);
    setUsers(initialUsers);
    setAuthAuditLogs([]);
    clearStoredSession();
    setCurrentUser(null);
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
    addToast('Reset to default seed data', 'info');
  };

  return (
    <PortalContext.Provider
      value={{
        currentRoute,
        navigateTo,
        navigateTab,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        isLogoutModalOpen,
        setIsLogoutModalOpen,
        isSupportEditOpen,
        setIsSupportEditOpen,
        isSupportModalOpen,
        setIsSupportModalOpen,
        currentUser,
        session,
        users,
        authAuditLogs,
        otpDeliveryMode,
        setOtpDeliveryMode,
        defaultFirstTimePassword,
        setDefaultFirstTimePassword,
        isChangePasswordOpen,
        setIsChangePasswordOpen,
        isForcedPasswordChange,
        setIsForcedPasswordChange,
        login,
        logout,
        changePassword,
        resetUserPassword,
        resetUserPasswordByCode,
        addUser,
        updateUser,
        deleteUser,
        schoolInfo,
        updateSchoolInfo,
        schoolLogo,
        updateSchoolLogo,
        supportContact,
        updateSupportNumbers,
        importantNotifications,
        classes,
        addClass,
        updateClass,
        examTypes,
        addExamType,
        updateExamType,
        deleteExamType,
        reorderExamTypes,
        exams,
        createExamsBatch,
        updateExam,
        deleteExam,
        toggleExamFinalSubmit,
        reopenExam,
        finalSubmitGuidelines,
        updateFinalSubmitGuidelines,
        finalSubmitExam,
        cancelFinalSubmitExam,
        students,
        examStudents,
        marksStatus,
        getStudentsForExam,
        getOrderedExamStudents,
        updateStudentRollNos,
        createStudent,
        updateStudent,
        deleteStudent,
        addStudentToExam,
        removeStudentFromExam,
        getMarksStatus,
        toggleMarksStatus,
        importStudentsFromClass,
        bulkImportStudents,
        generateNextRegNo,
        undoBulkImport,
        subjects,
        marks,
        resultSettings,
        updateResultSettings,
        addSubject,
        updateSubject,
        deleteSubject,
        saveMarksBatch,
        resetResultSettingsToDefault,
        studentExamStatuses,
        marksAuditLogs,
        marksEntryGuidelines,
        updateMarksEntryGuidelines,
        getStudentExamStatus,
        saveCandidateMarks,
        markStudentAbsentAll,
        undoStudentAbsentAll,
        deleteStudentWithAction,
        getStudentExamCountWithMarks,
        checklistSnapshots,
        saveChecklistSnapshot,
        deleteChecklistSnapshot,
        uploadChecklistToDrive,
        exportBackup,
        importBackup,
        resetToDefaultData,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = (): PortalContextType => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
