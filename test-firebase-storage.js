#!/usr/bin/env node

/**
 * Firebase Storage Connection Test
 * This script tests if Firebase Storage is properly configured and accessible
 */

import { testStorageConnection, testFirestoreConnection } from './src/services/firebase.js';

async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase Connection...\n');
  
  try {
    // Test Firestore connection
    console.log('📊 Testing Firestore connection...');
    const firestoreConnected = await testFirestoreConnection();
    console.log(`Firestore: ${firestoreConnected ? '✅ Connected' : '❌ Failed'}\n`);
    
    // Test Storage connection
    console.log('📁 Testing Firebase Storage connection...');
    const storageConnected = await testStorageConnection();
    console.log(`Storage: ${storageConnected ? '✅ Connected' : '❌ Failed'}\n`);
    
    if (firestoreConnected && storageConnected) {
      console.log('🎉 All Firebase services are connected successfully!');
      console.log('Your Firebase configuration is working correctly.');
    } else {
      console.log('⚠️  Some Firebase services failed to connect.');
      console.log('Please check your Firebase project configuration.');
    }
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
  }
}

// Run the test
testFirebaseConnection();
