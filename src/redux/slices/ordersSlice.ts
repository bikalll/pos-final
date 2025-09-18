import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Order, OrderItem, PaymentInfo } from "../../utils/types";
import { getAutoReceiptService } from "../../services/autoReceiptService";

// Simple ID generator to replace nanoid
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export type OrdersState = {
  ordersById: Record<string, Order>;
  ongoingOrderIds: string[];
  completedOrderIds: string[];
};

const initialState: OrdersState = {
  ordersById: {},
  ongoingOrderIds: [],
  completedOrderIds: [],
};

// Async thunk to complete order and save receipt
export const completeOrderWithReceipt = createAsyncThunk(
  'orders/completeOrderWithReceipt',
  async ({ orderId, restaurantId }: { orderId: string; restaurantId: string }, { getState, dispatch }) => {
    console.log('🔄 THUNK: Completing order with receipt:', orderId);
    
    try {
      // First complete the order in Redux
      dispatch(completeOrder({ orderId }));
      console.log('✅ THUNK: Order completed in Redux:', orderId);
      
      // Initialize auto receipt service
      let autoReceiptService = getAutoReceiptService();
      if (!autoReceiptService && restaurantId) {
        console.log('🔄 THUNK: Initializing auto receipt service...');
        const { initializeAutoReceiptService } = await import('../../services/autoReceiptService');
        autoReceiptService = initializeAutoReceiptService(restaurantId);
      }
      
      if (autoReceiptService) {
        const state = getState() as any;
        const order = state.orders.ordersById[orderId];
        
        if (order && order.payment) {
          console.log('🔄 THUNK: Saving receipt for order:', orderId);
          console.log('🔄 THUNK: Order details:', {
            id: order.id,
            status: order.status,
            hasPayment: !!order.payment,
            restaurantId: order.restaurantId,
            amount: order.payment.amountPaid
          });
          // Enrich with processor info from auth state
          const enrichedOrder = {
            ...order,
            processedBy: {
              role: state?.auth?.role || 'Staff',
              username: state?.auth?.userName || 'Unknown'
            }
          } as any;
          await autoReceiptService.saveReceiptForOrder(enrichedOrder);
          console.log('✅ THUNK: Receipt saved successfully for order:', orderId);
        } else {
          console.log('⚠️ THUNK: Order not ready for receipt:', orderId, { 
            hasOrder: !!order, 
            hasPayment: order?.payment ? true : false,
            orderStatus: order?.status
          });
        }
      } else {
        console.error('❌ THUNK: Cannot save receipt - no service available');
      }
    } catch (error) {
      console.error('❌ THUNK: Error saving receipt:', error);
    }
    
    return orderId;
  }
);

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    createOrder: {
        prepare: (tableId: string, restaurantId: string, mergedTableIds?: string[]) => ({
          payload: { id: generateId(), tableId, restaurantId, mergedTableIds },
        }),
      reducer: (
        state,
        action: PayloadAction<{ id: string; tableId: string; restaurantId: string; mergedTableIds?: string[] }>
      ) => {
        const order: Order = {
          id: action.payload.id,
          tableId: action.payload.tableId,
          restaurantId: action.payload.restaurantId,
          status: "ongoing",
          items: [],
          discountPercentage: 0,
          serviceChargePercentage: 0,
          taxPercentage: 0,
          mergedTableIds: action.payload.mergedTableIds,
          isMergedOrder: !!action.payload.mergedTableIds,
          createdAt: Date.now(),
        };
        state.ordersById[order.id] = order;
        state.ongoingOrderIds.unshift(order.id);
      },
    },
    addItem: (state, action: PayloadAction<{ orderId: string; item: OrderItem }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      const existing = order.items.find((i) => i.menuItemId === action.payload.item.menuItemId);
      if (existing) {
        existing.quantity += action.payload.item.quantity;
        existing.modifiers = action.payload.item.modifiers;
      } else {
        order.items.push(action.payload.item);
      }
      // Unlock save if new edits are made after a save
      (order as any).isSaveLocked = false;
      (order as any).isSaved = false;
    },
    removeItem: (state, action: PayloadAction<{ orderId: string; menuItemId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      order.items = order.items.filter((i) => i.menuItemId !== action.payload.menuItemId);
      (order as any).isSaveLocked = false;
      (order as any).isSaved = false;
      
      // If order has no items left, cancel it
      if (order.items.length === 0) {
        delete state.ordersById[order.id];
        state.ongoingOrderIds = state.ongoingOrderIds.filter((id) => id !== order.id);
      }
    },
    updateItemQuantity: (
      state,
      action: PayloadAction<{ orderId: string; menuItemId: string; quantity: number }>
    ) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      const existing = order.items.find((i) => i.menuItemId === action.payload.menuItemId);
      if (existing) {
        existing.quantity = action.payload.quantity;
        
        // If quantity is 0, remove the item
        if (action.payload.quantity <= 0) {
          order.items = order.items.filter((i) => i.menuItemId !== action.payload.menuItemId);
        }
      }
      (order as any).isSaveLocked = false;
      (order as any).isSaved = false;
      
      // If order has no items left, cancel it
      if (order.items.length === 0) {
        delete state.ordersById[order.id];
        state.ongoingOrderIds = state.ongoingOrderIds.filter((id) => id !== order.id);
      }
    },
    applyDiscount: (
      state,
      action: PayloadAction<{ orderId: string; discountPercentage: number }>
    ) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      order.discountPercentage = action.payload.discountPercentage;
    },
    setPayment: (state, action: PayloadAction<{ orderId: string; payment: PaymentInfo }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      order.payment = action.payload.payment;
    },
    setOrderCustomer: (state, action: PayloadAction<{ orderId: string; customerName?: string; customerPhone?: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      (order as any).customerName = action.payload.customerName;
      (order as any).customerPhone = action.payload.customerPhone;
    },
    completeOrder: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      order.status = "completed";
      state.ongoingOrderIds = state.ongoingOrderIds.filter((id) => id !== order.id);
      state.completedOrderIds.unshift(order.id);
      
      // Mark order as needing Firebase sync
      (order as any).needsFirebaseSync = true;
    },
    cancelOrder: (state, action: PayloadAction<{ orderId: string }>) => {
      delete state.ordersById[action.payload.orderId];
      state.ongoingOrderIds = state.ongoingOrderIds.filter(
        (id) => id !== action.payload.orderId
      );
      state.completedOrderIds = state.completedOrderIds.filter(
        (id) => id !== action.payload.orderId
      );
    },
    cancelEmptyOrder: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order || order.items.length > 0) return;
      
      // Remove empty order completely
      delete state.ordersById[order.id];
      state.ongoingOrderIds = state.ongoingOrderIds.filter((id) => id !== order.id);
    },
    changeOrderTable: (state, action: PayloadAction<{ orderId: string; newTableId: string }>) => {
      const { orderId, newTableId } = action.payload;
      const order = state.ordersById[orderId];
      if (!order) return;
      order.tableId = newTableId;
    },
    markOrderSaved: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) {
        (order as any).isSaved = true;
        (order as any).isSaveLocked = true;
      }
    },
    markOrderReviewed: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) (order as any).isReviewed = true;
    },
    markOrderUnsaved: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) {
        (order as any).isSaved = false;
        (order as any).isSaveLocked = false;
      }
    },
    lockOrderSaving: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) (order as any).isSaveLocked = true;
    },
    unlockOrderSaving: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) (order as any).isSaveLocked = false;
    },
    // Migration: Add restaurant ID to existing orders
    migrateOrdersWithRestaurantId: (state, action: PayloadAction<{ restaurantId: string }>) => {
      const { restaurantId } = action.payload;
      console.log('🔧 MIGRATION: Starting migration with restaurantId:', restaurantId);
      let migratedCount = 0;
      Object.values(state.ordersById).forEach((order: any) => {
        if (!order.restaurantId) {
          console.log('🔧 MIGRATION: Migrating order:', order.id, 'to restaurantId:', restaurantId);
          order.restaurantId = restaurantId;
          migratedCount++;
        }
      });
      console.log('🔧 MIGRATION: Migrated', migratedCount, 'orders');
    },
    snapshotSavedQuantities: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      const snapshot: Record<string, number> = {};
      for (const item of order.items) {
        snapshot[item.menuItemId] = item.quantity;
      }
      (order as any).savedQuantities = snapshot;
    },
    mergeOrders: (
      state,
      action: PayloadAction<{
        tableIds: string[];
        mergedTableId: string;
        mergedTableName: string;
      }>
    ) => {
      const { tableIds, mergedTableId, mergedTableName } = action.payload;

      // Find all ongoing orders for the tables being merged
      const ordersToMerge = state.ongoingOrderIds
        .map((id) => state.ordersById[id])
        .filter((order) => order && tableIds.includes(order.tableId));

      if (ordersToMerge.length === 0) return;

      // Create a new merged order
      const mergedOrder: Order = {
        id: generateId(),
        tableId: mergedTableId,
        mergedTableIds: tableIds,
        isMergedOrder: true,
        status: "ongoing",
        items: [],
        discountPercentage: 0,
        serviceChargePercentage: 0,
        taxPercentage: 0,
        createdAt: Date.now(),
        restaurantId: ordersToMerge[0]?.restaurantId || ''
      };

      // Consolidate all items from existing orders
      ordersToMerge.forEach((order) => {
        order.items.forEach((item) => {
          const existingItem = mergedOrder.items.find(
            (i) => i.menuItemId === item.menuItemId
          );
          if (existingItem) {
            existingItem.quantity += item.quantity;
            // Merge modifiers if they exist
            if (item.modifiers && existingItem.modifiers) {
              existingItem.modifiers = [
                ...new Set([...existingItem.modifiers, ...item.modifiers]),
              ];
            }
          } else {
            mergedOrder.items.push({ ...item });
          }
        });
      });

      // Add the merged order
      state.ordersById[mergedOrder.id] = mergedOrder;
      state.ongoingOrderIds.unshift(mergedOrder.id);

      // Remove the original orders
      ordersToMerge.forEach((order) => {
        delete state.ordersById[order.id];
        state.ongoingOrderIds = state.ongoingOrderIds.filter((id) => id !== order.id);
      });
    },
    unmergeOrders: (
      state,
      action: PayloadAction<{ mergedTableId: string; originalTableIds: string[] }>
    ) => {
      const { mergedTableId, originalTableIds } = action.payload;

      // Find the merged order by tableId and merged flag, then delete by its orderId
      const mergedOrder = Object.values(state.ordersById).find(
        (o) => o.tableId === mergedTableId && (o as any).isMergedOrder
      ) as any;
      if (!mergedOrder) return;

      // Remove the merged order using its actual order id
      delete state.ordersById[mergedOrder.id];
      state.ongoingOrderIds = state.ongoingOrderIds.filter((id) => id !== mergedOrder.id);

      // For fresh start: Clear ALL orders associated with the unmerged tables
      // This ensures tables start completely fresh with no previous data
      originalTableIds.forEach((tableId) => {
        // Find and remove any existing orders for this table
        const existingOrderIds = state.ongoingOrderIds.filter(id => {
          const order = state.ordersById[id];
          return order && order.tableId === tableId;
        });
        
        // Remove all existing orders for this table
        existingOrderIds.forEach(orderId => {
          delete state.ordersById[orderId];
        });
        
        // Remove from ongoing order IDs
        state.ongoingOrderIds = state.ongoingOrderIds.filter(id => !existingOrderIds.includes(id));
        
        console.log('🔄 Cleared all orders for unmerged table:', {
          tableId,
          removedOrderIds: existingOrderIds
        });
      });
    },
  },
});

export const {
  createOrder,
  addItem,
  removeItem,
  updateItemQuantity,
  applyDiscount,
  setPayment,
  completeOrder,
  cancelOrder,
  cancelEmptyOrder,
  changeOrderTable,
  setOrderCustomer,
  mergeOrders,
  unmergeOrders,
  snapshotSavedQuantities,
  markOrderSaved,
  markOrderReviewed,
  markOrderUnsaved,
  lockOrderSaving,
  unlockOrderSaving,
  migrateOrdersWithRestaurantId,
} = ordersSlice.actions;

export default ordersSlice.reducer;
