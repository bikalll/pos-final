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
  receiptsRefreshTrigger: number;
};

const initialState: OrdersState = {
  ordersById: {},
  ongoingOrderIds: [],
  completedOrderIds: [],
  receiptsRefreshTrigger: 0,
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
            amount: order.payment.amountPaid,
            tableId: order.tableId,
            isSettlement: order.tableId?.startsWith('credit-'),
            processedBy: order.processedBy
          });
          
          // Calculate order totals for receipt
          const calculateItemTotal = (item: any) => {
            const baseTotal = item.price * item.quantity;
            let discount = 0;
            if (item.discountPercentage !== undefined) discount = (baseTotal * item.discountPercentage) / 100;
            else if (item.discountAmount !== undefined) discount = item.discountAmount;
            return Math.max(0, baseTotal - discount);
          };
          
          const baseSubtotal = (order.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
          const discountedSubtotal = (order.items || []).reduce((sum: number, item: any) => sum + calculateItemTotal(item), 0);
          const itemDiscountsTotal = Math.max(0, baseSubtotal - discountedSubtotal);
          const orderDiscountPercent = (order as any)?.discountPercentage || 0;
          const orderDiscountAmount = discountedSubtotal * (orderDiscountPercent / 100);
          const subtotal = Math.max(0, discountedSubtotal - orderDiscountAmount);
          const tax = subtotal * ((order as any)?.taxPercentage || 0) / 100;
          const serviceCharge = subtotal * ((order as any)?.serviceChargePercentage || 0) / 100;
          const totalDiscount = itemDiscountsTotal + orderDiscountAmount;
          
          // Enrich with processor info and calculated totals
          const enrichedOrder = {
            ...order,
            subtotal: subtotal,
            tax: tax,
            serviceCharge: serviceCharge,
            discount: totalDiscount,
            itemDiscount: itemDiscountsTotal,
            orderDiscount: orderDiscountAmount,
            restaurantName: state?.auth?.restaurantName || 'Restaurant',
            processedBy: order.processedBy || {
              role: state?.auth?.role || 'Staff',
              username: state?.auth?.userName || 'Unknown'
            }
          } as any;
          await autoReceiptService.saveReceiptForOrder(enrichedOrder);
          console.log('✅ THUNK: Receipt saved successfully for order:', orderId);
          console.log('✅ THUNK: Settlement receipt details:', {
            orderId,
            tableId: enrichedOrder.tableId,
            isSettlement: enrichedOrder.tableId?.startsWith('credit-'),
            processedBy: enrichedOrder.processedBy,
            amount: enrichedOrder.payment?.amountPaid
          });
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
        prepare: (tableId: string, restaurantId: string) => ({
          payload: { id: generateId(), tableId, restaurantId },
        }),
      reducer: (
        state,
        action: PayloadAction<{ id: string; tableId: string; restaurantId: string }>
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
    triggerReceiptsRefresh: (state) => {
      state.receiptsRefreshTrigger = Date.now();
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
  snapshotSavedQuantities,
  markOrderSaved,
  markOrderReviewed,
  markOrderUnsaved,
  lockOrderSaving,
  unlockOrderSaving,
  triggerReceiptsRefresh,
  migrateOrdersWithRestaurantId,
} = ordersSlice.actions;

export default ordersSlice.reducer;
