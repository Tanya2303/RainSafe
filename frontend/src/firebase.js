// frontend/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Vite automatically exposes environment variables prefixed with VITE_
const firebaseConfig = {
  // Use the environment variables loaded from the .env file
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Include if you use Analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the auth object for use in App.jsx and AuthPage.jsx
export const auth = getAuth(app); 

// Note: Ensure the .env file is present in your frontend directory 
// and contains the necessary VITE_FIREBASE_... variables.