import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

const customConfig = {
  apiKey: "AIzaSyBlBURFnqoXb3ZhGms7gDWNp0Nu-P_QSZM",
  authDomain: "you-love-nta.firebaseapp.com",
  databaseURL: "https://you-love-nta-default-rtdb.firebaseio.com",
  projectId: "you-love-nta",
  storageBucket: "you-love-nta.firebasestorage.app",
  messagingSenderId: "121180158299",
  appId: "1:121180158299:web:ccea3fe67bcfff9150827e",
  measurementId: "G-0NTDSFVKYC"
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
export const googleProvider = new GoogleAuthProvider();

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
