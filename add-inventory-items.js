const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

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

async function addInventoryItems() {
  try {
    console.log('🔍 Adding inventory items...');
    
    // Get restaurant ID from command line or use default
    const restaurantId = process.argv[2] || 'default-restaurant';
    console.log('🏪 Using restaurant ID:', restaurantId);
    
    const inventoryRef = collection(firestore, 'restaurants', restaurantId, 'inventory');
    
    // Check if inventory items already exist
    const existingSnapshot = await getDocs(inventoryRef);
    if (existingSnapshot.size > 0) {
      console.log(`ℹ️ Found ${existingSnapshot.size} existing inventory items. Skipping creation.`);
      return;
    }
    
    // Sample inventory items that match the menu ingredients
    const inventoryItems = [
      { name: 'Pizza Dough', category: 'Dough', price: 5.0, stockQuantity: 50, minStockLevel: 10, unit: 'piece', supplier: 'Local Bakery', isActive: true },
      { name: 'Tomato Sauce', category: 'Sauces', price: 3.0, stockQuantity: 100, minStockLevel: 20, unit: 'ml', supplier: 'Food Supplier', isActive: true },
      { name: 'Mozzarella Cheese', category: 'Dairy', price: 8.0, stockQuantity: 200, minStockLevel: 50, unit: 'g', supplier: 'Dairy Farm', isActive: true },
      { name: 'Fresh Basil', category: 'Herbs', price: 2.0, stockQuantity: 30, minStockLevel: 5, unit: 'leaves', supplier: 'Herb Garden', isActive: true },
      { name: 'Burger Bun', category: 'Bread', price: 1.5, stockQuantity: 100, minStockLevel: 20, unit: 'piece', supplier: 'Local Bakery', isActive: true },
      { name: 'Beef Patty', category: 'Meat', price: 12.0, stockQuantity: 50, minStockLevel: 10, unit: 'g', supplier: 'Butcher Shop', isActive: true },
      { name: 'Lettuce', category: 'Vegetables', price: 1.0, stockQuantity: 200, minStockLevel: 50, unit: 'g', supplier: 'Vegetable Farm', isActive: true },
      { name: 'Tomato', category: 'Vegetables', price: 2.0, stockQuantity: 150, minStockLevel: 30, unit: 'g', supplier: 'Vegetable Farm', isActive: true },
      { name: 'Cheese', category: 'Dairy', price: 6.0, stockQuantity: 300, minStockLevel: 100, unit: 'g', supplier: 'Dairy Farm', isActive: true },
      { name: 'Pasta', category: 'Grains', price: 4.0, stockQuantity: 500, minStockLevel: 100, unit: 'g', supplier: 'Grain Supplier', isActive: true },
      { name: 'Parmesan Cheese', category: 'Dairy', price: 15.0, stockQuantity: 100, minStockLevel: 20, unit: 'g', supplier: 'Dairy Farm', isActive: true },
      { name: 'Olive Oil', category: 'Oils', price: 10.0, stockQuantity: 200, minStockLevel: 50, unit: 'ml', supplier: 'Oil Supplier', isActive: true },
      { name: 'Mixed Greens', category: 'Vegetables', price: 3.0, stockQuantity: 100, minStockLevel: 20, unit: 'g', supplier: 'Vegetable Farm', isActive: true },
      { name: 'Cherry Tomatoes', category: 'Vegetables', price: 4.0, stockQuantity: 80, minStockLevel: 15, unit: 'g', supplier: 'Vegetable Farm', isActive: true },
      { name: 'Cucumber', category: 'Vegetables', price: 2.5, stockQuantity: 60, minStockLevel: 10, unit: 'g', supplier: 'Vegetable Farm', isActive: true },
      { name: 'Balsamic Vinegar', category: 'Condiments', price: 8.0, stockQuantity: 50, minStockLevel: 10, unit: 'ml', supplier: 'Condiment Supplier', isActive: true },
      { name: 'Water', category: 'Beverages', price: 0.5, stockQuantity: 1000, minStockLevel: 200, unit: 'ml', supplier: 'Water Supplier', isActive: true },
      { name: 'Ice', category: 'Beverages', price: 0.1, stockQuantity: 500, minStockLevel: 100, unit: 'g', supplier: 'Ice Supplier', isActive: true },
      { name: 'Base Ingredient', category: 'General', price: 2.0, stockQuantity: 200, minStockLevel: 50, unit: 'piece', supplier: 'General Supplier', isActive: true },
      { name: 'Seasoning', category: 'Spices', price: 1.5, stockQuantity: 100, minStockLevel: 20, unit: 'g', supplier: 'Spice Supplier', isActive: true }
    ];
    
    console.log(`📦 Creating ${inventoryItems.length} inventory items...`);
    
    for (const item of inventoryItems) {
      const docRef = await addDoc(inventoryRef, {
        ...item,
        restaurantId: restaurantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdated: Date.now()
      });
      console.log(`✅ Created inventory item: ${item.name} (ID: ${docRef.id})`);
    }
    
    console.log(`\n🎉 Successfully created ${inventoryItems.length} inventory items!`);
    console.log('\n💡 Now inventory deduction should work when orders are created.');
    console.log('📋 The inventory items match the ingredients in your menu items.');
    
  } catch (error) {
    console.error('❌ Error creating inventory items:', error);
  }
}

// Run the function
addInventoryItems().then(() => {
  console.log('✅ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
