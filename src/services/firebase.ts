export * from '../firebase';
import {
  getStoredFirebaseConfig,
  getFirebaseAuth,
  getFirebaseDb,
  initFirebase,
  FirebaseWebConfig,
} from '../firebase';
import { doc, getDocFromServer, Firestore } from 'firebase/firestore';

export function isFirebaseConfigured(): boolean {
  const conf = getStoredFirebaseConfig();
  return Boolean(conf && conf.apiKey && conf.projectId);
}

export function initializeFirebaseApp(customConfig?: FirebaseWebConfig) {
  const res = initFirebase();
  return {
    app: res.app,
    auth: res.auth,
    db: res.db,
    isConfigured: Boolean(res.app && res.db),
    error: (res as any).error,
  };
}

/**
 * Tests live connection to Cloud Firestore
 */
export async function testFirestoreConnection(db: Firestore): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
  const start = performance.now();
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    const latency = Math.round(performance.now() - start);
    return { success: true, latencyMs: latency };
  } catch (error: any) {
    const latency = Math.round(performance.now() - start);
    if (error?.message && error.message.includes('the client is offline')) {
      return { success: false, error: 'Client is offline. Please check network connection and Firebase configuration.', latencyMs: latency };
    }
    // Missing permissions on test path is normal for strict security rules, meaning connection is alive
    if (error?.code === 'permission-denied') {
      return { success: true, latencyMs: latency };
    }
    return { success: false, error: error?.message || String(error), latencyMs: latency };
  }
}
