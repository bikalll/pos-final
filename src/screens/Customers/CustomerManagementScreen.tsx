import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../../theme';
import { RootState } from '../../redux/store';
import { 
  addCustomer, 
  updateCustomer, 
  deleteCustomer, 
  updateLoyaltyPoints, 
  updateCreditAmount,
  setAllCustomers,
  resetCustomers
} from '../../redux/slices/customersSlice';
import { Customer } from '../../utils/types';
import { getRealtimeSyncService } from '../../services/realtimeSyncService';
import { createFirestoreService } from '../../services/firestoreService';

const CustomerManagementScreen: React.FC = () => {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [creditSettlementModalVisible, setCreditSettlementModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [creditSettlementAmount, setCreditSettlementAmount] = useState('');
  
  // Credit Settlement Split Payment States
  const [isSplitSettlement, setIsSplitSettlement] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSettlementPayments, setSplitSettlementPayments] = useState<Array<{
    method: 'Cash' | 'Card' | 'Bank' | 'Fonepay';
    amount: number;
    amountPaid: string;
  }>>([]);
  const [splitSettlementProcessed, setSplitSettlementProcessed] = useState(false);
  const [isProcessingSettlement, setIsProcessingSettlement] = useState(false);
  
  // Normal Credit Settlement Payment Method State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Card' | 'Bank' | 'Fonepay'>('Cash');

  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const customers = useSelector((state: RootState) => state.customers.customersById);
  const [firebaseCustomers, setFirebaseCustomers] = useState<Record<string, any>>({});
  const { restaurantId } = useSelector((state: RootState) => state.auth);
  
  // Removed unscoped initial load; rely solely on restaurant-scoped Firestore subscription below

  // Reset state on account change and subscribe to Firestore updates for this account
  useEffect(() => {
    if (!restaurantId) {
      dispatch(resetCustomers());
      setFirebaseCustomers({});
      return;
    }
    const service = createFirestoreService(restaurantId);
    const unsubscribe = service.listenToCustomers((customers: Record<string, any>) => {
      setFirebaseCustomers(customers);
      // Replace Redux customers with the scoped list to avoid cross-account leftovers
      dispatch(setAllCustomers(customers as any));
    });
    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
      dispatch(resetCustomers());
    };
  }, [restaurantId, dispatch]);
  
  // Open the same settlement modal when navigated with settleCustomerId
  const processedSettleCustomerIdRef = useRef<string | null>(null);
  const settleCustomerId = (route.params as any)?.settleCustomerId as string | undefined;
  useFocusEffect(
    React.useCallback(() => {
      // If no id is provided, clear guard and exit
      if (!settleCustomerId) {
        processedSettleCustomerIdRef.current = null;
        return;
      }

      // Prevent re-processing the same id repeatedly
      if (processedSettleCustomerIdRef.current === settleCustomerId) {
        return;
      }

      const target = (customers as any)[settleCustomerId];
      if (target && (target.creditAmount || 0) > 0) {
        openCreditSettlementModal(target);
      }

      // Mark as processed and clear param to avoid loops
      processedSettleCustomerIdRef.current = settleCustomerId;
      navigation.setParams({ settleCustomerId: undefined } as any);
    }, [settleCustomerId, customers])
  );
  const [showCreditOnly, setShowCreditOnly] = useState(false);
  const customersList = useMemo(() => {
    // Strictly use Firestore-scoped customers to prevent cross-account leakage
    let list = Object.values(firebaseCustomers) as Customer[];
    if (showCreditOnly) {
      list = list.filter(c => (c.creditAmount || 0) > 0.0001);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, firebaseCustomers, showCreditOnly, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
    });
    setFormErrors({
      name: '',
      phone: '',
      email: '',
    });
  };

  const validateForm = () => {
    const errors = {
      name: '',
      phone: '',
      email: '',
    };

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{10,15}$/.test(formData.phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Email validation (optional field)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleAddCustomer = async () => {
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    
    // Phone number is now compulsory
    if (!phone) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    
    if (!name) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }

    // Check for duplicate phone numbers within current restaurant only
    const normalize = (p: string) => p.replace(/\D+/g, '');
    const targetPhone = normalize(phone);
    const existingCustomer = Object.values(firebaseCustomers).find((c: any) => normalize(c.phone || '') === targetPhone);
    if (existingCustomer) {
      Alert.alert('Error', 'A customer with this phone number already exists');
      return;
    }

    const newCustomer: Customer = {
      id: `CUST-${Date.now()}`,
      name: name,
      phone: phone,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      creditAmount: 0,
      loyaltyPoints: 0,
      visitCount: 0,
      createdAt: Date.now(),
    };

    try {
      // Save to Firebase for real-time sync
      const syncService = getRealtimeSyncService();
      if (syncService) {
        await syncService.saveCustomer(newCustomer);
        // Refresh Firebase customers list
        const customersData = await syncService.getCustomers();
        setFirebaseCustomers(customersData);
      }
      
      // Also update Redux store
      dispatch(addCustomer(newCustomer));
      setAddModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Customer added successfully!');
    } catch (error) {
      console.error('Error adding customer:', error);
      Alert.alert('Error', 'Failed to add customer. Please try again.');
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;
    
    if (!validateForm()) {
      return;
    }
    
    const name = formData.name.trim();
    const phone = formData.phone.trim();

    // Check for duplicate phone numbers within current restaurant (excluding current customer)
    const normalize = (p: string) => p.replace(/\D+/g, '');
    const targetPhone = normalize(phone);
    const existingCustomer = Object.values(firebaseCustomers).find((c: any) => 
      normalize(c.phone || '') === targetPhone && c.id !== selectedCustomer.id
    );
    if (existingCustomer) {
      Alert.alert('Error', 'A customer with this phone number already exists');
      return;
    }

    const updatedCustomer: Partial<Customer> = {
      name: name,
      phone: phone,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
    };

    try {
      // Update in Firebase for real-time sync
      const syncService = getRealtimeSyncService();
      if (syncService) {
        await syncService.updateCustomer(selectedCustomer.id, updatedCustomer);
        // Refresh Firebase customers list
        const customersData = await syncService.getCustomers();
        setFirebaseCustomers(customersData);
      }
      
      // Also update Redux store
      dispatch(updateCustomer({ id: selectedCustomer.id, ...updatedCustomer }));
      setEditModalVisible(false);
      setSelectedCustomer(null);
      resetForm();
      Alert.alert('Success', 'Customer updated successfully!');
    } catch (error) {
      console.error('Error updating customer:', error);
      Alert.alert('Error', 'Failed to update customer. Please try again.');
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name || customer.phone || 'this customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from Firebase for real-time sync
              const syncService = getRealtimeSyncService();
              if (syncService) {
                await syncService.deleteCustomer(customer.id);
                // Refresh Firebase customers list
                const customersData = await syncService.getCustomers();
                setFirebaseCustomers(customersData);
              }
              
              // Also update Redux store
              dispatch(deleteCustomer(customer.id));
              Alert.alert('Success', 'Customer deleted successfully!');
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Error', 'Failed to delete customer. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setEditModalVisible(true);
  };

  const handleSettleCredit = () => {
    if (!selectedCustomer) return;
    
    const amount = parseFloat(creditSettlementAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (amount > (selectedCustomer.creditAmount || 0)) {
      Alert.alert('Error', 'Settlement amount cannot exceed credit amount');
      return;
    }
    
    // Show confirmation dialog
    Alert.alert(
      'Confirm Credit Settlement',
      `Are you sure you want to settle Rs. ${amount.toFixed(2)} of credit for ${selectedCustomer.name || selectedCustomer.phone || 'Customer'}?\n\nThis will reduce their credit balance from Rs. ${(selectedCustomer.creditAmount || 0).toFixed(2)} to Rs. ${((selectedCustomer.creditAmount || 0) - amount).toFixed(2)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Settlement',
          style: 'destructive',
          onPress: () => {
            // Process the credit settlement
            dispatch(updateCreditAmount({ 
              id: selectedCustomer.id, 
              amount: -(amount) // Negative amount to reduce credit
            }));

            // Persist credit reduction to Firestore
            (async () => {
              try {
                if (!restaurantId) return;
                const service = createFirestoreService(restaurantId);
                const newCredit = Math.max(0, (selectedCustomer.creditAmount || 0) - amount);
                await service.updateCustomer(selectedCustomer.id, {
                  creditAmount: newCredit,
                  lastVisit: Date.now(),
                });
              } catch (e) {
                console.warn('Failed to update customer credit in Firestore:', (e as Error).message);
              }
            })();

            // Save a settlement receipt to Firebase
            (async () => {
              try {
                if (!restaurantId) return;
                const service = createFirestoreService(restaurantId);
                const receiptId = `SET-${Date.now()}`;
                await service.saveReceipt({
                  id: receiptId,
                  restaurantId,
                  orderId: receiptId,
                  receiptType: 'CreditSettlement',
                  tableId: 'credit-settlement',
                  tableName: 'Credit Settlement',
                  items: [{ name: 'Credit Settlement', quantity: 1, price: amount }],
                  subtotal: amount,
                  tax: 0,
                  serviceCharge: 0,
                  discount: 0,
                  paymentMethod: selectedPaymentMethod,
                  amount: amount,
                  customerName: selectedCustomer.name,
                  customerPhone: selectedCustomer.phone || '',
                  timestamp: Date.now(),
                  createdAt: Date.now(),
                });
              } catch (e) {
                console.warn('Failed to save settlement receipt:', (e as Error).message);
              }
            })();
            
            setCreditSettlementModalVisible(false);
            setCreditSettlementAmount('');
            setSelectedCustomer(null);
            
            Alert.alert(
              'Credit Settled Successfully', 
              `Successfully settled Rs. ${amount.toFixed(2)} of credit for ${selectedCustomer.name || selectedCustomer.phone || 'Customer'}\n\nUpdated credit balance: Rs. ${((selectedCustomer.creditAmount || 0) - amount).toFixed(2)}`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  // Credit Settlement Split Payment Functions
  const handleSplitSettlement = () => {
    setIsSplitSettlement(true);
    const amount = parseFloat(creditSettlementAmount);
    if (amount > 0) {
      const initialPayments = [
        {
          method: 'Cash' as const,
          amount: amount / 2,
          amountPaid: (amount / 2).toFixed(2)
        },
        {
          method: 'Card' as const,
          amount: amount / 2,
          amountPaid: (amount / 2).toFixed(2)
        }
      ];
      setSplitSettlementPayments(initialPayments);
      setShowSplitModal(true);
    }
  };

  const addSplitSettlementPayment = () => {
    setSplitSettlementPayments([...splitSettlementPayments, {
      method: 'Cash',
      amount: 0,
      amountPaid: '0'
    }]);
  };

  const updateSplitSettlementPayment = (index: number, field: keyof typeof splitSettlementPayments[0], value: any) => {
    const newSplitPayments = [...splitSettlementPayments];
    
    if (field === 'amountPaid') {
      // Only update amountPaid when typing, don't sync amount yet
      newSplitPayments[index] = { ...newSplitPayments[index], amountPaid: value };
    } else if (field === 'amount') {
      // Only update amount when programmatically set, sync amountPaid
      newSplitPayments[index] = { ...newSplitPayments[index], amount: value, amountPaid: value.toString() };
    } else if (field === 'method') {
      newSplitPayments[index] = { ...newSplitPayments[index], method: value };
    }
    
    setSplitSettlementPayments(newSplitPayments);
  };

  // Sync amounts after user finishes typing (on blur or when needed)
  const syncAmounts = (index: number) => {
    const row = splitSettlementPayments[index];
    const parsed = parseFloat(row.amountPaid);
    if (!isNaN(parsed) && parsed !== row.amount) {
      updateSplitSettlementPayment(index, 'amount', parsed);
    }
  };

  const removeSplitSettlementPayment = (index: number) => {
    if (splitSettlementPayments.length > 1) {
      const newSplitPayments = splitSettlementPayments.filter((_, i) => i !== index);
      setSplitSettlementPayments(newSplitPayments);
    }
  };

  const getSplitSettlementTotal = () => {
    return splitSettlementPayments.reduce((sum, payment) => sum + (typeof payment.amount === 'number' ? payment.amount : parseFloat(payment.amountPaid) || 0), 0);
  };

  const validateSplitSettlement = () => {
    const splitTotal = getSplitSettlementTotal();
    const targetAmount = parseFloat(creditSettlementAmount);
    return Math.abs(splitTotal - targetAmount) < 0.01; // must equal exactly (within epsilon)
  };

  const handleConfirmSplitSettlement = () => {
    if (!validateSplitSettlement()) {
      Alert.alert('Split Total Mismatch', 'Split total must equal the settlement amount exactly.');
      return;
    }
    
    setSplitSettlementProcessed(true);
    setShowSplitModal(false);
  };

  const handleProcessSplitSettlement = () => {
    if (isProcessingSettlement) return;
    setIsProcessingSettlement(true);
    
    if (!validateSplitSettlement()) {
      setIsProcessingSettlement(false);
      Alert.alert('Split Total Mismatch', 'Allocate the exact settlement amount across split payments before processing.');
      return;
    }
    
    // Process the split settlement
    const totalSettled = getSplitSettlementTotal();
    
    dispatch(updateCreditAmount({ 
      id: selectedCustomer!.id, 
      amount: -(totalSettled)
    }));
    
    // Create settlement record for receipt printing
    const settlementInfo = {
      customerId: selectedCustomer!.id,
      customerName: selectedCustomer!.name || selectedCustomer!.phone || 'Customer',
      originalCredit: selectedCustomer!.creditAmount || 0,
      amountSettled: totalSettled,
      remainingCredit: (selectedCustomer!.creditAmount || 0) - totalSettled,
      splitPayments: splitSettlementPayments,
      timestamp: Date.now(),
      method: 'Split Settlement'
    };
    
    setCreditSettlementModalVisible(false);
    setCreditSettlementAmount('');
    setSelectedCustomer(null);
    setIsSplitSettlement(false);
    setSplitSettlementPayments([]);
    setSplitSettlementProcessed(false);
    setIsProcessingSettlement(false);

    // Save a split settlement receipt to Firebase
    (async () => {
      try {
        if (!restaurantId) return;
        const service = createFirestoreService(restaurantId);
        const receiptId = `SET-${Date.now()}`;
        await service.saveReceipt({
          id: receiptId,
          restaurantId,
          orderId: receiptId,
          receiptType: 'CreditSettlement',
          tableId: 'credit-settlement',
          tableName: 'Credit Settlement',
          items: [{ name: 'Credit Settlement', quantity: 1, price: totalSettled }],
          subtotal: totalSettled,
          tax: 0,
          serviceCharge: 0,
          discount: 0,
          paymentMethod: 'Split',
          amount: totalSettled,
          splitPayments: splitSettlementPayments.map(sp => ({ method: sp.method, amount: typeof sp.amount === 'number' ? sp.amount : parseFloat(sp.amountPaid) || 0 })),
          customerName: selectedCustomer!.name,
          customerPhone: selectedCustomer!.phone || '',
          timestamp: Date.now(),
          createdAt: Date.now(),
        });

        // Persist credit reduction to Firestore
        const newCredit = Math.max(0, (selectedCustomer!.creditAmount || 0) - totalSettled);
        await service.updateCustomer(selectedCustomer!.id, {
          creditAmount: newCredit,
          lastVisit: Date.now(),
        });
      } catch (e) {
        console.warn('Failed to save split settlement receipt:', (e as Error).message);
      }
    })();
    
    // Show success and print option
    Alert.alert(
      'Split Settlement Successful',
      `Successfully settled Rs. ${totalSettled.toFixed(2)} of credit for ${selectedCustomer!.name || selectedCustomer!.phone || 'Customer'}`,
      [
        { text: 'Done', onPress: () => {} },
        { text: 'Print Receipt', onPress: () => printSettlementReceipt(settlementInfo) }
      ]
    );
  };

  const printSettlementReceipt = async (settlementInfo: any) => {
    try {
      // Import PrintService
      const { PrintService } = await import('../../services/printing');
      
      // Create a mock order structure for receipt printing
      const mockOrder = {
        id: `SETTLEMENT-${Date.now()}`,
        createdAt: settlementInfo.timestamp,
        items: [{
          name: 'Credit Settlement',
          quantity: 1,
          price: settlementInfo.amountSettled
        }],
        taxPercentage: 0,
        serviceChargePercentage: 0,
        discountPercentage: 0,
        payment: {
          method: 'Split Settlement',
          amount: settlementInfo.amountSettled,
          amountPaid: settlementInfo.amountSettled,
          change: 0,
          customerName: settlementInfo.customerName,
          customerPhone: '',
          timestamp: settlementInfo.timestamp,
          splitPayments: settlementInfo.splitPayments
        }
      };
      
      const mockTable = { name: 'Credit Settlement' };
      
      const result = await PrintService.printReceiptFromOrder(mockOrder, mockTable);
      
      if (result.success) {
        Alert.alert('Success', 'Settlement receipt printed successfully!');
      } else {
        Alert.alert('Print Failed', result.message);
      }
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', 'Failed to print settlement receipt');
    }
  };

  const openCreditSettlementModal = (customer: Customer) => {
    if ((customer.creditAmount || 0) <= 0) {
      Alert.alert('No Credit', 'This customer has no outstanding credit to settle.');
      return;
    }
    setSelectedCustomer(customer);
    setCreditSettlementAmount('');
    setCreditSettlementModalVisible(true);
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => {
    const isNumeric = (s?: string) => !!s && /^\d+$/.test(s.trim());
    const displayName = (() => {
      const name = (item.name || '').trim();
      const phone = (item.phone || '').trim();
      if (!name) return phone || 'Customer';
      if (isNumeric(name) && phone && phone.length > name.length) return phone;
      return name;
    })();

    return (
    <View style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <Text style={styles.customerName}>{displayName}</Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.customerDetails}>
        {item.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
        )}
        
        {item.address && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.visitCount || 0} visits
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: item.creditAmount && item.creditAmount > 0 ? colors.danger : colors.success }]}>
            Credit: {item.creditAmount ? `Rs ${item.creditAmount.toFixed(2)}` : '-'}
          </Text>
          {item.creditAmount && item.creditAmount > 0 && (
            <TouchableOpacity
              style={styles.settleCreditButton}
              onPress={() => (navigation as any).navigate('SettleCredit', { customerId: item.id })}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color="white" />
              <Text style={styles.settleCreditButtonText}>Settle</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="star-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.loyaltyPoints || 0} pts
          </Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewProfileButton]}
          onPress={() => {
            (navigation as any).navigate('CustomerProfile', { customerId: item.id });
          }}
        >
          <Ionicons name="person-outline" size={16} color={'white'} />
          <Text style={[styles.actionButtonText, styles.actionButtonTextOnDark]}>View Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color={'white'} />
          <Text style={[styles.actionButtonText, styles.actionButtonTextOnDark]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCustomer(item)}
        >
          <Ionicons name="trash-outline" size={16} color={'white'} />
          <Text style={[styles.actionButtonText, styles.actionButtonTextOnDark]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or phone"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, showCreditOnly && styles.filterChipActive]}
            onPress={() => setShowCreditOnly(!showCreditOnly)}
          >
            <Ionicons name="card-outline" size={16} color={showCreditOnly ? 'white' : colors.textSecondary} />
            <Text style={[styles.filterChipText, showCreditOnly && styles.filterChipTextActive]}>Credit Only</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Customer</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customers</Text>
          <Text style={styles.sectionSubtitle}>List of all customers</Text>
        </View>

        {customersList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No customers yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first customer to get started</Text>
          </View>
        ) : (
          <FlatList
            data={customersList}
            renderItem={renderCustomerCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Add Customer Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Customer</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setAddModalVisible(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter customer name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone <Text style={{color: colors.danger}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter phone number (required)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Enter address"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => {
                    setAddModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalButtonConfirm}
                  onPress={handleAddCustomer}
                >
                  <Text style={styles.modalButtonConfirmText}>Add Customer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Customer</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setSelectedCustomer(null);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={[styles.input, formErrors.name && styles.inputError]}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: '' });
                    }
                  }}
                  placeholder="Enter customer name"
                  placeholderTextColor={colors.textSecondary}
                />
                {formErrors.name && (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone <Text style={{color: colors.danger}}>*</Text></Text>
                <TextInput
                  style={[styles.input, formErrors.phone && styles.inputError]}
                  value={formData.phone}
                  onChangeText={(text) => {
                    setFormData({ ...formData, phone: text });
                    if (formErrors.phone) {
                      setFormErrors({ ...formErrors, phone: '' });
                    }
                  }}
                  placeholder="Enter phone number (required)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
                {formErrors.phone && (
                  <Text style={styles.errorText}>{formErrors.phone}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, formErrors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: '' });
                    }
                  }}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formErrors.email && (
                  <Text style={styles.errorText}>{formErrors.email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Enter address"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => {
                    setEditModalVisible(false);
                    setSelectedCustomer(null);
                    resetForm();
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalButtonConfirm}
                  onPress={handleEditCustomer}
                >
                  <Text style={styles.modalButtonConfirmText}>Update</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Credit Settlement Modal */}
      <Modal
        visible={creditSettlementModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreditSettlementModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Credit Settlement</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setCreditSettlementModalVisible(false);
                  setSelectedCustomer(null);
                  setCreditSettlementAmount('');
                  setIsSplitSettlement(false);
                  setSplitSettlementPayments([]);
                  setSplitSettlementProcessed(false);
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                {/* Customer Summary */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Customer Summary</Text>
                  <View style={styles.customerSummaryCard}>
                    <View style={styles.customerSummaryRow}>
                      <Text style={styles.customerSummaryLabel}>Name:</Text>
                      <Text style={styles.customerSummaryValue}>{selectedCustomer?.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.customerSummaryRow}>
                      <Text style={styles.customerSummaryLabel}>Phone:</Text>
                      <Text style={styles.customerSummaryValue}>{selectedCustomer?.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.customerSummaryRow}>
                      <Text style={styles.customerSummaryLabel}>Current Credit:</Text>
                      <Text style={[styles.customerSummaryValue, { color: colors.danger, fontWeight: 'bold' }]}>
                        Rs. {(selectedCustomer?.creditAmount || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Settlement Amount Input */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Settlement Amount</Text>
                  <View style={styles.amountCard}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Amount to Settle</Text>
                      <TextInput
                        style={[
                          styles.amountInput,
                          parseFloat(creditSettlementAmount) > (selectedCustomer?.creditAmount || 0) && styles.amountInputError
                        ]}
                        value={creditSettlementAmount}
                        onChangeText={(value) => {
                          const numValue = parseFloat(value) || 0;
                          const maxCredit = selectedCustomer?.creditAmount || 0;
                          
                          if (numValue > maxCredit) {
                            // Don't allow amounts greater than credit
                            return;
                          }
                          
                          setCreditSettlementAmount(value);
                        }}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      {parseFloat(creditSettlementAmount) > (selectedCustomer?.creditAmount || 0) && (
                        <Text style={styles.errorText}>
                          Amount cannot exceed credit balance
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.changeRow}>
                      <Text style={styles.changeLabel}>Remaining Credit:</Text>
                      <Text style={styles.changeAmount}>
                        Rs. {Math.max(0, (selectedCustomer?.creditAmount || 0) - (parseFloat(creditSettlementAmount) || 0)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Payment Method Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <View style={styles.paymentMethodsGrid}>
                    <TouchableOpacity
                      style={[styles.paymentMethodCard, selectedPaymentMethod === 'Cash' && styles.paymentMethodSelected]}
                      onPress={() => setSelectedPaymentMethod('Cash')}
                    >
                      <Ionicons name="cash-outline" size={24} color={selectedPaymentMethod === 'Cash' ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.paymentMethodLabel, selectedPaymentMethod === 'Cash' && styles.paymentMethodLabelSelected]}>
                        Cash
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.paymentMethodCard, selectedPaymentMethod === 'Card' && styles.paymentMethodSelected]}
                      onPress={() => setSelectedPaymentMethod('Card')}
                    >
                      <Ionicons name="card-outline" size={24} color={selectedPaymentMethod === 'Card' ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.paymentMethodLabel, selectedPaymentMethod === 'Card' && styles.paymentMethodLabelSelected]}>
                        Card
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.paymentMethodCard, selectedPaymentMethod === 'Bank' && styles.paymentMethodSelected]}
                      onPress={() => setSelectedPaymentMethod('Bank')}
                    >
                      <Ionicons name="business-outline" size={24} color={selectedPaymentMethod === 'Bank' ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.paymentMethodLabel, selectedPaymentMethod === 'Bank' && styles.paymentMethodLabelSelected]}>
                        Bank
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.paymentMethodCard, selectedPaymentMethod === 'Fonepay' && styles.paymentMethodSelected]}
                      onPress={() => setSelectedPaymentMethod('Fonepay')}
                    >
                      <Ionicons name="wallet-outline" size={24} color={selectedPaymentMethod === 'Fonepay' ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.paymentMethodLabel, selectedPaymentMethod === 'Fonepay' && styles.paymentMethodLabelSelected]}>
                        Fonepay
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Split Settlement Option */}
                {creditSettlementAmount && parseFloat(creditSettlementAmount) > 0 && (
                  <View style={styles.section}>
                    <TouchableOpacity 
                      style={styles.splitBillButton}
                      onPress={handleSplitSettlement}
                    >
                      <Ionicons name="list-outline" size={20} color={colors.primary} />
                      <Text style={styles.splitBillButtonText}>Split Settlement</Text>
                    </TouchableOpacity>
                    {isSplitSettlement && (
                      <View style={styles.splitSummaryInline}>
                        <Text style={styles.splitInlineText}>Split Total:</Text>
                        <Text style={[styles.splitInlineAmount, { 
                          color: validateSplitSettlement() ? colors.primary : colors.danger 
                        }]}>Rs. {getSplitSettlementTotal().toFixed(2)} / Rs. {parseFloat(creditSettlementAmount).toFixed(2)}</Text>
                      </View>
                    )}
                    {isSplitSettlement && !validateSplitSettlement() && (
                      <Text style={{ color: colors.danger, marginTop: spacing.xs, textAlign: 'center' }}>
                        Split must equal the settlement amount exactly.
                      </Text>
                    )}
                  </View>
                )}

                {/* Settlement Summary */}
                {creditSettlementAmount && parseFloat(creditSettlementAmount) > 0 && !isSplitSettlement && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settlement Summary</Text>
                    <View style={styles.settlementSummaryCard}>
                      <View style={styles.settlementSummaryRow}>
                        <Text style={styles.settlementSummaryLabel}>Current Credit:</Text>
                        <Text style={styles.settlementSummaryValue}>
                          Rs. {(selectedCustomer?.creditAmount || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.settlementSummaryRow}>
                        <Text style={styles.settlementSummaryLabel}>Settlement Amount:</Text>
                        <Text style={styles.settlementSummaryValue}>
                          Rs. {parseFloat(creditSettlementAmount).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.settlementSummaryRow}>
                        <Text style={styles.settlementSummaryLabel}>Payment Method:</Text>
                        <Text style={styles.settlementSummaryValue}>
                          {selectedPaymentMethod}
                        </Text>
                      </View>
                      <View style={styles.settlementSummaryRow}>
                        <Text style={styles.settlementSummaryLabel}>Remaining Credit:</Text>
                        <Text style={[
                          styles.settlementSummaryValue, 
                          { 
                            color: (selectedCustomer?.creditAmount || 0) - (parseFloat(creditSettlementAmount) || 0) > 0 ? colors.danger : colors.success 
                          }
                        ]}>
                          Rs. {Math.max(0, (selectedCustomer?.creditAmount || 0) - (parseFloat(creditSettlementAmount) || 0)).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

            {/* Process Settlement Button */}
            <View style={styles.modalFooter}>
              {!isSplitSettlement ? (
                <TouchableOpacity
                  style={[
                    styles.processPaymentButton, 
                    (!creditSettlementAmount.trim() || parseFloat(creditSettlementAmount) <= 0 || parseFloat(creditSettlementAmount) > (selectedCustomer?.creditAmount || 0)) && 
                    styles.processPaymentButtonDisabled
                  ]}
                  onPress={handleSettleCredit}
                  disabled={!creditSettlementAmount.trim() || parseFloat(creditSettlementAmount) <= 0 || parseFloat(creditSettlementAmount) > (selectedCustomer?.creditAmount || 0)}
                >
                  <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                  <Text style={styles.processPaymentButtonText}>Process Settlement</Text>
                </TouchableOpacity>
              ) : splitSettlementProcessed ? (
                <TouchableOpacity
                  style={[
                    styles.processPaymentButton, 
                    !validateSplitSettlement() && styles.processPaymentButtonDisabled
                  ]}
                  onPress={handleProcessSplitSettlement}
                  disabled={!validateSplitSettlement() || isProcessingSettlement}
                >
                  <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                  <Text style={styles.processPaymentButtonText}>
                    {isProcessingSettlement ? 'Processing...' : 'Process Split Settlement'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* Split Settlement Modal */}
      <Modal
        visible={showSplitModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowSplitModal(false); setIsSplitSettlement(false); setSplitSettlementProcessed(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Split Settlement</Text>
              <TouchableOpacity onPress={() => { setShowSplitModal(false); setIsSplitSettlement(false); setSplitSettlementProcessed(false); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing.lg }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
              <Text style={styles.splitDescription}>Split a total of Rs. {parseFloat(creditSettlementAmount).toFixed(2)} across methods.</Text>
              {splitSettlementPayments.map((sp, idx) => (
                <View key={`settle-split-row-${sp.method}-${sp.amount}-${idx}`} style={styles.splitPaymentRow}>
                  <View style={styles.splitPaymentHeader}>
                    <Text style={styles.splitPaymentTitle}>Payment {idx + 1}</Text>
                    {splitSettlementPayments.length > 1 && (
                      <TouchableOpacity onPress={() => removeSplitSettlementPayment(idx)}>
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.splitPaymentInputs}>
                    <View style={styles.splitMethodSelect}>
                      <Text style={styles.splitInputLabel}>Method</Text>
                      <View style={styles.splitMethodButtons}>
                        {[
                          { method: 'Cash' as const, icon: 'cash-outline', label: 'Cash' },
                          { method: 'Bank' as const, icon: 'business-outline', label: 'Bank' },
                          { method: 'Card' as const, icon: 'card-outline', label: 'Card' },
                          { method: 'Fonepay' as const, icon: 'wallet-outline', label: 'Fonepay' },
                        ].map(({ method, icon, label }) => (
                          <TouchableOpacity
                            key={method}
                            style={[styles.splitMethodButton, sp.method === method && styles.splitMethodButtonSelected]}
                            onPress={() => updateSplitSettlementPayment(idx, 'method', method)}
                          >
                            <Ionicons name={icon as any} size={16} color={sp.method === method ? 'white' : colors.textSecondary} />
                            <Text style={[styles.splitMethodButtonText, sp.method === method && styles.splitMethodButtonTextSelected]}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.splitAmountInput}>
                      <Text style={styles.splitInputLabel}>Amount (Rs.)</Text>
                      <TextInput
                        style={styles.splitAmountTextInput}
                        value={sp.amountPaid}
                        onChangeText={(val) => updateSplitSettlementPayment(idx, 'amountPaid', val)}
                        onBlur={() => syncAmounts(idx)}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addSplitPaymentButton} onPress={addSplitSettlementPayment}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addSplitPaymentButtonText}>Add Another Method</Text>
              </TouchableOpacity>
              <View style={styles.splitSummarySection}>
                <View style={styles.splitTotalRow}>
                  <Text style={styles.splitTotalLabel}>Split Total</Text>
                  <Text style={[styles.splitTotalAmount, { color: validateSplitSettlement() ? colors.primary : colors.danger }]}>Rs. {getSplitSettlementTotal().toFixed(2)} / Rs. {parseFloat(creditSettlementAmount).toFixed(2)}</Text>
                </View>
                {!validateSplitSettlement() && (
                  <Text style={{ color: colors.danger, textAlign: 'center' }}>Split total must equal the settlement amount exactly.</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.confirmSplitButton, !validateSplitSettlement() && styles.confirmSplitButtonDisabled]}
                disabled={!validateSplitSettlement()}
                onPress={handleConfirmSplitSettlement}
              >
                <Text style={styles.confirmSplitButtonText}>Confirm Split</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  listContainer: {
    paddingBottom: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface2,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface2,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: 'white',
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  moreButton: {
    padding: spacing.xs,
  },
  customerDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  actionButtonTextOnDark: {
    color: 'white',
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  viewProfileButton: {
    backgroundColor: colors.info,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    marginHorizontal: '2.5%', // 2.5% margin on each side = 95% width
    marginVertical: 20, // Keep vertical margins for proper spacing
    borderRadius: radius.lg,
    maxHeight: '85%',
    minHeight: '75%',
    paddingBottom: 25,
    width: '95%', // Explicitly set width to 95%
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#fef2f2',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  modalButtonCancel: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalButtonDisabled: {
    backgroundColor: colors.outline,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  settleCreditButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  settleCreditButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  creditSettlementInfo: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  creditSettlementLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  creditSettlementValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  settlementSummary: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  
  inputHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
  },
  quickActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    gap: spacing.xs,
  },
  settleFullButton: {
    backgroundColor: colors.success,
    flex: 1,
    marginRight: spacing.sm,
  },
  settleHalfButton: {
    backgroundColor: colors.warning,
    flex: 1,
    marginLeft: spacing.sm,
  },
  quickActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  creditHistoryInfo: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  creditHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  creditHistoryText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // New styles for Credit Settlement Modal
  modalScrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  paymentMethodCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  paymentMethodSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentMethodLabelSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 20,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  amountInputError: {
    borderColor: colors.danger,
    borderWidth: 1,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  changeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },


  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  settlementSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  settlementSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  settlementSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  settlementSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  processPaymentButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    ...shadow.card,
  },
  processPaymentButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  processPaymentButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  splitBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  splitBillButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  splitInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
    marginTop: spacing.md,
  },
  splitInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  splitInfoLeft: {
    flex: 1,
  },
  splitInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  splitInfoMethod: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  splitInfoAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  splitInfoTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  splitInfoTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  splitInfoTotalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  splitPaymentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  splitAmountSection: {
    marginBottom: spacing.md,
  },
  splitValidationMessage: {
    marginTop: spacing.sm,
  },
  splitSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  customerSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  customerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  customerSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  customerSummaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  splitSummaryInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  splitInlineText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  splitInlineAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  splitAmountInput: {
    flex: 1,
    marginLeft: spacing.md,
  },
  splitAmountTextInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  splitDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  splitPaymentRow: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  splitPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  splitPaymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  splitPaymentInputs: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  splitMethodSelect: {
    flex: 1,
  },
  splitMethodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  splitMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.background,
    minWidth: 80,
    justifyContent: 'center',
  },
  splitMethodButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  splitMethodButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  splitMethodButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  splitInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  splitSummarySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  splitTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  splitTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  splitTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmSplitButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  confirmSplitButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  confirmSplitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addSplitPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addSplitPaymentButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});

export default CustomerManagementScreen;

