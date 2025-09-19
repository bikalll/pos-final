// Script to fix manager role mapping issues
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

async function fixManagerRoleMapping() {
  try {
    console.log('🔧 Fixing manager role mapping issues...\n');

    // Test with a manager account
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. Signing in as manager...');
    const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
    console.log('✅ Manager signed in successfully');
    console.log(`   UID: ${managerCredential.user.uid}`);
    console.log(`   Email: ${managerCredential.user.email}\n`);
    
    const user = managerCredential.user;
    
    // Check user metadata
    console.log('2. Checking user metadata...');
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User metadata found:');
      console.log(`   Role: "${userData.role}"`);
      console.log(`   Restaurant ID: ${userData.restaurantId}\n`);
      
      // Check restaurant users mapping
      console.log('3. Checking restaurant users mapping...');
      const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
      
      if (restaurantUserDoc.exists()) {
        const restaurantUserData = restaurantUserDoc.data();
        console.log('✅ Restaurant user mapping found:');
        console.log(`   Current role: "${restaurantUserData.role}"`);
        
        // Fix the role if it's wrong
        if (restaurantUserData.role !== 'Manager') {
          console.log('4. Fixing restaurant user role...');
          await setDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid), {
            ...restaurantUserData,
            role: 'Manager'
          });
          console.log('✅ Updated restaurant user role to "Manager"');
        } else {
          console.log('✅ Restaurant user role is already correct');
        }
        
      } else {
        console.log('❌ No restaurant user mapping found');
        console.log('4. Creating restaurant user mapping...');
        
        await setDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid), {
          id: user.uid,
          email: userData.email,
          restaurantId: userData.restaurantId,
          role: 'Manager'
        });
        console.log('✅ Created restaurant user mapping with role "Manager"');
      }
      
      // Verify the fix
      console.log('\n5. Verifying the fix...');
      const updatedRestaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
      
      if (updatedRestaurantUserDoc.exists()) {
        const updatedData = updatedRestaurantUserDoc.data();
        console.log('✅ Updated restaurant user mapping:');
        console.log(`   Role: "${updatedData.role}"`);
        
        // Test role mapping logic
        const mappedRole = (updatedData?.role || '').toString();
        if (mappedRole === 'Manager') {
          console.log('✅ Role mapping should now work correctly');
          console.log('✅ Manager should see Receipts and Settings in navigation');
        } else {
          console.log('❌ Role mapping still not working');
        }
      }
      
    } else {
      console.log('❌ User metadata not found in Firestore');
    }

    console.log('\n🎉 Manager role mapping fix completed!');
    console.log('✅ Manager should now see Receipts and Settings in navigation');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

// Run the fix
fixManagerRoleMapping();

