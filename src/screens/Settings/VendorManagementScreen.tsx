import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme';
import {
  fetchVendors,
  fetchVendorTransactions,
  deleteVendor,
  setSelectedVendor,
  Vendor,
} from '../../redux/slices/vendorsSliceFirebase';
import AddVendorModal from '../../components/AddVendorModal';
import EditVendorModal from '../../components/EditVendorModal';
import VendorSettlementModal from '../../components/VendorSettlementModal';

const VendorManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { vendors, transactions, loading, error } = useSelector((state: RootState) => state.vendors);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [settlingVendor, setSettlingVendor] = useState<Vendor | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVendorMenu, setSelectedVendorMenu] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchVendors() as any);
  }, [dispatch]);

  // Fetch transactions for each vendor when vendors are loaded
  useEffect(() => {
    if (Object.keys(vendors).length > 0) {
      Object.keys(vendors).forEach(vendorId => {
        dispatch(fetchVendorTransactions(vendorId) as any);
      });
    }
  }, [vendors, dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchVendors() as any);
    setRefreshing(false);
  };

  const handleVendorPress = (vendor: Vendor) => {
    dispatch(setSelectedVendor(vendor));
    navigation.navigate('VendorTransactionHistory' as any, { vendor });
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete ${vendor.vendorName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteVendor(vendor.id) as any),
        },
      ]
    );
  };

  const handleAddVendor = () => {
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setShowEditModal(true);
    setSelectedVendorMenu(null);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingVendor(null);
  };

  const handleVendorUpdated = () => {
    handleEditModalClose();
    dispatch(fetchVendors() as any);
  };

  const handleSettleVendor = (vendor: Vendor) => {
    setSettlingVendor(vendor);
    setShowSettlementModal(true);
    setSelectedVendorMenu(null);
  };

  const handleSettlementModalClose = () => {
    setShowSettlementModal(false);
    setSettlingVendor(null);
  };

  const handleSettlementComplete = () => {
    handleSettlementModalClose();
    dispatch(fetchVendors() as any);
  };

  // Helper function to get vendor status
  const getVendorStatus = (vendor: Vendor) => {
    if (vendor.balance && vendor.balance > 0) {
      return { status: 'Active', color: colors.success };
    } else if (vendor.balance === 0) {
      return { status: 'Pending', color: colors.warning };
    } else {
      return { status: 'Active', color: colors.success };
    }
  };

  // Helper function to get vendor avatar
  const getVendorAvatar = (vendor: Vendor) => {
    // You can implement actual avatar logic here
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.vendorName)}&background=ff6b35&color=fff&size=80`;
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  // Helper function to get vendor type
  const getVendorType = (vendor: Vendor) => {
    return vendor.vendorType || 'Supplier';
  };

  // Helper function to get last transaction date
  const getLastTransactionDate = (vendorId: string) => {
    const vendorTransactions = Object.values(transactions).filter(
      transaction => transaction.vendorId === vendorId
    );
    
    if (vendorTransactions.length === 0) {
      return 'No transactions';
    }
    
    // Sort by date and get the most recent
    const sortedTransactions = vendorTransactions.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    const lastTransaction = sortedTransactions[0];
    const transactionDate = lastTransaction.date?.toDate ? lastTransaction.date.toDate() : new Date(lastTransaction.date);
    
    return `Last: ${transactionDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;
  };


  const formatBalance = (balance: number) => {
    return `Rs ${balance.toFixed(2)}`;
  };

  const formatSupplies = (supplies: string[]) => {
    return supplies.join(', ');
  };

  const renderVendorCard = (vendor: Vendor) => {
    const statusInfo = getVendorStatus(vendor);
    const lastTransactionDate = getLastTransactionDate(vendor.id);
    
    return (
      <TouchableOpacity
        key={vendor.id}
        style={styles.vendorCard}
        onPress={() => handleVendorPress(vendor)}
        activeOpacity={0.7}
      >
        {/* Vendor Details */}
        <View style={styles.vendorDetails}>
          <Text style={styles.vendorName}>{vendor.vendorName}</Text>
          <Text style={styles.vendorLocation}>{vendor.address}</Text>
        </View>

        {/* Status and Financial Info */}
        <View style={styles.vendorInfo}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.status}</Text>
          </View>
          
          {vendor.balance > 0 && (
            <Text style={styles.totalAmount}>Balance {formatCurrency(vendor.balance)}</Text>
          )}
          
          <Text style={styles.vendorDate}>{lastTransactionDate}</Text>
        </View>

        {/* Action Menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSelectedVendorMenu(selectedVendorMenu === vendor.id ? null : vendor.id)}
        >
          <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Action Menu Modal */}
        {selectedVendorMenu === vendor.id && (
          <Modal
            transparent={true}
            visible={true}
            onRequestClose={() => setSelectedVendorMenu(null)}
          >
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={() => setSelectedVendorMenu(null)}
            >
              <View style={styles.menuContainer}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setSelectedVendorMenu(null);
                    handleVendorPress(vendor);
                  }}
                >
                  <Ionicons name="eye-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.menuItemText}>View Details</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEditVendor(vendor)}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                  <Text style={styles.menuItemText}>Edit Vendor</Text>
                </TouchableOpacity>
                
                {vendor.balance > 0 && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleSettleVendor(vendor)}
                  >
                    <Ionicons name="card-outline" size={18} color={colors.success} />
                    <Text style={styles.menuItemText}>Settle Credit</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setSelectedVendorMenu(null);
                    handleDeleteVendor(vendor);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={styles.menuItemText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </TouchableOpacity>
    );
  };

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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Vendors</Text>
            <Text style={styles.subtitle}>
              {Object.keys(vendors).length} suppliers
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddVendor}>
            <Ionicons name="add" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Vendors List */}
        <View style={styles.vendorsList}>
          {loading && Object.keys(vendors).length === 0 ? (
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="loading" size={32} color={colors.primary} />
              <Text style={styles.loadingText}>Loading vendors...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : Object.keys(vendors).length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Vendors Yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first vendor to start managing suppliers
              </Text>
            </View>
          ) : (
            Object.values(vendors).map(renderVendorCard)
          )}
        </View>
      </ScrollView>

      {/* Add Vendor Modal */}
      <AddVendorModal
        visible={showAddModal}
        onClose={handleModalClose}
        onVendorAdded={() => {
          handleModalClose();
          dispatch(fetchVendors() as any);
        }}
      />

      {/* Edit Vendor Modal */}
      <EditVendorModal
        visible={showEditModal}
        onClose={handleEditModalClose}
        onVendorUpdated={handleVendorUpdated}
        vendor={editingVendor}
      />

      {/* Settlement Modal */}
      <VendorSettlementModal
        visible={showSettlementModal}
        onClose={handleSettlementModalClose}
        onSettlementComplete={handleSettlementComplete}
        vendor={settlingVendor}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  vendorsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  vendorsList: {
    gap: spacing.lg,
  },
  vendorCard: {
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
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  vendorInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  vendorName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  vendorBalance: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  positiveBalance: {
    color: colors.success,
    fontWeight: '600',
  },
  negativeBalance: {
    color: colors.error,
    fontWeight: '600',
  },
  menuButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  vendorDetails: {
    gap: spacing.md,
  },
  contactInfo: {
    gap: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contactText: {
    fontSize: 15,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '500',
  },
  suppliesInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  suppliesText: {
    fontSize: 15,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  suppliesBold: {
    fontWeight: '700',
    color: colors.textPrimary,
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Card-based styles
  vendorsList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  vendorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vendorDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  vendorLocation: {
    fontSize: 12,
    color: colors.textMuted,
  },
  vendorInfo: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  vendorDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  menuButton: {
    padding: spacing.xs,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
});

export default VendorManagementScreen;
