import React, { useState, useMemo, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../../redux/store";
import { Order, PaymentInfo } from "../../utils/types";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { SafeAreaView } from "react-native-safe-area-context";
import ReceiptSortingFilter, { SortOption } from "../../components/ReceiptSortingFilter";
import { filterReceiptsByDate, getDateRangeLabel } from "../../utils/receiptFilters";
import { createFirestoreService } from "../../services/firestoreService";
import { getReceiptSyncService } from "../../services/receiptSyncService";
import { getAutoReceiptService } from "../../services/autoReceiptService";
import { createOrder, completeOrder, migrateOrdersWithRestaurantId } from "../../redux/slices/ordersSlice";
import AsyncStorage from '@react-native-async-storage/async-storage';

type DrawerParamList = {
  Dashboard: undefined;
  Orders: { screen: string; params?: any };
  Receipts: { screen: string; params?: any };
  Staff: undefined;
  Inventory: undefined;
  Printer: undefined;
  Reports: undefined;
  Settings: undefined;
};

type DrawerNavigation = DrawerNavigationProp<DrawerParamList>;

interface ReceiptData {
  id: string;
  orderId: string;
  amount: string;
  customer: string;
  table: string;
  initial: string;
  paymentMethod: string;
  // Optional breakdown for split payments
  splitBreakdown?: Array<{ method: string; amount: number }>;
  time: string;
  date: string;
  timestamp: number; // Store actual timestamp for date calculations
  orderItems: any[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  // Numeric net paid used for summaries
  netPaid?: number;
}

export default function ReceiptsScreen() {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string | null>(null);
  const [selectedSortOption, setSelectedSortOption] = useState<SortOption>('today');
  const [firebaseTables, setFirebaseTables] = useState<Record<string, any>>({});
  const [firebaseReceipts, setFirebaseReceipts] = useState<Record<string, any>>({});
  
  const navigation = useNavigation<DrawerNavigation>();
  
  // Get orders data from Redux store (fallback)
  const completedOrders = useSelector((state: RootState) => state.orders.completedOrderIds);
  const ordersById = useSelector((state: RootState) => state.orders.ordersById);
  const tables = useSelector((state: RootState) => state.tables.tablesById);
  const { restaurantId } = useSelector((state: RootState) => state.auth);

  // Debug logging for troubleshooting
  console.log('DailySummaryScreen - restaurantId:', restaurantId);
  console.log('DailySummaryScreen - firebaseReceipts count:', Object.keys(firebaseReceipts).length);

  // Function to check AsyncStorage for stored data
  const checkAsyncStorage = async () => {
    try {
      console.log('🔍 Checking AsyncStorage for stored data...');
      
      // Check for persisted Redux state
      const persistedState = await AsyncStorage.getItem('persist:root');
      if (persistedState) {
        const parsedState = JSON.parse(persistedState);
        console.log('🔍 AsyncStorage - Persisted state keys:', Object.keys(parsedState));
        
        if (parsedState.orders) {
          const ordersState = JSON.parse(parsedState.orders);
          console.log('🔍 AsyncStorage - Orders state:', {
            ordersByIdCount: Object.keys(ordersState.ordersById || {}).length,
            completedOrderIdsCount: (ordersState.completedOrderIds || []).length,
            ongoingOrderIdsCount: (ordersState.ongoingOrderIds || []).length
          });
          
          // Check individual orders for restaurantId
          Object.entries(ordersState.ordersById || {}).forEach(([orderId, order]: [string, any]) => {
            console.log(`  - Stored Order ${orderId}:`, {
              hasRestaurantId: !!order.restaurantId,
              restaurantId: order.restaurantId,
              status: order.status,
              hasPayment: !!order.payment
            });
          });
        }
      } else {
        console.log('🔍 AsyncStorage - No persisted state found');
      }
    } catch (error) {
      console.error('❌ Error checking AsyncStorage:', error);
    }
  };

  // Function to fix orders missing restaurantId
  const fixOrdersMissingRestaurantId = () => {
    console.log('🔧 Fixing orders missing restaurantId...');
    
    if (restaurantId) {
      console.log(`🔧 Checking orders for missing restaurantId: ${restaurantId}`);
      let fixedCount = 0;
      
      Object.entries(ordersById).forEach(([orderId, order]) => {
        const orderData = order as Order;
        if (!orderData.restaurantId) {
          console.log(`🔧 Order ${orderId} missing restaurantId - will be fixed by migration`);
          fixedCount++;
        }
      });
      
      if (fixedCount > 0) {
        console.log(`🔧 Found ${fixedCount} orders missing restaurantId - running migration...`);
        dispatch(migrateOrdersWithRestaurantId({ restaurantId }));
        console.log('✅ Migration action dispatched');
        
        // Force a re-render after migration
        setTimeout(() => {
          console.log('🔧 Migration completed, checking again...');
          let stillMissing = 0;
          Object.entries(ordersById).forEach(([orderId, order]) => {
            const orderData = order as Order;
            if (!orderData.restaurantId) {
              stillMissing++;
            }
          });
          console.log(`🔧 After migration: ${stillMissing} orders still missing restaurantId`);
        }, 1000);
      } else {
        console.log('✅ All orders have restaurantId');
      }
    } else {
      console.log('❌ No restaurantId available for migration');
    }
  };

  // Load Firebase tables and receipts
  useEffect(() => {
    const loadData = async () => {
      if (!restaurantId) {
        console.log('❌ No restaurant ID available for loading data');
        return;
      }
      
      // Check AsyncStorage first
      await checkAsyncStorage();
      
      // Fix orders missing restaurantId
      fixOrdersMissingRestaurantId();
      
      try {
        const service = createFirestoreService(restaurantId);
        
        // Load tables
        const tablesData = await service.getTables();
        
        if (Object.keys(tablesData).length === 0) {
          await service.createDefaultTables();
          const newTablesData = await service.getTables();
          setFirebaseTables(newTablesData);
        } else {
          setFirebaseTables(tablesData);
        }
        
        // Load receipts
        const receiptsData = await service.getReceipts();
        console.log('DailySummaryScreen - Loaded receipts count:', Object.keys(receiptsData).length);
        
        setFirebaseReceipts(receiptsData);
        
      } catch (error) {
        console.error('Error loading data in DailySummaryScreen:', error);
      }
    };
    
    loadData();
  }, [restaurantId]);

  // Auto-save receipts when orders are completed
  useEffect(() => {
    const autoSaveReceipts = async () => {
      console.log('🔄 AUTO-SAVE EFFECT TRIGGERED');
      console.log('🔄 Restaurant ID:', restaurantId);
      console.log('🔄 Completed orders:', completedOrders);
      console.log('🔄 Orders by ID:', Object.keys(ordersById));
      console.log('🔄 Firebase receipts:', Object.keys(firebaseReceipts));
      
      if (!restaurantId) {
        console.log('❌ No restaurant ID for auto-save');
        return;
      }
      
      // Initialize auto receipt service if not available
      let autoReceiptService = getAutoReceiptService();
      if (!autoReceiptService) {
        console.log('🔄 Auto-initializing auto receipt service...');
        try {
          const { initializeAutoReceiptService } = await import('../../services/autoReceiptService');
          autoReceiptService = initializeAutoReceiptService(restaurantId);
          console.log('✅ Auto receipt service initialized');
        } catch (error) {
          console.error('❌ Error initializing auto receipt service:', error);
          return;
        }
      }
      
      console.log('🔄 Auto-saving receipts for completed orders...');
      console.log('🔄 Completed orders count:', completedOrders.length);
      
      // Find completed orders that need receipts saved
      const existingReceiptIds = Object.keys(firebaseReceipts);
      const ordersNeedingReceipts = completedOrders
        .map((orderId: string) => ordersById[orderId])
        .filter((order: Order | undefined): order is Order => 
          order !== undefined && 
          order.payment !== undefined && 
          order.restaurantId === restaurantId &&
          !existingReceiptIds.includes(order.id)
        );
      
      console.log('🔄 Orders needing receipts:', ordersNeedingReceipts.length);
      console.log('🔄 Orders needing receipts details:', ordersNeedingReceipts);
      
      for (const order of ordersNeedingReceipts) {
        try {
          console.log('🔄 Processing order for receipt:', order.id);
          console.log('🔄 Order details:', {
            id: order.id,
            status: order.status,
            hasPayment: !!order.payment,
            restaurantId: order.restaurantId,
            items: order.items.length
          });
          await autoReceiptService.saveReceiptForOrder(order);
          console.log('✅ Successfully saved receipt for order:', order.id);
        } catch (error) {
          console.error('❌ Error auto-saving receipt for order:', order.id, error);
        }
      }
      
      // Always refresh Firebase receipts after processing
      try {
        console.log('🔄 Refreshing Firebase receipts...');
        const receiptsData = await autoReceiptService.getReceipts();
        console.log('🔄 Refreshed Firebase receipts:', receiptsData);
        console.log('🔄 Refreshed Firebase receipts count:', Object.keys(receiptsData).length);
        setFirebaseReceipts(receiptsData);
      } catch (error) {
        console.error('❌ Error refreshing receipts after auto-save:', error);
      }
    };
    
    autoSaveReceipts();
  }, [completedOrders.length, restaurantId]);

  // Convert Firebase receipts to receipts format
  const receipts = useMemo((): ReceiptData[] => {
    // Canary check for receipts from other restaurants
    const bad = Object.values(firebaseReceipts||{}).filter((r: any) => r.restaurantId && r.restaurantId !== restaurantId);
    if (bad.length > 0) console.error('SECURITY: receipts from other restaurants found', bad.slice(0,5));
    
    // ONLY use Firebase receipts - no Redux fallback for security
    const receiptsData = Object.values(firebaseReceipts).filter((receipt: any) => {
      // Additional security check for Firebase receipts
      if (receipt.restaurantId && receipt.restaurantId !== restaurantId) {
        console.error('SECURITY: Firebase receipt from different restaurant found:', {
          receiptId: receipt.id,
          receiptRestaurantId: receipt.restaurantId,
          expectedRestaurantId: restaurantId
        });
        return false;
      }
      return true;
    });
    
    // Convert Firebase receipts to ReceiptData format
    const convertedReceipts = receiptsData.map((receipt: any) => {
      // Resolve customer name
      const customerName = receipt.customerName || 'Walk-in Customer';
      
      // Resolve table name similar to ReceiptDetailScreen
      const relatedOrder = ordersById[receipt.orderId];
      const tableIdFromReceipt = receipt.tableId || relatedOrder?.tableId;
      const firebaseTable = tableIdFromReceipt ? firebaseTables[tableIdFromReceipt] : undefined;
      const reduxTable = tableIdFromReceipt ? tables[tableIdFromReceipt] : undefined;
      let resolvedTableName: string;
      if (receipt.tableName) {
        resolvedTableName = receipt.tableName;
      } else if (firebaseTable?.name) {
        resolvedTableName = firebaseTable.name;
      } else if (reduxTable?.name) {
        resolvedTableName = reduxTable.name;
      } else if (tableIdFromReceipt && tableIdFromReceipt !== 'unknown') {
        resolvedTableName = tableIdFromReceipt.replace('table-', '').replace('Table ', '');
      } else {
        resolvedTableName = 'Walk-in';
      }

      // Prefer split breakdown from receipt if present (scalable),
      // else compute from order as fallback
      let splitBreakdown: Array<{ method: string; amount: number }> | undefined = undefined;
      let netPaid: number | undefined = undefined;
      if (Array.isArray(receipt.splitPayments) && receipt.splitPayments.length > 0) {
        splitBreakdown = receipt.splitPayments.map((sp: any) => ({ method: sp.method, amount: Number(sp.amount) || 0 }));
        netPaid = (splitBreakdown || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
      } else {
        const p: any = relatedOrder?.payment;
        if (p && Array.isArray(p.splitPayments) && p.splitPayments.length > 0) {
          splitBreakdown = p.splitPayments.map((sp: any) => ({ method: sp.method, amount: Number(sp.amount) || 0 }));
          const sb = splitBreakdown || [];
          netPaid = sb.reduce((s, b) => s + (Number(b.amount) || 0), 0);
        } else if (p) {
          const change = Number(p.change) || 0;
          const paid = Number(p.amountPaid ?? p.amount) || 0;
          netPaid = Math.max(0, paid - Math.max(0, change));
        } else {
          netPaid = Number(receipt.amount) || 0;
        }
      }
      
      const ts = typeof receipt.timestamp === 'number' && receipt.timestamp > 0
        ? receipt.timestamp
        : (typeof receipt.createdAt === 'number' && receipt.createdAt > 0 ? receipt.createdAt : 0);

      return {
        id: receipt.id,
        orderId: receipt.orderId,
        amount: `Rs ${(Number(receipt.amount) || 0).toFixed(2)}`,
        customer: customerName,
        table: resolvedTableName,
        initial: customerName[0].toUpperCase(),
        paymentMethod: receipt.paymentMethod || (splitBreakdown ? 'Split' : 'Cash'),
        splitBreakdown,
        netPaid,
        timestamp: ts,
        subtotal: receipt.subtotal || 0,
        tax: receipt.tax || 0,
        serviceCharge: receipt.serviceCharge || 0,
        discount: receipt.discount || 0,
        time: ts ? new Date(ts).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }) : '',
        date: ts ? new Date(ts).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : ''
      } as ReceiptData;
    });
    
    console.log('🔍 Converted Firebase receipts:', convertedReceipts.length);
    console.log('🔍 Converted receipts orderIds:', convertedReceipts.map((r: any) => r.orderId));

    if (convertedReceipts.length === 0) {
      console.log('⚠️ NO FIREBASE RECEIPTS FOUND - This means:');
      console.log('1. Either no receipts have been saved to Firebase yet');
      console.log('2. Or receipts are being saved to the wrong path');
      console.log('3. Or there are no completed orders with payments');
      console.log('4. Use the "Create Receipts for Orders" button to manually create receipts');
    }

    const receiptsList = convertedReceipts
      .filter((receiptData: any) => {
        // Filter out invalid receipt data
        if (!receiptData || !receiptData.id) {
          console.log('⚠️ Filtering out invalid receipt data:', receiptData);
          return false;
        }
        return true;
      })
      .map((receiptData: any): ReceiptData => {
        console.log('🔄 Processing converted receipt data:', receiptData);
        // Since we're using converted receipts, they're already in the correct format
        return receiptData as ReceiptData;
      });

    const sortedReceipts = receiptsList.sort((a: ReceiptData, b: ReceiptData) => b.timestamp - a.timestamp);
    console.log('🔄 Final sorted receipts count:', sortedReceipts.length);
    console.log('🔄 Final sorted receipts orderIds:', sortedReceipts.map((r: any) => r.orderId));
    return sortedReceipts;
  }, [firebaseReceipts, restaurantId]);

  // Calculate payment summary from actual orders
  const summary = useMemo(() => {
    // Use filtered receipts based on date range
    const dateFilteredReceipts = filterReceiptsByDate(receipts, selectedSortOption);

    let cashTotal = 0, cardTotal = 0, bankTotal = 0, fpayTotal = 0, creditTotal = 0;
    for (const r of dateFilteredReceipts) {
      const split = (r as any).splitBreakdown as Array<{ method: string; amount: number }> | undefined;
      if (r.paymentMethod === 'Split' && split && split.length > 0) {
        for (const sp of split) {
          const amt = Number(sp.amount) || 0;
          switch (sp.method) {
            case 'Cash': cashTotal += amt; break;
            case 'Card':
            case 'Bank Card': cardTotal += amt; break;
            case 'Bank': bankTotal += amt; break;
            case 'UPI':
            case 'Fonepay': fpayTotal += amt; break;
            case 'Credit': creditTotal += amt; break;
          }
        }
      } else {
        const amt = Number((r as any).netPaid ?? 0) || 0;
        switch (r.paymentMethod) {
          case 'Cash': cashTotal += amt; break;
          case 'Card':
          case 'Bank Card': cardTotal += amt; break;
          case 'Bank': bankTotal += amt; break;
          case 'UPI':
          case 'Fonepay': fpayTotal += amt; break;
          case 'Credit': creditTotal += amt; break;
        }
      }
    }

    return [
      { label: "Cash", amount: `Rs ${cashTotal.toFixed(2)}`, icon: "wallet" as const, key: "Cash" },
      { label: "Card", amount: `Rs ${cardTotal.toFixed(2)}`, icon: "credit-card" as const, key: "Card" },
      { label: "Bank", amount: `Rs ${bankTotal.toFixed(2)}`, icon: "bank" as const, key: "Bank" },
      { label: "Fonepay", amount: `Rs ${fpayTotal.toFixed(2)}`, icon: "cellphone" as const, key: "Fonepay" },
      { label: "Credit", amount: `Rs ${creditTotal.toFixed(2)}`, icon: "currency-usd" as const, key: "Credit" },
    ];
  }, [receipts, selectedSortOption]);

  // Compute grand total payments for the selected date range
  const totalPayments = useMemo(() => {
    const dateFilteredReceipts = filterReceiptsByDate(receipts, selectedSortOption);
    let total = 0;
    for (const r of dateFilteredReceipts) {
      const split = (r as any).splitBreakdown as Array<{ method: string; amount: number }> | undefined;
      if (r.paymentMethod === 'Split' && split && split.length > 0) {
        total += split.reduce((s, b) => s + (Number(b.amount) || 0), 0);
      } else {
        total += Number((r as any).netPaid ?? 0) || 0;
      }
    }
    return total;
  }, [receipts, selectedSortOption]);

  // Filter and search receipts
  const filteredReceipts = useMemo(() => {
    let filtered = receipts;

    // Filter by date range
    filtered = filterReceiptsByDate(filtered, selectedSortOption);

    // Filter by payment method
    if (selectedPaymentFilter) {
      filtered = filtered.filter((receipt: ReceiptData) => {
        if (receipt.paymentMethod === selectedPaymentFilter) return true;
        const split = (receipt as any).splitBreakdown as Array<{ method: string; amount: number }> | undefined;
        if (receipt.paymentMethod === 'Split' && split) {
          return split.some(b => b.method === selectedPaymentFilter || (selectedPaymentFilter === 'Card' && b.method === 'Bank Card') || (selectedPaymentFilter === 'Fonepay' && b.method === 'UPI'));
        }
        return false;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((receipt: ReceiptData) => 
        receipt.id.toLowerCase().includes(query) ||
        receipt.customer.toLowerCase().includes(query) ||
        receipt.table.toLowerCase().includes(query) ||
        receipt.orderId.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedPaymentFilter, selectedSortOption, receipts]);

  // Calculate filtered summary based on selected payment method
  const filteredSummary = useMemo(() => {
    if (!selectedPaymentFilter) {
      return summary;
    }
    // Recompute selected method total including split portions using processed receipts
    const dateFilteredReceipts = filterReceiptsByDate(receipts, selectedSortOption);
    let selectedTotal = 0;
    for (const r of dateFilteredReceipts) {
      const split = (r as any).splitBreakdown as Array<{ method: string; amount: number }> | undefined;
      if (r.paymentMethod === 'Split' && split && split.length > 0) {
        for (const sp of split) {
          if (sp.method === selectedPaymentFilter || (selectedPaymentFilter === 'Card' && sp.method === 'Bank Card') || (selectedPaymentFilter === 'Fonepay' && sp.method === 'UPI')) {
            selectedTotal += Number(sp.amount) || 0;
          }
        }
      } else if (r.paymentMethod === selectedPaymentFilter || (selectedPaymentFilter === 'Card' && r.paymentMethod === 'Bank Card') || (selectedPaymentFilter === 'Fonepay' && r.paymentMethod === 'UPI')) {
        selectedTotal += Number((r as any).netPaid ?? 0) || 0;
      }
    }
    return summary.map(item => item.key === selectedPaymentFilter ? { ...item, amount: `Rs ${selectedTotal.toFixed(2)}` } : item);
  }, [selectedPaymentFilter, selectedSortOption, summary, receipts]);

  const renderSummaryCard = (item: any, index: number) => (
    <TouchableOpacity
      key={`${item.key}-${index}`}
      style={{
        flex: 1,
        backgroundColor: selectedPaymentFilter === item.key ? "#333" : "#1e1e1e",
        padding: 12,
        borderRadius: 10,
        margin: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: selectedPaymentFilter === item.key ? 2 : 0,
        borderColor: selectedPaymentFilter === item.key ? "#666" : "transparent",
      }}
      onPress={() => setSelectedPaymentFilter(selectedPaymentFilter === item.key ? null : item.key)}
    >
      <View style={{ alignItems: "center" }}>
        <MaterialCommunityIcons 
          name={item.icon} 
          size={20} 
          color={selectedPaymentFilter === item.key ? "#fff" : "#fff"} 
          style={{ marginBottom: 6 }} 
        />
        <Text style={{ color: "#fff", fontSize: 12, marginBottom: 3 }}>{item.label}</Text>
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>{item.amount}</Text>
      </View>
    </TouchableOpacity>
  );

  const handlePrintDailySummary = async () => {
    try {
      Alert.alert(
        'Print Summary',
        'Choose a period to print',
        [
          { text: 'Daily', onPress: () => doPrintSummary('today') },
          { text: 'Last 7 Days', onPress: () => doPrintSummary('lastWeek') },
          { text: 'Last 30 Days', onPress: () => doPrintSummary('lastMonth') },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
      return;
    } catch (e: any) {
      Alert.alert('Print Failed', e.message || String(e));
    }
  };

  const doPrintSummary = async (range: SortOption) => {
    try {
      const dateFilteredReceipts = filterReceiptsByDate(receipts, range);
      const grossSales = dateFilteredReceipts.reduce((sum, r) => sum + (r.subtotal + r.tax + r.serviceCharge), 0);
      const discounts = dateFilteredReceipts.reduce((sum, r) => sum + (r.discount || 0), 0);
      const serviceCharge = dateFilteredReceipts.reduce((sum, r) => sum + (r.serviceCharge || 0), 0);
      const complementary = 0;
      const netSales = dateFilteredReceipts.reduce((sum, r) => sum + parseFloat(r.amount.replace('Rs ', '')), 0);

      const types = ['Card', 'Cash', 'Credit'];
      const salesByType = types.map(type => ({
        type,
        count: dateFilteredReceipts.filter(r => r.paymentMethod === type).length,
        amount: dateFilteredReceipts
          .filter(r => r.paymentMethod === type)
          .reduce((s, r) => s + parseFloat(r.amount.replace('Rs ', '')), 0),
      }));
      const totalCount = salesByType.reduce((s, t) => s + t.count, 0);
      const totalAmount = salesByType.reduce((s, t) => s + t.amount, 0);
      salesByType.push({ type: 'Total', count: totalCount, amount: totalAmount });

      const paymentsNet = ['Credit', 'Cash', 'Card'].map(type => ({
        type,
        amount: dateFilteredReceipts
          .filter(r => r.paymentMethod === type)
          .reduce((s, r) => s + parseFloat(r.amount.replace('Rs ', '')), 0),
      }));

      const first = dateFilteredReceipts[dateFilteredReceipts.length - 1];
      const last = dateFilteredReceipts[0];

      const now = new Date();
      const data = {
        printTime: now.toLocaleString(),
        date: getDateRangeLabel(range),
        grossSales,
        serviceCharge,
        discounts,
        complementary,
        netSales,
        salesByType,
        paymentsNet,
        audit: { preReceiptCount: 0, receiptReprintCount: 0, voidReceiptCount: 0, totalVoidItemCount: 0 },
        firstReceipt: first ? {
          reference: first.id,
          sequence: first.orderId?.slice(-5),
          time: new Date(first.timestamp).toLocaleTimeString(),
          netAmount: parseFloat(first.amount.replace('Rs ', '')),
        } : undefined,
        lastReceipt: last ? {
          reference: last.id,
          sequence: last.orderId?.slice(-5),
          time: new Date(last.timestamp).toLocaleTimeString(),
          netAmount: parseFloat(last.amount.replace('Rs ', '')),
        } : undefined,
      };

      const { blePrinter } = await import('../../services/blePrinter');
      await blePrinter.printDailySummary(data as any);
      Alert.alert('Success', 'Daily summary sent to printer');
    } catch (e: any) {
      Alert.alert('Print Failed', e.message || String(e));
    }
  };

  const handleViewOrders = () => {
    // Navigate to Orders drawer screen -> OngoingOrders stack screen
    navigation.navigate('Orders', { screen: 'OngoingOrders' });
  };

  const handleViewReceipt = (receipt: ReceiptData) => {
    console.log('Navigating to ReceiptDetail with orderId:', receipt.orderId);
    console.log('Receipt data:', receipt);
    console.log('Navigation object:', navigation);
    
    try {
      // Navigate to Receipts drawer screen -> ReceiptDetail stack screen
      navigation.navigate('Receipts', { 
        screen: 'ReceiptDetail',
        params: { orderId: receipt.orderId }
      });
      console.log('Navigation call completed successfully');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handlePrintReceipt = async (receipt: ReceiptData) => {
    try {
      const order = ordersById[receipt.orderId];
      if (!order) {
        Alert.alert('Error', 'Order not found for printing');
        return;
      }
      const table = tables[order.tableId];
      const { PrintService } = await import('../../services/printing');
      const result = await PrintService.printReceiptFromOrder(order, table);
      if (!result.success) {
        Alert.alert('Print Failed', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to print receipt: ${error.message || String(error)}`);
    }
  };

  const renderReceiptItem = ({ item }: { item: ReceiptData }) => (
    <View
      key={item.id}
      style={{
        backgroundColor: "#1e1e1e",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Receipt Details */}
      <View style={{ marginBottom: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <MaterialCommunityIcons name="account" size={16} color="#aaa" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontSize: 14 }}>Customer: {item.customer}</Text>
        </View>
        
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <MaterialCommunityIcons name="tag" size={16} color="#aaa" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontSize: 14 }}>Table: {item.table}</Text>
        </View>
        
        <View style={{ marginBottom: 12 }}>
          {(() => {
            // Compute display amount:
            // - If filtering by a method and this is a split, show only that method's amount
            // - Otherwise show net paid (amountPaid - change) to avoid showing tendered cash with change
            let displayAmount = item.amount;
            const order = ordersById[item.orderId];
            const p: any = order?.payment;
            if (selectedPaymentFilter && item.paymentMethod === 'Split' && item.splitBreakdown) {
              const amt = item.splitBreakdown
                .filter(b => b.method === selectedPaymentFilter || (selectedPaymentFilter === 'Card' && b.method === 'Bank Card') || (selectedPaymentFilter === 'Fonepay' && b.method === 'UPI'))
                .reduce((s, b) => s + (Number(b.amount) || 0), 0);
              displayAmount = `Rs ${amt.toFixed(2)}`;
            } else if (p && item.paymentMethod === 'Split' && Array.isArray(p.splitPayments)) {
              // Calculate total from order items
              const orderSubtotal = order.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
              const orderTax = orderSubtotal * ((order.taxPercentage || 0) / 100);
              const orderServiceCharge = orderSubtotal * ((order.serviceChargePercentage || 0) / 100);
              const orderDiscount = orderSubtotal * ((order.discountPercentage || 0) / 100);
              const orderTotal = orderSubtotal + orderTax + orderServiceCharge - orderDiscount;
              displayAmount = `Total: Rs ${orderTotal.toFixed(2)}`;
            } else if (p && item.paymentMethod !== 'Split') {
              const change = Number(p.change) || 0;
              const paid = Number(p.amountPaid) || 0;
              const netPaid = Math.max(0, paid - Math.max(0, change));
              displayAmount = `Rs ${netPaid.toFixed(2)}`;
            }
            return (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <MaterialCommunityIcons name="credit-card" size={16} color="#aaa" style={{ marginRight: 8 }} />
                <Text style={{ color: "#fff", fontSize: 14 }}>Paid: {displayAmount} via </Text>
                <View
                  style={{
                    backgroundColor: "#333",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#555",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>{item.paymentMethod}</Text>
                </View>
              </View>
            );
          })(          )}
          {item.paymentMethod === 'Split' && item.splitBreakdown && (
            <Text style={{ color: '#ccc', fontSize: 12, marginLeft: 24 }}>
              {item.splitBreakdown.map(b => `${b.method}: Rs ${b.amount.toFixed(0)}`).join(' · ')}
              {(() => {
                const order = ordersById[item.orderId];
                const p: any = order?.payment;
                const change = Number(p?.change) || 0;
                if (change > 0) {
                  return ` · Change: Rs ${change.toFixed(0)}`;
                }
                return '';
              })()}
            </Text>
          )}
        </View>
        
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#aaa" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontSize: 14 }}>{item.time}</Text>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: "#555",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
          onPress={() => handlePrintReceipt(item)}
        >
          <MaterialCommunityIcons name="printer" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>Print</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: "#555",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
          onPress={() => handleViewReceipt(item)}
        >
          <MaterialCommunityIcons name="file-document" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#111" }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
          {/* Header */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="file-document" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#fff" }}>Receipts</Text>
            </View>
            <Text style={{ color: "#aaa", fontSize: 13 }}>
              View and manage today's transaction receipts.
            </Text>
            
            
          </View>


          {/* Payment Summary */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}>
              {getDateRangeLabel(selectedSortOption)} Payment Summary
            </Text>
            <TouchableOpacity
              onPress={handlePrintDailySummary}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#444', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}
              accessibilityLabel="Print daily summary"
            >
              <MaterialCommunityIcons name="printer" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>Print</Text>
            </TouchableOpacity>
          </View>

          {/* Payment Method Cards Grid */}
          <View style={{ marginBottom: 20 }}>
            {/* First Row: Cash, Card, Bank */}
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              {renderSummaryCard(filteredSummary[0], 0)}
              {renderSummaryCard(filteredSummary[1], 1)}
              {renderSummaryCard(filteredSummary[2], 2)}
            </View>
            {/* Second Row: Fonepay, Credit */}
            <View style={{ flexDirection: "row" }}>
              {renderSummaryCard(filteredSummary[3], 3)}
              {renderSummaryCard(filteredSummary[4], 4)}
            </View>
          </View>

          {/* Total Payments */}
          <View style={{
            backgroundColor: '#1e1e1e',
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#333'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Total Payments</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Rs {totalPayments.toFixed(2)}</Text>
            </View>
          </View>

          {/* Date Range Filter */}
          <ReceiptSortingFilter
            selectedOption={selectedSortOption}
            onSortChange={setSelectedSortOption}
          />

          {/* Search Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1e1e1e",
              borderRadius: 10,
              paddingHorizontal: 12,
              marginBottom: 16,
            }}
          >
            <MaterialCommunityIcons name="magnify" size={20} color="#aaa" />
            <TextInput
              placeholder="Search by Receipt ID or Customer..."
              placeholderTextColor="#888"
              style={{ flex: 1, padding: 10, color: "#fff" }}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialCommunityIcons name="close" size={20} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>

          {/* Results Count */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#aaa", fontSize: 14 }}>
                {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''} found
              </Text>
              <Text style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                {getDateRangeLabel(selectedSortOption)}
              </Text>
            </View>
            {selectedPaymentFilter && (
              <TouchableOpacity 
                onPress={() => setSelectedPaymentFilter(null)}
                style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12 }}>
                  Clear filter: {selectedPaymentFilter}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Receipt List */}
          {filteredReceipts.map((item) => renderReceiptItem({ item }))}

          {/* Empty State */}
          {filteredReceipts.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <MaterialCommunityIcons name="file-document" size={48} color="#555" />
              <Text style={{ color: "#555", fontSize: 16, marginTop: 16 }}>
                {searchQuery || selectedPaymentFilter || selectedSortOption !== 'all' ? 'No receipts found' : 'No completed orders yet'}
              </Text>
              {!searchQuery && !selectedPaymentFilter && selectedSortOption === 'all' && (
                <TouchableOpacity 
                  style={{
                    backgroundColor: "#333",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginTop: 16,
                  }}
                  onPress={handleViewOrders}
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
                    View Orders
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
  );
}

