// Script to fix owner roles in Firebase
// Run this script to fix existing owner accounts that have incorrect "Staff" role

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, getDocs } = require('firebase/firestore');

// Initialize Firebase (you'll need to add your config)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixOwnerRoles() {
  try {
    console.log('🔍 Searching for restaurants with incorrect owner roles...');
    
    // Get all restaurants
    const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
    
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantId = restaurantDoc.id;
      const restaurantData = restaurantDoc.data();
      
      console.log(`\n📋 Processing restaurant: ${restaurantData.name} (${restaurantId})`);
      
      // Get users in this restaurant
      const usersSnapshot = await getDocs(collection(db, `restaurants/${restaurantId}/users`));
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Check if this user has "Staff" role but should be "Owner"
        if (userData.role === 'Staff') {
          // Check the main users collection to see if this user is actually an owner
          const mainUserDoc = await getDoc(doc(db, 'users', userDoc.id));
          
          if (mainUserDoc.exists()) {
            const mainUserData = mainUserDoc.data();
            
            if (mainUserData.role === 'Owner') {
              console.log(`🔧 Fixing owner role for: ${userData.email} (${userDoc.id})`);
              
              // Update the role in the restaurant's users collection
              await updateDoc(doc(db, `restaurants/${restaurantId}/users`, userDoc.id), {
                role: 'Owner'
              });
              
              console.log(`✅ Fixed role for: ${userData.email}`);
            }
          }
        }
      }
    }
    
    console.log('\n🎉 Owner role fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing owner roles:', error);
  }
}

// Run the fix
fixOwnerRoles();
