// Test script to verify real employee creation and login
// Run this with: node test-real-employee-creation.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

async function testRealEmployeeCreation() {
  try {
    console.log('Testing real employee creation and login...');
    
    // First, create a real owner account
    const ownerEmail = 'real-owner@example.com';
    const ownerPassword = 'real123456';
    const ownerName = 'Real Owner';
    const restaurantId = 'real_restaurant_456';
    
    console.log('Creating real owner account...');
    const ownerCredential = await createUserWithEmailAndPassword(auth, ownerEmail, ownerPassword);
    const ownerUser = ownerCredential.user;
    
    // Create owner metadata
    await setDoc(doc(firestore, 'users', ownerUser.uid), {
      uid: ownerUser.uid,
      email: ownerEmail,
      role: 'owner',
      restaurantId: restaurantId,
      displayName: ownerName,
      createdAt: Date.now(),
      isActive: true,
      createdBy: 'system'
    });
    
    // Create restaurant data
    await setDoc(doc(firestore, 'restaurants', restaurantId), {
      id: restaurantId,
      name: 'Real Test Restaurant',
      address: '456 Real Street, Real City',
      phone: '+1987654321',
      createdAt: Date.now(),
      isActive: true
    });
    
    // Create restaurant user mapping for owner
    await setDoc(doc(firestore, 'users', ownerUser.uid), {
      id: ownerUser.uid,
      email: ownerEmail,
      restaurantId: restaurantId,
      role: 'Owner',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    console.log('✅ Real owner account created successfully!');
    
    // Now create a real employee account (simulating the Employee Management screen)
    const employeeEmail = 'real-employee@example.com';
    const employeePassword = 'real123456';
    const employeeName = 'Real Employee';
    
    console.log('Creating real employee account...');
    const employeeCredential = await createUserWithEmailAndPassword(auth, employeeEmail, employeePassword);
    const employeeUser = employeeCredential.user;
    
    // Create employee metadata (simulating createUser method)
    await setDoc(doc(firestore, 'users', employeeUser.uid), {
      uid: employeeUser.uid,
      email: employeeEmail,
      role: 'employee',
      restaurantId: restaurantId,
      displayName: employeeName,
      createdAt: Date.now(),
      isActive: true,
      createdBy: ownerUser.uid
    });
    
    // Create restaurant user mapping for employee
    await setDoc(doc(firestore, 'users', employeeUser.uid), {
      id: employeeUser.uid,
      email: employeeEmail,
      restaurantId: restaurantId,
      role: 'Staff',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    console.log('✅ Real employee account created successfully!');
    
    // Test employee login
    console.log('Testing employee login...');
    
    // Sign out first
    await auth.signOut();
    
    // Try to login as employee
    const employeeLoginCredential = await signInWithEmailAndPassword(auth, employeeEmail, employeePassword);
    console.log('✅ Employee login successful!');
    
    // Verify user metadata
    const userMetadata = await getDoc(doc(firestore, 'users', employeeUser.uid));
    if (userMetadata.exists()) {
      const userData = userMetadata.data();
      console.log('Employee metadata:', {
        email: userData.email,
        role: userData.role,
        restaurantId: userData.restaurantId,
        displayName: userData.displayName,
        isActive: userData.isActive
      });
    }
    
    // Test owner metadata lookup by email
    console.log('Testing owner metadata lookup by email...');
    const usersRef = collection(firestore, 'users');
    const ownerQuery = query(usersRef, where('email', '==', ownerEmail));
    const ownerQuerySnapshot = await getDocs(ownerQuery);
    
    if (!ownerQuerySnapshot.empty) {
      const ownerDoc = ownerQuerySnapshot.docs[0];
      const ownerData = ownerDoc.data();
      console.log('Owner metadata found by email:', {
        email: ownerData.email,
        role: ownerData.role,
        restaurantId: ownerData.restaurantId
      });
    }
    
    console.log('\n📋 Real Test Credentials:');
    console.log('Owner Account:');
    console.log(`  Email: ${ownerEmail}`);
    console.log(`  Password: ${ownerPassword}`);
    console.log(`  Restaurant ID: ${restaurantId}`);
    console.log('\nEmployee Account:');
    console.log(`  Email: ${employeeEmail}`);
    console.log(`  Password: ${employeePassword}`);
    console.log(`  Owner Email: ${ownerEmail}`);
    
    console.log('\n🧪 To test real employee login:');
    console.log('1. Open the app');
    console.log('2. Go to Employee Login');
    console.log('3. Enter:');
    console.log(`   - Owner's Email: ${ownerEmail}`);
    console.log(`   - Your Email: ${employeeEmail}`);
    console.log(`   - Password: ${employeePassword}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing real employee creation:', error);
    process.exit(1);
  }
}

testRealEmployeeCreation();

