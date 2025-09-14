/**
 * Quick test to check if Firestore security rules are working
 */

console.log('🔍 Checking Firestore Security Rules...\n');

console.log('📋 Steps to verify Firestore rules are working:');
console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
console.log('2. Select your project: dbarbi-4c494');
console.log('3. Go to Firestore Database');
console.log('4. Click on "Rules" tab');
console.log('5. Check if the rules are deployed and active');

console.log('\n🔧 Expected Rules:');
console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Restaurant data - only authenticated users from that restaurant can access
    match /restaurants/{restaurantId}/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.restaurantId == restaurantId;
    }
    
    // Allow authenticated users to read/write their restaurant data
    match /restaurants/{restaurantId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.restaurantId == restaurantId;
    }
  }
}
`);

console.log('\n🚨 If rules are NOT deployed:');
console.log('1. Run: firebase login');
console.log('2. Run: firebase deploy --only firestore:rules');
console.log('3. Or run the deploy-firestore-rules.bat file');

console.log('\n🧪 Test in your app:');
console.log('1. Open the app and go to Receipts screen');
console.log('2. Check console logs for:');
console.log('   - "🔍 FirestoreService.getCollection - Path: restaurants/[restaurantId]/receipts"');
console.log('   - "🔍 FirestoreService.readAll - Collection path: restaurants/[restaurantId]/receipts"');
console.log('   - "🚨 SECURITY: Filtered out receipt from different restaurant" (if rules not working)');

console.log('\n✅ Expected behavior:');
console.log('- You should only see receipts from your restaurant');
console.log('- Console should show the correct collection path');
console.log('- No security warnings should appear');

console.log('\n❌ If you still see all receipts:');
console.log('- Firestore rules are not deployed or not working');
console.log('- Client-side filtering is now active as backup');
console.log('- Check Firebase Console for rule deployment status');


















