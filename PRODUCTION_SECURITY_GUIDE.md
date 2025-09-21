# Production Security Configuration Guide

## CRITICAL: Security Issues Found

### 1. API Keys Exposed
- Current API keys are hardcoded and exposed
- Need to generate new production keys immediately
- Never commit API keys to version control

### 2. Firestore Security Rules Too Weak
Current rules allow any authenticated user to access restaurant data.
Need stricter role-based access control.

### 3. Package Name Inconsistency
- google-services.json: com.arbi.rnpos
- app.config.js: com.yourcompany.rnpos

## Production Environment Setup

### Step 1: Create Production Environment File
Create `.env.production` with NEW Firebase keys:

```bash
# Generate new Firebase project for production
# Update these values with your production Firebase project
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_NEW_PRODUCTION_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-production-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-production-project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-production-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-production-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_PRODUCTION_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_PRODUCTION_APP_ID

# Production Settings
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_ENABLE_BLUETOOTH=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
```

### Step 2: Update Firebase Security Rules
Replace current firestore.rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Restaurant data access based on role and restaurant assignment
    match /restaurants/{restaurantId} {
      allow read, write: if request.auth != null 
        && request.auth.token.restaurantId == restaurantId
        && request.auth.token.role in ['owner', 'manager', 'employee'];
      
      // Receipts - employees can create, managers+ can modify
      match /receipts/{receiptId} {
        allow create: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId
          && request.auth.token.role in ['owner', 'manager', 'employee'];
        allow read, update, delete: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId
          && request.auth.token.role in ['owner', 'manager'];
      }
      
      // Menu items - only managers+ can modify
      match /menu/{menuId} {
        allow read: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId;
        allow write: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId
          && request.auth.token.role in ['owner', 'manager'];
      }
      
      // Employee management - only owners
      match /employees/{employeeId} {
        allow read: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId
          && request.auth.token.role in ['owner', 'manager'];
        allow write: if request.auth != null 
          && request.auth.token.restaurantId == restaurantId
          && request.auth.token.role == 'owner';
      }
    }
  }
}
```

### Step 3: Fix Package Name Consistency
Update app.config.js:
```javascript
android: {
  package: "com.arbi.rnpos", // Match google-services.json
  // ... rest of config
}
```

## Production Deployment Checklist

### Security
- [ ] Generate new Firebase API keys
- [ ] Deploy strict Firestore security rules
- [ ] Enable Firebase App Check
- [ ] Set up proper authentication flows
- [ ] Implement session management
- [ ] Add audit logging

### Configuration
- [ ] Create production environment file
- [ ] Update package names consistently
- [ ] Configure production build settings
- [ ] Set up code signing
- [ ] Enable crash reporting

### Monitoring
- [ ] Set up Firebase Crashlytics
- [ ] Enable performance monitoring
- [ ] Configure analytics
- [ ] Set up error alerting
- [ ] Implement uptime monitoring

### Data Management
- [ ] Set up automated backups
- [ ] Configure data retention policies
- [ ] Implement disaster recovery
- [ ] Set up data export functionality
- [ ] Enable audit trails

## Next Steps

1. **IMMEDIATE**: Generate new Firebase project for production
2. **CRITICAL**: Update all API keys and configuration
3. **SECURITY**: Deploy strict security rules
4. **TESTING**: Test all functionality with production config
5. **MONITORING**: Set up production monitoring

## Security Best Practices

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Implement proper role-based access control
- Enable audit logging for all operations
- Regular security audits and updates
- Use HTTPS for all communications
- Implement proper session management
- Enable two-factor authentication where possible

