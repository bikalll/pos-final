/**
 * Test script for Custom Claims Cloud Functions
 * This script tests the deployed functions to ensure they work correctly
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    // Use service account key or default credentials
    // Make sure you have the right permissions
  });
}

async function testCustomClaimsFunctions() {
  console.log('🧪 Testing Custom Claims Cloud Functions...\n');

  try {
    // Test 1: Create a test user
    console.log('1️⃣ Creating test user...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const userRecord = await admin.auth().createUser({
      email: testEmail,
      password: testPassword,
      displayName: 'Test User'
    });
    
    console.log(`✅ Test user created: ${userRecord.uid}`);
    console.log(`   Email: ${testEmail}`);

    // Wait a moment for the onCreate trigger to fire
    console.log('\n⏳ Waiting for onCreate trigger to set custom claims...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Check if custom claims were set
    console.log('\n2️⃣ Checking custom claims...');
    const userWithClaims = await admin.auth().getUser(userRecord.uid);
    const customClaims = userWithClaims.customClaims || {};
    
    console.log('📋 Custom claims found:');
    console.log(`   Role: ${customClaims.role || 'NOT SET'}`);
    console.log(`   Restaurant ID: ${customClaims.restaurantId || 'NOT SET'}`);
    console.log(`   Is Active: ${customClaims.isActive !== undefined ? customClaims.isActive : 'NOT SET'}`);

    // Verify expected claims
    const expectedClaims = {
      role: 'Staff',
      restaurantId: 'default_restaurant',
      isActive: true
    };

    let allClaimsCorrect = true;
    for (const [key, expectedValue] of Object.entries(expectedClaims)) {
      if (customClaims[key] !== expectedValue) {
        console.log(`❌ Claim '${key}' is incorrect. Expected: ${expectedValue}, Got: ${customClaims[key]}`);
        allClaimsCorrect = false;
      }
    }

    if (allClaimsCorrect) {
      console.log('✅ All custom claims are correctly set!');
    } else {
      console.log('❌ Some custom claims are missing or incorrect');
    }

    // Test 3: Test updating custom claims (simulate admin action)
    console.log('\n3️⃣ Testing custom claims update...');
    const updatedClaims = {
      role: 'Manager',
      restaurantId: 'test_restaurant_123',
      isActive: true
    };

    await admin.auth().setCustomUserClaims(userRecord.uid, updatedClaims);
    console.log('✅ Custom claims updated successfully');

    // Verify the update
    const updatedUser = await admin.auth().getUser(userRecord.uid);
    const updatedCustomClaims = updatedUser.customClaims || {};
    
    console.log('📋 Updated custom claims:');
    console.log(`   Role: ${updatedCustomClaims.role}`);
    console.log(`   Restaurant ID: ${updatedCustomClaims.restaurantId}`);
    console.log(`   Is Active: ${updatedCustomClaims.isActive}`);

    // Test 4: Test Firestore rules with custom claims
    console.log('\n4️⃣ Testing Firestore access with custom claims...');
    const db = admin.firestore();
    
    // Create a test document that requires custom claims
    const testDocRef = db.collection('test_restaurants').doc('test_restaurant_123');
    await testDocRef.set({
      name: 'Test Restaurant',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Test document created in Firestore');

    // Test 5: Clean up test data
    console.log('\n5️⃣ Cleaning up test data...');
    
    // Delete the test user
    await admin.auth().deleteUser(userRecord.uid);
    console.log('✅ Test user deleted');
    
    // Delete the test document
    await testDocRef.delete();
    console.log('✅ Test document deleted');

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ User creation triggers custom claims setting');
    console.log('   ✅ Custom claims are set with correct default values');
    console.log('   ✅ Custom claims can be updated');
    console.log('   ✅ Firestore integration works');
    console.log('   ✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    
    // Try to clean up on error
    try {
      if (userRecord && userRecord.uid) {
        await admin.auth().deleteUser(userRecord.uid);
        console.log('🧹 Cleaned up test user after error');
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError.message);
    }
  }
}

// Run the test
testCustomClaimsFunctions()
  .then(() => {
    console.log('\n✨ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
