/**
 * Script to deploy Firestore security rules
 * Run this with: node firebase-deploy-rules.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Firestore Security Rules...\n');

// Check if firebase.json exists
const firebaseJsonPath = path.join(__dirname, 'firebase.json');
if (!fs.existsSync(firebaseJsonPath)) {
  console.log('📝 Creating firebase.json...');
  const firebaseConfig = {
    "firestore": {
      "rules": "firestore.rules",
      "indexes": "firestore.indexes.json"
    }
  };
  
  fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
  console.log('✅ firebase.json created');
}

// Check if firestore.rules exists
const firestoreRulesPath = path.join(__dirname, 'firestore.rules');
if (!fs.existsSync(firestoreRulesPath)) {
  console.log('❌ firestore.rules file not found!');
  console.log('Please make sure firestore.rules exists in the project root.');
  process.exit(1);
}

// Deploy the rules
console.log('🔄 Deploying Firestore rules...');
exec('firebase deploy --only firestore:rules', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Firebase CLI is installed: npm install -g firebase-tools');
    console.log('2. Make sure you are logged in: firebase login');
    console.log('3. Make sure you are in the correct project directory');
    return;
  }
  
  if (stderr) {
    console.log('⚠️ Warnings:', stderr);
  }
  
  console.log('✅ Deployment output:', stdout);
  console.log('\n🎉 Firestore rules deployed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Test your app to see if receipts are now properly filtered');
  console.log('2. Check Firebase Console to verify rules are active');
  console.log('3. Monitor console logs for any security warnings');
});

console.log('\n⏳ Deploying... Please wait...');
























