// Test script to verify menu categories and ingredients functionality
// Run this with: node test-menu-categories-ingredients.js

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

async function testMenuCategoriesAndIngredients() {
  try {
    console.log('🍽️ Testing menu categories and ingredients functionality...\n');
    
    // Check categories
    console.log('📂 Checking Categories:');
    console.log('='.repeat(40));
    
    const categoriesRef = collection(firestore, 'restaurants/default_restaurant/categories');
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    if (categoriesSnapshot.size === 0) {
      console.log('❌ No categories found. The initialization might not have run yet.');
      console.log('💡 Try running the app to trigger the initialization.');
    } else {
      console.log(`✅ Found ${categoriesSnapshot.size} categories:`);
      categoriesSnapshot.forEach(doc => {
        const category = doc.data();
        console.log(`   • ${category.name}: ${category.description}`);
      });
    }
    
    // Check menu items
    console.log('\n🍕 Checking Menu Items:');
    console.log('='.repeat(40));
    
    const menuRef = collection(firestore, 'restaurants/default_restaurant/menu');
    const menuSnapshot = await getDocs(menuRef);
    
    if (menuSnapshot.size === 0) {
      console.log('❌ No menu items found. The initialization might not have run yet.');
      console.log('💡 Try running the app to trigger the initialization.');
    } else {
      console.log(`✅ Found ${menuSnapshot.size} menu items:`);
      menuSnapshot.forEach(doc => {
        const item = doc.data();
        console.log(`\n   🍽️ ${item.name}`);
        console.log(`      Description: ${item.description}`);
        console.log(`      Price: ₹${item.price}`);
        console.log(`      Category: ${item.category}`);
        console.log(`      Order Type: ${item.orderType}`);
        console.log(`      Available: ${item.isAvailable ? 'Yes' : 'No'}`);
        
        if (item.ingredients && item.ingredients.length > 0) {
          console.log(`      Ingredients:`);
          item.ingredients.forEach(ingredient => {
            console.log(`        • ${ingredient.name}: ${ingredient.quantity} ${ingredient.unit}`);
          });
        } else {
          console.log(`      Ingredients: None`);
        }
        
        if (item.modifiers && item.modifiers.length > 0) {
          console.log(`      Modifiers: ${item.modifiers.join(', ')}`);
        }
      });
    }
    
    console.log('\n🎯 Expected Features:');
    console.log('='.repeat(40));
    console.log('1. ✅ Category Management:');
    console.log('   - Add/Edit/Delete categories');
    console.log('   - Categories appear in dropdown when adding dishes');
    console.log('   - Categories used for filtering menu items');
    
    console.log('\n2. ✅ Ingredients Management:');
    console.log('   - Add ingredients with name, quantity, and unit');
    console.log('   - Remove ingredients with trash icon');
    console.log('   - Ingredients stored with each menu item');
    
    console.log('\n3. ✅ Firebase Integration:');
    console.log('   - Categories stored in Firebase');
    console.log('   - Menu items with ingredients stored in Firebase');
    console.log('   - Real-time updates when data changes');
    
    console.log('\n4. ✅ Default Data:');
    console.log('   - 3 default categories: Pizza, Salad, Beverages');
    console.log('   - 3 default menu items with ingredients');
    console.log('   - Data created when app first runs');
    
    console.log('\n💡 To test in the app:');
    console.log('1. Open Menu Management screen');
    console.log('2. Click "Categories" button to manage categories');
    console.log('3. Click "Add Item" to add a new dish');
    console.log('4. In the add dish modal:');
    console.log('   - Select category from dropdown');
    console.log('   - Add ingredients in the Recipe section');
    console.log('   - Save the item');
    console.log('5. Check that items are filtered by category');
    console.log('6. Verify data is saved to Firebase');
    
  } catch (error) {
    console.error('❌ Error testing menu categories and ingredients:', error);
  }
}

testMenuCategoriesAndIngredients();

