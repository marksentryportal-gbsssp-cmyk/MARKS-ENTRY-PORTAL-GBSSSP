import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
} from '../types';
import { formatDate } from '../utils/dateUtils';
import { initialStudents } from '../data/seedStudents';
import {
  initialSubjects,
  defaultResultSettings,
  generateSeedMarks,
} from '../data/seedResultData';

interface PortalContextType {
  // Routing
  currentRoute: RouteState;
  navigateTo: (path: string) => void;
  navigateTab: (tab: NavigationTab, classId?: string, examId?: string, studentId?: string) => void;

  // UI state
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  isLogoutModalOpen: boolean;
  setIsLogoutModalOpen: (open: boolean) => void;
  isSupportEditOpen: boolean;
  setIsSupportEditOpen: (open: boolean) => void;

  // School info & Support
  schoolInfo: SchoolInfo;
  updateSchoolInfo: (info: Partial<SchoolInfo>) => void;
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

  // Students & Marks Status (Step 3)
  students: Student[];
  examStudents: Record<string, string[]>; // examId -> studentId[]
  marksStatus: Record<string, MarksStatus>; // `${examId}_${studentId}` -> status
  getStudentsForExam: (examId: string) => Student[];
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

const STORAGE_KEY = 'gopinath_school_portal_data_v4';

const defaultSchoolInfo: SchoolInfo = {
  name: 'GOPINATH BORDOLOI SENIOR SECONDARY SCHOOL, PAGLAHAT',
  code: '06H1003',
  boardName: 'Assam State School Education Board, Div-I',
  portalTitle: 'Internal Examination Marks Entry Portal',
  district: 'Dhubri, Assam',
  academicSession: '2026-2027',
};

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
    'dashboard',
    'marks-entry',
    'result',
    'exam-setup',
    'checklist',
    'final-submit',
  ];

  const tab = validTabs.includes(mainTab) ? mainTab : 'dashboard';

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

  // Core Data
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(defaultSchoolInfo);
  const [supportContact, setSupportContact] = useState<SupportContact>(defaultSupportContact);
  const [importantNotifications] = useState<string[]>(defaultNotifications);

  const [classes, setClasses] = useState<ClassInfo[]>(initialClasses);
  const [examTypes, setExamTypes] = useState<ExamType[]>(initialExamTypes);
  const [exams, setExams] = useState<ExamRecord[]>(() => generateSeedExams());

  // Students & Marks Status (Step 3)
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
      const list = prev[targetExamId] || [];
      return {
        ...prev,
        [targetExamId]: list.filter((id) => !importedStudentIds.includes(id)),
      };
    });
    setMarksStatus((prev) => {
      const updated = { ...prev };
      importedStudentIds.forEach((id) => {
        delete updated[`${targetExamId}_${id}`];
      });
      return updated;
    });
    addToast('Import undone: newly added candidates removed', 'info');
  };

  // Sync route with window hash
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(parseRouteFromUrl());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (path: string) => {
    window.location.hash = path.startsWith('/') ? path : `/${path}`;
    setIsMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.classes && Array.isArray(parsed.classes)) setClasses(parsed.classes);
        if (parsed.examTypes && Array.isArray(parsed.examTypes)) setExamTypes(parsed.examTypes);
        if (parsed.exams && Array.isArray(parsed.exams)) setExams(parsed.exams);
        if (parsed.students && Array.isArray(parsed.students)) setStudents(parsed.students);
        if (parsed.examStudents) setExamStudents(parsed.examStudents);
        if (parsed.marksStatus) setMarksStatus(parsed.marksStatus);
        if (parsed.schoolInfo) setSchoolInfo(parsed.schoolInfo);
        if (parsed.supportContact) setSupportContact(parsed.supportContact);
        if (parsed.subjects && Array.isArray(parsed.subjects)) setSubjects(parsed.subjects);
        if (parsed.marks && Array.isArray(parsed.marks)) setMarks(parsed.marks);
        if (parsed.resultSettings) {
          setResultSettings(migrateResultSettings(parsed.resultSettings));
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
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to write portal data to localStorage', e);
    }
  }, [classes, examTypes, exams, students, examStudents, marksStatus, schoolInfo, supportContact, subjects, marks, resultSettings]);

  // School & Support Updaters
  const updateSchoolInfo = (info: Partial<SchoolInfo>) => {
    setSchoolInfo((prev) => ({ ...prev, ...info }));
    addToast('School information updated');
  };

  const updateSupportNumbers = (numbers: string[]) => {
    setSupportContact((prev) => ({ ...prev, numbers }));
    addToast('Support numbers updated');
  };

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
    if (!enrolledIds) {
      // If not yet explicitly set, find students belonging to this class
      return students.filter((s) => s.classId === exam.classId && s.active);
    }

    // Return student records in enrolledIds order
    return enrolledIds
      .map((id) => students.find((s) => s.id === id))
      .filter((s): s is Student => Boolean(s && s.active));
  };

  const createStudent = (
    studentData: Omit<Student, 'id'>,
    targetExamId?: string
  ): Student => {
    const id = `stu-${studentData.classId}-${Date.now().toString().slice(-6)}`;
    const newStudent: Student = {
      ...studentData,
      id,
      name: studentData.name.trim().toUpperCase(),
      fatherName: studentData.fatherName.trim().toUpperCase(),
      motherName: studentData.motherName ? studentData.motherName.trim().toUpperCase() : undefined,
      registrationNo: studentData.registrationNo.trim() || generateNextRegNo(),
      active: true,
    };

    setStudents((prev) => [...prev, newStudent]);

    // If added in context of an exam, enroll in exam list
    if (targetExamId) {
      setExamStudents((prev) => {
        const currentList = prev[targetExamId] || [];
        if (!currentList.includes(newStudent.id)) {
          return { ...prev, [targetExamId]: [...currentList, newStudent.id] };
        }
        return prev;
      });

      // Default marks status to not_completed
      setMarksStatus((prev) => ({
        ...prev,
        [`${targetExamId}_${newStudent.id}`]: 'not_completed',
      }));
    }

    addToast(`Student ${newStudent.name} added successfully!`, 'success');
    return newStudent;
  };

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            ...updates,
            name: updates.name ? updates.name.trim().toUpperCase() : s.name,
            fatherName: updates.fatherName ? updates.fatherName.trim().toUpperCase() : s.fatherName,
            motherName: updates.motherName ? updates.motherName.trim().toUpperCase() : s.motherName,
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
    let addedCount = 0;
    setExamStudents((prev) => {
      const existing = prev[targetExamId] || [];
      const newItems = studentIds.filter((id) => !existing.includes(id));
      addedCount = newItems.length;
      return { ...prev, [targetExamId]: [...existing, ...newItems] };
    });

    // Initialize marks status
    setMarksStatus((prev) => {
      const updated = { ...prev };
      studentIds.forEach((id) => {
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
      const student: Student = {
        ...item,
        id,
        name: item.name.trim().toUpperCase(),
        fatherName: item.fatherName.trim().toUpperCase(),
        motherName: item.motherName ? item.motherName.trim().toUpperCase() : undefined,
        registrationNo: item.registrationNo.trim() || generateNextRegNo(),
        active: true,
      };
      newRecords.push(student);
      newIds.push(id);
    });

    setStudents((prev) => [...prev, ...newRecords]);

    if (targetExamId && newIds.length > 0) {
      setExamStudents((prev) => {
        const existing = prev[targetExamId] || [];
        return { ...prev, [targetExamId]: [...existing, ...newIds] };
      });

      setMarksStatus((prev) => {
        const updated = { ...prev };
        newIds.forEach((id) => {
          updated[`${targetExamId}_${id}`] = 'not_completed';
        });
        return updated;
      });
    }

    addToast(`Successfully bulk imported ${newRecords.length} students!`, 'success');
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
      prev.forEach((m) => map.set(`${m.examId}_${m.studentId}_${m.subjectId}`, m));
      marksList.forEach((m) => map.set(`${m.examId}_${m.studentId}_${m.subjectId}`, m));
      return Array.from(map.values());
    });
    addToast('Marks updated successfully', 'success');
  };

  // Backup & Restore
  const exportBackup = () => {
    const backupData = {
      version: '4.0',
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
        schoolInfo,
        updateSchoolInfo,
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
        students,
        examStudents,
        marksStatus,
        getStudentsForExam,
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
