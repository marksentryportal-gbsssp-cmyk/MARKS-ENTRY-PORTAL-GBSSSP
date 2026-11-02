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

// Client-side web config for gbsss-marks-entry-portal
export const DEFAULT_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyCWFd_rk49tGAdkX642Oyda7-WH-3JFtFM',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'gbsss-marks-entry-portal.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'gbsss-marks-entry-portal',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'gbsss-marks-entry-portal.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '467908255159',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:467908255159:web:d60f6f6b04c723e4ae9c32',
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || 'G-P54THCN3FD',
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
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseWebConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Could not persist Firebase config:', err);
  }
}

let primaryApp: FirebaseApp | null = null;
let primaryAuth: Auth | null = null;
let primaryDb: Firestore | null = null;

export function initFirebase() {
  const config = getStoredFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return { app: null, auth: null, db: null };
  }

  try {
    if (getApps().length > 0) {
      primaryApp = getApp();
    } else {
      primaryApp = initializeApp(config);
    }

    primaryAuth = getAuth(primaryApp);

    try {
      // Initialize with persistent multi-tab offline cache
      primaryDb = initializeFirestore(primaryApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Already initialized in hot-reload or another tab
      primaryDb = getFirestore(primaryApp);
    }

    return { app: primaryApp, auth: primaryAuth, db: primaryDb };
  } catch (err) {
    console.error('Failed to initialize primary Firebase app:', err);
    return { app: null, auth: null, db: null, error: err };
  }
}

// Auto-initialize on module import
initFirebase();

export const getFirebaseAuth = (): Auth | null => primaryAuth || (primaryApp ? getAuth(primaryApp) : null);
export const getFirebaseDb = (): Firestore | null => primaryDb || (primaryApp ? getFirestore(primaryApp) : null);

/**
 * Returns a secondary Firebase Auth instance for admin user provisioning
 * This ensures creating a new teacher/viewer account doesn't log out the current admin
 */
export function getSecondaryAuth(): Auth {
  const config = getStoredFirebaseConfig();
  const existingSecondary = getApps().find((a) => a.name === 'SecondaryAdminApp');
  const secApp = existingSecondary || initializeApp(config, 'SecondaryAdminApp');
  return getAuth(secApp);
}

/**
 * Convert user identifier (UDISE code or staff ID) to synthetic Firebase email
 */
export function udiseToSyntheticEmail(udiseOrId: string): string {
  const clean = udiseOrId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean}@gbsss-marks.app`;
}
