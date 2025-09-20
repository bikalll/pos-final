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

async function checkDataState() {
  try {
    console.log('🔍 Checking current data state...');
    
    // Get restaurant ID from command line or use default
    const restaurantId = process.argv[2] || 'default-restaurant';
    console.log('🏪 Using restaurant ID:', restaurantId);
    
    // Check menu items
    console.log('\n📋 Checking Menu Items:');
    const menuRef = collection(firestore, 'restaurants', restaurantId, 'menu');
    const menuSnapshot = await getDocs(menuRef);
    
    if (menuSnapshot.size === 0) {
      console.log('❌ No menu items found!');
      console.log('💡 You need to create menu items first.');
      return;
    }
    
    console.log(`✅ Found ${menuSnapshot.size} menu items:`);
    let itemsWithIngredients = 0;
    let itemsWithoutIngredients = 0;
    
    menuSnapshot.forEach(doc => {
      const item = doc.data();
      const hasIngredients = item.ingredients && Array.isArray(item.ingredients) && item.ingredients.length > 0;
      
      if (hasIngredients) {
        itemsWithIngredients++;
        console.log(`   ✅ ${item.name} - ${item.ingredients.length} ingredients`);
        item.ingredients.forEach(ing => {
          console.log(`      • ${ing.name}: ${ing.quantity} ${ing.unit}`);
        });
      } else {
        itemsWithoutIngredients++;
        console.log(`   ❌ ${item.name} - No ingredients`);
      }
    });
    
    console.log(`\n📊 Menu Summary:`);
    console.log(`   Items with ingredients: ${itemsWithIngredients}`);
    console.log(`   Items without ingredients: ${itemsWithoutIngredients}`);
    
    // Check inventory items
    console.log('\n📦 Checking Inventory Items:');
    const inventoryRef = collection(firestore, 'restaurants', restaurantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    if (inventorySnapshot.size === 0) {
      console.log('❌ No inventory items found!');
      console.log('💡 You need to create inventory items first.');
    } else {
      console.log(`✅ Found ${inventorySnapshot.size} inventory items:`);
      inventorySnapshot.forEach(doc => {
        const item = doc.data();
        console.log(`   • ${item.name}: ${item.stockQuantity} ${item.unit} (Min: ${item.minStockLevel})`);
      });
    }
    
    // Check recent orders
    console.log('\n📋 Checking Recent Orders:');
    const ordersRef = collection(firestore, 'restaurants', restaurantId, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    if (ordersSnapshot.size === 0) {
      console.log('❌ No orders found!');
      console.log('💡 Create an order to test inventory deduction.');
    } else {
      console.log(`✅ Found ${ordersSnapshot.size} orders:`);
      let orderCount = 0;
      ordersSnapshot.forEach(doc => {
        if (orderCount < 3) { // Show only first 3 orders
          const order = doc.data();
          console.log(`   • Order ${order.id}: ${order.status} - ${order.items?.length || 0} items`);
          if (order.savedQuantities) {
            console.log(`     Saved quantities: ${Object.keys(order.savedQuantities).length} items`);
          }
        }
        orderCount++;
      });
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (itemsWithoutIngredients > 0) {
      console.log('   🔧 Run: node add-ingredients-to-menu.js ' + restaurantId);
    }
    if (inventorySnapshot.size === 0) {
      console.log('   🔧 Run: node add-inventory-items.js ' + restaurantId);
    }
    if (itemsWithIngredients > 0 && inventorySnapshot.size > 0) {
      console.log('   ✅ Data looks good! Try creating an order to test inventory deduction.');
      console.log('   📱 Check the app console for inventory deduction logs.');
    }
    
  } catch (error) {
    console.error('❌ Error checking data state:', error);
  }
}

// Run the function
checkDataState().then(() => {
  console.log('\n✅ Check completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
