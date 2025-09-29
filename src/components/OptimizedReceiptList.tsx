import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createOptimizedReceiptService } from '../services/optimizedReceiptService';

interface ReceiptData {
  id: string;
  orderId: string;
  tableId: string;
  tableName: string;
  customerName: string;
  amount: number;
  createdAt: string;
  paymentMethod: string;
  isVoid: boolean;
}

interface OptimizedReceiptListProps {
  restaurantId: string;
  onReceiptPress?: (receipt: ReceiptData) => void;
}

const OptimizedReceiptList: React.FC<OptimizedReceiptListProps> = ({
  restaurantId,
  onReceiptPress
}) => {
  const navigation = useNavigation();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const receiptService = useMemo(() => 
    createOptimizedReceiptService(restaurantId), 
    [restaurantId]
  );

  // Load initial receipts
  const loadReceipts = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await receiptService.clearCache();
      } else {
        setLoading(true);
      }
      
      setError(null);
      const receiptsData = await receiptService.getReceipts(forceRefresh);
      
      const receiptsArray = Object.values(receiptsData).map((receipt: any) => ({
        id: receipt.id,
        orderId: receipt.orderId,
        tableId: receipt.tableId,
        tableName: receipt.tableName || 'Unknown Table',
        customerName: receipt.customerName || 'Walk-in Customer',
        amount: receipt.amount || 0,
        createdAt: receipt.createdAt,
        paymentMethod: receipt.paymentMethod || 'Cash',
        isVoid: receipt.isVoid || false
      }));

      setReceipts(receiptsArray);
      setHasMore(receiptService.getPaginationInfo().hasMore);
      
    } catch (err) {
      console.error('Error loading receipts:', err);
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [receiptService]);

  // Load more receipts for pagination
  const loadMoreReceipts = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const moreReceipts = await receiptService.loadMoreReceipts();
      
      if (Object.keys(moreReceipts).length > 0) {
        const newReceipts = Object.values(moreReceipts).map((receipt: any) => ({
          id: receipt.id,
          orderId: receipt.orderId,
          tableId: receipt.tableId,
          tableName: receipt.tableName || 'Unknown Table',
          customerName: receipt.customerName || 'Walk-in Customer',
          amount: receipt.amount || 0,
          createdAt: receipt.createdAt,
          paymentMethod: receipt.paymentMethod || 'Cash',
          isVoid: receipt.isVoid || false
        }));

        setReceipts(prev => [...prev, ...newReceipts]);
        setHasMore(receiptService.getPaginationInfo().hasMore);
      }
    } catch (err) {
      console.error('Error loading more receipts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [receiptService, loadingMore, hasMore]);

  // Handle receipt press
  const handleReceiptPress = useCallback((receipt: ReceiptData) => {
    if (onReceiptPress) {
      onReceiptPress(receipt);
    } else {
      navigation.navigate('ReceiptDetail', { orderId: receipt.orderId });
    }
  }, [navigation, onReceiptPress]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadReceipts(true);
  }, [loadReceipts]);

  // Initial load
  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Render receipt item
  const renderReceiptItem = useCallback(({ item }: { item: ReceiptData }) => (
    <TouchableOpacity
      style={[styles.receiptItem, item.isVoid && styles.voidReceiptItem]}
      onPress={() => handleReceiptPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.receiptHeader}>
        <View style={styles.receiptInfo}>
          <Text style={styles.tableName} numberOfLines={1}>
            {item.tableName}
          </Text>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName}
          </Text>
        </View>
        <View style={styles.receiptAmount}>
          <Text style={[styles.amount, item.isVoid && styles.voidAmount]}>
            Rs {item.amount.toFixed(2)}
          </Text>
          <Text style={styles.paymentMethod}>
            {item.paymentMethod}
          </Text>
        </View>
      </View>
      
      <View style={styles.receiptFooter}>
        <Text style={styles.createdAt}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        {item.isVoid && (
          <View style={styles.voidBadge}>
            <Text style={styles.voidText}>VOID</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [handleReceiptPress]);

  // Render loading footer
  const renderLoadingFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading more receipts...</Text>
      </View>
    );
  }, [loadingMore]);

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="receipt" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Receipts Found</Text>
      <Text style={styles.emptySubtitle}>
        Receipts will appear here once orders are completed
      </Text>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading receipts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#ff4444" />
        <Text style={styles.errorTitle}>Error Loading Receipts</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadReceipts(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={receipts}
      renderItem={renderReceiptItem}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#FF6B35']}
          tintColor="#FF6B35"
        />
      }
      onEndReached={loadMoreReceipts}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderLoadingFooter}
      ListEmptyComponent={renderEmptyState}
      showsVerticalScrollIndicator={true}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={20}
      getItemLayout={(data, index) => ({
        length: 80,
        offset: 80 * index,
        index,
      })}
      style={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  receiptItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  voidReceiptItem: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptInfo: {
    flex: 1,
    marginRight: 10,
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  receiptAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  voidAmount: {
    color: '#d32f2f',
    textDecorationLine: 'line-through',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createdAt: {
    fontSize: 12,
    color: '#999',
  },
  voidBadge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voidText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default OptimizedReceiptList;

