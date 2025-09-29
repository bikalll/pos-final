import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../../theme';
import { RootState } from '../../redux/storeFirebase';
import { setPayment, completeOrder, removeItem, updateItemQuantity, cancelOrder, completeOrderWithReceipt } from '../../redux/slices/ordersSliceFirebase';
import { PrintService } from '../../services/printing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../../navigation/types';
import OrderCancellationDialog from '../../components/OrderCancellationDialog';

type OrderManagementNavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderManagement'>;

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface RouteParams {
  orderId: string;
}

const OrderManagementScreen: React.FC = () => {
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cancellationDialogVisible, setCancellationDialogVisible] = useState(false);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitAmount, setSplitAmount] = useState('');
  
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();
  
  const { orderId } = route.params as RouteParams;
  const order = useSelector((state: RootState) => state.orders.ordersById[orderId]);
  const tables = useSelector((state: RootState) => state.tables.tablesById);
  const { restaurantId, role, userName } = useSelector((state: RootState) => state.auth);

  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Cash', icon: '💰', color: '#27ae60' },
    { id: 'card', name: 'Card', icon: '💳', color: '#3498db' },
    { id: 'bank', name: 'Bank', icon: '🏦', color: '#2980b9' },
    { id: 'fonepay', name: 'Fonepay', icon: '🔵', color: '#9b59b6' },
    { id: 'credit', name: 'Credit', icon: '📋', color: '#e67e22' },
  ];

  useEffect(() => {
    if (!order) {
      Alert.alert('Error', 'Order not found');
      navigation.goBack();
    }
  }, [order, navigation]);

  if (!order) {
    return null;
  }

  const calculateSubtotal = () => {
    return (order.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => 0;

  const calculateServiceCharge = () => 0;

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    return subtotal * order.discountPercentage / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const serviceCharge = calculateServiceCharge();
    const discount = calculateDiscount();
    return subtotal + serviceCharge - discount;
  };

  const calculateReturnAmount = () => {
    const total = calculateTotal();
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, paid - total);
  };

  const handleChangeItemQty = (menuItemId: string, newQty: number) => {
    if (newQty <= 0) {
      dispatch(removeItem({ orderId, menuItemId }));
    } else {
      dispatch(updateItemQuantity({ orderId, menuItemId, quantity: newQty }));
    }
  };

  const handleRemoveItem = (menuItemId: string) => {
    dispatch(removeItem({ orderId, menuItemId }));
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
  };

  const handleSplitPayment = () => {
    setIsSplitPayment(true);
    setAmountPaid(calculateTotal().toString());
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    const total = calculateTotal();
    let amount: number;
    
    if (isSplitPayment) {
      amount = parseFloat(amountPaid);
      if (isNaN(amount)) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
    } else {
      amount = total; // Use total amount when split payment is disabled
    }

    if (amount < total) {
      Alert.alert('Error', 'Amount paid must be at least the total amount');
      return;
    }

    const change = amount - total;

    // Process payment with complete payment information
    dispatch(setPayment({
      orderId,
      payment: {
        method: selectedPaymentMethod.name as any,
        amount: total, // The actual order total
        amountPaid: amount, // Amount customer paid
        change: change, // Change given back
        customerName: customerName || customerPhone || "Walk-in Customer",
        customerPhone: customerPhone || "",
        timestamp: Date.now(),
      }
    }));

    // Complete order and save receipt; Firestore save is handled centrally by middleware
    dispatch(completeOrderWithReceipt({ orderId, restaurantId }));
    
    // Persist to Firebase with role and username data
    try {
      const { getFirebaseService } = require('../../services/firebaseService');
      const svc = getFirebaseService();
      const payload = { 
        ...order, 
        status: 'completed', 
        restaurantId, 
        saved: true,
        processedBy: {
          role: role || 'Staff',
          username: userName || 'Unknown'
        }
      } as any;
      svc.saveOrder(payload);
      try {
        const { createFirestoreService } = require('../../services/firestoreService');
        const fsSvc = createFirestoreService(restaurantId);
        fsSvc.saveOrder(payload);
      } catch {}
    } catch {}

    // Show success and automatically print receipt
    Alert.alert(
      'Payment Successful',
      `Order completed!\nTotal: Rs. ${total.toFixed(2)}\nAmount Paid: Rs. ${amount.toFixed(2)}\nChange: Rs. ${change.toFixed(2)}`,
            [
        {
          text: 'Print & Done',
          onPress: async () => {
            try {
              // Calculate separate discount amounts
              const calculateItemTotal = (item: any) => {
                const baseTotal = item.price * item.quantity;
                let discount = 0;
                if (item.discountPercentage !== undefined) discount = (baseTotal * item.discountPercentage) / 100;
                else if (item.discountAmount !== undefined) discount = item.discountAmount;
                return Math.max(0, baseTotal - discount);
              };
              
              const baseSubtotal = (order.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
              const discountedSubtotal = (order.items || []).reduce((sum: number, item: any) => sum + calculateItemTotal(item), 0);
              const itemDiscountsTotal = Math.max(0, baseSubtotal - discountedSubtotal);
              const orderDiscountPercent = order.discountPercentage || 0;
              const orderDiscountAmount = discountedSubtotal * (orderDiscountPercent / 100);

              // Generate and print receipt
              const receiptData = {
                receiptId: `R${Date.now().toString().slice(-6)}`,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                tableNumber: tables[order.tableId]?.name || order.tableId,
                customerName: customerName || customerPhone || "Walk-in Customer",
                items: (order.items || []).map((item: any) => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  total: calculateItemTotal(item),
                  discountPercentage: item.discountPercentage,
                  discountAmount: item.discountAmount
                })),
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                serviceCharge: calculateServiceCharge(),
                discount: calculateDiscount(),
                itemDiscount: itemDiscountsTotal,
                orderDiscount: orderDiscountAmount,
                total: total,
                paymentMethod: selectedPaymentMethod.name,
                cashier: "POS System"
              };

              const result = await PrintService.printReceiptFromOrder(order, tables[order.tableId]);
              if (!result.success) {
                throw new Error(result.message);
              }
              try {
                if (restaurantId && order.tableId) {
                  const { createFirestoreService } = require('../../services/firestoreService');
                  const svc = createFirestoreService(restaurantId);
                  svc.updateTable(order.tableId, { isOccupied: false });
                }
              } catch {}
              Alert.alert('Success', 'Receipt printed successfully!', [{ 
                text: 'OK', 
                onPress: () => {
                  // Use reset navigation to clear the stack and prevent back button issues
                  (navigation as any).reset({
                    index: 0,
                    routes: [
                      {
                        name: 'Dashboard',
                        state: {
                          routes: [{ name: 'TablesDashboard' }],
                          index: 0,
                        },
                      },
                    ],
                  });
                }
              }]);
            } catch (error: any) {
              Alert.alert('Print Error', `Failed to print receipt: ${error.message}`, [
                {
                  text: 'OK',
                  onPress: () => {
                    // Use reset navigation to clear the stack and prevent back button issues
                    (navigation as any).reset({
                      index: 0,
                      routes: [
                        {
                          name: 'Dashboard',
                          state: {
                            routes: [{ name: 'TablesDashboard' }],
                            index: 0,
                          },
                        },
                      ],
                    });
                  },
                }
              ]);
            }
          },
        },
        {
          text: 'Done',
          onPress: () => {
            try {
              if (restaurantId && order.tableId) {
                const { createFirestoreService } = require('../../services/firestoreService');
                const svc = createFirestoreService(restaurantId);
                svc.updateTable(order.tableId, { isOccupied: false });
              }
            } catch {}
            (navigation as any).navigate('Dashboard', { screen: 'TablesDashboard' });
          },
        },
      ]
    );

    setPaymentModalVisible(false);
    setIsSplitPayment(false);
  };

  const handlePrintKOT = async () => {
    try {
      const result = await PrintService.printKOTFromOrder(order, tables[order.tableId]);
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Print Failed', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to print KOT: ${error.message}`);
    }
  };

  const handlePrintBOT = async () => {
    try {
      const result = await PrintService.printBOTFromOrder(order, tables[order.tableId]);
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Print Failed', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to print BOT: ${error.message}`);
    }
  };

  const authRole = useSelector((state: RootState) => state.auth.role);
  const staffName = useSelector((state: RootState) => state.auth.userName) || 'Unknown';

  const handleCancelOrder = () => {
    if (authRole !== 'Owner' && authRole !== 'Manager') {
      Alert.alert('Permission Denied', 'Only owners and managers can cancel orders.');
      return;
    }
    setCancellationDialogVisible(true);
  };

  const handleCancellationConfirm = (reason: 'void' | 'other', otherReason?: string) => {
    try {
      dispatch(cancelOrder({ 
        orderId, 
        reason, 
        otherReason, 
        cancelledBy: staffName 
      }));
      setCancellationDialogVisible(false);
      (navigation as any).navigate('Dashboard', { screen: 'TablesDashboard' });
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert('Error', 'Failed to cancel order. Please try again.');
    }
  };

  const totalAmount = calculateTotal();
  const returnAmount = calculateReturnAmount();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Management</Text>
        <Text style={styles.subtitle}>Order #{orderId.slice(-6)}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Order Items */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Order Items</Text>
           {(order.items || []).map((item: any, index: number) => (
             <View key={`${item.menuItemId || item.name}-${index}`} style={styles.orderItem}>
               <View style={styles.itemInfo}>
                 <Text style={styles.itemName}>{item.name}</Text>
                 {!!(item as any).description && (
                   <Text style={styles.itemDesc} numberOfLines={1}>{(item as any).description}</Text>
                 )}
                 <Text style={{ color: '#7f8c8d', marginTop: 4 }}>Qty: {item.quantity}</Text>
               </View>
               <Text style={styles.itemPrice}>Rs. {(item.price * item.quantity).toFixed(2)}</Text>
             </View>
           ))}
         </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>Rs. {calculateSubtotal().toFixed(2)}</Text>
          </View>
          {/* Tax removed */}
          {/* Service Charge removed */}
          {order.discountPercentage > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount ({order.discountPercentage}%):</Text>
              <Text style={styles.summaryValue}>-Rs. {calculateDiscount().toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRowTotal}>
            <Text style={styles.summaryLabelTotal}>Total:</Text>
            <Text style={styles.summaryValueTotal}>Rs. {totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer Name:</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Enter customer name"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number:</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePrintKOT}>
            <Text style={styles.actionButtonText}>Print KOT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handlePrintBOT}>
            <Text style={styles.actionButtonText}>Print BOT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]} 
            onPress={() => setPaymentModalVisible(true)}
          >
            <Text style={styles.primaryButtonText}>Process Payment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.dangerButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Process Payment</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setPaymentModalVisible(false);
                  setIsSplitPayment(false);
                  setAmountPaid('');
                  setSelectedPaymentMethod(null);
                }}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            
            {/* Total Amount Display */}
            <View style={styles.totalAmountSection}>
              <Text style={styles.totalAmountLabel}>Total Amount to Pay</Text>
              <Text style={styles.totalAmountValue}>Rs. {totalAmount.toFixed(2)}</Text>
            </View>
            
            {/* Payment Methods */}
            <View style={styles.paymentMethodsSection}>
              <Text style={styles.modalSectionTitle}>Select Payment Method</Text>
              <View style={styles.paymentMethodsGrid}>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      { 
                        borderColor: selectedPaymentMethod?.id === method.id ? method.color : '#e9ecef',
                        backgroundColor: selectedPaymentMethod?.id === method.id ? `${method.color}25` : '#f8f9fa',
                        shadowColor: selectedPaymentMethod?.id === method.id ? method.color : 'transparent',
                        shadowOffset: selectedPaymentMethod?.id === method.id ? { width: 0, height: 2 } : { width: 0, height: 0 },
                        shadowOpacity: selectedPaymentMethod?.id === method.id ? 0.3 : 0,
                        shadowRadius: selectedPaymentMethod?.id === method.id ? 4 : 0,
                        elevation: selectedPaymentMethod?.id === method.id ? 4 : 0,
                      }
                    ]}
                    onPress={() => handlePaymentMethodSelect(method)}
                  >
                    {method.id === 'fonepay' ? (
                      <View style={styles.fonepayIcon}>
                        <Text style={styles.fonepayText}>FP</Text>
                      </View>
                    ) : (
                      <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                    )}
                    <Text style={[
                      styles.paymentMethodText,
                      selectedPaymentMethod?.id === method.id && styles.paymentMethodTextActive,
                      { color: selectedPaymentMethod?.id === method.id ? method.color : '#6c757d' }
                    ]}>
                      {method.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Split Payment Checkbox */}
            <View style={styles.splitPaymentSection}>
              <TouchableOpacity 
                style={styles.splitCheckbox}
                onPress={() => setIsSplitPayment(!isSplitPayment)}
              >
                <View style={[styles.checkbox, isSplitPayment && styles.checkboxChecked]}>
                  {isSplitPayment && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={styles.splitCheckboxText}>Enable Split Payment</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>Amount Paid</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>Rs.</Text>
                <TextInput
                  style={[
                    styles.amountInput,
                    !isSplitPayment && styles.amountInputDisabled
                  ]}
                  value={isSplitPayment ? amountPaid : totalAmount.toFixed(2)}
                  onChangeText={isSplitPayment ? setAmountPaid : undefined}
                  placeholder={`${totalAmount.toFixed(2)}`}
                  keyboardType="numeric"
                  editable={isSplitPayment}
                />
              </View>
              {!isSplitPayment && (
                <Text style={styles.amountHint}>Click "Enable Split Payment" to modify amount</Text>
              )}
            </View>

            {/* Return Amount Display */}
            {isSplitPayment && parseFloat(amountPaid) > totalAmount && (
              <View style={styles.returnAmountSection}>
                <View style={styles.returnAmountHeader}>
                  <Ionicons name="cash-outline" size={20} color="#27ae60" />
                  <Text style={styles.returnAmountLabel}>Return Amount</Text>
                </View>
                <Text style={styles.returnAmountValue}>Rs. {returnAmount.toFixed(2)}</Text>
              </View>
            )}

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => {
                  setPaymentModalVisible(false);
                  setIsSplitPayment(false);
                  setAmountPaid('');
                  setSelectedPaymentMethod(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButtonConfirm,
                  !selectedPaymentMethod && styles.modalButtonDisabled
                ]} 
                onPress={handleProcessPayment}
                disabled={!selectedPaymentMethod}
              >
                <Ionicons name="card" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.modalButtonConfirmText}>Process Payment</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <OrderCancellationDialog
        visible={cancellationDialogVisible}
        onClose={() => setCancellationDialogVisible(false)}
        onConfirm={handleCancellationConfirm}
        title="Cancel Order"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  itemDesc: {
    fontSize: 12,
    color: '#6c757d',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  stepperBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepperBtnMinus: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  stepperBtnPlus: { backgroundColor: '#3498db', borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  stepperQty: { minWidth: 28, textAlign: 'center', fontWeight: '700', color: '#2c3e50' },
  trashBtn: { padding: 6 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6c757d',
  },
  summaryLabelTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  summaryValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: 'white',
  },
  primaryButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  primaryButtonText: {
    color: 'white',
  },
  dangerButtonText: {
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '95%',
    maxWidth: 450,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  totalAmountSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalAmountLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  totalAmountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  paymentMethodsSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 1,
  },

  paymentMethodIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
  },
  paymentMethodTextActive: {
    fontWeight: '700',
  },
  fonepayIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#9b59b6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginTop: 1,
  },
  fonepayText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  splitPaymentSection: {
    marginBottom: 20,
  },
  splitCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6c757d',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  splitCheckboxText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },

  amountSection: {
    marginBottom: 24,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    paddingVertical: 16,
  },
  amountInputDisabled: {
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
  },
  amountHint: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  returnAmountSection: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  returnAmountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
    marginLeft: 8,
  },
  returnAmountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalButtonConfirm: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#27ae60',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  modalButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowColor: '#bdc3c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default OrderManagementScreen;
