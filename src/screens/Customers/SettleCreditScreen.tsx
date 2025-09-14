import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../../theme';
import { RootState } from '../../redux/store';
import { Customer, Order, OrderItem, PaymentInfo } from '../../utils/types';
import { createOrder, addItem, setPayment, completeOrder, completeOrderWithReceipt } from '../../redux/slices/ordersSlice';
import { updateCreditAmount } from '../../redux/slices/customersSlice';
import { getRealtimeSyncService } from '../../services/realtimeSyncService';

interface RouteParams { customerId: string }

const currency = (n: number) => `Rs. ${n.toFixed(2)}`;

export default function SettleCreditScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const { customerId } = route.params as RouteParams;
  const customer = useSelector((s: RootState) => s.customers.customersById[customerId]) as Customer | undefined;
  const ordersById = useSelector((s: RootState) => s.orders.ordersById);
  const tables = useSelector((s: RootState) => s.tables.tablesById);
  const { restaurantId } = useSelector((s: RootState) => s.auth);

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank' | 'Fonepay'>('Cash');
  const [settleAmount, setSettleAmount] = useState('');
  const [showFab, setShowFab] = useState(true);

  // Split settlement state
  type SplitMethod = 'Cash' | 'Card' | 'Bank' | 'Fonepay';
  interface SplitPaymentRow { method: SplitMethod; amount: number; amountPaid: string }
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [isSplitSettlement, setIsSplitSettlement] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPaymentRow[]>([]);
  const [splitProcessed, setSplitProcessed] = useState(false);

  const isOrderForCustomer = (o: any) => {
    if (!o) return false;
    const cn = (o.payment?.customerName || o.customerName || '').trim();
    const cp = (o.payment?.customerPhone || o.customerPhone || '').trim();
    const thisName = (customer?.name || '').trim();
    const thisPhone = (customer?.phone || '').trim();
    return (thisPhone && cp && thisPhone === cp) || (!thisPhone && cn && thisName && cn.toLowerCase() === thisName.toLowerCase());
  };

  const getOrderTimestamp = (o: any) => (o?.payment?.timestamp ? o.payment.timestamp : o?.createdAt);

  const creditOrdersAll = useMemo(() => {
    const list = Object.values(ordersById || {})
      .filter((o: any) => isOrderForCustomer(o))
      .filter((o: any) => {
        const p = o.payment as any;
        if (!p) return false;
        if (p.method === 'Credit') return (p.amountPaid || 0) > 0;
        if (Array.isArray(p.splitPayments)) {
          return p.splitPayments.some((sp: any) => sp.method === 'Credit' && Number(sp.amount) > 0);
        }
        return false;
      })
      .map((o: any) => {
        const p = o.payment as any;
        const creditPart = p?.method === 'Credit'
          ? (Number(p.amountPaid) || 0)
          : (p?.splitPayments || []).filter((sp: any) => sp.method === 'Credit').reduce((s: number, sp: any) => s + (Number(sp.amount) || 0), 0);
        return { order: o as Order, creditDue: creditPart };
      })
      .sort((a: any, b: any) => getOrderTimestamp(a.order) - getOrderTimestamp(b.order)); // oldest first
    return list;
  }, [ordersById, customerId]);

  // Show only outstanding portion up to customer's current credit
  const visibleCreditOrders = useMemo(() => {
    let remaining = customer?.creditAmount || 0;
    const rows: Array<{ order: Order; creditDue: number }> = [];
    for (const it of creditOrdersAll) {
      if (remaining <= 0) break;
      const due = Math.min(remaining, it.creditDue || 0);
      if (due > 0) {
        rows.push({ order: it.order, creditDue: parseFloat(due.toFixed(2)) });
        remaining -= due;
      }
    }
    return rows;
  }, [creditOrdersAll, customer?.creditAmount]);

  const totalCreditDue = useMemo(() => visibleCreditOrders.reduce((s, it) => s + (it.creditDue || 0), 0), [visibleCreditOrders]);

  const allocation = useMemo(() => {
    const amount = parseFloat(settleAmount) || 0;
    let remaining = Math.min(amount, totalCreditDue);
    const parts: Array<{ orderId: string; amount: number }> = [];
    for (const it of visibleCreditOrders) {
      if (remaining <= 0) break;
      const pay = Math.min(remaining, it.creditDue);
      if (pay > 0.0001) {
        parts.push({ orderId: it.order.id, amount: parseFloat(pay.toFixed(2)) });
        remaining -= pay;
      }
    }
    return parts;
  }, [settleAmount, visibleCreditOrders, totalCreditDue]);

  const allocatedTotal = useMemo(() => allocation.reduce((s, p) => s + p.amount, 0), [allocation]);

  // Split helpers for settlement
  const getSplitTotal = () => splitPayments.reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amountPaid) || 0), 0);
  const targetSettleTotal = allocatedTotal; // enforce split == allocatedTotal
  const splitIsValid = Math.abs(getSplitTotal() - targetSettleTotal) < 0.01;

  const handleOpenSplit = () => {
    setShowSplitModal(true);
    setIsSplitSettlement(true);
    if (splitPayments.length === 0) {
      // Initialize with two equal rows if possible
      const base = targetSettleTotal > 0 ? targetSettleTotal / 2 : 0;
      setSplitPayments([
        { method: 'Cash', amount: base, amountPaid: base ? base.toFixed(2) : '0' },
        { method: 'Card', amount: base, amountPaid: base ? base.toFixed(2) : '0' },
      ]);
    }
  };

  const addSplitPaymentRow = () => {
    setSplitPayments([...splitPayments, { method: 'Cash', amount: 0, amountPaid: '0' }]);
  };

  const updateSplitPaymentRow = useCallback((index: number, field: keyof SplitPaymentRow, value: any) => {
    const next = [...splitPayments];
    const currentRow = next[index];
    
    if (field === 'amountPaid') {
      // Only update amountPaid when typing, don't sync amount yet
      next[index] = { ...currentRow, amountPaid: value } as SplitPaymentRow;
    } else if (field === 'amount') {
      // Only update amount when programmatically set, sync amountPaid
      next[index] = { ...currentRow, amount: value, amountPaid: value.toString() } as SplitPaymentRow;
    } else {
      // For other fields like method
      next[index] = { ...currentRow, [field]: value } as SplitPaymentRow;
    }
    
    setSplitPayments(next);
  }, [splitPayments]);

  // Sync amounts after user finishes typing (on blur or when needed)
  const syncAmounts = useCallback((index: number) => {
    const row = splitPayments[index];
    const parsed = parseFloat(row.amountPaid);
    if (!isNaN(parsed) && parsed !== row.amount) {
      updateSplitPaymentRow(index, 'amount', parsed);
    }
  }, [splitPayments, updateSplitPaymentRow]);

  const removeSplitPaymentRow = (index: number) => {
    if (splitPayments.length > 1) {
      setSplitPayments(splitPayments.filter((_, i) => i !== index));
    }
  };

  const shortId = (id: string) => `R${id.slice(-4)}`;

  const handleProcessSettlement = async () => {
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid Amount', 'Enter a valid settlement amount.'); return; }
    if (!customer) { Alert.alert('Error', 'Customer not found'); return; }
    if (amount > (customer.creditAmount || 0)) { 
      Alert.alert('Amount Too High', 'The settlement amount cannot exceed the outstanding credit amount. Please enter a valid amount.'); 
      return; 
    }
    if (allocatedTotal <= 0) { Alert.alert('Nothing to Settle', 'Amount does not cover any credit.'); return; }
    if (isSplitSettlement) {
      if (!splitIsValid) {
        Alert.alert('Split Mismatch', 'Split total must exactly equal the settlement amount.');
        return;
      }
      if (splitPayments.length === 0) {
        Alert.alert('Split Required', 'Add at least one split payment or turn off split.');
        return;
      }
    }

    // Create a synthetic order to record settlement in receipts (but don't trigger automatic printing)
    const tempTableId = `credit-${customer.id}`;
    try {
      // 1) Create new order for receipt tracking
      const createOrderAction = createOrder(tempTableId, restaurantId);
      dispatch(createOrderAction);
      
      // Get the order ID from the action payload
      const newOrderId = createOrderAction.payload.id;
      if (!newOrderId) throw new Error('Failed to create settlement order');

      // 2) Add a single line item for the settlement (not individual items)
      const item: OrderItem = {
        menuItemId: `CREDIT-SETTLEMENT`,
        name: `Credit Settlement`,
        price: allocatedTotal,
        quantity: 1,
        orderType: 'BOT',
      };
      dispatch(addItem({ orderId: newOrderId, item }));

      // 3) Payment
      const payment: any = {
        method: isSplitSettlement ? 'Split' : paymentMethod,
        amount: allocatedTotal,
        amountPaid: allocatedTotal,
        change: 0,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        timestamp: Date.now(),
      };
      if (isSplitSettlement) {
        payment.splitPayments = splitPayments.map(sp => ({ method: sp.method, amount: sp.amount }));
      }
      dispatch(setPayment({ orderId: newOrderId, payment }));
      
      // 4) Reduce customer credit
      dispatch(updateCreditAmount({ id: customer.id, amount: -allocatedTotal }));
      
      // 4.5) Update customer credit in Firebase
      try {
        const syncService = getRealtimeSyncService();
        if (syncService) {
          await syncService.updateCustomer(customer.id, {
            creditAmount: (customer.creditAmount || 0) - allocatedTotal
          });
        }
      } catch (error) {
        console.error('Error updating customer credit in Firebase:', error);
      }
      
      // 5) Complete the original orders that are being settled
      allocation.forEach((part) => {
        const originalOrder = ordersById[part.orderId];
        if (originalOrder && originalOrder.status === 'ongoing') {
          // Complete the original order
          dispatch(completeOrder({ orderId: part.orderId }));
        }
      });
      
      // 6) Complete the settlement order immediately to avoid empty ongoing orders
      dispatch(completeOrderWithReceipt({ orderId: newOrderId, restaurantId }));

      // 7) Print simplified settlement receipt
      try {
        const { blePrinter } = await import('../../services/blePrinter');
        const now = new Date();
        
        // Calculate correct credit amounts
        const remainingCredit = customer.creditAmount || 0; // Current credit after settlement
        const settledAmount = allocatedTotal; // Amount being settled
        const totalCreditBeforePayment = settledAmount + remainingCredit; // Total credit before settlement
        
        // Section 1: Header and Basic Info
        await blePrinter.printText(`ARBI POS\n`);
        await blePrinter.printText(`Credit Settlement Receipt\n`);
        await blePrinter.printText(`\n`);
        await blePrinter.printText(`Receipt: SET-${Date.now()}\n`);
        await blePrinter.printText(`Date: ${now.toLocaleDateString()}\n`);
        await blePrinter.printText(`Time: ${now.toLocaleTimeString()}\n`);
        await blePrinter.printText(`Credit Settlement Date: ${now.toLocaleDateString()}\n`);
        await blePrinter.printText(`Credit Settlement Time: ${now.toLocaleTimeString()}\n`);
        await blePrinter.printText(`\n`);
        
        // Section 2: Customer and Payment Info
        await blePrinter.printText(`Customer: ${customer.name}\n`);
        if (customer.phone) {
          await blePrinter.printText(`Phone: ${customer.phone}\n`);
        }
        await blePrinter.printText(`Payment Method: ${isSplitSettlement ? 'Split' : paymentMethod}\n`);
        await blePrinter.printText(`\n`);
        
        // Section 3: Credit Amounts
        await blePrinter.printText(`Credit Amount: Rs. ${totalCreditBeforePayment.toFixed(2)}\n`);
        await blePrinter.printText(`Settled Amount: Rs. ${settledAmount.toFixed(2)}\n`);
        await blePrinter.printText(`Remaining Credit: Rs. ${remainingCredit.toFixed(2)}\n`);
        await blePrinter.printText(`\n`);
        await blePrinter.printText(`Thank you!\n`);
        await blePrinter.printText(`Generated by ARBI POS System\n`);
        await blePrinter.printText(`\n\n`);
        
      } catch (error) {
        console.error('Printing failed:', error);
      }

      Alert.alert('Settlement Successful', `Settled ${currency(allocatedTotal)} from credit.`, [
        { text: 'Done', onPress: () => (navigation as any).goBack() },
        { 
          text: 'Done & Print', 
          onPress: async () => {
            try {
              const { blePrinter } = await import('../../services/blePrinter');
              const now = new Date();
              
              // Calculate correct credit amounts
              const remainingCredit = customer.creditAmount || 0; // Current credit after settlement
              const settledAmount = allocatedTotal; // Amount being settled
              const totalCreditBeforePayment = settledAmount + remainingCredit; // Total credit before settlement
              
              // Section 1: Header and Basic Info
              await blePrinter.printText(`ARBI POS\n`);
              await blePrinter.printText(`Credit Settlement Receipt\n`);
              await blePrinter.printText(`\n`);
              await blePrinter.printText(`Receipt: SET-${Date.now()}\n`);
              await blePrinter.printText(`Date: ${now.toLocaleDateString()}\n`);
              await blePrinter.printText(`Time: ${now.toLocaleTimeString()}\n`);
              await blePrinter.printText(`Credit Settlement Date: ${now.toLocaleDateString()}\n`);
              await blePrinter.printText(`Credit Settlement Time: ${now.toLocaleTimeString()}\n`);
              await blePrinter.printText(`\n`);
              
              // Section 2: Customer and Payment Info
              await blePrinter.printText(`Customer: ${customer.name}\n`);
              if (customer.phone) {
                await blePrinter.printText(`Phone: ${customer.phone}\n`);
              }
              await blePrinter.printText(`Payment Method: ${isSplitSettlement ? 'Split' : paymentMethod}\n`);
              await blePrinter.printText(`\n`);
              
              // Section 3: Credit Amounts
              await blePrinter.printText(`Credit Amount: Rs. ${totalCreditBeforePayment.toFixed(2)}\n`);
              await blePrinter.printText(`Settled Amount: Rs. ${settledAmount.toFixed(2)}\n`);
              await blePrinter.printText(`Remaining Credit: Rs. ${remainingCredit.toFixed(2)}\n`);
              await blePrinter.printText(`\n`);
              await blePrinter.printText(`Thank you!\n`);
              await blePrinter.printText(`Generated by ARBI POS System\n`);
              await blePrinter.printText(`\n\n`);
            } catch (error) {
              console.error('Re-print failed:', error);
            }
            (navigation as any).goBack();
          }
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to process settlement');
    }
  };

  if (!customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}><Text style={{ color: colors.danger }}>Customer not found</Text></View>
      </SafeAreaView>
    );
  }

  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeInner}>
        <ScrollView
          ref={scrollRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 24;
            setShowFab(!atBottom);
          }}
          scrollEventThrottle={16}
        >
        {/* Header */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settle Credit</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Customer:</Text><Text style={styles.summaryValue}>{customer.name}{customer.phone ? ` (${customer.phone})` : ''}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Outstanding Credit:</Text><Text style={[styles.summaryValue, styles.totalAmount]}>{currency(customer.creditAmount || 0)}</Text></View>
          </View>
        </View>

        {/* Credit Orders List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Overheads</Text>
          {visibleCreditOrders.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No credit transactions found.</Text>
          ) : (
            visibleCreditOrders.map(({ order, creditDue }) => (
              <View key={order.id} style={styles.itemsCard}>
                <Text style={styles.cardTitle}>Order {shortId(order.id)}</Text>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Table:</Text><Text style={styles.summaryValue}>{tables[order.tableId]?.name || order.tableId}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Credit Due:</Text><Text style={[styles.summaryValue, styles.totalAmount]}>{currency(creditDue)}</Text></View>
                <View style={[styles.divider]} />
                {order.items.map((it: any, idx: number) => (
                  <View key={`${it.menuItemId}-${idx}`} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={styles.itemQuantity}>x{it.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>Rs. {(it.price * it.quantity).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethodsGrid}>
            {[
              { method: 'Cash' as const, icon: 'cash-outline', label: 'Cash' },
              { method: 'Bank' as const, icon: 'business-outline', label: 'Bank' },
              { method: 'Card' as const, icon: 'card-outline', label: 'Card' },
              { method: 'Fonepay' as const, icon: 'wallet-outline', label: 'Fonepay' },
            ].map(({ method, icon, label }) => (
              <TouchableOpacity key={method} style={[styles.paymentMethodCard, paymentMethod === method && styles.paymentMethodSelected]} onPress={() => setPaymentMethod(method)}>
                <Ionicons name={icon as any} size={24} color={paymentMethod === method ? colors.primary : colors.textSecondary} />
                <Text style={[styles.paymentMethodLabel, paymentMethod === method && styles.paymentMethodLabelSelected]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <TouchableOpacity
              style={styles.splitBillButton}
              onPress={() => {
                if (allocatedTotal <= 0) {
                  Alert.alert('Enter Amount First', 'Set a valid settlement amount to split.');
                  return;
                }
                handleOpenSplit();
              }}
            >
              <Ionicons name="list-outline" size={20} color={colors.primary} />
              <Text style={styles.splitBillButtonText}>Split Settlement</Text>
            </TouchableOpacity>
            {isSplitSettlement && (
              <View style={styles.splitSummaryInline}>
                <Text style={styles.splitInlineText}>Split Total:</Text>
                <Text style={[styles.splitInlineAmount, { color: splitIsValid ? colors.primary : colors.danger }]}>Rs. {getSplitTotal().toFixed(2)} / Rs. {targetSettleTotal.toFixed(2)}</Text>
              </View>
            )}
            {isSplitSettlement && !splitIsValid && (
              <Text style={{ color: colors.danger, marginTop: spacing.xs, textAlign: 'center' }}>
                Split must equal the settlement amount exactly.
              </Text>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement Amount</Text>
          <View style={styles.amountCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount to Settle</Text>
              <TextInput
                style={[styles.amountInput, parseFloat(settleAmount) > (customer.creditAmount || 0) && styles.amountInputError]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={settleAmount}
                onChangeText={(v) => {
                  setSettleAmount(v);
                  // Reset split when amount changes
                  setIsSplitSettlement(false);
                  setSplitPayments([]);
                  setSplitProcessed(false);
                }}
              />
              {parseFloat(settleAmount) > (customer.creditAmount || 0) && (
                <Text style={styles.warningText}>
                  ⚠️ Amount exceeds outstanding credit. Please enter a valid amount.
                </Text>
              )}
            </View>
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>Allocated:</Text>
              <Text style={styles.changeAmount}>{currency(allocatedTotal)}</Text>
            </View>
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>Remaining Credit:</Text>
              <Text style={styles.changeAmount}>{currency(Math.max(0, (customer.creditAmount || 0) - allocatedTotal))}</Text>
            </View>
          </View>
        </View>

        {/* Process */}
        <TouchableOpacity 
          style={[
            styles.processButton, 
            (allocatedTotal <= 0 || parseFloat(settleAmount) > (customer.creditAmount || 0) || (isSplitSettlement && !splitIsValid)) && styles.processButtonDisabled
          ]} 
          disabled={allocatedTotal <= 0 || parseFloat(settleAmount) > (customer.creditAmount || 0) || (isSplitSettlement && !splitIsValid)} 
          onPress={handleProcessSettlement}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color={'white'} />
          <Text style={styles.processButtonText}>Process Settlement</Text>
        </TouchableOpacity>
        {/* Content ends */}
      </ScrollView>
      {/* Sticky floating button inside SafeArea container */}
      {showFab && (
        <TouchableOpacity
          onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
          style={styles.fab}
          accessibilityLabel="Go to bottom"
        >
          <Ionicons name="arrow-down" size={20} color={'white'} />
        </TouchableOpacity>
      )}
      </View>
      {/* Split Settlement Modal */}
      <Modal
        visible={showSplitModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowSplitModal(false); setIsSplitSettlement(false); setSplitProcessed(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Split Settlement</Text>
              <TouchableOpacity onPress={() => { setShowSplitModal(false); setIsSplitSettlement(false); setSplitProcessed(false); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={{ flex: 1 }}
            >
              <ScrollView style={{ padding: spacing.lg }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                <Text style={styles.splitDescription}>Split a total of Rs. {targetSettleTotal.toFixed(2)} across methods.</Text>
                {splitPayments.map((sp, idx) => (
                  <View key={`settle-split-row-${sp.method}-${sp.amount}-${idx}`} style={styles.splitPaymentRow}>
                    <View style={styles.splitPaymentHeader}>
                      <Text style={styles.splitPaymentTitle}>Payment {idx + 1}</Text>
                      {splitPayments.length > 1 && (
                        <TouchableOpacity onPress={() => removeSplitPaymentRow(idx)}>
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
                              onPress={() => updateSplitPaymentRow(idx, 'method', method)}
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
                          onChangeText={(val) => updateSplitPaymentRow(idx, 'amountPaid', val)}
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
                <TouchableOpacity style={styles.addSplitPaymentButton} onPress={addSplitPaymentRow}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addSplitPaymentButtonText}>Add Another Method</Text>
                </TouchableOpacity>
                <View style={styles.splitSummarySection}>
                  <View style={styles.splitTotalRow}>
                    <Text style={styles.splitTotalLabel}>Split Total</Text>
                    <Text style={[styles.splitTotalAmount, { color: splitIsValid ? colors.primary : colors.danger }]}>Rs. {getSplitTotal().toFixed(2)} / Rs. {targetSettleTotal.toFixed(2)}</Text>
                  </View>
                  {!splitIsValid && (
                    <Text style={{ color: colors.danger, textAlign: 'center' }}>Split total must equal the settlement amount exactly.</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.confirmSplitButton, !splitIsValid && styles.confirmSplitButtonDisabled]}
                  disabled={!splitIsValid}
                  onPress={() => { setSplitProcessed(true); setShowSplitModal(false); }}
                >
                  <Text style={styles.confirmSplitButtonText}>Confirm Split</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  safeInner: { flex: 1, position: 'relative' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.md },
  summaryCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, ...shadow.card },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  summaryValue: { fontSize: 14, color: colors.textPrimary },
  totalAmount: { fontWeight: 'bold', color: colors.primary, fontSize: 18 },
  itemsCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, ...shadow.card, marginBottom: spacing.md },
  cardTitle: { color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline },
  itemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  itemName: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  itemQuantity: { color: colors.textSecondary, fontSize: 12, marginLeft: spacing.sm },
  itemPrice: { color: colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.outline, marginVertical: spacing.sm },
  paymentMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  paymentMethodCard: { width: '30%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm, marginHorizontal: '1.5%', borderWidth: 2, borderColor: colors.outline, ...shadow.card },
  paymentMethodSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  paymentMethodLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  paymentMethodLabelSelected: { color: colors.primary, fontWeight: '600' },
  amountCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, ...shadow.card },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  amountInput: { borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md, padding: spacing.md, fontSize: 20, color: colors.textPrimary, backgroundColor: colors.background, textAlign: 'center', fontWeight: 'bold' },
  amountInputError: { borderColor: colors.danger, borderWidth: 2 },
  warningText: { color: colors.danger, fontSize: 12, marginTop: spacing.xs, fontWeight: '600' },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.outline },
  changeLabel: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  changeAmount: { fontSize: 18, fontWeight: 'bold', color: colors.success },
  processButton: { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.lg, marginBottom: spacing.xl, ...shadow.card },
  processButtonDisabled: { backgroundColor: colors.textMuted },
  processButtonText: { color: 'white', fontSize: 16, fontWeight: '700', marginLeft: spacing.sm },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  // Split styles
  splitBillButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' },
  splitBillButtonText: { fontSize: 16, color: colors.primary, fontWeight: '600', marginLeft: spacing.sm },
  splitSummaryInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  splitInlineText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  splitInlineAmount: { fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.lg, width: '90%', maxHeight: '80%', ...shadow.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  splitDescription: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' },
  splitPaymentRow: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.outline },
  splitPaymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  splitPaymentTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  splitPaymentInputs: { gap: spacing.lg },
  splitMethodSelect: { gap: spacing.sm },
  splitInputLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  splitMethodButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  splitMethodButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.background, minWidth: 80, justifyContent: 'center' },
  splitMethodButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  splitMethodButtonText: { fontSize: 12, color: colors.textSecondary, marginLeft: spacing.xs, fontWeight: '500' },
  splitMethodButtonTextSelected: { color: 'white', fontWeight: '600' },
  splitAmountInput: { gap: spacing.sm },
  splitAmountTextInput: { borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.background, fontSize: 18, color: colors.textPrimary, fontWeight: 'bold', textAlign: 'center' },
  addSplitPaymentButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10', borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.lg, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed' },
  addSplitPaymentButtonText: { fontSize: 14, color: colors.primary, fontWeight: '600', marginLeft: spacing.sm },
  splitSummarySection: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.outline },
  splitTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.outline },
  splitTotalLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  splitTotalAmount: { fontSize: 18, fontWeight: 'bold' },
  confirmSplitButton: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  confirmSplitButtonDisabled: { backgroundColor: colors.textMuted },
  confirmSplitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});


