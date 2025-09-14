import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { InventoryItem } from "../../utils/types";

export type InventoryState = {
itemsById: Record<string, InventoryItem>;
};

const initialState: InventoryState = {
itemsById: {
"coffee": { id: "coffee", name: "Coffee", price: 120, stockQuantity: 100, category: "Beverages" },
"tea": { id: "tea", name: "Tea", price: 100, stockQuantity: 100, category: "Beverages" },
"burger": { id: "burger", name: "Burger", price: 250, stockQuantity: 50, category: "Food" },
},
};

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
},
});

export const { upsertItem, adjustStock } = inventorySlice.actions;
export default inventorySlice.reducer;
