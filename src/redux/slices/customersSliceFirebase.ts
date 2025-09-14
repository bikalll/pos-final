import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Customer } from "../../utils/types";
import { getFirebaseService } from "../../services/firebaseService";

type CustomersState = {
  customersById: Record<string, Customer>;
  isLoading: boolean;
  error: string | null;
};

const initialState: CustomersState = {
  customersById: {},
  isLoading: false,
  error: null,
};

// Async thunks for Firebase operations
export const loadCustomers = createAsyncThunk(
  'customers/loadCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      const customers = await firebaseService.getCustomers();
      return customers;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load customers');
    }
  }
);

export const saveCustomerToFirebase = createAsyncThunk(
  'customers/saveCustomerToFirebase',
  async (customer: Customer, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.saveCustomer(customer);
      return customer;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save customer');
    }
  }
);

export const updateCustomerInFirebase = createAsyncThunk(
  'customers/updateCustomerInFirebase',
  async ({ customerId, updates }: { customerId: string; updates: Partial<Customer> }, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.updateCustomer(customerId, updates);
      return { customerId, updates };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update customer');
    }
  }
);

export const deleteCustomerFromFirebase = createAsyncThunk(
  'customers/deleteCustomerFromFirebase',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.deleteCustomer(customerId);
      return customerId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete customer');
    }
  }
);

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    addOrUpdateCustomer: (state, action: PayloadAction<Customer>) => {
      state.customersById[action.payload.id] = action.payload;
    },
    addCustomer: (state, action: PayloadAction<Customer>) => {
      state.customersById[action.payload.id] = action.payload;
    },
    updateCustomer: (state, action: PayloadAction<Partial<Customer> & { id: string }>) => {
      if (state.customersById[action.payload.id]) {
        state.customersById[action.payload.id] = { ...state.customersById[action.payload.id], ...action.payload };
      }
    },
    deleteCustomer: (state, action: PayloadAction<string>) => {
      delete state.customersById[action.payload];
    },
    updateLoyaltyPoints: (state, action: PayloadAction<{ id: string; points: number }>) => {
      if (state.customersById[action.payload.id]) {
        state.customersById[action.payload.id].loyaltyPoints = (state.customersById[action.payload.id].loyaltyPoints || 0) + action.payload.points;
      }
    },
    updateCreditAmount: (state, action: PayloadAction<{ id: string; amount: number }>) => {
      if (state.customersById[action.payload.id]) {
        state.customersById[action.payload.id].creditAmount = (state.customersById[action.payload.id].creditAmount || 0) + action.payload.amount;
      }
    },
    incrementVisitCount: (state, action: PayloadAction<string>) => {
      if (state.customersById[action.payload]) {
        state.customersById[action.payload].visitCount = (state.customersById[action.payload].visitCount || 0) + 1;
        state.customersById[action.payload].lastVisit = Date.now();
      }
    },
    // Real-time update handlers
    updateCustomerFromFirebase: (state, action: PayloadAction<Customer>) => {
      const customer = action.payload;
      state.customersById[customer.id] = customer;
    },
    removeCustomerFromFirebase: (state, action: PayloadAction<string>) => {
      const customerId = action.payload;
      delete state.customersById[customerId];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customersById = action.payload;
      })
      .addCase(loadCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveCustomerToFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveCustomerToFirebase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveCustomerToFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCustomerInFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCustomerInFirebase.fulfilled, (state, action) => {
        state.isLoading = false;
        const { customerId, updates } = action.payload;
        if (state.customersById[customerId]) {
          state.customersById[customerId] = { ...state.customersById[customerId], ...updates };
        }
      })
      .addCase(updateCustomerInFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCustomerFromFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCustomerFromFirebase.fulfilled, (state, action) => {
        state.isLoading = false;
        const customerId = action.payload;
        delete state.customersById[customerId];
      })
      .addCase(deleteCustomerFromFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addOrUpdateCustomer, 
  addCustomer, 
  updateCustomer, 
  deleteCustomer, 
  updateLoyaltyPoints, 
  updateCreditAmount, 
  incrementVisitCount,
  updateCustomerFromFirebase,
  removeCustomerFromFirebase,
  clearError
} = customersSlice.actions;

export default customersSlice.reducer;
