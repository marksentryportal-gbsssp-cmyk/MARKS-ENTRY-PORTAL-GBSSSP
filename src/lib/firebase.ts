import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

/**
 * Client-side web configuration for gbsss-marks-entry-portal.
 * Defaults match the active Cloud Firestore project, overridable by VITE_FIREBASE_* env vars.
 */
export const firebaseConfig: FirebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCWFd_rk49tGAdkX642Oyda7-WH-3JFtFM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gbsss-marks-entry-portal.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gbsss-marks-entry-portal',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gbsss-marks-entry-portal.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '467908255159',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:467908255159:web:d60f6f6b04c723e4ae9c32',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-P54THCN3FD',
};

const CONFIG_STORAGE_KEY = 'gopinath_school_firebase_web_config_v1';

export function getStoredFirebaseConfig(): FirebaseWebConfig {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read stored Firebase config:', err);
  }
  return firebaseConfig;
}

export function saveStoredFirebaseConfig(config: FirebaseWebConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Could not persist Firebase config:', err);
  }
}

// 1. Initialize Primary Firebase App
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// 3. Initialize Cloud Firestore with persistent local cache & multi-tab coordination
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // If already initialized in this window/module context
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

/**
 * Accessor methods for runtime safety
 */
export const getFirebaseAuth = (): Auth => auth;
export const getFirebaseDb = (): Firestore => db;

/**
 * Secondary Firebase Auth instance for administrative staff creation.
 * Allows creating teacher/viewer accounts without invalidating the active admin session.
 */
export function getSecondaryAuth(): Auth {
  const existingSecondary = getApps().find((a) => a.name === 'SecondaryAdminApp');
  const secApp = existingSecondary || initializeApp(firebaseConfig, 'SecondaryAdminApp');
  return getAuth(secApp);
}

/**
 * Convert user identifier (UDISE code or staff ID) to synthetic Firebase email
 */
export function udiseToSyntheticEmail(udiseOrId: string): string {
  const clean = udiseOrId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean}@gbsss-marks.app`;
}

export default app;
