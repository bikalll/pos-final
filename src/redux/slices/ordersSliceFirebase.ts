import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";

// Simple ID generator to replace nanoid
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
import { Order, OrderItem, PaymentInfo } from "../../utils/types";
import { getFirebaseService } from "../../services/firebaseService";

export type OrdersState = {
  ordersById: Record<string, Order>;
  ongoingOrderIds: string[];
  completedOrderIds: string[];
  isLoading: boolean;
  error: string | null;
};

const initialState: OrdersState = {
  ordersById: {},
  ongoingOrderIds: [],
  completedOrderIds: [],
  isLoading: false,
  error: null,
};

// Async thunks for Firebase operations
export const loadOrders = createAsyncThunk(
  'orders/loadOrders',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const restaurantId = state.auth?.restaurantId;
      if (!restaurantId) throw new Error('Missing restaurantId');
      const service = (await import('../../services/firestoreService')).createFirestoreService(restaurantId);
      const [ongoingMap, completedMap] = await Promise.all([
        service.getOngoingOrders(),
        service.getCompletedOrders(),
      ]);
      const ongoingOrders = Object.values(ongoingMap || {});
      const completedOrders = Object.values(completedMap || {});
      return { ongoingOrders, completedOrders };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load orders');
    }
  }
);

export const saveOrderToFirebase = createAsyncThunk(
  'orders/saveOrderToFirebase',
  async (order: Order, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.saveOrder(order);
      return order;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save order');
    }
  }
);

export const updateOrderTableInFirebase = createAsyncThunk(
  'orders/updateOrderTableInFirebase',
  async ({ orderId, newTableId, restaurantId }: { orderId: string; newTableId: string; restaurantId: string }, { rejectWithValue, dispatch }) => {
    try {
      // Update the order in Firebase
      const firestoreService = (await import('../../services/firestoreService')).createFirestoreService(restaurantId);
      await firestoreService.updateOrder(orderId, { tableId: newTableId });
      
      // Update table occupancy status
      const order = (dispatch as any).getState().orders.ordersById[orderId];
      if (order) {
        // Set old table as unoccupied
        if (order.tableId) {
          try {
            await firestoreService.updateTable(order.tableId, { isOccupied: false });
          } catch (error) {
            console.warn('Failed to update old table occupancy:', error);
          }
        }
        
        // Set new table as occupied
        try {
          await firestoreService.updateTable(newTableId, { isOccupied: true });
        } catch (error) {
          console.warn('Failed to update new table occupancy:', error);
        }
      }
      
      return { orderId, newTableId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update order table');
    }
  }
);

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    // Clear all orders state (used on logout or restaurant switch)
    resetOrders: (state) => {
      state.ordersById = {} as Record<string, Order>;
      state.ongoingOrderIds = [];
      state.completedOrderIds = [];
      state.isLoading = false;
      state.error = null;
    },
    createOrder: {
      prepare: (tableId: string, preservedSavedQuantities?: Record<string, number>) => ({
        payload: { id: generateId(), tableId, preservedSavedQuantities },
      }),
      reducer: (
        state,
        action: PayloadAction<{ id: string; tableId: string; preservedSavedQuantities?: Record<string, number> }>
      ) => {
        const order: Order = {
          id: action.payload.id,
          tableId: action.payload.tableId,
          status: "ongoing",
          items: [],
          discountPercentage: 0,
          serviceChargePercentage: 0,
          taxPercentage: 0,
          createdAt: Date.now(),
          restaurantId: '', // Will be set by middleware
          savedQuantities: action.payload.preservedSavedQuantities || {},
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
      // Mark order as unsaved when items are added
      (order as any).isSaved = false;
    },
    removeItem: (state, action: PayloadAction<{ orderId: string; menuItemId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      order.items = order.items.filter((i) => i.menuItemId !== action.payload.menuItemId);
      // Mark order as unsaved when items are removed
      (order as any).isSaved = false;
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
        // Mark order as unsaved when quantities are changed
        (order as any).isSaved = false;
      }
    },
    applyDiscount: (
      state,
      action: PayloadAction<{ orderId: string; discountPercentage: number }>
    ) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      order.discountPercentage = action.payload.discountPercentage;
      // Mark order as unsaved when discount is applied
      (order as any).isSaved = false;
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
      // Mark order as unsaved when customer is assigned
      (order as any).isSaved = false;
    },
    setOrderSpecialInstructions: (state, action: PayloadAction<{ orderId: string; specialInstructions: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      (order as any).specialInstructions = action.payload.specialInstructions || '';
      // Mark order as unsaved when notes change
      (order as any).isSaved = false;
    },
    completeOrder: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      order.status = "completed";
      state.ongoingOrderIds = state.ongoingOrderIds.filter((id) => id !== order.id);
      state.completedOrderIds.unshift(order.id);
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
    changeOrderTable: (state, action: PayloadAction<{ orderId: string; newTableId: string }>) => {
      const { orderId, newTableId } = action.payload;
      const order = state.ordersById[orderId];
      if (!order) return;
      order.tableId = newTableId;
    },
    markOrderSaved: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) (order as any).isSaved = true;
    },
    markOrderUnsaved: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) (order as any).isSaved = false;
    },
    applyItemDiscount: (
      state,
      action: PayloadAction<{ 
        orderId: string; 
        menuItemId: string; 
        discountType: 'percentage' | 'amount';
        discountValue: number;
      }>
    ) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) {
        console.log('❌ applyItemDiscount: Order not found:', action.payload.orderId);
        return;
      }
      
      const item = order.items.find(i => i.menuItemId === action.payload.menuItemId);
      if (!item) {
        console.log('❌ applyItemDiscount: Item not found:', action.payload.menuItemId);
        return;
      }
      
      console.log('🔄 applyItemDiscount: Applying discount to item:', {
        orderId: action.payload.orderId,
        menuItemId: action.payload.menuItemId,
        discountType: action.payload.discountType,
        discountValue: action.payload.discountValue,
        itemName: item.name,
        beforeDiscount: {
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount
        }
      });
      
      if (action.payload.discountType === 'percentage') {
        item.discountPercentage = Math.min(100, Math.max(0, action.payload.discountValue));
        item.discountAmount = undefined; // Clear amount discount when using percentage
      } else {
        const maxDiscount = item.price * item.quantity;
        item.discountAmount = Math.min(maxDiscount, Math.max(0, action.payload.discountValue));
        item.discountPercentage = undefined; // Clear percentage discount when using amount
      }
      
      // Mark order as unsaved when item discount is applied
      (order as any).isSaved = false;
      
      console.log('✅ applyItemDiscount: Discount applied successfully:', {
        orderId: action.payload.orderId,
        itemName: item.name,
        afterDiscount: {
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount
        },
        orderIsSaved: (order as any).isSaved,
        totalItems: order.items.length,
        itemsWithDiscounts: order.items.filter(i => 
          i.discountPercentage !== undefined || i.discountAmount !== undefined
        ).length
      });
    },
    removeItemDiscount: (
      state,
      action: PayloadAction<{ orderId: string; menuItemId: string }>
    ) => {
      const order = state.ordersById[action.payload.orderId];
      if (!order) return;
      
      const item = order.items.find(i => i.menuItemId === action.payload.menuItemId);
      if (!item) return;
      
      item.discountPercentage = undefined;
      item.discountAmount = undefined;
      
      // Mark order as unsaved when item discount is removed
      (order as any).isSaved = false;
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
    markOrderReviewed: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.ordersById[action.payload.orderId];
      if (order) (order as any).isReviewed = true;
    },
    // Real-time update handlers
    updateOrderFromFirebase: (state, action: PayloadAction<Order>) => {
      const incoming = action.payload as any;
      const existing = state.ordersById[incoming.id] as any;
      // Preserve local-only flags/snapshots if not present from server
      const merged: any = {
        ...incoming,
        savedQuantities: incoming.savedQuantities ?? existing?.savedQuantities ?? {},
        isSaved: incoming.isSaved ?? existing?.isSaved,
        isReviewed: incoming.isReviewed ?? existing?.isReviewed,
      };
      state.ordersById[merged.id] = merged;
      
      // Update order lists
      if (merged.status === 'ongoing') {
        if (!state.ongoingOrderIds.includes(merged.id)) {
          state.ongoingOrderIds.unshift(merged.id);
        }
        state.completedOrderIds = state.completedOrderIds.filter(id => id !== merged.id);
      } else if (merged.status === 'completed') {
        if (!state.completedOrderIds.includes(merged.id)) {
          state.completedOrderIds.unshift(merged.id);
        }
        state.ongoingOrderIds = state.ongoingOrderIds.filter(id => id !== merged.id);
      }
    },
    removeOrderFromFirebase: (state, action: PayloadAction<string>) => {
      const orderId = action.payload;
      delete state.ordersById[orderId];
      state.ongoingOrderIds = state.ongoingOrderIds.filter(id => id !== orderId);
      state.completedOrderIds = state.completedOrderIds.filter(id => id !== orderId);
    },
    clearError: (state) => {
      state.error = null;
    },
    batchUpdateOrders: (state, action: PayloadAction<any[]>) => {
      const orders = action.payload;
      orders.forEach((order: any) => {
        if (order.id) {
          state.ordersById[order.id] = order;
          
          // Update order IDs arrays if needed
          if (order.status === 'ongoing' && !state.ongoingOrderIds.includes(order.id)) {
            state.ongoingOrderIds.unshift(order.id);
          } else if (order.status === 'completed' && !state.completedOrderIds.includes(order.id)) {
            state.completedOrderIds.unshift(order.id);
          }
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        const { ongoingOrders, completedOrders } = action.payload;
        
        // Clear existing orders
        state.ordersById = {};
        state.ongoingOrderIds = [];
        state.completedOrderIds = [];
        
        // Add ongoing orders
        ongoingOrders.forEach(order => {
          state.ordersById[order.id] = order;
          state.ongoingOrderIds.push(order.id);
        });
        
        // Add completed orders
        completedOrders.forEach(order => {
          state.ordersById[order.id] = order;
          state.completedOrderIds.push(order.id);
        });
      })
      .addCase(loadOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveOrderToFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveOrderToFirebase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveOrderToFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateOrderTableInFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOrderTableInFirebase.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the order's tableId in Redux state
        const { orderId, newTableId } = action.payload;
        const order = state.ordersById[orderId];
        if (order) {
          order.tableId = newTableId;
        }
      })
      .addCase(updateOrderTableInFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  resetOrders,
  createOrder,
  addItem,
  removeItem,
  updateItemQuantity,
  applyDiscount,
  applyItemDiscount,
  removeItemDiscount,
  setPayment,
  completeOrder,
  cancelOrder,
  changeOrderTable,
  setOrderCustomer,
  setOrderSpecialInstructions,
  snapshotSavedQuantities,
  markOrderSaved,
  markOrderUnsaved,
  markOrderReviewed,
  updateOrderFromFirebase,
  removeOrderFromFirebase,
  clearError,
  batchUpdateOrders,
} = ordersSlice.actions;

// Async thunks are already exported above with their declarations

export default ordersSlice.reducer;
