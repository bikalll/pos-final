// Script to check all employee accounts in the system
// Run this with: node check-employee-credentials.js

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs, orderBy, limit } = require('firebase/firestore');

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

async function checkEmployeeCredentials() {
  try {
    console.log('🔍 Checking all employee accounts in the system...\n');
    
    // Get all users with role 'employee'
    const usersRef = collection(firestore, 'users');
    const employeeQuery = query(usersRef, where('role', '==', 'employee'), orderBy('createdAt', 'desc'), limit(10));
    const employeeSnapshot = await getDocs(employeeQuery);
    
    if (employeeSnapshot.empty) {
      console.log('❌ No employee accounts found in the system');
      return;
    }
    
    console.log(`📋 Found ${employeeSnapshot.size} employee account(s):\n`);
    
    for (let i = 0; i < employeeSnapshot.docs.length; i++) {
      const doc = employeeSnapshot.docs[i];
      const employeeData = doc.data();
      
      console.log(`👤 Employee ${i + 1}:`);
      console.log(`   UID: ${employeeData.uid}`);
      console.log(`   Email: ${employeeData.email}`);
      console.log(`   Display Name: ${employeeData.displayName}`);
      console.log(`   Role: ${employeeData.role}`);
      console.log(`   Restaurant ID: ${employeeData.restaurantId}`);
      console.log(`   Is Active: ${employeeData.isActive}`);
      console.log(`   Created At: ${new Date(employeeData.createdAt).toLocaleString()}`);
      console.log(`   Created By: ${employeeData.createdBy}`);
      
      // Test login with this employee
      console.log(`   Testing login...`);
      try {
        await signInWithEmailAndPassword(auth, employeeData.email, 'test123456');
        console.log(`   ✅ Login successful with password: test123456`);
      } catch (loginError) {
        console.log(`   ❌ Login failed with test123456: ${loginError.code}`);
        
        // Try with common passwords
        const commonPasswords = ['password', '123456', 'real123456', 'test123456', 'employee123'];
        for (const pwd of commonPasswords) {
          try {
            await signInWithEmailAndPassword(auth, employeeData.email, pwd);
            console.log(`   ✅ Login successful with password: ${pwd}`);
            break;
          } catch (e) {
            // Continue trying other passwords
          }
        }
      }
      
      // Get the owner for this employee
      if (employeeData.createdBy) {
        const ownerDoc = await getDocs(query(usersRef, where('uid', '==', employeeData.createdBy)));
        if (!ownerDoc.empty) {
          const ownerData = ownerDoc.docs[0].data();
          console.log(`   Owner: ${ownerData.email} (${ownerData.displayName})`);
        }
      }
      
      console.log('   ' + '─'.repeat(50));
    }
    
    console.log('\n🎯 Instructions:');
    console.log('1. Look for the employee account you created');
    console.log('2. Note the exact email address (check for case sensitivity)');
    console.log('3. Note the password that worked for login');
    console.log('4. Use these exact credentials in the app');
    
  } catch (error) {
    console.error('❌ Error checking employee credentials:', error);
  }
}

checkEmployeeCredentials();

