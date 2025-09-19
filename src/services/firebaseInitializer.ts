import { AppDispatch } from '../redux/store';
import { initializeFirebaseService } from './firebaseService';
import { initializeFirebaseListeners } from './firebaseListeners';
import { createFirebaseAuthService } from './firebaseAuth';
import { 
  loadOrders
} from '../redux/slices/ordersSliceFirebase';
import { loadTables } from '../redux/slices/tablesSliceFirebase';
import { loadMenuItems } from '../redux/slices/menuSliceFirebase';
import { loadInventoryItems } from '../redux/slices/inventorySliceFirebase';
import { loadCustomers } from '../redux/slices/customersSliceFirebase';
import { loadStaffMembers } from '../redux/slices/staffSliceFirebase';
import { loadAttendanceRecords } from '../redux/slices/staffSliceFirebase';
import { loadReceipts } from '../redux/slices/receiptsSliceFirebase';
import { resetOrders } from '../redux/slices/ordersSliceFirebase';

export class FirebaseInitializer {
  private dispatch: AppDispatch;
  private isInitialized: boolean = false;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  // Initialize Firebase for a specific restaurant
  async initializeForRestaurant(restaurantId: string): Promise<void> {
    try {
      console.log(`Initializing Firebase for restaurant: ${restaurantId}`);
      
      // Clear any stale orders in Redux before re-initializing listeners
      this.dispatch(resetOrders());

      // Initialize Firebase service
      initializeFirebaseService(restaurantId);
      
      // Initialize real-time listeners
      initializeFirebaseListeners(this.dispatch);
      
      // Load initial data
      await this.loadInitialData();
      
      this.isInitialized = true;
      console.log('Firebase initialization completed successfully');
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  // Load initial data from Firebase
  private async loadInitialData(): Promise<void> {
    try {
      console.log('Loading initial data from Firebase...');
      
      // Load all data in parallel
      await Promise.all([
        this.dispatch(loadOrders()),
        this.dispatch(loadTables()),
        this.dispatch(loadMenuItems()),
        this.dispatch(loadInventoryItems()),
        this.dispatch(loadCustomers()),
        this.dispatch(loadStaffMembers()),
        this.dispatch(loadAttendanceRecords()),
        this.dispatch(loadReceipts()),
      ]);
      
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }

  // Check if Firebase is initialized
  isFirebaseInitialized(): boolean {
    return this.isInitialized;
  }

  // Get Firebase auth service
  getAuthService() {
    return createFirebaseAuthService(this.dispatch);
  }
}

// Factory function to create Firebase initializer
export const createFirebaseInitializer = (dispatch: AppDispatch): FirebaseInitializer => {
  return new FirebaseInitializer(dispatch);
};

// Default initializer instance
export let firebaseInitializer: FirebaseInitializer | null = null;

export const initializeFirebase = (dispatch: AppDispatch): FirebaseInitializer => {
  firebaseInitializer = new FirebaseInitializer(dispatch);
  return firebaseInitializer;
};

export const getFirebaseInitializer = (): FirebaseInitializer => {
  if (!firebaseInitializer) {
    throw new Error('Firebase initializer not initialized. Call initializeFirebase first.');
  }
  return firebaseInitializer;
};
