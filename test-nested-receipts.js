/**
 * Test script for nested receipts implementation
 * This script tests that receipts are properly isolated by restaurant using nested paths
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

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

async function testNestedReceipts() {
  console.log('🧪 Testing Nested Receipts Implementation...\n');

  try {
    // Test 1: Check receipts in nested path structure
    console.log('📊 Test 1: Checking nested path structure...');
    const testRestaurantId = 'restaurant_1757157396381_e5pqtm8tz'; // Change this to your actual restaurant ID
    
    const receiptsRef = collection(db, `restaurants/${testRestaurantId}/receipts`);
    const q = query(receiptsRef, orderBy("timestamp", "desc"));
    
    const snapshot = await getDocs(q);
    console.log(`✅ Nested path query for ${testRestaurantId}: ${snapshot.size} receipts`);
    
    let allReceiptsBelongToRestaurant = true;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.restaurantId && data.restaurantId !== testRestaurantId) {
        console.error(`❌ SECURITY VIOLATION: Receipt ${doc.id} has restaurantId ${data.restaurantId}, expected ${testRestaurantId}`);
        allReceiptsBelongToRestaurant = false;
      } else {
        console.log(`✅ Receipt ${doc.id}: restaurantId = ${data.restaurantId || 'undefined (legacy)'}`);
      }
    });
    
    if (allReceiptsBelongToRestaurant) {
      console.log('✅ All receipts belong to the correct restaurant');
    } else {
      console.error('❌ SECURITY TEST FAILED: Found receipts from other restaurants');
    }

    // Test 2: Check if old flat collection still exists
    console.log('\n📊 Test 2: Checking for old flat collection...');
    try {
      const oldReceiptsRef = collection(db, 'receipts');
      const oldSnapshot = await getDocs(oldReceiptsRef);
      console.log(`⚠️ Old flat collection 'receipts' still exists with ${oldSnapshot.size} documents`);
      console.log('   Consider migrating these to nested structure or removing them');
    } catch (error) {
      console.log('✅ Old flat collection does not exist or is not accessible');
    }

    // Test 3: Verify nested path structure
    console.log('\n📊 Test 3: Verifying nested path structure...');
    const receipts = [];
    snapshot.forEach((doc) => {
      receipts.push({ id: doc.id, restaurantId: doc.data().restaurantId });
    });
    
    const otherRestaurantReceipts = receipts.filter(r => r.restaurantId && r.restaurantId !== testRestaurantId);
    
    if (otherRestaurantReceipts.length === 0) {
      console.log('✅ Nested path isolation test passed: 0 receipts from other restaurants');
    } else {
      console.error(`❌ Nested path isolation test failed: Found ${otherRestaurantReceipts.length} receipts from other restaurants`);
      console.error('Other restaurant receipts:', otherRestaurantReceipts);
    }

    console.log('\n📋 Test Summary:');
    console.log(`- Restaurant ID tested: ${testRestaurantId}`);
    console.log(`- Total receipts found: ${snapshot.size}`);
    console.log(`- Receipts from other restaurants: ${otherRestaurantReceipts.length}`);
    console.log(`- Nested path structure: ${snapshot.size > 0 ? 'WORKING' : 'NO DATA'}`);
    console.log(`- Security status: ${otherRestaurantReceipts.length === 0 ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNestedReceipts().catch(console.error);






















