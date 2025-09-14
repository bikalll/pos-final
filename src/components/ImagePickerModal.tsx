import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { imageService, ImageInfo } from '../services/imageService';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageInfo: ImageInfo) => void;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onImageSelected,
}) => {

  const handleCameraPress = async () => {
    try {
      const imageInfo = await imageService.pickFromCamera();
      if (imageInfo) {
        const validation = imageService.validateImage(imageInfo);
        if (validation.valid) {
          onImageSelected(imageInfo);
          onClose();
        } else {
          Alert.alert('Invalid Image', validation.error);
        }
      }
    } catch (error) {
      console.error('Camera selection failed:', error);
    }
  };

  const handleLibraryPress = async () => {
    try {
      const imageInfo = await imageService.pickFromLibrary();
      if (imageInfo) {
        const validation = imageService.validateImage(imageInfo);
        if (validation.valid) {
          onImageSelected(imageInfo);
          onClose();
        } else {
          Alert.alert('Invalid Image', validation.error);
        }
      }
    } catch (error) {
      console.error('Library selection failed:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Image</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TouchableOpacity style={styles.option} onPress={handleCameraPress}>
              <View style={styles.iconContainer}>
                <Ionicons name="camera" size={32} color="#007AFF" />
              </View>
              <Text style={styles.optionTitle}>Take Photo</Text>
              <Text style={styles.optionSubtitle}>Use camera to take a new photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleLibraryPress}>
              <View style={styles.iconContainer}>
                <Ionicons name="images" size={32} color="#007AFF" />
              </View>
              <Text style={styles.optionTitle}>Choose from Library</Text>
              <Text style={styles.optionSubtitle}>Select from your photo gallery</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});

export default ImagePickerModal;




