const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtcCbBOLmqsGZ_IPYIz0fhqYXTcWtlWJU",
  authDomain: "dbarbi-4c494.firebaseapp.com",
  projectId: "dbarbi-4c494",
  storageBucket: "dbarbi-4c494.firebasestorage.app",
  messagingSenderId: "44854741850",
  appId: "1:44854741850:android:acfd13df564f7265c34163"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function listRestaurants() {
  try {
    console.log('🔍 Listing all restaurants...');
    
    const restaurantsRef = collection(firestore, 'restaurants');
    const restaurantsSnapshot = await getDocs(restaurantsRef);
    
    if (restaurantsSnapshot.size === 0) {
      console.log('❌ No restaurants found!');
      console.log('💡 You need to create a restaurant first through the app.');
      return;
    }
    
    console.log(`✅ Found ${restaurantsSnapshot.size} restaurants:`);
    
    for (const docSnapshot of restaurantsSnapshot.docs) {
      const restaurantId = docSnapshot.id;
      const restaurantData = docSnapshot.data();
      
      console.log(`\n🏪 Restaurant ID: ${restaurantId}`);
      console.log(`   Name: ${restaurantData.name || 'Unknown'}`);
      console.log(`   Created: ${restaurantData.createdAt ? new Date(restaurantData.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}`);
      
      // Check menu items for this restaurant
      const menuRef = collection(firestore, 'restaurants', restaurantId, 'menu');
      const menuSnapshot = await getDocs(menuRef);
      console.log(`   Menu items: ${menuSnapshot.size}`);
      
      // Check inventory items for this restaurant
      const inventoryRef = collection(firestore, 'restaurants', restaurantId, 'inventory');
      const inventorySnapshot = await getDocs(inventoryRef);
      console.log(`   Inventory items: ${inventorySnapshot.size}`);
      
      // Check orders for this restaurant
      const ordersRef = collection(firestore, 'restaurants', restaurantId, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      console.log(`   Orders: ${ordersSnapshot.size}`);
      
      if (menuSnapshot.size > 0) {
        console.log(`   📋 Sample menu items:`);
        let count = 0;
        menuSnapshot.forEach(doc => {
          if (count < 3) {
            const item = doc.data();
            const hasIngredients = item.ingredients && Array.isArray(item.ingredients) && item.ingredients.length > 0;
            console.log(`      • ${item.name} ${hasIngredients ? `(${item.ingredients.length} ingredients)` : '(no ingredients)'}`);
            count++;
          }
        });
      }
    }
    
    console.log('\n💡 To check a specific restaurant, run:');
    console.log('   node check-data-state.js [restaurant-id]');
    console.log('\n💡 To add ingredients to menu items, run:');
    console.log('   node add-ingredients-to-menu.js [restaurant-id]');
    console.log('\n💡 To add inventory items, run:');
    console.log('   node add-inventory-items.js [restaurant-id]');
    
  } catch (error) {
    console.error('❌ Error listing restaurants:', error);
  }
}

// Run the function
listRestaurants().then(() => {
  console.log('\n✅ List completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ List failed:', error);
  process.exit(1);
});

