import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius, shadow } from '../../theme';
import { blePrinter } from '../../services/blePrinter';
import { createFirestoreService } from '../../services/firestoreService';
import { printDocument } from '../../services/printing';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ReceiptDetailNavigationProp = NativeStackNavigationProp<any, 'ReceiptsTab'>;

interface RouteParams {
  orderId: string;
}

const ReceiptDetailScreen: React.FC = () => {
  const [receiptContent, setReceiptContent] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [firebaseTables, setFirebaseTables] = useState<Record<string, any>>({});
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigation = useNavigation<ReceiptDetailNavigationProp>();
  const route = useRoute();
  const { orderId } = route.params as RouteParams;
  
  const tables = useSelector((state: RootState) => state.tables.tablesById);
  const customers = useSelector((state: RootState) => state.customers.customersById);
  const { restaurantId, restaurantName: authRestaurantName, logoUrl: authLogoUrl, userName: authUserName } = useSelector((state: RootState) => (state as any).auth);
  
  // Debug: Log auth state
  console.log('🔍 ReceiptDetailScreen: Auth state:', {
    restaurantId,
    authRestaurantName,
    logoUrl: authLogoUrl,
    userName: authUserName
  });
  const [restaurantInfo, setRestaurantInfo] = useState<{ name?: string; address?: string; panVat?: string; logoUrl?: string } | null>(null);
  
  // Function to get restaurant name from the most reliable source
  const getRestaurantName = () => {
    console.log('🔍 ReceiptDetailScreen: getRestaurantName called:', {
      orderRestaurantName: order?.restaurantName,
      restaurantInfoName: restaurantInfo?.name,
      authRestaurantName: authRestaurantName,
      restaurantInfo: restaurantInfo
    });
    
    if (order?.restaurantName) {
      console.log('🔍 ReceiptDetailScreen: Using order.restaurantName:', order.restaurantName);
      return order.restaurantName;
    }
    if (restaurantInfo?.name) {
      console.log('🔍 ReceiptDetailScreen: Using restaurantInfo.name:', restaurantInfo.name);
      return restaurantInfo.name;
    }
    if (authRestaurantName) {
      console.log('🔍 ReceiptDetailScreen: Using authRestaurantName:', authRestaurantName);
      return authRestaurantName;
    }
    console.log('🔍 ReceiptDetailScreen: Using fallback: Restaurant');
    return 'Restaurant';
  };
  const reduxOrder = useSelector((state: RootState) => state.orders.ordersById[orderId]);

  // Load order data from Firebase
  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log('🔍 Loading order data for orderId:', orderId);
        console.log('🔍 RestaurantId:', restaurantId);
        
        if (!restaurantId) {
          console.error('❌ No restaurantId available');
          setLoadError('No restaurant ID available');
          setIsLoading(false);
          return;
        }

        // First check if order exists in Redux
        if (reduxOrder) {
          console.log('✅ Found order in Redux:', reduxOrder);
          console.log('🔍 Redux order processedBy:', reduxOrder.processedBy);
          setOrder(reduxOrder);
          setIsLoading(false);
          return;
        }

        // If not in Redux, try to reconstruct from receipt data
        console.log('🔍 Order not in Redux, trying to reconstruct from receipt...');
        const { createFirestoreService } = await import('../../services/firestoreService');
        const service = createFirestoreService(restaurantId);
        const receipts = await service.getReceipts();
        
        console.log('🔍 Available receipts:', Object.keys(receipts));
        console.log('🔍 Receipt orderIds:', Object.values(receipts).map((r: any) => r.orderId));
        
        const receipt = Object.values(receipts).find((r: any) => r.orderId === orderId);
        if (receipt) {
          console.log('✅ Found receipt in Firebase:', receipt);
          console.log('🔍 Receipt processedBy data:', receipt.processedBy);
          console.log('🔍 Receipt table data:', {
            tableId: receipt.tableId,
            tableName: receipt.tableName,
            hasTableId: !!receipt.tableId,
            hasTableName: !!receipt.tableName
          });
          
          // Try to load the original order from Firebase for complete discount data
          let originalOrder = null;
          try {
            const completedOrders = await service.getCompletedOrders();
            originalOrder = completedOrders[orderId];
            if (!originalOrder) {
              const ongoingOrders = await service.getOngoingOrders();
              originalOrder = ongoingOrders[orderId];
            }
            if (originalOrder) {
              console.log('✅ Found original order in Firebase:', originalOrder);
            }
          } catch (orderError) {
            console.log('⚠️ Could not load original order, using receipt data only:', orderError);
          }
          
          // Use original order data if available, otherwise reconstruct from receipt
          const orderData = originalOrder || {
            id: orderId,
            restaurantId: receipt.restaurantId,
            restaurantName: receipt.restaurantName || undefined,
            tableId: receipt.tableId || receipt.tableName || 'unknown',
            tableName: receipt.tableName || undefined,
            status: 'completed',
            items: receipt.items || [],
            subtotal: receipt.subtotal || 0,
            tax: receipt.tax || 0,
            serviceCharge: receipt.serviceCharge || 0,
            discount: receipt.discount || 0,
            taxPercentage: receipt.taxPercentage || 0,
            serviceChargePercentage: receipt.serviceChargePercentage || 0,
            discountPercentage: receipt.discountPercentage || 0,
            payment: {
              method: receipt.paymentMethod || 'Cash',
              amount: receipt.amount || 0,
              amountPaid: receipt.amount || 0,
              customerName: receipt.customerName || '',
              customerPhone: receipt.customerPhone || ''
            },
            processedBy: receipt.processedBy || null,
            role: receipt.role || null,
            createdAt: receipt.timestamp || Date.now()
          };
          
          console.log('✅ Final order data:', orderData);
          console.log('🔍 Order discount data:', {
            discountPercentage: orderData.discountPercentage,
            taxPercentage: orderData.taxPercentage,
            serviceChargePercentage: orderData.serviceChargePercentage,
            hasItems: orderData.items?.length > 0,
            itemDiscounts: orderData.items?.map((item: any) => ({
              name: item.name,
              discountPercentage: item.discountPercentage,
              discountAmount: item.discountAmount
            }))
          });
          setOrder(orderData);
        } else {
          console.error('❌ Receipt not found in Firebase for orderId:', orderId);
          setLoadError(`Receipt not found for order ID: ${orderId}`);
        }
        
      } catch (error) {
        console.error('❌ Error loading order data:', error);
        setLoadError(`Error loading receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.error('❌ Loading timeout - no data received');
        setLoadError('Loading timeout - please try again');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    loadOrderData();

    return () => clearTimeout(timeoutId);
  }, [orderId, restaurantId, reduxOrder]);

  // Check Redux order in useEffect
  useEffect(() => {
    if (reduxOrder && !order && !isLoading) {
      setOrder(reduxOrder);
      setIsLoading(false);
    }
  }, [reduxOrder, order, isLoading]);

  // Load Firebase tables
  useEffect(() => {
    const loadTables = async () => {
      if (!restaurantId) return;
      
      try {
        const service = createFirestoreService(restaurantId);
        // load restaurant info for header
        try {
          const info = await service.getRestaurantInfo();
          setRestaurantInfo({ name: info?.name, address: info?.address, panVat: info?.panVat || info?.pan || info?.vat, logoUrl: info?.logoUrl });
        } catch {}
        const tablesData = await service.getTables();
        
        if (Object.keys(tablesData).length === 0) {
          await service.createDefaultTables();
          const newTablesData = await service.getTables();
          setFirebaseTables(newTablesData);
        } else {
          setFirebaseTables(tablesData);
        }
      } catch (error) {
        console.error('Error loading tables in ReceiptDetailScreen:', error);
      }
    };
    
    loadTables();
  }, [restaurantId]);

  useEffect(() => {
    if (order) {
      generateReceiptContent();
    }
  }, [order]);

  // Calculate remaining credit for credit settlements
  const getRemainingCredit = () => {
    if (order?.payment?.customerPhone) {
      const customer = Object.values(customers).find((c: any) => c.phone === order.payment.customerPhone);
      return (customer as any)?.creditAmount || 0;
    }
    return 0;
  };

  const remainingCredit = getRemainingCredit();
  const settledAmount = order?.payment?.amountPaid || 0;
  const totalCreditBeforePayment = settledAmount + remainingCredit;

  // Set dynamic navigation title
  useLayoutEffect(() => {
    if (order) {
      const isCreditSettlement = 
        order.tableId?.startsWith('credit-') || 
        order.items.some((item: any) => item.name === 'Credit Settlement') ||
        order.items.some((item: any) => item.menuItemId === 'CREDIT-SETTLEMENT') ||
        (order.items.length === 1 && order.items[0].name.includes('Credit'));
      
      navigation.setOptions({
        title: isCreditSettlement ? 'Credit Settlement Receipt' : 'Receipt'
      });
    }
  }, [order, navigation]);

  // Handle loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Loading...</Text>
          <Text style={styles.errorMessage}>Loading receipt data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle case when order is not found
  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            {loadError ? 'Error Loading Receipt' : 'Receipt Not Found'}
          </Text>
          <Text style={styles.errorMessage}>
            {loadError || `The receipt for order ID "${orderId}" could not be found.`}
          </Text>
          {!loadError && (
            <>
              <Text style={[styles.errorMessage, { fontSize: 14, marginTop: 10 }]}>
                This might be because:
              </Text>
              <Text style={[styles.errorMessage, { fontSize: 12, marginTop: 5 }]}>
                • The order hasn't been completed yet
              </Text>
              <Text style={[styles.errorMessage, { fontSize: 12 }]}>
                • The receipt hasn't been generated
              </Text>
              <Text style={[styles.errorMessage, { fontSize: 12 }]}>
                • There's a connection issue with the database
              </Text>
            </>
          )}
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

  const handleBackToSummary = () => {
    navigation.navigate('Receipts' as any, { screen: 'DailySummary' } as any);
  };

  // Generate a shorter receipt number
  const getShortReceiptId = (id: string) => {
    // Take last 3 characters and add a prefix
    const shortId = id.slice(-3);
    const date = new Date().getDate().toString().padStart(2, '0');
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    return `R${month}${date}-${shortId}`;
  };

  const shortReceiptId = getShortReceiptId(orderId);

  // Safety check to ensure order exists before calculations
  if (!order || !order.items) {
    console.log('⚠️ ReceiptDetailScreen: Order or items not available yet');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Loading...</Text>
          <Text style={styles.errorMessage}>Please wait while we load the receipt details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const table = tables[order.tableId];
  const calculateItemTotal = (item: any) => {
    const baseTotal = item.price * item.quantity;
    let discount = 0;
    if (item.discountPercentage !== undefined) discount = (baseTotal * item.discountPercentage) / 100;
    else if (item.discountAmount !== undefined) discount = item.discountAmount;
    return Math.max(0, baseTotal - discount);
  };
  const baseSubtotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const discountedSubtotal = order.items.reduce((sum: number, item: any) => sum + calculateItemTotal(item), 0);
  const itemDiscountsTotal = Math.max(0, baseSubtotal - discountedSubtotal);
  const subtotal = discountedSubtotal;
  const tax = subtotal * ((order.taxPercentage || 0) / 100);
  const serviceCharge = subtotal * ((order.serviceChargePercentage || 0) / 100);
  const discount = subtotal * ((order.discountPercentage || 0) / 100);
  const total = subtotal + tax + serviceCharge - discount;

  // Debug logging for discount calculations
  console.log('🔍 ReceiptDetailScreen discount calculations:', {
    orderId: order.id,
    baseSubtotal,
    discountedSubtotal,
    itemDiscountsTotal,
    subtotal,
    tax,
    serviceCharge,
    discount,
    total,
    orderDiscountPercentage: order.discountPercentage,
    orderTaxPercentage: order.taxPercentage,
    orderServiceChargePercentage: order.serviceChargePercentage,
    willShowItemDiscounts: itemDiscountsTotal > 0,
    willShowOrderDiscount: order.discountPercentage > 0,
    itemsWithDiscounts: order.items.filter((item: any) => 
      item.discountPercentage !== undefined || item.discountAmount !== undefined
    ).map((item: any) => ({
      name: item.name,
      discountPercentage: item.discountPercentage,
      discountAmount: item.discountAmount,
      baseTotal: item.price * item.quantity,
      discountedTotal: calculateItemTotal(item)
    }))
  });

  const generateReceiptContent = () => {
    // Check if this is a credit settlement receipt - multiple detection methods
    const isCreditSettlement = 
      order.tableId?.startsWith('credit-') || 
      order.items.some((item: any) => item.name === 'Credit Settlement') ||
      order.items.some((item: any) => item.menuItemId === 'CREDIT-SETTLEMENT') ||
      (order.items.length === 1 && order.items[0].name.includes('Credit'));
    
    if (isCreditSettlement) {
      // Generate credit settlement format
      const splitTextCs = (order.payment?.method === 'Split' && Array.isArray((order.payment as any)?.splitPayments) && (order.payment as any).splitPayments.length > 0)
        ? `\nSplit Breakdown:\n${(order.payment as any).splitPayments.map((sp: any) => ` - ${sp.method}: Rs. ${Number(sp.amount || 0).toFixed(2)}`).join('\n')}`
        : '';
      
      // Use same restaurant info format as regular receipts
      const name = getRestaurantName();
      const addr = restaurantInfo?.address ? `\n${restaurantInfo.address}` : '';
      const pan = restaurantInfo?.panVat ? `\nPAN: ${restaurantInfo.panVat}` : '';
      const dt = `${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString()}`;
      
      const content = `
${name}${addr}${pan}
Credit Settlement Receipt
${dt}

Receipt: SET-${Date.now()}
Customer: ${order.payment?.customerName || 'N/A'}
${order.payment?.customerPhone ? `Phone: ${order.payment.customerPhone}` : ''}
Payment Method: ${order.payment?.method || 'N/A'}
${splitTextCs}

Credit Amount: Rs. ${(order.payment?.amountPaid || 0).toFixed(2)}
Settled Amount: Rs. ${(order.payment?.amountPaid || 0).toFixed(2)}
Remaining Credit: Rs. ${(order.payment?.remainingCredit || 0).toFixed(2)}

Thank you!
Powered by ARBI POS
      `.trim();
      
      setReceiptContent(content);
      return;
    }
    // Regular receipt format for non-credit settlements
    const splitText = Array.isArray((order.payment as any)?.splitPayments) && (order.payment as any).splitPayments.length > 0
      ? `Split Breakdown:\n${(order.payment as any).splitPayments.map((sp: any) => ` - ${sp.method}: Rs. ${Number(sp.amount || 0).toFixed(2)}`).join('\n')}`
      : '';
    // Debug: Log what we have for restaurant name
    console.log('🔍 ReceiptDetailScreen: Restaurant name sources:', {
      orderRestaurantName: order?.restaurantName,
      restaurantInfoName: restaurantInfo?.name,
      authRestaurantName: authRestaurantName
    });
    
    const name = getRestaurantName();
    const addr = restaurantInfo?.address ? `\n${restaurantInfo.address}` : '';
    const pan = restaurantInfo?.panVat ? `\nPAN: ${restaurantInfo.panVat}` : '';
    const dt = `${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString()}`;
    const tableLine = `${order.tableName || table?.name || (order.tableId ? order.tableId.replace('table-', '').replace('Table ', '') : 'Walk-in')}`;

    const itemLines = order.items.map((it: any) => {
      const nameCol = it.name.slice(0, 16).padEnd(16);
      const qtyCol = String(it.quantity).padStart(3);
      const totalCol = (it.price * it.quantity).toFixed(1).padStart(9);
      let itemLine = `${nameCol}${qtyCol}${totalCol}`;
      
      // Add item discount line if applicable
      if (it.discountPercentage !== undefined || it.discountAmount !== undefined) {
        let discountText = '';
        if (it.discountPercentage !== undefined) {
          discountText = `  ${it.discountPercentage}% off`;
        } else if (it.discountAmount !== undefined) {
          discountText = `  Rs.${it.discountAmount} off`;
        }
        itemLine += `\n${discountText.padEnd(28)}`;
      }
      
      return itemLine;
    }).join('\n');

    const disc = order.discountPercentage > 0 ? `Discount (${order.discountPercentage}%): -Rs. ${discount.toFixed(1)}\n` : '';
    const paymentBlock = order.payment ? `\nPayment:\nMethod: ${order.payment.method}\nAmount Paid: Rs. ${order.payment.amountPaid.toFixed(1)}\nChange: Rs. ${(order.payment.amountPaid - total).toFixed(1)}\n${splitText}` : '';

    const processedBy = (() => {
      // Handle different data structures for processedBy
      if (order?.processedBy) {
        if (typeof order.processedBy === 'object' && order.processedBy.role && order.processedBy.username) {
          // New format: {role: "Staff", username: "John"}
          return `${order.processedBy.role} - ${order.processedBy.username}`;
        } else if (typeof order.processedBy === 'string') {
          // Old format: just username string, check for separate role field
          const role = order.role || 'Staff';
          return `${role} - ${order.processedBy}`;
        } else if (order.processedBy.role) {
          // Partial format: {role: "Staff"}
          return `${order.processedBy.role} - Unknown`;
        }
      }
      return 'Unknown';
    })();

    const content = `
${name}${addr}${pan}
${dt}
Table: ${tableLine}
Processed By: ${processedBy}
------------------------------
Item               Qty      Total
------------------------------
${itemLines}
------------------------------
Sub Total: Rs. ${subtotal.toFixed(1)}
${disc}TOTAL: Rs. ${total.toFixed(1)}
${paymentBlock}

Thank you
Powered by ARBI POS
Ref Number: ${shortReceiptId}
    `.trim();

    setReceiptContent(content);
  };

  const handlePrintReceipt = async () => {
    if (isPrinting) return; // Prevent multiple print attempts
    
    setIsPrinting(true);
    try {
      // Check if this is a credit settlement receipt - same robust detection
      const isCreditSettlement = 
        order.tableId?.startsWith('credit-') || 
        order.items.some((item: any) => item.name === 'Credit Settlement') ||
        order.items.some((item: any) => item.menuItemId === 'CREDIT-SETTLEMENT') ||
        (order.items.length === 1 && order.items[0].name.includes('Credit'));
      
      if (isCreditSettlement) {
        // Print credit settlement format using PrintService
        const { PrintService } = await import('../../services/printing');
        const now = new Date();
        
        // Create a mock order for credit settlement
        const mockOrder = {
          id: `CREDIT-SETTLEMENT-${Date.now()}`,
          createdAt: now.toISOString(),
          items: [{
            name: 'Credit Settlement',
            quantity: 1,
            price: settledAmount
          }],
          taxPercentage: 0,
          serviceChargePercentage: 0,
          discountPercentage: 0,
          payment: {
            method: order.payment?.method || 'Credit',
            amountPaid: settledAmount,
            change: 0,
            customerName: order.payment?.customerName || 'N/A',
            customerPhone: order.payment?.customerPhone || '',
            timestamp: now.getTime(),
            splitPayments: (order.payment as any)?.splitPayments
          }
        };
        
        const mockTable = { name: 'Credit Settlement' };
        
        const result = await PrintService.printReceiptFromOrder(mockOrder, mockTable);
        if (result.success) {
          Alert.alert('Success!', 'Credit settlement receipt printed successfully');
        } else {
          Alert.alert('Print Failed', result.message);
        }
      } else {
        // Import PrintService for regular receipts
        const { PrintService } = await import('../../services/printing');
        
        // Show printing status
        Alert.alert('Printing...', 'Sending receipt to printer...');

        // Use the new PrintService method for better error handling
        const result = await PrintService.printReceiptFromOrder(order, table);
        
        if (result.success) {
          Alert.alert('Success!', result.message);
        } else {
          Alert.alert(
            'Print Failed', 
            result.message,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Share Receipt', onPress: handleShareReceipt }
            ]
          );
        }
      }
    } catch (e: any) {
      console.error('Print error:', e);
      Alert.alert(
        'Print Error', 
        e?.message || 'Unable to print receipt. Would you like to share it instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share Receipt', onPress: handleShareReceipt }
        ]
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: receiptContent,
        title: `Receipt #${shortReceiptId}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const handleEmailReceipt = () => {
    Alert.alert('Email Receipt', 'Receipt sent to customer email successfully', [{ text: 'OK' }]);
  };

  const formatCurrency = (amount: number) => `Rs ${amount.toFixed(2)}`;

  // Check if this is a credit settlement receipt
  const isCreditSettlement = 
    order.tableId?.startsWith('credit-') || 
    order.items.some((item: any) => item.name === 'Credit Settlement') ||
    order.items.some((item: any) => item.menuItemId === 'CREDIT-SETTLEMENT') ||
    (order.items.length === 1 && order.items[0].name.includes('Credit'));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: 0,
            // Make container height only as necessary for credit settlements
            minHeight: isCreditSettlement ? 'auto' : '100%'
          }
        ]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        {/* Receipt Paper */}
        <View style={styles.receiptPaper}>
          {isCreditSettlement ? (
            // Credit Settlement Format
            <>
              {/* Section 1: Header and Basic Info */}
              <View style={styles.creditSection}>
                {/* Header Row with Print Button */}
                <View style={styles.headerRow}>
                  <View style={styles.restaurantHeader}>
                    <Text style={styles.restaurantName}>ARBI POS</Text>
                    <Text style={styles.restaurantTagline}>Credit Settlement Receipt</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.printButton, isPrinting && styles.printButtonDisabled]}
                    onPress={handlePrintReceipt}
                    disabled={isPrinting}
                  >
                    <MaterialCommunityIcons 
                      name={isPrinting ? "loading" : "printer"} 
                      size={16} 
                      color={isPrinting ? "#999" : "#FF6B35"} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Basic Receipt Info */}
                <View style={styles.receiptInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Receipt:</Text>
                    <Text style={styles.infoValue}>SET-{Date.now()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date:</Text>
                    <Text style={styles.infoValue}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Time:</Text>
                    <Text style={styles.infoValue}>{new Date(order.createdAt).toLocaleTimeString()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Credit Settlement Date:</Text>
                    <Text style={styles.infoValue}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Credit Settlement Time:</Text>
                    <Text style={styles.infoValue}>{new Date(order.createdAt).toLocaleTimeString()}</Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Section 2: Customer and Payment Info */}
              <View style={styles.creditSection}>
                <View style={styles.receiptInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Customer:</Text>
                    <Text style={styles.infoValue}>{order.payment?.customerName || 'N/A'}</Text>
                  </View>
                  {order.payment?.customerPhone && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone:</Text>
                      <Text style={styles.infoValue}>{order.payment.customerPhone}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Payment Method:</Text>
                    <Text style={styles.infoValue}>{order.payment?.method || 'N/A'}</Text>
                  </View>
                  {(order.payment?.method === 'Split' && Array.isArray((order.payment as any)?.splitPayments) && (order.payment as any).splitPayments.length > 0) && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.infoLabel, { textAlign: 'center' }]}>Split Breakdown</Text>
                      {((order.payment as any).splitPayments as any[]).map((sp: any, idx: number) => (
                        <View key={`cs-split-${sp.method}-${sp.amount}-${idx}`} style={styles.paymentRow}>
                          <Text style={styles.paymentLabel}>{sp.method}:</Text>
                          <Text style={styles.paymentValue}>Rs {Number(sp.amount || 0).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Section 3: Credit Amounts */}
              <View style={styles.creditSection}>
                <View style={styles.billSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Credit Amount:</Text>
                    <Text style={styles.summaryValue}>Rs {totalCreditBeforePayment.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Settled Amount:</Text>
                    <Text style={styles.summaryValue}>Rs {settledAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Remaining Credit:</Text>
                    <Text style={styles.summaryValue}>Rs {remainingCredit.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Thank you!</Text>
                  <Text style={styles.footerText}>Generated by ARBI POS System</Text>
                </View>
              </View>
            </>
          ) : (
            // Regular Receipt Format
            <>
              {/* Header Row with Print Button */}
              <View style={styles.headerRow}>
                <View style={styles.restaurantHeader}>
                  {(restaurantInfo?.logoUrl || authLogoUrl) ? (
                    <View style={{ alignItems: 'center', marginBottom: 8 }}>
                      <Image source={{ uri: (restaurantInfo?.logoUrl || authLogoUrl) as string }} style={{ width: 56, height: 56, borderRadius: 28, resizeMode: 'cover' }} />
                    </View>
                  ) : null}
                  <Text style={styles.restaurantName}>{getRestaurantName()}</Text>
                  {!!restaurantInfo?.address && (
                    <Text style={styles.restaurantTagline}>{restaurantInfo.address}</Text>
                  )}
                  {!!restaurantInfo?.panVat && (
                    <Text style={styles.restaurantTagline}>PAN: {restaurantInfo.panVat}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={[styles.printButton, isPrinting && styles.printButtonDisabled]}
                  onPress={handlePrintReceipt}
                  disabled={isPrinting}
                >
                  <MaterialCommunityIcons 
                    name={isPrinting ? "loading" : "printer"} 
                    size={16} 
                    color={isPrinting ? "#999" : "#FF6B35"} 
                  />
                </TouchableOpacity>
              </View>

              {/* Receipt Info */}
              <View style={styles.receiptInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Receipt:</Text>
                  <Text style={styles.infoValue}>#{shortReceiptId}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Time:</Text>
                  <Text style={styles.infoValue}>{new Date(order.createdAt).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Table:</Text>
                  <Text style={styles.infoValue}>
                    {(() => {
                      // Try multiple sources for table name
                      const firebaseTable = firebaseTables[order.tableId];
                      const reduxTable = table;
                      
                      console.log('🔍 Table name resolution:', {
                        orderTableId: order.tableId,
                        firebaseTable: firebaseTable,
                        reduxTable: reduxTable,
                        firebaseTablesKeys: Object.keys(firebaseTables)
                      });
                      
                      if (order.tableName) {
                        console.log('✅ Using order.tableName:', order.tableName);
                        return order.tableName;
                      }
                      if (firebaseTable?.name) {
                        console.log('✅ Using Firebase table name:', firebaseTable.name);
                        return firebaseTable.name;
                      }
                      if (reduxTable?.name) {
                        console.log('✅ Using Redux table name:', reduxTable.name);
                        return reduxTable.name;
                      }
                      if (order.tableId && order.tableId !== 'unknown') {
                        // Clean up table ID to show a readable name
                        const cleanedName = order.tableId.replace('table-', '').replace('Table ', '');
                        console.log('✅ Using cleaned table ID:', cleanedName);
                        return cleanedName;
                      }
                      console.log('⚠️ Using fallback: Walk-in');
                      return 'Walk-in';
                    })()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Processed By:</Text>
                  <Text style={styles.infoValue}>
                    {(() => {
                      // Handle different data structures for processedBy
                      if (order?.processedBy) {
                        if (typeof order.processedBy === 'object' && order.processedBy.role && order.processedBy.username) {
                          // New format: {role: "Staff", username: "John"}
                          return `${order.processedBy.role} - ${order.processedBy.username}`;
                        } else if (typeof order.processedBy === 'string') {
                          // Old format: just username string, check for separate role field
                          const role = order.role || 'Staff';
                          return `${role} - ${order.processedBy}`;
                        } else if (order.processedBy.role) {
                          // Partial format: {role: "Staff"}
                          return `${order.processedBy.role} - Unknown`;
                        }
                      }
                      return 'Unknown';
                    })()}
                  </Text>
                </View>
                {(
                  (order.payment?.customerName && order.payment.customerName.length > 0) ||
                  (order.payment?.customerPhone && order.payment.customerPhone.length > 0)
                ) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Customer:</Text>
                    <Text style={styles.infoValue}>{order.payment?.customerName || order.payment?.customerPhone}</Text>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Items List */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
                <View style={styles.itemsHeaderRow}>
                  <Text style={styles.itemsHeaderLeft}>Item</Text>
                  <Text style={styles.itemsHeaderRight}>Total</Text>
                </View>
                {order.items.map((item: any, index: number) => (
                  <View key={`${item.menuItemId || item.name}-${index}`} style={styles.itemRow}>
                    <View style={styles.itemInfoInline}>
                      <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{`${item.name} x${item.quantity}`}</Text>
                      <Text style={styles.itemTotalInline}>Rs {(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                    {(item.discountPercentage !== undefined || item.discountAmount !== undefined) && (
                      <View style={styles.itemDiscountContainer}>
                        <Text style={[styles.itemUnitPrice, styles.itemDiscountLine]}>
                          {item.discountPercentage !== undefined ? `${item.discountPercentage}%` : `Rs ${Number(item.discountAmount || 0).toFixed(2)}`} off → Rs {calculateItemTotal(item).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Bill Summary */}
              <View style={styles.billSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(baseSubtotal)}</Text>
                </View>
                {itemDiscountsTotal > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Item Discounts:</Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>-{formatCurrency(itemDiscountsTotal)}</Text>
                  </View>
                )}
                {order.serviceChargePercentage > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service Charge ({order.serviceChargePercentage}%):</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(serviceCharge)}</Text>
                  </View>
                )}
                {order.taxPercentage > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax ({order.taxPercentage}%):</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
                  </View>
                )}
                {order.discountPercentage > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Order Discount ({order.discountPercentage}%):</Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>-{formatCurrency(discount)}</Text>
                  </View>
                )}
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>TOTAL:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Payment Info */}
              {order.payment && (
                <>
                  <View style={styles.paymentSection}>
                    <Text style={styles.sectionTitle}>PAYMENT</Text>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Method:</Text>
                      <Text style={styles.paymentValue}>{order.payment.method}</Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Amount Paid:</Text>
                      <Text style={styles.paymentValue}>{formatCurrency(order.payment.amountPaid)}</Text>
                    </View>
                    {(order.payment.method === 'Split' && Array.isArray((order.payment as any)?.splitPayments) && (order.payment as any).splitPayments.length > 0) && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={[styles.paymentLabel, { textAlign: 'center' }]}>Split Breakdown</Text>
                        {((order.payment as any).splitPayments as any[]).map((sp: any, idx: number) => (
                          <View key={`split-line-${sp.method}-${sp.amount}-${idx}`} style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>{sp.method}:</Text>
                            <Text style={styles.paymentValue}>Rs {Number(sp.amount || 0).toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Divider */}
                  <View style={styles.divider} />
                </>
              )}

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Thank you</Text>
                <Text style={styles.footerText}>Powered by ARBI POS</Text>
                <Text style={styles.generatedBy}>Ref Number: {shortReceiptId}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: { 
    backgroundColor: 'white', 
    padding: spacing.md, 
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  headerBackButton: {
    padding: 0,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: colors.textPrimary, 
    marginBottom: 2 
  },
  subtitle: { 
    fontSize: 14, 
    color: colors.textSecondary 
  },
  printButton: {
    position: 'absolute',
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  printButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  printButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  printButtonDisabled: {
    opacity: 0.7,
  },
  content: { 
    flex: 1, 
    paddingHorizontal: spacing.md,
    paddingTop: 16
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40, // Add bottom padding to ensure content can scroll
    paddingTop: 0
  },
  receiptPaper: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 20, 
    marginTop: 0,
    marginBottom: spacing.lg, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 800, // Ensure minimum height so content can scroll
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  restaurantHeader: {
    alignItems: 'center',
  },
  restaurantName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#2c3e50', 
    marginBottom: 4 
  },
  restaurantTagline: { 
    fontSize: 12, 
    color: '#7f8c8d' 
  },
  receiptInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  itemsSection: {
    marginBottom: 20,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 6,
  },
  itemsHeaderLeft: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  itemsHeaderRight: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  itemPrice: {
    alignItems: 'flex-end',
  },
  itemInfoInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  itemTotalInline: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
  },
  itemDiscountLine: {
    color: '#27ae60',
    marginTop: 2,
    textAlign: 'right',
  },
  itemDiscountContainer: {
    width: '100%',
  },
  itemUnitPrice: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  itemTotalPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  billSummary: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  summaryValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  discountValue: {
    color: '#e74c3c',
  },
  totalSection: {
    marginBottom: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#2c3e50',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  paymentValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  generatedBy: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  actionButtons: { 
    gap: spacing.sm, 
    marginBottom: spacing.lg 
  },
  actionButton: { 
    backgroundColor: colors.primary, 
    padding: spacing.md, 
    borderRadius: radius.md, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  errorText: { 
    textAlign: 'center', 
    fontSize: 18, 
    color: colors.danger, 
    marginTop: 100 
  },
  creditSection: {
    marginBottom: 20,
  },
});

export default ReceiptDetailScreen;
