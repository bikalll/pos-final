import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../redux/storeFirebase';
import { getFirebaseService, initializeFirebaseService } from '../services/firebaseService';
import { createFirestoreService } from '../services/firestoreService';
import { cleanOrderData } from '../utils/orderUtils';
import { updateTableFromFirebase } from '../redux/slices/tablesSliceFirebase';

export const firebaseMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Get current state after action
  const state = store.getState();
  const { restaurantId } = state.auth;
  
  // Only proceed if we have a restaurant ID
  if (!restaurantId) {
    console.log('🔥 Firebase middleware: No restaurantId, skipping Firebase save');
    return result;
  }
  
  // Ensure Firestore service is usable (no-op if already initialized elsewhere)
  
  // Handle order-related actions
  switch (action.type) {
    // Only persist to Firebase on explicit save/complete actions; all others remain local-only
    case 'orders/markOrderSaved':
    case 'orders/completeOrder': {
      // Get the order ID from the action payload
      const orderId = action.payload?.orderId || action.payload?.id;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        
        if (order) {
          // Clean the order data before saving to Firebase
          const cleanOrder = cleanOrderData(order);
          
          // Save order to Firebase asynchronously
          setTimeout(async () => {
            try {
              console.log('🔥 Firebase middleware: Attempting to save order to Firebase:', orderId);
              console.log('🔥 Order data:', { 
                id: cleanOrder.id, 
                tableId: cleanOrder.tableId, 
                restaurantId: cleanOrder.restaurantId,
                status: cleanOrder.status,
                itemsCount: cleanOrder.items?.length || 0
              });
              
              // Save to Cloud Firestore (avoid RTDB timeouts)
              const svc = createFirestoreService(restaurantId);
              await svc.saveOrder({ ...cleanOrder, restaurantId });
              console.log('✅ Firebase middleware: Order saved to Firestore successfully:', orderId);
            } catch (error) {
              console.error('❌ Firebase middleware: Error saving order to Firebase:', error);
              console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                orderId,
                restaurantId: cleanOrder.restaurantId
              });
            }
          }, 100); // Small delay to ensure state is updated
        }
      }
      break;
    }
    case 'orders/markOrderUnsaved': {
      // Update Firebase when order is marked as unsaved
      const orderId = action.payload?.orderId;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        
        if (order) {
          // Update Firebase to mark order as unsaved
          setTimeout(async () => {
            try {
              console.log('🔥 Firebase middleware: Marking order as unsaved in Firebase:', orderId);
              
              // Update order in Cloud Firestore to set isSaved: false
              const svc = createFirestoreService(restaurantId);
              await svc.updateOrder(orderId, { isSaved: false });
              console.log('✅ Firebase middleware: Order marked as unsaved in Firestore:', orderId);
            } catch (error) {
              console.error('❌ Firebase middleware: Error marking order as unsaved in Firebase:', error);
            }
          }, 100); // Small delay to ensure state is updated
        }
      }
      break;
    }
    case 'orders/applyItemDiscount':
    case 'orders/removeItemDiscount': {
      // Update Firebase when item discounts are applied/removed
      const orderId = action.payload?.orderId;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        
        if (order) {
          // Update Firebase with the modified order items
          setTimeout(async () => {
            try {
              console.log('🔥 Firebase middleware: Updating item discount in Firebase:', orderId);
              
              // Update order in Cloud Firestore with modified items
              const svc = createFirestoreService(restaurantId);
              await svc.updateOrder(orderId, { 
                items: order.items,
                isSaved: false 
              });
              console.log('✅ Firebase middleware: Item discount updated in Firestore:', orderId);
            } catch (error) {
              console.error('❌ Firebase middleware: Error updating item discount in Firebase:', error);
            }
          }, 100); // Small delay to ensure state is updated
        }
      }
      break;
    }
    
    case 'orders/cancelOrder':
    case 'orders/cancelEmptyOrder': {
      // Handle order deletion
      const orderId = action.payload?.orderId || action.payload;
      
      if (orderId) {
        setTimeout(async () => {
          try {
            const firebaseService = getFirebaseService();
            await firebaseService.delete(`orders/${orderId}`);
            console.log('🔥 Firebase middleware: Order deleted from Firebase:', orderId);
          } catch (error) {
            console.error('❌ Firebase middleware: Error deleting order from Firebase:', error);
          }
        }, 100);
      }
      break;
    }

    // Handle merge operations
    case 'orders/mergeOrders': {
      const { tableIds, mergedTableId, mergedTableName } = action.payload;
      
      // Execute immediately to avoid race conditions with real-time sync
      (async () => {
        try {
          console.log('🔥 Firebase middleware: Handling mergeOrders operation');
          const svc = createFirestoreService(restaurantId);
          
          // Delete original orders from Firestore FIRST to prevent race conditions
          const originalOrderIds = (action as any).originalOrderIds || [];
          console.log('🔍 Deleting original orders from Firestore:', originalOrderIds);
          
          for (const orderId of originalOrderIds) {
            try {
              await svc.deleteOrder(orderId);
              console.log('✅ Firebase middleware: Original order deleted from Firestore:', orderId);
            } catch (error) {
              console.warn('⚠️ Firebase middleware: Could not delete original order:', orderId, error);
            }
          }
          
          // Then save the merged order to Firestore
          const mergedOrder = Object.values(state.orders.ordersById).find((order: any) => 
            order.tableId === mergedTableId && order.isMergedOrder
          ) as any;
          
          if (mergedOrder) {
            console.log('🔍 Firebase middleware: Found merged order in state:', {
              id: mergedOrder.id,
              tableId: mergedOrder.tableId,
              isMergedOrder: mergedOrder.isMergedOrder,
              status: mergedOrder.status,
              itemsCount: mergedOrder.items?.length || 0
            });
            
            // Save the merged order to Firestore
            const cleanMergedOrder = cleanOrderData(mergedOrder);
            const result = await svc.saveOrder({ ...cleanMergedOrder, restaurantId });
            console.log('✅ Firebase middleware: Merged order saved to Firestore:', {
              orderId: mergedOrder.id,
              tableId: mergedTableId,
              result: result
            });
          } else {
            console.log('❌ Firebase middleware: Merged order not found in state for table ID:', mergedTableId);
            console.log('🔍 Available orders in state:', Object.keys(state.orders.ordersById));
            console.log('🔍 Orders with tableId:', Object.values(state.orders.ordersById).filter((o: any) => o.tableId === mergedTableId));
          }
        } catch (error) {
          console.error('❌ Firebase middleware: Error handling mergeOrders:', error);
        }
      })();
      break;
    }

    case 'orders/unmergeOrders': {
      const { mergedTableId, originalTableIds } = action.payload;
      const preservedSavedQuantities = (action as any).preservedSavedQuantities || {};
      
      setTimeout(async () => {
        try {
          console.log('🔥 Firebase middleware: Handling unmergeOrders operation');
          const svc = createFirestoreService(restaurantId);
          
          // Find the merged order to get its actual order ID
          const mergedOrder = Object.values(state.orders.ordersById).find((order: any) => 
            order.tableId === mergedTableId && order.isMergedOrder
          ) as any;
          
          // Delete the merged order from Firestore
          if (mergedOrder) {
            try {
              await svc.deleteOrder(mergedOrder.id);
              console.log('✅ Firebase middleware: Merged order deleted from Firestore:', mergedOrder.id);
            } catch (error) {
              console.warn('⚠️ Firebase middleware: Could not delete merged order:', mergedOrder.id, error);
            }
          } else {
            console.log('⚠️ Firebase middleware: Merged order not found for unmerge:', mergedTableId);
          }
          
          // For fresh start: Clear ALL orders for unmerged tables from Firestore
          // This ensures tables start completely fresh with no previous data
          for (const tableId of originalTableIds) {
            try {
              // Get all orders for this table from Firebase
              const allOrders = await svc.getOngoingOrders();
              const ordersToDelete = Object.values(allOrders).filter((order: any) => 
                order.tableId === tableId
              );
              
              // Delete all orders for this table
              for (const order of ordersToDelete) {
                await svc.deleteOrder(order.id);
                console.log('✅ Firebase middleware: Deleted order from Firestore:', order.id);
              }
              
              console.log('🔄 Firebase middleware: Cleared all orders for unmerged table:', {
                tableId,
                deletedOrderIds: ordersToDelete.map((o: any) => o.id)
              });
            } catch (error) {
              console.warn('⚠️ Firebase middleware: Could not clear orders for table:', tableId, error);
            }
          }

          // Create new orders for each unmerged table with preserved savedQuantities
          console.log('🔄 Firebase middleware: Creating new orders with preserved savedQuantities:', preservedSavedQuantities);
          for (const tableId of originalTableIds) {
            // Import the createOrder action
            const { createOrder } = await import('../redux/slices/ordersSliceFirebase');
            store.dispatch(createOrder(tableId, undefined, preservedSavedQuantities));
            console.log('✅ Firebase middleware: Created new order for table with preserved savedQuantities:', tableId);
          }
        } catch (error) {
          console.error('❌ Firebase middleware: Error handling unmergeOrders:', error);
        }
      }, 100);
      break;
    }

    // Handle table merge operations
    case 'tables/mergeTables': {
      const { tableIds, mergedTableId, mergedName } = action.payload;
      
      setTimeout(async () => {
        try {
          console.log('🔥 Firebase middleware: Handling mergeTables operation');
          const svc = createFirestoreService(restaurantId);
          
          // Get the merged table from state
          const mergedTable = state.tables.tablesById[mergedTableId];
          if (mergedTable) {
            // Save the merged table to Firestore
            await svc.setDocument('tables', mergedTableId, {
              ...mergedTable,
              restaurantId,
              isOccupied: true,
              updatedAt: new Date().toISOString()
            });
            console.log('✅ Firebase middleware: Merged table saved to Firestore:', mergedTableId);
          }
          
          // Update original tables to be merged with mergerId
          for (const tableId of tableIds) {
            try {
              await svc.updateTable(tableId, { 
                isMerged: true,
                mergerId: mergedTable.mergerId,
                isActive: true, 
                isOccupied: false,
                updatedAt: new Date().toISOString()
              });
              console.log('✅ Firebase middleware: Original table updated in Firestore:', tableId);
            } catch (error) {
              console.warn('⚠️ Firebase middleware: Could not update original table:', tableId, error);
            }
          }
        } catch (error) {
          console.error('❌ Firebase middleware: Error handling mergeTables:', error);
        }
      }, 100);
      break;
    }

    case 'tables/unmergeTables': {
      const { mergedTableId } = action.payload;
      
      // Execute immediately to avoid race conditions
      (async () => {
        try {
          console.log('🔥 Firebase middleware: Handling unmergeTables operation');
          const svc = createFirestoreService(restaurantId);
          
          // Reactivate original tables FIRST
          const mergedTable = state.tables.tablesById[mergedTableId];
          if (mergedTable?.mergedTables) {
            console.log('🔄 Firebase middleware: Reactivating original tables:', mergedTable.mergedTables);
            for (const tableId of mergedTable.mergedTables) {
              try {
                console.log('🔄 Firebase middleware: Updating table in Firestore:', {
                  tableId,
                  updates: { 
                    isActive: true,
                    isOccupied: false,
                    updatedAt: new Date().toISOString()
                  }
                });
                
                // Update table in Firebase with complete fresh state reset
                const updateData = { 
                  // Reset all merge-related properties
                  isMerged: false,
                  mergerId: null,
                  mergedTables: null,
                  mergedTableNames: null,
                  totalSeats: null,
                  
                  // Reset to fresh available state
                  isActive: true,
                  isOccupied: false,
                  
                  // Clear any reservation data
                  isReserved: false,
                  reservedAt: null,
                  reservedUntil: null,
                  reservedBy: null,
                  reservedNote: null,
                  
                  updatedAt: new Date().toISOString()
                };
                
                await svc.updateTable(tableId, updateData);
                
                // Immediately update Redux state to ensure tables become active
                const currentTable = state.tables.tablesById[tableId];
                if (currentTable) {
                  store.dispatch(updateTableFromFirebase({
                    ...currentTable,
                    // Reset all merge-related properties
                    isMerged: false,
                    mergerId: undefined,
                    mergedTables: undefined,
                    mergedTableNames: undefined,
                    totalSeats: undefined,
                    
                    // Reset to fresh available state
                    isActive: true,
                    isOccupied: false,
                    
                    // Clear any reservation data
                    isReserved: false,
                    reservedAt: undefined,
                    reservedUntil: undefined,
                    reservedBy: undefined,
                    reservedNote: undefined
                  }));
                }
                
                // Verify the update by reading the table back from Firebase
                const allTables = await svc.getTables();
                const updatedTable = allTables[tableId];
                
                // If the update didn't work, try again
                if (updatedTable?.isActive !== true) {
                  await svc.updateTable(tableId, { 
                    isActive: true,
                    updatedAt: new Date().toISOString()
                  });
                  
                  // Verify again
                  const allTablesRetry = await svc.getTables();
                  const retryTable = allTablesRetry[tableId];
                  console.log('🔍 Firebase middleware: Retry verification:', {
                    tableId,
                    isActive: retryTable?.isActive,
                    retrySuccessful: retryTable?.isActive === true
                  });
                }
              } catch (error) {
                console.warn('⚠️ Firebase middleware: Could not reactivate original table:', tableId, error);
              }
            }
          }
          
          // Then delete the merged table from Firestore
          try {
            await svc.deleteTable(mergedTableId);
            console.log('✅ Firebase middleware: Merged table deleted from Firestore:', mergedTableId);
          } catch (error) {
            console.warn('⚠️ Firebase middleware: Could not delete merged table:', mergedTableId, error);
          }
          
          // Final verification: Check all original tables are active in Firebase
          if (mergedTable?.mergedTables) {
            console.log('🔍 Firebase middleware: Final verification of unmerged tables...');
            for (const tableId of mergedTable.mergedTables) {
              try {
                const allTablesFinal = await svc.getTables();
                const finalTable = allTablesFinal[tableId];
                console.log('🔍 Firebase middleware: Final table status:', {
                  tableId,
                  isActive: finalTable?.isActive,
                  isOccupied: finalTable?.isOccupied,
                  isActiveCorrect: finalTable?.isActive === true
                });
              } catch (error) {
                console.warn('⚠️ Firebase middleware: Could not verify final table status:', tableId, error);
              }
            }
          }
        } catch (error) {
          console.error('❌ Firebase middleware: Error handling unmergeTables:', error);
        }
      })();
      break;
    }
    
    case 'tables/refreshFromFirebase': {
      // Force reload tables from Firebase
      (async () => {
        try {
          console.log('🔥 Firebase middleware: Handling refreshFromFirebase operation');
          const svc = createFirestoreService(restaurantId);
          
          // Get all tables from Firebase
          const tablesData = await svc.getTables();
          console.log('🔄 Firebase middleware: Reloaded tables from Firebase:', Object.keys(tablesData));
          
          // Dispatch update for each table to ensure Redux state is updated
          Object.values(tablesData).forEach((table: any) => {
            store.dispatch(updateTableFromFirebase(table));
          });
          
          console.log('✅ Firebase middleware: Tables refreshed from Firebase');
        } catch (error) {
          console.error('❌ Firebase middleware: Error refreshing tables from Firebase:', error);
        }
      })();
      break;
    }
  }
  
  return result;
};
