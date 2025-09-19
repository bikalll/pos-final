// Test Firebase Connection with New Configuration
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Your new Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtcCbBOLmqsGZ_IPYIz0fhqYXTcWtlWJU",
  authDomain: "dbarbi-4c494.firebaseapp.com",
  projectId: "dbarbi-4c494",
  storageBucket: "dbarbi-4c494.firebasestorage.app",
  messagingSenderId: "44854741850",
  appId: "1:44854741850:android:acfd13df564f7265c34163"
};

async function testFirebaseConnection() {
  try {
    console.log('🔥 Testing Firebase connection with new configuration...');
    console.log('Project ID:', firebaseConfig.projectId);
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    
    // Test connection
    const testDoc = doc(firestore, 'test', 'connection');
    const testSnapshot = await getDoc(testDoc);
    
    console.log('✅ Firebase connection successful!');
    console.log('✅ Project:', firebaseConfig.projectId);
    console.log('✅ Firestore connected');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    console.error('❌ Error details:', error);
    return false;
  }
}

// Run the test
testFirebaseConnection().then(success => {
  if (success) {
    console.log('\n🎉 Firebase configuration is working correctly!');
    console.log('Your app should now connect to the new Firebase project.');
  } else {
    console.log('\n💥 Firebase configuration needs attention.');
    console.log('Please check your google-services.json and environment variables.');
  }
});
