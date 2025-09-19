import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import * as ImagePicker from 'expo-image-picker';

export interface ImageUploadResult {
  url: string;
  path: string;
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
   * Upload image to Firebase Storage
   */
  async uploadImage(
    base64Data: string, 
    path: string, 
    contentType: string = 'image/jpeg'
  ): Promise<ImageUploadResult> {
    try {
      console.log('🔥 Firebase Storage - Starting upload...');
      console.log('🔥 Firebase Storage - Path:', path);
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
      const storageRef = ref(storage, path);
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
      };
    } catch (error) {
      console.error('❌ Firebase Storage - Error details:', error);
      console.error('❌ Firebase Storage - Error message:', error.message);
      console.error('❌ Firebase Storage - Error stack:', error.stack);
      console.error('❌ Firebase Storage - Error name:', error.name);
      throw new Error(`Failed to upload image to Firebase Storage: ${error.message}`);
    }
  }

  /**
   * Upload employee photo
   */
  async uploadEmployeePhoto(
    base64Data: string, 
    employeeId: string, 
    restaurantId: string
  ): Promise<ImageUploadResult> {
    const timestamp = Date.now();
    const path = `restaurants/${restaurantId}/employees/${employeeId}/photos/${timestamp}.jpg`;
    return this.uploadImage(base64Data, path);
  }

  /**
   * Upload restaurant logo
   */
  async uploadRestaurantLogo(
    base64Data: string, 
    restaurantId: string
  ): Promise<ImageUploadResult> {
    const timestamp = Date.now();
    const path = `restaurants/${restaurantId}/logo/${timestamp}.jpg`;
    return this.uploadImage(base64Data, path);
  }

  /**
   * Upload user profile photo
   */
  async uploadUserProfilePhoto(
    base64Data: string, 
    userId: string
  ): Promise<ImageUploadResult> {
    const timestamp = Date.now();
    const path = `users/${userId}/profile/${timestamp}.jpg`;
    return this.uploadImage(base64Data, path);
  }

  /**
   * Delete image from Firebase Storage
   */
  async deleteImage(imagePath: string): Promise<void> {
    try {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image from Firebase Storage:', error);
      throw new Error('Failed to delete image from Firebase Storage');
    }
  }

  /**
   * Take photo with camera and upload to Firebase Storage
   */
  async takePhotoAndUpload(
    path: string, 
    restaurantId?: string, 
    employeeId?: string
  ): Promise<ImageUploadResult> {
    try {
      console.log('📷 Firebase Storage Service - Requesting camera permissions...');
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission denied');
      }
      console.log('📷 Firebase Storage Service - Camera permissions granted');

      // Take photo
      console.log('📷 Firebase Storage Service - Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
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
      
      // Check image size
      const imageSizeKB = Math.round(base64.length * 0.75 / 1024); // Approximate size in KB
      console.log('📷 Firebase Storage Service - Image size:', imageSizeKB, 'KB');
      
      console.log('📷 Firebase Storage Service - Base64 conversion complete, uploading to Firebase Storage...');
      const uploadResult = await this.uploadImage(base64, path);
      console.log('📷 Firebase Storage Service - Upload successful:', uploadResult.url);
      return uploadResult;
    } catch (error) {
      console.error('❌ Firebase Storage Service - Take photo and upload error:', error);
      throw error;
    }
  }

  /**
   * Select image from library and upload to Firebase Storage
   */
  async selectImageAndUpload(path: string): Promise<ImageUploadResult> {
    try {
      console.log('📷 Firebase Storage Service - Requesting media library permissions...');
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media library permission denied');
      }
      console.log('📷 Firebase Storage Service - Media library permissions granted');

      // Select image
      console.log('📷 Firebase Storage Service - Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
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
      
      // Check image size
      const imageSizeKB = Math.round(base64.length * 0.75 / 1024); // Approximate size in KB
      console.log('📷 Firebase Storage Service - Image size:', imageSizeKB, 'KB');
      
      console.log('📷 Firebase Storage Service - Base64 conversion complete, uploading to Firebase Storage...');
      const uploadResult = await this.uploadImage(base64, path);
      console.log('📷 Firebase Storage Service - Upload successful:', uploadResult.url);
      return uploadResult;
    } catch (error) {
      console.error('❌ Firebase Storage Service - Select image and upload error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseStorageService = new FirebaseStorageService();
export default firebaseStorageService;
