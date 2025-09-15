import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const IMGBB_API_KEY = 'ff7e9b429a79828004e588b651c7e041';

export interface ImageUploadResult {
  url: string;
  deleteUrl?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
  type?: string;
}

class ImgBBService {
  private apiKey: string;

  constructor(apiKey: string = IMGBB_API_KEY) {
    this.apiKey = apiKey;
  }

  /**
   * Upload image to ImgBB and return the URL (simplified version matching logo upload)
   */
  async uploadImage(imageBase64: string): Promise<ImageUploadResult> {
    try {
      console.log('📤 ImgBB Service - Preparing upload...');
      const form = new FormData();
      // ImgBB expects raw base64 string without data URI prefix
      form.append('image', imageBase64);
      
      console.log('📤 ImgBB Service - Sending request to ImgBB API...');
      
      // Use same approach as logo upload (no timeout)
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${this.apiKey}`, {
        method: 'POST',
        body: form as any,
      });

      console.log('📤 ImgBB Service - Response received:', response.status);
      const json = await response.json();
      
      if (!response.ok || !json?.data) {
        console.error('📤 ImgBB Service - Upload failed:', json);
        throw new Error(json?.error?.message || 'Upload failed');
      }

      const directUrl = (json.data.display_url || json.data.url || (json.data.image && json.data.image.url)) as string | undefined;
      if (!directUrl) {
        throw new Error('Upload succeeded but URL missing');
      }

      console.log('📤 ImgBB Service - Upload successful, URL:', directUrl);
      return {
        url: directUrl,
        deleteUrl: json.data.delete_url,
        size: json.data.size,
        width: json.data.width,
        height: json.data.height,
      };
    } catch (error) {
      console.error('❌ ImgBB Service - Upload error:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert image asset to base64 string
   */
  async ensureBase64FromAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
    try {
      if (asset.base64) {
        return asset.base64;
      }

      // If no base64, read the file and convert
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Error converting asset to base64:', error);
      throw new Error('Failed to convert image to base64');
    }
  }

  /**
   * Take photo with camera and upload to ImgBB
   */
  async takePhotoAndUpload(): Promise<ImageUploadResult> {
    try {
      console.log('📷 ImgBB Service - Requesting camera permissions...');
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission denied');
      }
      console.log('📷 ImgBB Service - Camera permissions granted');

      // Take photo
      console.log('📷 ImgBB Service - Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for attendance photos
        quality: 0.5, // Reduced quality for faster upload
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('Photo capture canceled');
      }
      console.log('📷 ImgBB Service - Photo captured successfully');

      const asset = result.assets[0];
      console.log('📷 ImgBB Service - Converting to base64...');
      const base64 = await this.ensureBase64FromAsset(asset);
      
      // Check image size
      const imageSizeKB = Math.round(base64.length * 0.75 / 1024); // Approximate size in KB
      console.log('📷 ImgBB Service - Image size:', imageSizeKB, 'KB');
      
      console.log('📷 ImgBB Service - Base64 conversion complete, uploading to ImgBB...');
      const uploadResult = await this.uploadImage(base64);
      console.log('📷 ImgBB Service - Upload successful:', uploadResult.url);
      return uploadResult;
    } catch (error) {
      console.error('❌ ImgBB Service - Take photo and upload error:', error);
      throw error;
    }
  }

  /**
   * Select image from library and upload to ImgBB
   */
  async selectImageAndUpload(): Promise<ImageUploadResult> {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media library permission denied');
      }

      // Select image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for attendance photos
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('Image selection canceled');
      }

      const asset = result.assets[0];
      const base64 = await this.ensureBase64FromAsset(asset);
      
      return await this.uploadImage(base64);
    } catch (error) {
      console.error('Select image and upload error:', error);
      throw error;
    }
  }

  /**
   * Upload existing image file to ImgBB
   */
  async uploadImageFile(imageUri: string): Promise<ImageUploadResult> {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return await this.uploadImage(base64);
    } catch (error) {
      console.error('Upload image file error:', error);
      throw error;
    }
  }

  /**
   * Validate image before upload
   */
  validateImage(imageInfo: ImageInfo): { valid: boolean; error?: string } {
    // Check file size (max 32MB for ImgBB)
    const maxSize = 32 * 1024 * 1024; // 32MB
    if (imageInfo.fileSize && imageInfo.fileSize > maxSize) {
      return { valid: false, error: 'Image size exceeds 32MB limit' };
    }

    // Check dimensions
    if (imageInfo.width < 10 || imageInfo.height < 10) {
      return { valid: false, error: 'Image dimensions too small' };
    }

    return { valid: true };
  }
}

// Create singleton instance
export const imgbbService = new ImgBBService();

// Export the class for custom instances
export default ImgBBService;

