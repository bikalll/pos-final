// Simple script to check employee accounts without requiring Firestore indexes
// Run this with: node check-employee-credentials-simple.js

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkEmployeeCredentialsSimple() {
  try {
    console.log('🔍 Checking all user accounts in the system...\n');
    
    // Get all users (this doesn't require an index)
    const usersRef = collection(firestore, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    
    if (allUsersSnapshot.empty) {
      console.log('❌ No user accounts found in the system');
      return;
    }
    
    console.log(`📋 Found ${allUsersSnapshot.size} user account(s):\n`);
    
    const employees = [];
    const owners = [];
    
    // Categorize users
    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.role === 'employee') {
        employees.push(userData);
      } else if (userData.role === 'owner') {
        owners.push(userData);
      }
    });
    
    console.log(`👥 Found ${employees.length} employee(s) and ${owners.length} owner(s)\n`);
    
    // Show employees
    if (employees.length > 0) {
      console.log('👤 EMPLOYEES:');
      for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        console.log(`\n   Employee ${i + 1}:`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Display Name: ${employee.displayName}`);
        console.log(`   Restaurant ID: ${employee.restaurantId}`);
        console.log(`   Is Active: ${employee.isActive}`);
        console.log(`   Created At: ${new Date(employee.createdAt).toLocaleString()}`);
        
        // Test login with this employee
        console.log(`   Testing login...`);
        const testPasswords = ['test123456', 'real123456', 'password', '123456', 'employee123'];
        let loginSuccessful = false;
        
        for (const pwd of testPasswords) {
          try {
            await signInWithEmailAndPassword(auth, employee.email, pwd);
            console.log(`   ✅ Login successful with password: ${pwd}`);
            loginSuccessful = true;
            break;
          } catch (e) {
            // Continue trying other passwords
          }
        }
        
        if (!loginSuccessful) {
          console.log(`   ❌ Login failed with all test passwords`);
        }
      }
    }
    
    // Show owners
    if (owners.length > 0) {
      console.log('\n👑 OWNERS:');
      for (let i = 0; i < owners.length; i++) {
        const owner = owners[i];
        console.log(`\n   Owner ${i + 1}:`);
        console.log(`   Email: ${owner.email}`);
        console.log(`   Display Name: ${owner.displayName}`);
        console.log(`   Restaurant ID: ${owner.restaurantId}`);
        console.log(`   Is Active: ${owner.isActive}`);
        console.log(`   Created At: ${new Date(owner.createdAt).toLocaleString()}`);
      }
    }
    
    console.log('\n🎯 Instructions:');
    console.log('1. Look for the employee account you created through Employee Management');
    console.log('2. Note the exact email address');
    console.log('3. Note the password that worked for login');
    console.log('4. Use these exact credentials in the app');
    console.log('5. Make sure to use the owner\'s email as the "Owner Email" field');
    
  } catch (error) {
    console.error('❌ Error checking employee credentials:', error);
  }
}

checkEmployeeCredentialsSimple();

