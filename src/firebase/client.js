import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDzi5X0equqgFPMM-hP2maN2iZ4WWh8fOA',
  authDomain: 'makemov-1deec.firebaseapp.com',
  projectId: 'makemov-1deec',
  storageBucket: 'makemov-1deec',
  messagingSenderId: '544116130347',
  appId: '1:544116130347:web:7d5569913522aaddab606e',
  measurementId: 'G-78CP1D7QH5',
};

function normalizeStorageBucket(value) {
  return String(value || '').trim().replace(/^gs:\/\//, '').replace(/\/+$/, '');
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: normalizeStorageBucket(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
};

function hasRequiredConfig(config) {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

export const isFirebaseConfigured = hasRequiredConfig(firebaseConfig);

export const app = isFirebaseConfigured
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

let analyticsInitPromise = null;
let authReadyPromise = null;
let authPersistencePromise = null;
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

export function initFirebaseAnalytics() {
  if (!app || typeof window === 'undefined' || !firebaseConfig.measurementId) {
    return Promise.resolve(null);
  }

  if (analyticsInitPromise) return analyticsInitPromise;

  analyticsInitPromise = import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported }) => {
      const supported = await isSupported();
      if (!supported) return null;
      return getAnalytics(app);
    })
    .catch((err) => {
      console.warn('[firebase] analytics init skipped:', err?.message || err);
      return null;
    });

  return analyticsInitPromise;
}

export function onFirebaseAuthChanged(handler) {
  if (!auth) {
    handler(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    handler(user || null);
  });
}

export function waitForAuthReady() {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user || null);
      });
    });
  }
  return authReadyPromise;
}

export function ensureFirebaseAuthPersistence() {
  if (!auth) return Promise.resolve();
  if (!authPersistencePromise) {
    authPersistencePromise = setPersistence(auth, browserLocalPersistence)
      .catch((err) => {
        authPersistencePromise = null;
        throw err;
      });
  }
  return authPersistencePromise;
}

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error('Firebase auth is not configured');
  }
  await ensureFirebaseAuthPersistence();
  await signInWithRedirect(auth, googleProvider);
  return null;
}

export async function consumeGoogleRedirectResult() {
  if (!auth) return null;
  await ensureFirebaseAuthPersistence();
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err) {
    const message = err?.message || String(err);
    throw new Error(`Google redirect 로그인 처리 실패: ${message}`);
  }
}

export async function signOutFirebaseAuth() {
  if (!auth) return;
  await signOut(auth);
}

export { firebaseConfig };
