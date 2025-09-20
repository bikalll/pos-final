#!/usr/bin/env node

/**
 * Firebase Storage Diagnostic Script
 * This script helps diagnose Firebase Storage connectivity issues
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAW7myL-mbegFCw3V0dny9Spqh4fiLZteM",
  authDomain: "abcd-47f2e.firebaseapp.com",
  projectId: "abcd-47f2e",
  storageBucket: "abcd-47f2e.firebasestorage.app",
  messagingSenderId: "495252722002",
  appId: "1:495252722002:android:44c296b15675261e71ea8b"
};

async function diagnoseFirebaseStorage() {
  console.log('🔍 Firebase Storage Diagnostic Tool\n');
  
  try {
    // Initialize Firebase
    console.log('1️⃣ Initializing Firebase...');
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('✅ Firebase app initialized');
    console.log('   Project ID:', app.options.projectId);
    console.log('   Storage Bucket:', app.options.storageBucket);
    
    // Initialize Storage
    console.log('\n2️⃣ Initializing Firebase Storage...');
    const storage = getStorage(app);
    console.log('✅ Firebase Storage initialized');
    console.log('   Storage Bucket:', storage.app.options.storageBucket);
    
    // Test basic connectivity
    console.log('\n3️⃣ Testing basic connectivity...');
    const testRef = ref(storage, 'test/connectivity-test.txt');
    console.log('✅ Storage reference created');
    console.log('   Reference path:', testRef.fullPath);
    
    // Test with minimal data
    console.log('\n4️⃣ Testing minimal upload...');
    const testData = new Blob(['Hello Firebase Storage!'], { type: 'text/plain' });
    console.log('✅ Test data created');
    
    // Try upload
    console.log('\n5️⃣ Attempting upload...');
    const snapshot = await uploadBytes(testRef, testData);
    console.log('✅ Upload successful!');
    console.log('   Uploaded bytes:', snapshot.metadata.size);
    
    // Get download URL
    console.log('\n6️⃣ Getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Download URL obtained');
    console.log('   URL:', downloadURL);
    
    console.log('\n🎉 All tests passed! Firebase Storage is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:');
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error details:', error.details);
    
    // Provide specific troubleshooting steps
    console.log('\n🔧 Troubleshooting Steps:');
    
    if (error.message.includes('Network request fail')) {
      console.log('   • Check your internet connection');
      console.log('   • Verify Firebase Storage is enabled in Firebase Console');
      console.log('   • Check if your network blocks Firebase domains');
      console.log('   • Try from a different network (mobile hotspot)');
    }
    
    if (error.code === 'storage/unauthorized') {
      console.log('   • Check Firebase Storage security rules');
      console.log('   • Ensure user is authenticated');
      console.log('   • Verify storage rules allow the operation');
    }
    
    if (error.code === 'storage/object-not-found') {
      console.log('   • Check if the storage bucket exists');
      console.log('   • Verify the project ID is correct');
    }
    
    if (error.code === 'storage/quota-exceeded') {
      console.log('   • Check Firebase Storage quota limits');
      console.log('   • Upgrade Firebase plan if needed');
    }
  }
}

// Run diagnostic
diagnoseFirebaseStorage();
