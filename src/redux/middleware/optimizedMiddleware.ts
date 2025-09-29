import { Middleware } from '@reduxjs/toolkit';
import { optimizedFirebaseMiddleware } from '../../middleware/optimizedFirebaseMiddleware';
import { useBatchReduxUpdates } from '../../utils/batchReduxUpdates';
import performanceMonitor from '../../services/performanceMonitor';

// Performance-optimized Redux middleware
export const optimizedReduxMiddleware: Middleware = (store) => (next) => (action) => {
  const startTime = performance.now();
  
  try {
    // Process action
    const result = next(action);
    
    // Record performance
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    performanceMonitor.recordRenderTime(processingTime);
    
    // Check performance thresholds
    performanceMonitor.checkPerformanceThresholds();
    
    return result;
  } catch (error) {
    performanceMonitor.recordError();
    console.error('❌ Redux middleware error:', error);
    throw error;
  }
};

// Batch update middleware
export const batchUpdateMiddleware: Middleware = (store) => (next) => (action) => {
  // Check if this is a batch update action
  if (action.type === 'BATCH_UPDATE') {
    const { actions } = action.payload;
    
    // Process all actions in the batch
    actions.forEach((batchAction: any) => {
      store.dispatch(batchAction);
    });
    
    return;
  }
  
  return next(action);
};

// Memory cleanup middleware
export const memoryCleanupMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Cleanup old data periodically
  if (action.type === 'CLEANUP_OLD_DATA') {
    const state = store.getState();
    
    // Cleanup old orders (older than 7 days)
    if (state.orders?.ordersById) {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const oldOrderIds = Object.keys(state.orders.ordersById).filter(id => {
        const order = state.orders.ordersById[id];
        return order.createdAt && order.createdAt < sevenDaysAgo;
      });
      
      if (oldOrderIds.length > 0) {
        store.dispatch({
          type: 'orders/cleanupOldOrders',
          payload: oldOrderIds
        });
      }
    }
    
    // Cleanup old receipts (older than 30 days)
    if (state.receipts?.receiptsById) {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const oldReceiptIds = Object.keys(state.receipts.receiptsById).filter(id => {
        const receipt = state.receipts.receiptsById[id];
        return receipt.createdAt && receipt.createdAt < thirtyDaysAgo;
      });
      
      if (oldReceiptIds.length > 0) {
        store.dispatch({
          type: 'receipts/cleanupOldReceipts',
          payload: oldReceiptIds
        });
      }
    }
  }
  
  return result;
};

// Listener management middleware
export const listenerManagementMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Track listener count
  if (action.type === 'LISTENERS_ADDED') {
    performanceMonitor.updateListenerCount(action.payload.count);
  }
  
  if (action.type === 'LISTENERS_REMOVED') {
    performanceMonitor.updateListenerCount(action.payload.count);
  }
  
  return result;
};

// Combined optimized middleware
export const createOptimizedMiddleware = () => [
  optimizedReduxMiddleware,
  batchUpdateMiddleware,
  memoryCleanupMiddleware,
  listenerManagementMiddleware,
  optimizedFirebaseMiddleware
];
