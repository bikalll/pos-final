import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore, collection, doc, getDoc } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { getFunctions, Functions } from 'firebase/functions';

// Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBtcCbBOLmqsGZ_IPYIz0fhqYXTcWtlWJU",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "dbarbi-4c494.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "dbarbi-4c494",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "dbarbi-4c494.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "44854741850",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:44854741850:android:acfd13df564f7265c34163"
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
