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
import { createVendorTransaction, Vendor } from '../redux/slices/vendorsSliceFirebase';

interface VendorSettlementModalProps {
  visible: boolean;
  onClose: () => void;
  onSettlementComplete: () => void;
  vendor: Vendor | null;
}

type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Fonepay' | 'Wallet';

const VendorSettlementModal: React.FC<VendorSettlementModalProps> = ({
  visible,
  onClose,
  onSettlementComplete,
  vendor,
}) => {
  const dispatch = useDispatch();
  const [settlementData, setSettlementData] = useState({
    totalAmount: 0,
    settlementAmount: '',
    paymentMethod: 'Cash' as PaymentMethod,
    referenceNumber: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  // Use vendor.balance for outstanding balance
  const getOutstandingBalance = () => {
    if (!vendor) return 0;
    
    console.log('Settlement Modal: Using vendor.balance:', vendor.balance);
    
    return vendor.balance || 0;
  };

  // Initialize settlement data when vendor changes
  useEffect(() => {
    if (vendor) {
      const outstandingBalance = getOutstandingBalance();
      setSettlementData(prev => ({
        ...prev,
        totalAmount: outstandingBalance,
        settlementAmount: outstandingBalance.toString(),
      }));
    }
  }, [vendor]);

  const handleInputChange = (field: string, value: string) => {
    setSettlementData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setSettlementData(prev => ({
      ...prev,
      paymentMethod: method,
      referenceNumber: '', // Reset reference number when payment method changes
    }));
  };

  const handleSettlementSubmit = async () => {
    if (!vendor) return;

    // Validation
    if (!settlementData.settlementAmount || parseFloat(settlementData.settlementAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid settlement amount');
      return;
    }

    const settlementAmount = parseFloat(settlementData.settlementAmount);
    if (settlementAmount > settlementData.totalAmount) {
      Alert.alert('Error', 'Settlement amount cannot exceed total balance');
      return;
    }

    if (settlementData.paymentMethod === 'Cheque' && !settlementData.referenceNumber.trim()) {
      Alert.alert('Error', 'Please enter cheque number');
      return;
    }

    if (settlementData.paymentMethod === 'Bank Transfer' && !settlementData.referenceNumber.trim()) {
      Alert.alert('Error', 'Please enter transaction reference number');
      return;
    }

    if (settlementData.paymentMethod === 'Fonepay' && !settlementData.referenceNumber.trim()) {
      Alert.alert('Error', 'Please enter Fonepay transaction ID');
      return;
    }

    if (settlementData.paymentMethod === 'Wallet' && !settlementData.referenceNumber.trim()) {
      Alert.alert('Error', 'Please enter wallet transaction reference');
      return;
    }

    setLoading(true);
    try {
      // Map payment methods to the correct format
      const getPaymentMethod = (method: PaymentMethod) => {
        switch (method) {
          case 'Cash': return 'Cash';
          case 'Card': return 'Card';
          case 'Bank Transfer': return 'Bank Transfer';
          case 'Cheque': return 'Cheque';
          case 'Fonepay': return 'Fonepay';
          case 'Wallet': return 'Wallet';
          default: return 'Cash';
        }
      };

      const transactionData = {
        vendorId: vendor.id,
        billNumber: `SETTLE-${Date.now()}`,
        totalAmount: settlementAmount,
        paidAmount: settlementAmount, // Full settlement
        creditAmount: 0, // No credit left after settlement
        paymentMethod: getPaymentMethod(settlementData.paymentMethod),
        chequeNumber: settlementData.paymentMethod === 'Cheque' ? settlementData.referenceNumber : undefined,
        date: new Date(),
      };

      console.log('Settlement: Creating transaction with data:', transactionData);
      
      // Create a settlement transaction
      const result = await dispatch(createVendorTransaction(transactionData) as any);
      
      console.log('Settlement: Transaction creation result:', result);

      Alert.alert(
        'Settlement Complete',
        `Successfully settled Rs ${settlementAmount.toLocaleString()} for ${vendor.vendorName}`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Settlement Modal: Settlement completed, calling onSettlementComplete');
              onSettlementComplete();
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Settlement: Error creating transaction:', error);
      Alert.alert(
        'Settlement Error', 
        `Failed to process settlement: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
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

  const paymentMethods: { method: PaymentMethod; icon: string; label: string }[] = [
    { method: 'Cash', icon: 'cash-outline', label: 'Cash' },
    { method: 'Card', icon: 'card-outline', label: 'Card' },
    { method: 'Bank Transfer', icon: 'business-outline', label: 'Bank Transfer' },
    { method: 'Cheque', icon: 'document-text-outline', label: 'Cheque' },
    { method: 'Fonepay', icon: 'phone-portrait-outline', label: 'Fonepay' },
    { method: 'Wallet', icon: 'wallet-outline', label: 'Wallet' },
  ];

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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Settle Credit</Text>
            <TouchableOpacity
              style={[styles.settleButton, loading && styles.settleButtonDisabled]}
              onPress={handleSettlementSubmit}
              disabled={loading}
            >
              <Text style={styles.settleButtonText}>
                {loading ? 'Processing...' : 'Settle'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Vendor Info */}
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>{vendor.vendorName}</Text>
              <Text style={styles.vendorAddress}>{vendor.address}</Text>
            </View>

            {/* Balance Summary */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Outstanding Balance</Text>
              <Text style={styles.balanceAmount}>Rs {settlementData.totalAmount.toLocaleString()}</Text>
            </View>

            {/* Settlement Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Settlement Amount *</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>Rs</Text>
                <TextInput
                  style={styles.amountInput}
                  value={settlementData.settlementAmount}
                  onChangeText={(value) => handleInputChange('settlementAmount', value)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
              <View style={styles.quickAmounts}>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => handleInputChange('settlementAmount', settlementData.totalAmount.toString())}
                >
                  <Text style={styles.quickAmountText}>Full Amount</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => handleInputChange('settlementAmount', (settlementData.totalAmount * 0.5).toString())}
                >
                  <Text style={styles.quickAmountText}>Half</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment Method */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method *</Text>
              <View style={styles.paymentMethods}>
                {paymentMethods.map(({ method, icon, label }) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodButton,
                      settlementData.paymentMethod === method && styles.paymentMethodSelected
                    ]}
                    onPress={() => handlePaymentMethodChange(method)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={icon as any}
                      size={20}
                      color={settlementData.paymentMethod === method ? 'white' : colors.textPrimary}
                    />
                    <Text style={[
                      styles.paymentMethodText,
                      settlementData.paymentMethod === method && styles.paymentMethodTextSelected
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reference Number (for Cheque/Bank Transfer/Fonepay/Wallet) */}
            {(settlementData.paymentMethod === 'Cheque' || 
              settlementData.paymentMethod === 'Bank Transfer' || 
              settlementData.paymentMethod === 'Fonepay' || 
              settlementData.paymentMethod === 'Wallet') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {settlementData.paymentMethod === 'Cheque' ? 'Cheque Number *' : 
                   settlementData.paymentMethod === 'Bank Transfer' ? 'Transaction Reference *' :
                   settlementData.paymentMethod === 'Fonepay' ? 'Fonepay Transaction ID *' :
                   'Wallet Transaction Reference *'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={settlementData.referenceNumber}
                  onChangeText={(value) => handleInputChange('referenceNumber', value)}
                  placeholder={
                    settlementData.paymentMethod === 'Cheque' ? 'Enter cheque number' : 
                    settlementData.paymentMethod === 'Bank Transfer' ? 'Enter transaction reference' :
                    settlementData.paymentMethod === 'Fonepay' ? 'Enter Fonepay transaction ID' :
                    'Enter wallet transaction reference'
                  }
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
            )}

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={settlementData.notes}
                onChangeText={(value) => handleInputChange('notes', value)}
                placeholder="Add any additional notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            {/* Settlement Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Settlement Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Outstanding Balance:</Text>
                <Text style={styles.summaryValue}>Rs {settlementData.totalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Settlement Amount:</Text>
                <Text style={styles.summaryValue}>Rs {parseFloat(settlementData.settlementAmount || '0').toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Remaining Balance:</Text>
                <Text style={styles.summaryTotalValue}>
                  Rs {(settlementData.totalAmount - parseFloat(settlementData.settlementAmount || '0')).toLocaleString()}
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
  settleButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  settleButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  settleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  vendorInfo: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  vendorAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceCard: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'white',
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  balanceNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickAmountButton: {
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  quickAmountText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    minWidth: 100,
    justifyContent: 'center',
  },
  paymentMethodSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentMethodText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  paymentMethodTextSelected: {
    color: 'white',
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
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default VendorSettlementModal;
