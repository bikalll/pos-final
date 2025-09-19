import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../../theme';
import { RootState } from '../../redux/store';
import { 
  updateCustomer, 
  updateLoyaltyPoints 
} from '../../redux/slices/customersSlice';
import { Customer } from '../../utils/types';
import { PrintService } from '../../services/printing';
import { createFirestoreService } from '../../services/firestoreService';

interface RouteParams {
  customerId: string;
}

const CustomerProfileScreen: React.FC = () => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [loyaltyModalVisible, setLoyaltyModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [loyaltyPoints, setLoyaltyPoints] = useState('');

  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  const { customerId } = route.params as RouteParams;
  const customer = useSelector((state: RootState) => state.customers.customersById[customerId]);
  const ordersById = useSelector((state: RootState) => state.orders.ordersById);
  const { restaurantId } = useSelector((state: RootState) => state.auth);
  const tables = useSelector((state: RootState) => state.tables.tablesById);
  const [firebaseReceipts, setFirebaseReceipts] = useState<Record<string, any>>({});

  React.useEffect(() => {
    const loadReceipts = async () => {
      try {
        if (!restaurantId) return;
        const service = createFirestoreService(restaurantId as any);
        const receipts = await service.getReceipts();
        setFirebaseReceipts(receipts || {});
      } catch (e) {}
    };
    loadReceipts();
  }, [restaurantId]);

  if (!customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>Customer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleEditCustomer = () => {
    if (!editFormData.name.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }

    const updatedCustomer: Partial<Customer> = {
      name: editFormData.name.trim(),
      phone: editFormData.phone.trim() || undefined,
      email: editFormData.email.trim() || undefined,
      address: editFormData.address.trim() || undefined,
    };

    dispatch(updateCustomer({ id: customer.id, ...updatedCustomer }));
    setEditModalVisible(false);
    Alert.alert('Success', 'Customer updated successfully!');
  };

  const handleUpdateLoyalty = () => {
    const points = parseInt(loyaltyPoints);
    if (isNaN(points)) {
      Alert.alert('Error', 'Please enter a valid number of points');
      return;
    }

    dispatch(updateLoyaltyPoints({ id: customer.id, points }));
    setLoyaltyModalVisible(false);
    setLoyaltyPoints('');
    Alert.alert('Success', 'Loyalty points updated successfully!');
  };

  const openEditModal = () => {
    setEditFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setEditModalVisible(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  React.useLayoutEffect(() => {
    (navigation as any).setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openEditModal}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, customer]);

  // Match order to this customer by phone (preferred) or name
  const isOrderForCustomer = (o: any) => {
    if (!o) return false;
    const cn = (o.payment?.customerName || o.customerName || '').trim();
    const cp = (o.payment?.customerPhone || o.customerPhone || '').trim();
    const thisName = (customer.name || '').trim();
    const thisPhone = (customer.phone || '').trim();
    return (thisPhone && cp && thisPhone === cp) || (!thisPhone && cn && thisName && cn.toLowerCase() === thisName.toLowerCase());
  };

  const getOrderTimestamp = (o: any) => (o?.payment?.timestamp ? o.payment.timestamp : o?.createdAt);

  const formatMethodLabel = (method: string) => {
    if (method === 'Bank Card') return 'Card';
    if (method === 'UPI') return 'Fonepay';
    return method;
  };

  // Build history from Firestore receipts (scoped to current restaurant), fall back to orders
  const normalizePhone = (p: any) => (typeof p === 'string' ? p.replace(/\D+/g, '') : '');
  const myReceipts = Object.values(firebaseReceipts || {}).filter((r: any) => r.restaurantId === restaurantId);
  const receiptsForCustomer = myReceipts.filter((r: any) => {
    // Prefer explicit customerId link when present
    if (r.customerId && r.customerId === customer.id) return true;
    const cn = (r.customerName || '').trim().toLowerCase();
    const cp = normalizePhone(r.customerPhone || '');
    const thisName = (customer.name || '').trim().toLowerCase();
    const thisPhone = normalizePhone(customer.phone || '');
    return (thisPhone && cp && thisPhone === cp) || (!thisPhone && cn && thisName && cn === thisName);
  });
  const receiptOrderLike = receiptsForCustomer.map((r: any) => ({
    id: r.orderId || r.id,
    createdAt: r.timestamp || r.createdAt,
    payment: {
      method: r.paymentMethod,
      amountPaid: Number(r.amount) || 0,
      timestamp: r.timestamp,
      splitPayments: Array.isArray(r.splitPayments) ? r.splitPayments : undefined,
    }
  }));
  // Use only Firestore receipts for history (no local storage fallback)
  const allCustomerOrders = receiptOrderLike
    .sort((a: any, b: any) => (getOrderTimestamp(b) || 0) - (getOrderTimestamp(a) || 0));

  // Credit history subset (include split payments with credit portion)
  const creditOrders = allCustomerOrders.filter((o: any) => {
    const p = o.payment as any;
    if (!p) return false;
    if (p.method === 'Credit') return true;
    if (Array.isArray(p.splitPayments)) {
      return p.splitPayments.some((sp: any) => sp.method === 'Credit' && Number(sp.amount) > 0);
    }
    return false;
  });

  const shortId = (id: string) => `R${id.slice(-4)}`;

  const handlePrintStatement = async () => {
    try {
      const totalCredit = creditOrders.reduce((sum: number, o: any) => {
        const p = o.payment as any;
        if (p?.method === 'Credit') return sum + (p.amountPaid || 0);
        const creditPart = (p?.splitPayments || []).filter((sp: any) => sp.method === 'Credit').reduce((s: number, sp: any) => s + (Number(sp.amount) || 0), 0);
        return sum + creditPart;
      }, 0);
      const entries = creditOrders.map((o: any) => ({
        date: new Date(getOrderTimestamp(o)).toLocaleDateString(),
        ref: shortId(o.id),
        amount: (() => {
          const p = o.payment as any;
          if (p?.method === 'Credit') return p.amountPaid || 0;
          return (p?.splitPayments || []).filter((sp: any) => sp.method === 'Credit').reduce((s: number, sp: any) => s + (Number(sp.amount) || 0), 0);
        })(),
      }));
      const { blePrinter } = await import('../../services/blePrinter');
      await blePrinter.printCreditStatement({
        customerName: customer.name,
        customerPhone: customer.phone,
        entries,
        totalAmount: totalCredit,
      } as any);
    } catch (e: any) {
      Alert.alert('Print Failed', e?.message || 'Unable to print credit statement');
    }
  };
  const handlePrintCustomerHistory = async () => {
    try {
      const entries = allCustomerOrders.map((o: any) => ({
        date: new Date(getOrderTimestamp(o)).toLocaleDateString(),
        time: o.payment?.timestamp ? new Date(o.payment.timestamp).toLocaleTimeString() : undefined,
        ref: shortId(o.id),
        method: o.payment?.method || 'Unpaid',
        amount: o.payment?.amountPaid ?? (o.items || []).reduce((s: number, it: any) => s + (it.price * it.quantity), 0),
      }));
      const totalAmount = entries.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const { blePrinter } = await import('../../services/blePrinter');
      await blePrinter.printCustomerHistory({
        customerName: customer.name,
        customerPhone: customer.phone,
        periodLabel: 'All Time',
        entries,
        totalCount: entries.length,
        totalAmount,
      } as any);
    } catch (e: any) {
      Alert.alert('Print Failed', e?.message || 'Unable to print customer history');
    }
  };

  const handlePrintReceipt = async (order: any) => {
    try {
      const existing = (ordersById as any)[order.id];
      if (existing) {
        const table = tables[existing.tableId];
        await PrintService.printReceiptFromOrder(existing, table);
      } else {
        // Fallback: open receipt detail for printing from there
        (navigation as any).navigate('Receipts', { screen: 'ReceiptDetail', params: { orderId: order.id } });
      }
    } catch (e) {}
  };

  const handleViewReceipt = (orderId: string) => {
    // Navigate to Receipts stack detail
    (navigation as any).navigate('Receipts', { screen: 'ReceiptDetail', params: { orderId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Credit Balance Card */}
        <View style={styles.creditCard}>
          <View style={styles.creditHeaderRow}>
            <Text style={styles.creditTitle}>Credit Balance</Text>
            <TouchableOpacity style={styles.creditActionButton} onPress={handlePrintStatement}>
              <Ionicons name="print-outline" size={18} color={'white'} />
              <Text style={styles.creditActionButtonText}>Print Statement</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.creditValueRow}>
            <Text style={styles.creditValue}>Rs {Number(customer.creditAmount || 0).toFixed(2)}</Text>
            {(customer.creditAmount || 0) > 0 && (
              <TouchableOpacity style={[styles.smallPillBtn, { backgroundColor: colors.success }]} onPress={() => {
                (navigation as any).navigate('SettleCredit', { customerId: customer.id });
              }}>
                <Ionicons name="checkmark-circle-outline" size={14} color={'white'} />
                <Text style={styles.smallBtnText}>Settle</Text>
              </TouchableOpacity>
            )}
          </View>
          {(customer.creditAmount || 0) > 0 ? (
            <Text style={styles.creditSubtext}>Outstanding due across {creditOrders.length} bill(s)</Text>
          ) : (
            <Text style={styles.creditSubtextOk}>No outstanding credit</Text>
          )}
        </View>
        {/* Customer Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{customer.name}</Text>
            </View>
            {customer.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{customer.phone}</Text>
              </View>
            )}
            {customer.email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{customer.email}</Text>
              </View>
            )}
            {customer.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{customer.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{customer.visitCount || 0}</Text>
              <Text style={styles.statLabel}>Total Visits</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{customer.loyaltyPoints || 0}</Text>
              <Text style={styles.statLabel}>Loyalty Points</Text>
            </View>
          </View>
        </View>

        {/* Visit History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit History</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>First Visit:</Text>
              <Text style={styles.infoValue}>{formatDate(customer.createdAt)}</Text>
            </View>
            {customer.lastVisit && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Visit:</Text>
                <Text style={styles.infoValue}>{formatDate(customer.lastVisit)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer History (all transactions) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Customer History</Text>
            <TouchableOpacity style={[styles.smallIconBtn, styles.smallBtnSecondary]} onPress={handlePrintCustomerHistory}>
              <Ionicons name="print-outline" size={16} color={'white'} />
            </TouchableOpacity>
          </View>
          <View style={styles.historyCard}>
            {allCustomerOrders.length === 0 ? (
              <Text style={styles.historyEmpty}>No transactions found</Text>
            ) : (
              allCustomerOrders.map((o: any) => (
                <View key={o.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{new Date(getOrderTimestamp(o)).toLocaleDateString()} • {shortId(o.id)}</Text>
                    {(() => {
                      const p = o.payment as any;
                      if (Array.isArray(p?.splitPayments) && p.splitPayments.length > 0) {
                        return null; // Hide summary line; show only detailed breakdown below
                      }
                      const timeStr = p?.timestamp ? ` • ${new Date(p.timestamp).toLocaleTimeString()}` : '';
                      return (
                        <Text style={styles.historySub}>{`${p?.method || 'Unpaid'}${timeStr}`}</Text>
                      );
                    })()}
                    {Array.isArray((o.payment as any)?.splitPayments) && (o.payment as any).splitPayments.length > 0 && (
                      <View style={{ marginTop: 2 }}>
                        {(o.payment as any).splitPayments.map((sp: any, idx: number) => (
                          <Text key={`${sp.method}-${sp.amount}-${idx}`} style={[styles.historySub, { fontSize: 11 }]}>
                            {formatMethodLabel(sp.method)} Rs {(Number(sp.amount) || 0).toFixed(2)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={styles.historyAmount}>Rs {(o.payment?.amountPaid ?? (o.items || []).reduce((s: number, it: any) => s + (it.price * it.quantity), 0)).toFixed(2)}</Text>
                  <View style={styles.historyActions}>
                    <TouchableOpacity style={[styles.smallIconBtn, styles.smallBtnSecondary]} onPress={() => handleViewReceipt(o.id)}>
                      <Ionicons name="receipt-outline" size={14} color={'white'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallIconBtn, styles.smallBtnPrimary]} onPress={() => handlePrintReceipt(o)}>
                      <Ionicons name="print-outline" size={14} color={'white'} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
      </View>

        {/* Credit History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit History</Text>
          <View style={styles.historyCard}>
            {creditOrders.length === 0 ? (
              <Text style={styles.historyEmpty}>No credit bills found</Text>
            ) : (
              creditOrders.map((o: any) => (
                <View key={o.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{new Date(o.createdAt).toLocaleDateString()} • {shortId(o.id)}</Text>
                    {(() => {
                      const p = o.payment as any;
                      if (Array.isArray(p?.splitPayments) && p.splitPayments.length > 0) {
                        return null; // Hide extra text above split breakdown
                      }
                      return (
                        <Text style={styles.historySub}>{o.payment?.customerName || customer.name}</Text>
                      );
                    })()}
                    {Array.isArray((o.payment as any)?.splitPayments) && (o.payment as any).splitPayments.length > 0 && (
                      <View style={{ marginTop: 2 }}>
                        {(o.payment as any).splitPayments.map((sp: any, idx: number) => (
                          <Text key={`${sp.method}-${sp.amount}-${idx}`} style={[styles.historySub, { fontSize: 11 }]}>
                            {formatMethodLabel(sp.method)} Rs {(Number(sp.amount) || 0).toFixed(2)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={styles.historyAmount}>
                    Rs {(() => {
                      const p = o.payment as any;
                      if (p?.method === 'Credit') return (p.amountPaid || 0).toFixed(2);
                      const creditPart = (p?.splitPayments || []).filter((sp: any) => sp.method === 'Credit').reduce((s: number, sp: any) => s + (Number(sp.amount) || 0), 0);
                      return creditPart.toFixed(2);
                    })()}
                  </Text>
                  <View style={styles.historyActions}>
                    <TouchableOpacity style={[styles.smallIconBtn, styles.smallBtnSecondary]} onPress={() => handleViewReceipt(o.id)}>
                      <Ionicons name="receipt-outline" size={14} color={'white'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallIconBtn, styles.smallBtnPrimary]} onPress={() => handlePrintReceipt(o)}>
                      <Ionicons name="print-outline" size={14} color={'white'} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.creditButton]}
              onPress={() => setCreditModalVisible(true)}
            >
              <Ionicons name="card-outline" size={20} color={colors.warning} />
              <Text style={styles.actionButtonText}>Credit Info</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.loyaltyButton]}
              onPress={() => setLoyaltyModalVisible(true)}
            >
              <Ionicons name="star-outline" size={20} color={colors.info} />
              <Text style={styles.actionButtonText}>Update Loyalty</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.name}
                  onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
                  placeholder="Enter customer name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.phone}
                  onChangeText={(text) => setEditFormData({ ...editFormData, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.email}
                  onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
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
                  value={editFormData.address}
                  onChangeText={(text) => setEditFormData({ ...editFormData, address: text })}
                  placeholder="Enter address"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={2}
                />
      </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setEditModalVisible(false)}
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

      {/* Credit Update Modal */}
      <Modal
        visible={creditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Credit Management</Text>
              <TouchableOpacity onPress={() => setCreditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Credit: Rs {customer.creditAmount?.toFixed(2) || '0.00'}</Text>
                
                <View style={styles.creditInfoBox}>
                  <Ionicons name="information-circle-outline" size={24} color={colors.info} />
                  <Text style={styles.creditInfoText}>
                    Credit amounts are automatically managed through the split payment system. 
                    To add credit, use the split payment feature when processing orders.
                  </Text>
                </View>
                
                <View style={styles.creditInfoBox}>
                  <Ionicons name="card-outline" size={24} color={colors.primary} />
                  <Text style={styles.creditInfoText}>
                    To settle credit, use the "Settle Credit" button in the Customers tab.
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButtonConfirm, styles.creditModalButton]}
                  onPress={() => setCreditModalVisible(false)}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={'white'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loyalty Update Modal */}
      <Modal
        visible={loyaltyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLoyaltyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Loyalty Points</Text>
              <TouchableOpacity onPress={() => setLoyaltyModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Points: {customer.loyaltyPoints || 0}</Text>
                <Text style={styles.inputLabel}>Points to Add/Subtract</Text>
                <TextInput
                  style={styles.input}
                  value={loyaltyPoints}
                  onChangeText={setLoyaltyPoints}
                  placeholder="e.g., 100 or -50"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  Use positive numbers to add points, negative to subtract
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setLoyaltyModalVisible(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalButtonConfirm}
                  onPress={handleUpdateLoyalty}
                >
                  <Text style={styles.modalButtonConfirmText}>Update Points</Text>
                </TouchableOpacity>
              </View>
        </View>
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
  creditCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  creditHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  creditTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  creditValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  creditValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  creditSubtext: {
    marginTop: spacing.xs,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  creditSubtextOk: {
    marginTop: spacing.xs,
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  creditActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  creditActionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  smallPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  smallBtnText: {
    color: 'white',
    fontWeight: '600',
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
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    ...shadow.card,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: spacing.sm,
  },
  historyTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  historySub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  historyAmount: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  historyEmpty: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  historyActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnPrimary: { backgroundColor: colors.primary },
  smallBtnSecondary: { backgroundColor: colors.info },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  creditButton: {
    backgroundColor: colors.warning + '20',
  },
  loyaltyButton: {
    backgroundColor: colors.info + '20',
  },
  settleButton: {
    backgroundColor: colors.success + '20',
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '90%',
    maxHeight: '80%',
    ...shadow.card,
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
  modalBody: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
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
  inputHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
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
  creditInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  creditInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  creditModalButton: {
    backgroundColor: colors.success,
  },
});

export default CustomerProfileScreen;
 