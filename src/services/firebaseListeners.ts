import { AppDispatch } from '../redux/store';
import { getFirebaseService } from './firebaseService';
import { 
  updateOrderFromFirebase, 
  removeOrderFromFirebase 
} from '../redux/slices/ordersSliceFirebase';
import { 
  updateTableFromFirebase, 
  removeTableFromFirebase 
} from '../redux/slices/tablesSliceFirebase';
import { 
  updateMenuItemFromFirebase, 
  removeMenuItemFromFirebase 
} from '../redux/slices/menuSliceFirebase';
import { 
  updateInventoryItemFromFirebase, 
  removeInventoryItemFromFirebase 
} from '../redux/slices/inventorySliceFirebase';
import { 
  updateCustomerFromFirebase, 
  removeCustomerFromFirebase 
} from '../redux/slices/customersSliceFirebase';
import { 
  updateStaffMemberFromFirebase, 
  removeStaffMemberFromFirebase 
} from '../redux/slices/staffSliceFirebase';
import { 
  updateAttendanceRecordFromFirebase, 
  removeAttendanceRecordFromFirebase 
} from '../redux/slices/attendanceSliceFirebase';
import { 
  updateReceiptFromFirebase, 
  removeReceiptFromFirebase 
} from '../redux/slices/receiptsSliceFirebase';

export class FirebaseListenersService {
  private dispatch: AppDispatch;
  private listeners: Map<string, () => void> = new Map();

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  // Initialize all real-time listeners
  initializeListeners(): void {
    try {
      const firebaseService = getFirebaseService();

      // Orders listener (ongoing only) via Firestore subcollection to avoid RTDB conflicts
      try {
        import('./firestoreService').then((mod) => {
          const state: any = (global as any).store?.getState?.() || undefined;
          const restaurantId = state?.auth?.restaurantId;
          const firestore = mod.createFirestoreService(restaurantId);
          const ordersUnsubscribe = firestore.listenToOngoingOrders((orders) => {
            Object.values(orders).forEach(order => {
              this.dispatch(updateOrderFromFirebase(order));
            });
          });
          this.listeners.set('orders', ordersUnsubscribe);
        }).catch((e) => {
          console.warn('Failed to initialize Firestore orders listener:', (e as Error).message);
        });
      } catch (e) {
        console.warn('Failed to initialize Firestore orders listener:', (e as Error).message);
      }

      // Tables listener
      const tablesUnsubscribe = firebaseService.listenToTables((tables) => {
        Object.values(tables).forEach(table => {
          this.dispatch(updateTableFromFirebase(table));
        });
      });
      this.listeners.set('tables', tablesUnsubscribe);

      // Menu items listener
      const menuUnsubscribe = firebaseService.listenToMenuItems((menuItems) => {
        Object.values(menuItems).forEach(menuItem => {
          this.dispatch(updateMenuItemFromFirebase(menuItem));
        });
      });
      this.listeners.set('menu', menuUnsubscribe);

      // Inventory listener
      const inventoryUnsubscribe = firebaseService.listenToInventoryItems((items) => {
        Object.values(items).forEach(item => {
          this.dispatch(updateInventoryItemFromFirebase(item));
        });
      });
      this.listeners.set('inventory', inventoryUnsubscribe);

      // Customers listener
      const customersUnsubscribe = firebaseService.listenToCustomers((customers) => {
        Object.values(customers).forEach(customer => {
          // Extra safety check: ensure customer belongs to current restaurant
          if (!customer.restaurantId || customer.restaurantId === this.restaurantId) {
            this.dispatch({
              ...updateCustomerFromFirebase(customer),
              meta: { restaurantId: this.restaurantId }
            });
          } else {
            console.warn('🚫 Filtered out cross-account customer in FirebaseListenersService:', customer.id, 'Expected:', this.restaurantId, 'Got:', customer.restaurantId);
          }
        });
      });
      this.listeners.set('customers', customersUnsubscribe);

      // Staff listener
      const staffUnsubscribe = firebaseService.listenToStaffMembers((staff) => {
        Object.values(staff).forEach(staffMember => {
          this.dispatch(updateStaffMemberFromFirebase(staffMember));
        });
      });
      this.listeners.set('staff', staffUnsubscribe);

      // Attendance listener
      const attendanceUnsubscribe = firebaseService.listenToAttendanceRecords((attendance) => {
        Object.values(attendance).forEach(record => {
          this.dispatch(updateAttendanceRecordFromFirebase(record));
        });
      });
      this.listeners.set('attendance', attendanceUnsubscribe);

      // Receipts listener
      const receiptsUnsubscribe = firebaseService.listenToReceipts((receipts) => {
        Object.values(receipts).forEach(receipt => {
          this.dispatch(updateReceiptFromFirebase(receipt));
        });
      });
      this.listeners.set('receipts', receiptsUnsubscribe);

      console.log('Firebase listeners initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase listeners:', error);
    }
  }

  // Remove specific listener
  removeListener(listenerName: string): void {
    const unsubscribe = this.listeners.get(listenerName);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerName);
      console.log(`Removed listener: ${listenerName}`);
    }
  }

  // Remove all listeners
  removeAllListeners(): void {
    this.listeners.forEach((unsubscribe, name) => {
      unsubscribe();
      console.log(`Removed listener: ${name}`);
    });
    this.listeners.clear();
  }

  // Get list of active listeners
  getActiveListeners(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// Factory function to create listeners service
export const createFirebaseListenersService = (dispatch: AppDispatch): FirebaseListenersService => {
  return new FirebaseListenersService(dispatch);
};

// Default listeners service instance
export let firebaseListenersService: FirebaseListenersService | null = null;

export const initializeFirebaseListeners = (dispatch: AppDispatch): FirebaseListenersService => {
  firebaseListenersService = new FirebaseListenersService(dispatch);
  return firebaseListenersService;
};

export const getFirebaseListenersService = (): FirebaseListenersService => {
  if (!firebaseListenersService) {
    throw new Error('Firebase listeners service not initialized. Call initializeFirebaseListeners first.');
  }
  return firebaseListenersService;
};
