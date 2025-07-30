// src/api/firebase.js

import { initializeApp } from 'firebase/app';
// UPDATED: Import necessary auth functions for persistence
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration from the .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const authInstance = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// --- NEW: Set authentication persistence ---
// This function configures how user sessions are saved.
// 'browserSessionPersistence' means the user is logged out when the browser tab is closed.
setPersistence(authInstance, browserSessionPersistence)
  .catch((error) => {
    // Handle errors here, such as if the browser doesn't support session storage.
    console.error("Firebase Persistence Error: ", error);
  });

// Export the configured services
export const auth = authInstance;
export { db, functions };

export default app;
