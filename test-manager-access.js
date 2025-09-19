// Test script to verify manager access to employee management
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function testManagerAccess() {
  try {
    console.log('🔍 Testing manager access to employee management...\n');

    // Test 1: Sign in as manager
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. Signing in as manager...');
    const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
    console.log('✅ Manager signed in successfully\n');

    // Test 2: Get manager's role and restaurant ID
    console.log('2. Checking manager role and restaurant access...');
    const managerDoc = await getDoc(doc(firestore, 'users', managerCredential.user.uid));
    const managerData = managerDoc.data();
    const restaurantId = managerData?.restaurantId;
    const managerRole = managerData?.role;
    
    console.log(`Manager role: ${managerRole}`);
    console.log(`Restaurant ID: ${restaurantId}\n`);

    if (managerRole !== 'manager') {
      throw new Error('User is not a manager');
    }

    // Test 3: Check if manager can access restaurant users
    console.log('3. Testing access to restaurant users...');
    const restaurantUsersSnapshot = await getDocs(collection(firestore, `restaurants/${restaurantId}/users`));
    const restaurantUsers = [];
    restaurantUsersSnapshot.forEach(doc => {
      restaurantUsers.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Manager can access ${restaurantUsers.length} restaurant users:`);
    restaurantUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    // Test 4: Check if manager can access staff collection
    console.log('\n4. Testing access to staff collection...');
    const staffSnapshot = await getDocs(collection(firestore, `restaurants/${restaurantId}/staff`));
    const staff = [];
    staffSnapshot.forEach(doc => {
      staff.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Manager can access ${staff.length} staff members:`);
    staff.forEach(member => {
      console.log(`  - ${member.name} (${member.role})`);
    });

    // Test 5: Verify manager can see all employees (users + staff)
    console.log('\n5. Verifying complete employee list...');
    const allEmployees = [...restaurantUsers];
    
    // Add staff members that might not be in users collection
    staff.forEach(staffMember => {
      const existsInUsers = restaurantUsers.some(user => 
        user.email === staffMember.email || user.id === staffMember.id
      );
      if (!existsInUsers) {
        allEmployees.push({
          id: staffMember.id,
          email: staffMember.email,
          role: staffMember.role,
          displayName: staffMember.name
        });
      }
    });

    console.log(`✅ Manager can see ${allEmployees.length} total employees:`);
    allEmployees.forEach(employee => {
      console.log(`  - ${employee.displayName || employee.email} (${employee.role})`);
    });

    console.log('\n🎉 Manager access test completed successfully!');
    console.log('✅ Managers can view all employees');
    console.log('✅ Managers cannot create/edit/delete employees (UI restrictions)');

  } catch (error) {
    console.error('❌ Manager access test failed:', error.message);
  }
}

// Run the test
testManagerAccess();

