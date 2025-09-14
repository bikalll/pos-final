// Debug script to check employee creation and login issues
// Run this with: node debug-employee-login.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

async function debugEmployeeLogin() {
  try {
    console.log('🔍 Debugging employee login issues...\n');
    
    // Test with the latest created accounts
    const ownerEmail = 'real-owner-1757150351102@example.com';
    const employeeEmail = 'real-employee-1757150351102@example.com';
    const password = 'real123456';
    
    console.log('📋 Testing with these credentials:');
    console.log(`Owner Email: ${ownerEmail}`);
    console.log(`Employee Email: ${employeeEmail}`);
    console.log(`Password: ${password}\n`);
    
    // First, check if the employee account exists in Firebase Auth
    console.log('1. Checking if employee account exists in Firebase Auth...');
    try {
      await signInWithEmailAndPassword(auth, employeeEmail, password);
      console.log('✅ Employee account exists and password is correct');
      
      // Get current user info
      const user = auth.currentUser;
      console.log('   User UID:', user.uid);
      console.log('   User Email:', user.email);
      console.log('   Email Verified:', user.emailVerified);
      
    } catch (authError) {
      console.log('❌ Firebase Auth error:', authError.code, authError.message);
      
      if (authError.code === 'auth/user-not-found') {
        console.log('   → Employee account does not exist in Firebase Auth');
      } else if (authError.code === 'auth/wrong-password') {
        console.log('   → Employee account exists but password is wrong');
      } else if (authError.code === 'auth/invalid-credential') {
        console.log('   → Invalid credential (email or password is wrong)');
      }
      
      return;
    }
    
    // Check user metadata in Firestore
    console.log('\n2. Checking employee metadata in Firestore...');
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ Employee metadata found:');
      console.log('   UID:', userData.uid);
      console.log('   Email:', userData.email);
      console.log('   Role:', userData.role);
      console.log('   Restaurant ID:', userData.restaurantId);
      console.log('   Display Name:', userData.displayName);
      console.log('   Is Active:', userData.isActive);
      console.log('   Created By:', userData.createdBy);
    } else {
      console.log('❌ Employee metadata not found in Firestore');
    }
    
    // Check owner metadata
    console.log('\n3. Checking owner metadata...');
    const usersRef = collection(firestore, 'users');
    const ownerQuery = query(usersRef, where('email', '==', ownerEmail));
    const ownerQuerySnapshot = await getDocs(ownerQuery);
    
    if (!ownerQuerySnapshot.empty) {
      const ownerDoc = ownerQuerySnapshot.docs[0];
      const ownerData = ownerDoc.data();
      console.log('✅ Owner metadata found:');
      console.log('   UID:', ownerData.uid);
      console.log('   Email:', ownerData.email);
      console.log('   Role:', ownerData.role);
      console.log('   Restaurant ID:', ownerData.restaurantId);
      
      // Check if restaurant IDs match
      if (userDoc.exists()) {
        const employeeData = userDoc.data();
        if (employeeData.restaurantId === ownerData.restaurantId) {
          console.log('✅ Restaurant IDs match - employee belongs to owner\'s restaurant');
        } else {
          console.log('❌ Restaurant IDs do not match:');
          console.log(`   Employee Restaurant ID: ${employeeData.restaurantId}`);
          console.log(`   Owner Restaurant ID: ${ownerData.restaurantId}`);
        }
      }
    } else {
      console.log('❌ Owner metadata not found');
    }
    
    // Test the actual login process that the app uses
    console.log('\n4. Testing the app\'s login process...');
    
    // Sign out first
    await signOut(auth);
    console.log('   Signed out from Firebase Auth');
    
    // Try to login as employee (this is what the app does)
    try {
      const employeeCredential = await signInWithEmailAndPassword(auth, employeeEmail, password);
      console.log('✅ Employee login successful!');
      
      // Now check if we can get user metadata (this is what the app does)
      const employeeUser = employeeCredential.user;
      const employeeMetadata = await getDoc(doc(firestore, 'users', employeeUser.uid));
      
      if (employeeMetadata.exists()) {
        const metadata = employeeMetadata.data();
        console.log('✅ User metadata retrieved successfully:');
        console.log('   Role:', metadata.role);
        console.log('   Restaurant ID:', metadata.restaurantId);
        console.log('   Display Name:', metadata.displayName);
        console.log('   Is Active:', metadata.isActive);
      } else {
        console.log('❌ Could not retrieve user metadata');
      }
      
    } catch (loginError) {
      console.log('❌ Employee login failed:', loginError.code, loginError.message);
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('If you see "✅ Employee login successful!" above, then the credentials are correct.');
    console.log('If you see an error, check the specific error code and message.');
    console.log('\nTo test in the app:');
    console.log('1. Go to Employee Login');
    console.log('2. Enter Owner Email:', ownerEmail);
    console.log('3. Enter Employee Email:', employeeEmail);
    console.log('4. Enter Password:', password);
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugEmployeeLogin();

