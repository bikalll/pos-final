import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useDispatch } from 'react-redux';
import { createVendor } from '../redux/slices/vendorsSliceFirebase';

interface AddVendorModalProps {
  visible: boolean;
  onClose: () => void;
  onVendorAdded: () => void;
}

const AddVendorModal: React.FC<AddVendorModalProps> = ({
  visible,
  onClose,
  onVendorAdded,
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    vendorName: '',
    contact: '',
    address: '',
    supplies: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.vendorName.trim()) {
      Alert.alert('Error', 'Please enter vendor name');
      return;
    }
    if (!formData.contact.trim()) {
      Alert.alert('Error', 'Please enter contact information');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return;
    }
    if (!formData.supplies.trim()) {
      Alert.alert('Error', 'Please enter supplies');
      return;
    }

    setLoading(true);
    try {
      const suppliesArray = formData.supplies
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await dispatch(createVendor({
        vendorName: formData.vendorName.trim(),
        contact: formData.contact.trim(),
        address: formData.address.trim(),
        supplies: suppliesArray,
        phoneNumber: formData.contact.trim(), // Using contact as phone number
      }) as any);

      // Reset form
      setFormData({
        vendorName: '',
        contact: '',
        address: '',
        supplies: '',
      });

      onVendorAdded();
    } catch (error) {
      Alert.alert('Error', 'Failed to create vendor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        vendorName: '',
        contact: '',
        address: '',
        supplies: '',
      });
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Add New Vendor</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>Fill in the details for the new vendor.</Text>

            {/* Form Fields */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vendor Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.vendorName}
                  onChangeText={(value) => handleInputChange('vendorName', value)}
                  placeholder="Enter vendor name"
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contact}
                  onChangeText={(value) => handleInputChange('contact', value)}
                  placeholder="Enter contact information"
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(value) => handleInputChange('address', value)}
                  placeholder="Enter address"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Supplies</Text>
                <TextInput
                  style={styles.input}
                  value={formData.supplies}
                  onChangeText={(value) => handleInputChange('supplies', value)}
                  placeholder="e.g. Vegetables, Dairy, Meat"
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                />
                <Text style={styles.helpText}>
                  Separate multiple supplies with commas
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save changes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: spacing.xl,
  },
  inputGroup: {
    gap: spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddVendorModal;
