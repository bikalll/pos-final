import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Order } from '../../utils/types';
import { 
  batchUpdateOrdersFromFirebase, 
  batchRemoveOrdersFromFirebase,
  cleanupOldData,
  clearInactiveData 
} from './batchActions';

interface OptimizedOrdersState {
  ordersById: Record<string, Order>;
  ongoingOrderIds: string[];
  completedOrderIds: string[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  // Performance tracking
  updateCount: number;
  lastCleanup: number;
}

const initialState: OptimizedOrdersState = {
  ordersById: {},
  ongoingOrderIds: [],
  completedOrderIds: [],
  isLoading: false,
  error: null,
  lastUpdated: 0,
  updateCount: 0,
  lastCleanup: 0,
};

const optimizedOrdersSlice = createSlice({
  name: 'optimizedOrders',
  initialState,
  reducers: {
    // Individual order operations (for immediate UI updates)
    addOrder: (state, action: PayloadAction<Order>) => {
      const order = action.payload;
      state.ordersById[order.id] = order;
      
      if (order.status === 'ongoing') {
        if (!state.ongoingOrderIds.includes(order.id)) {
          state.ongoingOrderIds.push(order.id);
        }
      } else if (order.status === 'completed') {
        if (!state.completedOrderIds.includes(order.id)) {
          state.completedOrderIds.push(order.id);
        }
        // Remove from ongoing if it was there
        state.ongoingOrderIds = state.ongoingOrderIds.filter(id => id !== order.id);
      }
      
      state.lastUpdated = Date.now();
      state.updateCount++;
    },

    updateOrder: (state, action: PayloadAction<Partial<Order> & { id: string }>) => {
      const { id, ...updates } = action.payload;
      if (state.ordersById[id]) {
        state.ordersById[id] = { ...state.ordersById[id], ...updates };
        state.lastUpdated = Date.now();
        state.updateCount++;
      }
    },

    removeOrder: (state, action: PayloadAction<string>) => {
      const orderId = action.payload;
      delete state.ordersById[orderId];
      state.ongoingOrderIds = state.ongoingOrderIds.filter(id => id !== orderId);
      state.completedOrderIds = state.completedOrderIds.filter(id => id !== orderId);
      state.lastUpdated = Date.now();
    },

    // Batch operations for Firebase updates
    batchUpdateOrders: (state, action: PayloadAction<Order[]>) => {
      const orders = action.payload;
      let hasChanges = false;
      
      orders.forEach(order => {
        const existing = state.ordersById[order.id];
        if (!existing || JSON.stringify(existing) !== JSON.stringify(order)) {
          state.ordersById[order.id] = order;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        // Rebuild order ID arrays
        state.ongoingOrderIds = Object.values(state.ordersById)
          .filter(order => order.status === 'ongoing')
          .map(order => order.id);
        
        state.completedOrderIds = Object.values(state.ordersById)
          .filter(order => order.status === 'completed')
          .map(order => order.id);
        
        state.lastUpdated = Date.now();
        state.updateCount += orders.length;
      }
    },

    batchRemoveOrders: (state, action: PayloadAction<string[]>) => {
      const orderIds = action.payload;
      orderIds.forEach(orderId => {
        delete state.ordersById[orderId];
      });
      
      state.ongoingOrderIds = state.ongoingOrderIds.filter(id => !orderIds.includes(id));
      state.completedOrderIds = state.completedOrderIds.filter(id => !orderIds.includes(id));
      state.lastUpdated = Date.now();
    },

    // Data cleanup operations
    cleanupOldOrders: (state, action: PayloadAction<number>) => {
      const maxAge = action.payload;
      const cutoffTime = Date.now() - maxAge;
      
      const ordersToRemove: string[] = [];
      
      Object.values(state.ordersById).forEach(order => {
        if (order.createdAt < cutoffTime && order.status === 'completed') {
          ordersToRemove.push(order.id);
        }
      });
      
      ordersToRemove.forEach(orderId => {
        delete state.ordersById[orderId];
      });
      
      state.completedOrderIds = state.completedOrderIds.filter(id => !ordersToRemove.includes(id));
      state.lastCleanup = Date.now();
      
      console.log(`🧹 Cleaned up ${ordersToRemove.length} old orders`);
    },

    clearInactiveOrders: (state) => {
      const activeOrderIds = new Set([...state.ongoingOrderIds, ...state.completedOrderIds]);
      const ordersToRemove: string[] = [];
      
      Object.keys(state.ordersById).forEach(orderId => {
        if (!activeOrderIds.has(orderId)) {
          ordersToRemove.push(orderId);
        }
      });
      
      ordersToRemove.forEach(orderId => {
        delete state.ordersById[orderId];
      });
      
      state.lastCleanup = Date.now();
      console.log(`🧹 Cleared ${ordersToRemove.length} inactive orders`);
    },

    // Performance monitoring
    resetUpdateCount: (state) => {
      state.updateCount = 0;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(batchUpdateOrdersFromFirebase, (state, action) => {
        const orders = action.payload.map(order => ({
          ...order,
          id: order.id,
          tableId: order.tableId,
          status: order.status,
          items: order.items || [],
          createdAt: order.createdAt || Date.now(),
          restaurantId: order.restaurantId,
        })) as Order[];
        
        optimizedOrdersSlice.caseReducers.batchUpdateOrders(state, { payload: orders, type: 'batchUpdateOrders' });
      })
      .addCase(batchRemoveOrdersFromFirebase, (state, action) => {
        optimizedOrdersSlice.caseReducers.batchRemoveOrders(state, { payload: action.payload, type: 'batchRemoveOrders' });
      })
      .addCase(cleanupOldData, (state, action) => {
        if (action.payload.dataTypes.includes('orders')) {
          optimizedOrdersSlice.caseReducers.cleanupOldOrders(state, { payload: action.payload.maxAge, type: 'cleanupOldOrders' });
        }
      })
      .addCase(clearInactiveData, (state, action) => {
        if (action.payload.dataTypes.includes('orders')) {
          optimizedOrdersSlice.caseReducers.clearInactiveOrders(state, { payload: undefined, type: 'clearInactiveOrders' });
        }
      });
  },
});

export const {
  addOrder,
  updateOrder,
  removeOrder,
  batchUpdateOrders,
  batchRemoveOrders,
  cleanupOldOrders,
  clearInactiveOrders,
  resetUpdateCount,
  setLoading,
  setError,
} = optimizedOrdersSlice.actions;

export default optimizedOrdersSlice.reducer;
