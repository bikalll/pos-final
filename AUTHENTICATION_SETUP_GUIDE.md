# Authentication Setup Guide

## Overview
This guide explains how to set up and use the comprehensive authentication system for your React Native POS app with Firebase Authentication and role-based access control.

## Features Implemented

### ✅ **Authentication Features**
- **Login Screen**: Secure login for owners and employees
- **Create Account Screen**: Owner-only account creation
- **Employee Credential Creation**: Owners can create employee accounts
- **Role-based Access Control**: Owner vs Employee permissions
- **Firebase Integration**: Real-time authentication with Firebase
- **Security Rules**: Database-level security enforcement

### ✅ **User Management**
- **User Metadata Storage**: Complete user information in Firebase
- **Restaurant Isolation**: Users can only access their restaurant data
- **Account Management**: Deactivate/reactivate user accounts
- **Credential Generation**: Secure temporary passwords for employees

## Setup Instructions

### 1. Firebase Configuration

#### Enable Authentication
1. Go to Firebase Console → Authentication
2. Enable Email/Password authentication
3. Configure sign-in methods

#### Deploy Security Rules
1. Go to Firebase Console → Realtime Database → Rules
2. Copy the rules from `database.rules.json`
3. Deploy the rules

#### Deploy Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions
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

### 3. Initialize Authentication

Update your main App component:
```typescript
import { initializeFirebaseAuthEnhanced } from './src/services/firebaseAuthEnhanced';
import { store } from './src/redux/storeFirebase';

// Initialize authentication
const authService = initializeFirebaseAuthEnhanced(store.dispatch);
```

## Usage Guide

### 1. Creating the First Owner Account

Since only owners can create accounts, you'll need to create the first owner account manually:

#### Option A: Using Firebase Console
1. Go to Firebase Console → Authentication
2. Click "Add user"
3. Enter email and password
4. Manually add user metadata to Realtime Database:

```json
{
  "users": {
    "USER_UID": {
      "uid": "USER_UID",
      "email": "owner@restaurant.com",
      "role": "owner",
      "restaurantId": "restaurant_001",
      "displayName": "Restaurant Owner",
      "createdAt": 1640995200000,
      "isActive": true
    }
  },
  "restaurants": {
    "restaurant_001": {
      "info": {
        "id": "restaurant_001",
        "name": "Your Restaurant",
        "address": "123 Main St",
        "phone": "+1234567890",
        "createdAt": 1640995200000,
        "isActive": true
      }
    }
  },
  "restaurant_users": {
    "USER_UID": {
      "id": "USER_UID",
      "email": "owner@restaurant.com",
      "restaurantId": "restaurant_001",
      "role": "Owner",
      "createdAt": 1640995200000,
      "isActive": true
    }
  }
}
```

#### Option B: Using Cloud Functions (Recommended)
Create a setup script to initialize the first owner:

```typescript
// setup-first-owner.js
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./path-to-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-default-rtdb.firebaseio.com'
});

async function createFirstOwner() {
  try {
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: 'owner@restaurant.com',
      password: 'SecurePassword123!',
      displayName: 'Restaurant Owner',
    });

    // Create restaurant
    const restaurantId = 'restaurant_001';
    await admin.database().ref(`restaurants/${restaurantId}/info`).set({
      id: restaurantId,
      name: 'Your Restaurant',
      address: '123 Main St',
      phone: '+1234567890',
      createdAt: Date.now(),
      isActive: true
    });

    // Create user metadata
    await admin.database().ref(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email: 'owner@restaurant.com',
      role: 'owner',
      restaurantId: restaurantId,
      displayName: 'Restaurant Owner',
      createdAt: Date.now(),
      isActive: true
    });

    // Create restaurant user mapping
    await admin.database().ref(`restaurant_users/${userRecord.uid}`).set({
      id: userRecord.uid,
      email: 'owner@restaurant.com',
      restaurantId: restaurantId,
      role: 'Owner',
      createdAt: Date.now(),
      isActive: true
    });

    console.log('First owner created successfully!');
    console.log('Email: owner@restaurant.com');
    console.log('Password: SecurePassword123!');
  } catch (error) {
    console.error('Error creating first owner:', error);
  }
}

createFirstOwner();
```

### 2. Owner Workflow

#### Login as Owner
1. Open the app
2. Enter owner credentials
3. Access all features including user management

#### Create Employee Accounts
1. Go to Settings → Employee Management
2. Click "Create Account" button
3. Fill in employee details
4. Click "Create Account" to generate credentials
5. Provide credentials to employee

#### Create Additional Owner Accounts
1. Go to Settings → Create Account (if accessible)
2. Fill in owner details
3. Select "Owner" role
4. Create account

### 3. Employee Workflow

#### Login as Employee
1. Open the app
2. Enter employee credentials provided by owner
3. Access employee-level features only

#### Change Password (Future Feature)
- Employees can change their password after first login
- Owners can reset employee passwords

## Security Features

### 1. Role-Based Access Control

#### Owner Permissions
- ✅ Create new user accounts
- ✅ Create employee credentials
- ✅ View all restaurant data
- ✅ Manage employees
- ✅ Access all POS features
- ✅ Deactivate/reactivate accounts

#### Employee Permissions
- ✅ Login with provided credentials
- ✅ Access POS features
- ✅ View assigned restaurant data
- ❌ Cannot create accounts
- ❌ Cannot access user management
- ❌ Cannot view other restaurants

### 2. Database Security

#### User Data Isolation
- Users can only access their own metadata
- Restaurant data is isolated by restaurantId
- Cross-restaurant access is prevented

#### Security Rules
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "restaurants": {
      "$restaurantId": {
        ".read": "auth != null && root.child('users').child(auth.uid).child('restaurantId').val() == $restaurantId",
        ".write": "auth != null && root.child('users').child(auth.uid).child('restaurantId').val() == $restaurantId"
      }
    }
  }
}
```

### 3. Cloud Functions Security

#### Function-Level Security
- All functions verify authentication
- Role-based permission checks
- Restaurant isolation enforcement
- Input validation and sanitization

## Testing Guide

### 1. Test Owner Login
1. Create first owner account
2. Login with owner credentials
3. Verify access to all features
4. Test account creation functionality

### 2. Test Employee Creation
1. Login as owner
2. Go to Employee Management
3. Create employee account
4. Verify credentials are generated
5. Test employee login with generated credentials

### 3. Test Security Rules
1. Try accessing different restaurant data
2. Verify access is denied
3. Test with different user roles
4. Verify proper error messages

### 4. Test Error Handling
1. Try invalid credentials
2. Test with deactivated accounts
3. Test network connectivity issues
4. Verify proper error messages

## Troubleshooting

### Common Issues

#### 1. "User metadata not found"
- **Cause**: User account exists in Firebase Auth but not in Realtime Database
- **Solution**: Create user metadata manually or use Cloud Functions

#### 2. "Only owners can create accounts"
- **Cause**: User trying to create account is not an owner
- **Solution**: Login as owner or grant owner role

#### 3. "Account is deactivated"
- **Cause**: User account has been deactivated
- **Solution**: Reactivate account or contact administrator

#### 4. "Permission denied"
- **Cause**: User trying to access data from different restaurant
- **Solution**: Verify user belongs to correct restaurant

### Debug Mode

Enable Firebase debug logging:
```typescript
import { enableLogging } from 'firebase/database';
enableLogging(true);
```

### Firebase Console Debugging

1. Go to Firebase Console → Authentication
2. Check user accounts and status
3. Go to Realtime Database
4. Verify user metadata structure
5. Check security rules are deployed

## Best Practices

### 1. Security
- Use strong passwords for owner accounts
- Regularly review user access
- Deactivate unused accounts
- Monitor authentication logs

### 2. User Management
- Provide credentials securely to employees
- Encourage password changes on first login
- Maintain up-to-date employee records
- Regular access reviews

### 3. Development
- Test with different user roles
- Verify security rules work correctly
- Test offline/online scenarios
- Monitor error logs

## Support

For issues with the authentication system:

1. **Check Firebase Console**: Verify configuration and rules
2. **Review Error Logs**: Check both app and Firebase logs
3. **Test Security Rules**: Use Firebase Console simulator
4. **Verify Cloud Functions**: Check function deployment and logs

## Next Steps

1. **Deploy to Production**: Test thoroughly before going live
2. **User Training**: Train owners on account management
3. **Monitor Usage**: Track authentication patterns
4. **Regular Updates**: Keep Firebase SDK and functions updated

---

**Your authentication system is now ready for production use! 🎉**
