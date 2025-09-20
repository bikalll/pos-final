import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import * as ImagePicker from 'expo-image-picker';

export interface ImageUploadResult {
  url: string;
  path: string;
  deleteUrl?: string;
  size?: number;
  width?: number;
  height?: number;
}

class FirebaseStorageService {
  /**
   * Convert ImagePicker asset to base64 string
   */
  async ensureBase64FromAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
    if (asset.base64) {
      return asset.base64;
    }

    if (asset.uri) {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Failed to read image data'));
          reader.onload = () => {
            const result = reader.result as string;
            if (result) {
              // Remove data URL prefix to get just the base64 string
              const base64 = result.split(',')[1];
              resolve(base64);
            } else {
              reject(new Error('No base64 data available'));
            }
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting asset to base64:', error);
        throw new Error('Failed to convert image to base64');
      }
    }

    throw new Error('No image data available');
  }

  /**
   * Test Firebase Storage connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Firebase Storage connection...');
      
      // Check if storage is properly initialized
      if (!storage) {
        console.error('❌ Storage is not initialized');
        return false;
      }
      
      console.log('✅ Storage instance exists');
      console.log('   Storage bucket:', storage.app.options.storageBucket);
      
      // Test with minimal data
      const testRef = ref(storage, 'test/connection-test.txt');
      const testData = new Blob(['test'], { type: 'text/plain' });
      
      console.log('📤 Attempting test upload...');
      const snapshot = await uploadBytes(testRef, testData);
      console.log('✅ Test upload successful');
      
      // Clean up test file
      await deleteObject(testRef);
      console.log('✅ Test cleanup successful');
      
      return true;
    } catch (error) {
      console.error('❌ Firebase Storage connection test failed:', error);
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      return false;
    }
  }

  /**
   * Upload image to Firebase Storage with enhanced error handling
   */
  async uploadImage(
    base64Data: string, 
    path?: string, 
    contentType: string = 'image/jpeg'
  ): Promise<ImageUploadResult> {
    try {
      console.log('🔥 Firebase Storage - Starting upload...');
      
      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Firebase Storage connection test failed');
      }
      
      // Generate default path if not provided
      const uploadPath = path || `uploads/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      
      console.log('🔥 Firebase Storage - Path:', uploadPath);
      console.log('🔥 Firebase Storage - Content type:', contentType);
      console.log('🔥 Firebase Storage - Base64 length:', base64Data.length);
      console.log('🔥 Firebase Storage - Storage bucket:', storage.app.options.storageBucket);

      // Create a data URL from base64
      const dataUrl = `data:${contentType};base64,${base64Data}`;
      console.log('🔥 Firebase Storage - Data URL created, length:', dataUrl.length);
      
      // Convert data URL to blob using fetch
      console.log('🔥 Firebase Storage - Converting data URL to blob...');
      const response = await fetch(dataUrl);
      console.log('🔥 Firebase Storage - Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to convert data URL to blob: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('🔥 Firebase Storage - Blob created, size:', blob.size, 'type:', blob.type);

      // Create storage reference
      const storageRef = ref(storage, uploadPath);
      console.log('🔥 Firebase Storage - Storage ref created:', storageRef.fullPath);
      console.log('🔥 Firebase Storage - Storage ref bucket:', storageRef.bucket);
      
      // Upload the file
      console.log('🔥 Firebase Storage - Starting uploadBytes...');
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: contentType,
      });
      console.log('🔥 Firebase Storage - Upload completed, getting download URL...');

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔥 Firebase Storage - Download URL obtained:', downloadURL);

      return {
        url: downloadURL,
        path: snapshot.ref.fullPath,
        size: blob.size,
      };
    } catch (error) {
      console.error('❌ Firebase Storage - Error details:', error);
      console.error('❌ Firebase Storage - Error message:', error.message);
      console.error('❌ Firebase Storage - Error code:', error.code);
      console.error('❌ Firebase Storage - Error stack:', error.stack);
      
      // Provide specific error guidance
      if (error.code === 'storage/unauthorized') {
        throw new Error('Storage access denied. Check security rules and authentication.');
      } else if (error.code === 'storage/object-not-found') {
        throw new Error('Storage bucket not found. Check Firebase project configuration.');
      } else if (error.code === 'storage/quota-exceeded') {
        throw new Error('Storage quota exceeded. Check Firebase usage limits.');
      } else if (error.message.includes('Network request fail')) {
        throw new Error('Network error. Check internet connection and Firebase Storage service status.');
      } else {
        throw new Error(`Failed to upload image to Firebase Storage: ${error.message}`);
      }
    }
  }

  // ... rest of the methods remain the same
  async uploadEmployeePhoto(
    base64Data: string, 
    employeeId: string, 
    restaurantId: string
  ): Promise<ImageUploadResult> {
    const timestamp = Date.now();
    const path = `restaurants/${restaurantId}/employees/${employeeId}/photos/${timestamp}.jpg`;
    return this.uploadImage(base64Data, path);
  }

  async uploadRestaurantLogo(
    base64Data: string, 
    restaurantId: string
  ): Promise<ImageUploadResult> {
    const timestamp = Date.now();
    const path = `restaurants/${restaurantId}/logo/${timestamp}.jpg`;
    return this.uploadImage(base64Data, path);
  }

  async uploadUserProfilePhoto(
    base64Data: string, 
    userId: string
  ): Promise<ImageUploadResult> {
    const timestamp = Date.now();
    const path = `users/${userId}/profile/${timestamp}.jpg`;
    return this.uploadImage(base64Data, path);
  }

  async deleteImage(imagePath: string): Promise<void> {
    try {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image from Firebase Storage:', error);
      throw new Error('Failed to delete image from Firebase Storage');
    }
  }

  async takePhotoAndUpload(
    path?: string, 
    restaurantId?: string, 
    employeeId?: string
  ): Promise<ImageUploadResult> {
    try {
      console.log('📷 Firebase Storage Service - Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission denied');
      }
      console.log('📷 Firebase Storage Service - Camera permissions granted');

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('Photo capture canceled');
      }
      console.log('📷 Firebase Storage Service - Photo captured successfully');

      const asset = result.assets[0];
      console.log('📷 Firebase Storage Service - Converting to base64...');
      const base64 = await this.ensureBase64FromAsset(asset);
      
      const imageSizeKB = Math.round(base64.length * 0.75 / 1024);
      console.log('📷 Firebase Storage Service - Image size:', imageSizeKB, 'KB');
      
      console.log('📷 Firebase Storage Service - Base64 conversion complete, uploading to Firebase Storage...');
      const uploadPath = path || (restaurantId && employeeId 
        ? `restaurants/${restaurantId}/employees/${employeeId}/attendance/${Date.now()}.jpg`
        : `attendance/${Date.now()}.jpg`);
      const uploadResult = await this.uploadImage(base64, uploadPath);
      console.log('📷 Firebase Storage Service - Upload successful:', uploadResult.url);
      return uploadResult;
    } catch (error) {
      console.error('❌ Firebase Storage Service - Take photo and upload error:', error);
      throw error;
    }
  }

  async selectImageAndUpload(path?: string): Promise<ImageUploadResult> {
    try {
      console.log('📷 Firebase Storage Service - Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media library permission denied');
      }
      console.log('📷 Firebase Storage Service - Media library permissions granted');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('Image selection canceled');
      }
      console.log('📷 Firebase Storage Service - Image selected successfully');

      const asset = result.assets[0];
      console.log('📷 Firebase Storage Service - Converting to base64...');
      const base64 = await this.ensureBase64FromAsset(asset);
      
      const imageSizeKB = Math.round(base64.length * 0.75 / 1024);
      console.log('📷 Firebase Storage Service - Image size:', imageSizeKB, 'KB');
      
      console.log('📷 Firebase Storage Service - Base64 conversion complete, uploading to Firebase Storage...');
      const uploadPath = path || `uploads/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const uploadResult = await this.uploadImage(base64, uploadPath);
      console.log('📷 Firebase Storage Service - Upload successful:', uploadResult.url);
      return uploadResult;
    } catch (error) {
      console.error('❌ Firebase Storage Service - Select image and upload error:', error);
      throw error;
    }
  }

  async uploadImageFile(imageUri: string, path?: string): Promise<ImageUploadResult> {
    try {
      const base64 = await this.ensureBase64FromAsset({ uri: imageUri } as any);
      return await this.uploadImage(base64, path);
    } catch (error) {
      console.error('Upload image file error:', error);
      throw error;
    }
  }

  validateImage(imageInfo: { fileSize?: number; width?: number; height?: number }): { valid: boolean; error?: string } {
    const maxSize = 32 * 1024 * 1024; // 32MB
    if (imageInfo.fileSize && imageInfo.fileSize > maxSize) {
      return { valid: false, error: 'Image size exceeds 32MB limit' };
    }

    if (imageInfo.width && imageInfo.height && (imageInfo.width < 10 || imageInfo.height < 10)) {
      return { valid: false, error: 'Image dimensions too small' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const firebaseStorageService = new FirebaseStorageService();
export default firebaseStorageService;
