// Test script to verify default menu items initialization
// Run this with: node test-default-menu-items.js

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

async function testDefaultMenuItems() {
  try {
    console.log('🍽️ Testing default menu items initialization...\n');
    
    // Check if menu items exist in Firestore
    const menuRef = collection(firestore, 'menu');
    const menuSnapshot = await getDocs(menuRef);
    
    console.log(`📋 Found ${menuSnapshot.size} menu items in Firestore\n`);
    
    if (menuSnapshot.size === 0) {
      console.log('❌ No menu items found. The initialization might not have run yet.');
      console.log('💡 Try running the app to trigger the initialization.');
      return;
    }
    
    // Display all menu items
    console.log('📝 Menu Items:');
    console.log('='.repeat(50));
    
    menuSnapshot.forEach(doc => {
      const item = doc.data();
      console.log(`\n🍕 ${item.name}`);
      console.log(`   Description: ${item.description}`);
      console.log(`   Price: ₹${item.price}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Available: ${item.isAvailable ? 'Yes' : 'No'}`);
      console.log(`   Order Type: ${item.orderType}`);
      console.log(`   Modifiers: ${item.modifiers ? item.modifiers.join(', ') : 'None'}`);
      console.log(`   ID: ${doc.id}`);
    });
    
    // Check for specific default items
    const expectedItems = ['margherita', 'pepperoni', 'caesar'];
    const foundItems = [];
    
    menuSnapshot.forEach(doc => {
      if (expectedItems.includes(doc.id)) {
        foundItems.push(doc.id);
      }
    });
    
    console.log('\n🎯 Default Items Check:');
    console.log('='.repeat(30));
    
    expectedItems.forEach(itemId => {
      if (foundItems.includes(itemId)) {
        console.log(`✅ ${itemId} - Found`);
      } else {
        console.log(`❌ ${itemId} - Missing`);
      }
    });
    
    if (foundItems.length === expectedItems.length) {
      console.log('\n🎉 All default menu items are present!');
    } else {
      console.log(`\n⚠️  Only ${foundItems.length}/${expectedItems.length} default items found`);
    }
    
    console.log('\n💡 To test in the app:');
    console.log('1. Open the app and check if menu items appear');
    console.log('2. Go to Menu Management to see the items');
    console.log('3. You can edit or remove these default items');
    
  } catch (error) {
    console.error('❌ Error testing default menu items:', error);
  }
}

testDefaultMenuItems();

