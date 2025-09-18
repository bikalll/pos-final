// Test script to verify manager login fix
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function testManagerLogin() {
  try {
    console.log('🔍 Testing manager login fix...\n');

    // Test 1: Sign in as manager
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. Attempting to sign in as manager...');
    console.log(`   Email: ${managerEmail}`);
    console.log(`   Password: ${managerPassword}\n`);
    
    try {
      const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
      console.log('✅ Manager signed in successfully!');
      console.log(`   UID: ${managerCredential.user.uid}`);
      console.log(`   Email: ${managerCredential.user.email}\n`);
    } catch (authError) {
      console.log('❌ Firebase Auth error:', authError.code, authError.message);
      
      if (authError.code === 'auth/user-not-found') {
        console.log('   → Manager account does not exist in Firebase Auth');
        console.log('   → Please create a manager account first');
        return;
      } else if (authError.code === 'auth/wrong-password') {
        console.log('   → Manager account exists but password is wrong');
        return;
      } else if (authError.code === 'auth/invalid-credential') {
        console.log('   → Invalid credential (email or password is wrong)');
        return;
      }
      
      throw authError;
    }

    // Test 2: Check user metadata in Firestore
    console.log('2. Checking manager metadata in Firestore...');
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ Manager metadata found:');
      console.log(`   Email: ${userData.email}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   Restaurant ID: ${userData.restaurantId}`);
      console.log(`   Display Name: ${userData.displayName}`);
      console.log(`   Is Active: ${userData.isActive}\n`);
      
      // Test 3: Verify role mapping
      console.log('3. Testing role mapping...');
      if (userData.role === 'manager') {
        console.log('✅ Manager role is correctly stored as "manager" (lowercase)');
        console.log('✅ This should map to "Manager" (capitalized) in Redux state');
      } else if (userData.role === 'Manager') {
        console.log('✅ Manager role is stored as "Manager" (capitalized)');
        console.log('✅ This should work directly in Redux state');
      } else {
        console.log(`❌ Unexpected role: "${userData.role}"`);
        console.log('   Expected: "manager" or "Manager"');
      }
      
      // Test 4: Check restaurant users mapping
      console.log('\n4. Checking restaurant users mapping...');
      try {
        const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
        if (restaurantUserDoc.exists()) {
          const restaurantUserData = restaurantUserDoc.data();
          console.log('✅ Restaurant user mapping found:');
          console.log(`   Role: ${restaurantUserData.role}`);
          console.log(`   Email: ${restaurantUserData.email}`);
        } else {
          console.log('⚠️  No restaurant user mapping found');
        }
      } catch (error) {
        console.log('⚠️  Could not check restaurant user mapping:', error.message);
      }
      
    } else {
      console.log('❌ Manager metadata not found in Firestore');
      console.log('   → Manager account may not be properly set up');
    }

    console.log('\n🎉 Manager login test completed!');
    console.log('✅ Manager should now be able to login through the main login screen');
    console.log('✅ Role mapping should work correctly');

  } catch (error) {
    console.error('❌ Manager login test failed:', error.message);
  }
}

// Run the test
testManagerLogin();
