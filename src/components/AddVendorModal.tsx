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
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Compact Header (match AddTransaction) */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Vendor</Text>
            <View style={styles.placeholder} />
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
                  keyboardType="phone-pad"
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

          {/* Compact Actions (match AddTransaction) */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surface,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  textArea: {
    height: 84,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
  },
});

export default AddVendorModal;
