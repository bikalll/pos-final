import axios from "axios";

export const api = axios.create({ baseURL: "https://example-pos-api.local" });

export const ApiService = {
createOrder: async (payload: any) => {
// Placeholder: mock network call
return { data: { success: true, orderId: payload.id } };
},
updateInventory: async (payload: any) => {
return { data: { success: true } };
},
saveReceipt: async (payload: any) => {
return { data: { success: true, receiptId: payload.id } };
},
upsertCustomer: async (payload: any) => {
return { data: { success: true, customerId: payload.id } };
},
};
