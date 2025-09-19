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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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
import VendorSettlementModal from '../../components/VendorSettlementModal';
import AddTransactionModal from '../../components/AddTransactionModal';

const VendorTransactionHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { transactions, loading, error } = useSelector((state: RootState) => state.vendors);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const vendor = route.params?.vendor as Vendor;

  useEffect(() => {
    if (vendor?.id) {
      dispatch(fetchVendorTransactions(vendor.id) as any);
    }
  }, [dispatch, vendor?.id]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (vendor?.id) {
        console.log('Transaction History: Screen focused, refreshing data for vendor:', vendor.id);
        dispatch(fetchVendorTransactions(vendor.id) as any);
        dispatch(fetchVendors() as any);
      }
    }, [vendor?.id, dispatch])
  );

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

  const handleSettleCredit = () => {
    setShowSettlementModal(true);
  };

  const handleSettlementModalClose = () => {
    setShowSettlementModal(false);
  };

  const handleSettlementComplete = async () => {
    handleSettlementModalClose();
    // Refresh both transactions and vendors to get updated balance
    if (vendor?.id) {
      console.log('Settlement Complete: Refreshing data for vendor:', vendor.id);
      
      // Add a small delay to ensure Firebase has processed the transaction
      setTimeout(async () => {
        await dispatch(fetchVendorTransactions(vendor.id) as any);
        await dispatch(fetchVendors() as any);
        console.log('Settlement Complete: Data refresh completed');
      }, 500);
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
    
    // Calculate total purchase amount (sum of all totalAmount)
    const totalPurchase = vendorTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    
    // Use vendor.balance for outstanding balance
    const totalCredit = vendor?.balance || 0;
    
    // Calculate total paid amount: Total Purchase - Outstanding Balance
    const totalPaid = totalPurchase - totalCredit;
    
    console.log('Transaction History: Calculated totals:', {
      totalPurchase,
      totalPaid,
      totalCredit: totalCredit,
      vendorBalance: vendor?.balance,
      transactionCount: vendorTransactions.length,
      calculation: `${totalPurchase} - ${totalCredit} = ${totalPaid}`,
      transactions: vendorTransactions.map(t => ({
        id: t.id,
        billNumber: t.billNumber,
        totalAmount: t.totalAmount,
        paidAmount: t.paidAmount,
        creditAmount: t.creditAmount
      }))
    });
    
    return { totalPurchase, totalPaid, totalCredit };
  };

  const { totalPurchase, totalPaid, totalCredit } = calculateTotals();
  const vendorTransactions = getVendorTransactions();

  const renderTransactionRow = (transaction: VendorTransaction) => (
    <View key={transaction.id} style={styles.tableRow}>
      <Text style={styles.tableCell}>{formatDate(transaction.date)}</Text>
      <Text style={styles.tableCell}>{transaction.billNumber}</Text>
      <View style={styles.tableCell}>
        <Text style={styles.tableCell}>{transaction.paymentMethod}</Text>
        {transaction.paymentMethod === 'Cheque' && transaction.chequeNumber && (
          <Text style={styles.chequeNumberText}>({transaction.chequeNumber})</Text>
        )}
      </View>
      <Text style={[styles.tableCell, styles.purchaseAmount]}>
        {(transaction.totalAmount || transaction.creditAmount + transaction.paidAmount).toFixed(2)}
      </Text>
      <Text style={[styles.tableCell, styles.paidAmount]}>
        {transaction.paidAmount.toFixed(2)}
      </Text>
      <Text style={[styles.tableCell, styles.balanceAmount]}>
        {transaction.creditAmount.toFixed(2)}
      </Text>
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

        {/* Credit Balance Section */}
        <View style={styles.creditBalanceCard}>
          <View style={styles.creditBalanceHeader}>
            <View style={styles.creditBalanceTitleRow}>
              <Ionicons name="wallet-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.creditBalanceTitle}>Credit Balance</Text>
            </View>
            <TouchableOpacity style={styles.settleCreditButton} onPress={handleSettleCredit}>
              <Text style={styles.settleCreditButtonText}>Settle Credit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.creditBalanceAmount}>Rs {totalCredit.toFixed(2)}</Text>
          {totalCredit <= 0 && (
            <Text style={styles.creditBalanceStatus}>✅ All credits settled</Text>
          )}
          <Text style={styles.creditBalanceDescription}>
            This is the total outstanding amount to be paid to this vendor.
          </Text>
        </View>

        {/* Transaction History */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Transaction History</Text>
            <TouchableOpacity style={styles.addTransactionButton} onPress={handleAddTransaction}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.historySubtitle}>
            A record of all purchases and payments for this vendor.
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
            <View style={styles.transactionTable}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Date</Text>
                <Text style={styles.tableHeaderText}>Bill No.</Text>
                <Text style={styles.tableHeaderText}>Payment</Text>
                <Text style={styles.tableHeaderText}>Purchase</Text>
                <Text style={styles.tableHeaderText}>Paid</Text>
                <Text style={styles.tableHeaderText}>Balance</Text>
              </View>
              
              {/* Table Rows */}
              {vendorTransactions.map(renderTransactionRow)}
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Purchase</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalPurchase)}</Text>
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
                { color: totalCredit > 0 ? colors.error : colors.success }
              ]}>
                {formatCurrency(totalCredit)}
              </Text>
              {totalCredit <= 0 && (
                <Text style={styles.balanceStatus}>All settled</Text>
              )}
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

      {/* Settlement Modal */}
      <VendorSettlementModal
        visible={showSettlementModal}
        onClose={handleSettlementModalClose}
        onSettlementComplete={handleSettlementComplete}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 24,
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
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: spacing.xs,
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
  chequeNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  chequeNumberText: {
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
  balanceStatus: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  // New styles for updated UI
  creditBalanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  creditBalanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  creditBalanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  creditBalanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settleCreditButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  settleCreditButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  creditBalanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF4444',
    marginBottom: spacing.sm,
  },
  creditBalanceStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  creditBalanceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addTransactionButton: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    width: 36,
    height: 36,
  },
  addTransactionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  transactionTable: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginHorizontal: -spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tableHeaderText: {
    flex: 3,
    fontSize: 9,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  tableCell: {
    flex: 3,
    fontSize: 9,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  purchaseAmount: {
    color: '#FF4444',
    fontWeight: '600',
  },
  paidAmount: {
    color: colors.success,
    fontWeight: '600',
  },
  balanceAmount: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  chequeNumberText: {
    fontSize: 8,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default VendorTransactionHistoryScreen;
