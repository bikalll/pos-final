const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

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

async function addIngredientsToMenu() {
  try {
    console.log('🔍 Adding ingredients to menu items...');
    
    // Get restaurant ID from command line or use default
    const restaurantId = process.argv[2] || 'default-restaurant';
    console.log('🏪 Using restaurant ID:', restaurantId);
    
    const menuRef = collection(firestore, 'restaurants', restaurantId, 'menu');
    const menuSnapshot = await getDocs(menuRef);
    
    if (menuSnapshot.size === 0) {
      console.log('❌ No menu items found. Please create some menu items first.');
      return;
    }
    
    console.log(`✅ Found ${menuSnapshot.size} menu items`);
    
    // Sample ingredients for common menu items
    const sampleIngredients = {
      'pizza': [
        { name: 'Pizza Dough', quantity: 1, unit: 'piece' },
        { name: 'Tomato Sauce', quantity: 100, unit: 'ml' },
        { name: 'Mozzarella Cheese', quantity: 150, unit: 'g' },
        { name: 'Fresh Basil', quantity: 5, unit: 'leaves' }
      ],
      'burger': [
        { name: 'Burger Bun', quantity: 1, unit: 'piece' },
        { name: 'Beef Patty', quantity: 150, unit: 'g' },
        { name: 'Lettuce', quantity: 20, unit: 'g' },
        { name: 'Tomato', quantity: 30, unit: 'g' },
        { name: 'Cheese', quantity: 50, unit: 'g' }
      ],
      'pasta': [
        { name: 'Pasta', quantity: 200, unit: 'g' },
        { name: 'Tomato Sauce', quantity: 150, unit: 'ml' },
        { name: 'Parmesan Cheese', quantity: 30, unit: 'g' },
        { name: 'Olive Oil', quantity: 10, unit: 'ml' }
      ],
      'salad': [
        { name: 'Mixed Greens', quantity: 150, unit: 'g' },
        { name: 'Cherry Tomatoes', quantity: 50, unit: 'g' },
        { name: 'Cucumber', quantity: 30, unit: 'g' },
        { name: 'Olive Oil', quantity: 15, unit: 'ml' },
        { name: 'Balsamic Vinegar', quantity: 10, unit: 'ml' }
      ],
      'drink': [
        { name: 'Water', quantity: 250, unit: 'ml' },
        { name: 'Ice', quantity: 50, unit: 'g' }
      ]
    };
    
    let updatedCount = 0;
    
    for (const docSnapshot of menuSnapshot.docs) {
      const item = docSnapshot.data();
      const itemName = item.name?.toLowerCase() || '';
      
      // Find matching ingredients based on item name
      let ingredients = [];
      if (itemName.includes('pizza')) {
        ingredients = sampleIngredients.pizza;
      } else if (itemName.includes('burger')) {
        ingredients = sampleIngredients.burger;
      } else if (itemName.includes('pasta')) {
        ingredients = sampleIngredients.pasta;
      } else if (itemName.includes('salad')) {
        ingredients = sampleIngredients.salad;
      } else if (itemName.includes('drink') || itemName.includes('juice') || itemName.includes('soda')) {
        ingredients = sampleIngredients.drink;
      } else {
        // Default ingredients for unknown items
        ingredients = [
          { name: 'Base Ingredient', quantity: 1, unit: 'piece' },
          { name: 'Seasoning', quantity: 5, unit: 'g' }
        ];
      }
      
      // Update the menu item with ingredients
      await updateDoc(docSnapshot.ref, {
        ingredients: ingredients,
        updatedAt: new Date()
      });
      
      console.log(`✅ Updated "${item.name}" with ${ingredients.length} ingredients`);
      updatedCount++;
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} menu items with ingredients!`);
    console.log('\n💡 Now when you create orders, inventory should be deducted automatically.');
    console.log('📋 Make sure you have corresponding inventory items for the ingredients.');
    
  } catch (error) {
    console.error('❌ Error adding ingredients to menu:', error);
  }
}

// Run the function
addIngredientsToMenu().then(() => {
  console.log('✅ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
