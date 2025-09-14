// Test script to verify environment variables
require('dotenv/config');

console.log('🔍 Environment Test Results:');
console.log('================================');
console.log('EXPO_PUBLIC_ENABLE_BLUETOOTH:', process.env.EXPO_PUBLIC_ENABLE_BLUETOOTH);
console.log('EXPO_PUBLIC_ENV:', process.env.EXPO_PUBLIC_ENV);
console.log('================================');

if (process.env.EXPO_PUBLIC_ENABLE_BLUETOOTH === 'true') {
  console.log('✅ Bluetooth is enabled in environment');
} else {
  console.log('❌ Bluetooth is NOT enabled in environment');
}

console.log('================================');
console.log('If Bluetooth is enabled, receipt printing should work!');
console.log('Next steps:');
console.log('1. Open your app');
console.log('2. Go to Settings > Printer Setup');
console.log('3. Click the 🛠️ Troubleshooter button');
console.log('4. Run the automated troubleshooting');


