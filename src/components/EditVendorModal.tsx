import React, { useState, useEffect } from 'react';
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
import { updateVendor, Vendor } from '../redux/slices/vendorsSliceFirebase';

interface EditVendorModalProps {
  visible: boolean;
  onClose: () => void;
  onVendorUpdated: () => void;
  vendor: Vendor | null;
}

const EditVendorModal: React.FC<EditVendorModalProps> = ({
  visible,
  onClose,
  onVendorUpdated,
  vendor,
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    vendorName: '',
    contact: '',
    address: '',
    supplies: '',
  });
  const [loading, setLoading] = useState(false);

  // Populate form when vendor changes
  useEffect(() => {
    if (vendor) {
      setFormData({
        vendorName: vendor.vendorName || '',
        contact: vendor.contact || '',
        address: vendor.address || '',
        supplies: vendor.supplies ? vendor.supplies.join(', ') : '',
      });
    }
  }, [vendor]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!vendor) return;

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

      await dispatch(updateVendor({
        vendorId: vendor.id,
        updates: {
          vendorName: formData.vendorName.trim(),
          contact: formData.contact.trim(),
          address: formData.address.trim(),
          supplies: suppliesArray,
          phoneNumber: formData.contact.trim(),
        }
      }) as any);

      onVendorUpdated();
    } catch (error) {
      Alert.alert('Error', 'Failed to update vendor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!vendor) return null;

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
          {/* Compact Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Vendor</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Updating...' : 'Update'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Compact Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vendor Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.vendorName}
                  onChangeText={(value) => handleInputChange('vendorName', value)}
                  placeholder="Enter vendor name"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contact}
                  onChangeText={(value) => handleInputChange('contact', value)}
                  placeholder="Phone number or email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(value) => handleInputChange('address', value)}
                  placeholder="Enter full address"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Supplies *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.supplies}
                  onChangeText={(value) => handleInputChange('supplies', value)}
                  placeholder="Vegetables, Dairy, Meat..."
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
                <Text style={styles.helpText}>
                  Separate with commas
                </Text>
              </View>
            </View>
          </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surface,
  },
  closeButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default EditVendorModal;
