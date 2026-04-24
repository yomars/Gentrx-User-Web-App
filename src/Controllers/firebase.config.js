// src/firebase-config.js
// Lazy initialization: Firebase is only started when getFirebaseApp() is first called.
// This prevents Firebase from accessing cross-origin storage (IndexedDB, cookies) on every
// page load, which triggers Edge/Chrome Tracking Prevention warnings for all users.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Returns the existing Firebase app or initializes one on first call.
export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export { getToken };
