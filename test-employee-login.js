// Test script to create test accounts for employee login testing
// Run this with: node test-employee-login.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, addDoc } = require('firebase/firestore');

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

async function createTestAccounts() {
  try {
    console.log('Creating test accounts...');
    
    // Test owner account
    const ownerEmail = 'test-owner@example.com';
    const ownerPassword = 'test123456';
    const ownerName = 'Test Owner';
    
    // Test employee account
    const employeeEmail = 'test-employee@example.com';
    const employeePassword = 'test123456';
    const employeeName = 'Test Employee';
    
    // Restaurant ID
    const restaurantId = 'test_restaurant_123';
    
    console.log('Creating owner account...');
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
    
    console.log('Creating restaurant data...');
    await setDoc(doc(firestore, 'restaurants', restaurantId), {
      id: restaurantId,
      name: 'Test Restaurant',
      address: '123 Test Street, Test City',
      phone: '+1234567890',
      createdAt: Date.now(),
      isActive: true
    });
    
    console.log('Creating employee account...');
    const employeeCredential = await createUserWithEmailAndPassword(auth, employeeEmail, employeePassword);
    const employeeUser = employeeCredential.user;
    
    // Create employee metadata
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
    
    console.log('✅ Test accounts created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Owner Account:');
    console.log(`  Email: ${ownerEmail}`);
    console.log(`  Password: ${ownerPassword}`);
    console.log(`  Restaurant ID: ${restaurantId}`);
    console.log('\nEmployee Account:');
    console.log(`  Email: ${employeeEmail}`);
    console.log(`  Password: ${employeePassword}`);
    console.log(`  Owner Email: ${ownerEmail}`);
    
    console.log('\n🧪 To test employee login:');
    console.log('1. Open the app');
    console.log('2. Go to Employee Login');
    console.log('3. Enter:');
    console.log(`   - Owner's Email: ${ownerEmail}`);
    console.log(`   - Your Email: ${employeeEmail}`);
    console.log(`   - Password: ${employeePassword}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    process.exit(1);
  }
}

createTestAccounts();

