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
import { createVendorTransaction } from '../redux/slices/vendorsSliceFirebase';
import { Vendor } from '../redux/slices/vendorsSliceFirebase';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
  vendor: Vendor;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  onTransactionAdded,
  vendor,
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    billNumber: '',
    creditAmount: '',
    paidAmount: '',
    paymentMethod: 'Cash' as 'Cash' | 'F.Pay' | 'Cheque',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentMethodChange = (method: 'Cash' | 'F.Pay' | 'Cheque') => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.billNumber.trim()) {
      Alert.alert('Error', 'Please enter bill number');
      return;
    }
    if (!formData.creditAmount.trim()) {
      Alert.alert('Error', 'Please enter credit amount');
      return;
    }
    if (!formData.paidAmount.trim()) {
      Alert.alert('Error', 'Please enter paid amount');
      return;
    }

    const creditAmount = parseFloat(formData.creditAmount);
    const paidAmount = parseFloat(formData.paidAmount);

    if (isNaN(creditAmount) || creditAmount < 0) {
      Alert.alert('Error', 'Please enter a valid credit amount');
      return;
    }
    if (isNaN(paidAmount) || paidAmount < 0) {
      Alert.alert('Error', 'Please enter a valid paid amount');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating transaction for vendor:', vendor.id);
      console.log('Transaction data:', {
        vendorId: vendor.id,
        billNumber: formData.billNumber.trim(),
        creditAmount,
        paidAmount,
        paymentMethod: formData.paymentMethod,
        date: new Date(),
      });

      const result = await dispatch(createVendorTransaction({
        vendorId: vendor.id,
        billNumber: formData.billNumber.trim(),
        creditAmount,
        paidAmount,
        paymentMethod: formData.paymentMethod,
        date: new Date(),
      }) as any);

      console.log('Transaction creation result:', result);

      if (result.type.endsWith('/rejected')) {
        throw new Error(result.payload || 'Failed to create transaction');
      }

      // Reset form
      setFormData({
        billNumber: '',
        creditAmount: '',
        paidAmount: '',
        paymentMethod: 'Cash',
      });

      onTransactionAdded();
    } catch (error) {
      console.error('Transaction creation error:', error);
      Alert.alert('Error', `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        billNumber: '',
        creditAmount: '',
        paidAmount: '',
        paymentMethod: 'Cash',
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
          {/* Compact Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Transaction</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Compact Form */}
            <View style={styles.form}>
              {/* Bill Number */}
              <View style={styles.inputRow}>
                <Text style={styles.label}>Bill #</Text>
                <TextInput
                  style={styles.input}
                  value={formData.billNumber}
                  onChangeText={(value) => handleInputChange('billNumber', value)}
                  placeholder="INV-12345"
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                />
              </View>

              {/* Amounts Row */}
              <View style={styles.amountsRow}>
                <View style={styles.amountInput}>
                  <Text style={styles.label}>Credit</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.creditAmount}
                    onChangeText={(value) => handleInputChange('creditAmount', value)}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
                <View style={styles.amountInput}>
                  <Text style={styles.label}>Paid</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.paidAmount}
                    onChangeText={(value) => handleInputChange('paidAmount', value)}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.paymentSection}>
                <Text style={styles.label}>Payment Method</Text>
                <View style={styles.paymentButtons}>
                  {['Cash', 'F.Pay', 'Cheque'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentButton,
                        formData.paymentMethod === method && styles.paymentButtonSelected
                      ]}
                      onPress={() => handlePaymentMethodChange(method as any)}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.paymentButtonText,
                        formData.paymentMethod === method && styles.paymentButtonTextSelected
                      ]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Compact Actions */}
          <View style={styles.actions}>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  inputRow: {
    gap: spacing.sm,
  },
  amountsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  amountInput: {
    flex: 1,
    gap: spacing.sm,
  },
  paymentSection: {
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
  paymentButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  paymentButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentButtonTextSelected: {
    color: 'white',
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddTransactionModal;
