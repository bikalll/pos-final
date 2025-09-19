import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius } from '../../theme';
import { getOptimizedTables } from '../../services/DirectFirebaseService';
import { createFirestoreService } from '../../services/firestoreService';
import { getBatchUpdateService } from '../../services/BatchUpdateService';
import { getFirebaseService } from '../../services/firebaseService';
import { useListenerCleanup } from '../../services/ListenerManager';
import { loadOrders, updateOrderFromFirebase, removeOrderFromFirebase } from '../../redux/slices/ordersSliceFirebase';

const OngoingOrdersScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [firebaseTables, setFirebaseTables] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  const ongoingOrders = useSelector((state: RootState) => state.orders.ongoingOrderIds || []);
  const ordersById = useSelector((state: RootState) => state.orders.ordersById || {});
  const tables = useSelector((state: RootState) => state.tables.tablesById || {});
  const { restaurantId } = useSelector((state: RootState) => state.auth);
  
  // Use centralized listener management
  const { addListener, removeListener, cleanup } = useListenerCleanup('OngoingOrdersScreen');

  // Helper function to get table name
  const getTableName = (tableId: string) => {
    console.log('🔍 Getting table name for ID:', tableId);
    console.log('📊 Available Firebase tables:', Object.keys(firebaseTables));
    console.log('📊 Available Redux tables:', Object.keys(tables));
    
    // First try Firebase tables
    const firebaseTable = firebaseTables[tableId];
    if (firebaseTable) {
      console.log('✅ Found Firebase table:', firebaseTable.name);
      if (firebaseTable.name) {
        console.log('✅ Returning table name:', firebaseTable.name);
        return firebaseTable.name;
      }
      return firebaseTable.name;
    }
    
    // Then try Redux store tables
    const table = tables[tableId];
    if (table) {
      console.log('✅ Found Redux table:', table.name);
      if (table.name) {
        console.log('✅ Returning table name from Redux:', table.name);
        return table.name;
      }
      return table.name;
    }
    
    // Fallback: extract table number from tableId if it follows the pattern "table-X"
    const tableMatch = tableId.match(/^table-(\d+)$/);
    if (tableMatch) {
      return `Table ${tableMatch[1]}`;
    }
    
    // Final fallback: return the tableId itself
    return tableId;
  };

  // Helper to check if a timestamp is for today (local time)
  const isToday = (ts: any) => {
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return true; // if bad/missing date, keep to avoid hiding legitimate orders
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  // Show only today's ongoing orders, sorted by newest first
  const visibleOngoingOrders = (ongoingOrders as string[])
    .filter((orderId) => {
      const order: any = ordersById[orderId];
      const isValid = order && order.status === 'ongoing' && isToday(order.createdAt);
      
      
      if (order) {
        
        // Additional check: if the table is marked as inactive in Firebase, don't show orders for it
        const firebaseTable = firebaseTables[order.tableId];
        if (firebaseTable && firebaseTable.isActive === false) {
          console.log('🚫 Filtering out order for inactive table:', {
            orderId: order.id,
            tableId: order.tableId,
            isActive: firebaseTable.isActive
          });
          return false;
        }
        
        // Additional check: if the table doesn't exist in Firebase at all, don't show orders for it
        // (This could happen if the table was deleted or merged)
        if (!firebaseTable && !tables[order.tableId]) {
          console.log('🚫 Filtering out order for non-existent table:', {
            orderId: order.id,
            tableId: order.tableId,
            hasFirebaseTable: !!firebaseTable,
            hasReduxTable: !!tables[order.tableId]
          });
          return false;
        }
      }
      
      return isValid;
    })
    .sort((a, b) => {
      const oa: any = ordersById[a];
      const ob: any = ordersById[b];
      return Number(ob?.createdAt || 0) - Number(oa?.createdAt || 0);
    });

  // Debug ongoing orders
  console.log('🔍 Ongoing Orders Debug:', {
    totalOngoingOrders: ongoingOrders.length,
    visibleOngoingOrders: visibleOngoingOrders.length,
    ongoingOrderIds: ongoingOrders,
    ordersById: Object.keys(ordersById),
    visibleOrdersDetails: visibleOngoingOrders.map(id => {
      const order = ordersById[id];
      return {
        id,
        tableId: order?.tableId,
        status: order?.status,
        tableName: order ? getTableName(order.tableId) : 'N/A'
      };
    })
  });


  // Load initial data and set up Firebase listeners
  useEffect(() => {
    if (!restaurantId) return;

    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // Load initial orders from Firebase
        dispatch(loadOrders() as any);
        
        // Load tables from Firebase using new service
        console.log('🔄 [DEBUG] Loading tables initially for restaurant:', restaurantId);
        console.log('🔄 [DEBUG] getOptimizedTables function type:', typeof getOptimizedTables);
        
        if (typeof getOptimizedTables !== 'function') {
          console.error('❌ [DEBUG] getOptimizedTables is not a function during initial load! Type:', typeof getOptimizedTables);
          console.error('❌ [DEBUG] Trying fallback to DirectFirebaseService...');
          
          // Try fallback to DirectFirebaseService
          try {
            const { getOptimizedTables: directGetOptimizedTables } = await import('../../services/DirectFirebaseService');
            if (typeof directGetOptimizedTables === 'function') {
              console.log('✅ [DEBUG] Using DirectFirebaseService fallback');
              const tablesData = await directGetOptimizedTables(restaurantId);
              console.log('🔥 [DEBUG] Firebase tables loaded initially (fallback):', tablesData);
              setFirebaseTables(tablesData);
              return;
            }
          } catch (fallbackError) {
            console.error('❌ [DEBUG] Fallback also failed:', fallbackError);
          }
          
          throw new Error(`getOptimizedTables is not a function during initial load - it is ${typeof getOptimizedTables}`);
        }
        
        const tablesData = await getOptimizedTables(restaurantId);
        console.log('🔥 [DEBUG] Firebase tables loaded initially:', tablesData);
        setFirebaseTables(tablesData);
        
        // Set up real-time listener for ongoing orders (Firestore) using centralized management
        const service = createFirestoreService(restaurantId);
        const unsubscribe = service.listenToOngoingOrders((orders) => {
          console.log('🔥 Firestore real-time ongoing orders:', Object.keys(orders).length);
          const batchService = getBatchUpdateService(dispatch);
          Object.values(orders).forEach((order: any) => batchService.batchUpdateOrder(order));
        });
        
        // Register listener with centralized management
        addListener('ongoing-orders', unsubscribe);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing data:', error);
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [restaurantId, dispatch]);

  // Automatic cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload orders from Firebase
      dispatch(loadOrders() as any);
      
      // Reload tables from Firebase using new service
      if (restaurantId) {
        console.log('🔄 [DEBUG] Attempting to refresh tables for restaurant:', restaurantId);
        console.log('🔄 [DEBUG] getOptimizedTables function type:', typeof getOptimizedTables);
        console.log('🔄 [DEBUG] getOptimizedTables function:', getOptimizedTables);
        
        if (typeof getOptimizedTables !== 'function') {
          console.error('❌ [DEBUG] getOptimizedTables is not a function! Type:', typeof getOptimizedTables);
          console.error('❌ [DEBUG] Trying fallback to DirectFirebaseService...');
          
          // Try fallback to DirectFirebaseService
          try {
            const { getOptimizedTables: directGetOptimizedTables } = await import('../../services/DirectFirebaseService');
            if (typeof directGetOptimizedTables === 'function') {
              console.log('✅ [DEBUG] Using DirectFirebaseService fallback for refresh');
              const tablesData = await directGetOptimizedTables(restaurantId);
              console.log('✅ [DEBUG] Tables refreshed successfully (fallback):', Object.keys(tablesData).length);
              setFirebaseTables(tablesData);
              return;
            }
          } catch (fallbackError) {
            console.error('❌ [DEBUG] Fallback also failed:', fallbackError);
          }
          
          throw new Error(`getOptimizedTables is not a function - it is ${typeof getOptimizedTables}`);
        }
        
        const tablesData = await getOptimizedTables(restaurantId);
        console.log('✅ [DEBUG] Tables refreshed successfully:', Object.keys(tablesData).length);
        setFirebaseTables(tablesData);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error refreshing data:', error);
      console.error('❌ [DEBUG] Error stack:', error.stack);
    } finally {
      setRefreshing(false);
    }
  };

  // Manual cleanup function for debugging
  const handleManualCleanup = () => {
    console.log('🧹 Manual cleanup triggered');
    const ordersToRemove: string[] = [];
    
    
    ordersToRemove.forEach(orderId => {
      dispatch(removeOrderFromFirebase(orderId));
    });
    
    console.log('🧹 Manual cleanup completed, removed:', ordersToRemove.length, 'orders');
  };

  // Handle route parameters to scroll to specific table
  useEffect(() => {
    const params = route.params as { tableId?: string };
    if (params?.tableId) {
      // Find the order for the specific table
      const targetOrderId = visibleOngoingOrders.find((orderId: string) => {
        const order = ordersById[orderId];
        return order && order.tableId === params.tableId;
      });

      if (targetOrderId) {
        setHighlightedOrderId(targetOrderId);
        
        // Find the index for scrolling
        const targetOrderIndex = visibleOngoingOrders.findIndex((orderId: string) => orderId === targetOrderId);
        
        if (targetOrderIndex !== -1 && scrollViewRef.current) {
          // Scroll to the specific order after a short delay to ensure rendering
          setTimeout(() => {
            // Calculate approximate position (each order card is roughly 200px tall)
            const estimatedPosition = targetOrderIndex * 200;
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, estimatedPosition - 100), // Offset by 100px to show some context above
              animated: true
            });
          }, 500);
        }
        
        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedOrderId(null);
        }, 3000);
      }
    }
  }, [route.params, visibleOngoingOrders, ordersById]);


  const getTableCapacity = (tableId: string) => {
    // First try Firebase tables
    const firebaseTable = firebaseTables[tableId];
    if (firebaseTable) {
      if (firebaseTable.seats) {
        return firebaseTable.seats;
      }
    }
    
    // Then try Redux store tables
    const table = tables[tableId];
    if (table) {
      if (table.seats) {
        return table.seats;
      }
    }
    // Fallback: use a simple capacity calculation based on table ID
    if (tableId.startsWith('table-')) {
      const tableNumber = parseInt(tableId.replace('table-', ''));
      return tableNumber <= 4 ? 2 : tableNumber <= 8 ? 4 : 6;
    }
    return 4; // Default capacity
  };

  const handleOrderPress = (orderId: string) => {
    // @ts-ignore
    const order = ordersById[orderId];
    if (order) {
      // @ts-ignore
      navigation.navigate('OrderConfirmation', { 
        orderId, 
        tableId: order.tableId 
      });
    }
  };

  const calculateTotal = (order: any) => {
    const subtotal = (order.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    return subtotal;
  };

  const renderOrder = (orderId: string, isHighlighted: boolean = false) => {
    const order = ordersById[orderId];
    if (!order) return null;

    return (
      <TouchableOpacity key={order.id} onPress={() => handleOrderPress(order.id)}>
        <View style={[styles.orderCard, isHighlighted && styles.highlightedOrderCard]}>
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <View style={styles.titleRow}>
                <Text style={styles.orderTitle}>
                  {getTableName(order.tableId)}
                  <Text style={styles.orderReference}> • Order #{order.id.slice(-6)}</Text>
                </Text>
                <View style={styles.statusIndicator}>
                  <Ionicons name="time" size={16} color={colors.warning} />
                </View>
              </View>
              <View style={styles.orderMeta}>
                <Text style={styles.orderTime}>
                  {new Date(order.createdAt).toLocaleTimeString()}
                </Text>
                <Text style={styles.tableCapacity}>
                  • {getTableCapacity(order.tableId)} seats
                </Text>
              </View>
            </View>
            <View style={styles.orderHeaderRight}>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    // @ts-ignore
                    navigation.navigate('OrderTaking', { 
                      orderId: order.id, 
                      tableId: order.tableId 
                    });
                  }}
                >
                  <Ionicons name="add-circle" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.orderBrief}>
            <Text style={styles.orderBriefText}>
              {(order.items || []).length} items • Rs. {calculateTotal(order).toFixed(2)}
            </Text>
            {!!(order as any).specialInstructions && (
              <Text style={[styles.orderBriefText, { marginTop: 4 }]}>
                Notes: {(order as any).specialInstructions}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ongoing Orders</Text>
        <Text style={styles.subtitle}>Monitor and manage all active customer orders.</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <Ionicons name="refresh" size={48} color={colors.primary} />
            <Text style={styles.loadingText}>Loading ongoing orders...</Text>
          </View>
        ) : visibleOngoingOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No ongoing orders</Text>
            <Text style={styles.emptyStateSubtext}>
              All tables are currently available
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {visibleOngoingOrders.map((orderId: string) => renderOrder(orderId, orderId === highlightedOrderId))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    padding: spacing.md,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.md,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  refreshButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  ordersList: {
    width: '100%',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  highlightedOrderCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surface2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderRight: {
    paddingLeft: spacing.sm,
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  orderReference: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 'normal',
  },
  orderTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
  },
  tableCapacity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  orderItems: {
    marginBottom: spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  orderItemPrice: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
  },
  quantityButton: {
    padding: spacing.xs,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    paddingHorizontal: spacing.xs,
  },
  removeButton: {
    padding: spacing.xs,
  },
  orderSummary: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  dangerButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  paymentMethodSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  paymentMethodSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: spacing.xs,
  },
  paymentMethodName: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputSection: {
    width: '100%',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  modalButtonSecondary: {
    backgroundColor: colors.outline,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  modalButtonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  modalButtonPrimaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderBrief: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  orderBriefText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusIndicator: {
    marginLeft: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

});

export default OngoingOrdersScreen;
