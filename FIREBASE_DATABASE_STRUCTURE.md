# Firebase Realtime Database Structure

## Overview
This document outlines the Firebase Realtime Database structure for the multi-restaurant POS system. Each restaurant has isolated data with proper security rules.

## Database Structure

```
{
  "restaurants": {
    "restaurant_001": {
      "info": {
        "id": "restaurant_001",
        "name": "Restaurant Name",
        "address": "123 Main St",
        "phone": "+1234567890",
        "createdAt": 1640995200000,
        "isActive": true
      },
      "tables": {
        "table_1": {
          "id": "table_1",
          "name": "Table 1",
          "seats": 4,
          "description": "Standard 4-seater table",
          "isActive": true,
          "createdAt": 1640995200000,
          "isMerged": false,
          "mergedTables": null,
          "mergedTableNames": null,
          "totalSeats": null,
          "isReserved": false,
          "reservedAt": null,
          "reservedUntil": null,
          "reservedBy": null,
          "reservedNote": null
        }
      },
      "orders": {
        "order_123": {
          "id": "order_123",
          "tableId": "table_1",
          "mergedTableIds": null,
          "isMergedOrder": false,
          "status": "ongoing",
          "items": {
            "item_1": {
              "menuItemId": "margherita",
              "name": "Margherita Pizza",
              "description": "Fresh mozzarella, tomato sauce, basil",
              "price": 299,
              "quantity": 2,
              "modifiers": ["Extra Cheese"],
              "orderType": "KOT"
            }
          },
          "discountPercentage": 0,
          "serviceChargePercentage": 0,
          "taxPercentage": 0,
          "customerName": "John Doe",
          "customerPhone": "+1234567890",
          "payment": {
            "method": "Cash",
            "amount": 598,
            "amountPaid": 600,
            "change": 2,
            "customerName": "John Doe",
            "customerPhone": "+1234567890",
            "timestamp": 1640995200000
          },
          "createdAt": 1640995200000,
          "savedQuantities": {
            "margherita": 2
          },
          "isSaved": true
        }
      },
      "menu": {
        "margherita": {
          "id": "margherita",
          "name": "Margherita Pizza",
          "description": "Fresh mozzarella, tomato sauce, basil",
          "price": 299,
          "category": "Pizza",
          "isAvailable": true,
          "modifiers": ["Extra Cheese", "Extra Sauce", "Gluten Free"],
          "image": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd2?w=150&h=150&fit=crop&crop=center",
          "orderType": "KOT"
        }
      },
      "inventory": {
        "coffee": {
          "id": "coffee",
          "name": "Coffee",
          "category": "Beverages",
          "price": 120,
          "stockQuantity": 100,
          "isActive": true
        }
      },
      "customers": {
        "customer_123": {
          "id": "customer_123",
          "name": "John Doe",
          "phone": "+1234567890",
          "email": "john@example.com",
          "address": "123 Main St",
          "creditAmount": 0,
          "loyaltyPoints": 50,
          "visitCount": 5,
          "lastVisit": 1640995200000,
          "createdAt": 1640995200000
        }
      },
      "staff": {
        "staff_123": {
          "id": "staff_123",
          "name": "Waiter 1",
          "role": "Waiter",
          "restaurantId": "restaurant_001",
          "isActive": true,
          "createdAt": 1640995200000
        }
      },
      "attendance": {
        "attendance_123": {
          "id": "attendance_123",
          "staffId": "staff_123",
          "timestamp": 1640995200000,
          "latitude": 40.7128,
          "longitude": -74.0060,
          "photoUri": "file://path/to/photo.jpg",
          "type": "in"
        }
      },
      "receipts": {
        "receipt_123": {
          "id": "receipt_123",
          "orderId": "order_123",
          "content": "Receipt content here...",
          "createdAt": 1640995200000
        }
      }
    }
  },
  "restaurant_users": {
    "user_123": {
      "id": "user_123",
      "email": "user@example.com",
      "restaurantId": "restaurant_001",
      "role": "Owner",
      "isActive": true,
      "createdAt": 1640995200000
    }
  }
}
```

## Security Rules

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

## Key Features

1. **Multi-restaurant Support**: Each restaurant has its own isolated data under `/restaurants/{restaurantId}`
2. **Real-time Updates**: All data changes are reflected immediately across all connected devices
3. **Security**: Users can only access data for their assigned restaurant
4. **Scalability**: Structure supports unlimited restaurants and users
5. **Offline Support**: Firebase handles offline data persistence and sync

## Data Relationships

- **Restaurants** contain all operational data (tables, orders, menu, etc.)
- **Restaurant Users** map Firebase Auth users to specific restaurants
- **Orders** reference tables and contain order items
- **Menu Items** are shared across all orders
- **Inventory** tracks stock levels per restaurant
- **Customers** are shared across all orders within a restaurant
- **Staff** and **Attendance** track employee data per restaurant
