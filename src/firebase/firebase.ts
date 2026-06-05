import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const customConfig = {
  apiKey: "AIzaSyArvnu7ePP9Zv0Jg4g8U4FrCAHuqUga9R4",
  authDomain: "youlove111.firebaseapp.com",
  projectId: "youlove111",
  storageBucket: "youlove111.firebasestorage.app",
  messagingSenderId: "622471308399",
  appId: "1:622471308399:web:c7f0440e81ecaa62f0599a",
  measurementId: "G-5V450TGRWG"
};

// Determine which config to use dynamically based on environment hostname
const isDevEnvironment = typeof window !== 'undefined' && (
  window.location.hostname.includes('asia-southeast1.run.app') ||
  window.location.hostname.includes('localhost') ||
  window.location.hostname.includes('127.0.0.1')
);

const firebaseConfig = isDevEnvironment ? appletConfig : customConfig;

const app = initializeApp(firebaseConfig);

// If using applet config in Dev/Preview, we specify the firestoreDatabaseId
export const db = isDevEnvironment 
  ? getFirestore(app, (appletConfig as any).firestoreDatabaseId) 
  : getFirestore(app);

export const auth = getAuth(app);

// Enable automated anonymous authentication on boot for rules support
signInAnonymously(auth).catch((err) => {
  console.warn("Automated anonymous sign-in skipped/failed:", err);
});

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
