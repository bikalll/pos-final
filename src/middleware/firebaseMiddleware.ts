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

// Function to restore inventory when an order is cancelled with void reason
async function restoreInventoryForVoidOrder(order: any, restaurantId: string) {
  try {
    const svc = createFirestoreService(restaurantId);
    
    // Get current inventory
    const inventory = await svc.getInventoryItems();
    
    // Calculate inventory restoration deltas
    const restorationDeltas: Array<{ name: string; requiredQty: number; unit?: string }> = [];
    
    for (const orderItem of (order?.items || [])) {
      // Get menu item ingredients
      let menu = null;
      try {
        menu = await (svc as any).read?.('menu', orderItem.menuItemId);
      } catch (error) {
        console.warn('Could not fetch menu item for inventory restoration:', orderItem.menuItemId);
        continue;
      }
      
      if (!menu || !Array.isArray(menu.ingredients)) {
        continue;
      }
      
      // Calculate ingredients needed for this item quantity
      for (const ingredient of menu.ingredients) {
        const required = (Number(ingredient.quantity) || 0) * (orderItem.quantity || 0);
        if (required > 0 && ingredient.name) {
          restorationDeltas.push({ 
            name: ingredient.name, 
            requiredQty: required, 
            unit: ingredient.unit 
          });
        }
      }
    }
    
    // Aggregate restoration deltas by ingredient name
    const aggregateRestoration: Record<string, number> = {};
    for (const delta of restorationDeltas) {
      const key = delta.name.toLowerCase().trim();
      aggregateRestoration[key] = (aggregateRestoration[key] || 0) + delta.requiredQty;
    }
    
    // Restore inventory items
    for (const [ingredientName, restorationQty] of Object.entries(aggregateRestoration)) {
      const inventoryItem = Object.values(inventory).find((item: any) => 
        item.name?.toLowerCase().trim() === ingredientName
      ) as any;
      
      if (inventoryItem) {
        const currentStock = Number(inventoryItem.stockQuantity) || 0;
        const newStock = currentStock + restorationQty; // Add back the quantity
        
        try {
          await svc.updateInventoryItem(inventoryItem.id, { stockQuantity: newStock });
          console.log(`✅ Restored ${restorationQty} units of ${ingredientName} (${currentStock} → ${newStock})`);
        } catch (error) {
          console.error(`❌ Failed to restore inventory for ${ingredientName}:`, error);
        }
      } else {
        console.warn(`⚠️ Inventory item not found for restoration: ${ingredientName}`);
      }
    }
    
    console.log('✅ Inventory restoration completed for void order:', order.id);
  } catch (error) {
    console.error('❌ Error in inventory restoration:', error);
    throw error;
  }
}

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
    
    case 'orders/cancelOrder': {
      // Handle order cancellation (update with cancellation info instead of deleting)
      const { orderId, reason, otherReason, cancelledBy } = action.payload;
      
      if (orderId) {
        setTimeout(async () => {
          try {
            // Get the current order from Redux state
            const state = store.getState();
            const order = state.orders.ordersById[orderId];
            
            if (order) {
              // Update order with cancellation info
              const svc = createFirestoreService(authRestaurantId);
              await svc.updateOrder(orderId, {
                status: 'cancelled',
                cancellationInfo: {
                  reason,
                  otherReason,
                  cancelledAt: Date.now(),
                  cancelledBy,
                }
              });
              console.log('🔥 Firebase middleware: Order cancelled in Firestore:', orderId, 'Reason:', reason);

              // If cancelled with void reason, restore inventory
              if (reason === 'void') {
                try {
                  console.log('🔄 Firebase middleware: Restoring inventory for void order:', orderId);
                  await restoreInventoryForVoidOrder(order, authRestaurantId);
                  console.log('✅ Firebase middleware: Inventory restored for void order:', orderId);
                } catch (inventoryError) {
                  console.error('❌ Firebase middleware: Failed to restore inventory for void order:', orderId, inventoryError);
                }
              }
            }
          } catch (firestoreError) {
            console.warn('⚠️ Firebase middleware: Firestore cancel failed, attempting RTDB update:', firestoreError);
            try {
              // Fallback to Realtime Database update if needed
              const firebaseService = getFirebaseService();
              const state = store.getState();
              const order = state.orders.ordersById[orderId];
              
              if (order) {
                await firebaseService.update(`orders/${orderId}`, {
                  status: 'cancelled',
                  cancellationInfo: {
                    reason,
                    otherReason,
                    cancelledAt: Date.now(),
                    cancelledBy,
                  }
                });
                console.log('🔥 Firebase middleware: Order cancelled in RTDB (fallback):', orderId);

                // If cancelled with void reason, restore inventory
                if (reason === 'void') {
                  try {
                    console.log('🔄 Firebase middleware: Restoring inventory for void order (RTDB):', orderId);
                    await restoreInventoryForVoidOrder(order, authRestaurantId);
                    console.log('✅ Firebase middleware: Inventory restored for void order (RTDB):', orderId);
                  } catch (inventoryError) {
                    console.error('❌ Firebase middleware: Failed to restore inventory for void order (RTDB):', orderId, inventoryError);
                  }
                }
              }
            } catch (rtdbError) {
              console.error('❌ Firebase middleware: Error cancelling order in Firebase:', rtdbError);
            }
          }
        }, 100);
      }
      break;
    }
    case 'orders/cancelEmptyOrder': {
      // Handle empty order deletion (still delete these)
      const orderId = action.payload?.orderId || action.payload;
      
      if (orderId) {
        setTimeout(async () => {
          try {
            // Prefer Cloud Firestore deletion (source of truth)
            const svc = createFirestoreService(authRestaurantId);
            await svc.deleteOrder(orderId);
            console.log('🔥 Firebase middleware: Empty order deleted from Firestore:', orderId);
          } catch (firestoreError) {
            console.warn('⚠️ Firebase middleware: Firestore delete failed, attempting RTDB delete:', firestoreError);
            try {
              // Fallback to Realtime Database deletion if needed
              const firebaseService = getFirebaseService();
              await firebaseService.delete(`orders/${orderId}`);
              console.log('🔥 Firebase middleware: Empty order deleted from RTDB (fallback):', orderId);
            } catch (rtdbError) {
              console.error('❌ Firebase middleware: Error deleting empty order from Firebase:', rtdbError);
            }
          }
        }, 100);
      }
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
