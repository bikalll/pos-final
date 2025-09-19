// Simple script to check the exact manager role value
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

async function checkManagerRoleValue() {
  try {
    console.log('🔍 Checking exact manager role value...\n');

    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. Signing in as manager...');
    const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
    console.log('✅ Manager signed in successfully\n');
    
    const user = managerCredential.user;
    
    // Check users collection
    console.log('2. Checking users collection...');
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User metadata:');
      console.log(`   Role: "${userData.role}"`);
      console.log(`   Role length: ${userData.role.length}`);
      console.log(`   Role char codes: ${Array.from(userData.role).map(c => c.charCodeAt(0)).join(', ')}`);
      console.log(`   Restaurant ID: ${userData.restaurantId}\n`);
      
      // Check restaurant users mapping
      console.log('3. Checking restaurant users mapping...');
      const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
      
      if (restaurantUserDoc.exists()) {
        const restaurantUserData = restaurantUserDoc.data();
        console.log('✅ Restaurant user mapping:');
        console.log(`   Role: "${restaurantUserData.role}"`);
        console.log(`   Role length: ${restaurantUserData.role.length}`);
        console.log(`   Role char codes: ${Array.from(restaurantUserData.role).map(c => c.charCodeAt(0)).join(', ')}\n`);
        
        // Test role mapping logic
        console.log('4. Testing role mapping logic...');
        let effectiveRole = undefined;
        
        // Step 1: Try restaurant users mapping
        const mappedRole = (restaurantUserData?.role || '').toString();
        console.log(`   Restaurant role: "${mappedRole}"`);
        
        if (mappedRole === 'Owner' || mappedRole === 'Manager' || mappedRole === 'Staff') {
          effectiveRole = mappedRole;
          console.log(`   ✅ Using restaurant role: "${effectiveRole}"`);
        } else {
          console.log(`   ❌ Restaurant role not recognized: "${mappedRole}"`);
        }
        
        // Step 2: Fallback to user metadata
        if (!effectiveRole) {
          console.log('   Falling back to user metadata...');
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
        
        // Test navigation logic
        console.log('\n5. Testing navigation logic...');
        console.log(`   Final effective role: "${effectiveRole}"`);
        console.log(`   effectiveRole === 'Owner': ${effectiveRole === 'Owner'}`);
        console.log(`   effectiveRole === 'Manager': ${effectiveRole === 'Manager'}`);
        
        const isOwnerLevel = effectiveRole === 'Owner' || effectiveRole === 'Manager';
        console.log(`   isOwnerLevel: ${isOwnerLevel}`);
        
        if (isOwnerLevel) {
          console.log('   ✅ Manager should see Receipts and Settings');
        } else {
          console.log('   ❌ Manager will NOT see Receipts and Settings');
          console.log(`   ❌ Problem: effectiveRole is "${effectiveRole}" instead of "Manager"`);
        }
        
        // Check for common issues
        console.log('\n6. Checking for common issues...');
        
        // Check if role has extra spaces or characters
        if (effectiveRole && effectiveRole.trim() !== effectiveRole) {
          console.log('   ⚠️  Role has leading/trailing spaces');
        }
        
        // Check if role is exactly 'Manager'
        if (effectiveRole === 'Manager') {
          console.log('   ✅ Role is exactly "Manager"');
        } else {
          console.log(`   ❌ Role is not exactly "Manager" (it's "${effectiveRole}")`);
        }
        
        // Check case sensitivity
        if (effectiveRole && effectiveRole.toLowerCase() === 'manager') {
          console.log('   ⚠️  Role is lowercase "manager" instead of "Manager"');
        }
        
      } else {
        console.log('❌ No restaurant user mapping found');
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkManagerRoleValue();

