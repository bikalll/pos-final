import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageInfo } from '../services/imageService';

interface MenuItemImageProps {
  imageInfo?: ImageInfo | null;
  onImageChange?: (imageInfo: ImageInfo | null) => void;
  onAddImage?: () => void;
  editable?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const MenuItemImage: React.FC<MenuItemImageProps> = ({
  imageInfo,
  onImageChange,
  onAddImage,
  editable = false,
  size = 'medium',
}) => {
  const [imageError, setImageError] = useState(false);



  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 80, height: 80, borderRadius: 8 };
      case 'large':
        return { width: 200, height: 150, borderRadius: 12 };
      default: // medium
        return { width: 120, height: 90, borderRadius: 10 };
    }
  };

  const handleImagePress = () => {
    console.log('Image pressed, editable:', editable, 'onAddImage exists:', !!onAddImage);
    if (editable && onAddImage) {
      console.log('Calling onAddImage...');
      onAddImage();
    }
  };

  const handleRemoveImage = () => {
    if (editable && onImageChange) {
      Alert.alert(
        'Remove Image',
        'Are you sure you want to remove this image?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onImageChange(null),
          },
        ]
      );
    }
  };

  const renderImage = () => {
    if (imageInfo && !imageError) {
      return (
        <Image
          source={{ uri: imageInfo.uri }}
          style={[getSizeStyles(), styles.image]}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={[getSizeStyles(), styles.placeholder]}>
        <Ionicons name="image-outline" size={24} color={editable ? "#007AFF" : "#ccc"} />
        <Text style={[styles.placeholderText, editable && styles.placeholderTextEditable]}>
          {editable ? "Tap to Add Image" : "No Image"}
        </Text>
      </View>
    );
  };

  const renderOverlay = () => {
    if (!editable) return null;

    return (
      <View style={[getSizeStyles(), styles.overlay]}>
        {!imageInfo && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleImagePress}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}
        
        {imageInfo && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveImage}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={handleImagePress}
        activeOpacity={editable ? 0.7 : 1}
      >
        {renderImage()}
        {renderOverlay()}
      </TouchableOpacity>

      {editable && imageInfo && (
        <View style={styles.imageInfo}>
          <Text style={styles.imageInfoText}>
            {imageInfo.width} × {imageInfo.height}
          </Text>
          <Text style={styles.imageInfoText}>
            {Math.round(imageInfo.size / 1024)} KB
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  placeholderTextEditable: {
    color: '#007AFF',
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  imageInfoText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
});

export default MenuItemImage;


