import { configureStore, combineReducers } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, persistStore } from "redux-persist";
import ordersReducer from "./slices/ordersSliceFirebase";
import inventoryReducer from "./slices/inventorySliceFirebase";
import customersReducer from "./slices/customersSliceFirebase";
import staffReducer from "./slices/staffSliceFirebase";
import settingsReducer from "./slices/settingsSlice";
import menuReducer from "./slices/menuSliceFirebase";
import authReducer from "./slices/authSlice";
import tablesReducer, { initializeDefaultTables } from "./slices/tablesSliceFirebase";
import receiptsReducer from "./slices/receiptsSliceFirebase";
import vendorsReducer from "./slices/vendorsSliceFirebase";
import { firebaseMiddleware } from "../middleware/firebaseMiddleware";

const rootReducer = combineReducers({
  orders: ordersReducer,
  inventory: inventoryReducer,
  customers: customersReducer,
  staff: staffReducer,
  settings: settingsReducer,
  menu: menuReducer,
  auth: authReducer,
  tables: tablesReducer,
  receipts: receiptsReducer,
  vendors: vendorsReducer,
});

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth"], // Only persist auth state, let Firebase handle the rest
  debug: true, // Enable debug logging
  // Don't persist the auth state if user is not logged in
  transforms: [],
};

export const store = configureStore({
  reducer: rootReducer, // Temporarily disable persistence
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ 
      serializableCheck: false,
      // Ignore Firebase timestamp fields
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
      ignoredPaths: ['items.timestamp', 'meta.arg', 'payload.timestamp'],
    }).concat(firebaseMiddleware),
});

// Initialize default tables
store.dispatch(initializeDefaultTables());

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
