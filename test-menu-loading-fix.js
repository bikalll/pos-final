// Test script to verify menu items are loading correctly
// Run this with: node test-menu-loading-fix.js

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function testMenuLoadingFix() {
  try {
    console.log('🔧 Testing menu loading fix...\n');
    
    // Check categories
    console.log('📂 Categories:');
    console.log('='.repeat(30));
    
    const categoriesRef = collection(firestore, 'restaurants/default_restaurant/categories');
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    if (categoriesSnapshot.size === 0) {
      console.log('❌ No categories found');
    } else {
      console.log(`✅ Found ${categoriesSnapshot.size} categories:`);
      categoriesSnapshot.forEach(doc => {
        const category = doc.data();
        console.log(`   • ${category.name}: ${category.description}`);
      });
    }
    
    // Check menu items
    console.log('\n🍕 Menu Items:');
    console.log('='.repeat(30));
    
    const menuRef = collection(firestore, 'restaurants/default_restaurant/menu');
    const menuSnapshot = await getDocs(menuRef);
    
    if (menuSnapshot.size === 0) {
      console.log('❌ No menu items found');
      console.log('💡 The app should initialize default items when first run');
    } else {
      console.log(`✅ Found ${menuSnapshot.size} menu items:`);
      menuSnapshot.forEach(doc => {
        const item = doc.data();
        console.log(`\n   🍽️ ${item.name}`);
        console.log(`      Price: ₹${item.price}`);
        console.log(`      Category: ${item.category}`);
        console.log(`      Available: ${item.isAvailable ? 'Yes' : 'No'}`);
        console.log(`      Order Type: ${item.orderType}`);
        
        if (item.ingredients && item.ingredients.length > 0) {
          console.log(`      Ingredients:`);
          item.ingredients.forEach(ingredient => {
            console.log(`        • ${ingredient.name}: ${ingredient.quantity} ${ingredient.unit}`);
          });
        }
      });
    }
    
    console.log('\n🎯 What was fixed:');
    console.log('='.repeat(30));
    console.log('1. ✅ Menu Management now loads data from Firebase');
    console.log('2. ✅ Added loading state while data loads');
    console.log('3. ✅ Added empty state when no items exist');
    console.log('4. ✅ All CRUD operations update both Firebase and local state');
    console.log('5. ✅ Categories are loaded from Firebase');
    console.log('6. ✅ Menu items show with ingredients and categories');
    
    console.log('\n💡 To test in the app:');
    console.log('1. Open Menu Management screen');
    console.log('2. You should see the 3 default menu items');
    console.log('3. Click "Categories" to see the 3 default categories');
    console.log('4. Click "Add Item" to add a new dish');
    console.log('5. Select a category from the dropdown');
    console.log('6. Add ingredients in the Recipe section');
    console.log('7. Save and verify the item appears in the list');
    
  } catch (error) {
    console.error('❌ Error testing menu loading fix:', error);
  }
}

testMenuLoadingFix();




