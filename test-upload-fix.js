#!/usr/bin/env node

/**
 * Simple Firebase Storage Test
 * Tests the fixed upload method
 */

import { firebaseStorageService } from './src/services/firebaseStorageService.js';

async function testUpload() {
  console.log('🧪 Testing Firebase Storage Upload Fix...\n');
  
  try {
    // Create a simple test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    console.log('📤 Testing upload with uploadString method...');
    const result = await firebaseStorageService.uploadImage(
      testImageBase64,
      'test/uploadstring-test.png',
      'image/png'
    );
    
    console.log('✅ Upload successful!');
    console.log('   URL:', result.url);
    console.log('   Path:', result.path);
    console.log('   Size:', result.size, 'bytes');
    
    console.log('\n🎉 Fix is working! The fetch() issue has been resolved.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   This might indicate other issues (Firebase setup, network, etc.)');
  }
}

testUpload();
