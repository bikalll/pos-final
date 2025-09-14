// Detailed script to check all users and investigate missing owners
// Run this with: node check-all-users-detailed.js

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

async function checkAllUsersDetailed() {
  try {
    console.log('🔍 Checking ALL users in the system with detailed information...\n');
    
    // Get all users
    const usersRef = collection(firestore, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    
    if (allUsersSnapshot.empty) {
      console.log('❌ No user accounts found in the system');
      return;
    }
    
    console.log(`📋 Found ${allUsersSnapshot.size} total user account(s):\n`);
    
    const usersByRole = {
      owner: [],
      employee: [],
      other: []
    };
    
    // Categorize all users
    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();
      const role = userData.role || 'unknown';
      
      if (role === 'owner') {
        usersByRole.owner.push({ id: doc.id, ...userData });
      } else if (role === 'employee') {
        usersByRole.employee.push({ id: doc.id, ...userData });
      } else {
        usersByRole.other.push({ id: doc.id, ...userData });
      }
    });
    
    // Show owners
    console.log(`👑 OWNERS (${usersByRole.owner.length}):`);
    if (usersByRole.owner.length > 0) {
      usersByRole.owner.forEach((owner, index) => {
        console.log(`\n   Owner ${index + 1}:`);
        console.log(`   Document ID: ${owner.id}`);
        console.log(`   UID: ${owner.uid}`);
        console.log(`   Email: ${owner.email}`);
        console.log(`   Display Name: ${owner.displayName}`);
        console.log(`   Role: ${owner.role}`);
        console.log(`   Restaurant ID: ${owner.restaurantId}`);
        console.log(`   Is Active: ${owner.isActive}`);
        console.log(`   Created At: ${owner.createdAt ? new Date(owner.createdAt).toLocaleString() : 'Unknown'}`);
        console.log(`   Created By: ${owner.createdBy}`);
        console.log(`   Email Verified: ${owner.emailVerified || 'Unknown'}`);
      });
    } else {
      console.log('   No owners found');
    }
    
    // Show employees
    console.log(`\n👤 EMPLOYEES (${usersByRole.employee.length}):`);
    if (usersByRole.employee.length > 0) {
      usersByRole.employee.forEach((employee, index) => {
        console.log(`\n   Employee ${index + 1}:`);
        console.log(`   Document ID: ${employee.id}`);
        console.log(`   UID: ${employee.uid}`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Display Name: ${employee.displayName}`);
        console.log(`   Role: ${employee.role}`);
        console.log(`   Restaurant ID: ${employee.restaurantId}`);
        console.log(`   Is Active: ${employee.isActive}`);
        console.log(`   Created At: ${employee.createdAt ? new Date(employee.createdAt).toLocaleString() : 'Unknown'}`);
        console.log(`   Created By: ${employee.createdBy}`);
      });
    } else {
      console.log('   No employees found');
    }
    
    // Show other users
    if (usersByRole.other.length > 0) {
      console.log(`\n❓ OTHER USERS (${usersByRole.other.length}):`);
      usersByRole.other.forEach((user, index) => {
        console.log(`\n   User ${index + 1}:`);
        console.log(`   Document ID: ${user.id}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Display Name: ${user.displayName}`);
        console.log(`   Role: ${user.role || 'undefined'}`);
        console.log(`   Restaurant ID: ${user.restaurantId}`);
        console.log(`   Is Active: ${user.isActive}`);
        console.log(`   Created At: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}`);
        console.log(`   Created By: ${user.createdBy}`);
      });
    }
    
    // Check for potential issues
    console.log('\n🔍 POTENTIAL ISSUES:');
    
    // Check for users with missing roles
    const usersWithoutRole = usersByRole.other.filter(user => !user.role);
    if (usersWithoutRole.length > 0) {
      console.log(`   ⚠️  ${usersWithoutRole.length} user(s) have no role defined`);
    }
    
    // Check for users with invalid roles
    const usersWithInvalidRole = usersByRole.other.filter(user => user.role && !['owner', 'employee'].includes(user.role));
    if (usersWithInvalidRole.length > 0) {
      console.log(`   ⚠️  ${usersWithInvalidRole.length} user(s) have invalid roles: ${usersWithInvalidRole.map(u => u.role).join(', ')}`);
    }
    
    // Check for users with missing restaurant IDs
    const usersWithoutRestaurant = [...usersByRole.owner, ...usersByRole.employee].filter(user => !user.restaurantId);
    if (usersWithoutRestaurant.length > 0) {
      console.log(`   ⚠️  ${usersWithoutRestaurant.length} user(s) have no restaurant ID`);
    }
    
    console.log('\n🎯 Summary:');
    console.log(`   Total Users: ${allUsersSnapshot.size}`);
    console.log(`   Owners: ${usersByRole.owner.length}`);
    console.log(`   Employees: ${usersByRole.employee.length}`);
    console.log(`   Other: ${usersByRole.other.length}`);
    
    console.log('\n💡 If you expected more owners, check:');
    console.log('   1. Are they in the "OTHER USERS" section above?');
    console.log('   2. Do they have the correct role field?');
    console.log('   3. Are they in a different Firestore collection?');
    
  } catch (error) {
    console.error('❌ Error checking all users:', error);
  }
}

checkAllUsersDetailed();

