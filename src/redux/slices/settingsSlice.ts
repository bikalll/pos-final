import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type SettingsState = {
role: "Owner" | "Staff" | "Waiter";
printer?: { name: string; connectionType: "Bluetooth" | "USB" | "Network" };
currency: string;
};

const initialState: SettingsState = {
role: "Owner",
currency: "",
};

const settingsSlice = createSlice({
name: "settings",
initialState,
reducers: {
setRole: (state, action: PayloadAction<SettingsState["role"]>) => {
state.role = action.payload;
},
setPrinter: (state, action: PayloadAction<SettingsState["printer"]>) => {
state.printer = action.payload;
},
setCurrency: (state, action: PayloadAction<string>) => {
state.currency = action.payload;
},
},
});

export const { setRole, setPrinter, setCurrency } = settingsSlice.actions;
export default settingsSlice.reducer;
