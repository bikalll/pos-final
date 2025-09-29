import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { Table } from '../types/Table';
import { useOptimizedListeners } from '../hooks/useOptimizedListeners';
import { useBatchReduxUpdates } from '../utils/batchReduxUpdates';
import optimizedTableService from '../services/optimizedTableService';

const OptimizedTablesDashboardScreen: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const dispatch = useDispatch();
  const { restaurantId } = useSelector((state: RootState) => state.auth);
  const { addListener, cleanup } = useOptimizedListeners();
  const { addBatchUpdate } = useBatchReduxUpdates(dispatch);
  const { recordRenderTime } = useOptimizedListeners();
  
  // Memoized table processing with performance optimization
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
        createdAt: table.createdAt,
      };
    }).sort((a, b) => {
      // Optimized sorting
      const aTime = getTimestamp(a.createdAt);
      const bTime = getTimestamp(b.createdAt);
      const timeDiff = aTime - bTime;
      
      if (Math.abs(timeDiff) < 1000) {
        return a.number - b.number;
      }
      
      return timeDiff;
    });
    
    const endTime = performance.now();
    recordRenderTime(endTime - startTime);
    
    return convertedTables;
  }, [tables, recordRenderTime]);
  
  // Optimized table loading
  const loadTables = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      
      // Use optimized table service
      const tablesData = await optimizedTableService.loadTablesOptimized(restaurantId);
      setTables(tablesData);
      
      // Batch update Redux state
      addBatchUpdate({
        type: 'tables/setTables',
        payload: tablesData
      });
      
    } catch (error) {
      console.error('❌ Error loading tables:', error);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, addBatchUpdate]);
  
  // Setup optimized real-time listener
  useEffect(() => {
    if (!restaurantId) return;
    
    const setupListener = () => {
      const { createFirestoreService } = require('../services/firestoreService');
      const service = createFirestoreService(restaurantId);
      
      return service.listenToTables((tablesData: Record<string, any>) => {
        const startTime = performance.now();
        
        // Process tables data
        const tablesArray = Object.values(tablesData).map((table: any) => ({
          id: table.id || Object.keys(tablesData).find(key => tablesData[key] === table),
          name: table.name,
          seats: table.seats,
          description: table.description || '',
          isActive: table.isActive !== false,
          createdAt: table.createdAt,
          restaurantId: table.restaurantId,
          isOccupied: !!table.isOccupied,
          isReserved: table.isReserved || false,
          reservedAt: table.reservedAt,
          reservedUntil: table.reservedUntil,
          reservedBy: table.reservedBy,
          reservedNote: table.reservedNote,
          totalSeats: table.totalSeats,
        }));
        
        setTables(tablesArray);
        
        // Batch update Redux state
        addBatchUpdate({
          type: 'tables/setTables',
          payload: tablesArray
        });
        
        const endTime = performance.now();
        recordRenderTime(endTime - startTime);
      });
    };
    
    const unsubscribe = addListener('tables-realtime', setupListener());
    
    return () => {
      cleanup();
    };
  }, [restaurantId, addListener, cleanup, addBatchUpdate, recordRenderTime]);
  
  // Initial load
  useEffect(() => {
    loadTables();
  }, [loadTables]);
  
  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTables();
    setRefreshing(false);
  }, [loadTables]);
  
  // Render table item
  const renderTableItem = useCallback(({ item }: { item: Table }) => (
    <TouchableOpacity style={[styles.tableItem, getTableItemStyle(item.status)]}>
      <View style={styles.tableContent}>
        <Text style={styles.tableNumber}>{item.number}</Text>
        <Text style={styles.tableCapacity}>{item.capacity} seats</Text>
        <Text style={[styles.tableStatus, getTableStatusStyle(item.status)]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  ), []);
  
  // Get table item style based on status
  const getTableItemStyle = (status: string) => {
    switch (status) {
      case 'occupied':
        return styles.tableItemOccupied;
      case 'reserved':
        return styles.tableItemReserved;
      default:
        return styles.tableItemAvailable;
    }
  };
  
  // Get table status text style
  const getTableStatusStyle = (status: string) => {
    switch (status) {
      case 'occupied':
        return styles.tableStatusOccupied;
      case 'reserved':
        return styles.tableStatusReserved;
      default:
        return styles.tableStatusAvailable;
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading tables...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tables Dashboard</Text>
      
      <FlatList
        data={processedTables}
        renderItem={renderTableItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.tablesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        getItemLayout={(data, index) => ({
          length: 120,
          offset: 120 * index,
          index,
        })}
      />
    </View>
  );
};

// Helper function for timestamp conversion
const getTimestamp = (createdAt: any): number => {
  if (typeof createdAt === 'number') return createdAt;
  if (createdAt?.seconds) return createdAt.seconds * 1000;
  if (createdAt?.toDate) return createdAt.toDate().getTime();
  if (createdAt instanceof Date) return createdAt.getTime();
  return 0;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#333',
  },
  tablesList: {
    padding: 16,
  },
  tableItem: {
    flex: 1,
    margin: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableItemAvailable: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  tableItemOccupied: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  tableItemReserved: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  tableContent: {
    alignItems: 'center',
  },
  tableNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tableCapacity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tableStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tableStatusAvailable: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  tableStatusOccupied: {
    backgroundColor: '#f44336',
    color: 'white',
  },
  tableStatusReserved: {
    backgroundColor: '#ff9800',
    color: 'white',
  },
});

export default OptimizedTablesDashboardScreen;