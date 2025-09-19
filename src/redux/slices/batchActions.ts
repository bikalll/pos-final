import { createAction } from '@reduxjs/toolkit';

/**
 * Batch actions for efficient Redux updates
 * Reduces the number of dispatches and improves performance
 */

// Batch update actions
export const batchUpdateOrdersFromFirebase = createAction<Array<{
  id: string;
  tableId: string;
  status: string;
  items: any[];
  createdAt: number;
  restaurantId: string;
  [key: string]: any;
}>>('batch/updateOrdersFromFirebase');

export const batchUpdateTablesFromFirebase = createAction<Array<{
  id: string;
  name: string;
  seats: number;
  isActive: boolean;
  isOccupied: boolean;
  isReserved: boolean;
  restaurantId: string;
  [key: string]: any;
}>>('batch/updateTablesFromFirebase');

export const batchUpdateMenuItemsFromFirebase = createAction<Array<{
  id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  restaurantId: string;
  [key: string]: any;
}>>('batch/updateMenuItemsFromFirebase');

export const batchUpdateInventoryItemsFromFirebase = createAction<Array<{
  id: string;
  name: string;
  stockQuantity: number;
  unit: string;
  isActive: boolean;
  restaurantId: string;
  [key: string]: any;
}>>('batch/updateInventoryItemsFromFirebase');

export const batchUpdateCustomersFromFirebase = createAction<Array<{
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  restaurantId: string;
  [key: string]: any;
}>>('batch/updateCustomersFromFirebase');

// Batch remove actions
export const batchRemoveOrdersFromFirebase = createAction<string[]>('batch/removeOrdersFromFirebase');
export const batchRemoveTablesFromFirebase = createAction<string[]>('batch/removeTablesFromFirebase');
export const batchRemoveMenuItemsFromFirebase = createAction<string[]>('batch/removeMenuItemsFromFirebase');
export const batchRemoveInventoryItemsFromFirebase = createAction<string[]>('batch/removeInventoryItemsFromFirebase');
export const batchRemoveCustomersFromFirebase = createAction<string[]>('batch/removeCustomersFromFirebase');

// Data cleanup actions
export const cleanupOldData = createAction<{
  maxAge: number; // in milliseconds
  dataTypes: ('orders' | 'tables' | 'menu' | 'inventory' | 'customers')[];
}>('batch/cleanupOldData');

export const clearInactiveData = createAction<{
  dataTypes: ('orders' | 'tables' | 'menu' | 'inventory' | 'customers')[];
}>('batch/clearInactiveData');
