# Firebase Migration Guide

## Overview
This guide explains how to migrate your React Native restaurant POS app from SQLite to Firebase Realtime Database, enabling real-time updates and multi-restaurant support.

## Prerequisites
- Firebase project created
- `google-services.json` file configured
- React Native app with existing SQLite implementation

## Migration Steps

### 1. Install Dependencies
```bash
npm install firebase
```

### 2. Environment Configuration
Create a `.env` file in your project root:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_DEFAULT_RESTAURANT_ID=restaurant_001
```

### 3. Update Store Configuration
Replace your existing store with the Firebase-enabled version:

```typescript
// In your App.tsx or main component
import { store } from './src/redux/storeFirebase';
import { Provider } from 'react-redux';
import { initializeFirebase } from './src/services/firebaseInitializer';

// Initialize Firebase when app starts
const firebaseInitializer = initializeFirebase(store.dispatch);
```

### 4. Initialize Firebase for Restaurant
```typescript
// When user logs in or selects restaurant
const restaurantId = 'restaurant_001';
await firebaseInitializer.initializeForRestaurant(restaurantId);
```

### 5. Update Components
Replace SQLite operations with Firebase operations:

```typescript
// Before (SQLite)
import { Db } from '../services/db';
await Db.saveOrder(order);

// After (Firebase)
import { getFirebaseService } from '../services/firebaseService';
const firebaseService = getFirebaseService();
await firebaseService.saveOrder(order);
```

## Firebase Database Structure

### Security Rules
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

### Data Structure
```
restaurants/
  restaurant_001/
    info/
    tables/
    orders/
    menu/
    inventory/
    customers/
    staff/
    attendance/
    receipts/
restaurant_users/
  user_123/
    restaurantId: "restaurant_001"
    role: "Owner"
```

## Real-time Features

### Table Reservations
```typescript
// Reserve a table
dispatch(reserveTable({
  id: 'table_1',
  reservedBy: 'John Doe',
  reservedUntil: Date.now() + (2 * 60 * 60 * 1000),
  reservedNote: 'VIP customer'
}));

// This will update in real-time for all users
```

### Order Management
```typescript
// Create order
dispatch(createOrder('table_1'));

// Add item to order
dispatch(addItem({
  orderId: 'order_123',
  item: {
    menuItemId: 'margherita',
    name: 'Margherita Pizza',
    price: 299,
    quantity: 1,
    orderType: 'KOT'
  }
}));

// Complete order
dispatch(completeOrder({ orderId: 'order_123' }));
```

## Multi-Restaurant Support

### Adding a New Restaurant
1. Create restaurant in Firebase:
```typescript
const firebaseService = createFirebaseService('temp');
const restaurantId = await firebaseService.createRestaurant({
  name: 'New Restaurant',
  address: '123 Main St',
  phone: '+1234567890'
});
```

2. Add users to restaurant:
```typescript
await firebaseService.createRestaurantUser({
  id: userId,
  email: 'user@example.com',
  restaurantId: restaurantId,
  role: 'Staff'
});
```

### Switching Restaurants
```typescript
// When user logs in, get their restaurant
const restaurantId = await firebaseService.getUserRestaurant(userId);
await firebaseInitializer.initializeForRestaurant(restaurantId);
```

## Offline Support

Firebase automatically handles offline support:
- Data is cached locally when offline
- Changes sync when connection is restored
- No additional configuration needed

## Error Handling

```typescript
try {
  await firebaseService.saveOrder(order);
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle permission error
  } else if (error.code === 'network-request-failed') {
    // Handle network error
  } else {
    // Handle other errors
  }
}
```

## Testing

### Real-time Updates Test
1. Open app on two devices
2. Reserve a table on device 1
3. Verify table shows as reserved on device 2
4. Create an order on device 1
5. Verify order appears on device 2

### Offline Test
1. Disconnect internet
2. Make changes (reserve table, create order)
3. Reconnect internet
4. Verify changes sync to Firebase

## Performance Considerations

1. **Pagination**: For large datasets, implement pagination
2. **Indexing**: Add indexes for frequently queried fields
3. **Caching**: Use Redux for local state management
4. **Cleanup**: Remove listeners when components unmount

## Migration Checklist

- [ ] Install Firebase dependencies
- [ ] Configure environment variables
- [ ] Update store configuration
- [ ] Replace SQLite operations with Firebase
- [ ] Test real-time updates
- [ ] Test offline functionality
- [ ] Test multi-restaurant support
- [ ] Update authentication flow
- [ ] Deploy security rules
- [ ] Test with multiple users

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check Firebase security rules
   - Verify user authentication
   - Ensure user has restaurant access

2. **Connection Issues**
   - Check internet connectivity
   - Verify Firebase configuration
   - Check Firebase project status

3. **Data Not Syncing**
   - Check Firebase listeners
   - Verify Redux actions
   - Check for JavaScript errors

### Debug Mode
Enable Firebase debug logging:
```typescript
import { enableLogging } from 'firebase/database';
enableLogging(true);
```

## Support

For issues or questions:
1. Check Firebase documentation
2. Review error logs
3. Test with Firebase console
4. Contact development team
