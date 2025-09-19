import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createFirestoreService } from '../../services/firestoreService';
import { RootState } from '../storeFirebase';

export interface Vendor {
  id: string;
  vendorName: string;
  contact: string;
  address: string;
  supplies: string[];
  phoneNumber?: string;
  balance: number;
  createdAt: any;
  updatedAt: any;
  restaurantId: string;
}

export interface VendorTransaction {
  id: string;
  vendorId: string;
  billNumber: string;
  creditAmount: number;
  paidAmount: number;
  paymentMethod: 'Cash' | 'F.Pay' | 'Cheque';
  date: any;
  createdAt: any;
  updatedAt: any;
  restaurantId: string;
}

interface VendorsState {
  vendors: Record<string, Vendor>;
  transactions: Record<string, VendorTransaction>;
  loading: boolean;
  error: string | null;
  selectedVendor: Vendor | null;
}

const initialState: VendorsState = {
  vendors: {},
  transactions: {},
  loading: false,
  error: null,
  selectedVendor: null,
};

// Async thunks for vendor operations
export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      const vendors = await firestoreService.getVendors();
      return vendors;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch vendors');
    }
  }
);

export const createVendor = createAsyncThunk(
  'vendors/createVendor',
  async (vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'restaurantId' | 'balance'>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      const vendorId = await firestoreService.createVendor({
        ...vendorData,
        balance: 0,
      });
      
      return { id: vendorId, ...vendorData, balance: 0 };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create vendor');
    }
  }
);

export const updateVendor = createAsyncThunk(
  'vendors/updateVendor',
  async ({ vendorId, updates }: { vendorId: string; updates: Partial<Vendor> }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      await firestoreService.updateVendor(vendorId, updates);
      
      return { vendorId, updates };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update vendor');
    }
  }
);

export const deleteVendor = createAsyncThunk(
  'vendors/deleteVendor',
  async (vendorId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      await firestoreService.deleteVendor(vendorId);
      
      return vendorId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete vendor');
    }
  }
);

// Async thunks for transaction operations
export const fetchVendorTransactions = createAsyncThunk(
  'vendors/fetchVendorTransactions',
  async (vendorId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      const transactions = await firestoreService.getVendorTransactions(vendorId);
      return { vendorId, transactions };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch vendor transactions');
    }
  }
);

export const createVendorTransaction = createAsyncThunk(
  'vendors/createVendorTransaction',
  async (transactionData: Omit<VendorTransaction, 'id' | 'createdAt' | 'updatedAt' | 'restaurantId'>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      const transactionId = await firestoreService.createVendorTransaction(transactionData);
      
      return { id: transactionId, ...transactionData };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  }
);

export const updateVendorTransaction = createAsyncThunk(
  'vendors/updateVendorTransaction',
  async ({ transactionId, updates }: { transactionId: string; updates: Partial<VendorTransaction> }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      await firestoreService.updateVendorTransaction(transactionId, updates);
      
      return { transactionId, updates };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update transaction');
    }
  }
);

export const deleteVendorTransaction = createAsyncThunk(
  'vendors/deleteVendorTransaction',
  async (transactionId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restaurantId = state.auth.restaurantId;
      if (!restaurantId) {
        throw new Error('No restaurant ID found');
      }
      
      const firestoreService = createFirestoreService(restaurantId);
      await firestoreService.deleteVendorTransaction(transactionId);
      
      return transactionId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  }
);

const vendorsSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    setSelectedVendor: (state, action: PayloadAction<Vendor | null>) => {
      state.selectedVendor = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearVendors: (state) => {
      state.vendors = {};
      state.transactions = {};
      state.selectedVendor = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch vendors
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create vendor
    builder
      .addCase(createVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors[action.payload.id] = action.payload as Vendor;
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update vendor
    builder
      .addCase(updateVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        state.loading = false;
        if (state.vendors[action.payload.vendorId]) {
          state.vendors[action.payload.vendorId] = {
            ...state.vendors[action.payload.vendorId],
            ...action.payload.updates,
          };
        }
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete vendor
    builder
      .addCase(deleteVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.loading = false;
        delete state.vendors[action.payload];
        if (state.selectedVendor?.id === action.payload) {
          state.selectedVendor = null;
        }
      })
      .addCase(deleteVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch vendor transactions
    builder
      .addCase(fetchVendorTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorTransactions.fulfilled, (state, action) => {
        state.loading = false;
        // Update transactions for the specific vendor
        const { vendorId, transactions } = action.payload;
        Object.values(transactions).forEach((transaction: VendorTransaction) => {
          state.transactions[transaction.id] = transaction;
        });
      })
      .addCase(fetchVendorTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create vendor transaction
    builder
      .addCase(createVendorTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVendorTransaction.fulfilled, (state, action) => {
        state.loading = false;
        console.log('Redux: Transaction created successfully:', action.payload);
        state.transactions[action.payload.id] = action.payload as VendorTransaction;
        
        // Update vendor balance
        const vendorId = action.payload.vendorId;
        if (state.vendors[vendorId]) {
          const balanceChange = action.payload.creditAmount - action.payload.paidAmount;
          state.vendors[vendorId].balance += balanceChange;
          console.log('Redux: Updated vendor balance:', state.vendors[vendorId].balance);
        }
      })
      .addCase(createVendorTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('Redux: Transaction creation failed:', action.payload);
      });

    // Update vendor transaction
    builder
      .addCase(updateVendorTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVendorTransaction.fulfilled, (state, action) => {
        state.loading = false;
        if (state.transactions[action.payload.transactionId]) {
          state.transactions[action.payload.transactionId] = {
            ...state.transactions[action.payload.transactionId],
            ...action.payload.updates,
          };
        }
      })
      .addCase(updateVendorTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete vendor transaction
    builder
      .addCase(deleteVendorTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVendorTransaction.fulfilled, (state, action) => {
        state.loading = false;
        const transaction = state.transactions[action.payload];
        if (transaction) {
          // Revert balance change
          const vendorId = transaction.vendorId;
          if (state.vendors[vendorId]) {
            const balanceChange = transaction.creditAmount - transaction.paidAmount;
            state.vendors[vendorId].balance -= balanceChange;
          }
          delete state.transactions[action.payload];
        }
      })
      .addCase(deleteVendorTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedVendor, clearError, clearVendors } = vendorsSlice.actions;
export default vendorsSlice.reducer;
