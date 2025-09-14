# Firestore Troubleshooting Guide

## 🚨 **"User metadata not found" Error**

This error occurs when a user exists in Firebase Auth but not in Firestore. Here's how to fix it:

## ✅ **Quick Fixes**

### **Fix 1: Enable Firestore in Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **dbarbi-4c494**
3. Click **"Firestore Database"** in left sidebar
4. If not enabled, click **"Create database"**
5. Choose **"Start in test mode"**
6. Select location and click **"Done"**

### **Fix 2: Check Firestore Security Rules**
1. Go to **"Rules"** tab in Firestore Database
2. Replace with these rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write restaurant data
    match /restaurants/{restaurantId}/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write restaurant documents
    match /restaurants/{restaurantId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Click **"Publish"**

### **Fix 3: Test Firestore Connection**
1. **Restart your app**
2. **Check console logs** for:
   - ✅ `Firebase Firestore connected successfully`
   - ✅ `Getting user metadata for UID: [user-id]`
   - ✅ `User document exists: true/false`

## 🔍 **Debug Steps**

### **Step 1: Check if User Exists in Firestore**
1. Go to Firebase Console → Firestore Database
2. Look for `users` collection
3. Check if your user ID exists as a document

### **Step 2: Check Console Logs**
Look for these messages in your app console:
```
Getting user metadata for UID: [your-user-id]
User document exists: true/false
User metadata found: {...} or User metadata not found in Firestore
```

### **Step 3: Create User Manually (if needed)**
If the user doesn't exist in Firestore, the app will now automatically create default metadata.

## 🛠️ **Manual User Creation (if needed)**

If you need to create a user manually in Firestore:

1. **Go to Firebase Console** → Firestore Database
2. **Click "Start collection"**
3. **Collection ID**: `users`
4. **Document ID**: Your user's UID (from Firebase Auth)
5. **Add fields**:
   ```
   uid: [your-user-id]
   email: [your-email]
   role: "owner"
   restaurantId: "default_restaurant"
   displayName: [your-name]
   createdAt: [timestamp]
   isActive: true
   createdBy: "system"
   ```

## 🧪 **Test the Fix**

### **Test 1: App Startup**
1. **Launch app** → Check console for Firestore connection
2. **Should see**: `✅ Firebase Firestore connected successfully`

### **Test 2: Login**
1. **Try to login** → Use existing credentials
2. **Check console** → Should see user metadata creation/retrieval
3. **Should work** → Login should succeed

### **Test 3: Create New Account**
1. **Go to "Create New Account"**
2. **Fill form** → Create new owner account
3. **Should work** → Account creation should succeed

## 📊 **Expected Console Output**

### **Successful Login (existing user)**
```
✅ Firebase Firestore connected successfully
Getting user metadata for UID: [user-id]
User document exists: true
User metadata found: {uid: "...", email: "...", role: "owner", ...}
✅ Firebase Auth Enhanced initialized successfully
```

### **Successful Login (new user - auto-created)**
```
✅ Firebase Firestore connected successfully
Getting user metadata for UID: [user-id]
User document exists: false
User metadata not found in Firestore
User metadata not found, creating default metadata...
Default user metadata created
Getting user metadata for UID: [user-id]
User document exists: true
User metadata found: {uid: "...", email: "...", role: "owner", ...}
✅ Firebase Auth Enhanced initialized successfully
```

## 🚨 **Common Issues**

### **Issue 1: "Permission denied"**
- **Cause**: Firestore security rules too restrictive
- **Fix**: Update rules to allow authenticated users

### **Issue 2: "Collection not found"**
- **Cause**: Firestore not enabled
- **Fix**: Enable Firestore in Firebase Console

### **Issue 3: "User metadata not found"**
- **Cause**: User exists in Auth but not in Firestore
- **Fix**: App now auto-creates metadata (or create manually)

### **Issue 4: "Account is deactivated"**
- **Cause**: User has `isActive: false` in Firestore
- **Fix**: Update user document to set `isActive: true`

## 🎯 **Next Steps**

1. **Enable Firestore** in Firebase Console
2. **Set up security rules** as shown above
3. **Test login** with existing credentials
4. **Check console logs** for debugging info
5. **Create new account** if needed

---

## 🎉 **Firestore Setup Complete!**

After following this guide:
- ✅ **Firestore is enabled** and properly configured
- ✅ **Security rules** allow authenticated users
- ✅ **User metadata** is automatically created if missing
- ✅ **Login works** for both existing and new users
- ✅ **Account creation** works properly

**Your app should now work without "User metadata not found" errors! 🚀**
