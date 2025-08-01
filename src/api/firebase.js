// src/api/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
// --- UPDATED: Import new functions for modern persistence ---
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// --- UPDATED: Initialize Firestore with modern persistence settings ---
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    // Heuristically chosen size. Adjust as needed.
    cacheSizeBytes: 100 * 1024 * 1024, // 100 MB
  }),
});

// Initialize other Firebase services
const auth = getAuth(app);
const functions = getFunctions(app);

// Set authentication persistence
setPersistence(auth, browserSessionPersistence)
  .catch((error) => {
    console.error("Firebase Auth Persistence Error: ", error);
  });

export { auth, db, functions };
export default app;