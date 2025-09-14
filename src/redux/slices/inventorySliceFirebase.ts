import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { InventoryItem } from "../../utils/types";
import { getFirebaseService } from "../../services/firebaseService";

export type InventoryState = {
  itemsById: Record<string, InventoryItem>;
  isLoading: boolean;
  error: string | null;
};

const initialState: InventoryState = {
  itemsById: {},
  isLoading: false,
  error: null,
};

// Async thunks for Firebase operations
export const loadInventoryItems = createAsyncThunk(
  'inventory/loadInventoryItems',
  async (_, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      const items = await firebaseService.getInventoryItems();
      return items;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load inventory items');
    }
  }
);

export const saveInventoryItemToFirebase = createAsyncThunk(
  'inventory/saveInventoryItemToFirebase',
  async (item: InventoryItem, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.saveInventoryItem(item);
      return item;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save inventory item');
    }
  }
);

export const updateInventoryItemInFirebase = createAsyncThunk(
  'inventory/updateInventoryItemInFirebase',
  async ({ itemId, updates }: { itemId: string; updates: Partial<InventoryItem> }, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.updateInventoryItem(itemId, updates);
      return { itemId, updates };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update inventory item');
    }
  }
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    upsertItem: (state, action: PayloadAction<InventoryItem>) => {
      state.itemsById[action.payload.id] = action.payload;
    },
    adjustStock: (state, action: PayloadAction<{ id: string; delta: number }>) => {
      const item = state.itemsById[action.payload.id];
      if (!item) return;
      item.stockQuantity += action.payload.delta;
      if (item.stockQuantity < 0) item.stockQuantity = 0;
    },
    // Real-time update handlers
    updateInventoryItemFromFirebase: (state, action: PayloadAction<InventoryItem>) => {
      const item = action.payload;
      state.itemsById[item.id] = item;
    },
    removeInventoryItemFromFirebase: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      delete state.itemsById[itemId];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInventoryItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadInventoryItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.itemsById = action.payload;
      })
      .addCase(loadInventoryItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveInventoryItemToFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveInventoryItemToFirebase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveInventoryItemToFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateInventoryItemInFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateInventoryItemInFirebase.fulfilled, (state, action) => {
        state.isLoading = false;
        const { itemId, updates } = action.payload;
        if (state.itemsById[itemId]) {
          state.itemsById[itemId] = { ...state.itemsById[itemId], ...updates };
        }
      })
      .addCase(updateInventoryItemInFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  upsertItem, 
  adjustStock,
  updateInventoryItemFromFirebase,
  removeInventoryItemFromFirebase,
  clearError
} = inventorySlice.actions;

export default inventorySlice.reducer;
