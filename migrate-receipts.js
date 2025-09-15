/**
 * Migration script to move receipts from flat collection to nested structure
 * This will help move existing receipts to the new nested path structure
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } = require('firebase/firestore');

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

async function migrateReceipts() {
  console.log('🔄 Starting Receipt Migration...\n');

  try {
    // Step 1: Get all receipts from old flat collection
    console.log('📊 Step 1: Reading receipts from old flat collection...');
    const oldReceiptsCol = collection(db, 'receipts');
    const oldSnapshot = await getDocs(oldReceiptsCol);
    
    console.log(`Found ${oldSnapshot.size} receipts in old collection`);
    
    if (oldSnapshot.size === 0) {
      console.log('✅ No receipts to migrate');
      return;
    }

    // Step 2: Group receipts by restaurantId
    const receiptsByRestaurant = {};
    oldSnapshot.forEach(doc => {
      const data = doc.data();
      const restaurantId = data.restaurantId;
      
      if (!restaurantId) {
        console.log(`⚠️ Receipt ${doc.id} has no restaurantId - skipping`);
        return;
      }
      
      if (!receiptsByRestaurant[restaurantId]) {
        receiptsByRestaurant[restaurantId] = [];
      }
      
      receiptsByRestaurant[restaurantId].push({
        id: doc.id,
        data: data
      });
    });

    console.log('📊 Step 2: Grouped receipts by restaurant:');
    Object.keys(receiptsByRestaurant).forEach(restaurantId => {
      console.log(`  - ${restaurantId}: ${receiptsByRestaurant[restaurantId].length} receipts`);
    });

    // Step 3: Migrate receipts to nested structure
    console.log('\n📊 Step 3: Migrating receipts to nested structure...');
    let totalMigrated = 0;
    let totalErrors = 0;

    for (const [restaurantId, receipts] of Object.entries(receiptsByRestaurant)) {
      console.log(`\n🔄 Migrating receipts for restaurant: ${restaurantId}`);
      
      for (const receipt of receipts) {
        try {
          // Create new receipt in nested structure
          const newReceiptCol = collection(db, `restaurants/${restaurantId}/receipts`);
          const newReceiptData = {
            ...receipt.data,
            restaurantId: restaurantId, // Ensure restaurantId is set
            migratedAt: Date.now()
          };
          
          await addDoc(newReceiptCol, newReceiptData);
          console.log(`  ✅ Migrated receipt: ${receipt.id}`);
          totalMigrated++;
          
        } catch (error) {
          console.error(`  ❌ Failed to migrate receipt ${receipt.id}:`, error.message);
          totalErrors++;
        }
      }
    }

    // Step 4: Summary
    console.log('\n📋 Migration Summary:');
    console.log(`- Total receipts found: ${oldSnapshot.size}`);
    console.log(`- Successfully migrated: ${totalMigrated}`);
    console.log(`- Errors: ${totalErrors}`);
    
    if (totalErrors === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('⚠️ You can now delete the old flat collection if desired');
    } else {
      console.log('\n⚠️ Migration completed with errors. Check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateReceipts().catch(console.error);






















