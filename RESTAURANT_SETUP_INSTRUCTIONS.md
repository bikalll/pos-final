# Restaurant Setup Instructions

## Adding a New Restaurant to the POS System

This guide explains how to connect a new restaurant to the Firebase-powered POS system.

## Prerequisites
- Firebase project configured
- Admin access to the POS system
- Restaurant information ready

## Step 1: Create Restaurant in Firebase

### Using Firebase Console
1. Go to Firebase Console → Realtime Database
2. Navigate to `restaurants` node
3. Click "Add child" and create new restaurant with ID: `restaurant_XXX` (where XXX is a unique identifier)
4. Add restaurant information:

```json
{
  "info": {
    "id": "restaurant_001",
    "name": "Restaurant Name",
    "address": "123 Main Street, City, State",
    "phone": "+1234567890",
    "email": "info@restaurant.com",
    "createdAt": 1640995200000,
    "isActive": true
  }
}
```

### Using Code
```typescript
import { createFirebaseService } from './src/services/firebaseService';

const addNewRestaurant = async (restaurantData) => {
  const firebaseService = createFirebaseService('temp');
  const restaurantId = await firebaseService.createRestaurant({
    name: restaurantData.name,
    address: restaurantData.address,
    phone: restaurantData.phone,
    email: restaurantData.email
  });
  
  console.log(`Restaurant created with ID: ${restaurantId}`);
  return restaurantId;
};

// Usage
const restaurantId = await addNewRestaurant({
  name: "Pizza Palace",
  address: "456 Pizza Street, Food City",
  phone: "+1987654321",
  email: "orders@pizzapalace.com"
});
```

## Step 2: Set Up Default Tables

### Create Default Table Layout
```typescript
const setupDefaultTables = async (restaurantId) => {
  const firebaseService = createFirebaseService(restaurantId);
  
  const defaultTables = [
    { id: "table_1", name: "Table 1", seats: 4, description: "Window table" },
    { id: "table_2", name: "Table 2", seats: 4, description: "Center table" },
    { id: "table_3", name: "Table 3", seats: 6, description: "Family table" },
    { id: "table_4", name: "Table 4", seats: 2, description: "Couple table" },
    { id: "table_5", name: "Table 5", seats: 8, description: "Large group table" }
  ];
  
  for (const table of defaultTables) {
    await firebaseService.saveTable({
      ...table,
      isActive: true,
      isMerged: false,
      createdAt: Date.now()
    });
  }
  
  console.log('Default tables created');
};
```

## Step 3: Set Up Menu Items

### Create Sample Menu
```typescript
const setupSampleMenu = async (restaurantId) => {
  const firebaseService = createFirebaseService(restaurantId);
  
  const sampleMenu = [
    {
      id: "margherita",
      name: "Margherita Pizza",
      description: "Fresh mozzarella, tomato sauce, basil",
      price: 299,
      category: "Pizza",
      isAvailable: true,
      modifiers: ["Extra Cheese", "Extra Sauce", "Gluten Free"],
      orderType: "KOT"
    },
    {
      id: "pepperoni",
      name: "Pepperoni Pizza",
      description: "Spicy pepperoni, mozzarella, tomato sauce",
      price: 349,
      category: "Pizza",
      isAvailable: true,
      modifiers: ["Extra Cheese", "Extra Pepperoni"],
      orderType: "KOT"
    },
    {
      id: "coffee",
      name: "Espresso",
      description: "Single shot of premium Italian espresso",
      price: 79,
      category: "Beverages",
      isAvailable: true,
      modifiers: ["Double Shot", "Extra Hot", "Iced"],
      orderType: "BOT"
    }
  ];
  
  for (const item of sampleMenu) {
    await firebaseService.saveMenuItem(item);
  }
  
  console.log('Sample menu created');
};
```

## Step 4: Set Up Inventory

### Create Initial Inventory
```typescript
const setupInventory = async (restaurantId) => {
  const firebaseService = createFirebaseService(restaurantId);
  
  const inventoryItems = [
    { id: "coffee_beans", name: "Coffee Beans", category: "Beverages", price: 120, stockQuantity: 100, isActive: true },
    { id: "pizza_dough", name: "Pizza Dough", category: "Food", price: 50, stockQuantity: 50, isActive: true },
    { id: "mozzarella", name: "Mozzarella Cheese", category: "Dairy", price: 200, stockQuantity: 25, isActive: true },
    { id: "tomato_sauce", name: "Tomato Sauce", category: "Sauces", price: 80, stockQuantity: 30, isActive: true }
  ];
  
  for (const item of inventoryItems) {
    await firebaseService.saveInventoryItem(item);
  }
  
  console.log('Inventory created');
};
```

## Step 5: Create Staff Members

### Add Restaurant Staff
```typescript
const setupStaff = async (restaurantId) => {
  const firebaseService = createFirebaseService(restaurantId);
  
  const staffMembers = [
    { id: "owner_001", name: "Restaurant Owner", role: "Owner" },
    { id: "manager_001", name: "Restaurant Manager", role: "Staff" },
    { id: "waiter_001", name: "Waiter 1", role: "Waiter" },
    { id: "waiter_002", name: "Waiter 2", role: "Waiter" },
    { id: "chef_001", name: "Head Chef", role: "Staff" }
  ];
  
  for (const staff of staffMembers) {
    await firebaseService.saveStaffMember(staff);
  }
  
  console.log('Staff members created');
};
```

## Step 6: Create User Accounts

### Add Restaurant Users
```typescript
const createRestaurantUsers = async (restaurantId, users) => {
  const firebaseService = createFirebaseService(restaurantId);
  
  for (const user of users) {
    await firebaseService.createRestaurantUser({
      id: user.uid,
      email: user.email,
      restaurantId: restaurantId,
      role: user.role || "Staff"
    });
  }
  
  console.log('Restaurant users created');
};

// Usage
const users = [
  { uid: "user_123", email: "owner@restaurant.com", role: "Owner" },
  { uid: "user_456", email: "manager@restaurant.com", role: "Staff" },
  { uid: "user_789", email: "waiter@restaurant.com", role: "Waiter" }
];

await createRestaurantUsers(restaurantId, users);
```

## Step 7: Configure Security Rules

### Update Firebase Security Rules
```json
{
  "rules": {
    "restaurants": {
      "$restaurantId": {
        ".read": "auth != null && root.child('restaurant_users').child(auth.uid).child('restaurantId').val() == $restaurantId",
        ".write": "auth != null && root.child('restaurant_users').child(auth.uid).child('restaurantId').val() == $restaurantId"
      }
    },
    "restaurant_users": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    }
  }
}
```

## Step 8: Test Restaurant Setup

### Verify Restaurant Configuration
```typescript
const testRestaurantSetup = async (restaurantId) => {
  const firebaseService = createFirebaseService(restaurantId);
  
  try {
    // Test restaurant info
    const restaurantInfo = await firebaseService.getRestaurantInfo();
    console.log('Restaurant Info:', restaurantInfo);
    
    // Test tables
    const tables = await firebaseService.getTables();
    console.log('Tables:', Object.keys(tables).length);
    
    // Test menu
    const menu = await firebaseService.getMenuItems();
    console.log('Menu Items:', Object.keys(menu).length);
    
    // Test inventory
    const inventory = await firebaseService.getInventoryItems();
    console.log('Inventory Items:', Object.keys(inventory).length);
    
    // Test staff
    const staff = await firebaseService.getStaffMembers();
    console.log('Staff Members:', Object.keys(staff).length);
    
    console.log('Restaurant setup verified successfully!');
  } catch (error) {
    console.error('Restaurant setup verification failed:', error);
  }
};
```

## Complete Restaurant Setup Script

```typescript
const setupCompleteRestaurant = async (restaurantData) => {
  try {
    console.log('Starting restaurant setup...');
    
    // Step 1: Create restaurant
    const restaurantId = await addNewRestaurant(restaurantData);
    console.log(`Restaurant created: ${restaurantId}`);
    
    // Step 2: Set up tables
    await setupDefaultTables(restaurantId);
    console.log('Tables set up');
    
    // Step 3: Set up menu
    await setupSampleMenu(restaurantId);
    console.log('Menu set up');
    
    // Step 4: Set up inventory
    await setupInventory(restaurantId);
    console.log('Inventory set up');
    
    // Step 5: Set up staff
    await setupStaff(restaurantId);
    console.log('Staff set up');
    
    // Step 6: Test setup
    await testRestaurantSetup(restaurantId);
    
    console.log('Restaurant setup completed successfully!');
    return restaurantId;
  } catch (error) {
    console.error('Restaurant setup failed:', error);
    throw error;
  }
};

// Usage
const newRestaurant = await setupCompleteRestaurant({
  name: "New Restaurant",
  address: "789 New Street, City",
  phone: "+1555123456",
  email: "info@newrestaurant.com"
});
```

## Restaurant Management

### Deactivate Restaurant
```typescript
const deactivateRestaurant = async (restaurantId) => {
  const firebaseService = createFirebaseService(restaurantId);
  await firebaseService.updateRestaurantInfo({ isActive: false });
  console.log('Restaurant deactivated');
};
```

### Update Restaurant Info
```typescript
const updateRestaurantInfo = async (restaurantId, updates) => {
  const firebaseService = createFirebaseService(restaurantId);
  await firebaseService.updateRestaurantInfo(updates);
  console.log('Restaurant info updated');
};
```

### Get Restaurant Statistics
```typescript
const getRestaurantStats = async (restaurantId) => {
  const firebaseService = createFirebaseService(restaurantId);
  
  const [tables, orders, menu, inventory, staff] = await Promise.all([
    firebaseService.getTables(),
    firebaseService.getOngoingOrders(),
    firebaseService.getMenuItems(),
    firebaseService.getInventoryItems(),
    firebaseService.getStaffMembers()
  ]);
  
  return {
    totalTables: Object.keys(tables).length,
    activeTables: Object.values(tables).filter(t => t.isActive).length,
    ongoingOrders: orders.length,
    menuItems: Object.keys(menu).length,
    inventoryItems: Object.keys(inventory).length,
    staffMembers: Object.keys(staff).length
  };
};
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check Firebase security rules
   - Verify user authentication
   - Ensure proper restaurant access

2. **Data Not Appearing**
   - Check Firebase console
   - Verify data structure
   - Check for JavaScript errors

3. **Real-time Updates Not Working**
   - Check Firebase listeners
   - Verify Redux actions
   - Check network connectivity

### Support

For issues with restaurant setup:
1. Check Firebase console for data
2. Verify security rules
3. Test with Firebase console
4. Contact development team

This setup process ensures each restaurant has its own isolated data space with proper security and real-time functionality.
