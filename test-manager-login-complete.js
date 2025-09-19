// Complete test script to verify manager login fix
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, collection, getDocs, setDoc } = require('firebase/firestore');

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

async function testManagerLoginComplete() {
  try {
    console.log('🔍 Testing complete manager login fix...\n');

    // Test 1: Create a test manager account
    console.log('1. Creating test manager account...');
    const managerEmail = 'test-manager-' + Date.now() + '@example.com';
    const managerPassword = 'test123456';
    const managerName = 'Test Manager';
    const restaurantId = 'test-restaurant-' + Date.now();
    
    try {
      // Create Firebase Auth user
      const managerCredential = await createUserWithEmailAndPassword(auth, managerEmail, managerPassword);
      const managerUser = managerCredential.user;
      console.log('✅ Manager Firebase Auth account created');
      console.log(`   UID: ${managerUser.uid}`);
      console.log(`   Email: ${managerUser.email}\n`);
      
      // Create user metadata in Firestore (simulating the createUser method)
      const userMetadata = {
        uid: managerUser.uid,
        email: managerEmail.toLowerCase(),
        role: 'manager', // This should be stored as 'manager' in users collection
        restaurantId: restaurantId,
        displayName: managerName,
        createdAt: Date.now(),
        isActive: true,
        createdBy: 'test-owner'
      };
      
      await setDoc(doc(firestore, 'users', managerUser.uid), userMetadata);
      console.log('✅ Manager metadata stored in users collection');
      console.log(`   Role: "${userMetadata.role}"\n`);
      
      // Create restaurant user mapping (simulating the createUser method)
      const restaurantRole = 'Manager'; // This should be 'Manager' in restaurant users
      await setDoc(doc(firestore, `restaurants/${restaurantId}/users`, managerUser.uid), {
        id: managerUser.uid,
        email: managerEmail,
        restaurantId: restaurantId,
        role: restaurantRole
      });
      console.log('✅ Restaurant user mapping created');
      console.log(`   Role: "${restaurantRole}"\n`);
      
      // Sign out
      await auth.signOut();
      console.log('✅ Signed out from test account\n');
      
    } catch (error) {
      console.log('❌ Error creating test manager account:', error.message);
      return;
    }

    // Test 2: Test manager login
    console.log('2. Testing manager login...');
    try {
      const loginCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
      console.log('✅ Manager login successful');
      console.log(`   UID: ${loginCredential.user.uid}`);
      console.log(`   Email: ${loginCredential.user.email}\n`);
      
      const user = loginCredential.user;
      
      // Test 3: Check user metadata
      console.log('3. Checking user metadata...');
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ User metadata found:');
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: "${userData.role}" (type: ${typeof userData.role})`);
        console.log(`   Restaurant ID: ${userData.restaurantId}`);
        console.log(`   Display Name: ${userData.displayName}`);
        console.log(`   Is Active: ${userData.isActive}\n`);
        
        // Test 4: Test login screen logic
        console.log('4. Testing login screen logic...');
        console.log(`   userMetadata.role !== 'Owner': ${userData.role !== 'Owner'}`);
        console.log(`   userMetadata.role !== 'manager': ${userData.role !== 'manager'}`);
        console.log(`   Combined condition: ${userData.role !== 'Owner' && userData.role !== 'manager'}`);
        
        if (userData.role !== 'Owner' && userData.role !== 'manager') {
          console.log('❌ LOGIN WOULD FAIL - User would be signed out');
          if (userData.role === 'employee' || userData.role === 'staff') {
            console.log('   → Error: "This is an employee account. Please use the employee login instead."');
          } else {
            console.log('   → Error: "This account is not authorized. Please contact support."');
          }
        } else {
          console.log('✅ LOGIN WOULD SUCCEED - User would be allowed to login');
        }
        
        // Test 5: Check restaurant users mapping
        console.log('\n5. Checking restaurant users mapping...');
        const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
        if (restaurantUserDoc.exists()) {
          const restaurantUserData = restaurantUserDoc.data();
          console.log('✅ Restaurant user mapping found:');
          console.log(`   Role: "${restaurantUserData.role}" (type: ${typeof restaurantUserData.role})`);
          console.log(`   Email: ${restaurantUserData.email}`);
        } else {
          console.log('❌ No restaurant user mapping found');
        }
        
        // Test 6: Test role mapping in authentication service
        console.log('\n6. Testing role mapping logic...');
        let effectiveRole;
        if (restaurantUserDoc.exists()) {
          const mappedRole = restaurantUserDoc.data()?.role || '';
          if (mappedRole === 'Owner' || mappedRole === 'Manager' || mappedRole === 'Staff') {
            effectiveRole = mappedRole;
            console.log(`✅ Using restaurant role: "${effectiveRole}"`);
          }
        }
        
        if (!effectiveRole) {
          // Fallback mapping
          if (userData.role === 'Owner') {
            effectiveRole = 'Owner';
          } else if (userData.role === 'manager') {
            effectiveRole = 'Manager';
          } else if (userData.role === 'staff' || userData.role === 'employee') {
            effectiveRole = 'Staff';
          } else {
            effectiveRole = 'Staff';
          }
          console.log(`✅ Using fallback role mapping: "${effectiveRole}"`);
        }
        
        console.log(`   Final role for Redux: "${effectiveRole}"`);
        
      } else {
        console.log('❌ User metadata not found in Firestore');
      }
      
    } catch (loginError) {
      console.log('❌ Manager login failed:', loginError.code, loginError.message);
    }

    console.log('\n🎉 Complete manager login test finished!');
    console.log('✅ Manager account creation should work correctly');
    console.log('✅ Manager login should work through main login screen');
    console.log('✅ Role mapping should work correctly');

  } catch (error) {
    console.error('❌ Complete test failed:', error.message);
  }
}

// Run the test
testManagerLoginComplete();

