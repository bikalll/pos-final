import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Customer } from "../../utils/types";

type CustomersState = {
customersById: Record<string, Customer>;
};

const initialState: CustomersState = {
customersById: {},
};

const customersSlice = createSlice({
name: "customers",
initialState,
reducers: {
setAllCustomers: (state, action: PayloadAction<Record<string, Customer>>) => {
state.customersById = action.payload || {} as Record<string, Customer>;
},
resetCustomers: (state) => {
state.customersById = {};
},
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
},
});

export const { 
setAllCustomers,
resetCustomers,
addOrUpdateCustomer, 
addCustomer, 
updateCustomer, 
deleteCustomer, 
updateLoyaltyPoints, 
updateCreditAmount, 
incrementVisitCount 
} = customersSlice.actions;
export default customersSlice.reducer;
