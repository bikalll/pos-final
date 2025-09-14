   import { createFirestoreService } from './firestoreService';
import { store } from '../redux/storeFirebase';
import { addOrUpdateCustomer, updateCustomerFromFirebase, removeCustomerFromFirebase } from '../redux/slices/customersSliceFirebase';
import { updateTableFromFirebase, removeTableFromFirebase } from '../redux/slices/tablesSliceFirebase';
import { updateOrderFromFirebase, removeOrderFromFirebase } from '../redux/slices/ordersSliceFirebase';
import { getFirebaseService } from './firebaseService';

export class RealtimeSyncService {
  private restaurantId: string;
  private firestoreService: any;
  private listeners: Map<string, () => void> = new Map();

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
    this.firestoreService = createFirestoreService(restaurantId);
  }

  // Start real-time syncing for customers
  startCustomerSync(): void {
    console.log('🔄 Starting real-time customer sync for restaurant:', this.restaurantId);
    
    const unsubscribe = this.firestoreService.listenToCustomers((customers: Record<string, any>) => {
      console.log('📡 Received customer updates:', customers);
      
      // Update Redux store with customer data
      Object.values(customers).forEach((customer: any) => {
        store.dispatch(updateCustomerFromFirebase(customer));
      });
    });

    this.listeners.set('customers', unsubscribe);
  }

  // Start real-time syncing for receipts
  startReceiptSync(): void {
    console.log('🔄 Starting real-time receipt sync for restaurant:', this.restaurantId);
    
    const unsubscribe = this.firestoreService.listenToReceipts((receipts: Record<string, any>) => {
      console.log('📡 Received receipt updates:', receipts);
      
      // For now, we'll just log the receipts
      // In the future, we can add a receipts Redux slice if needed
      console.log('Receipts updated:', Object.keys(receipts).length, 'receipts');
    });

    this.listeners.set('receipts', unsubscribe);
  }

  // Start real-time syncing for tables
  startTableSync(): void {
    console.log('🔄 Starting real-time table sync for restaurant:', this.restaurantId);
    const unsubscribe = this.firestoreService.listenToTables((tables: Record<string, any>) => {
      // Upsert all tables received
      Object.values(tables).forEach((table: any) => {
        store.dispatch(updateTableFromFirebase(table));
      });

      // Backfill missing isOccupied field to ensure it shows up in Firestore
      try {
        const firestore = createFirestoreService(this.restaurantId);
        Object.values(tables).forEach(async (table: any) => {
          if (table && table.id && table.isOccupied === undefined) {
            try {
              await firestore.updateTable(table.id, { isOccupied: false });
            } catch (e) {
              console.warn('table sync: failed to backfill isOccupied', table.id, (e as Error).message);
            }
          }
        });
      } catch (e) {
        console.warn('table sync backfill error:', (e as Error).message);
      }
    });
    this.listeners.set('tables', unsubscribe);
  }

  // Start all real-time syncing
  startAllSync(): void {
    this.startCustomerSync();
    this.startReceiptSync();
    this.startTableSync();
    this.startOngoingOrdersSync();
  }

  // Stop all real-time syncing
  stopAllSync(): void {
    console.log('🛑 Stopping all real-time sync for restaurant:', this.restaurantId);
    
    this.listeners.forEach((unsubscribe, key) => {
      console.log(`🛑 Stopping ${key} sync`);
      unsubscribe();
    });
    
    this.listeners.clear();
  }

  // Stop specific sync
  stopSync(type: 'customers' | 'receipts' | 'tables'): void {
    const unsubscribe = this.listeners.get(type);
    if (unsubscribe) {
      console.log(`🛑 Stopping ${type} sync`);
      unsubscribe();
      this.listeners.delete(type);
    }
  }

  // Start real-time syncing for ongoing orders (Firestore subcollection)
  startOngoingOrdersSync(): void {
    console.log('🔄 Starting real-time ongoing orders sync (Firestore) for restaurant:', this.restaurantId);
    const firestoreSvc = createFirestoreService(this.restaurantId);
    const unsubscribe = firestoreSvc.listenToOngoingOrders((orders: Record<string, any>) => {
      const orderList = Object.values(orders) as any[];
      const currentState = store.getState() as any;
      const currentOrderIds = new Set((currentState.orders?.ongoingOrderIds || []) as string[]);
      const firestoreOrderIds = new Set(orderList.map(o => o.id));

      // Upsert all orders from Firestore
      orderList.forEach((o) => {
        store.dispatch(updateOrderFromFirebase(o));
      });

      // Remove orders that are no longer in Firestore (but keep merged orders)
      Array.from(currentOrderIds).forEach((orderId: string) => {
        if (!firestoreOrderIds.has(orderId)) {
          const order = currentState.orders?.ordersById?.[orderId];
          // Don't remove merged orders - they should stay until unmerged
          if (order && !order.isMergedOrder) {
            console.log('🔄 Removing order from state (no longer in Firestore):', orderId);
            store.dispatch(removeOrderFromFirebase(orderId));
          }
        }
      });

      // Additional cleanup: Remove orders that are part of merged tables
      Array.from(currentOrderIds).forEach((orderId: string) => {
        const order = currentState.orders?.ordersById?.[orderId];
        if (order && !order.isMergedOrder) {
          // Check if this order's table is part of any merged order
          const isPartOfMergedTable = Object.values(currentState.orders?.ordersById || {}).some((otherOrder: any) => 
            otherOrder && 
            otherOrder.isMergedOrder && 
            otherOrder.mergedTableIds && 
            Array.isArray(otherOrder.mergedTableIds) &&
            otherOrder.mergedTableIds.includes(order.tableId)
          );
          
          if (isPartOfMergedTable) {
            store.dispatch(removeOrderFromFirebase(orderId));
          }
        }
      });

      // Update occupancy flags for tables based on order status
      try {
        const firestore = createFirestoreService(this.restaurantId);
        const occupiedTableIds = new Set(
          orderList.filter(o => o.status === 'ongoing' && o.tableId).map(o => o.tableId)
        );

        const tablesState = (store.getState() as any).tables;
        const tableIds: string[] = tablesState?.tableIds || [];
        tableIds.forEach(async (tableId) => {
          const shouldBeOccupied = occupiedTableIds.has(tableId);
          const current = tablesState.tablesById?.[tableId];
          
          // Don't override occupancy for merged tables - they should stay occupied until unmerged
          if (current?.isMerged) {
            return;
          }
          
          // Don't override isActive status - let unmerge process handle this
          if (current?.isActive === false) {
            return;
          }
          
          if (!current || current.isOccupied === shouldBeOccupied) return;
          try {
            await firestore.updateTable(tableId, { isOccupied: shouldBeOccupied });
          } catch (e) {
            console.warn('orders sync: failed to update table occupancy', tableId, (e as Error).message);
          }
        });
      } catch (e) {
        console.warn('orders sync: occupancy update error:', (e as Error).message);
      }
    });

    this.listeners.set('orders', unsubscribe);
  }

  // Save customer to Firebase (for real-time sync)
  async saveCustomer(customer: any): Promise<void> {
    try {
      // Filter out undefined values before saving to Firebase
      const cleanCustomer = Object.fromEntries(
        Object.entries(customer).filter(([_, value]) => value !== undefined)
      );
      
      console.log('🧹 Cleaned customer data:', cleanCustomer);
      await this.firestoreService.createCustomer(cleanCustomer);
      console.log('✅ Customer saved to Firebase:', customer.id);
    } catch (error) {
      console.error('❌ Error saving customer to Firebase:', error);
      throw error;
    }
  }

  // Update customer in Firebase
  async updateCustomer(customerId: string, updates: any): Promise<void> {
    try {
      // Filter out undefined values before updating Firebase
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      console.log('🧹 Cleaned update data:', cleanUpdates);
      await this.firestoreService.updateCustomer(customerId, cleanUpdates);
      console.log('✅ Customer updated in Firebase:', customerId);
    } catch (error) {
      console.error('❌ Error updating customer in Firebase:', error);
      throw error;
    }
  }

  // Delete customer from Firebase
  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.firestoreService.deleteCustomer(customerId);
      console.log('✅ Customer deleted from Firebase:', customerId);
    } catch (error) {
      console.error('❌ Error deleting customer from Firebase:', error);
      throw error;
    }
  }

  // Save receipt to Firebase
  async saveReceipt(receipt: any): Promise<void> {
    try {
      await this.firestoreService.createReceipt(receipt);
      console.log('✅ Receipt saved to Firebase:', receipt.id);
    } catch (error) {
      console.error('❌ Error saving receipt to Firebase:', error);
      throw error;
    }
  }

  // Get all customers from Firebase
  async getCustomers(): Promise<Record<string, any>> {
    try {
      return await this.firestoreService.getCustomers();
    } catch (error) {
      console.error('❌ Error getting customers from Firebase:', error);
      throw error;
    }
  }

  // Get all receipts from Firebase
  async getReceipts(): Promise<Record<string, any>> {
    try {
      // Cursor-defined variable for the active account ID
      const currentAccountId = this.restaurantId;
      
      console.log('📍 RealtimeSyncService.getReceipts - Current Account ID:', currentAccountId);
      
      const receipts = await this.firestoreService.getReceipts();
      
      // Canary check to validate results
      const receiptsArray = Object.values(receipts);
      const otherAccountReceipts = receiptsArray.filter((receipt: any) => 
        receipt.restaurantId && receipt.restaurantId !== currentAccountId
      );
      
      if (otherAccountReceipts.length > 0) {
        console.error('🚨 SECURITY: RealtimeSyncService found receipts from other accounts', 
          otherAccountReceipts.map((r: any) => ({ id: r.id, accountId: r.restaurantId }))
        );
        throw new Error(`Security violation: RealtimeSyncService found ${otherAccountReceipts.length} receipts from other accounts`);
      }
      
      console.log('✅ RealtimeSyncService - All receipts belong to current account:', currentAccountId);
      return receipts;
    } catch (error) {
      console.error('❌ Error getting receipts from Firebase:', error);
      throw error;
    }
  }
}

// Global instance
let globalSyncService: RealtimeSyncService | null = null;

export const initializeRealtimeSync = (restaurantId: string): RealtimeSyncService => {
  if (globalSyncService) {
    globalSyncService.stopAllSync();
  }
  
  globalSyncService = new RealtimeSyncService(restaurantId);
  globalSyncService.startAllSync();
  
  return globalSyncService;
};

export const getRealtimeSyncService = (): RealtimeSyncService | null => {
  return globalSyncService;
};

export const stopRealtimeSync = (): void => {
  if (globalSyncService) {
    globalSyncService.stopAllSync();
    globalSyncService = null;
  }
};
