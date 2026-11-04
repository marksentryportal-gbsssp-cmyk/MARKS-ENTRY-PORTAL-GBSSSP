import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb, udiseToSyntheticEmail } from './firebase';
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'viewer';
  name?: string;
  active: boolean;
  udiseCode?: string;
  createdAt?: any;
  lastLoginAt?: any;
}

/**
 * Signs in via Firebase Email & Password and fetches user document
 */
export async function firebaseSignIn(
  emailOrUdise: string,
  password: string
): Promise<{ success: boolean; user?: FirestoreUserProfile; firebaseUid?: string; error?: string }> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    return {
      success: false,
      error: 'Firebase is not initialized yet. Please configure your Firebase Web App credentials.',
    };
  }

  // Resolve email address (e.g. if user entered school email or UDISE code)
  let email = emailOrUdise.trim();
  if (!email.includes('@')) {
    // If standard 11-digit UDISE code was entered, map to registered admin email
    if (email === '18020200403') {
      email = 'gopinathschool2024@gmail.com';
    } else {
      email = udiseToSyntheticEmail(email);
    }
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // Fetch user profile from Firestore: users/{uid}
    const userDocRef = doc(db, 'users', uid);
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }

    if (!userSnap.exists()) {
      if (cred.user.email === 'gopinathschool2024@gmail.com') {
        const superAdminProfile: FirestoreUserProfile = {
          uid,
          email: 'gopinathschool2024@gmail.com',
          role: 'super_admin',
          name: 'Super Administrator',
          active: true,
          udiseCode: '18020200403',
        };
        await setDoc(userDocRef, { ...superAdminProfile, createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() }, { merge: true });
        await setDoc(doc(db, 'schools', '18020200403', 'members', uid), { ...superAdminProfile, createdAt: serverTimestamp() }, { merge: true });
        return {
          success: true,
          user: superAdminProfile,
          firebaseUid: uid,
        };
      }

      return {
        success: false,
        error: `Authorized user record not found in Firestore for UID ${uid}. Please ensure users/{uid} document is created.`,
      };
    }

    const userData = userSnap.data() as FirestoreUserProfile;

    // Check active status in accordance with Super Admin rules
    if (userData.active === false) {
      await signOut(auth);
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact the Super Administrator.',
      };
    }

    // Update lastLoginAt
    try {
      await updateDoc(userDocRef, { lastLoginAt: serverTimestamp() });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      user: { ...userData, uid },
      firebaseUid: uid,
    };
  } catch (err: any) {
    console.error('Firebase Auth Error:', err);
    let message = err?.message || 'Authentication failed';
    if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
      message = 'Invalid email/UDISE code or password. Please check your credentials.';
    } else if (err?.code === 'auth/too-many-requests') {
      message = 'Too many failed login attempts. Please try again in a few minutes.';
    }
    return { success: false, error: message };
  }
}

/**
 * Signs out from Firebase Auth
 */
export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase sign out error:', err);
    }
  }
}

/**
 * Securely provisions the initial Super Admin account using Firebase Authentication.
 * If the account does not exist in Firebase Auth, creates it with the user-provided password.
 * Links the Firestore user profile in users/{uid} with role 'super_admin'.
 * Never stores plain passwords in Firestore or source code.
 */
export async function provisionInitialSuperAdmin(
  password: string
): Promise<{ success: boolean; user?: FirestoreUserProfile; firebaseUid?: string; error?: string; alreadyExists?: boolean }> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    return {
      success: false,
      error: 'Firebase is not initialized. Please verify configuration.',
    };
  }

  const superAdminEmail = 'gopinathschool2024@gmail.com';
  const udise = '18020200403';

  try {
    let uid: string;

    try {
      // 1. Attempt to create user with email & password in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, superAdminEmail, password);
      uid = cred.user.uid;
    } catch (createErr: any) {
      if (createErr?.code === 'auth/email-already-in-use') {
        // The account already exists in Firebase Auth! Attempt sign-in with the provided password
        try {
          const signInCred = await signInWithEmailAndPassword(auth, superAdminEmail, password);
          uid = signInCred.user.uid;
        } catch (signInErr: any) {
          return {
            success: false,
            alreadyExists: true,
            error: 'Super Admin account already exists in Firebase Authentication. If you forgot the password, please use Forgot Password or the reset link.',
          };
        }
      } else {
        throw createErr;
      }
    }

    // 2. Provision or update profile in Firestore: users/{uid}
    const superAdminProfile: FirestoreUserProfile = {
      uid,
      email: superAdminEmail,
      role: 'super_admin',
      name: 'Super Administrator',
      active: true,
      udiseCode: udise,
    };

    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      {
        ...superAdminProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Also link under schools/{udise}/members/{uid}
    const memberDocRef = doc(db, 'schools', udise, 'members', uid);
    await setDoc(
      memberDocRef,
      {
        ...superAdminProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      user: superAdminProfile,
      firebaseUid: uid,
    };
  } catch (err: any) {
    console.error('provisionInitialSuperAdmin error:', err);
    let message = err?.message || 'Provisioning failed';
    if (err?.code === 'auth/weak-password') {
      message = 'Password is too weak. Please use at least 8 characters with letters and numbers.';
    }
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Sends a password reset email directly to the Super Admin email via Firebase Auth
 */
export async function sendSuperAdminPasswordReset(): Promise<{ success: boolean; message: string; error?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, message: 'Firebase Auth is not initialized', error: 'No Auth instance' };
  }
  try {
    await sendPasswordResetEmail(auth, 'gopinathschool2024@gmail.com');
    return {
      success: true,
      message: 'Password reset link sent to gopinathschool2024@gmail.com. Please check your inbox or spam folder.',
    };
  } catch (err: any) {
    console.error('sendSuperAdminPasswordReset error:', err);
    return {
      success: false,
      message: err?.message || 'Could not send reset email',
      error: err?.message,
    };
  }
}

/**
 * Links an existing Firebase Authentication UID directly to the Super Admin profile in Firestore
 * under users/{uid} and schools/18020200403/members/{uid}.
 * Does not overwrite existing user documents if they already have super_admin set.
 * Sets role to 'super_admin', status to 'active', and grants full administrative permissions.
 * Never stores plain passwords in Firestore or code.
 */
export async function linkExistingSuperAdminUid(
  targetUid: string
): Promise<{ success: boolean; user?: FirestoreUserProfile; error?: string; alreadyLinked?: boolean }> {
  const db = getFirebaseDb();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not initialized' };
  }

  const cleanUid = targetUid.trim();
  if (!cleanUid) {
    return { success: false, error: 'Please enter a valid Firebase Authentication UID' };
  }

  const superAdminEmail = 'gopinathschool2024@gmail.com';
  const udise = '18020200403';

  try {
    const userDocRef = doc(db, 'users', cleanUid);
    const existingSnap = await getDoc(userDocRef);

    const superAdminProfile: FirestoreUserProfile = {
      uid: cleanUid,
      email: superAdminEmail,
      role: 'super_admin',
      name: 'Super Administrator',
      active: true,
      udiseCode: udise,
    };

    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as FirestoreUserProfile;
      if (existingData.role === 'super_admin' && existingData.active === true) {
        return {
          success: true,
          alreadyLinked: true,
          user: { ...existingData, uid: cleanUid },
        };
      }
      // Update existing document to super_admin without destroying other existing fields
      await updateDoc(userDocRef, {
        role: 'super_admin',
        active: true,
        email: superAdminEmail,
        udiseCode: udise,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new profile linked to this UID
      await setDoc(
        userDocRef,
        {
          ...superAdminProfile,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Also link under schools/{udise}/members/{cleanUid}
    const memberDocRef = doc(db, 'schools', udise, 'members', cleanUid);
    await setDoc(
      memberDocRef,
      {
        ...superAdminProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      user: superAdminProfile,
    };
  } catch (err: any) {
    console.error('linkExistingSuperAdminUid error:', err);
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Safe Data Migration: Reads localStorage data and writes to Cloud Firestore in batches
 */
export async function migrateLocalDataToFirestore(
  onProgress?: (progress: { current: number; total: number; stage: string }) => void
): Promise<{ success: boolean; migratedCounts: Record<string, number>; error?: string }> {
  const db = getFirebaseDb();
  if (!db) {
    return { success: false, migratedCounts: {}, error: 'Firestore is not connected.' };
  }

  try {
    const rawData = localStorage.getItem('gopinath_school_portal_data_v5');
    if (!rawData) {
      return { success: false, migratedCounts: {}, error: 'No existing local portal data found to migrate.' };
    }

    const parsed = JSON.parse(rawData);
    const counts: Record<string, number> = {
      classes: 0,
      students: 0,
      exams: 0,
      subjects: 0,
      marks: 0,
      checklists: 0,
    };

    const totalSteps =
      (parsed.classes?.length || 0) +
      (parsed.students?.length || 0) +
      (parsed.exams?.length || 0) +
      (parsed.subjects?.length || 0) +
      (parsed.marks?.length || 0) +
      2; // schoolInfo + resultSettings

    let currentStep = 0;

    // Helper for batch writes (Firestore limit: 500 ops per batch)
    let batch = writeBatch(db);
    let opCount = 0;

    const commitBatchIfNeeded = async () => {
      if (opCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    // 1. School Info
    if (parsed.schoolInfo) {
      onProgress?.({ current: ++currentStep, total: totalSteps, stage: 'Migrating School Information...' });
      const ref = doc(db, 'settings', 'school_info');
      batch.set(ref, { ...parsed.schoolInfo, updatedAt: serverTimestamp() }, { merge: true });
      opCount++;
    }

    // 2. Result Settings
    if (parsed.resultSettings) {
      onProgress?.({ current: ++currentStep, total: totalSteps, stage: 'Migrating Result & Grading Policies...' });
      const ref = doc(db, 'settings', 'result_settings');
      batch.set(ref, { ...parsed.resultSettings, updatedAt: serverTimestamp() }, { merge: true });
      opCount++;
    }

    // 3. Classes
    if (Array.isArray(parsed.classes)) {
      for (const cls of parsed.classes) {
        onProgress?.({ current: ++currentStep, total: totalSteps, stage: `Migrating Class ${cls.name}...` });
        const ref = doc(db, 'classes', cls.id);
        batch.set(ref, { ...cls, updatedAt: serverTimestamp() }, { merge: true });
        counts.classes++;
        opCount++;
        await commitBatchIfNeeded();
      }
    }

    // 4. Subjects
    if (Array.isArray(parsed.subjects)) {
      for (const sub of parsed.subjects) {
        onProgress?.({ current: ++currentStep, total: totalSteps, stage: `Migrating Subject ${sub.name}...` });
        const ref = doc(db, 'subjects', sub.id);
        batch.set(ref, { ...sub, updatedAt: serverTimestamp() }, { merge: true });
        counts.subjects++;
        opCount++;
        await commitBatchIfNeeded();
      }
    }

    // 5. Examinations
    if (Array.isArray(parsed.exams)) {
      for (const ex of parsed.exams) {
        onProgress?.({ current: ++currentStep, total: totalSteps, stage: `Migrating Exam ${ex.name}...` });
        const ref = doc(db, 'examinations', ex.id);
        batch.set(ref, { ...ex, updatedAt: serverTimestamp() }, { merge: true });
        counts.exams++;
        opCount++;
        await commitBatchIfNeeded();
      }
    }

    // 6. Students
    if (Array.isArray(parsed.students)) {
      for (const st of parsed.students) {
        onProgress?.({ current: ++currentStep, total: totalSteps, stage: `Migrating Student ${st.name}...` });
        const ref = doc(db, 'students', st.id);
        batch.set(ref, { ...st, updatedAt: serverTimestamp() }, { merge: true });
        counts.students++;
        opCount++;
        await commitBatchIfNeeded();
      }
    }

    // 7. Marks
    if (Array.isArray(parsed.marks)) {
      for (const mk of parsed.marks) {
        onProgress?.({ current: ++currentStep, total: totalSteps, stage: 'Migrating Candidate Marks...' });
        const markDocId = `${mk.examId}_${mk.studentId}_${mk.subjectId}_${mk.component || 'main'}`;
        const ref = doc(db, 'marks', markDocId);
        batch.set(ref, { ...mk, id: markDocId, updatedAt: serverTimestamp() }, { merge: true });
        counts.marks++;
        opCount++;
        await commitBatchIfNeeded();
      }
    }

    // Commit any remaining writes
    if (opCount > 0) {
      await batch.commit();
    }

    // Record migration success flag
    localStorage.setItem('gopinath_firebase_migration_completed_at', new Date().toISOString());

    return {
      success: true,
      migratedCounts: counts,
    };
  } catch (err: any) {
    console.error('Migration to Firestore failed:', err);
    return {
      success: false,
      migratedCounts: {},
      error: err?.message || String(err),
    };
  }
}

/**
 * Saves or updates a student in Cloud Firestore
 */
export async function saveStudentToFirestore(student: Student): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const path = `students/${student.id}`;
  try {
    const studentRef = doc(db, 'students', student.id);
    await setDoc(studentRef, { ...student, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Soft deletes a student in Cloud Firestore with audit metadata
 * Preserves all historical marks, examinations, and results
 */
export async function softDeleteStudentInFirestore(
  studentId: string,
  deletedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected. Please verify Firebase connection.' };
  }
  const path = `students/${studentId}`;
  try {
    const studentRef = doc(db, 'students', studentId);
    const now = new Date().toISOString();
    await setDoc(
      studentRef,
      {
        deleted: true,
        deletedAt: now,
        deletedBy: deletedBy || 'Super Admin',
        deleteReason: reason || 'Soft deleted via Portal',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error('Firestore soft delete failed:', error);
    const errMessage = error?.message || 'Failed to update student deletion in Firestore';
    return { success: false, error: errMessage };
  }
}

/**
 * Restores a soft-deleted student in Cloud Firestore
 */
export async function restoreStudentInFirestore(
  studentId: string,
  restoredBy: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }
  const path = `students/${studentId}`;
  try {
    const studentRef = doc(db, 'students', studentId);
    const now = new Date().toISOString();
    await setDoc(
      studentRef,
      {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        restoredAt: now,
        restoredBy: restoredBy || 'Super Admin',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error('Firestore restore student failed:', error);
    const errMessage = error?.message || 'Failed to restore student in Firestore';
    return { success: false, error: errMessage };
  }
}

/**
 * Hard deletes a student document permanently from Cloud Firestore
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }
  const path = `students/${studentId}`;
  try {
    const studentRef = doc(db, 'students', studentId);
    await deleteDoc(studentRef);
    return { success: true };
  } catch (error: any) {
    console.error('Firestore hard delete failed:', error);
    return { success: false, error: error?.message || 'Failed to delete student from Firestore' };
  }
}

/**
 * Saves a single mark entry in Cloud Firestore
 */
export async function saveMarkToFirestore(mark: MarkRecord): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const markDocId = `${mark.examId}_${mark.studentId}_${mark.subjectId}_${mark.component || 'main'}`;
  const path = `marks/${markDocId}`;
  try {
    const markRef = doc(db, 'marks', markDocId);
    await setDoc(markRef, { ...mark, id: markDocId, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a batch of marks in Cloud Firestore
 */
export async function batchSaveMarksToFirestore(marksList: MarkRecord[]): Promise<void> {
  const db = getFirebaseDb();
  if (!db || marksList.length === 0) return;
  const path = 'marks';
  try {
    let batch = writeBatch(db);
    let count = 0;
    for (const mk of marksList) {
      const markDocId = `${mk.examId}_${mk.studentId}_${mk.subjectId}_${mk.component || 'main'}`;
      const ref = doc(db, 'marks', markDocId);
      batch.set(ref, { ...mk, id: markDocId, updatedAt: serverTimestamp() }, { merge: true });
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves or updates an examination record
 */
export async function saveExamToFirestore(exam: ExamRecord): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const path = `examinations/${exam.id}`;
  try {
    const examRef = doc(db, 'examinations', exam.id);
    await setDoc(examRef, { ...exam, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a checklist snapshot
 */
export async function saveChecklistToFirestore(snapshot: ChecklistSnapshot): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const path = `checklists/${snapshot.id}`;
  try {
    const ref = doc(db, 'checklists', snapshot.id);
    await setDoc(ref, { ...snapshot, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches all student records from Cloud Firestore
 */
export async function fetchStudentsFromFirestore(): Promise<Student[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const path = 'students';
  try {
    const colRef = collection(db, 'students');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as Student);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetches all mark records from Cloud Firestore
 */
export async function fetchMarksFromFirestore(): Promise<MarkRecord[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const path = 'marks';
  try {
    const colRef = collection(db, 'marks');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as MarkRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

