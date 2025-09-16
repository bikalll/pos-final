/**
 * Debug script to check what's actually in Firestore
 * This will help us understand why the filtering isn't working
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

async function debugFirestoreData() {
  console.log('🔍 Debugging Firestore Data...\n');

  try {
    // Test 1: Check all receipts in all restaurants
    console.log('📊 Test 1: Checking all receipts in all restaurants...');
    
    const allReceiptsRef = collection(db, 'restaurants');
    const allRestaurantsSnapshot = await getDocs(allReceiptsRef);
    
    console.log('Total restaurants found:', allRestaurantsSnapshot.size);
    
    allRestaurantsSnapshot.forEach((restaurantDoc) => {
      console.log(`\n🏪 Restaurant: ${restaurantDoc.id}`);
      
      // Check receipts for this restaurant
      const receiptsRef = collection(db, `restaurants/${restaurantDoc.id}/receipts`);
      getDocs(receiptsRef).then((receiptsSnapshot) => {
        console.log(`  📄 Receipts count: ${receiptsSnapshot.size}`);
        
        receiptsSnapshot.forEach((receiptDoc) => {
          const receiptData = receiptDoc.data();
          console.log(`    - Receipt ${receiptDoc.id}:`, {
            restaurantId: receiptData.restaurantId,
            customerName: receiptData.customerName,
            amount: receiptData.amount
          });
        });
      }).catch(error => {
        console.log(`  ❌ Error fetching receipts for ${restaurantDoc.id}:`, error.message);
      });
    });

    // Test 2: Try a specific restaurant query
    console.log('\n📊 Test 2: Testing specific restaurant query...');
    const testRestaurantId = 'restaurant_001'; // Change this to your actual restaurant ID
    
    try {
      const receiptsRef = collection(db, `restaurants/${testRestaurantId}/receipts`);
      const filteredQuery = query(receiptsRef, where('restaurantId', '==', testRestaurantId));
      
      const filteredSnapshot = await getDocs(filteredQuery);
      console.log(`Filtered query for ${testRestaurantId}:`, filteredSnapshot.size, 'receipts');
      
      filteredSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${doc.id}: restaurantId=${data.restaurantId}`);
      });
      
    } catch (error) {
      console.log('❌ Filtered query failed:', error.message);
    }

    // Test 3: Check without filter
    console.log('\n📊 Test 3: Testing without filter...');
    try {
      const receiptsRef = collection(db, `restaurants/${testRestaurantId}/receipts`);
      const allSnapshot = await getDocs(receiptsRef);
      console.log(`All receipts for ${testRestaurantId}:`, allSnapshot.size, 'receipts');
      
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${doc.id}: restaurantId=${data.restaurantId}`);
      });
      
    } catch (error) {
      console.log('❌ Unfiltered query failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugFirestoreData().catch(console.error);























