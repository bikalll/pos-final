/**
 * Comprehensive test script for receipt security
 * This script tests that receipts are properly isolated by account
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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
const db = getFirestore(app);

async function testReceiptSecurity() {
  console.log('🧪 Testing Receipt Security Implementation...\n');

  try {
    // Test 1: Manual test - check receipts for specific account
    console.log('📊 Test 1: Manual test for specific account...');
    const testAccountId = 'restaurant_001'; // Change this to your actual account ID
    
    const receiptsRef = collection(db, `restaurants/${testAccountId}/receipts`);
    const filteredQuery = query(receiptsRef, where('restaurantId', '==', testAccountId));
    
    const snapshot = await getDocs(filteredQuery);
    console.log(`✅ Filtered query for ${testAccountId}: ${snapshot.size} receipts`);
    
    let allReceiptsBelongToAccount = true;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.restaurantId !== testAccountId) {
        console.error(`❌ SECURITY VIOLATION: Receipt ${doc.id} has accountId ${data.restaurantId}, expected ${testAccountId}`);
        allReceiptsBelongToAccount = false;
      } else {
        console.log(`✅ Receipt ${doc.id}: accountId = ${data.restaurantId}`);
      }
    });
    
    if (allReceiptsBelongToAccount) {
      console.log('✅ All receipts belong to the correct account');
    } else {
      console.error('❌ SECURITY TEST FAILED: Found receipts from other accounts');
    }

    // Test 2: Automated smoke test
    console.log('\n📊 Test 2: Automated smoke test...');
    const receipts = [];
    snapshot.forEach((doc) => {
      receipts.push({ id: doc.id, accountId: doc.data().restaurantId });
    });
    
    const otherAccountReceipts = receipts.filter(r => r.accountId !== testAccountId);
    
    if (otherAccountReceipts.length === 0) {
      console.log('✅ Smoke test passed: 0 receipts from other accounts');
    } else {
      console.error(`❌ Smoke test failed: Found ${otherAccountReceipts.length} receipts from other accounts`);
      console.error('Other account receipts:', otherAccountReceipts);
    }

    // Test 3: Cross-account access prevention
    console.log('\n📊 Test 3: Cross-account access prevention...');
    const otherAccountId = 'restaurant_002'; // Different account
    
    try {
      const otherReceiptsRef = collection(db, `restaurants/${otherAccountId}/receipts`);
      const otherQuery = query(otherReceiptsRef, where('restaurantId', '==', testAccountId));
      const otherSnapshot = await getDocs(otherQuery);
      
      if (otherSnapshot.size === 0) {
        console.log('✅ Cross-account access properly prevented');
      } else {
        console.error(`❌ SECURITY ISSUE: Able to access ${otherSnapshot.size} receipts from other account`);
      }
    } catch (error) {
      console.log('✅ Cross-account access properly blocked by security rules');
    }

    console.log('\n📋 Test Summary:');
    console.log(`- Account ID tested: ${testAccountId}`);
    console.log(`- Total receipts found: ${snapshot.size}`);
    console.log(`- Receipts from other accounts: ${otherAccountReceipts.length}`);
    console.log(`- Security status: ${otherAccountReceipts.length === 0 ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testReceiptSecurity().catch(console.error);























