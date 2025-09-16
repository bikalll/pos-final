/**
 * Test script to verify Firestore security rules are working
 * This script tests if receipts are properly isolated by restaurant
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtcCbBOLmqsGZ_IPYIz0fhqYXTcWtlWJU",
  authDomain: "dbarbi-4c494.firebaseapp.com",
  projectId: "dbarbi-4c494",
  storageBucket: "dbarbi-4c494.firebasestorage.app",
  messagingSenderId: "44854741850",
  appId: "1:44854741850:android:acfd13df564f7265c34163"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestoreSecurity() {
  console.log('🧪 Testing Firestore Security Rules...\n');

  try {
    // Test 1: Try to access receipts without authentication (should fail)
    console.log('🔍 Test 1: Accessing receipts without authentication...');
    try {
      const receiptsCollection = collection(db, 'restaurants/restaurant_001/receipts');
      const snapshot = await getDocs(receiptsCollection);
      console.log('❌ SECURITY ISSUE: Able to access receipts without authentication!');
      console.log('   This means Firestore security rules are not working properly.');
      console.log('   Count:', snapshot.size);
    } catch (error) {
      console.log('✅ Security working: Cannot access receipts without authentication');
      console.log('   Error:', error.message);
    }

    // Test 2: Check if we can access different restaurant's data
    console.log('\n🔍 Test 2: Checking cross-restaurant access...');
    try {
      const restaurant1Receipts = collection(db, 'restaurants/restaurant_001/receipts');
      const restaurant2Receipts = collection(db, 'restaurants/restaurant_002/receipts');
      
      const snapshot1 = await getDocs(restaurant1Receipts);
      const snapshot2 = await getDocs(restaurant2Receipts);
      
      console.log('📊 Restaurant 1 receipts:', snapshot1.size);
      console.log('📊 Restaurant 2 receipts:', snapshot2.size);
      
      if (snapshot1.size > 0 && snapshot2.size > 0) {
        console.log('⚠️  WARNING: Both restaurants have receipts accessible');
        console.log('   This might indicate a security issue if you can see both.');
      }
    } catch (error) {
      console.log('✅ Security working: Cannot access receipts without proper authentication');
      console.log('   Error:', error.message);
    }

    // Test 3: Check user documents
    console.log('\n🔍 Test 3: Checking user documents...');
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      console.log('📊 Users count:', usersSnapshot.size);
      
      if (usersSnapshot.size > 0) {
        console.log('❌ SECURITY ISSUE: Able to access user documents without authentication!');
        usersSnapshot.forEach(doc => {
          console.log('   User:', doc.id, 'Data:', doc.data());
        });
      }
    } catch (error) {
      console.log('✅ Security working: Cannot access user documents without authentication');
      console.log('   Error:', error.message);
    }

    console.log('\n📋 Security Test Summary:');
    console.log('If you see "SECURITY ISSUE" messages above, your Firestore rules are not working properly.');
    console.log('You need to deploy the firestore.rules file to Firebase.');
    console.log('\nTo deploy rules:');
    console.log('1. Install Firebase CLI: npm install -g firebase-tools');
    console.log('2. Login: firebase login');
    console.log('3. Deploy rules: firebase deploy --only firestore:rules');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFirestoreSecurity().catch(console.error);























