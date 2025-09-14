import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Receipt } from "../../utils/types";
import { getFirebaseService } from "../../services/firebaseService";

type ReceiptsState = {
  receiptsById: Record<string, Receipt>;
  isLoading: boolean;
  error: string | null;
};

const initialState: ReceiptsState = {
  receiptsById: {},
  isLoading: false,
  error: null,
};

// Async thunks for Firebase operations
export const loadReceipts = createAsyncThunk(
  'receipts/loadReceipts',
  async (_, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      const receipts = await firebaseService.getReceipts();
      return receipts;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load receipts');
    }
  }
);

export const saveReceiptToFirebase = createAsyncThunk(
  'receipts/saveReceiptToFirebase',
  async (receipt: Receipt, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.saveReceipt(receipt);
      return receipt;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save receipt');
    }
  }
);

const receiptsSlice = createSlice({
  name: "receipts",
  initialState,
  reducers: {
    addReceipt: (state, action: PayloadAction<Receipt>) => {
      state.receiptsById[action.payload.id] = action.payload;
    },
    updateReceipt: (state, action: PayloadAction<Receipt>) => {
      state.receiptsById[action.payload.id] = action.payload;
    },
    removeReceipt: (state, action: PayloadAction<string>) => {
      delete state.receiptsById[action.payload];
    },
    // Real-time update handlers
    updateReceiptFromFirebase: (state, action: PayloadAction<Receipt>) => {
      const receipt = action.payload;
      state.receiptsById[receipt.id] = receipt;
    },
    removeReceiptFromFirebase: (state, action: PayloadAction<string>) => {
      const receiptId = action.payload;
      delete state.receiptsById[receiptId];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadReceipts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadReceipts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receiptsById = action.payload;
      })
      .addCase(loadReceipts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveReceiptToFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveReceiptToFirebase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveReceiptToFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addReceipt, 
  updateReceipt, 
  removeReceipt,
  updateReceiptFromFirebase,
  removeReceiptFromFirebase,
  clearError
} = receiptsSlice.actions;

export default receiptsSlice.reducer;
