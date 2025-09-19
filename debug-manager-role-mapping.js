// Debug script to check manager role mapping
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

async function debugManagerRoleMapping() {
  try {
    console.log('🔍 Debugging manager role mapping...\n');

    // Test with a manager account
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. Signing in as manager...');
    const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
    console.log('✅ Manager signed in successfully');
    console.log(`   UID: ${managerCredential.user.uid}`);
    console.log(`   Email: ${managerCredential.user.email}\n`);
    
    const user = managerCredential.user;
    
    // Check user metadata in users collection
    console.log('2. Checking user metadata in users collection...');
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User metadata found:');
      console.log(`   Email: ${userData.email}`);
      console.log(`   Role: "${userData.role}" (type: ${typeof userData.role})`);
      console.log(`   Restaurant ID: ${userData.restaurantId}`);
      console.log(`   Display Name: ${userData.displayName}`);
      console.log(`   Is Active: ${userData.isActive}\n`);
      
      // Check restaurant users mapping
      console.log('3. Checking restaurant users mapping...');
      try {
        const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
        if (restaurantUserDoc.exists()) {
          const restaurantUserData = restaurantUserDoc.data();
          console.log('✅ Restaurant user mapping found:');
          console.log(`   Role: "${restaurantUserData.role}" (type: ${typeof restaurantUserData.role})`);
          console.log(`   Email: ${restaurantUserData.email}`);
          console.log(`   Restaurant ID: ${restaurantUserData.restaurantId}\n`);
          
          // Test role mapping logic
          console.log('4. Testing role mapping logic...');
          let effectiveRole;
          
          // Step 1: Try restaurant users mapping first
          const mappedRole = (restaurantUserData?.role || '').toString();
          console.log(`   Restaurant role: "${mappedRole}"`);
          
          if (mappedRole === 'Owner' || mappedRole === 'Manager' || mappedRole === 'Staff') {
            effectiveRole = mappedRole;
            console.log(`   ✅ Using restaurant role: "${effectiveRole}"`);
          } else {
            console.log(`   ❌ Restaurant role "${mappedRole}" not recognized`);
          }
          
          // Step 2: Fallback to user metadata role
          if (!effectiveRole) {
            console.log('   Falling back to user metadata role...');
            if (userData.role === 'Owner') {
              effectiveRole = 'Owner';
            } else if (userData.role === 'manager') {
              effectiveRole = 'Manager';
            } else if (userData.role === 'staff' || userData.role === 'employee') {
              effectiveRole = 'Staff';
            } else {
              effectiveRole = 'Staff';
            }
            console.log(`   ✅ Using fallback role: "${effectiveRole}"`);
          }
          
          // Step 3: Test navigation logic
          console.log('\n5. Testing navigation logic...');
          console.log(`   Final effective role: "${effectiveRole}"`);
          console.log(`   userRole === 'Owner': ${effectiveRole === 'Owner'}`);
          console.log(`   userRole === 'Manager': ${effectiveRole === 'Manager'}`);
          
          const isOwnerLevel = effectiveRole === 'Owner' || effectiveRole === 'Manager';
          console.log(`   isOwnerLevel: ${isOwnerLevel}`);
          
          if (isOwnerLevel) {
            console.log('   ✅ Manager should see Receipts and Settings in navigation');
          } else {
            console.log('   ❌ Manager will NOT see Receipts and Settings in navigation');
            console.log('   ❌ This is the problem!');
          }
          
        } else {
          console.log('❌ No restaurant user mapping found');
          console.log('   → This would cause the role mapping to fail');
        }
      } catch (error) {
        console.log('❌ Error checking restaurant user mapping:', error.message);
      }
      
    } else {
      console.log('❌ User metadata not found in Firestore');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugManagerRoleMapping();

