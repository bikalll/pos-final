import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius, shadow } from '../../theme';
import { useOptimizedListenerCleanup } from '../../services/OptimizedListenerManager';
import { getOptimizedTables } from '../../services/DirectFirebaseService';
import { usePerformanceMonitor } from '../../services/PerformanceMonitor';
import { batchUpdateTablesFromFirebase } from '../../redux/slices/batchActions';

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrderId?: string;
  totalAmount?: number;
  customerCount?: number;
  totalSeats?: number;
}

// Helper function to convert different timestamp formats to numbers
const getTimestamp = (timestamp: any): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
    // Firebase timestamp object
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  return 0;
};

const OptimizedTablesDashboardScreen: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { restaurantId } = useSelector((state: RootState) => state.auth);
  const { addListener, removeListener, cleanup, batchUpdate } = useOptimizedListenerCleanup('OptimizedTablesDashboardScreen');
  const { updateListenerCount, incrementReduxUpdates, recordRenderTime } = usePerformanceMonitor();

  // Memoized table processing to prevent unnecessary re-renders
  const processedTables = useMemo(() => {
    const startTime = performance.now();
    
    const convertedTables: Table[] = tables.map((table) => {
      const reservedActive = table.isReserved && (!table.reservedUntil || table.reservedUntil > Date.now());
      const occupiedActive = !!table.isOccupied;
      
      return {
        id: table.id,
        number: parseInt(table.name.replace(/\D/g, '')) || 1,
        capacity: table.seats,
        status: occupiedActive ? 'occupied' as const : reservedActive ? 'reserved' as const : 'available' as const,
        createdAt: table.createdAt, // Include createdAt for sorting
      };
    }).sort((a, b) => {
      // Sort by creation time (oldest first), with fallback to table number
      const aTime = getTimestamp(a.createdAt);
      const bTime = getTimestamp(b.createdAt);
      const timeDiff = aTime - bTime;
      
      // If timestamps are very close (within 1 second), sort by table number instead
      if (Math.abs(timeDiff) < 1000) {
        const aNumber = parseInt(a.name?.replace(/\D/g, '') || '0');
        const bNumber = parseInt(b.name?.replace(/\D/g, '') || '0');
        return aNumber - bNumber;
      }
      
      return timeDiff;
    });

    const endTime = performance.now();
    recordRenderTime(endTime - startTime);
    
    return convertedTables;
  }, [tables, recordRenderTime]);

  // Load tables with caching
  const loadTables = async () => {
    if (!restaurantId) return;

    try {
      setIsLoading(true);
      const tablesData = await getOptimizedTables(restaurantId);
      
      // Sort tables by creation time (oldest first)
      const sortedTables = Object.values(tablesData).sort((a: any, b: any) => {
        const aTime = getTimestamp(a.createdAt);
        const bTime = getTimestamp(b.createdAt);
        return aTime - bTime;
      });
      
      // Use batch update for better performance
      batchUpdate('tables', sortedTables);
      
      setTables(sortedTables);
      incrementReduxUpdates();
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time listener
  useEffect(() => {
    if (!restaurantId) return;

    const setupListener = () => {
      const { createFirestoreService } = require('../../services/firestoreService');
      const service = createFirestoreService(restaurantId);
      
      return service.listenToTables((tablesData: Record<string, any>) => {
        console.log('📡 Real-time tables update received:', Object.keys(tablesData).length);
        
        // Sort tables by creation time (oldest first), with fallback to table number
        const sortedTables = Object.values(tablesData).sort((a: any, b: any) => {
          const aTime = getTimestamp(a.createdAt);
          const bTime = getTimestamp(b.createdAt);
          const timeDiff = aTime - bTime;
          
          // If timestamps are very close (within 1 second), sort by table number instead
          if (Math.abs(timeDiff) < 1000) {
            const aNumber = parseInt(a.name?.replace(/\D/g, '') || '0');
            const bNumber = parseInt(b.name?.replace(/\D/g, '') || '0');
            return aNumber - bNumber;
          }
          
          return timeDiff;
        });
        
        // Use batch update instead of individual dispatches
        batchUpdate('tables', sortedTables);
        
        setTables(sortedTables);
        incrementReduxUpdates();
      });
    };

    const unsubscribe = addListener('tables-realtime', setupListener);
    updateListenerCount(1);

    return () => {
      removeListener('tables-realtime');
      updateListenerCount(-1);
    };
  }, [restaurantId, addListener, removeListener, batchUpdate, incrementReduxUpdates, updateListenerCount]);

  // Initial load
  useEffect(() => {
    loadTables();
  }, [restaurantId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTables();
    } catch (error) {
      console.error('Error refreshing tables:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTablePress = (table: Table) => {
    // Navigation logic here
    console.log('Table pressed:', table.id);
  };

  const renderTable = ({ item: table }: { item: Table }) => (
    <TouchableOpacity
      style={[styles.tableCard, table.status === 'reserved' && styles.tableCardReserved]}
      onPress={() => handleTablePress(table)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.tableNumber}>
          {`Table ${table.number}`}
        </Text>
        <View style={[styles.badge, styles[`badge_${table.status}`]]}>
          <Text style={[styles.badgeText, styles[`badgeText_${table.status}`]]}>
            {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.createOrderButton}>
        <Text style={styles.createOrderButtonText}>
          {table.status === 'occupied' ? 'Manage Order' : 'Create Order'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tables</Text>
          <Text style={styles.subtitle}>Loading tables...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        style={styles.content}
        contentContainerStyle={styles.listContent}
        data={processedTables}
        keyExtractor={(item) => item.id}
        renderItem={renderTable}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Tables</Text>
            <Text style={styles.subtitle}>Manage your tables and create orders</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No tables yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add tables from Settings → Table Management to start taking orders.
            </Text>
          </View>
        }
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
    backgroundColor: colors.background,
    padding: spacing.md,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  tableCard: {
    width: '96%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
    marginBottom: spacing.md,
  },
  tableCardReserved: {
    opacity: 0.6,
    borderColor: colors.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tableNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badge_available: { backgroundColor: '#27ae6033', borderColor: colors.success },
  badge_occupied: { backgroundColor: '#e74c3c33', borderColor: colors.danger },
  badge_reserved: { backgroundColor: '#f39c1233', borderColor: colors.warning },
  badge_cleaning: { backgroundColor: '#ff6b3533', borderColor: colors.primary },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeText_available: { color: colors.success },
  badgeText_occupied: { color: colors.danger },
  badgeText_reserved: { color: colors.warning },
  badgeText_cleaning: { color: colors.primary },
  createOrderButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  createOrderButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default OptimizedTablesDashboardScreen;
