// Script to check role case sensitivity issues
// Run this with: node check-role-case-sensitivity.js

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

async function checkRoleCaseSensitivity() {
  try {
    console.log('🔍 Checking role case sensitivity issues...\n');
    
    // Get all users
    const usersRef = collection(firestore, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    
    console.log(`📋 Found ${allUsersSnapshot.size} total user account(s):\n`);
    
    const roleCounts = {};
    const usersByExactRole = {};
    
    // Analyze all users
    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();
      const role = userData.role || 'undefined';
      
      // Count roles
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      
      // Group by exact role
      if (!usersByExactRole[role]) {
        usersByExactRole[role] = [];
      }
      usersByExactRole[role].push({
        id: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        restaurantId: userData.restaurantId
      });
    });
    
    console.log('📊 ROLE DISTRIBUTION:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   "${role}": ${count} user(s)`);
    });
    
    console.log('\n👥 USERS BY EXACT ROLE:');
    Object.entries(usersByExactRole).forEach(([role, users]) => {
      console.log(`\n   Role: "${role}" (${users.length} users)`);
      users.forEach((user, index) => {
        console.log(`     ${index + 1}. ${user.email} (${user.displayName}) - Restaurant: ${user.restaurantId}`);
      });
    });
    
    // Check for case sensitivity issues
    console.log('\n🔍 CASE SENSITIVITY ANALYSIS:');
    
    const ownerVariations = ['owner', 'Owner', 'OWNER'];
    const employeeVariations = ['employee', 'Employee', 'EMPLOYEE'];
    
    console.log('   Owner variations found:');
    ownerVariations.forEach(variation => {
      if (roleCounts[variation]) {
        console.log(`     ✅ "${variation}": ${roleCounts[variation]} user(s)`);
      } else {
        console.log(`     ❌ "${variation}": 0 user(s)`);
      }
    });
    
    console.log('   Employee variations found:');
    employeeVariations.forEach(variation => {
      if (roleCounts[variation]) {
        console.log(`     ✅ "${variation}": ${roleCounts[variation]} user(s)`);
      } else {
        console.log(`     ❌ "${variation}": 0 user(s)`);
      }
    });
    
    // Show the actual owner accounts (all variations)
    console.log('\n👑 ALL OWNER ACCOUNTS (all case variations):');
    const allOwners = [];
    ownerVariations.forEach(variation => {
      if (usersByExactRole[variation]) {
        allOwners.push(...usersByExactRole[variation].map(user => ({ ...user, role: variation })));
      }
    });
    
    if (allOwners.length > 0) {
      allOwners.forEach((owner, index) => {
        console.log(`\n   Owner ${index + 1}:`);
        console.log(`   Email: ${owner.email}`);
        console.log(`   Display Name: ${owner.displayName}`);
        console.log(`   Role: "${owner.role}"`);
        console.log(`   Restaurant ID: ${owner.restaurantId}`);
      });
    } else {
      console.log('   No owner accounts found');
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('1. The app should use consistent case for roles');
    console.log('2. All role comparisons should be case-insensitive');
    console.log('3. Consider normalizing all roles to lowercase when saving');
    
  } catch (error) {
    console.error('❌ Error checking role case sensitivity:', error);
  }
}

checkRoleCaseSensitivity();

