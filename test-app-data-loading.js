// Test script to simulate what the app does when loading data
// Run this with: node test-app-data-loading.js

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

// Simulate the FirestoreService methods
class TestFirestoreService {
  constructor(restaurantId) {
    this.restaurantId = restaurantId;
  }

  async getCategories() {
    try {
      const categoriesRef = collection(firestore, `restaurants/${this.restaurantId}/categories`);
      const categoriesSnapshot = await getDocs(categoriesRef);
      const data = {};
      
      categoriesSnapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      
      return data;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  async getMenuItems() {
    try {
      const menuRef = collection(firestore, `restaurants/${this.restaurantId}/menu`);
      const menuSnapshot = await getDocs(menuRef);
      const data = {};
      
      menuSnapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() };
      });
      
      return data;
    } catch (error) {
      console.error('Error getting menu items:', error);
      throw error;
    }
  }
}

async function testAppDataLoading() {
  try {
    console.log('🧪 Testing app data loading simulation...\n');
    
    // Test with the same restaurant ID the app uses
    const restaurantId = 'default_restaurant';
    const service = new TestFirestoreService(restaurantId);
    
    console.log(`📂 Testing with restaurant ID: ${restaurantId}`);
    console.log('='.repeat(50));
    
    // Test categories loading
    console.log('🔍 Loading categories...');
    try {
      const categoriesData = await service.getCategories();
      console.log(`✅ Categories loaded: ${Object.keys(categoriesData).length} items`);
      
      if (Object.keys(categoriesData).length > 0) {
        console.log('Categories found:');
        Object.values(categoriesData).forEach(cat => {
          console.log(`  • ${cat.name}: ${cat.description}`);
        });
      } else {
        console.log('❌ No categories found');
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
    }
    
    // Test menu items loading
    console.log('\n🔍 Loading menu items...');
    try {
      const menuData = await service.getMenuItems();
      console.log(`✅ Menu items loaded: ${Object.keys(menuData).length} items`);
      
      if (Object.keys(menuData).length > 0) {
        console.log('Menu items found:');
        Object.values(menuData).forEach(item => {
          console.log(`  • ${item.name} (${item.category})`);
          if (item.ingredients && item.ingredients.length > 0) {
            console.log(`    Ingredients: ${item.ingredients.length} items`);
          } else {
            console.log(`    Ingredients: None`);
          }
        });
      } else {
        console.log('❌ No menu items found');
      }
    } catch (error) {
      console.error('❌ Error loading menu items:', error);
    }
    
    console.log('\n🎯 App Loading Simulation Results:');
    console.log('='.repeat(40));
    console.log('This simulates what the Menu Management screen does:');
    console.log('1. Creates FirestoreService with restaurant ID');
    console.log('2. Calls getCategories() and getMenuItems()');
    console.log('3. Converts data to arrays for React state');
    console.log('4. Updates local state with the data');
    
    console.log('\n💡 If you see data here but not in the app:');
    console.log('- Check if the app is using the same restaurant ID');
    console.log('- Check if there are any JavaScript errors in the app');
    console.log('- Check if the Firebase connection is working in the app');
    console.log('- Try refreshing the app or clearing cache');
    
  } catch (error) {
    console.error('❌ Error in app data loading test:', error);
  }
}

testAppDataLoading();




