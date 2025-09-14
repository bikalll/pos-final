import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { getFirebaseService } from "../../services/firebaseService";

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  isAvailable: boolean;
  modifiers: string[];
  image?: string;
  orderType: 'KOT' | 'BOT'; // Kitchen Order Ticket or Bar Order Ticket
};

export type MenuState = {
  itemsById: Record<string, MenuItem>;
  isLoading: boolean;
  error: string | null;
};

const initialState: MenuState = {
  itemsById: {},
  isLoading: false,
  error: null,
};

// Async thunks for Firebase operations
export const loadMenuItems = createAsyncThunk(
  'menu/loadMenuItems',
  async (_, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      const menuItems = await firebaseService.getMenuItems();
      return menuItems;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load menu items');
    }
  }
);

export const saveMenuItemToFirebase = createAsyncThunk(
  'menu/saveMenuItemToFirebase',
  async (menuItem: MenuItem, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.saveMenuItem(menuItem);
      return menuItem;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save menu item');
    }
  }
);

export const updateMenuItemInFirebase = createAsyncThunk(
  'menu/updateMenuItemInFirebase',
  async ({ menuItemId, updates }: { menuItemId: string; updates: Partial<MenuItem> }, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.updateMenuItem(menuItemId, updates);
      return { menuItemId, updates };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update menu item');
    }
  }
);

export const deleteMenuItemFromFirebase = createAsyncThunk(
  'menu/deleteMenuItemFromFirebase',
  async (menuItemId: string, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.deleteMenuItem(menuItemId);
      return menuItemId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete menu item');
    }
  }
);

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    addMenuItem: (state, action: PayloadAction<MenuItem>) => {
      state.itemsById[action.payload.id] = action.payload;
    },
    updateMenuItem: (state, action: PayloadAction<MenuItem>) => {
      if (!state.itemsById[action.payload.id]) return;
      state.itemsById[action.payload.id] = action.payload;
    },
    removeMenuItem: (state, action: PayloadAction<string>) => {
      delete state.itemsById[action.payload];
    },
    toggleAvailability: (state, action: PayloadAction<string>) => {
      const item = state.itemsById[action.payload];
      if (!item) return;
      item.isAvailable = !item.isAvailable;
    },
    // Real-time update handlers
    updateMenuItemFromFirebase: (state, action: PayloadAction<MenuItem>) => {
      const menuItem = action.payload;
      state.itemsById[menuItem.id] = menuItem;
    },
    removeMenuItemFromFirebase: (state, action: PayloadAction<string>) => {
      const menuItemId = action.payload;
      delete state.itemsById[menuItemId];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMenuItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMenuItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.itemsById = action.payload;
      })
      .addCase(loadMenuItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveMenuItemToFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveMenuItemToFirebase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveMenuItemToFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateMenuItemInFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMenuItemInFirebase.fulfilled, (state, action) => {
        state.isLoading = false;
        const { menuItemId, updates } = action.payload;
        if (state.itemsById[menuItemId]) {
          state.itemsById[menuItemId] = { ...state.itemsById[menuItemId], ...updates };
        }
      })
      .addCase(updateMenuItemInFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteMenuItemFromFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMenuItemFromFirebase.fulfilled, (state, action) => {
        state.isLoading = false;
        const menuItemId = action.payload;
        delete state.itemsById[menuItemId];
      })
      .addCase(deleteMenuItemFromFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addMenuItem, 
  updateMenuItem, 
  removeMenuItem, 
  toggleAvailability,
  updateMenuItemFromFirebase,
  removeMenuItemFromFirebase,
  clearError
} = menuSlice.actions;

export default menuSlice.reducer;
