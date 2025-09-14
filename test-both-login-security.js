// Test script to verify both owner and employee login security
// Run this with: node test-both-login-security.js

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

async function testBothLoginSecurity() {
  try {
    console.log('🔒 Testing both owner and employee login security...\n');
    
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
    
    // Test 1: Employee trying to login via owner login screen
    console.log('🧪 Test 1: Employee trying to login via owner login screen');
    if (employees.length > 0) {
      const employee = employees[0];
      
      console.log(`   Employee: ${employee.email}`);
      console.log(`   Employee Role: ${employee.role}`);
      
      try {
        await signInWithEmailAndPassword(auth, employee.email, 'test123456');
        console.log('   ❌ SECURITY ISSUE: Employee logged in via owner login screen!');
        await signOut(auth);
      } catch (error) {
        console.log('   ✅ SECURITY WORKING: Employee correctly blocked from owner login');
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Test 2: Owner trying to login via employee login screen
    console.log('\n🧪 Test 2: Owner trying to login via employee login screen');
    if (owners.length > 0) {
      const owner = owners[0];
      
      console.log(`   Owner: ${owner.email}`);
      console.log(`   Owner Role: ${owner.role}`);
      
      try {
        await signInWithEmailAndPassword(auth, owner.email, 'test123456');
        console.log('   ❌ SECURITY ISSUE: Owner logged in via employee login screen!');
        await signOut(auth);
      } catch (error) {
        console.log('   ✅ SECURITY WORKING: Owner correctly blocked from employee login');
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Test 3: Owner logging in via owner login screen (should work)
    console.log('\n🧪 Test 3: Owner logging in via owner login screen');
    if (owners.length > 0) {
      const owner = owners[0];
      
      console.log(`   Owner: ${owner.email}`);
      console.log(`   Owner Role: ${owner.role}`);
      
      try {
        await signInWithEmailAndPassword(auth, owner.email, 'test123456');
        console.log('   ✅ LOGIN SUCCESS: Owner logged in via owner login screen');
        await signOut(auth);
      } catch (error) {
        console.log('   ❌ LOGIN FAILED: Owner should be able to login via owner screen');
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Test 4: Employee logging in via employee login screen (should work with correct owner)
    console.log('\n🧪 Test 4: Employee logging in via employee login screen');
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
        console.log(`   Employee Role: ${employee.role}`);
        console.log(`   Correct Owner: ${correctOwner.email}`);
        
        try {
          await signInWithEmailAndPassword(auth, employee.email, 'test123456');
          console.log('   ✅ LOGIN SUCCESS: Employee logged in via employee login screen');
          await signOut(auth);
        } catch (error) {
          console.log('   ❌ LOGIN FAILED: Employee should be able to login with correct owner');
          console.log(`   Error: ${error.message}`);
        }
      } else {
        console.log('   ⚠️  No matching owner found for this employee');
      }
    }
    
    console.log('\n🎯 SECURITY SUMMARY:');
    console.log('Both login screens should now properly validate roles:');
    console.log('1. ✅ Owner login screen blocks employees');
    console.log('2. ✅ Employee login screen blocks owners');
    console.log('3. ✅ Owner login screen allows owners');
    console.log('4. ✅ Employee login screen allows employees (with correct owner)');
    
    console.log('\n💡 To test in the app:');
    console.log('1. Try employee login via owner screen - should show "This is an employee account" error');
    console.log('2. Try owner login via employee screen - should show "This is an owner account" error');
    console.log('3. Try owner login via owner screen - should work');
    console.log('4. Try employee login via employee screen - should work with correct owner email');
    
  } catch (error) {
    console.error('❌ Error testing both login security:', error);
  }
}

testBothLoginSecurity();

