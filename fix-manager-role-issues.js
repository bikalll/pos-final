// Script to fix common manager role issues
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore');

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

async function fixManagerRoleIssues() {
  try {
    console.log('🔧 Fixing manager role issues...\n');

    // Test with a manager account
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. Signing in as manager...');
    const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
    console.log('✅ Manager signed in successfully');
    console.log(`   UID: ${managerCredential.user.uid}`);
    console.log(`   Email: ${managerCredential.user.email}\n`);
    
    const user = managerCredential.user;
    
    // Check current state
    console.log('2. Checking current state...');
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (!userDoc.exists()) {
      console.log('❌ User metadata not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log(`   Users collection role: "${userData.role}"`);
    console.log(`   Restaurant ID: ${userData.restaurantId}\n`);
    
    // Fix restaurant users mapping
    console.log('3. Fixing restaurant users mapping...');
    const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
    
    if (restaurantUserDoc.exists()) {
      const restaurantUserData = restaurantUserDoc.data();
      console.log(`   Current restaurant role: "${restaurantUserData.role}"`);
      
      // Update to correct role
      await setDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid), {
        ...restaurantUserData,
        role: 'Manager'
      });
      console.log('   ✅ Updated restaurant role to "Manager"');
    } else {
      console.log('   Creating restaurant user mapping...');
      await setDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid), {
        id: user.uid,
        email: userData.email,
        restaurantId: userData.restaurantId,
        role: 'Manager'
      });
      console.log('   ✅ Created restaurant user mapping with role "Manager"');
    }
    
    // Verify the fix
    console.log('\n4. Verifying the fix...');
    const updatedRestaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
    
    if (updatedRestaurantUserDoc.exists()) {
      const updatedData = updatedRestaurantUserDoc.data();
      console.log(`   Restaurant role: "${updatedData.role}"`);
      
      // Test the complete logic
      console.log('\n5. Testing complete logic...');
      
      // Test authentication service logic
      let effectiveRole = undefined;
      const mappedRole = (updatedData?.role || '').toString();
      if (mappedRole === 'Owner' || mappedRole === 'Manager' || mappedRole === 'Staff') {
        effectiveRole = mappedRole;
        console.log(`   ✅ Authentication service would use: "${effectiveRole}"`);
      } else {
        console.log(`   ❌ Authentication service would fallback to user metadata`);
        effectiveRole = userData.role === 'manager' ? 'Manager' : 'Staff';
        console.log(`   ✅ Fallback would use: "${effectiveRole}"`);
      }
      
      // Test navigation logic
      const isOwnerLevel = effectiveRole === 'Owner' || effectiveRole === 'Manager';
      console.log(`   ✅ Navigation isOwnerLevel: ${isOwnerLevel}`);
      
      if (isOwnerLevel) {
        console.log('   ✅ Manager should now see Receipts and Settings!');
      } else {
        console.log('   ❌ Manager still will not see Receipts and Settings');
      }
    }

    console.log('\n🎉 Manager role fix completed!');
    console.log('✅ Manager should now see Receipts and Settings in navigation');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

// Run the fix
fixManagerRoleIssues();
