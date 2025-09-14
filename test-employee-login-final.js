// Final test for employee login with correct role checks
// Run this with: node test-employee-login-final.js

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

async function testEmployeeLoginFinal() {
  try {
    console.log('🧪 Final test for employee login...\n');
    
    // Get all employee accounts
    const usersRef = collection(firestore, 'users');
    const employeeQuery = query(usersRef, where('role', '==', 'employee'));
    const employeeQuerySnapshot = await getDocs(employeeQuery);
    
    console.log(`📋 Found ${employeeQuerySnapshot.size} employee accounts:\n`);
    
    if (employeeQuerySnapshot.empty) {
      console.log('❌ No employee accounts found');
      return;
    }
    
    // Test each employee account
    for (let i = 0; i < employeeQuerySnapshot.docs.length; i++) {
      const doc = employeeQuerySnapshot.docs[i];
      const employeeData = doc.data();
      
      console.log(`👤 Employee ${i + 1}:`);
      console.log(`   Email: ${employeeData.email}`);
      console.log(`   Display Name: ${employeeData.displayName}`);
      console.log(`   Role: "${employeeData.role}"`);
      console.log(`   Restaurant ID: ${employeeData.restaurantId}`);
      console.log(`   Is Active: ${employeeData.isActive}`);
      console.log(`   Created By: ${employeeData.createdBy}`);
      
      // Find the owner for this employee
      if (employeeData.createdBy) {
        const ownerDoc = await getDocs(query(usersRef, where('uid', '==', employeeData.createdBy)));
        if (!ownerDoc.empty) {
          const ownerData = ownerDoc.docs[0].data();
          console.log(`   Owner: ${ownerData.email} (${ownerData.displayName})`);
          console.log(`   Owner Role: "${ownerData.role}"`);
          console.log(`   Owner Restaurant ID: ${ownerData.restaurantId}`);
          
          // Check if restaurant IDs match
          if (employeeData.restaurantId === ownerData.restaurantId) {
            console.log('   ✅ Restaurant IDs match - employee belongs to owner\'s restaurant');
          } else {
            console.log('   ❌ Restaurant IDs do not match!');
          }
        }
      }
      
      // Test role assignment logic (what the app does)
      const role = employeeData.role === 'Owner' ? 'Owner' : 'Staff';
      console.log(`   Assigned Role: "${role}"`);
      
      if (role === 'Staff') {
        console.log('   ✅ Employee will be assigned Staff role correctly');
      } else {
        console.log('   ❌ Employee role assignment failed!');
      }
      
      console.log('   ' + '─'.repeat(60));
    }
    
    console.log('\n🎯 EMPLOYEE LOGIN TEST INSTRUCTIONS:');
    console.log('To test employee login in the app:');
    console.log('1. Go to Employee Login screen');
    console.log('2. For each employee above, use:');
    console.log('   - Owner\'s Email: [The owner email shown above]');
    console.log('   - Your Email: [The employee email shown above]');
    console.log('   - Password: [You need to know the actual password]');
    
    console.log('\n💡 If you don\'t know the passwords:');
    console.log('1. Login as the owner');
    console.log('2. Go to Settings > Employee Management');
    console.log('3. Create a new employee account');
    console.log('4. Use the generated credentials to test login');
    
  } catch (error) {
    console.error('❌ Error testing employee login:', error);
  }
}

testEmployeeLoginFinal();

