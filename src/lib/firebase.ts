/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const finalConfig = {
  ...firebaseConfig,
  // VITE_FIREBASE_* env vars override the JSON config (set these in Vercel & .env)
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || firebaseConfig.apiKey,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || firebaseConfig.authDomain,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || firebaseConfig.projectId,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || firebaseConfig.appId,
};

const app = initializeApp(finalConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
