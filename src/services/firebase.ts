import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: 'AIzaSyCWFd_rk49tGAdkX642Oyda7-WH-3JFtFM',
  authDomain: 'gbsss-marks-entry-portal.firebaseapp.com',
  projectId: 'gbsss-marks-entry-portal',
  storageBucket: 'gbsss-marks-entry-portal.firebasestorage.app',
  messagingSenderId: '467908255159',
  appId: '1:467908255159:web:d60f6f6b04c723e4ae9c32',
  measurementId: 'G-P54THCN3FD',
};

const CONFIG_STORAGE_KEY = 'gopinath_school_firebase_web_config_v1';

/**
 * Loads Firebase configuration from environment, localStorage, or school default
 */
export function getStoredFirebaseConfig(): FirebaseWebConfig {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
    // Check Vite environment variables
    const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
    const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;
    if (envApiKey && envProjectId) {
      return {
        apiKey: envApiKey,
        authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
        projectId: envProjectId,
        storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
      };
    }
  } catch (err) {
    console.warn('Could not read stored Firebase config:', err);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function isFirebaseConfigured(): boolean {
  const conf = getStoredFirebaseConfig();
  return Boolean(conf && conf.apiKey && conf.projectId);
}

export function saveStoredFirebaseConfig(config: FirebaseWebConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Could not persist Firebase config:', err);
  }
}

// Initial config resolution
const initialConfig = getStoredFirebaseConfig();

let appInstance: any = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function initializeFirebaseApp(customConfig?: FirebaseWebConfig) {
  const config = customConfig || getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, auth: null, db: null, isConfigured: false };
  }

  try {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(config);
    }

    authInstance = getAuth(appInstance);
    dbInstance = config.firestoreDatabaseId
      ? getFirestore(appInstance, config.firestoreDatabaseId)
      : getFirestore(appInstance);

    return {
      app: appInstance,
      auth: authInstance,
      db: dbInstance,
      isConfigured: true,
    };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return { app: null, auth: null, db: null, isConfigured: false, error: err };
  }
}

// Initialize on module load if config exists
if (initialConfig) {
  initializeFirebaseApp(initialConfig);
}

export const getFirebaseAuth = (): Auth | null => authInstance;
export const getFirebaseDb = (): Firestore | null => dbInstance;

/**
 * Tests live connection to Cloud Firestore
 */
export async function testFirestoreConnection(db: Firestore): Promise<{ success: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    return { success: true };
  } catch (error: any) {
    if (error?.message && error.message.includes('the client is offline')) {
      return { success: false, error: 'Client is offline. Please check network connection and Firebase configuration.' };
    }
    // Missing permissions on test path is normal for strict security rules, meaning connection is alive
    if (error?.code === 'permission-denied') {
      return { success: true };
    }
    return { success: false, error: error?.message || String(error) };
  }
}
