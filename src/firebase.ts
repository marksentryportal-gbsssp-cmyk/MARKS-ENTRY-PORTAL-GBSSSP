export * from './lib/firebase';
export { default } from './lib/firebase';
import {
  firebaseConfig,
  app,
  auth,
  db,
  getFirebaseAuth,
  getFirebaseDb,
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  getSecondaryAuth,
  udiseToSyntheticEmail,
  FirebaseWebConfig,
} from './lib/firebase';

export const DEFAULT_FIREBASE_CONFIG = firebaseConfig;

export function initFirebase() {
  return {
    app,
    auth,
    db,
    isConfigured: Boolean(app && db),
  };
}
