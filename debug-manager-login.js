// Debug script to check manager login issue
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

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

async function debugManagerLogin() {
  try {
    console.log('🔍 Debugging manager login issue...\n');

    // Test with a manager account
    const managerEmail = 'manager@example.com';
    const managerPassword = 'password123';
    
    console.log('1. Checking if manager account exists in Firebase Auth...');
    try {
      const managerCredential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
      console.log('✅ Manager signed in successfully');
      console.log(`   UID: ${managerCredential.user.uid}`);
      console.log(`   Email: ${managerCredential.user.email}\n`);
      
      const user = managerCredential.user;
      
      // Check user metadata in Firestore
      console.log('2. Checking user metadata in Firestore...');
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ User metadata found:');
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: "${userData.role}" (type: ${typeof userData.role})`);
        console.log(`   Restaurant ID: ${userData.restaurantId}`);
        console.log(`   Display Name: ${userData.displayName}`);
        console.log(`   Is Active: ${userData.isActive}\n`);
        
        // Check what the login screen logic would do
        console.log('3. Testing login screen logic...');
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
        
        // Check restaurant users mapping
        console.log('\n4. Checking restaurant users mapping...');
        try {
          const restaurantUserDoc = await getDoc(doc(firestore, `restaurants/${userData.restaurantId}/users`, user.uid));
          if (restaurantUserDoc.exists()) {
            const restaurantUserData = restaurantUserDoc.data();
            console.log('✅ Restaurant user mapping found:');
            console.log(`   Role: "${restaurantUserData.role}" (type: ${typeof restaurantUserData.role})`);
            console.log(`   Email: ${restaurantUserData.email}`);
          } else {
            console.log('❌ No restaurant user mapping found');
          }
        } catch (error) {
          console.log('❌ Error checking restaurant user mapping:', error.message);
        }
        
        // Check staff collection
        console.log('\n5. Checking staff collection...');
        try {
          const staffSnapshot = await getDocs(collection(firestore, `restaurants/${userData.restaurantId}/staff`));
          const staffMembers = [];
          staffSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.email === managerEmail || data.id === user.uid) {
              staffMembers.push(data);
            }
          });
          
          if (staffMembers.length > 0) {
            console.log('✅ Staff member found:');
            staffMembers.forEach(member => {
              console.log(`   Name: ${member.name}`);
              console.log(`   Role: "${member.role}" (type: ${typeof member.role})`);
              console.log(`   Email: ${member.email}`);
            });
          } else {
            console.log('❌ No matching staff member found');
          }
        } catch (error) {
          console.log('❌ Error checking staff collection:', error.message);
        }
        
      } else {
        console.log('❌ User metadata not found in Firestore');
        console.log('   → This would cause login to fail');
      }
      
    } catch (authError) {
      console.log('❌ Firebase Auth error:', authError.code, authError.message);
      
      if (authError.code === 'auth/user-not-found') {
        console.log('   → Manager account does not exist in Firebase Auth');
        console.log('   → Please create a manager account first');
      } else if (authError.code === 'auth/wrong-password') {
        console.log('   → Manager account exists but password is wrong');
      } else if (authError.code === 'auth/invalid-credential') {
        console.log('   → Invalid credential (email or password is wrong)');
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugManagerLogin();
