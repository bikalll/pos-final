import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../redux/storeFirebase';
import { getBackgroundProcessingService } from '../services/BackgroundProcessingService';
import { getDebouncingService } from '../services/DebouncingService';
import { getRequestDeduplicationService } from '../services/RequestDeduplicationService';
import { getOptimizedFirebaseService } from '../services/OptimizedFirebaseService';
import { getErrorHandlingService } from '../services/ErrorHandlingService';
import { cleanOrderData, removeUndefinedValues } from '../utils/orderUtils';
import { updateTableFromFirebase } from '../redux/slices/tablesSliceFirebase';

// Initialize services
const backgroundService = getBackgroundProcessingService();
const debouncingService = getDebouncingService();
const deduplicationService = getRequestDeduplicationService();
const optimizedFirebaseService = getOptimizedFirebaseService();
const errorHandlingService = getErrorHandlingService();

// Debounced functions for different operations
const debouncedOrderSave = debouncingService.debounce(
  'order-save',
  async (orderId: string, restaurantId: string, order: any) => {
    try {
      console.log('🔄 OptimizedMiddleware: Processing debounced order save:', orderId);
      
      // Use deduplication for Firebase operations
      await deduplicationService.deduplicateFirebaseOperation(
        'saveOrder',
        { orderId, restaurantId },
        async () => {
          const { createFirestoreService } = await import('../services/firestoreService');
          const svc = createFirestoreService(restaurantId);
          const cleanOrder = cleanOrderData(order);
          return svc.saveOrder({ ...cleanOrder, restaurantId });
        },
        { ttl: 10000, maxAge: 5000 }
      );
      
      console.log('✅ OptimizedMiddleware: Order saved successfully:', orderId);
    } catch (error) {
      console.error('❌ OptimizedMiddleware: Order save failed:', error);
      await errorHandlingService.handleError(error as Error, {
        operation: 'saveOrder',
        restaurantId,
        timestamp: Date.now(),
        metadata: { orderId }
      });
    }
  },
  { delay: 500, maxDelay: 2000 }
);

const debouncedInventoryUpdate = debouncingService.debounce(
  'inventory-update',
  async (orderId: string, restaurantId: string, deltas: any[]) => {
    try {
      console.log('🔄 OptimizedMiddleware: Processing debounced inventory update:', orderId);
      
      // Move heavy inventory calculations to background processing
      backgroundService.addInventoryCalculationTask(orderId, restaurantId, deltas);
      
      console.log('✅ OptimizedMiddleware: Inventory update queued:', orderId);
    } catch (error) {
      console.error('❌ OptimizedMiddleware: Inventory update failed:', error);
      await errorHandlingService.handleError(error as Error, {
        operation: 'inventoryUpdate',
        restaurantId,
        timestamp: Date.now(),
        metadata: { orderId }
      });
    }
  },
  { delay: 300, maxDelay: 1500 }
);

const debouncedReceiptSave = debouncingService.debounce(
  'receipt-save',
  async (order: any, restaurantId: string) => {
    try {
      console.log('🔄 OptimizedMiddleware: Processing debounced receipt save:', order.id);
      
      // Move receipt processing to background
      backgroundService.addReceiptProcessingTask(order, restaurantId);
      
      console.log('✅ OptimizedMiddleware: Receipt save queued:', order.id);
    } catch (error) {
      console.error('❌ OptimizedMiddleware: Receipt save failed:', error);
      await errorHandlingService.handleError(error as Error, {
        operation: 'receiptSave',
        restaurantId,
        timestamp: Date.now(),
        metadata: { orderId: order.id }
      });
    }
  },
  { delay: 200, maxDelay: 1000 }
);

export const optimizedFirebaseMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Get current state after action
  const state = store.getState();
  const authRestaurantId = state?.auth?.restaurantId;
  
  // Handle order-related actions
  switch (action.type) {
    case 'orders/markOrderSaved': {
      const orderId = action.payload?.orderId || action.payload?.id;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        
        if (order) {
          const restaurantId = authRestaurantId || (order as any).restaurantId;
          if (!restaurantId) {
            console.warn('⚠️ OptimizedMiddleware: Missing restaurantId for save, skipping.');
            return result;
          }
          
          // Use debounced order save
          debouncedOrderSave(orderId, restaurantId, order);
          
          // Calculate inventory deltas for background processing
          setTimeout(async () => {
            try {
              const currentState = store.getState();
              const menuItems: Record<string, any> = currentState.menu.itemsById || {};
              const inventory: Record<string, any> = currentState.inventory.itemsById || {};
              
              const latestOrder = currentState?.orders?.ordersById?.[orderId] || order;
              let savedSnapshot: Record<string, number> = (latestOrder as any).savedQuantities || {};
              
              // Load remote savedQuantities as authoritative baseline
              try {
                const { createFirestoreService } = await import('../services/firestoreService');
                const svcForReads = createFirestoreService(restaurantId);
                const remoteOrder = await (svcForReads as any).read?.('orders', orderId);
                if (remoteOrder && typeof remoteOrder === 'object' && remoteOrder.savedQuantities && Object.keys(remoteOrder.savedQuantities).length > 0) {
                  savedSnapshot = remoteOrder.savedQuantities as Record<string, number>;
                }
              } catch {}
              
              const deltas: Array<{ name: string; requiredQty: number; unit?: string }> = [];
              
              for (const orderItem of (latestOrder?.items || [])) {
                const prevQty = savedSnapshot[orderItem.menuItemId] ?? 0;
                const deltaQty = Math.max(0, (orderItem.quantity || 0) - prevQty);
                
                if (deltaQty <= 0) continue;
                
                let menu = menuItems[orderItem.menuItemId];
                let ingredients: Array<{ name: string; quantity: number; unit: string }> = Array.isArray(menu?.ingredients) ? menu.ingredients : [];
                
                if (!ingredients || ingredients.length === 0) {
                  try {
                    const { createFirestoreService } = await import('../services/firestoreService');
                    const svcForReads = createFirestoreService(restaurantId);
                    const remote = await (svcForReads as any).read?.('menu', orderItem.menuItemId);
                    if (remote && Array.isArray(remote.ingredients)) {
                      ingredients = remote.ingredients as any;
                    }
                  } catch {}
                }
                
                for (const ing of ingredients) {
                  const required = (Number(ing.quantity) || 0) * deltaQty;
                  if (required > 0 && ing.name) {
                    deltas.push({ name: ing.name, requiredQty: required, unit: ing.unit });
                  }
                }
              }
              
              if (deltas.length > 0) {
                // Use debounced inventory update
                debouncedInventoryUpdate(orderId, restaurantId, deltas);
              }
              
              // Update saved quantities snapshot
              try {
                const { snapshotSavedQuantities } = await import('../redux/slices/ordersSliceFirebase');
                store.dispatch(snapshotSavedQuantities({ orderId }));
                
                // Persist savedQuantities to Firestore
                const latestState = store.getState();
                const latestOrder = latestState?.orders?.ordersById?.[orderId];
                const latestSaved = (latestOrder as any)?.savedQuantities || {};
                
                await deduplicationService.deduplicateFirebaseOperation(
                  'updateOrder',
                  { orderId, restaurantId },
                  async () => {
                    const { createFirestoreService } = await import('../services/firestoreService');
                    const svcPersist = createFirestoreService(restaurantId);
                    return svcPersist.updateOrder(orderId, { savedQuantities: latestSaved });
                  },
                  { ttl: 5000 }
                );
              } catch {}
            } catch (error) {
              console.warn('⚠️ OptimizedMiddleware: Inventory calculation skipped:', (error as Error).message);
              await errorHandlingService.handleError(error as Error, {
                operation: 'inventoryCalculation',
                restaurantId,
                timestamp: Date.now(),
                metadata: { orderId }
              });
            }
          }, 100);
        }
      }
      break;
    }
    
    case 'orders/completeOrder': {
      const orderId = action.payload?.orderId || action.payload?.id;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        if (order) {
          const restaurantId = authRestaurantId || (order as any).restaurantId;
          if (!restaurantId) {
            console.warn('⚠️ OptimizedMiddleware: Missing restaurantId for complete, skipping.');
            return result;
          }
          
          // Use optimized Firebase service for order completion
          setTimeout(async () => {
            try {
              await deduplicationService.deduplicateFirebaseOperation(
                'completeOrder',
                { orderId, restaurantId },
                async () => {
                  const { createFirestoreService } = await import('../services/firestoreService');
                  const svc = createFirestoreService(restaurantId);
                  const cleanOrder = cleanOrderData(order);
                  return svc.completeOrderMove({ ...cleanOrder, restaurantId });
                },
                { ttl: 10000 }
              );
              
              console.log('✅ OptimizedMiddleware: Order completed successfully:', orderId);
            } catch (error) {
              console.error('❌ OptimizedMiddleware: Order completion failed:', error);
              await errorHandlingService.handleError(error as Error, {
                operation: 'completeOrder',
                restaurantId,
                timestamp: Date.now(),
                metadata: { orderId }
              });
            }
          }, 100);
        }
      }
      break;
    }
    
    case 'orders/markOrderUnsaved': {
      const orderId = action.payload?.orderId;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        
        if (order) {
          setTimeout(async () => {
            try {
              await deduplicationService.deduplicateFirebaseOperation(
                'updateOrder',
                { orderId, restaurantId: authRestaurantId },
                async () => {
                  const { createFirestoreService } = await import('../services/firestoreService');
                  const svc = createFirestoreService(authRestaurantId || (order as any)?.restaurantId);
                  return svc.updateOrder(orderId, { isSaved: false });
                },
                { ttl: 5000 }
              );
              
              console.log('✅ OptimizedMiddleware: Order marked as unsaved:', orderId);
            } catch (error) {
              console.error('❌ OptimizedMiddleware: Error marking order as unsaved:', error);
              await errorHandlingService.handleError(error as Error, {
                operation: 'markOrderUnsaved',
                restaurantId: authRestaurantId,
                timestamp: Date.now(),
                metadata: { orderId }
              });
            }
          }, 100);
        }
      }
      break;
    }
    
    case 'orders/applyItemDiscount':
    case 'orders/removeItemDiscount': {
      const orderId = action.payload?.orderId;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        
        if (order) {
          setTimeout(async () => {
            try {
              await deduplicationService.deduplicateFirebaseOperation(
                'updateOrder',
                { orderId, restaurantId: authRestaurantId },
                async () => {
                  const { createFirestoreService } = await import('../services/firestoreService');
                  const svc = createFirestoreService(authRestaurantId || (order as any)?.restaurantId);
                  const cleanedItems = removeUndefinedValues(order.items);
                  return svc.updateOrder(orderId, { 
                    items: cleanedItems,
                    isSaved: false 
                  });
                },
                { ttl: 5000 }
              );
              
              console.log('✅ OptimizedMiddleware: Item discount updated:', orderId);
            } catch (error) {
              console.error('❌ OptimizedMiddleware: Error updating item discount:', error);
              await errorHandlingService.handleError(error as Error, {
                operation: 'updateItemDiscount',
                restaurantId: authRestaurantId,
                timestamp: Date.now(),
                metadata: { orderId }
              });
            }
          }, 100);
        }
      }
      break;
    }
    
    case 'orders/cancelOrder':
    case 'orders/cancelEmptyOrder': {
      const orderId = action.payload?.orderId || action.payload;
      
      if (orderId) {
        setTimeout(async () => {
          try {
            await deduplicationService.deduplicateFirebaseOperation(
              'deleteOrder',
              { orderId, restaurantId: authRestaurantId },
              async () => {
                const { createFirestoreService } = await import('../services/firestoreService');
                const svc = createFirestoreService(authRestaurantId);
                return svc.deleteOrder(orderId);
              },
              { ttl: 10000 }
            );
            
            console.log('✅ OptimizedMiddleware: Order deleted successfully:', orderId);
          } catch (error) {
            console.error('❌ OptimizedMiddleware: Error deleting order:', error);
            await errorHandlingService.handleError(error as Error, {
              operation: 'deleteOrder',
              restaurantId: authRestaurantId,
              timestamp: Date.now(),
              metadata: { orderId }
            });
          }
        }, 100);
      }
      break;
    }
    
    
  }
  
  return result;
};

// Enhanced receipt middleware with debouncing
export const optimizedReceiptMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);
  
  if (action.type === 'orders/completeOrder') {
    const state = store.getState();
    const orderId = action.payload.orderId;
    const order = state.orders.ordersById[orderId];
    const restaurantId = state.auth.restaurantId;
    
    if (order && restaurantId) {
      // Use debounced receipt save
      debouncedReceiptSave(order, restaurantId);
    }
  }
  
  return result;
};
