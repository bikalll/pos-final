// Test script to verify role consistency between users and staffs collections
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const { getDatabase, ref, get } = require('firebase/database');

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
const database = getDatabase(app);

async function testRoleConsistency() {
  try {
    console.log('🔍 Testing role consistency between users and staffs collections...\n');

    // Sign in as owner (replace with actual credentials)
    const ownerEmail = 'owner@example.com';
    const ownerPassword = 'password123';
    
    console.log('Signing in as owner...');
    const userCredential = await signInWithEmailAndPassword(auth, ownerEmail, ownerPassword);
    console.log('✅ Owner signed in successfully\n');

    // Get restaurant ID from user metadata
    const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
    const userData = userDoc.data();
    const restaurantId = userData?.restaurantId;
    
    if (!restaurantId) {
      throw new Error('No restaurant ID found for owner');
    }
    
    console.log(`Restaurant ID: ${restaurantId}\n`);

    // Get all users from the users collection
    console.log('📋 Checking users collection...');
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.restaurantId === restaurantId) {
        users.push({
          id: doc.id,
          email: data.email,
          role: data.role,
          displayName: data.displayName
        });
      }
    });

    console.log('Users in collection:');
    users.forEach(user => {
      console.log(`  - ${user.displayName} (${user.email}): role = "${user.role}"`);
    });

    // Get all staff from the staffs collection
    console.log('\n👥 Checking staffs collection...');
    const staffSnapshot = await getDocs(collection(firestore, `restaurants/${restaurantId}/staff`));
    const staff = [];
    staffSnapshot.forEach(doc => {
      const data = doc.data();
      staff.push({
        id: doc.id,
        email: data.email,
        role: data.role,
        name: data.name
      });
    });

    console.log('Staff in collection:');
    staff.forEach(member => {
      console.log(`  - ${member.name} (${member.email}): role = "${member.role}"`);
    });

    // Check for inconsistencies
    console.log('\n🔍 Checking for role inconsistencies...');
    let inconsistencies = 0;

    for (const user of users) {
      if (user.role === 'employee') {
        console.log(`❌ INCONSISTENCY: User ${user.displayName} has role "employee" in users collection`);
        inconsistencies++;
      }
    }

    for (const member of staff) {
      const correspondingUser = users.find(u => u.email === member.email || u.id === member.id);
      if (correspondingUser) {
        const expectedUserRole = member.role.toLowerCase();
        if (correspondingUser.role !== expectedUserRole) {
          console.log(`❌ INCONSISTENCY: ${member.name} - users collection has "${correspondingUser.role}" but staffs collection has "${member.role}"`);
          inconsistencies++;
        }
      }
    }

    if (inconsistencies === 0) {
      console.log('✅ All roles are consistent between collections!');
    } else {
      console.log(`❌ Found ${inconsistencies} inconsistencies`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRoleConsistency();

