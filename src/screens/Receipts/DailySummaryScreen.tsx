import React, { useState, useMemo, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../../redux/storeFirebase";
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
import PrintSummaryDialog from "../../components/PrintSummaryDialog";
import { ExcelExporter } from "../../utils/excelExporter";

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
  baseSubtotal?: number; // Base subtotal before any discounts (for gross sales)
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  itemDiscount?: number;
  orderDiscount?: number;
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
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showCancelledOrders, setShowCancelledOrders] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<{ name?: string; address?: string; panVat?: string; logoUrl?: string } | null>(null);
  
  const navigation = useNavigation<DrawerNavigation>();
  
  // Get orders data from Redux store (fallback)
  const completedOrders = useSelector((state: RootState) => state.orders.completedOrderIds);
  const ordersById = useSelector((state: RootState) => state.orders.ordersById);
  const tables = useSelector((state: RootState) => state.tables.tablesById);
  const receiptsRefreshTrigger = useSelector((state: RootState) => state.orders.receiptsRefreshTrigger);
  const { restaurantId, restaurantName: authRestaurantName } = useSelector((state: RootState) => state.auth);

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
        
        // Load restaurant info
        try {
          const info = await service.getRestaurantInfo();
          setRestaurantInfo({ name: info?.name, address: info?.address, panVat: info?.panVat || info?.pan || info?.vat, logoUrl: info?.logoUrl });
        } catch (error) {
          console.error('Error loading restaurant info:', error);
          // Fallback to auth restaurant name
          if (authRestaurantName) {
            setRestaurantInfo({ name: authRestaurantName, address: '', panVat: '', logoUrl: '' });
          }
        }
        
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
        
        // Debug: Log all receipts to see what's being loaded
        console.log('🔍 All loaded receipts:', Object.keys(receiptsData).map(id => ({
          id,
          orderId: receiptsData[id].orderId,
          tableId: receiptsData[id].tableId,
          tableName: receiptsData[id].tableName,
          amount: receiptsData[id].amount,
          customerName: receiptsData[id].customerName
        })));
        
        setFirebaseReceipts(receiptsData);
        
      } catch (error) {
        console.error('Error loading data in DailySummaryScreen:', error);
      }
    };
    
    loadData();
  }, [restaurantId, authRestaurantName]);

  // Refresh receipts when screen comes into focus (e.g., after settlement completion)
  useEffect(() => {
    const handleFocus = async () => {
      console.log('🔄 DailySummaryScreen: Screen focused - refreshing receipts');
      
      if (!restaurantId) {
        console.log('❌ No restaurant ID available for refresh');
        return;
      }
      
      try {
        const service = createFirestoreService(restaurantId);
        
        // Refresh receipts
        const receiptsData = await service.getReceipts();
        console.log('🔄 DailySummaryScreen: Refreshed receipts count:', Object.keys(receiptsData).length);
        
        // Debug: Log settlement receipts specifically
        const settlementReceipts = Object.values(receiptsData).filter((r: any) => r.tableId?.startsWith('credit-'));
        console.log('🔍 DailySummaryScreen: Settlement receipts found after refresh:', settlementReceipts.length);
        settlementReceipts.forEach((r: any) => {
          console.log('  - Settlement receipt:', {
            id: r.id,
            orderId: r.orderId,
            tableId: r.tableId,
            amount: r.amount
          });
        });
        
        setFirebaseReceipts(receiptsData);
      } catch (error) {
        console.error('❌ DailySummaryScreen: Error refreshing receipts:', error);
      }
    };
    
    // Add focus listener
    const unsubscribe = navigation.addListener('focus', handleFocus);
    
    // Cleanup
    return unsubscribe;
  }, [navigation, restaurantId]);

  // Listen for receipts refresh trigger from Redux
  useEffect(() => {
    const refreshReceipts = async () => {
      if (!restaurantId || receiptsRefreshTrigger === 0) return;
      
      console.log('🔄 DailySummaryScreen: Receipts refresh triggered from Redux');
      
      try {
        const service = createFirestoreService(restaurantId);
        
        // Refresh receipts
        const receiptsData = await service.getReceipts();
        console.log('🔄 DailySummaryScreen: Refreshed receipts count:', Object.keys(receiptsData).length);
        
        // Debug: Log settlement receipts specifically
        const settlementReceipts = Object.values(receiptsData).filter((r: any) => r.tableId?.startsWith('credit-'));
        console.log('🔍 DailySummaryScreen: Settlement receipts found after refresh:', settlementReceipts.length);
        settlementReceipts.forEach((r: any) => {
          console.log('  - Settlement receipt:', {
            id: r.id,
            orderId: r.orderId,
            tableId: r.tableId,
            amount: r.amount
          });
        });
        
        setFirebaseReceipts(receiptsData);
      } catch (error) {
        console.error('❌ DailySummaryScreen: Error refreshing receipts:', error);
      }
    };
    
    refreshReceipts();
  }, [receiptsRefreshTrigger, restaurantId]);

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
      
      // Debug: Log settlement receipts specifically
      if (receipt.tableId && receipt.tableId.startsWith('credit-')) {
        console.log('🔍 Settlement receipt found:', {
          id: receipt.id,
          orderId: receipt.orderId,
          tableId: receipt.tableId,
          tableName: receipt.tableName,
          amount: receipt.amount,
          customerName: receipt.customerName,
          restaurantId: receipt.restaurantId
        });
      }
      
      return true;
    });
    
    // Convert Firebase receipts to ReceiptData format, including void receipts from cancelled orders
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

      // Debug logging for discount data and baseSubtotal
      console.log('🔍 Firebase receipt data:', {
        receiptId: receipt.id,
        orderId: receipt.orderId,
        baseSubtotal: receipt.baseSubtotal,
        subtotal: receipt.subtotal,
        discount: receipt.discount,
        itemDiscount: receipt.itemDiscount,
        orderDiscount: receipt.orderDiscount,
        rawReceipt: receipt
      });

      // Calculate baseSubtotal from items if not present in receipt
      let baseSubtotal = receipt.baseSubtotal || 0;
      if (!baseSubtotal && receipt.items && receipt.items.length > 0) {
        baseSubtotal = receipt.items.reduce((sum: number, item: any) => {
          return sum + ((item.price || 0) * (item.quantity || 0));
        }, 0);
        console.log('🔍 Calculated baseSubtotal from items:', {
          receiptId: receipt.id,
          calculatedBaseSubtotal: baseSubtotal,
          items: receipt.items
        });
      }

      // Calculate discount information from order if not present in receipt
      let itemDiscount = receipt.itemDiscount || 0;
      let orderDiscount = receipt.orderDiscount || 0;
      let totalDiscount = receipt.discount || 0;
      
      if ((!itemDiscount && !orderDiscount && !totalDiscount) && relatedOrder && relatedOrder.items) {
        // Calculate item-level discounts
        const calculateItemTotal = (item: any) => {
          const baseTotal = item.price * item.quantity;
          let discount = 0;
          if (item.discountPercentage !== undefined) discount = (baseTotal * item.discountPercentage) / 100;
          else if (item.discountAmount !== undefined) discount = item.discountAmount;
          return Math.max(0, baseTotal - discount);
        };
        
        const orderBaseSubtotal = relatedOrder.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const orderDiscountedSubtotal = relatedOrder.items.reduce((sum: number, item: any) => sum + calculateItemTotal(item), 0);
        itemDiscount = Math.max(0, orderBaseSubtotal - orderDiscountedSubtotal);
        
         // Calculate order-level discount (applied to discounted subtotal after item discounts)
         if (relatedOrder.discountPercentage > 0) {
           orderDiscount = orderDiscountedSubtotal * (relatedOrder.discountPercentage / 100);
         }
        
        totalDiscount = itemDiscount + orderDiscount;
        
        console.log('🔍 Calculated discounts from order:', {
          receiptId: receipt.id,
          orderId: receipt.orderId,
          itemDiscount,
          orderDiscount,
          totalDiscount,
          orderBaseSubtotal,
          orderDiscountedSubtotal
        });
      }

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
        baseSubtotal: baseSubtotal, // Base subtotal before any discounts
        subtotal: receipt.subtotal || 0,
        tax: receipt.tax || 0,
        serviceCharge: receipt.serviceCharge || 0,
        discount: totalDiscount,
        itemDiscount: itemDiscount,
        orderDiscount: orderDiscount,
        orderItems: receipt.items || [],
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
    
    // Add void receipts from cancelled orders
    const voidReceipts = Object.values(ordersById)
      .filter((order: any) => 
        order && 
        order.status === 'cancelled' && 
        order.cancellationInfo?.reason === 'void'
      )
      .map((order: any) => {
        // Create a receipt-like object for cancelled orders with void reason
        const tableId = order.tableId;
        const firebaseTable = tableId ? firebaseTables[tableId] : undefined;
        const reduxTable = tableId ? tables[tableId] : undefined;
        let resolvedTableName: string;
        if (firebaseTable?.name) {
          resolvedTableName = firebaseTable.name;
        } else if (reduxTable?.name) {
          resolvedTableName = reduxTable.name;
        } else if (tableId && tableId !== 'unknown') {
          resolvedTableName = tableId.replace('table-', '').replace('Table ', '');
        } else {
          resolvedTableName = 'Walk-in';
        }

        // Calculate total amount from order items
        const totalAmount = order.items.reduce((sum: number, item: any) => {
          return sum + (item.price * item.quantity);
        }, 0);

        return {
          id: `void-${order.id}`,
          orderId: order.id,
          customer: order.customerName || 'Walk-in Customer',
          table: resolvedTableName,
          amount: `Rs ${totalAmount.toFixed(1)}`,
          paymentMethod: 'Void',
          time: new Date(order.cancellationInfo.cancelledAt).toLocaleTimeString(),
          date: new Date(order.cancellationInfo.cancelledAt).toLocaleDateString(),
          timestamp: order.cancellationInfo.cancelledAt,
          orderItems: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          })),
          baseSubtotal: totalAmount,
          subtotal: totalAmount,
          tax: 0,
          serviceCharge: 0,
          discount: 0,
          itemDiscount: 0,
          orderDiscount: 0,
          netPaid: 0,
          isVoid: true, // Mark as void receipt
          cancellationInfo: order.cancellationInfo,
        } as ReceiptData & { isVoid: boolean; cancellationInfo: any };
      });

    const allReceipts = [...convertedReceipts, ...voidReceipts];
    
    console.log('🔍 Converted Firebase receipts:', convertedReceipts.length);
    console.log('🔍 Void receipts from cancelled orders:', voidReceipts.length);
    console.log('🔍 Total receipts (including void):', allReceipts.length);
    console.log('🔍 Converted receipts orderIds:', convertedReceipts.map((r: any) => r.orderId));

    if (allReceipts.length === 0) {
      console.log('⚠️ NO RECEIPTS FOUND - This means:');
      console.log('1. Either no receipts have been saved to Firebase yet');
      console.log('2. Or receipts are being saved to the wrong path');
      console.log('3. Or there are no completed orders with payments');
      console.log('4. Use the "Create Receipts for Orders" button to manually create receipts');
    }

    const receiptsList = allReceipts
      .filter((receiptData: any) => {
        // Filter out invalid receipt data
        if (!receiptData || !receiptData.id) {
          console.log('⚠️ Filtering out invalid receipt data:', receiptData);
          return false;
        }
        return true;
      })
      .map((receiptData: any): ReceiptData => {
        console.log('🔄 Processing receipt data:', receiptData);
        // Since we're using converted receipts, they're already in the correct format
        return receiptData as ReceiptData;
      });

    const sortedReceipts = receiptsList.sort((a: ReceiptData, b: ReceiptData) => b.timestamp - a.timestamp);
    console.log('🔄 Final sorted receipts count:', sortedReceipts.length);
    console.log('🔄 Final sorted receipts orderIds:', sortedReceipts.map((r: any) => r.orderId));
    return sortedReceipts;
  }, [firebaseReceipts, restaurantId]);

  // Calculate payment summary from actual orders (excluding cancelled orders)
  const summary = useMemo(() => {
    // Use filtered receipts based on date range, excluding cancelled orders
    const dateFilteredReceipts = filterReceiptsByDate(receipts, selectedSortOption)
      .filter(receipt => {
        // Exclude void receipts and cancelled orders
        if ((receipt as any).isVoid) return false;
        const order = ordersById[receipt.orderId];
        return !order || order.status !== 'cancelled';
      });

    let cashTotal = 0, cardTotal = 0, bankTotal = 0, fpayTotal = 0, creditTotal = 0, splitTotal = 0;
    for (const r of dateFilteredReceipts) {
      const split = (r as any).splitBreakdown as Array<{ method: string; amount: number }> | undefined;
      if (r.paymentMethod === 'Split' && split && split.length > 0) {
        // For split payments, add to individual methods and track split total
        const splitAmount = split.reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);
        splitTotal += splitAmount;
        
        for (const sp of split) {
          const amt = Number(sp.amount) || 0;
          switch (sp.method) {
            case 'Cash': cashTotal += amt; break;
            case 'Card':
            case 'Bank Card': cardTotal += amt; break;
            case 'Bank':
            case 'Bank Transfer': bankTotal += amt; break;
            case 'UPI':
            case 'Fonepay':
            case 'PhonePe':
            case 'Paytm': fpayTotal += amt; break;
            case 'Credit': creditTotal += amt; break;
          }
        }
      } else {
        const amt = Number((r as any).netPaid ?? 0) || 0;
        switch (r.paymentMethod) {
          case 'Cash': cashTotal += amt; break;
          case 'Card':
          case 'Bank Card': cardTotal += amt; break;
          case 'Bank':
          case 'Bank Transfer': bankTotal += amt; break;
          case 'UPI':
          case 'Fonepay':
          case 'PhonePe':
          case 'Paytm': fpayTotal += amt; break;
          case 'Credit': creditTotal += amt; break;
        }
      }
    }

    // Create summary array with all payment methods, including split if present
    const summaryItems = [
      { label: "Cash", amount: `Rs ${cashTotal.toFixed(2)}`, icon: "wallet" as const, key: "Cash" },
      { label: "Card", amount: `Rs ${cardTotal.toFixed(2)}`, icon: "credit-card" as const, key: "Card" },
      { label: "Bank", amount: `Rs ${bankTotal.toFixed(2)}`, icon: "bank" as const, key: "Bank" },
      { label: "Fonepay", amount: `Rs ${fpayTotal.toFixed(2)}`, icon: "cellphone" as const, key: "Fonepay" },
      { label: "Credit", amount: `Rs ${creditTotal.toFixed(2)}`, icon: "currency-usd" as const, key: "Credit" },
    ];

    // Add split payment if there are any split transactions
    if (splitTotal > 0) {
      (summaryItems as any).push({ 
        label: "Split", 
        amount: `Rs ${splitTotal.toFixed(2)}`, 
        icon: "wallet" as const, 
        key: "Split",
        isSplit: true,
        splitBreakdown: [
          ...(cashTotal > 0 ? [{ method: 'Cash', amount: cashTotal }] : []),
          ...(cardTotal > 0 ? [{ method: 'Card', amount: cardTotal }] : []),
          ...(bankTotal > 0 ? [{ method: 'Bank', amount: bankTotal }] : []),
          ...(fpayTotal > 0 ? [{ method: 'Fonepay', amount: fpayTotal }] : []),
          ...(creditTotal > 0 ? [{ method: 'Credit', amount: creditTotal }] : []),
        ]
      });
    }

    return summaryItems;
  }, [receipts, selectedSortOption]);

  // Compute grand total payments for the selected date range (excluding cancelled orders)
  const totalPayments = useMemo(() => {
    const dateFilteredReceipts = filterReceiptsByDate(receipts, selectedSortOption)
      .filter(receipt => {
        // Exclude void receipts and cancelled orders
        if ((receipt as any).isVoid) return false;
        const order = ordersById[receipt.orderId];
        return !order || order.status !== 'cancelled';
      });
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

  // Filter and search receipts (respecting showCancelledOrders checkbox)
  const filteredReceipts = useMemo(() => {
    let filtered = receipts;

    // Filter by date range
    filtered = filterReceiptsByDate(filtered, selectedSortOption);

    // Filter cancelled orders based on checkbox state
    filtered = filtered.filter((receipt: ReceiptData) => {
      // If checkbox is checked, show all receipts (including cancelled and void)
      if (showCancelledOrders) {
        return true;
      }
      
      // If checkbox is unchecked, hide cancelled orders AND void receipts
      if ((receipt as any).isVoid) return false;
      
      // For regular receipts, exclude if order is cancelled
      const order = ordersById[receipt.orderId];
      return !order || order.status !== 'cancelled';
    });

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
  }, [searchQuery, selectedPaymentFilter, selectedSortOption, receipts, ordersById, showCancelledOrders]);

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
        
        {/* Show split breakdown if it's a split payment */}
        {item.isSplit && item.splitBreakdown && item.splitBreakdown.length > 0 && (
          <View style={{ marginTop: 6, width: '100%' }}>
            {item.splitBreakdown.map((split: any, idx: number) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: "#ccc", fontSize: 10 }}>{split.method}:</Text>
                <Text style={{ color: "#ccc", fontSize: 10 }}>Rs {split.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const handlePrintDailySummary = async () => {
    setShowPrintDialog(true);
  };

  const handlePrintSummary = async (timePeriod: 'daily' | 'weekly' | 'last30days') => {
    try {
      let range: SortOption;
      switch (timePeriod) {
        case 'daily':
          range = 'today';
          break;
        case 'weekly':
          range = 'lastWeek';
          break;
        case 'last30days':
          range = 'lastMonth';
          break;
        default:
          range = 'today';
      }
      
      await doPrintSummary(range);
    } catch (e: any) {
      Alert.alert('Print Failed', e.message || String(e));
    }
  };

  const handleSaveAsExcel = async (timePeriod: 'daily' | 'weekly' | 'last30days') => {
    try {
      let range: SortOption;
      switch (timePeriod) {
        case 'daily':
          range = 'today';
          break;
        case 'weekly':
          range = 'lastWeek';
          break;
        case 'last30days':
          range = 'lastMonth';
          break;
        default:
          range = 'today';
      }
      
      await doSaveAsExcel(range);
    } catch (error: any) {
      Alert.alert('Export Failed', error.message || 'Failed to export Excel file');
    }
  };

  const doSaveAsExcel = async (range: SortOption) => {
    try {
      const allDateFilteredReceipts = filterReceiptsByDate(receipts, range);
      const dateRange = getDateRangeLabel(range);
      
      // Filter out cancelled orders for sales calculations
      const salesReceipts = allDateFilteredReceipts.filter(receipt => {
        // Exclude void receipts and cancelled orders from sales calculations
        if ((receipt as any).isVoid) return false;
        const order = ordersById[receipt.orderId];
        return !order || order.status !== 'cancelled';
      });
      
      const restaurantData = {
        name: restaurantInfo?.name || authRestaurantName || 'Restaurant',
        address: restaurantInfo?.address,
        panVat: restaurantInfo?.panVat,
      };
      
      const voidReceiptCount = calculateVoidReceiptCount(filterReceiptsByDate(receipts, range));
      const result = await ExcelExporter.exportReceiptsAsExcel(salesReceipts, dateRange, restaurantData, voidReceiptCount);
      
      if (result.success) {
        Alert.alert('Success', 'Transaction summary exported to Excel successfully!');
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error: any) {
      Alert.alert('Export Failed', error.message || 'Failed to export Excel file');
    }
  };

  const calculateVoidReceiptCount = (receipts: ReceiptData[]): number => {
    // Count void receipts (both from Firebase receipts and cancelled orders)
    return receipts.filter(receipt => {
      // Check if it's a void receipt (marked with isVoid flag)
      if ((receipt as any).isVoid) {
        return true;
      }
      // Check if it corresponds to a cancelled order with void reason
      const order = ordersById[receipt.orderId];
      return order && 
             order.status === 'cancelled' && 
             order.cancellationInfo?.reason === 'void';
    }).length;
  };

  const calculatePreReceiptCount = (receipts: ReceiptData[]): number => {
    // Count pre-receipts (receipts marked as pre-receipt or isPreReceipt)
    return receipts.filter(receipt => {
      return (receipt as any).isPreReceipt === true || 
             (receipt as any).receiptType === 'pre-receipt' ||
             (receipt as any).paymentMethod === 'Pre-Receipt';
    }).length;
  };

  const calculateReprintCount = (receipts: ReceiptData[]): number => {
    // Count reprinted receipts (receipts with reprint flag or multiple receipts for same order)
    const orderReceiptCounts: Record<string, number> = {};
    receipts.forEach(receipt => {
      if (receipt.orderId) {
        orderReceiptCounts[receipt.orderId] = (orderReceiptCounts[receipt.orderId] || 0) + 1;
      }
    });
    
    // Count orders with more than one receipt (indicating reprints)
    return Object.values(orderReceiptCounts).filter(count => count > 1).length;
  };

  const calculateCancelledOrdersCount = (receipts: ReceiptData[]): number => {
    // Count cancelled orders (excluding void receipts which are handled separately)
    return receipts.filter(receipt => {
      const order = ordersById[receipt.orderId];
      return order && 
             order.status === 'cancelled' && 
             order.cancellationInfo?.reason !== 'void'; // Exclude void receipts
    }).length;
  };

  const doPrintSummary = async (range: SortOption) => {
    try {
      const dateFilteredReceipts = filterReceiptsByDate(receipts, range)
        .filter(receipt => {
          // Exclude void receipts and cancelled orders from sales calculations
          if ((receipt as any).isVoid) return false;
          const order = ordersById[receipt.orderId];
          return !order || order.status !== 'cancelled';
        });
      // Calculate gross sales (base subtotal before any discounts)
      const grossSales = dateFilteredReceipts.reduce((sum, r) => {
        const baseSubtotal = r.baseSubtotal || r.subtotal || 0;
        console.log('🔍 Gross sales calculation for receipt:', {
          receiptId: r.id,
          baseSubtotal: r.baseSubtotal,
          subtotal: r.subtotal,
          usedValue: baseSubtotal,
          runningSum: sum + baseSubtotal
        });
        return sum + baseSubtotal;
      }, 0);
      
      // Calculate total discounts (discount field already contains total of all discount types)
      const discounts = dateFilteredReceipts.reduce((sum, r) => {
        const totalDiscount = r.discount || 0; // This already includes itemDiscount + orderDiscount
        console.log('🔍 Receipt discount debug:', {
          receiptId: r.id,
          discount: r.discount,
          itemDiscount: r.itemDiscount,
          orderDiscount: r.orderDiscount,
          totalDiscount,
          note: 'discount field already contains total of all discount types',
          warning: 'If discount shows double, check if calculation is being done twice'
        });
        return sum + totalDiscount;
      }, 0);
      console.log('🔍 Total discounts calculated:', discounts);
      
      // No tax or service charge provision in the app
      const tax = 0; // No tax provision in the app
      const serviceCharge = 0; // No service charge provision in the app
      const complementary = 0;
      
      // Calculate net sales: Gross Sales - Discounts (simplified formula)
      const netSales = grossSales - discounts;

      // Calculate payment method totals including split breakdown
      let cashTotal = 0, cardTotal = 0, bankTotal = 0, fpayTotal = 0, creditTotal = 0, splitTotal = 0;
      let cashCount = 0, cardCount = 0, bankCount = 0, fpayCount = 0, creditCount = 0, splitCount = 0;
      
      for (const r of dateFilteredReceipts) {
        const split = (r as any).splitBreakdown as Array<{ method: string; amount: number }> | undefined;
        if (r.paymentMethod === 'Split' && split && split.length > 0) {
          // For split payments, add to individual methods and track split total
          const splitAmount = split.reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);
          splitTotal += splitAmount;
          splitCount++;
          
          for (const sp of split) {
            const amt = Number(sp.amount) || 0;
            switch (sp.method) {
              case 'Cash': cashTotal += amt; break;
              case 'Card':
              case 'Bank Card': cardTotal += amt; break;
              case 'Bank':
              case 'Bank Transfer': bankTotal += amt; break;
              case 'UPI':
              case 'Fonepay':
              case 'PhonePe':
              case 'Paytm': fpayTotal += amt; break;
              case 'Credit': creditTotal += amt; break;
            }
          }
        } else {
          const amt = Number((r as any).netPaid ?? 0) || 0;
          switch (r.paymentMethod) {
            case 'Cash': cashTotal += amt; cashCount++; break;
            case 'Card':
            case 'Bank Card': cardTotal += amt; cardCount++; break;
            case 'Bank':
            case 'Bank Transfer': bankTotal += amt; bankCount++; break;
            case 'UPI':
            case 'Fonepay':
            case 'PhonePe':
            case 'Paytm': fpayTotal += amt; fpayCount++; break;
            case 'Credit': creditTotal += amt; creditCount++; break;
          }
        }
      }

      const salesByType = [
        { type: 'Cash', count: cashCount, amount: cashTotal },
        { type: 'Card', count: cardCount, amount: cardTotal },
        { type: 'Bank', count: bankCount, amount: bankTotal },
        { type: 'Fonepay', count: fpayCount, amount: fpayTotal },
        { type: 'Credit', count: creditCount, amount: creditTotal },
      ];

      // Split payments are already included in individual payment method totals above
      // No need to add a separate "Split" entry

      const totalCount = salesByType.reduce((s, t) => s + t.count, 0);
      const totalAmount = salesByType.reduce((s, t) => s + t.amount, 0);
      salesByType.push({ type: 'Total', count: totalCount, amount: totalAmount });

      // For total payments received, exclude split and only show individual methods
      const paymentsNet = [
        { type: 'Cash', amount: cashTotal },
        { type: 'Card', amount: cardTotal },
        { type: 'Bank', amount: bankTotal },
        { type: 'Fonepay', amount: fpayTotal },
        { type: 'Credit', amount: creditTotal },
      ];

      const first = dateFilteredReceipts[dateFilteredReceipts.length - 1];
      const last = dateFilteredReceipts[0];

      const now = new Date();
      const data = {
        restaurantName: restaurantInfo?.name || authRestaurantName || 'Restaurant',
        address: restaurantInfo?.address,
        panVat: restaurantInfo?.panVat,
        printTime: now.toLocaleString(),
        date: getDateRangeLabel(range),
        grossSales,
        serviceCharge,
        discounts,
        complementary,
        netSales,
        salesByType,
        paymentsNet,
        audit: { 
          preReceiptCount: calculatePreReceiptCount(filterReceiptsByDate(receipts, range)), 
          receiptReprintCount: calculateReprintCount(filterReceiptsByDate(receipts, range)), 
          voidReceiptCount: calculateVoidReceiptCount(filterReceiptsByDate(receipts, range)), 
          totalVoidItemCount: 0,
          cancelledOrdersCount: calculateCancelledOrdersCount(filterReceiptsByDate(receipts, range))
        },
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
      let order = ordersById[receipt.orderId];
      
      // If order not found in Redux, try to load from Firebase
      if (!order) {
        console.log('🔍 Order not found in Redux, loading from Firebase...');
        if (!restaurantId) {
          Alert.alert('Error', 'Restaurant ID not available');
          return;
        }
        
        try {
          const { createFirestoreService } = await import('../../services/firestoreService');
          const service = createFirestoreService(restaurantId);
          
          // Try to get the order from completed orders
          const completedOrders = await service.getCompletedOrders();
          order = completedOrders[receipt.orderId];
          
          // If still not found, try ongoing orders
          if (!order) {
            const ongoingOrders = await service.getOngoingOrders();
            order = ongoingOrders[receipt.orderId];
          }
          
          if (!order) {
            Alert.alert('Error', 'Order not found for printing');
            return;
          }
          
          console.log('✅ Order loaded from Firebase:', order);
        } catch (firebaseError) {
          console.error('Error loading order from Firebase:', firebaseError);
          Alert.alert('Error', 'Failed to load order data for printing');
          return;
        }
      }
      
      // Get table information - try Redux first, then Firebase
      let table = tables[order.tableId];
      if (!table) {
        console.log('🔍 Table not found in Redux, loading from Firebase...');
        try {
          const { createFirestoreService } = await import('../../services/firestoreService');
          const service = createFirestoreService(restaurantId);
          const firebaseTables = await service.getTables();
          table = firebaseTables[order.tableId];
        } catch (tableError) {
          console.error('Error loading table from Firebase:', tableError);
          // Use a fallback table object
          table = { id: order.tableId, name: order.tableName || 'Unknown Table' };
        }
      }
      
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
        backgroundColor: (item as any).isVoid ? "#2d1b1b" : "#1e1e1e", // Darker red background for void receipts
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: (item as any).isVoid ? 4 : 0,
        borderLeftColor: (item as any).isVoid ? "#e74c3c" : "transparent", // Red border for void receipts
      }}
    >
      {/* Void Receipt Indicator */}
      {(item as any).isVoid && (
        <View style={{
          backgroundColor: "#e74c3c",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          alignSelf: 'flex-start',
          marginBottom: 12,
        }}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: '600' }}>
            VOID RECEIPT
          </Text>
        </View>
      )}
      
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
        
        {/* Discount Information */}
        {(item.discount > 0 || (item.itemDiscount || 0) > 0 || (item.orderDiscount || 0) > 0) && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <MaterialCommunityIcons name="tag-off" size={16} color="#e74c3c" style={{ marginRight: 8 }} />
              <Text style={{ color: "#e74c3c", fontSize: 14, fontWeight: "500" }}>Discount Applied</Text>
            </View>
            <View style={{ marginLeft: 24 }}>
              {(item.itemDiscount || 0) > 0 && (
                <Text style={{ color: "#ccc", fontSize: 12, marginBottom: 2 }}>
                  Item Discount: -Rs {(item.itemDiscount || 0).toFixed(2)}
                </Text>
              )}
              {(item.orderDiscount || 0) > 0 && (
                <Text style={{ color: "#ccc", fontSize: 12, marginBottom: 2 }}>
                  Order Discount: -Rs {(item.orderDiscount || 0).toFixed(2)}
                </Text>
              )}
              {item.discount > 0 && ((item.itemDiscount || 0) === 0 && (item.orderDiscount || 0) === 0) && (
                <Text style={{ color: "#ccc", fontSize: 12, marginBottom: 2 }}>
                  Total Discount: -Rs {item.discount.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        )}
        
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

          {/* Show Cancelled Orders Checkbox */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setShowCancelledOrders(!showCancelledOrders)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#1e1e1e",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: showCancelledOrders ? "#007AFF" : "#333",
              }}
            >
              <MaterialCommunityIcons
                name={showCancelledOrders ? "checkbox-marked" : "checkbox-blank-outline"}
                size={20}
                color={showCancelledOrders ? "#007AFF" : "#666"}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: "#fff", fontSize: 14 }}>
                Show Cancelled Orders
              </Text>
            </TouchableOpacity>
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
        
        {/* Print Summary Dialog */}
        <PrintSummaryDialog
          visible={showPrintDialog}
          onClose={() => setShowPrintDialog(false)}
          onPrint={handlePrintSummary}
          onSaveAsExcel={handleSaveAsExcel}
          title="Export Transaction Summary"
        />
      </SafeAreaView>
  );
}

