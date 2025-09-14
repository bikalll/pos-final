import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { imageService, ImageInfo } from '../services/imageService';

const ImageTestComponent: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);

  const handleTestCamera = async () => {
    console.log('Testing camera...');
    try {
      const imageInfo = await imageService.pickFromCamera();
      console.log('Camera result:', imageInfo);
      if (imageInfo) {
        setSelectedImage(imageInfo);
        Alert.alert('Success', 'Image captured successfully!');
      } else {
        Alert.alert('No Image', 'No image was captured');
      }
    } catch (error) {
      console.error('Camera test failed:', error);
      Alert.alert('Error', 'Camera test failed: ' + error);
    }
  };

  const handleTestLibrary = async () => {
    console.log('Testing library...');
    try {
      const imageInfo = await imageService.pickFromLibrary();
      console.log('Library result:', imageInfo);
      if (imageInfo) {
        setSelectedImage(imageInfo);
        Alert.alert('Success', 'Image selected successfully!');
      } else {
        Alert.alert('No Image', 'No image was selected');
      }
    } catch (error) {
      console.error('Library test failed:', error);
      Alert.alert('Error', 'Library test failed: ' + error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Picker Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleTestCamera}>
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={styles.buttonText}>Test Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleTestLibrary}>
        <Ionicons name="images" size={24} color="#fff" />
        <Text style={styles.buttonText}>Test Library</Text>
      </TouchableOpacity>

      {selectedImage && (
        <View style={styles.imageInfo}>
          <Text style={styles.imageInfoText}>Selected Image:</Text>
          <Text style={styles.imageInfoText}>Size: {selectedImage.width} x {selectedImage.height}</Text>
          <Text style={styles.imageInfoText}>File Size: {Math.round(selectedImage.size / 1024)} KB</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  imageInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  imageInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
});

export default ImageTestComponent;


