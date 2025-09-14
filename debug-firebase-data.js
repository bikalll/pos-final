// Debug script to check what's actually stored in Firebase
// Run this with: node debug-firebase-data.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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
const firestore = getFirestore(app);

async function debugFirebaseData() {
  try {
    console.log('🔍 Debugging Firebase data...\n');
    
    // Check menu items with full details
    console.log('🍕 Menu Items (Full Details):');
    console.log('='.repeat(50));
    
    const menuRef = collection(firestore, 'restaurants/default_restaurant/menu');
    const menuSnapshot = await getDocs(menuRef);
    
    if (menuSnapshot.size === 0) {
      console.log('❌ No menu items found');
    } else {
      console.log(`✅ Found ${menuSnapshot.size} menu items:`);
      menuSnapshot.forEach(doc => {
        const item = doc.data();
        console.log(`\n   🍽️ ${item.name} (ID: ${doc.id})`);
        console.log(`      Description: ${item.description}`);
        console.log(`      Price: ₹${item.price}`);
        console.log(`      Category: ${item.category}`);
        console.log(`      Available: ${item.isAvailable}`);
        console.log(`      Order Type: ${item.orderType}`);
        console.log(`      Modifiers: ${JSON.stringify(item.modifiers)}`);
        console.log(`      Image: ${item.image || 'None'}`);
        console.log(`      Ingredients: ${JSON.stringify(item.ingredients, null, 2)}`);
        console.log(`      All Fields: ${JSON.stringify(item, null, 2)}`);
      });
    }
    
    // Check categories
    console.log('\n📂 Categories:');
    console.log('='.repeat(30));
    
    const categoriesRef = collection(firestore, 'restaurants/default_restaurant/categories');
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    if (categoriesSnapshot.size === 0) {
      console.log('❌ No categories found');
    } else {
      console.log(`✅ Found ${categoriesSnapshot.size} categories:`);
      categoriesSnapshot.forEach(doc => {
        const category = doc.data();
        console.log(`   • ${category.name} (ID: ${doc.id})`);
        console.log(`     Description: ${category.description}`);
      });
    }
    
    // Check if there are any other collections
    console.log('\n🔍 All Collections in restaurants/default_restaurant:');
    console.log('='.repeat(50));
    
    // Note: We can't easily list all collections from client side
    // But we can check if the restaurant document exists
    const restaurantRef = doc(firestore, 'restaurants/default_restaurant');
    const restaurantSnap = await getDoc(restaurantRef);
    
    if (restaurantSnap.exists()) {
      console.log('✅ Restaurant document exists');
      console.log('Restaurant data:', JSON.stringify(restaurantSnap.data(), null, 2));
    } else {
      console.log('❌ Restaurant document does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error debugging Firebase data:', error);
  }
}

debugFirebaseData();




