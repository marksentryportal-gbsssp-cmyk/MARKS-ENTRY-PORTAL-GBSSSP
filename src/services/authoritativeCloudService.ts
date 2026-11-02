import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  Firestore,
  Unsubscribe,
  query,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseAuth } from '../lib/firebase';
import {
  Student,
  ExamRecord,
  Subject,
  MarkRecord,
  ClassInfo,
  ResultSettings,
  SchoolInfo,
  SupportContact,
  User,
} from '../types';
import { initialStudents } from '../data/seedStudents';
import { sortByRollNo } from '../utils/rollNoUtils';

export interface CloudRecordVerification {
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  totalExaminations: number;
  totalMarksRecords: number;
  totalAcademicSessions: string[];
  schoolTreeStudents: number;
  rootStudents: number;
  schoolTreeExams: number;
  rootExams: number;
  schoolTreeMarks: number;
  rootMarks: number;
  sourceOfTruth: string;
  projectId: string;
  verifiedAt: string;
}

/**
 * Known demo student IDs to prevent accidental overwrite of real Firestore records
 */
const DEMO_STUDENT_IDS = new Set(initialStudents.map((s) => s.id));
const DEMO_REG_NOS = new Set(initialStudents.map((s) => s.registrationNo).filter(Boolean));

/**
 * Checks if a student is part of the hardcoded sample/demo dataset
 */
export function isDemoStudent(student: Partial<Student>): boolean {
  if (!student) return false;
  if (student.id && DEMO_STUDENT_IDS.has(student.id)) return true;
  if (student.registrationNo && DEMO_REG_NOS.has(student.registrationNo)) return true;
  return false;
}

/**
 * Checks if a dataset consists entirely of the 48 demo students
 */
export function isDemoStudentDataset(students: Student[]): boolean {
  if (!students || students.length === 0) return false;
  if (students.length === 48 && students.every((s) => isDemoStudent(s))) {
    return true;
  }
  return false;
}

/**
 * Counts and verifies all records in Cloud Firestore across both hierarchical and root paths
 */
export async function verifyFirestoreCloudRecords(udise: string): Promise<CloudRecordVerification> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Cloud Firestore is not initialized');
  }

  // 1. Query hierarchical path: schools/{udise}/...
  const [
    schoolStudentsSnap,
    schoolExamsSnap,
    schoolClassesSnap,
    schoolSubjectsSnap,
    schoolMarksSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'schools', udise, 'students')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'schools', udise, 'exams')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'schools', udise, 'classes')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'schools', udise, 'subjects')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'schools', udise, 'marks')).catch(() => ({ size: 0, docs: [] } as any)),
  ]);

  // 2. Query legacy root collections: /students, /examinations, etc.
  const [
    rootStudentsSnap,
    rootExamsSnap,
    rootClassesSnap,
    rootSubjectsSnap,
    rootMarksSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'students')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'examinations')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'classes')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'subjects')).catch(() => ({ size: 0, docs: [] } as any)),
    getDocs(collection(db, 'marks')).catch(() => ({ size: 0, docs: [] } as any)),
  ]);

  // Deduplicate students by ID
  const studentIds = new Set<string>();
  schoolStudentsSnap.docs?.forEach((d: any) => studentIds.add(d.id));
  rootStudentsSnap.docs?.forEach((d: any) => studentIds.add(d.id));

  // Deduplicate exams by ID
  const examIds = new Set<string>();
  const academicSessions = new Set<string>();
  schoolExamsSnap.docs?.forEach((d: any) => {
    examIds.add(d.id);
    const data = d.data();
    if (data?.academicYear) academicSessions.add(data.academicYear);
  });
  rootExamsSnap.docs?.forEach((d: any) => {
    examIds.add(d.id);
    const data = d.data();
    if (data?.academicYear) academicSessions.add(data.academicYear);
  });

  // Deduplicate classes by ID
  const classIds = new Set<string>();
  schoolClassesSnap.docs?.forEach((d: any) => classIds.add(d.id));
  rootClassesSnap.docs?.forEach((d: any) => classIds.add(d.id));

  // Deduplicate subjects by ID
  const subjectIds = new Set<string>();
  schoolSubjectsSnap.docs?.forEach((d: any) => subjectIds.add(d.id));
  rootSubjectsSnap.docs?.forEach((d: any) => subjectIds.add(d.id));

  // Count marks entries
  let marksCount = rootMarksSnap.size || 0;
  schoolMarksSnap.docs?.forEach((d: any) => {
    const data = d.data();
    if (data && data.m) {
      Object.keys(data.m).forEach((sId) => {
        marksCount += Object.keys(data.m[sId] || {}).length;
      });
    }
  });

  if (academicSessions.size === 0) {
    academicSessions.add('2026-2027');
    academicSessions.add('2025-2026');
  }

  return {
    totalStudents: studentIds.size,
    totalClasses: classIds.size || Math.max(schoolClassesSnap.size, rootClassesSnap.size),
    totalSubjects: subjectIds.size || Math.max(schoolSubjectsSnap.size, rootSubjectsSnap.size),
    totalExaminations: examIds.size || Math.max(schoolExamsSnap.size, rootExamsSnap.size),
    totalMarksRecords: marksCount,
    totalAcademicSessions: Array.from(academicSessions),
    schoolTreeStudents: schoolStudentsSnap.size || 0,
    rootStudents: rootStudentsSnap.size || 0,
    schoolTreeExams: schoolExamsSnap.size || 0,
    rootExams: rootExamsSnap.size || 0,
    schoolTreeMarks: schoolMarksSnap.size || 0,
    rootMarks: rootMarksSnap.size || 0,
    sourceOfTruth: 'Cloud Firestore (gbsss-marks-entry-portal)',
    projectId: 'gbsss-marks-entry-portal',
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Authoritative loader that fetches all school records from Cloud Firestore.
 * Seamlessly unions documents from schools/{udise}/... and root collections with deduplication.
 */
export async function loadAuthoritativeCloudData(udise: string): Promise<{
  success: boolean;
  hasData: boolean;
  students: Student[];
  exams: ExamRecord[];
  classes: ClassInfo[];
  subjects: Subject[];
  marks: MarkRecord[];
  schoolInfo?: Partial<SchoolInfo>;
  supportContact?: Partial<SupportContact>;
  resultSettings?: Partial<ResultSettings>;
  error?: string;
}> {
  const db = getFirebaseDb();
  if (!db) {
    return {
      success: false,
      hasData: false,
      students: [],
      exams: [],
      classes: [],
      subjects: [],
      marks: [],
      error: 'Firestore client not initialized',
    };
  }

  try {
    // 1. Fetch Students from both schools/{udise}/students and root /students
    const [schoolStudentsSnap, rootStudentsSnap] = await Promise.all([
      getDocs(collection(db, 'schools', udise, 'students')).catch((e) => {
        console.warn('Error reading schools/{udise}/students:', e);
        return { docs: [] } as any;
      }),
      getDocs(collection(db, 'students')).catch((e) => {
        console.warn('Error reading root students:', e);
        return { docs: [] } as any;
      }),
    ]);

    const studentMap = new Map<string, Student>();

    // Load root students first
    rootStudentsSnap.docs?.forEach((docSnap: any) => {
      const data = docSnap.data() as Student;
      const st: Student = {
        ...data,
        id: data.id || docSnap.id,
        name: (data.studentName || data.name || '').trim().toUpperCase(),
        studentName: (data.studentName || data.name || '').trim().toUpperCase(),
      };
      studentMap.set(st.id, st);
    });

    // Override / augment with schools/{udise}/students
    schoolStudentsSnap.docs?.forEach((docSnap: any) => {
      const data = docSnap.data() as Student;
      const st: Student = {
        ...data,
        id: data.id || docSnap.id,
        name: (data.studentName || data.name || '').trim().toUpperCase(),
        studentName: (data.studentName || data.name || '').trim().toUpperCase(),
      };
      studentMap.set(st.id, st);
    });

    const studentsList = Array.from(studentMap.values());

    // 2. Fetch Examinations
    const [schoolExamsSnap, rootExamsSnap] = await Promise.all([
      getDocs(collection(db, 'schools', udise, 'exams')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'examinations')).catch(() => ({ docs: [] } as any)),
    ]);

    const examMap = new Map<string, ExamRecord>();
    rootExamsSnap.docs?.forEach((d: any) => {
      const ex = d.data() as ExamRecord;
      examMap.set(ex.id || d.id, { ...ex, id: ex.id || d.id });
    });
    schoolExamsSnap.docs?.forEach((d: any) => {
      const ex = d.data() as ExamRecord;
      examMap.set(ex.id || d.id, { ...ex, id: ex.id || d.id });
    });
    const examsList = Array.from(examMap.values());

    // 3. Fetch Classes
    const [schoolClassesSnap, rootClassesSnap] = await Promise.all([
      getDocs(collection(db, 'schools', udise, 'classes')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'classes')).catch(() => ({ docs: [] } as any)),
    ]);

    const classMap = new Map<string, ClassInfo>();
    rootClassesSnap.docs?.forEach((d: any) => {
      const cl = d.data() as ClassInfo;
      classMap.set(cl.id || d.id, { ...cl, id: cl.id || d.id });
    });
    schoolClassesSnap.docs?.forEach((d: any) => {
      const cl = d.data() as ClassInfo;
      classMap.set(cl.id || d.id, { ...cl, id: cl.id || d.id });
    });
    const classesList = Array.from(classMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));

    // 4. Fetch Subjects
    const [schoolSubjectsSnap, rootSubjectsSnap] = await Promise.all([
      getDocs(collection(db, 'schools', udise, 'subjects')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'subjects')).catch(() => ({ docs: [] } as any)),
    ]);

    const subMap = new Map<string, Subject>();
    rootSubjectsSnap.docs?.forEach((d: any) => {
      const su = d.data() as Subject;
      subMap.set(su.id || d.id, { ...su, id: su.id || d.id });
    });
    schoolSubjectsSnap.docs?.forEach((d: any) => {
      const su = d.data() as Subject;
      subMap.set(su.id || d.id, { ...su, id: su.id || d.id });
    });
    const subjectsList = Array.from(subMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));

    // 5. Fetch Marks
    const [schoolMarksSnap, rootMarksSnap] = await Promise.all([
      getDocs(collection(db, 'schools', udise, 'marks')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'marks')).catch(() => ({ docs: [] } as any)),
    ]);

    const marksMap = new Map<string, MarkRecord>();

    // Root marks documents
    rootMarksSnap.docs?.forEach((d: any) => {
      const data = d.data();
      if (data.examId && data.studentId && data.subjectId) {
        const key = `${data.examId}_${data.studentId}_${data.subjectId}_${data.component || 'descriptive'}`;
        marksMap.set(key, {
          examId: data.examId,
          studentId: data.studentId,
          subjectId: data.subjectId,
          obtained: data.obtained !== undefined ? data.obtained : (data.marks ?? null),
          absent: Boolean(data.absent ?? data.isAbsent),
          grade: data.grade,
          component: data.component || 'descriptive',
        });
      }
    });

    // Hierarchical marks documents (grouped by exam m.<studentId>.<subjectId>)
    schoolMarksSnap.docs?.forEach((d: any) => {
      const data = d.data();
      const examId = d.id;
      if (data && data.m) {
        Object.keys(data.m).forEach((sId) => {
          Object.keys(data.m[sId] || {}).forEach((subId) => {
            const entry = data.m[sId][subId];
            const key = `${examId}_${sId}_${subId}_${entry.component || 'descriptive'}`;
            marksMap.set(key, {
              examId,
              studentId: sId,
              subjectId: subId,
              obtained: entry.obtained !== undefined ? entry.obtained : (entry.marks ?? null),
              absent: Boolean(entry.absent ?? entry.isAbsent),
              grade: entry.grade,
              component: entry.component || 'descriptive',
            });
          });
        });
      }
    });

    const marksList = Array.from(marksMap.values());

    // 6. Fetch School Settings & Support Contacts
    const [schoolDocSnap, settingsInfoSnap, settingsResultSnap] = await Promise.all([
      getDoc(doc(db, 'schools', udise)).catch(() => ({ exists: () => false, data: () => ({}) } as any)),
      getDoc(doc(db, 'settings', 'school_info')).catch(() => ({ exists: () => false, data: () => ({}) } as any)),
      getDoc(doc(db, 'settings', 'result_settings')).catch(() => ({ exists: () => false, data: () => ({}) } as any)),
    ]);

    let schoolInfoData: Partial<SchoolInfo> | undefined;
    let supportContactData: Partial<SupportContact> | undefined;
    let resultSettingsData: Partial<ResultSettings> | undefined;

    if (schoolDocSnap.exists()) {
      const d = schoolDocSnap.data();
      schoolInfoData = d.schoolInfo;
      supportContactData = d.supportContact;
      resultSettingsData = d.resultSettings;
    }

    if (settingsInfoSnap.exists()) {
      const d = settingsInfoSnap.data();
      schoolInfoData = { ...d, ...schoolInfoData };
    }

    if (settingsResultSnap.exists()) {
      const d = settingsResultSnap.data();
      resultSettingsData = { ...d, ...resultSettingsData };
    }

    const hasData = studentsList.length > 0 || examsList.length > 0;

    return {
      success: true,
      hasData,
      students: studentsList,
      exams: examsList,
      classes: classesList,
      subjects: subjectsList,
      marks: marksList,
      schoolInfo: schoolInfoData,
      supportContact: supportContactData,
      resultSettings: resultSettingsData,
    };
  } catch (err: any) {
    console.error('loadAuthoritativeCloudData failed:', err);
    return {
      success: false,
      hasData: false,
      students: [],
      exams: [],
      classes: [],
      subjects: [],
      marks: [],
      error: err?.message || String(err),
    };
  }
}

/**
 * Performs a dual-write sync to ensure Cloud Firestore remains 100% authoritative and consistent
 * Writes with stable IDs to both schools/{udise}/... and root collections
 */
export async function syncRecordToFirestoreAuthoritative(
  udise: string,
  type: 'student' | 'mark' | 'exam' | 'class' | 'subject' | 'schoolDoc',
  payload: any
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    if (type === 'student') {
      const st = payload as Student;
      // 1. Hierarchical
      await setDoc(doc(db, 'schools', udise, 'students', st.id), { ...st, udiseCode: udise, updatedAt: serverTimestamp() }, { merge: true });
      // 2. Root collection
      await setDoc(doc(db, 'students', st.id), { ...st, udiseCode: udise, updatedAt: serverTimestamp() }, { merge: true });
    } else if (type === 'mark') {
      const mk = payload as { examId: string; marks: MarkRecord[] };
      // 1. Hierarchical marks document
      const examMarksRef = doc(db, 'schools', udise, 'marks', mk.examId);
      const nested: Record<string, any> = {};
      mk.marks.forEach((m) => {
        if (!nested[m.studentId]) nested[m.studentId] = {};
        nested[m.studentId][m.subjectId] = {
          obtained: m.obtained,
          absent: m.absent || false,
          grade: m.grade || '',
          component: m.component || 'descriptive',
          updatedAt: new Date().toISOString(),
        };
      });
      await setDoc(examMarksRef, { examId: mk.examId, udiseCode: udise, m: nested, updatedAt: serverTimestamp() }, { merge: true });

      // 2. Batch write to root marks collection
      const batch = writeBatch(db);
      mk.marks.forEach((m) => {
        const docId = `${m.examId}_${m.studentId}_${m.subjectId}_${m.component || 'descriptive'}`;
        const ref = doc(db, 'marks', docId);
        batch.set(ref, { ...m, id: docId, udiseCode: udise, updatedAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit();
    } else if (type === 'exam') {
      const ex = payload as ExamRecord;
      await setDoc(doc(db, 'schools', udise, 'exams', ex.id), { ...ex, udiseCode: udise, updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'examinations', ex.id), { ...ex, udiseCode: udise, updatedAt: serverTimestamp() }, { merge: true });
    } else if (type === 'schoolDoc') {
      await setDoc(doc(db, 'schools', udise), { ...payload, udiseCode: udise, updatedAt: serverTimestamp() }, { merge: true });
      if (payload.schoolInfo) {
        await setDoc(doc(db, 'settings', 'school_info'), { ...payload.schoolInfo, updatedAt: serverTimestamp() }, { merge: true });
      }
      if (payload.resultSettings) {
        await setDoc(doc(db, 'settings', 'result_settings'), { ...payload.resultSettings, updatedAt: serverTimestamp() }, { merge: true });
      }
    }
  } catch (err) {
    console.warn(`Dual-write sync warning for ${type}:`, err);
  }
}

/**
 * Real-time listener for Students across both paths: schools/{udise}/students and /students
 */
export function subscribeAuthoritativeStudents(
  udise: string,
  onUpdate: (students: Student[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const schoolMap = new Map<string, Student>();
  const rootMap = new Map<string, Student>();

  const emit = () => {
    const combined = new Map<string, Student>();
    rootMap.forEach((val, key) => combined.set(key, val));
    schoolMap.forEach((val, key) => combined.set(key, val));
    const list = Array.from(combined.values());
    if (list.length > 0) {
      onUpdate(list);
    }
  };

  const unsubSchool = onSnapshot(
    collection(db, 'schools', udise, 'students'),
    (snap) => {
      schoolMap.clear();
      snap.forEach((d) => {
        const item = d.data() as Student;
        schoolMap.set(d.id, {
          ...item,
          id: item.id || d.id,
          name: (item.studentName || item.name || '').trim().toUpperCase(),
          studentName: (item.studentName || item.name || '').trim().toUpperCase(),
        });
      });
      emit();
    },
    (err) => {
      console.warn('subscribeAuthoritativeStudents (school) warning:', err);
      if (onError) onError(err);
    }
  );

  const unsubRoot = onSnapshot(
    collection(db, 'students'),
    (snap) => {
      rootMap.clear();
      snap.forEach((d) => {
        const item = d.data() as Student;
        rootMap.set(d.id, {
          ...item,
          id: item.id || d.id,
          name: (item.studentName || item.name || '').trim().toUpperCase(),
          studentName: (item.studentName || item.name || '').trim().toUpperCase(),
        });
      });
      emit();
    },
    (err) => {
      console.warn('subscribeAuthoritativeStudents (root) warning:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubSchool();
    unsubRoot();
  };
}

/**
 * Real-time listener for Examinations across both paths: schools/{udise}/exams and /examinations
 */
export function subscribeAuthoritativeExams(
  udise: string,
  onUpdate: (exams: ExamRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const schoolMap = new Map<string, ExamRecord>();
  const rootMap = new Map<string, ExamRecord>();

  const emit = () => {
    const combined = new Map<string, ExamRecord>();
    rootMap.forEach((val, key) => combined.set(key, val));
    schoolMap.forEach((val, key) => combined.set(key, val));
    const list = Array.from(combined.values());
    if (list.length > 0) {
      onUpdate(list);
    }
  };

  const unsubSchool = onSnapshot(
    collection(db, 'schools', udise, 'exams'),
    (snap) => {
      schoolMap.clear();
      snap.forEach((d) => {
        const item = d.data() as ExamRecord;
        schoolMap.set(d.id, { ...item, id: item.id || d.id });
      });
      emit();
    },
    (err) => {
      console.warn('subscribeAuthoritativeExams (school) warning:', err);
      if (onError) onError(err);
    }
  );

  const unsubRoot = onSnapshot(
    collection(db, 'examinations'),
    (snap) => {
      rootMap.clear();
      snap.forEach((d) => {
        const item = d.data() as ExamRecord;
        rootMap.set(d.id, { ...item, id: item.id || d.id });
      });
      emit();
    },
    (err) => {
      console.warn('subscribeAuthoritativeExams (root) warning:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubSchool();
    unsubRoot();
  };
}

/**
 * Real-time listener for Marks across both paths
 */
export function subscribeAuthoritativeMarks(
  udise: string,
  onUpdate: (marks: MarkRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const marksMap = new Map<string, MarkRecord>();

  const emit = () => {
    const list = Array.from(marksMap.values());
    if (list.length > 0) {
      onUpdate(list);
    }
  };

  const unsubSchool = onSnapshot(
    collection(db, 'schools', udise, 'marks'),
    (snap) => {
      snap.forEach((d) => {
        const data = d.data();
        const examId = d.id;
        if (data && data.m) {
          Object.keys(data.m).forEach((sId) => {
            Object.keys(data.m[sId] || {}).forEach((subId) => {
              const entry = data.m[sId][subId];
              const key = `${examId}_${sId}_${subId}_${entry.component || 'descriptive'}`;
              marksMap.set(key, {
                examId,
                studentId: sId,
                subjectId: subId,
                obtained: entry.obtained !== undefined ? entry.obtained : (entry.marks ?? null),
                absent: Boolean(entry.absent ?? entry.isAbsent),
                grade: entry.grade,
                component: entry.component || 'descriptive',
              });
            });
          });
        }
      });
      emit();
    },
    (err) => {
      console.warn('subscribeAuthoritativeMarks (school) warning:', err);
      if (onError) onError(err);
    }
  );

  const unsubRoot = onSnapshot(
    collection(db, 'marks'),
    (snap) => {
      snap.forEach((d) => {
        const data = d.data();
        if (data.examId && data.studentId && data.subjectId) {
          const key = `${data.examId}_${data.studentId}_${data.subjectId}_${data.component || 'descriptive'}`;
          marksMap.set(key, {
            examId: data.examId,
            studentId: data.studentId,
            subjectId: data.subjectId,
            obtained: data.obtained !== undefined ? data.obtained : (data.marks ?? null),
            absent: Boolean(data.absent ?? data.isAbsent),
            grade: data.grade,
            component: data.component || 'descriptive',
          });
        }
      });
      emit();
    },
    (err) => {
      console.warn('subscribeAuthoritativeMarks (root) warning:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubSchool();
    unsubRoot();
  };
}
