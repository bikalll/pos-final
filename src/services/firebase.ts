import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore, collection, doc, getDoc } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { getFunctions, Functions } from 'firebase/functions';

// Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAW7myL-mbegFCw3V0dny9Spqh4fiLZteM",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "abcd-47f2e.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "abcd-47f2e",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "abcd-47f2e.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "495252722002",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:495252722002:android:44c296b15675261e71ea8b"
};

// Initialize Firebase (check if app already exists)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
// Explicitly target the default Cloud Functions region to avoid not-found errors
export const functions: Functions = getFunctions(app, 'us-central1');
export const database: Database = getDatabase(app);

// Test Firestore connection
export const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    const testDoc = doc(firestore, 'test', 'connection');
    const testSnapshot = await getDoc(testDoc);
    console.log('Firebase Firestore connection test: Connected');
    return true;
  } catch (error) {
    console.error('Firebase Firestore connection failed:', error);
    return false;
  }
};


export default app;
