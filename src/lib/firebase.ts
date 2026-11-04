import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

import appletConfig from '../../firebase-applet-config.json';

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
 * Client-side web configuration from firebase-applet-config.json.
 * Overridable by VITE_FIREBASE_* environment variables if present.
 */
export const firebaseConfig: FirebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || 'AIzaSyCMAHZwtPF_O-qdpcXpPpo7f7Qn7GDt6-A',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || 'marks-entry-portal-512313.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'marks-entry-portal-512313',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || 'marks-entry-portal-512313.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '205024505198',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || '1:205024505198:web:4141f07f22ca385073657f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || '',
};

export const firestoreDatabaseId: string | undefined =
  (appletConfig as any).firestoreDatabaseId || undefined;

const CONFIG_STORAGE_KEY = 'gopinath_school_firebase_web_config_v1';

export function getStoredFirebaseConfig(): FirebaseWebConfig {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.apiKey && parsed.projectId === firebaseConfig.projectId) {
        return parsed;
      }
      // If cached with an older project id, purge it so the official production project is used
      localStorage.removeItem(CONFIG_STORAGE_KEY);
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
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firestoreDatabaseId
  );
} catch {
  // If already initialized in this window/module context
  firestoreInstance = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
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
  return `${clean}@marks-portal.app`;
}

export default app;
