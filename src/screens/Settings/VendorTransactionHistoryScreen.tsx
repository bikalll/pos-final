import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme';
import {
  fetchVendorTransactions,
  fetchVendors,
  deleteVendorTransaction,
  Vendor,
  VendorTransaction,
} from '../../redux/slices/vendorsSliceFirebase';
import AddTransactionModal from '../../components/AddTransactionModal';

const VendorTransactionHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { transactions, loading, error } = useSelector((state: RootState) => state.vendors);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const vendor = route.params?.vendor as Vendor;

  useEffect(() => {
    if (vendor?.id) {
      dispatch(fetchVendorTransactions(vendor.id) as any);
    }
  }, [dispatch, vendor?.id]);

  const handleRefresh = async () => {
    if (vendor?.id) {
      setRefreshing(true);
      await dispatch(fetchVendorTransactions(vendor.id) as any);
      setRefreshing(false);
    }
  };

  const handleAddTransaction = () => {
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
  };

  const handleTransactionAdded = () => {
    handleModalClose();
    // Refresh both transactions and vendors to get updated balance
    if (vendor?.id) {
      dispatch(fetchVendorTransactions(vendor.id) as any);
      dispatch(fetchVendors() as any);
    }
  };

  const handleDeleteTransaction = (transaction: VendorTransaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteVendorTransaction(transaction.id) as any),
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toFixed(0)}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Cash': return colors.success;
      case 'F.Pay': return colors.info;
      case 'Cheque': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getVendorTransactions = () => {
    return Object.values(transactions).filter(
      (transaction: VendorTransaction) => transaction.vendorId === vendor?.id
    );
  };

  const calculateTotals = () => {
    const vendorTransactions = getVendorTransactions();
    const totalCredit = vendorTransactions.reduce((sum, t) => sum + t.creditAmount, 0);
    const totalPaid = vendorTransactions.reduce((sum, t) => sum + t.paidAmount, 0);
    const totalBalance = totalCredit - totalPaid;
    return { totalCredit, totalPaid, totalBalance };
  };

  const { totalCredit, totalPaid, totalBalance } = calculateTotals();
  const vendorTransactions = getVendorTransactions();

  const renderTransactionCard = (transaction: VendorTransaction) => (
    <View key={transaction.id} style={styles.transactionCard}>
      {/* Header Row */}
      <View style={styles.transactionHeader}>
        <View style={styles.transactionTitleRow}>
          <Text style={styles.billNumberText}>{transaction.billNumber}</Text>
          <View style={[styles.paymentMethodBadge, { backgroundColor: getPaymentMethodColor(transaction.paymentMethod) }]}>
            <Text style={styles.paymentMethodText}>{transaction.paymentMethod}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTransaction(transaction)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Date Row */}
      <View style={styles.transactionDateRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.transactionDateText}>{formatDate(transaction.date)}</Text>
      </View>

      {/* Amounts Row */}
      <View style={styles.transactionAmountsRow}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Credit</Text>
          <Text style={styles.creditAmountText}>{formatCurrency(transaction.creditAmount)}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={styles.paidAmountText}>{formatCurrency(transaction.paidAmount)}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[
            styles.balanceAmountText,
            { color: (transaction.creditAmount - transaction.paidAmount) >= 0 ? colors.success : colors.error }
          ]}>
            {formatCurrency(transaction.creditAmount - transaction.paidAmount)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!vendor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Vendor not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{vendor.vendorName}</Text>
            <View style={styles.vendorDetailsRow}>
              <View style={styles.vendorDetailItem}>
                <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.vendorContact}>{vendor.phoneNumber || 'N/A'}</Text>
              </View>
              <View style={styles.vendorDetailItem}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.vendorAddress} numberOfLines={1}>{vendor.address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Transaction History</Text>
          <Text style={styles.historySubtitle}>
            A record of all payments and credits for {vendor.vendorName}...
          </Text>

          {loading && vendorTransactions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : vendorTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="receipt-outline" size={64} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyText}>
                Start recording payments and credits for {vendor?.vendorName || 'this vendor'} to see transaction history here.
              </Text>
              <TouchableOpacity style={styles.emptyActionButton} onPress={handleAddTransaction}>
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.emptyActionText}>Add First Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {vendorTransactions.map(renderTransactionCard)}
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Credit</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalCredit)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalPaid)}</Text>
            </View>
            <View style={[styles.summaryItem, styles.balanceItem]}>
              <Text style={styles.summaryLabel}>Outstanding Balance</Text>
              <Text style={[
                styles.summaryValue,
                styles.balanceValue,
                { color: totalBalance >= 0 ? colors.success : colors.error }
              ]}>
                {formatCurrency(totalBalance)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={handleModalClose}
        onTransactionAdded={handleTransactionAdded}
        vendor={vendor}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  vendorDetailsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  vendorDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  vendorContact: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  vendorAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  historySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  transactionsList: {
    gap: spacing.lg,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0, // Prevent flex item from growing beyond container
  },
  billNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1, // Allow text to shrink if needed
  },
  paymentMethodBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  paymentMethodText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  transactionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  transactionDateText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  transactionAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0, // Prevent flex item from growing beyond container
  },
  amountLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  creditAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
  },
  paidAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.info,
    textAlign: 'center',
  },
  balanceAmountText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountDivider: {
    width: 1,
    height: 25,
    backgroundColor: colors.outline,
    marginHorizontal: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyActionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  summary: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: spacing.xl,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  summaryGrid: {
    gap: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
  },
  balanceItem: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '800',
  },
});

export default VendorTransactionHistoryScreen;
