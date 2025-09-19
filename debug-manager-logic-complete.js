// Complete debug script to trace manager checking logic
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

async function debugManagerLogicComplete() {
  try {
    console.log('🔍 Complete Manager Logic Debug...\n');

    // Test with a manager account
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. SIGNING IN AS MANAGER...');
    const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
    console.log('✅ Manager signed in successfully');
    console.log(`   UID: ${managerCredential.user.uid}`);
    console.log(`   Email: ${managerCredential.user.email}\n`);
    
    const user = managerCredential.user;
    
    // Step 1: Check users collection
    console.log('2. CHECKING USERS COLLECTION...');
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (!userDoc.exists()) {
      console.log('❌ User metadata not found in users collection');
      return;
    }
    
    const userData = userDoc.data();
    console.log('✅ User metadata found:');
    console.log(`   Role: "${userData.role}" (type: ${typeof userData.role})`);
    console.log(`   Restaurant ID: ${userData.restaurantId}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Display Name: ${userData.displayName}\n`);
    
    // Step 2: Check restaurant users mapping
    console.log('3. CHECKING RESTAURANT USERS MAPPING...');
    const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
    
    let restaurantRole = null;
    if (restaurantUserDoc.exists()) {
      const restaurantUserData = restaurantUserDoc.data();
      restaurantRole = restaurantUserData.role;
      console.log('✅ Restaurant user mapping found:');
      console.log(`   Role: "${restaurantRole}" (type: ${typeof restaurantRole})`);
      console.log(`   Email: ${restaurantUserData.email}`);
    } else {
      console.log('❌ No restaurant user mapping found');
    }
    
    // Step 3: Test authentication service logic
    console.log('\n4. TESTING AUTHENTICATION SERVICE LOGIC...');
    
    // Step 3a: Try restaurant users mapping first
    let effectiveRole = undefined;
    if (restaurantRole) {
      const mappedRole = (restaurantRole || '').toString();
      console.log(`   Restaurant role: "${mappedRole}"`);
      
      if (mappedRole === 'Owner' || mappedRole === 'Manager' || mappedRole === 'Staff') {
        effectiveRole = mappedRole;
        console.log(`   ✅ Using restaurant role: "${effectiveRole}"`);
      } else {
        console.log(`   ❌ Restaurant role "${mappedRole}" not recognized`);
      }
    }
    
    // Step 3b: Fallback to user metadata
    if (!effectiveRole) {
      console.log('   Falling back to user metadata role...');
      console.log(`   User metadata role: "${userData.role}"`);
      
      if (userData.role === 'Owner') {
        effectiveRole = 'Owner';
      } else if (userData.role === 'manager') {
        effectiveRole = 'Manager';
      } else if (userData.role === 'staff' || userData.role === 'employee') {
        effectiveRole = 'Staff';
      } else {
        effectiveRole = 'Staff';
      }
      console.log(`   ✅ Using fallback role: "${effectiveRole}"`);
    }
    
    // Step 4: Test login screen logic
    console.log('\n5. TESTING LOGIN SCREEN LOGIC...');
    
    // Main login screen (should block managers)
    console.log('   Main Login Screen:');
    console.log(`     userMetadata.role !== 'Owner': ${userData.role !== 'Owner'}`);
    if (userData.role !== 'Owner') {
      console.log('     ✅ Manager would be BLOCKED from main login screen');
      if (userData.role === 'manager') {
        console.log('     ✅ Would show: "This is a manager account. Please use the employee login instead."');
      }
    } else {
      console.log('     ❌ Manager would be ALLOWED in main login screen (WRONG!)');
    }
    
    // Employee login screen (should allow managers)
    console.log('   Employee Login Screen:');
    console.log(`     userMetadata.role !== 'Owner': ${userData.role !== 'Owner'}`);
    console.log(`     userMetadata.role === 'manager': ${userData.role === 'manager'}`);
    if (userData.role !== 'Owner' && userData.role === 'manager') {
      console.log('     ✅ Manager would be ALLOWED in employee login screen');
    } else {
      console.log('     ❌ Manager would be BLOCKED from employee login screen (WRONG!)');
    }
    
    // Step 5: Test navigation logic
    console.log('\n6. TESTING NAVIGATION LOGIC...');
    console.log(`   Final effective role: "${effectiveRole}"`);
    console.log(`   userRole === 'Owner': ${effectiveRole === 'Owner'}`);
    console.log(`   userRole === 'Manager': ${effectiveRole === 'Manager'}`);
    
    const isOwnerLevel = effectiveRole === 'Owner' || effectiveRole === 'Manager';
    console.log(`   isOwnerLevel: ${isOwnerLevel}`);
    
    if (isOwnerLevel) {
      console.log('   ✅ Manager should see Receipts and Settings in navigation');
    } else {
      console.log('   ❌ Manager will NOT see Receipts and Settings in navigation');
      console.log('   ❌ THIS IS THE PROBLEM!');
    }
    
    // Step 6: Summary
    console.log('\n7. SUMMARY...');
    console.log('   Data Sources:');
    console.log(`     Users collection: "${userData.role}"`);
    console.log(`     Restaurant users: "${restaurantRole || 'NOT FOUND'}"`);
    console.log(`     Final effective role: "${effectiveRole}"`);
    console.log('');
    console.log('   Expected Flow:');
    console.log('     1. Manager logs in via Employee Login Screen ✅');
    console.log('     2. Authentication service maps "manager" → "Manager" ✅');
    console.log('     3. Redux state gets role: "Manager" ✅');
    console.log('     4. Navigation shows Receipts and Settings ✅');
    console.log('');
    console.log('   Actual Result:');
    if (effectiveRole === 'Manager') {
      console.log('     ✅ Role mapping is working correctly');
      console.log('     ✅ Manager should see Receipts and Settings');
    } else {
      console.log('     ❌ Role mapping is NOT working');
      console.log('     ❌ Manager will NOT see Receipts and Settings');
      console.log(`     ❌ Problem: effectiveRole is "${effectiveRole}" instead of "Manager"`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugManagerLogicComplete();

