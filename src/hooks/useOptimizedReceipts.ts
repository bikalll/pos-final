import { useState, useEffect, useCallback, useMemo } from 'react';
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

interface UseOptimizedReceiptsReturn {
  receipts: ReceiptData[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadReceipts: (forceRefresh?: boolean) => Promise<void>;
  loadMoreReceipts: () => Promise<void>;
  refreshReceipts: () => Promise<void>;
  clearCache: () => Promise<void>;
  getReceiptById: (receiptId: string) => Promise<ReceiptData | null>;
}

export const useOptimizedReceipts = (restaurantId: string): UseOptimizedReceiptsReturn => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate restaurantId
  const isValidRestaurantId = restaurantId && typeof restaurantId === 'string' && restaurantId.trim().length > 0;

  // Memoize service to prevent recreation (only if valid restaurantId)
  const receiptService = useMemo(() => {
    if (!isValidRestaurantId) {
      console.warn('⚠️ useOptimizedReceipts: Invalid restaurantId:', restaurantId);
      return null;
    }
    return createOptimizedReceiptService(restaurantId);
  }, [restaurantId, isValidRestaurantId]);

  // Transform raw receipt data to ReceiptData format
  const transformReceiptData = useCallback((rawReceipts: Record<string, any>): ReceiptData[] => {
    return Object.values(rawReceipts).map((receipt: any) => ({
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
  }, []);

  // Load receipts with error handling
  const loadReceipts = useCallback(async (forceRefresh: boolean = false) => {
    try {
      console.log('🔄 useOptimizedReceipts: Starting loadReceipts', { forceRefresh, restaurantId, isValidRestaurantId });
      
      // Check if we have a valid service
      if (!receiptService || !isValidRestaurantId) {
        console.warn('⚠️ useOptimizedReceipts: No valid service or restaurantId, skipping load');
        setError('Invalid restaurant ID');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      if (forceRefresh) {
        setRefreshing(true);
        await receiptService.clearCache();
      } else {
        setLoading(true);
      }
      
      setError(null);
      console.log('🔄 useOptimizedReceipts: Calling receiptService.getReceipts...');
      const receiptsData = await receiptService.getReceipts(forceRefresh);
      console.log('🔄 useOptimizedReceipts: Got receipts data:', {
        count: Object.keys(receiptsData).length,
        keys: Object.keys(receiptsData).slice(0, 5)
      });
      
      const transformedReceipts = transformReceiptData(receiptsData);
      console.log('🔄 useOptimizedReceipts: Transformed receipts:', {
        count: transformedReceipts.length,
        firstReceipt: transformedReceipts[0]
      });
      
      setReceipts(transformedReceipts);
      setHasMore(receiptService.getPaginationInfo().hasMore);
      
    } catch (err) {
      console.error('❌ useOptimizedReceipts: Error loading receipts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load receipts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [receiptService, transformReceiptData, restaurantId, isValidRestaurantId]);

  // Load more receipts for pagination (lazy loading)
  const loadMoreReceipts = useCallback(async () => {
    if (loadingMore || !hasMore || !receiptService) {
      console.log('🔄 loadMoreReceipts: Skipping - loadingMore:', loadingMore, 'hasMore:', hasMore, 'service:', !!receiptService);
      return;
    }

    try {
      console.log('🔄 loadMoreReceipts: Loading more receipts...');
      setLoadingMore(true);
      const moreReceipts = await receiptService.loadMoreReceipts();
      
      console.log('🔄 loadMoreReceipts: Got more receipts:', Object.keys(moreReceipts).length);
      
      if (Object.keys(moreReceipts).length > 0) {
        const newReceipts = transformReceiptData(moreReceipts);
        console.log('🔄 loadMoreReceipts: Adding', newReceipts.length, 'new receipts');
        setReceipts(prev => {
          const combined = [...prev, ...newReceipts];
          console.log('🔄 loadMoreReceipts: Total receipts now:', combined.length);
          return combined;
        });
        setHasMore(receiptService.getPaginationInfo().hasMore);
      } else {
        console.log('🔄 loadMoreReceipts: No more receipts to load');
        setHasMore(false);
      }
    } catch (err) {
      console.error('❌ loadMoreReceipts: Error loading more receipts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more receipts');
    } finally {
      setLoadingMore(false);
    }
  }, [receiptService, transformReceiptData, loadingMore, hasMore]);

  // Refresh receipts
  const refreshReceipts = useCallback(async () => {
    await loadReceipts(true);
  }, [loadReceipts]);

  // Clear cache
  const clearCache = useCallback(async () => {
    if (!receiptService) return;
    
    try {
      await receiptService.clearCache();
      setReceipts([]);
      setHasMore(true);
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }, [receiptService]);

  // Get receipt by ID
  const getReceiptById = useCallback(async (receiptId: string): Promise<ReceiptData | null> => {
    if (!receiptService) return null;
    
    try {
      const rawReceipt = await receiptService.getReceiptById(receiptId);
      if (rawReceipt) {
        return transformReceiptData({ [rawReceipt.id]: rawReceipt })[0];
      }
      return null;
    } catch (err) {
      console.error('Error getting receipt by ID:', err);
      return null;
    }
  }, [receiptService, transformReceiptData]);

  // Initial load
  useEffect(() => {
    if (isValidRestaurantId) {
      loadReceipts();
    } else {
      console.warn('⚠️ useOptimizedReceipts: Skipping initial load due to invalid restaurantId:', restaurantId);
      setLoading(false);
    }
  }, [isValidRestaurantId, loadReceipts, restaurantId]);

  return {
    receipts,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    loadReceipts,
    loadMoreReceipts,
    refreshReceipts,
    clearCache,
    getReceiptById
  };
};
