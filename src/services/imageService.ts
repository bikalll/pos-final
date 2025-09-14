import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

export interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  size: number;
  type: string;
  base64?: string;
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
  quality: number;
}

class ImageService {
  // Request camera and media library permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and media library permissions are required to add images to menu items.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Pick image from camera
  async pickFromCamera(): Promise<ImageInfo | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          size: asset.fileSize || 0,
          type: asset.type || 'image/jpeg',
          base64: asset.base64 || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Camera pick failed:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  }

  // Pick image from media library
  async pickFromLibrary(): Promise<ImageInfo | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          size: asset.fileSize || 0,
          type: asset.type || 'image/jpeg',
          base64: asset.base64 || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Library pick failed:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    }
  }

  // Show image picker options
  async showImagePicker(): Promise<ImageInfo | null> {
    Alert.alert(
      'Add Image',
      'Choose how you want to add an image',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => this.pickFromCamera() },
        { text: 'Choose from Library', onPress: () => this.pickFromLibrary() },
      ]
    );

    // For now, return null as we can't handle the async response in Alert
    // In practice, you'd want to use a custom modal or different approach
    return null;
  }

  // Compress image to reduce file size
  async compressImage(imageInfo: ImageInfo, maxWidth: number = 800, quality: number = 0.7): Promise<CompressedImage> {
    try {
      // For now, return the original image info
      // In a production app, you'd want to use a proper image compression library
      return {
        uri: imageInfo.uri,
        width: Math.min(imageInfo.width, maxWidth),
        height: Math.min(imageInfo.height, maxWidth),
        size: imageInfo.size,
        quality,
      };
    } catch (error) {
      console.error('Image compression failed:', error);
      return {
        uri: imageInfo.uri,
        width: imageInfo.width,
        height: imageInfo.height,
        size: imageInfo.size,
        quality: 1,
      };
    }
  }

  // Get file size in human readable format
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Validate image file
  validateImage(imageInfo: ImageInfo): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxWidth = 4000;
    const maxHeight = 4000;

    if (imageInfo.size > maxSize) {
      return { valid: false, error: `Image size (${this.formatFileSize(imageInfo.size)}) exceeds maximum allowed size (10MB)` };
    }

    if (imageInfo.width > maxWidth || imageInfo.height > maxHeight) {
      return { valid: false, error: `Image dimensions (${imageInfo.width}x${imageInfo.height}) exceed maximum allowed size (4000x4000)` };
    }

    return { valid: true };
  }

  // Save image to app's documents directory
  async saveImageToLocal(imageInfo: ImageInfo, filename: string): Promise<string | null> {
    try {
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) return null;

      const fileUri = `${documentsDir}menu_images/${filename}`;
      
      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(`${documentsDir}menu_images`, { intermediates: true });
      
      // Copy file to local directory
      await FileSystem.copyAsync({
        from: imageInfo.uri,
        to: fileUri,
      });

      return fileUri;
    } catch (error) {
      console.error('Failed to save image locally:', error);
      return null;
    }
  }

  // Delete local image file
  async deleteLocalImage(fileUri: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(fileUri);
      return true;
    } catch (error) {
      console.error('Failed to delete local image:', error);
      return false;
    }
  }
}

export const imageService = new ImageService();
