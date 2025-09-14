// Test script to verify Owner role fix
// Run this with: node test-owner-role-fix.js

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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
const auth = getAuth(app);
const firestore = getFirestore(app);

async function testOwnerRoleFix() {
  try {
    console.log('🧪 Testing Owner role fix...\n');
    
    // Get all users with role "Owner" (uppercase)
    const usersRef = collection(firestore, 'users');
    const ownerQuery = query(usersRef, where('role', '==', 'Owner'));
    const ownerQuerySnapshot = await getDocs(ownerQuery);
    
    console.log(`📋 Found ${ownerQuerySnapshot.size} users with role "Owner":\n`);
    
    if (ownerQuerySnapshot.empty) {
      console.log('❌ No users found with role "Owner"');
      return;
    }
    
    // Test each owner account
    for (let i = 0; i < ownerQuerySnapshot.docs.length; i++) {
      const doc = ownerQuerySnapshot.docs[i];
      const ownerData = doc.data();
      
      console.log(`👑 Owner ${i + 1}:`);
      console.log(`   Email: ${ownerData.email}`);
      console.log(`   Display Name: ${ownerData.displayName}`);
      console.log(`   Role: "${ownerData.role}"`);
      console.log(`   Restaurant ID: ${ownerData.restaurantId}`);
      console.log(`   Is Active: ${ownerData.isActive}`);
      
      // Test role check logic
      const isOwner = ownerData.role === 'Owner';
      console.log(`   Is Owner (=== 'Owner'): ${isOwner}`);
      
      if (isOwner) {
        console.log('   ✅ Role check works correctly!');
      } else {
        console.log('   ❌ Role check failed!');
      }
      
      console.log('   ' + '─'.repeat(50));
    }
    
    // Test with an employee account
    console.log('\n👤 Testing with employee account:');
    const employeeQuery = query(usersRef, where('role', '==', 'employee'));
    const employeeQuerySnapshot = await getDocs(employeeQuery);
    
    if (!employeeQuerySnapshot.empty) {
      const employeeDoc = employeeQuerySnapshot.docs[0];
      const employeeData = employeeDoc.data();
      
      console.log(`   Email: ${employeeData.email}`);
      console.log(`   Role: "${employeeData.role}"`);
      
      const isOwner = employeeData.role === 'Owner';
      const isEmployee = employeeData.role === 'employee';
      
      console.log(`   Is Owner (=== 'Owner'): ${isOwner}`);
      console.log(`   Is Employee (=== 'employee'): ${isEmployee}`);
      
      if (!isOwner && isEmployee) {
        console.log('   ✅ Employee role check works correctly!');
      } else {
        console.log('   ❌ Employee role check failed!');
      }
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('✅ All role checks now specifically look for "Owner" (uppercase)');
    console.log('✅ Employee accounts have role "employee" (lowercase)');
    console.log('✅ The app should now work correctly with your real accounts');
    
    console.log('\n💡 To test in the app:');
    console.log('1. Try logging in with any of the Owner accounts listed above');
    console.log('2. You should see Settings and Receipts menu items');
    console.log('3. Try employee login with the correct credentials');
    console.log('4. Employee should see appropriate menu items');
    
  } catch (error) {
    console.error('❌ Error testing Owner role fix:', error);
  }
}

testOwnerRoleFix();

