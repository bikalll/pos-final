// Script to fix existing role inconsistencies in the database
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

async function fixRoleInconsistencies() {
  try {
    console.log('🔧 Fixing role inconsistencies...\n');

    // Sign in as owner
    const ownerEmail = 'owner@example.com';
    const ownerPassword = 'password123';
    
    console.log('Signing in as owner...');
    const userCredential = await signInWithEmailAndPassword(auth, ownerEmail, ownerPassword);
    console.log('✅ Owner signed in successfully\n');

    // Get restaurant ID
    const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
    const userData = userDoc.data();
    const restaurantId = userData?.restaurantId;
    
    if (!restaurantId) {
      throw new Error('No restaurant ID found for owner');
    }
    
    console.log(`Restaurant ID: ${restaurantId}\n`);

    // Get all users and staff
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    const staffSnapshot = await getDocs(collection(firestore, `restaurants/${restaurantId}/staff`));
    
    const users = [];
    const staff = [];
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.restaurantId === restaurantId) {
        users.push({ id: doc.id, ...data });
      }
    });

    staffSnapshot.forEach(doc => {
      const data = doc.data();
      staff.push({ id: doc.id, ...data });
    });

    console.log(`Found ${users.length} users and ${staff.length} staff members\n`);

    // Fix inconsistencies
    let fixed = 0;

    for (const user of users) {
      if (user.role === 'employee') {
        // Find corresponding staff member
        const staffMember = staff.find(s => s.email === user.email || s.id === user.id);
        
        if (staffMember) {
          // Update user role based on staff role
          const correctRole = staffMember.role.toLowerCase();
          await updateDoc(doc(firestore, 'users', user.id), {
            role: correctRole
          });
          
          console.log(`✅ Fixed ${user.displayName}: updated role from "employee" to "${correctRole}"`);
          fixed++;
        } else {
          // No staff record found, default to staff
          await updateDoc(doc(firestore, 'users', user.id), {
            role: 'staff'
          });
          
          console.log(`✅ Fixed ${user.displayName}: updated role from "employee" to "staff" (no staff record found)`);
          fixed++;
        }
      }
    }

    console.log(`\n🎉 Fixed ${fixed} role inconsistencies!`);

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

// Run the fix
fixRoleInconsistencies();

