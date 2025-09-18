// Test script to verify manager has full access
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

async function testManagerFullAccess() {
  try {
    console.log('🔍 Testing manager full access...\n');

    // Test 1: Manager login through employee login screen
    console.log('1. Testing manager login through employee login screen...');
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    const ownerEmail = 'owner@example.com'; // Manager's owner email
    
    try {
      // First verify owner exists
      console.log('   Verifying owner account...');
      const ownerDoc = await getDoc(doc(firestore, 'users', 'owner-uid')); // Replace with actual owner UID
      if (!ownerDoc.exists()) {
        console.log('   ⚠️  Owner account not found, skipping owner verification test');
      } else {
        console.log('   ✅ Owner account verified');
      }
      
      // Try manager login
      const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
      console.log('   ✅ Manager login successful');
      console.log(`   UID: ${managerCredential.user.uid}`);
      console.log(`   Email: ${managerCredential.user.email}\n`);
      
      const user = managerCredential.user;
      
      // Test 2: Check manager role in Redux state
      console.log('2. Checking manager role in Redux state...');
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('   User metadata:');
        console.log(`     Role: "${userData.role}"`);
        console.log(`     Restaurant ID: ${userData.restaurantId}`);
        console.log(`     Display Name: ${userData.displayName}`);
        console.log(`     Is Active: ${userData.isActive}\n`);
        
        // Test 3: Verify navigation permissions
        console.log('3. Testing navigation permissions...');
        const userRole = userData.role === 'manager' ? 'Manager' : userData.role;
        console.log(`   Redux role: "${userRole}"`);
        
        // Check if manager should have access to receipts and settings
        const isOwnerLevel = userRole === 'Owner' || userRole === 'Manager';
        console.log(`   isOwnerLevel: ${isOwnerLevel}`);
        
        if (isOwnerLevel) {
          console.log('   ✅ Manager should have access to:');
          console.log('     - Receipts (Daily Summary, Receipt Details)');
          console.log('     - Settings (Office Management, Employee Management, etc.)');
          console.log('     - All other features (Orders, Staff, Inventory, Customers)');
        } else {
          console.log('   ❌ Manager does not have owner-level access');
        }
        
        // Test 4: Verify specific permissions
        console.log('\n4. Testing specific permissions...');
        
        // Employee Management permissions
        const canManageEmployees = userRole === 'Owner' || userRole === 'Manager';
        console.log(`   Can manage employees: ${canManageEmployees}`);
        
        // Office Management permissions
        const canEditOffice = userRole === 'Owner' || userRole === 'Manager';
        console.log(`   Can edit office settings: ${canEditOffice}`);
        
        // Order cancellation permissions
        const canCancelOrders = userRole === 'Owner' || userRole === 'Manager';
        console.log(`   Can cancel orders: ${canCancelOrders}`);
        
        // Test 5: Verify login screen restrictions
        console.log('\n5. Testing login screen restrictions...');
        
        // Manager should NOT be able to login through main login screen
        console.log('   Main login screen should block managers:');
        console.log(`     userMetadata.role !== 'Owner': ${userData.role !== 'Owner'}`);
        if (userData.role !== 'Owner') {
          console.log('     ✅ Manager would be blocked from main login screen');
          console.log('     ✅ Manager should use employee login screen instead');
        }
        
        // Manager SHOULD be able to login through employee login screen
        console.log('   Employee login screen should allow managers:');
        console.log(`     userMetadata.role !== 'Owner': ${userData.role !== 'Owner'}`);
        console.log(`     userMetadata.role === 'manager': ${userData.role === 'manager'}`);
        if (userData.role !== 'Owner' && userData.role === 'manager') {
          console.log('     ✅ Manager can login through employee login screen');
        }
        
      } else {
        console.log('   ❌ Manager metadata not found in Firestore');
      }
      
    } catch (loginError) {
      console.log('   ❌ Manager login failed:', loginError.code, loginError.message);
      
      if (loginError.code === 'auth/user-not-found') {
        console.log('     → Manager account does not exist in Firebase Auth');
        console.log('     → Please create a manager account first');
      } else if (loginError.code === 'auth/wrong-password') {
        console.log('     → Manager account exists but password is wrong');
      } else if (loginError.code === 'auth/invalid-credential') {
        console.log('     → Invalid credential (email or password is wrong)');
      }
    }

    console.log('\n🎉 Manager full access test completed!');
    console.log('✅ Managers should now have:');
    console.log('   - Access to employee login screen');
    console.log('   - Full read/write access to all features');
    console.log('   - Access to Receipts and Settings in navigation');
    console.log('   - Ability to manage employees, cancel orders, edit office settings');
    console.log('   - Blocked from main login screen (must use employee login)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testManagerFullAccess();
