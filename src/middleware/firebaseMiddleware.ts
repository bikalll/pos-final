import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../redux/storeFirebase';
import { getFirebaseService, initializeFirebaseService } from '../services/firebaseService';
import { createFirestoreService } from '../services/firestoreService';
import { InventoryItem } from '../utils/types';

// Simple debounce tracker to prevent rapid repeat saves and potential render loops
const recentSaves = new Map<string, number>();
// Idempotency: prevent duplicate deductions for identical item quantities
const lastDeductFingerprint = new Map<string, string>();
import { cleanOrderData, removeUndefinedValues } from '../utils/orderUtils';
import { updateTableFromFirebase } from '../redux/slices/tablesSliceFirebase';

export const firebaseMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Get current state after action
  const state = store.getState();
  const authRestaurantId = state?.auth?.restaurantId;
  
  // Ensure Firestore service is usable (no-op if already initialized elsewhere)
  
  // Handle order-related actions
  switch (action.type) {
    // Only persist to Firebase on explicit save/complete actions; all others remain local-only
    case 'orders/markOrderSaved': {
      // Only deduct inventory on save, not on complete
      const orderId = action.payload?.orderId || action.payload?.id;
      
      if (orderId) {
        // Disable debounce to ensure inventory deduction always runs on save
        recentSaves.set(orderId, Date.now());
        const order = state.orders.ordersById[orderId];
        
        if (order) {
          const restaurantId = authRestaurantId || (order as any).restaurantId;
          if (!restaurantId) {
            console.warn('⚠️ Firebase middleware: Missing restaurantId for save, skipping.');
            return result;
          }
          const cleanOrder = cleanOrderData(order);
          
          setTimeout(async () => {
            try {
              console.log('🔥 Firebase middleware: Attempting to save order to Firebase:', orderId);
              const svc = createFirestoreService(restaurantId);
              await svc.saveOrder({ ...cleanOrder, restaurantId });
              console.log('✅ Firebase middleware: Order saved to Firestore successfully:', orderId);

              // After saving order, deduct inventory based on menu item ingredients and item deltas
              try {
                // Re-fetch latest state at execution time to avoid using stale snapshots
                const currentState = store.getState();
                const menuItems: Record<string, any> = currentState.menu.itemsById || {};
                const inventory: Record<string, InventoryItem> = currentState.inventory.itemsById || {};
                const firestoreMenuCache: Record<string, any> = {};
                const firestoreInventoryCache: Record<string, any> = {};
                const svcForReads = createFirestoreService(restaurantId);

                const normalizeUnit = (u?: string) => {
                  const raw = String(u || '').trim().toLowerCase();
                  if (!raw) return '';
                  if (['g', 'gm', 'gms', 'gram', 'grams'].includes(raw)) return 'g';
                  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(raw)) return 'kg';
                  if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(raw)) return 'ml';
                  if (['l', 'lt', 'liter', 'liters', 'litre', 'litres'].includes(raw)) return 'l';
                  if (['pc', 'pcs', 'piece', 'pieces', 'unit', 'units'].includes(raw)) return 'pcs';
                  return raw;
                };
                const convertQty = (qty: number, fromUnit?: string, toUnit?: string): number => {
                  const f = normalizeUnit(fromUnit);
                  const t = normalizeUnit(toUnit);
                  if (!f || !t || f === t) return qty;
                  if (f === 'g' && t === 'kg') return qty / 1000;
                  if (f === 'kg' && t === 'g') return qty * 1000;
                  if (f === 'ml' && t === 'l') return qty / 1000;
                  if (f === 'l' && t === 'ml') return qty * 1000;
                  return qty;
                };

                // Determine delta quantities since last save to avoid double-deduction, using latest order
                const latestOrder = currentState?.orders?.ordersById?.[orderId] || order;
                // Load remote savedQuantities as authoritative baseline if available
                let savedSnapshot: Record<string, number> = (latestOrder as any).savedQuantities || {};
                try {
                  const remoteOrder = await (svcForReads as any).read?.('orders', orderId);
                  if (remoteOrder && typeof remoteOrder === 'object' && remoteOrder.savedQuantities && Object.keys(remoteOrder.savedQuantities).length > 0) {
                    savedSnapshot = remoteOrder.savedQuantities as Record<string, number>;
                  }
                } catch {}
                const deltas: Array<{ name: string; requiredQty: number; unit?: string }>= [];

                for (const orderItem of (latestOrder?.items || [])) {
                 const prevQty = savedSnapshot[orderItem.menuItemId] ?? 0;
                 const deltaQty = Math.max(0, (orderItem.quantity || 0) - prevQty);
                 console.log('🔍 Delta calculation:', {
                   menuItemId: orderItem.menuItemId,
                   currentQty: orderItem.quantity,
                   prevQty,
                   deltaQty
                 });
                 if (deltaQty <= 0) continue;

                 let menu = menuItems[orderItem.menuItemId];
                 let ingredients: Array<{ name: string; quantity: number; unit: string }> = Array.isArray(menu?.ingredients) ? menu.ingredients : [];
                 if (!ingredients || ingredients.length === 0) {
                   try {
                     if (!firestoreMenuCache[orderItem.menuItemId]) {
                       firestoreMenuCache[orderItem.menuItemId] = await (svcForReads as any).read?.('menu', orderItem.menuItemId);
                     }
                     const remote = firestoreMenuCache[orderItem.menuItemId];
                     if (remote && Array.isArray(remote.ingredients)) {
                       ingredients = remote.ingredients as any;
                     }
                   } catch {}
                 }
                 for (const ing of ingredients) {
                   const required = (Number(ing.quantity) || 0) * deltaQty;
                   console.log('🔍 Ingredient calculation:', {
                     name: ing.name,
                     ingQty: ing.quantity,
                     deltaQty,
                     required,
                     unit: ing.unit
                   });
                   if (required > 0 && ing.name) {
                     deltas.push({ name: ing.name, requiredQty: required, unit: ing.unit });
                   }
                 }
                }

                if (deltas.length > 0) {
                  // Build a fingerprint of deltas to avoid duplicate deduction
                  const fp = JSON.stringify(deltas.map(d => ({ n: d.name.trim().toLowerCase(), q: Math.round(d.requiredQty * 10000) / 10000, u: (d.unit || '').toLowerCase() })).sort((a,b)=>a.n.localeCompare(b.n)));
                  const fpKey = `${orderId}`;
                  if (lastDeductFingerprint.get(fpKey) === fp) {
                    console.log('ℹ️ Skipping duplicate deduction for identical delta fingerprint');
                    return;
                  }
                  lastDeductFingerprint.set(fpKey, fp);
                  // Resolve inventory by NAME using Firestore as the source of truth for doc IDs
                  const nameToInvMeta: Record<string, { id: string; unit?: string; stock: number }> = {};
                  const uniqueNames = Array.from(new Set(deltas.map(d => d.name.trim().toLowerCase())));

                  // Load all inventory once from Firestore, prefer this for correct doc IDs
                  let allInv: Record<string, any> | undefined;
                  try {
                    allInv = await (svcForReads as any).getInventoryItems?.();
                  } catch {}
                  const byLowerNameFSData: Record<string, any> = {};
                  const byLowerNameFSDocId: Record<string, string> = {};
                  if (allInv && typeof allInv === 'object') {
                    Object.entries(allInv as Record<string, any>).forEach(([docId, it]: [string, any]) => {
                      const n = String(it?.name || '').trim().toLowerCase();
                      if (n && !byLowerNameFSDocId[n]) {
                        byLowerNameFSDocId[n] = docId;
                        byLowerNameFSData[n] = it;
                      }
                    });
                  }

                  // Also build a quick Redux lookup for fallback
                  const reduxInventoryByLowerName: Record<string, InventoryItem> = {};
                  for (const inv of Object.values(inventory)) {
                    const n = (inv.name || '').trim().toLowerCase();
                    if (n) reduxInventoryByLowerName[n] = inv;
                  }

                  for (const name of uniqueNames) {
                    const itFS = byLowerNameFSData[name];
                    if (itFS) {
                      const docId = byLowerNameFSDocId[name];
                      nameToInvMeta[name] = { id: docId, unit: itFS.unit, stock: Number(itFS.stockQuantity) || 0 };
                      continue;
                    }
                    const invRedux = reduxInventoryByLowerName[name];
                    if (invRedux) {
                      let unit: string | undefined = (invRedux as any).unit;
                      if (!unit) {
                        try {
                          if (!firestoreInventoryCache[invRedux.id]) {
                            firestoreInventoryCache[invRedux.id] = await (svcForReads as any).read?.('inventory', invRedux.id);
                          }
                          unit = firestoreInventoryCache[invRedux.id]?.unit;
                        } catch {}
                      }
                      nameToInvMeta[name] = { id: (invRedux as any).id, unit, stock: Number(invRedux.stockQuantity) || 0 };
                    }
                  }

                  // Aggregate required quantities in INVENTORY UNITS
                  const aggregateInInvUnits: Record<string, number> = {};
                  for (const d of deltas) {
                    const key = d.name.trim().toLowerCase();
                    const meta = nameToInvMeta[key];
                    if (!meta) continue; // no matching inventory item
                    let invUnit = meta.unit;
                    // If ingredient unit missing, assume inventory unit to avoid mis-conversion
                    const fromUnit = (d.unit || invUnit) as string | undefined;
                    // If inventory unit missing, align it with ingredient unit to keep same scale
                    if (!invUnit && fromUnit) {
                      const u = String(fromUnit).toLowerCase();
                      if (u === 'ml' || u === 'l' || u === 'g' || u === 'kg' || u === 'pcs') {
                        invUnit = u;
                      }
                    }
                    if (!fromUnit || !invUnit) {
                      console.warn('⚠️ Skipping deduction due to missing units:', { name: key, fromUnit, invUnit });
                      continue;
                    }
                    // Convert and limit floating drift
                    const reqInInvUnitRaw = convertQty(d.requiredQty, fromUnit, invUnit);
                    const reqInInvUnit = Math.round(reqInInvUnitRaw * 10000) / 10000;
                    const current = aggregateInInvUnits[key] || 0;
                    aggregateInInvUnits[key] = Math.round((current + reqInInvUnit) * 10000) / 10000;
                    console.log('🔍 Conversion:', {
                      name: key,
                      requiredQty: d.requiredQty,
                      fromUnit,
                      toUnit: invUnit,
                      converted: reqInInvUnit,
                      current,
                      final: aggregateInInvUnits[key]
                    });
                  }

                  // Apply deductions and sync to Firebase
                  for (const [key, requiredQtyInv] of Object.entries(aggregateInInvUnits)) {
                    const meta = nameToInvMeta[key];
                    if (!meta) continue;
                    const calcQty = (Number(meta.stock) || 0) - Number(requiredQtyInv);
                    const newQty = Math.max(0, Math.round(calcQty * 100) / 100);
                    try {
                      await svc.updateInventoryItem(meta.id, { stockQuantity: newQty });
                    } catch (err) {
                      try {
                        const allInvForRetry = await (svcForReads as any).getInventoryItems?.();
                        let retryId: string | undefined;
                        if (allInvForRetry && typeof allInvForRetry === 'object') {
                          for (const [docId, it] of Object.entries(allInvForRetry as Record<string, any>)) {
                            const n = String((it as any)?.name || '').trim().toLowerCase();
                            if (n === key) { retryId = docId; break; }
                          }
                        }
                        if (retryId) {
                          await svc.updateInventoryItem(retryId, { stockQuantity: newQty });
                        } else {
                          console.warn('⚠️ Inventory deduction: could not resolve doc by name for retry:', key);
                        }
                      } catch (retryErr) {
                        console.error('❌ Inventory deduction retry failed for', key, retryErr);
                      }
                    }
                  }
                }
                // After successful deduction, snapshot saved quantities to lock in the new baseline
                try {
                  const { snapshotSavedQuantities } = await import('../redux/slices/ordersSliceFirebase');
                  store.dispatch(snapshotSavedQuantities({ orderId }));
                  // Persist savedQuantities to Firestore so it's durable across app restarts
                  try {
                    const latestState = store.getState();
                    const latestOrder = latestState?.orders?.ordersById?.[orderId];
                    const latestSaved = (latestOrder as any)?.savedQuantities || {};
                    const svcPersist = createFirestoreService(restaurantId);
                    await svcPersist.updateOrder(orderId, { savedQuantities: latestSaved });
                  } catch (persistErr) {
                    console.warn('⚠️ Could not persist savedQuantities to Firestore:', (persistErr as any)?.message || persistErr);
                  }
                } catch {}
              } catch (e) {
                console.warn('⚠️ Inventory deduction skipped:', (e as Error).message);
              }
            } catch (error) {
              console.error('❌ Firebase middleware: Error saving order to Firebase:', error);
            }
          }, 100);
        }
      }
      break;
    }
    case 'orders/completeOrder': {
      // Complete order without inventory deduction (already deducted on save)
      const orderId = action.payload?.orderId || action.payload?.id;
      
      if (orderId) {
        const order = state.orders.ordersById[orderId];
        if (order) {
          const restaurantId = authRestaurantId || (order as any).restaurantId;
          if (!restaurantId) {
            console.warn('⚠️ Firebase middleware: Missing restaurantId for complete, skipping.');
            return result;
          }
          const cleanOrder = cleanOrderData(order);
          
          setTimeout(async () => {
            try {
              const svc = createFirestoreService(restaurantId);
              await svc.completeOrderMove({ ...cleanOrder, restaurantId });
              console.log('✅ Firebase middleware: Order completed in Firestore:', orderId);
            } catch (error) {
              console.error('❌ Firebase middleware: Error completing order:', error);
            }
          }, 100);
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
              const svc = createFirestoreService(authRestaurantId || (order as any)?.restaurantId);
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
              const svc = createFirestoreService(authRestaurantId || (order as any)?.restaurantId);
              const cleanedItems = removeUndefinedValues(order.items);
              await svc.updateOrder(orderId, { 
                items: cleanedItems,
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
            // Prefer Cloud Firestore deletion (source of truth)
            const svc = createFirestoreService(authRestaurantId);
            await svc.deleteOrder(orderId);
            console.log('🔥 Firebase middleware: Order deleted from Firestore:', orderId);
          } catch (firestoreError) {
            console.warn('⚠️ Firebase middleware: Firestore delete failed, attempting RTDB delete:', firestoreError);
            try {
              // Fallback to Realtime Database deletion if needed
              const firebaseService = getFirebaseService();
              await firebaseService.delete(`orders/${orderId}`);
              console.log('🔥 Firebase middleware: Order deleted from RTDB (fallback):', orderId);
            } catch (rtdbError) {
              console.error('❌ Firebase middleware: Error deleting order from Firebase:', rtdbError);
            }
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
          const svc = createFirestoreService(authRestaurantId);
          
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
            const result = await svc.saveOrder({ ...cleanMergedOrder, restaurantId: authRestaurantId });
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
          const svc = createFirestoreService(authRestaurantId);
          
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
          const svc = createFirestoreService(authRestaurantId);
          
          // Get the merged table from state
          const mergedTable = state.tables.tablesById[mergedTableId];
          if (mergedTable) {
            // Perform atomic batch merge for tables
            await (svc as any).atomicMergeTables({
              mergedTable: { ...mergedTable, restaurantId: authRestaurantId, isOccupied: true },
              originalTableIds: tableIds,
            });
            console.log('✅ Firebase middleware: Atomic table merge committed:', {
              mergedTableId,
              originalTableIds: tableIds
            });
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
          const svc = createFirestoreService(authRestaurantId);
          
          // Reactivate original tables and remove merged table in a single atomic batch
          // Prefer originalTableIds from the action payload if provided, as the reducer may
          // have already removed merged metadata from state by the time this runs.
          const payloadOriginalIds: string[] = Array.isArray(action.payload?.originalTableIds) ? action.payload.originalTableIds : [];
          const mergedTable = state.tables.tablesById[mergedTableId];
          const stateOriginalIds = Array.isArray(mergedTable?.mergedTables) ? mergedTable.mergedTables : [];
          const originalIds: string[] = payloadOriginalIds.length > 0 ? payloadOriginalIds : stateOriginalIds;

          if (originalIds.length > 0) {
            await (svc as any).atomicUnmergeTables({
              mergedTableId: mergedTableId,
              originalTableIds: originalIds,
            });
            console.log('✅ Firebase middleware: Atomic table unmerge committed:', {
              mergedTableId,
              originalTableIds: originalIds
            });

            // Immediately update Redux state for original tables to reflect availability
            for (const tableId of originalIds) {
              const currentTable = state.tables.tablesById[tableId];
              if (currentTable) {
                store.dispatch(updateTableFromFirebase({
                  ...currentTable,
                  isMerged: false,
                  mergerId: undefined,
                  mergedTables: undefined,
                  mergedTableNames: undefined,
                  totalSeats: undefined,
                  isActive: true,
                  isOccupied: false,
                  isReserved: false,
                  reservedAt: undefined,
                  reservedUntil: undefined,
                  reservedBy: undefined,
                  reservedNote: undefined
                }));
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
          const svc = createFirestoreService(authRestaurantId);
          
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
