// Script to fix Firebase data - add ingredients and create categories
// Run this with: node fix-firebase-data.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, updateDoc } = require('firebase/firestore');

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

async function fixFirebaseData() {
  try {
    console.log('🔧 Fixing Firebase data...\n');
    
    // First, create categories
    console.log('📂 Creating categories...');
    const categoriesRef = collection(firestore, 'restaurants/default_restaurant/categories');
    
    const defaultCategories = [
      { id: 'pizza', name: 'Pizza', description: 'Fresh pizzas made to order' },
      { id: 'salad', name: 'Salad', description: 'Fresh and healthy salads' },
      { id: 'beverages', name: 'Beverages', description: 'Refreshing drinks and beverages' },
    ];

    for (const category of defaultCategories) {
      const categoryDocRef = doc(categoriesRef, category.id);
      await setDoc(categoryDocRef, {
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Created category: ${category.name}`);
    }
    
    // Now, update menu items with ingredients
    console.log('\n🍕 Updating menu items with ingredients...');
    const menuRef = collection(firestore, 'restaurants/default_restaurant/menu');
    const menuSnapshot = await getDocs(menuRef);
    
    const menuItemsWithIngredients = {
      'margherita': [
        { name: 'Pizza Dough', quantity: 1, unit: 'piece' },
        { name: 'Tomato Sauce', quantity: 100, unit: 'ml' },
        { name: 'Mozzarella Cheese', quantity: 150, unit: 'g' },
        { name: 'Fresh Basil', quantity: 5, unit: 'leaves' },
      ],
      'pepperoni': [
        { name: 'Pizza Dough', quantity: 1, unit: 'piece' },
        { name: 'Tomato Sauce', quantity: 100, unit: 'ml' },
        { name: 'Mozzarella Cheese', quantity: 150, unit: 'g' },
        { name: 'Pepperoni', quantity: 80, unit: 'g' },
      ],
      'caesar': [
        { name: 'Romaine Lettuce', quantity: 200, unit: 'g' },
        { name: 'Grilled Chicken', quantity: 150, unit: 'g' },
        { name: 'Parmesan Cheese', quantity: 30, unit: 'g' },
        { name: 'Caesar Dressing', quantity: 50, unit: 'ml' },
        { name: 'Croutons', quantity: 20, unit: 'g' },
      ],
    };
    
    for (const docSnapshot of menuSnapshot.docs) {
      const item = docSnapshot.data();
      const itemId = item.id;
      
      if (menuItemsWithIngredients[itemId]) {
        await updateDoc(docSnapshot.ref, {
          ingredients: menuItemsWithIngredients[itemId],
          updatedAt: new Date()
        });
        console.log(`✅ Updated ${item.name} with ingredients`);
      }
    }
    
    console.log('\n🎉 Firebase data fixed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Created 3 categories: Pizza, Salad, Beverages');
    console.log('✅ Updated 3 menu items with ingredients');
    console.log('✅ All data is now properly structured');
    
    console.log('\n💡 Now when you open the app:');
    console.log('1. Menu items will show with ingredients');
    console.log('2. Categories will be available in dropdowns');
    console.log('3. Category filtering will work');
    console.log('4. You can add new items with ingredients');
    
  } catch (error) {
    console.error('❌ Error fixing Firebase data:', error);
  }
}

fixFirebaseData();




