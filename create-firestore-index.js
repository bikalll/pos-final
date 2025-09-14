// Script to create Firestore composite index for receipts
// Run this in Firebase CLI: firebase deploy --only firestore:indexes

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account key)
// const serviceAccount = require('./path-to-service-account-key.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

console.log('🔧 Firestore Index Creation Script');
console.log('');
console.log('To create the required composite index for receipts:');
console.log('');
console.log('1. Go to Firebase Console:');
console.log('   https://console.firebase.google.com/v1/r/project/dbarbi-4c494/firestore/indexes');
console.log('');
console.log('2. Click "Create Index"');
console.log('');
console.log('3. Set up the index with these settings:');
console.log('   Collection: restaurants/{restaurantId}/receipts');
console.log('   Fields:');
console.log('     - restaurantId (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');
console.log('4. Or use the direct link from the error message:');
console.log('   https://console.firebase.google.com/v1/r/project/dbarbi-4c494/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9kYmFyYmktNGM0OTQvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3JlY2VpcHRzL2luZGV4ZXMvXxABGhAKDHJlc3RhdXJhbnRJZBABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI');
console.log('');
console.log('5. Alternative: Use Firebase CLI:');
console.log('   firebase deploy --only firestore:indexes');
console.log('');
console.log('Note: The app will work without the index, but with client-side sorting instead of server-side sorting.');