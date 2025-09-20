import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../redux/storeFirebase';
import { getFirebaseService, initializeFirebaseService } from '../services/firebaseService';
import { createFirestoreService } from '../services/firestoreService';
import { InventoryItem } from '../utils/types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

// Simple debounce tracker to prevent rapid repeat saves and potential render loops
const recentSaves = new Map<string, number>();
// Idempotency: prevent duplicate deductions for identical item quantities
const lastDeductFingerprint = new Map<string, string>();
import { cleanOrderData, removeUndefinedValues } from '../utils/orderUtils';
import { updateTableFromFirebase } from '../redux/slices/tablesSliceFirebase';

// Function to restore inventory when an order is cancelled with void reason
async function restoreInventoryForVoidOrder(order: any, restaurantId: string, storeState?: any) {
  try {
    console.log('🔄 Starting inventory restoration for order:', order.id);
    console.log('🔄 Order items:', order.items?.length || 0);
    console.log('🔄 Restaurant ID:', restaurantId);
    
    const svc = createFirestoreService(restaurantId);
    
    // Get current inventory directly from Firestore (not local state)
    const inventory = await svc.getInventoryItems();
    console.log('🔄 Current inventory items from Firestore:', Object.keys(inventory).length);
    
    // Also get inventory from local state for comparison (if available)
    const localInventory = storeState?.inventory?.itemsById || {};
    console.log('🔄 Local inventory items:', Object.keys(localInventory).length);
    
    // Calculate inventory restoration deltas
    const restorationDeltas: Array<{ name: string; requiredQty: number; unit?: string }> = [];
    
    for (const orderItem of (order?.items || [])) {
      console.log('🔄 Processing order item:', orderItem.name, 'Quantity:', orderItem.quantity);
      
      // Get menu item ingredients
      let menu = null;
      try {
        menu = await (svc as any).read?.('menu', orderItem.menuItemId);
        console.log('🔄 Menu item found:', menu ? 'Yes' : 'No');
        if (menu) {
          console.log('🔄 Menu ingredients:', menu.ingredients?.length || 0);
        }
      } catch (error) {
        console.warn('Could not fetch menu item for inventory restoration:', orderItem.menuItemId, error);
        continue;
      }
      
      if (!menu || !Array.isArray(menu.ingredients)) {
        console.log('🔄 Skipping item - no menu or ingredients found');
        continue;
      }
      
      // Calculate ingredients needed for this item quantity
      for (const ingredient of menu.ingredients) {
        // Ensure ingredient has required properties
        if (!ingredient || typeof ingredient !== 'object') continue;
        
        const ingredientName = String(ingredient.name || '').trim();
        const ingredientQuantity = Number(ingredient.quantity) || 0;
        const ingredientUnit = String(ingredient.unit || '').trim();
        
        if (!ingredientName) continue;
        
        const required = ingredientQuantity * (orderItem.quantity || 0);
        console.log('🔄 Ingredient:', ingredientName, 'Required:', required, 'Unit:', ingredientUnit);
        
        if (required > 0) {
          restorationDeltas.push({ 
            name: ingredientName, 
            requiredQty: required, 
            unit: ingredientUnit || undefined 
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
    
    console.log('🔄 Total restoration deltas:', restorationDeltas.length);
    console.log('🔄 Aggregate restoration:', Object.keys(aggregateRestoration).length);
    console.log('🔄 Restoration details:', aggregateRestoration);
    
    // Restore inventory items
    for (const [ingredientName, restorationQty] of Object.entries(aggregateRestoration)) {
      console.log('🔄 Processing restoration for:', ingredientName, 'Qty:', restorationQty);
      
      // Try to find inventory item in Firestore first
      let inventoryItem = Object.values(inventory).find((item: any) => 
        item.name?.toLowerCase().trim() === ingredientName.toLowerCase().trim()
      ) as any;
      
      // If not found in Firestore, try local state
      if (!inventoryItem) {
        console.log('🔄 Item not found in Firestore, checking local state...');
        inventoryItem = Object.values(localInventory).find((item: any) => 
          item.name?.toLowerCase().trim() === ingredientName.toLowerCase().trim()
        ) as any;
      }
      
      if (inventoryItem) {
        console.log('🔄 Found inventory item:', inventoryItem.name, 'Current stock:', inventoryItem.stockQuantity, 'ID:', inventoryItem.id);
        
        const currentStock = Number(inventoryItem.stockQuantity) || 0;
        const newStock = currentStock + restorationQty; // Add back the quantity
        
        try {
          // Verify the inventory item still exists in Firestore before updating
          const db = getFirestore();
          const docRef = doc(db, "restaurants", restaurantId, "inventory", inventoryItem.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log('🔄 Updating inventory item in Firestore...');
            console.log('🔄 Update details:', {
              itemId: inventoryItem.id,
              currentStock,
              restorationQty,
              newStock,
              ingredientName
            });
            
            // Test direct update first
            try {
              await updateDoc(docRef, { 
                stockQuantity: newStock,
                updatedAt: new Date()
              });
              console.log(`✅ Direct Firestore update successful for ${ingredientName} (${currentStock} → ${newStock})`);
              
              // Verify the update by reading the document back
              const verifySnap = await getDoc(docRef);
              if (verifySnap.exists()) {
                const updatedData = verifySnap.data();
                console.log(`🔍 Verification: Updated stock quantity is now ${updatedData.stockQuantity}`);
                if (Number(updatedData.stockQuantity) === newStock) {
                  console.log(`✅ Verification successful: Stock quantity correctly updated to ${newStock}`);
                } else {
                  console.warn(`⚠️ Verification failed: Expected ${newStock}, got ${updatedData.stockQuantity}`);
                }
              }
            } catch (directError) {
              console.error(`❌ Direct Firestore update failed for ${ingredientName}:`, directError);
              
              // Fallback to service method
              try {
                await svc.updateInventoryItem(inventoryItem.id, { stockQuantity: newStock });
                console.log(`✅ Service method update successful for ${ingredientName} (${currentStock} → ${newStock})`);
                
                // Verify the service method update
                const verifySnap = await getDoc(docRef);
                if (verifySnap.exists()) {
                  const updatedData = verifySnap.data();
                  console.log(`🔍 Service method verification: Updated stock quantity is now ${updatedData.stockQuantity}`);
                }
              } catch (serviceError) {
                console.error(`❌ Service method update also failed for ${ingredientName}:`, serviceError);
                throw serviceError;
              }
            }
          } else {
            console.warn(`⚠️ Inventory item ${ingredientName} (ID: ${inventoryItem.id}) no longer exists in Firestore`);
            console.log('🔄 Attempting to find item by name in Firestore...');
            
            // Try to find the item by name in Firestore
            try {
              const inventoryItems = await svc.getInventoryItems();
              const firestoreItem = Object.values(inventoryItems).find((item: any) => 
                item.name?.toLowerCase().trim() === ingredientName.toLowerCase().trim()
              ) as any;
              
              if (firestoreItem) {
                console.log('🔄 Found item in Firestore with different ID:', firestoreItem.id);
                const firestoreDocRef = doc(db, "restaurants", restaurantId, "inventory", firestoreItem.id);
                const firestoreDocSnap = await getDoc(firestoreDocRef);
                
                if (firestoreDocSnap.exists()) {
                  const firestoreCurrentStock = Number(firestoreItem.stockQuantity) || 0;
                  const firestoreNewStock = firestoreCurrentStock + restorationQty;
                  
                  await updateDoc(firestoreDocRef, { 
                    stockQuantity: firestoreNewStock,
                    updatedAt: new Date()
                  });
                  console.log(`✅ Updated Firestore item with correct ID: ${ingredientName} (${firestoreCurrentStock} → ${firestoreNewStock})`);
                }
              } else {
                console.warn(`⚠️ Item ${ingredientName} not found in Firestore at all`);
              }
            } catch (searchError) {
              console.error(`❌ Error searching for item in Firestore:`, searchError);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to restore inventory for ${ingredientName}:`, error);
          // Continue with other items even if one fails
        }
      } else {
        console.warn(`⚠️ Inventory item not found for restoration: ${ingredientName}`);
        console.log('🔄 Available inventory items:', Object.keys(inventory).map(key => inventory[key].name));
      }
    }
    
    console.log('✅ Inventory restoration completed for void order:', order.id);
  } catch (error) {
    console.error('❌ Error in inventory restoration:', error);
    throw error;
  }
}

// Simple test function to verify Firebase connection and updates
export async function testFirebaseConnection(restaurantId: string) {
  try {
    console.log('🧪 Testing Firebase connection...');
    const svc = createFirestoreService(restaurantId);
    
    // Test reading inventory
    const inventory = await svc.getInventoryItems();
    console.log('🧪 Firebase read test - Inventory items:', Object.keys(inventory).length);
    
    if (Object.keys(inventory).length > 0) {
      const firstItem = Object.values(inventory)[0] as any;
      console.log('🧪 First inventory item:', firstItem.name, 'Stock:', firstItem.stockQuantity);
      
      // Test updating the first item
      const testQuantity = Math.floor(Math.random() * 100) + 1;
      console.log('🧪 Testing update with quantity:', testQuantity);
      
      const db = getFirestore();
      const docRef = doc(db, "restaurants", restaurantId, "inventory", firstItem.id);
      
      await updateDoc(docRef, { 
        stockQuantity: testQuantity,
        updatedAt: new Date()
      });
      
      console.log('🧪 Update completed, verifying...');
      
      // Verify
      const verifySnap = await getDoc(docRef);
      if (verifySnap.exists()) {
        const updatedData = verifySnap.data();
        console.log('🧪 Verification result:', updatedData.stockQuantity);
        console.log('🧪 Firebase test', updatedData.stockQuantity === testQuantity ? 'PASSED' : 'FAILED');
      }
    }
    
  } catch (error) {
    console.error('🧪 Firebase test failed:', error);
  }
}

// Test function to manually trigger inventory restoration (can be called from console)
export async function testInventoryRestoration(restaurantId: string, orderId: string) {
  try {
    console.log('🧪 Testing inventory restoration manually...');
    const svc = createFirestoreService(restaurantId);
    
    // Get the order from Firestore
    const order = await svc.getOrder(orderId);
    if (!order) {
      console.error('❌ Order not found:', orderId);
      return;
    }
    
    console.log('🧪 Order found:', order.id, 'Items:', order.items?.length || 0);
    console.log('🧪 Order status:', order.status);
    
    // Test restoration
    await restoreInventoryForVoidOrder(order, restaurantId, null);
    console.log('🧪 Manual restoration completed');
    
  } catch (error) {
    console.error('🧪 Manual restoration test failed:', error);
  }
}

// Debug function to check inventory item status
export async function debugInventoryItem(restaurantId: string, itemName: string) {
  try {
    console.log('🔍 Debugging inventory item:', itemName);
    const svc = createFirestoreService(restaurantId);
    
    // Get inventory from Firestore
    const inventory = await svc.getInventoryItems();
    const item = Object.values(inventory).find((i: any) => 
      i.name?.toLowerCase().trim() === itemName.toLowerCase().trim()
    ) as any;
    
    if (item) {
      console.log('🔍 Item found in Firestore:', {
        id: item.id,
        name: item.name,
        stockQuantity: item.stockQuantity,
        category: item.category
      });
      
      // Check if document exists in Firestore
      const db = getFirestore();
      const docRef = doc(db, "restaurants", restaurantId, "inventory", item.id);
      const docSnap = await getDoc(docRef);
      
      console.log('🔍 Document exists in Firestore:', docSnap.exists());
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔍 Firestore data:', data);
      }
    } else {
      console.log('🔍 Item not found in Firestore');
      console.log('🔍 Available items:', Object.values(inventory).map((i: any) => i.name));
    }
    
  } catch (error) {
    console.error('🔍 Debug failed:', error);
  }
}

// Test function to verify inventory updates (can be called from console)
export async function testInventoryUpdate(restaurantId: string, inventoryItemId: string, testQuantity: number) {
  try {
    console.log('🧪 Testing inventory update...');
    const svc = createFirestoreService(restaurantId);
    
    // Get current inventory item
    const inventory = await svc.getInventoryItems();
    const item = Object.values(inventory).find((i: any) => i.id === inventoryItemId);
    
    if (!item) {
      console.error('❌ Inventory item not found:', inventoryItemId);
      return;
    }
    
    console.log('🧪 Current item:', item.name, 'Stock:', item.stockQuantity);
    
    // Test direct update
    const db = getFirestore();
    const docRef = doc(db, "restaurants", restaurantId, "inventory", inventoryItemId);
    
    await updateDoc(docRef, { 
      stockQuantity: testQuantity,
      updatedAt: new Date()
    });
    
    console.log('🧪 Direct update completed, verifying...');
    
    // Verify
    const verifySnap = await getDoc(docRef);
    if (verifySnap.exists()) {
      const updatedData = verifySnap.data();
      console.log('🧪 Verification result:', updatedData.stockQuantity);
      console.log('🧪 Test', updatedData.stockQuantity === testQuantity ? 'PASSED' : 'FAILED');
    }
    
  } catch (error) {
    console.error('🧪 Test failed:', error);
  }
}

export const firebaseMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Debug: Log all actions to see if middleware is working
  if (action.type === 'orders/markOrderSaved') {
    console.log('🔥 Firebase middleware triggered for markOrderSaved:', action.payload);
  }
  
  if (action.type === 'orders/cancelOrder') {
    console.log('🔥 Firebase middleware triggered for cancelOrder:', action.payload);
  }
  
  // Log all order-related actions for debugging
  if (action.type?.startsWith('orders/')) {
    console.log('🔥 Firebase middleware: Order action detected:', action.type, action.payload);
  }
  
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
      console.log('🔥 Processing markOrderSaved for orderId:', orderId);
      
      if (orderId) {
        // Disable debounce to ensure inventory deduction always runs on save
        recentSaves.set(orderId, Date.now());
        const order = state.orders.ordersById[orderId];
        console.log('🔥 Order found in state:', !!order, 'Order items:', order?.items?.length || 0);
        
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

                // Get the latest order from current state
                const latestOrder = currentState?.orders?.ordersById?.[orderId] || order;
                
                // Skip inventory deduction for cancelled orders
                if (latestOrder?.status === 'cancelled') {
                  console.log('🔍 Skipping inventory deduction for cancelled order:', orderId);
                  return;
                }
                
                console.log('🔍 Inventory deduction starting for order:', orderId);
                console.log('🔍 Order status:', latestOrder?.status);
                console.log('🔍 Order items:', latestOrder?.items?.length || 0);
                console.log('🔍 Menu items in state:', Object.keys(menuItems).length);
                console.log('🔍 Inventory items in state:', Object.keys(inventory).length);
                console.log('🔍 Latest order items:', JSON.stringify(latestOrder?.items, null, 2));
                console.log('🔍 Restaurant ID for inventory update:', restaurantId);
                console.log('🔍 Firebase service available:', !!svc);
                console.log('🔍 updateInventoryItem method available:', typeof svc.updateInventoryItem);
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
                 console.log('🔍 Menu item found:', menu?.name || 'Not found');
                 console.log('🔍 Menu item ingredients:', ingredients?.length || 0);
                 if (!ingredients || ingredients.length === 0) {
                   try {
                     if (!firestoreMenuCache[orderItem.menuItemId]) {
                       firestoreMenuCache[orderItem.menuItemId] = await (svcForReads as any).read?.('menu', orderItem.menuItemId);
                     }
                     const remote = firestoreMenuCache[orderItem.menuItemId];
                     if (remote && Array.isArray(remote.ingredients)) {
                       ingredients = remote.ingredients as any;
                       console.log('🔍 Remote ingredients found:', ingredients?.length || 0);
                     } else {
                       console.log('🔍 No remote ingredients found');
                     }
                   } catch (error) {
                     console.log('🔍 Error fetching remote ingredients:', error);
                   }
                 }
                 for (const ing of ingredients) {
                   // Ensure ingredient has required properties
                   if (!ing || typeof ing !== 'object') continue;
                   
                   const ingredientName = String(ing.name || '').trim();
                   const ingredientQuantity = Number(ing.quantity) || 0;
                   const ingredientUnit = String(ing.unit || '').trim();
                   
                   if (!ingredientName) continue;
                   
                   const required = ingredientQuantity * deltaQty;
                   console.log('🔍 Ingredient calculation:', {
                     name: ingredientName,
                     ingQty: ingredientQuantity,
                     deltaQty,
                     required,
                     unit: ingredientUnit
                   });
                   if (required > 0) {
                     deltas.push({ 
                       name: ingredientName, 
                       requiredQty: required, 
                       unit: ingredientUnit || undefined 
                     });
                   }
                 }
                }

                console.log('🔍 Total deltas created:', deltas.length);
                if (deltas.length > 0) {
                  console.log('🔍 Deltas:', deltas);
                  console.log('🔍 Proceeding with inventory deduction...');
                } else {
                  console.log('⚠️ No deltas found - inventory deduction skipped');
                  console.log('🔍 This might be because:');
                  console.log('  - No new items added to order');
                  console.log('  - Menu items have no ingredients');
                  console.log('  - All items already saved (savedQuantities match current quantities)');
                  return;
                }
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
                  console.log('🔍 Unique ingredient names to find in inventory:', uniqueNames);

                  // Load all inventory once from Firestore, prefer this for correct doc IDs
                  let allInv: Record<string, any> | undefined;
                  try {
                    allInv = await (svcForReads as any).getInventoryItems?.();
                    console.log('🔍 Loaded inventory from Firestore:', Object.keys(allInv || {}).length, 'items');
                    console.log('🔍 Inventory items:', Object.values(allInv || {}).map((item: any) => ({ name: item.name, stock: item.stockQuantity })));
                  } catch (error) {
                    console.error('🔍 Error loading inventory from Firestore:', error);
                  }
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
                    console.log('🔍 Looking for inventory item for ingredient:', name);
                    const itFS = byLowerNameFSData[name];
                    if (itFS) {
                      const docId = byLowerNameFSDocId[name];
                      nameToInvMeta[name] = { id: docId, unit: itFS.unit, stock: Number(itFS.stockQuantity) || 0 };
                      console.log('🔍 Found in Firestore:', { name, id: docId, stock: itFS.stockQuantity, unit: itFS.unit });
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
                      console.log('🔍 Found in Redux:', { name, id: invRedux.id, stock: invRedux.stockQuantity, unit });
                    } else {
                      console.log('⚠️ No inventory item found for ingredient:', name);
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
                    if (!meta) {
                      console.log('🔍 No inventory meta found for:', key);
                      continue;
                    }
                    const calcQty = (Number(meta.stock) || 0) - Number(requiredQtyInv);
                    const newQty = Math.max(0, Math.round(calcQty * 100) / 100);
                    console.log('🔍 Updating inventory:', { name: key, currentStock: meta.stock, required: requiredQtyInv, newQty });
                    try {
                      console.log('🔍 Calling updateInventoryItem for:', key, 'with new quantity:', newQty);
                      console.log('🔍 Inventory item ID:', meta.id);
                      console.log('🔍 Update payload:', { stockQuantity: newQty });
                      const updateResult = await svc.updateInventoryItem(meta.id, { stockQuantity: newQty });
                      console.log('✅ Successfully updated inventory for:', key, 'Result:', updateResult);
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
              } catch (inventoryError) {
                console.warn('⚠️ Inventory deduction skipped:', (inventoryError as Error).message);
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
                } catch (snapshotError) {
                  console.warn('⚠️ Could not snapshot saved quantities:', (snapshotError as any)?.message || snapshotError);
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
      console.log('🔥 Firebase middleware: Processing cancelOrder case');
      const { orderId, reason, otherReason, cancelledBy } = action.payload;
      console.log('🔥 Firebase middleware: CancelOrder payload:', { orderId, reason, otherReason, cancelledBy });
      
      if (orderId) {
        console.log('🔥 Firebase middleware: OrderId found, proceeding with cancellation');
        setTimeout(async () => {
          try {
            // Get the current order from Redux state
            const state = store.getState();
            const order = state.orders.ordersById[orderId];
            console.log('🔥 Firebase middleware: Order found in state:', !!order);
            console.log('🔥 Firebase middleware: Order status:', order?.status);
            console.log('🔥 Firebase middleware: Order items:', order?.items?.length || 0);
            
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

              // Restore inventory for all cancelled orders
              console.log('🔥 Firebase middleware: Order cancelled - starting inventory restoration');
              console.log('🔥 Firebase middleware: Cancellation reason:', reason);
              console.log('🔥 Firebase middleware: About to call restoreInventoryForVoidOrder...');
              try {
                console.log('🔄 Firebase middleware: Restoring inventory for cancelled order:', orderId);
                console.log('🔄 Firebase middleware: Order details:', {
                  id: order.id,
                  items: order.items?.length || 0,
                  restaurantId: authRestaurantId,
                  reason: reason
                });
                
                // Call the restoration function
                const restorationResult = await restoreInventoryForVoidOrder(order, authRestaurantId, state);
                console.log('🔥 Firebase middleware: restoreInventoryForVoidOrder completed:', restorationResult);
                console.log('✅ Firebase middleware: Inventory restored for cancelled order:', orderId);
              } catch (inventoryError) {
                console.error('❌ Firebase middleware: Failed to restore inventory for cancelled order:', orderId, inventoryError);
                console.error('❌ Firebase middleware: Error details:', {
                  message: inventoryError.message,
                  stack: inventoryError.stack,
                  name: inventoryError.name
                });
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

                // Restore inventory for all cancelled orders
                try {
                  console.log('🔄 Firebase middleware: Restoring inventory for cancelled order (RTDB):', orderId);
                  await restoreInventoryForVoidOrder(order, authRestaurantId);
                  console.log('✅ Firebase middleware: Inventory restored for cancelled order (RTDB):', orderId);
                } catch (inventoryError) {
                  console.error('❌ Firebase middleware: Failed to restore inventory for cancelled order (RTDB):', orderId, inventoryError);
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
