import { configureStore, combineReducers } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, persistStore } from "redux-persist";
import ordersReducer from "./slices/ordersSlice";
import inventoryReducer from "./slices/inventorySlice";
import customersReducer from "./slices/customersSlice";
import staffReducer from "./slices/staffSlice";
import settingsReducer from "./slices/settingsSlice";
import menuReducer from "./slices/menuSlice";
import authReducer from "./slices/authSlice";
import tablesReducer, { initializeDefaultTables } from "./slices/tablesSlice";
import { receiptMiddleware } from "../middleware/receiptMiddleware";
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
});

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth", "orders", "inventory", "menu", "customers", "settings", "staff", "tables"],
};

export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducer),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(receiptMiddleware, firebaseMiddleware),
});

// Initialize default tables
store.dispatch(initializeDefaultTables());

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
