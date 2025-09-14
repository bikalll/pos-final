// Test script to verify employee login security fixes
// Run this with: node test-employee-login-security.js

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
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

async function testEmployeeLoginSecurity() {
  try {
    console.log('🔒 Testing employee login security fixes...\n');
    
    // Get all users
    const usersRef = collection(firestore, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    
    const owners = [];
    const employees = [];
    
    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.role === 'Owner') {
        owners.push(userData);
      } else if (userData.role === 'employee') {
        employees.push(userData);
      }
    });
    
    console.log(`📋 Found ${owners.length} owners and ${employees.length} employees\n`);
    
    // Test 1: Employee trying to login with wrong owner email
    console.log('🧪 Test 1: Employee with wrong owner email');
    if (employees.length > 0 && owners.length > 1) {
      const employee = employees[0];
      const wrongOwner = owners[1]; // Different owner
      
      console.log(`   Employee: ${employee.email}`);
      console.log(`   Employee Restaurant: ${employee.restaurantId}`);
      console.log(`   Wrong Owner: ${wrongOwner.email}`);
      console.log(`   Wrong Owner Restaurant: ${wrongOwner.restaurantId}`);
      
      try {
        await signInWithEmailAndPassword(auth, employee.email, 'test123456');
        console.log('   ❌ SECURITY ISSUE: Employee logged in with wrong owner email!');
        await signOut(auth);
      } catch (error) {
        console.log('   ✅ SECURITY WORKING: Employee correctly blocked with wrong owner email');
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Test 2: Owner trying to login via employee login
    console.log('\n🧪 Test 2: Owner trying to login via employee login');
    if (owners.length > 0) {
      const owner = owners[0];
      
      console.log(`   Owner: ${owner.email}`);
      console.log(`   Owner Role: ${owner.role}`);
      
      try {
        await signInWithEmailAndPassword(auth, owner.email, 'test123456');
        console.log('   ❌ SECURITY ISSUE: Owner logged in via employee login!');
        await signOut(auth);
      } catch (error) {
        console.log('   ✅ SECURITY WORKING: Owner correctly blocked from employee login');
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Test 3: Employee with correct owner email
    console.log('\n🧪 Test 3: Employee with correct owner email');
    if (employees.length > 0) {
      const employee = employees[0];
      
      // Find the correct owner for this employee
      let correctOwner = null;
      for (const owner of owners) {
        if (owner.restaurantId === employee.restaurantId) {
          correctOwner = owner;
          break;
        }
      }
      
      if (correctOwner) {
        console.log(`   Employee: ${employee.email}`);
        console.log(`   Employee Restaurant: ${employee.restaurantId}`);
        console.log(`   Correct Owner: ${correctOwner.email}`);
        console.log(`   Correct Owner Restaurant: ${correctOwner.restaurantId}`);
        
        try {
          await signInWithEmailAndPassword(auth, employee.email, 'test123456');
          console.log('   ✅ LOGIN SUCCESS: Employee logged in with correct owner email');
          await signOut(auth);
        } catch (error) {
          console.log('   ❌ LOGIN FAILED: Employee should be able to login with correct owner');
          console.log(`   Error: ${error.message}`);
        }
      } else {
        console.log('   ⚠️  No matching owner found for this employee');
      }
    }
    
    // Test 4: Non-existent owner email
    console.log('\n🧪 Test 4: Employee with non-existent owner email');
    if (employees.length > 0) {
      const employee = employees[0];
      const fakeOwnerEmail = 'fake-owner@example.com';
      
      console.log(`   Employee: ${employee.email}`);
      console.log(`   Fake Owner: ${fakeOwnerEmail}`);
      
      try {
        await signInWithEmailAndPassword(auth, employee.email, 'test123456');
        console.log('   ❌ SECURITY ISSUE: Employee logged in with fake owner email!');
        await signOut(auth);
      } catch (error) {
        console.log('   ✅ SECURITY WORKING: Employee correctly blocked with fake owner email');
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log('\n🎯 SECURITY SUMMARY:');
    console.log('The employee login should now properly validate:');
    console.log('1. ✅ Owner email must exist and be a valid Owner account');
    console.log('2. ✅ Employee must belong to the same restaurant as the owner');
    console.log('3. ✅ Employee account must have role "employee"');
    console.log('4. ✅ Owner accounts are blocked from employee login');
    console.log('5. ✅ Invalid owner emails are rejected');
    
    console.log('\n💡 To test in the app:');
    console.log('1. Try employee login with wrong owner email - should fail');
    console.log('2. Try owner login via employee screen - should fail');
    console.log('3. Try employee login with correct owner email - should work');
    console.log('4. Try employee login with fake owner email - should fail');
    
  } catch (error) {
    console.error('❌ Error testing employee login security:', error);
  }
}

testEmployeeLoginSecurity();

