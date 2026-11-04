import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseAuth, udiseToSyntheticEmail } from '../firebase';
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
  ChecklistSnapshot,
} from '../types';

/**
 * Standard path helpers for school multi-tenant tree
 */
export const getSchoolDocRef = (db: Firestore, udise: string) => doc(db, 'schools', udise);
export const getMembersColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'members');
export const getClassesColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'classes');
export const getExamsColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'exams');
export const getSubjectsColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'subjects');
export const getStudentsColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'students');
export const getMarksColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'marks');
export const getRecycleColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'recycle');
export const getSnapshotsColRef = (db: Firestore, udise: string) => collection(db, 'schools', udise, 'snapshots');

export interface CloudSyncStatus {
  state: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  pendingCount: number;
  errorMessage?: string;
}

/**
 * Checks if the school has existing records in Cloud Firestore
 */
export async function checkSchoolCloudDataCount(udise: string): Promise<{
  exists: boolean;
  studentCount: number;
  examCount: number;
  classCount: number;
  marksDocCount: number;
}> {
  const db = getFirebaseDb();
  if (!db) {
    return { exists: false, studentCount: 0, examCount: 0, classCount: 0, marksDocCount: 0 };
  }

  try {
    const schoolSnap = await getDoc(getSchoolDocRef(db, udise));
    const [studentsSnap, examsSnap, classesSnap, marksSnap] = await Promise.all([
      getDocs(getStudentsColRef(db, udise)),
      getDocs(getExamsColRef(db, udise)),
      getDocs(getClassesColRef(db, udise)),
      getDocs(getMarksColRef(db, udise)),
    ]);

    const studentCount = studentsSnap.size;
    const examCount = examsSnap.size;
    const classCount = classesSnap.size;
    const marksDocCount = marksSnap.size;
    const exists = schoolSnap.exists() || studentCount > 0 || examCount > 0;

    return {
      exists,
      studentCount,
      examCount,
      classCount,
      marksDocCount,
    };
  } catch (err) {
    console.warn('Error checking school cloud data count:', err);
    return { exists: false, studentCount: 0, examCount: 0, classCount: 0, marksDocCount: 0 };
  }
}

/**
 * Subscribes to the school's root document (profile, WhatsApp contacts, settings)
 */
export function subscribeSchoolDoc(
  udise: string,
  onUpdate: (data: { schoolInfo?: Partial<SchoolInfo>; supportContact?: Partial<SupportContact>; resultSettings?: Partial<ResultSettings> }) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  const docRef = getSchoolDocRef(db, udise);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        onUpdate({
          schoolInfo: d.schoolInfo,
          supportContact: d.supportContact,
          resultSettings: d.resultSettings,
        });
      }
    },
    (err) => {
      console.warn(`Firestore school doc listener warning (${udise}):`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the school's students collection
 */
export function subscribeSchoolStudents(
  udise: string,
  onUpdate: (students: Student[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  return onSnapshot(
    getStudentsColRef(db, udise),
    (snap) => {
      const list: Student[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as Student;
        list.push({
          ...item,
          id: item.id || docSnap.id,
        });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn(`Firestore students listener warning (${udise}):`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the school's classes collection
 */
export function subscribeSchoolClasses(
  udise: string,
  onUpdate: (classes: ClassInfo[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  return onSnapshot(
    getClassesColRef(db, udise),
    (snap) => {
      if (snap.empty) return;
      const list: ClassInfo[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as ClassInfo;
        list.push({ ...item, id: item.id || docSnap.id });
      });
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn(`Firestore classes listener warning (${udise}):`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the school's exams collection
 */
export function subscribeSchoolExams(
  udise: string,
  onUpdate: (exams: ExamRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  return onSnapshot(
    getExamsColRef(db, udise),
    (snap) => {
      if (snap.empty) return;
      const list: ExamRecord[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as ExamRecord;
        list.push({ ...item, id: item.id || docSnap.id });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn(`Firestore exams listener warning (${udise}):`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the school's subjects collection
 */
export function subscribeSchoolSubjects(
  udise: string,
  onUpdate: (subjects: Subject[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  return onSnapshot(
    getSubjectsColRef(db, udise),
    (snap) => {
      if (snap.empty) return;
      const list: Subject[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as Subject;
        list.push({ ...item, id: item.id || docSnap.id });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn(`Firestore subjects listener warning (${udise}):`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the school's marks collection
 */
export function subscribeSchoolMarks(
  udise: string,
  onUpdate: (marksMap: Record<string, any>) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  return onSnapshot(
    getMarksColRef(db, udise),
    (snap) => {
      const records: Record<string, any> = {};
      snap.forEach((docSnap) => {
        records[docSnap.id] = docSnap.data();
      });
      onUpdate(records);
    },
    (err) => {
      console.warn(`Firestore marks listener warning (${udise}):`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the school's members collection (staff accounts)
 */
export function subscribeSchoolMembers(
  udise: string,
  onUpdate: (members: User[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  return onSnapshot(
    getMembersColRef(db, udise),
    (snap) => {
      if (snap.empty) return;
      const list: User[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data();
        list.push({
          id: docSnap.id,
          udiseCode: item.udiseCode || udise,
          name: item.name || '',
          role: item.role || 'teacher',
          passwordHash: '',
          salt: '',
          mustChangePassword: item.mustChangePassword || false,
          failedAttempts: 0,
          active: item.active !== false,
          institutionCode: item.institutionCode,
        });
      });
      onUpdate(list);
    },
    (err) => {
      console.warn(`Firestore members listener warning (${udise}):`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Updates School Profile or WhatsApp Contacts in Cloud Firestore
 */
export async function updateSchoolDocCloud(
  udise: string,
  updates: {
    schoolInfo?: Partial<SchoolInfo>;
    supportContact?: Partial<SupportContact>;
    resultSettings?: Partial<ResultSettings>;
  }
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const docRef = getSchoolDocRef(db, udise);
  await setDoc(
    docRef,
    {
      ...updates,
      udiseCode: udise,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Saves or updates a student document in Cloud Firestore
 */
export async function saveStudentCloud(udise: string, student: Student): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const docRef = doc(getStudentsColRef(db, udise), student.id);
  await setDoc(
    docRef,
    {
      ...student,
      udiseCode: udise,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Performs a safe soft delete of a student in Cloud Firestore
 */
export async function softDeleteStudentCloud(
  udise: string,
  student: Student,
  deletedBy: string,
  reason: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const batch = writeBatch(db);
  const studentRef = doc(getStudentsColRef(db, udise), student.id);
  const recycleRef = doc(getRecycleColRef(db, udise), student.id);

  const nowIso = new Date().toISOString();

  // 1. Mark student document as soft-deleted
  batch.update(studentRef, {
    deleted: true,
    deletedAt: nowIso,
    deletedBy,
    deleteReason: reason,
    updatedAt: serverTimestamp(),
  });

  // 2. Put record into recycle bin
  batch.set(recycleRef, {
    ...student,
    deleted: true,
    deletedAt: nowIso,
    deletedBy,
    deleteReason: reason,
    archivedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Restores a soft-deleted student in Cloud Firestore
 */
export async function restoreStudentCloud(udise: string, studentId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const batch = writeBatch(db);
  const studentRef = doc(getStudentsColRef(db, udise), studentId);
  const recycleRef = doc(getRecycleColRef(db, udise), studentId);

  batch.update(studentRef, {
    deleted: false,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    updatedAt: serverTimestamp(),
  });

  batch.delete(recycleRef);

  await batch.commit();
}

/**
 * Saves candidate marks for an examination to Cloud Firestore
 */
export async function saveMarksCloud(
  udise: string,
  examId: string,
  marksRecords: MarkRecord[]
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const examMarksRef = doc(getMarksColRef(db, udise), examId);

  // Group marks by studentId and subjectId
  const nestedMarks: Record<string, Record<string, any>> = {};
  marksRecords.forEach((m) => {
    if (m.examId !== examId) return;
    if (!nestedMarks[m.studentId]) {
      nestedMarks[m.studentId] = {};
    }
    nestedMarks[m.studentId][m.subjectId] = {
      obtained: m.obtained,
      absent: m.absent || false,
      grade: m.grade || '',
      component: m.component || 'descriptive',
      updatedAt: new Date().toISOString(),
    };
  });

  await setDoc(
    examMarksRef,
    {
      examId,
      udiseCode: udise,
      m: nestedMarks,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Uploads all local data from Computer A to Cloud Firestore
 * (First-Device Cloud Upload Wizard)
 */
export async function uploadAllLocalDataToCloud(
  udise: string,
  data: {
    schoolInfo: SchoolInfo;
    supportContact: SupportContact;
    classes: ClassInfo[];
    examTypes: any[];
    exams: ExamRecord[];
    subjects: Subject[];
    students: Student[];
    marks: MarkRecord[];
    resultSettings: ResultSettings;
  },
  onProgress?: (percent: number, stepLabel: string) => void
): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Cloud Firestore is not initialized' };

  try {
    if (onProgress) onProgress(10, 'Saving School Profile and Support Contacts...');

    // 1. Save root school document
    await setDoc(
      getSchoolDocRef(db, udise),
      {
        schoolInfo: data.schoolInfo,
        supportContact: data.supportContact,
        resultSettings: data.resultSettings,
        examTypes: data.examTypes,
        udiseCode: udise,
        syncedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (onProgress) onProgress(30, `Uploading ${data.classes.length} Classes and ${data.subjects.length} Subjects...`);

    // 2. Batch upload classes
    const classBatch = writeBatch(db);
    data.classes.forEach((cls) => {
      const ref = doc(getClassesColRef(db, udise), cls.id);
      classBatch.set(ref, cls, { merge: true });
    });
    // Batch upload subjects
    data.subjects.forEach((sub) => {
      const ref = doc(getSubjectsColRef(db, udise), sub.id);
      classBatch.set(ref, sub, { merge: true });
    });
    await classBatch.commit();

    if (onProgress) onProgress(50, `Uploading ${data.exams.length} Examination Records...`);

    // 3. Batch upload exams
    const examBatch = writeBatch(db);
    data.exams.forEach((ex) => {
      const ref = doc(getExamsColRef(db, udise), ex.id);
      examBatch.set(ref, ex, { merge: true });
    });
    await examBatch.commit();

    if (onProgress) onProgress(70, `Uploading ${data.students.length} Student Profiles...`);

    // 4. Batch upload students in chunks of 250
    const chunkSize = 250;
    for (let i = 0; i < data.students.length; i += chunkSize) {
      const chunk = data.students.slice(i, i + chunkSize);
      const studentBatch = writeBatch(db);
      chunk.forEach((st) => {
        const ref = doc(getStudentsColRef(db, udise), st.id);
        studentBatch.set(ref, { ...st, udiseCode: udise }, { merge: true });
      });
      await studentBatch.commit();
    }

    if (onProgress) onProgress(90, 'Uploading Marks Tabulations...');

    // 5. Upload marks grouped by exam
    const marksByExam: Record<string, MarkRecord[]> = {};
    data.marks.forEach((m) => {
      if (!marksByExam[m.examId]) marksByExam[m.examId] = [];
      marksByExam[m.examId].push(m);
    });

    for (const examId of Object.keys(marksByExam)) {
      await saveMarksCloud(udise, examId, marksByExam[examId]);
    }

    if (onProgress) onProgress(100, 'Cloud Synchronization Completed Successfully!');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to upload local data to Cloud Firestore:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Runs a live Cloud Self-Test writing and reading from a dedicated test path
 */
export async function runCloudSelfTest(udise: string): Promise<{
  success: boolean;
  latencyMs: number;
  projectId: string;
  authUid?: string;
  error?: string;
}> {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();

  if (!db) {
    return {
      success: false,
      latencyMs: 0,
      projectId: 'marks-entry-portal-512313',
      error: 'Firestore client not initialized',
    };
  }

  const start = performance.now();
  const uid = auth?.currentUser?.uid || 'anonymous_tester';

  try {
    const testDocRef = doc(db, 'schools', udise, '_selftest', uid);
    await setDoc(testDocRef, {
      testTimestamp: serverTimestamp(),
      iso: new Date().toISOString(),
      clientUser: uid,
    });

    const readSnap = await getDoc(testDocRef);
    const latencyMs = Math.round(performance.now() - start);

    if (readSnap.exists()) {
      return {
        success: true,
        latencyMs,
        projectId: 'marks-entry-portal-512313',
        authUid: uid,
      };
    } else {
      return {
        success: false,
        latencyMs,
        projectId: 'marks-entry-portal-512313',
        error: 'Test document was written but could not be read back.',
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      projectId: 'marks-entry-portal-512313',
      authUid: uid,
      error: err?.message || String(err),
    };
  }
}
