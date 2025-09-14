// Script to force refresh app data and check for any issues
// Run this with: node force-refresh-app-data.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function forceRefreshAppData() {
  try {
    console.log('🔄 Force refreshing app data...\n');
    
    const restaurantId = 'default_restaurant';
    
    // Update all menu items with a timestamp to force refresh
    console.log('🍕 Updating menu items with refresh timestamp...');
    const menuRef = collection(firestore, `restaurants/${restaurantId}/menu`);
    const menuSnapshot = await getDocs(menuRef);
    
    for (const docSnapshot of menuSnapshot.docs) {
      await updateDoc(docSnapshot.ref, {
        lastRefreshed: new Date().toISOString(),
        updatedAt: new Date()
      });
      console.log(`✅ Updated ${docSnapshot.data().name} with refresh timestamp`);
    }
    
    // Update all categories with a timestamp to force refresh
    console.log('\n📂 Updating categories with refresh timestamp...');
    const categoriesRef = collection(firestore, `restaurants/${restaurantId}/categories`);
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    for (const docSnapshot of categoriesSnapshot.docs) {
      await updateDoc(docSnapshot.ref, {
        lastRefreshed: new Date().toISOString(),
        updatedAt: new Date()
      });
      console.log(`✅ Updated ${docSnapshot.data().name} with refresh timestamp`);
    }
    
    console.log('\n🎉 Data refresh completed!');
    console.log('\n📋 Summary:');
    console.log(`✅ Updated ${menuSnapshot.size} menu items`);
    console.log(`✅ Updated ${categoriesSnapshot.size} categories`);
    console.log('✅ All data now has fresh timestamps');
    
    console.log('\n💡 Next steps:');
    console.log('1. Close the app completely');
    console.log('2. Clear app cache if possible');
    console.log('3. Restart the app');
    console.log('4. Go to Menu Management screen');
    console.log('5. You should now see all items and categories');
    
    console.log('\n🔍 If still not working:');
    console.log('- Check the app console for any JavaScript errors');
    console.log('- Make sure Firebase is properly initialized in the app');
    console.log('- Verify the app is using the same Firebase project');
    
  } catch (error) {
    console.error('❌ Error force refreshing app data:', error);
  }
}

forceRefreshAppData();




