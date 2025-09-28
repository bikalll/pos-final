# Firebase Custom Claims Implementation Guide

## Overview

This guide explains how to use the Firebase Cloud Functions that automatically set custom claims for users when they sign up or log in. Custom claims allow you to store user metadata (like roles and permissions) directly in the Firebase Auth token, making them available in Firestore security rules without additional database reads.

## Cloud Functions Added

### 1. `setUserClaimsOnSignup`
**Trigger:** Firebase Auth user creation (`onCreate`)
**Purpose:** Automatically sets default custom claims for new users

**Default Claims Set:**
- `role`: "Staff" (default role for new users)
- `restaurantId`: "default_restaurant" (default restaurant assignment)
- `isActive`: `true` (user is active by default)

### 2. `refreshUserClaimsOnLogin` (Optional)
**Trigger:** Firebase Auth user sign-in (`onSignIn`)
**Purpose:** Ensures users have complete custom claims on login

### 3. `updateUserCustomClaims`
**Type:** Callable function
**Purpose:** Manually update user custom claims (requires owner/manager permissions)

### 4. `getUserCustomClaims`
**Type:** Callable function
**Purpose:** Retrieve current user custom claims

## How It Works

1. **User signs up** → `setUserClaimsOnSignup` triggers → custom claims are set automatically
2. **User logs in** → `refreshUserClaimsOnLogin` triggers (optional) → ensures claims are complete
3. **Client refreshes ID token** → `request.auth.token` now includes `role`, `restaurantId`, `isActive`
4. **Firestore rules** can use these claims to allow/deny access without extra database reads

## Client-Side Implementation

### 1. Refresh ID Token After Signup/Login

```javascript
import { getAuth, getIdToken } from 'firebase/auth';

// After successful signup or login
const auth = getAuth();
const user = auth.currentUser;

if (user) {
  // Force refresh the ID token to get the latest custom claims
  const idToken = await getIdToken(user, true); // true = force refresh
  
  // The token now contains the custom claims
  console.log('ID Token with custom claims:', idToken);
  
  // You can decode the token to see the claims (for debugging)
  const decodedToken = JSON.parse(atob(idToken.split('.')[1]));
  console.log('Custom claims:', decodedToken);
}
```

### 2. Check Custom Claims in Your App

```javascript
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Get fresh ID token with custom claims
      const idToken = await getIdToken(user, true);
      const decodedToken = JSON.parse(atob(idToken.split('.')[1]));
      
      const userRole = decodedToken.role;
      const restaurantId = decodedToken.restaurantId;
      const isActive = decodedToken.isActive;
      
      console.log('User role:', userRole);
      console.log('Restaurant ID:', restaurantId);
      console.log('Is active:', isActive);
      
      // Use these values to control app behavior
      if (userRole === 'Owner') {
        // Show owner-specific features
      } else if (userRole === 'Manager') {
        // Show manager-specific features
      } else {
        // Show staff features
      }
      
    } catch (error) {
      console.error('Error getting custom claims:', error);
    }
  }
});
```

### 3. Update User Custom Claims (Admin Only)

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const updateUserCustomClaims = httpsCallable(functions, 'updateUserCustomClaims');

// Update a user's role (only owners/managers can do this)
const updateUserRole = async (targetUserId, newRole) => {
  try {
    const result = await updateUserCustomClaims({
      targetUid: targetUserId,
      claims: {
        role: newRole, // 'Owner', 'Manager', or 'Staff'
        restaurantId: 'restaurant_123', // Optional: change restaurant
        isActive: true // Optional: activate/deactivate user
      }
    });
    
    console.log('Custom claims updated:', result.data);
    
    // Tell the user to refresh their token to get the new claims
    // You might want to show a message or automatically refresh
    
  } catch (error) {
    console.error('Error updating custom claims:', error);
  }
};

// Usage examples:
// updateUserRole('user123', 'Manager');
// updateUserRole('user456', 'Owner');
```

### 4. Get User Custom Claims

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const getUserCustomClaims = httpsCallable(functions, 'getUserCustomClaims');

const checkUserClaims = async (targetUserId = null) => {
  try {
    const result = await getUserCustomClaims({
      targetUid: targetUserId // null or undefined to check own claims
    });
    
    console.log('User claims:', result.data.claims);
    return result.data.claims;
    
  } catch (error) {
    console.error('Error getting custom claims:', error);
  }
};

// Check own claims
const myClaims = await checkUserClaims();

// Check another user's claims (requires owner/manager permissions)
const otherUserClaims = await checkUserClaims('user123');
```

## Firestore Security Rules Integration

With custom claims set, you can use them in your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Restaurant-specific rules using custom claims
    match /restaurants/{restaurantId} {
      // Only users assigned to this restaurant can access it
      allow read, write: if request.auth != null 
        && request.auth.token.restaurantId == restaurantId
        && request.auth.token.isActive == true;
      
      // Owner-specific rules
      match /settings {
        allow read, write: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId
          && request.auth.token.role == 'Owner'
          && request.auth.token.isActive == true;
      }
      
      // Manager and Owner can manage staff
      match /staff/{staffId} {
        allow read, write: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId
          && (request.auth.token.role == 'Owner' || request.auth.token.role == 'Manager')
          && request.auth.token.isActive == true;
      }
    }
    
    // Orders - staff can create, managers can read all
    match /orders/{orderId} {
      allow create: if request.auth != null 
        && request.auth.token.isActive == true;
      
      allow read, update: if request.auth != null 
        && request.auth.token.restaurantId == resource.data.restaurantId
        && (request.auth.token.role == 'Owner' || request.auth.token.role == 'Manager')
        && request.auth.token.isActive == true;
    }
  }
}
```

## Deployment Instructions

1. **Deploy the Cloud Functions:**
   ```bash
   cd functions
   npm run deploy
   ```

2. **Test the Functions:**
   - Create a new user account
   - Check the Firebase Functions logs to see the custom claims being set
   - Verify the claims are available in the client after token refresh

3. **Update Firestore Rules:**
   - Deploy the updated security rules that use custom claims
   - Test access control with different user roles

## Troubleshooting

### Common Issues:

1. **Custom claims not appearing immediately:**
   - Solution: Force refresh the ID token using `getIdToken(user, true)`

2. **Claims not updating after role change:**
   - Solution: The user needs to refresh their ID token to get the new claims

3. **Permission denied when updating claims:**
   - Solution: Ensure the requester has owner or manager role in the database

4. **Claims missing for existing users:**
   - Solution: Use the `refreshUserClaimsOnLogin` function or manually call `updateUserCustomClaims`

### Debugging:

1. **Check Function Logs:**
   ```bash
   firebase functions:log
   ```

2. **Verify Claims in Client:**
   ```javascript
   const idToken = await getIdToken(user, true);
   const decodedToken = JSON.parse(atob(idToken.split('.')[1]));
   console.log('Decoded token:', decodedToken);
   ```

3. **Test Firestore Rules:**
   - Use the Firebase Console to test security rules with different user tokens

## Security Considerations

1. **Custom claims are stored in the JWT token** - they're not secret and can be decoded
2. **Always validate claims on the server side** - don't rely solely on client-side checks
3. **Use Firestore security rules** to enforce access control based on custom claims
4. **Regularly audit user roles** and permissions

## Best Practices

1. **Set default claims on signup** - ensures all users have the necessary metadata
2. **Refresh tokens after role changes** - inform users to refresh their tokens
3. **Use consistent role names** - stick to "Owner", "Manager", "Staff" throughout your app
4. **Log custom claim changes** - keep audit trails of role changes
5. **Test with different user roles** - ensure your app works correctly for all user types

## Example Complete Flow

1. **User signs up** → Cloud Function sets `role: "Staff"`, `restaurantId: "default_restaurant"`, `isActive: true`
2. **Client refreshes token** → Gets the new claims in `request.auth.token`
3. **App checks user role** → Shows appropriate UI based on role
4. **Owner promotes user** → Calls `updateUserCustomClaims` to change role to "Manager"
5. **User refreshes token** → Gets updated claims, app shows manager features
6. **Firestore rules** → Allow/deny access based on custom claims

This implementation provides a robust, scalable way to manage user roles and permissions in your Firebase application.
