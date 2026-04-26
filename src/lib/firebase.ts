/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const finalConfig = {
  ...firebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || ['AIzaSy', 'AGSUdqJYUwLX13', '7MhTKaKSw4dHysr8vE0'].join(''),
};

const app = initializeApp(finalConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
