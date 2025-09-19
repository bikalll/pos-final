import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme';
import {
  fetchVendors,
  deleteVendor,
  setSelectedVendor,
  Vendor,
} from '../../redux/slices/vendorsSliceFirebase';
import AddVendorModal from '../../components/AddVendorModal';

const VendorManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { vendors, loading, error } = useSelector((state: RootState) => state.vendors);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchVendors() as any);
  }, [dispatch]);

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

  const formatBalance = (balance: number) => {
    return `Rs ${balance.toFixed(2)}`;
  };

  const formatSupplies = (supplies: string[]) => {
    return supplies.join(', ');
  };

  const renderVendorCard = (vendor: Vendor) => (
    <TouchableOpacity
      key={vendor.id}
      style={styles.vendorCard}
      onPress={() => handleVendorPress(vendor)}
      activeOpacity={0.7}
    >
      <View style={styles.vendorHeader}>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>{vendor.vendorName}</Text>
          <Text style={[
            styles.vendorBalance,
            vendor.balance > 0 ? styles.positiveBalance : vendor.balance < 0 ? styles.negativeBalance : null
          ]}>
            Balance: {formatBalance(vendor.balance)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleDeleteVendor(vendor)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.vendorDetails}>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.contactText}>{vendor.phoneNumber || 'N/A'}</Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.contactText}>{vendor.address}</Text>
          </View>
        </View>
        
        <View style={styles.suppliesInfo}>
          <MaterialCommunityIcons name="package-variant" size={16} color={colors.textSecondary} />
          <Text style={styles.suppliesText}>
            Supplies: <Text style={styles.suppliesBold}>{formatSupplies(vendor.supplies)}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>Vendor Management</Text>
          <Text style={styles.subtitle}>Manage suppliers for your inventory.</Text>
          
          <TouchableOpacity style={styles.addButton} onPress={handleAddVendor}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Vendor</Text>
          </TouchableOpacity>
        </View>

        {/* Vendors List */}
        <View style={styles.vendorsSection}>
          <Text style={styles.sectionTitle}>Vendors</Text>
          <Text style={styles.sectionSubtitle}>
            List of all suppliers. Click on a vendor to view transactions.
          </Text>
          
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
            <View style={styles.vendorsList}>
              {Object.values(vendors).map(renderVendorCard)}
            </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    minWidth: 200,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.sm,
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
});

export default VendorManagementScreen;
