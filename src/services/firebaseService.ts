import { 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove, 
  onValue, 
  off, 
  query, 
  orderByChild, 
  equalTo, 
  limitToLast,
  DataSnapshot,
  Unsubscribe
} from 'firebase/database';
import { createFirestoreService } from './firestoreService';
import { database } from './firebase';
import { Order, OrderItem, InventoryItem, Customer, StaffMember, AttendanceRecord, Receipt } from '../utils/types';
import { cleanOrderData, removeUndefinedValues } from '../utils/orderUtils';

export class FirebaseService {
  private restaurantId: string;
  private listeners: Map<string, Unsubscribe> = new Map();

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  // Helper method to get restaurant-specific path
  private getRestaurantPath(path: string = ''): string {
    return `restaurants/${this.restaurantId}${path ? `/${path}` : ''}`;
  }

  // Helper method to get user path
  private getUserPath(userId: string): string {
    return `restaurant_users/${userId}`;
  }

  // Generic CRUD operations
  async create<T>(path: string, data: T): Promise<string> {
    try {
      const newRef = push(ref(database, this.getRestaurantPath(path)));
      await set(newRef, { ...data, id: newRef.key });
      return newRef.key!;
    } catch (error) {
      console.error('Firebase create error:', error);
      throw error;
    }
  }

  async read<T>(path: string): Promise<T | null> {
    try {
      const snapshot = await get(ref(database, this.getRestaurantPath(path)));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Firebase read error:', error);
      throw error;
    }
  }

  async readAll<T>(path: string): Promise<Record<string, T>> {
    try {
      const snapshot = await get(ref(database, this.getRestaurantPath(path)));
      return snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
      console.error('Firebase readAll error:', error);
      throw error;
    }
  }

  async update(path: string, data: Partial<any>): Promise<void> {
    try {
      await update(ref(database, this.getRestaurantPath(path)), data);
    } catch (error) {
      console.error('Firebase update error:', error);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    try {
      await remove(ref(database, this.getRestaurantPath(path)));
    } catch (error) {
      console.error('Firebase delete error:', error);
      throw error;
    }
  }

  // Real-time listeners
  listenToValue<T>(path: string, callback: (data: T | null) => void): Unsubscribe {
    const listenerRef = ref(database, this.getRestaurantPath(path));
    const unsubscribe = onValue(listenerRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : null;
      callback(data);
    });
    
    this.listeners.set(path, unsubscribe);
    return unsubscribe;
  }

  listenToAll<T>(path: string, callback: (data: Record<string, T>) => void): Unsubscribe {
    const listenerRef = ref(database, this.getRestaurantPath(path));
    const unsubscribe = onValue(listenerRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      callback(data);
    });
    
    this.listeners.set(path, unsubscribe);
    return unsubscribe;
  }

  // Remove specific listener
  removeListener(path: string): void {
    const unsubscribe = this.listeners.get(path);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(path);
    }
  }

  // Remove all listeners
  removeAllListeners(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // Order operations
  async saveOrder(order: Order): Promise<void> {
    try {
      console.log('🔥 FirebaseService.saveOrder - Starting save process');
      console.log('🔥 Original order:', {
        id: order.id,
        restaurantId: order.restaurantId,
        tableId: order.tableId,
        status: order.status,
        itemsCount: order.items?.length || 0,
        items: order.items
      });
      
      // Clean the order data to remove undefined values and ensure proper types
      const cleanOrder = cleanOrderData({
        ...order,
        // Enforce correct restaurant scoping on write
        restaurantId: this.restaurantId,
      });
      
      console.log('🔥 Cleaned order:', {
        id: cleanOrder.id,
        restaurantId: cleanOrder.restaurantId,
        tableId: cleanOrder.tableId,
        status: cleanOrder.status,
        itemsCount: cleanOrder.items?.length || 0,
        items: cleanOrder.items
      });
      
      // Convert items array to object for Firebase storage
      const orderWithItems = {
        ...cleanOrder,
        items: cleanOrder.items.reduce((acc, item, index) => {
          acc[`item_${index}`] = item;
          return acc;
        }, {} as Record<string, OrderItem>)
      };
      
      console.log('🔥 Order with items object:', {
        id: orderWithItems.id,
        itemsObject: orderWithItems.items,
        itemsObjectKeys: Object.keys(orderWithItems.items || {})
      });
      
      // Remove any remaining undefined values from the order data
      const orderData = removeUndefinedValues(orderWithItems);
      
      console.log('🔥 Final order data for Firebase:', {
        id: orderData.id,
        restaurantId: orderData.restaurantId,
        tableId: orderData.tableId,
        status: orderData.status,
        itemsObject: orderData.items,
        itemsObjectKeys: Object.keys(orderData.items || {})
      });
      
      const orderPath = this.getRestaurantPath(`orders/${order.id}`);
      console.log('🔥 Saving to Firebase path:', orderPath);
      
      // Add timeout guard with retries so UI doesn't hang indefinitely on bad network
      const attemptWrite = async (attempt: number): Promise<void> => {
        const writePromise = set(ref(database, orderPath), orderData);
        const timeoutPromise = new Promise((_, reject) => {
          const id = setTimeout(() => reject(new Error('Firebase write timeout (10s)')), 10000);
          writePromise.finally(() => clearTimeout(id));
        });
        try {
          await Promise.race([writePromise, timeoutPromise]);
        } catch (e) {
          if (attempt < 2) { // Reduced retries from 3 to 2
            const delay = 500 * (attempt + 1); // Reduced delay from 1000ms to 500ms
            console.warn(`saveOrder: write attempt ${attempt + 1} failed, retrying in ${delay}ms...`, (e as Error).message);
            await new Promise(r => setTimeout(r, delay));
            return attemptWrite(attempt + 1);
          }
          console.error(`saveOrder: All retry attempts failed. Final error:`, (e as Error).message);
          throw e;
        }
      };
      await attemptWrite(0);
      console.log('✅ Firebase save successful');

      // Mirror to Firestore nested collection (upsert under restaurants/{restaurantId}/orders)
      try {
        console.log('🔥 Mirroring to Firestore...');
        const firestore = createFirestoreService(this.restaurantId);
        await firestore.saveOrder({ ...order, restaurantId: this.restaurantId });
        console.log('✅ Firestore mirror successful');
      } catch (e) {
        console.warn('saveOrder: failed to mirror order to Firestore orders collection:', (e as Error).message);
      }

      // Persist table occupancy in Firestore based on order status
      try {
        if (order.tableId) {
          console.log('🔥 Updating table occupancy...');
          const firestore = createFirestoreService(this.restaurantId);
          const isOccupied = order.status === 'ongoing';
          await firestore.updateTable(order.tableId, { isOccupied });
          console.log('✅ Table occupancy updated');
        }
      } catch (e) {
        console.warn('saveOrder: failed to update Firestore table occupancy:', (e as Error).message);
      }
      
      console.log('✅ FirebaseService.saveOrder - Complete success');
    } catch (error) {
      console.error('❌ Firebase saveOrder error:', error);
      throw error;
    }
  }

  // Simple plain JSON save, similar to saveCustomer/saveTable, keeps items as array and does no mirroring
  async saveOrderPlain(order: any): Promise<void> {
    try {
      const { removeUndefinedValues } = await import('../utils/orderUtils');
      const sanitized: any = removeUndefinedValues({ ...order, restaurantId: this.restaurantId });
      if (!Array.isArray(sanitized.items)) sanitized.items = [];
      else sanitized.items = sanitized.items.map((it: any) => removeUndefinedValues({ ...it }));

      const path = this.getRestaurantPath(`orders/${sanitized.id}`);
      const write = set(ref(database, path), sanitized);
      const timeout = new Promise((_, reject) => {
        const id = setTimeout(() => reject(new Error('Firebase write timeout (10s)')), 10000);
        write.finally(() => clearTimeout(id));
      });
      await Promise.race([write, timeout]);
    } catch (error) {
      console.error('❌ Firebase saveOrderPlain error:', error);
      throw error;
    }
  }

  async getOngoingOrders(): Promise<Order[]> {
    try {
      const ordersRef = ref(database, this.getRestaurantPath('orders'));
      const q = query(ordersRef, orderByChild('status'), equalTo('ongoing'));
      const snapshot = await get(q);
      
      if (!snapshot.exists()) return [];
      
      const ordersData = snapshot.val();
      const results: Order[] = [] as any;
      Object.keys(ordersData).forEach((orderId: string) => {
        const raw: any = ordersData[orderId] || {};
        // Extra guard: drop cross-account orders in case of bad data
        if (raw.restaurantId && raw.restaurantId !== this.restaurantId) return;
        results.push({
          ...(raw as any),
          id: orderId,
          items: raw.items ? Object.values(raw.items) : [],
        } as Order);
      });
      return results;
    } catch (error) {
      console.error('Firebase getOngoingOrders error:', error);
      throw error;
    }
  }

  async getCompletedOrders(): Promise<Order[]> {
    try {
      const ordersRef = ref(database, this.getRestaurantPath('orders'));
      const q = query(ordersRef, orderByChild('status'), equalTo('completed'));
      const snapshot = await get(q);
      
      if (!snapshot.exists()) return [];
      
      const ordersData = snapshot.val();
      const results: Order[] = [] as any;
      Object.keys(ordersData).forEach((orderId: string) => {
        const raw: any = ordersData[orderId] || {};
        if (raw.restaurantId && raw.restaurantId !== this.restaurantId) return;
        results.push({
          ...(raw as any),
          id: orderId,
          items: raw.items ? Object.values(raw.items) : [],
        } as Order);
      });
      return results;
    } catch (error) {
      console.error('Firebase getCompletedOrders error:', error);
      throw error;
    }
  }

  // Debug helper: fetch and log current ongoing orders for this restaurant
  async logOngoingOrders(): Promise<void> {
    try {
      const orders = await this.getOngoingOrders();
      const ids = orders.map(o => o.id);
      console.log('🔥 Ongoing orders for restaurant', this.restaurantId, '=> count:', orders.length, 'ids:', ids);
    } catch (e) {
      console.error('Failed to log ongoing orders:', e);
    }
  }

  // Debug helper: verify order exists in Firebase
  async verifyOrderExists(orderId: string): Promise<boolean> {
    try {
      const orderRef = ref(database, this.getRestaurantPath(`orders/${orderId}`));
      const snapshot = await get(orderRef);
      const exists = snapshot.exists();
      console.log(`🔍 Order ${orderId} exists in Firebase:`, exists);
      if (exists) {
        console.log('📄 Order data:', snapshot.val());
      }
      return exists;
    } catch (error) {
      console.error('❌ Error verifying order:', error);
      return false;
    }
  }

  // Table operations
  async saveTable(table: any): Promise<void> {
    await set(ref(database, this.getRestaurantPath(`tables/${table.id}`)), table);
  }

  async getTables(): Promise<Record<string, any>> {
    return await this.readAll('tables');
  }

  async updateTable(tableId: string, updates: Partial<any>): Promise<void> {
    await this.update(`tables/${tableId}`, updates);
  }

  async deleteTable(tableId: string): Promise<void> {
    await this.delete(`tables/${tableId}`);
  }

  // Menu operations
  async saveMenuItem(menuItem: any): Promise<void> {
    await set(ref(database, this.getRestaurantPath(`menu/${menuItem.id}`)), menuItem);
  }

  async getMenuItems(): Promise<Record<string, any>> {
    return await this.readAll('menu');
  }

  async updateMenuItem(menuItemId: string, updates: Partial<any>): Promise<void> {
    await this.update(`menu/${menuItemId}`, updates);
  }

  async deleteMenuItem(menuItemId: string): Promise<void> {
    await this.delete(`menu/${menuItemId}`);
  }

  // Inventory operations
  async saveInventoryItem(item: InventoryItem): Promise<void> {
    await set(ref(database, this.getRestaurantPath(`inventory/${item.id}`)), item);
  }

  async getInventoryItems(): Promise<Record<string, InventoryItem>> {
    return await this.readAll('inventory');
  }

  async updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): Promise<void> {
    await this.update(`inventory/${itemId}`, updates);
  }

  // Customer operations
  async saveCustomer(customer: Customer): Promise<void> {
    await set(ref(database, this.getRestaurantPath(`customers/${customer.id}`)), customer);
  }

  async getCustomers(): Promise<Record<string, Customer>> {
    const customers = await this.readAll('customers');
    // Filter customers by restaurantId to prevent cross-account visibility
    const filteredCustomers = Object.keys(customers).reduce((acc, customerId) => {
      const customer: any = customers[customerId] || {};
      // Only include customers that belong to this restaurant
      if (!customer.restaurantId || customer.restaurantId === this.restaurantId) {
        acc[customerId] = customer as Customer;
      }
      return acc;
    }, {} as Record<string, Customer>);
    
    return filteredCustomers;
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
    await this.update(`customers/${customerId}`, updates);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.delete(`customers/${customerId}`);
  }

  // Staff operations
  async saveStaffMember(staff: StaffMember): Promise<void> {
    const staffWithRestaurant = { ...staff, restaurantId: this.restaurantId };
    await set(ref(database, this.getRestaurantPath(`staff/${staff.id}`)), staffWithRestaurant);
  }

  async getStaffMembers(): Promise<Record<string, StaffMember>> {
    return await this.readAll('staff');
  }

  async updateStaffMember(staffId: string, updates: Partial<StaffMember>): Promise<void> {
    await this.update(`staff/${staffId}`, updates);
  }

  // Attendance operations
  async saveAttendanceRecord(attendance: AttendanceRecord): Promise<void> {
    await set(ref(database, this.getRestaurantPath(`attendance/${attendance.id}`)), attendance);
  }

  async getAttendanceRecords(): Promise<Record<string, AttendanceRecord>> {
    return await this.readAll('attendance');
  }

  // Receipt operations
  async saveReceipt(receipt: Receipt): Promise<void> {
    const enriched: any = { ...receipt };
    try {
      // Enrich with tableId/tableName if missing
      if ((!enriched.tableId || !enriched.tableName) && enriched.orderId) {
        const orderSnap = await get(ref(database, this.getRestaurantPath(`orders/${enriched.orderId}`)));
        if (orderSnap.exists()) {
          const orderData: any = orderSnap.val();
          if (!enriched.tableId && orderData.tableId) {
            enriched.tableId = orderData.tableId;
          }
          if (!enriched.tableName) {
            // Try lookup from tables collection by tableId
            const tableId = enriched.tableId || orderData.tableId;
            if (tableId) {
              const tableSnap = await get(ref(database, this.getRestaurantPath(`tables/${tableId}`)));
              if (tableSnap.exists()) {
                const tableData: any = tableSnap.val();
                if (tableData?.name) enriched.tableName = tableData.name;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('saveReceipt enrichment failed (Realtime DB):', (e as Error).message);
    }
    await set(ref(database, this.getRestaurantPath(`receipts/${enriched.id}`)), enriched);
  }

  async getReceipts(): Promise<Record<string, Receipt>> {
    try {
      // Cursor-defined variable for the active account ID
      const currentAccountId = this.restaurantId;
      
      console.log('🔍 FirebaseService.getReceipts - Current Account ID:', currentAccountId);
      
      // Create a filtered query to only fetch receipts for this account
      const receiptsRef = ref(database, this.getRestaurantPath('receipts'));
      const filteredQuery = query(
        receiptsRef,
        orderByChild('restaurantId'),
        equalTo(currentAccountId)
      );
      
      console.log('🔍 FirebaseService.getReceipts - Using server-side filtered query for account:', currentAccountId);
      
      const snapshot = await get(filteredQuery);
      const receipts: Record<string, Receipt> = {};
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot: DataSnapshot) => {
          const receiptData = { id: childSnapshot.key, ...childSnapshot.val() } as Receipt;
          receipts[childSnapshot.key!] = receiptData;
          console.log('🔍 FirebaseService.getReceipts - Document:', childSnapshot.key, 'Account ID:', receiptData.restaurantId);
        });
      }
      
      // Canary check to validate results
      const receiptsArray = Object.values(receipts);
      const otherAccountReceipts = receiptsArray.filter((receipt: any) => 
        receipt.restaurantId && receipt.restaurantId !== currentAccountId
      );
      
      if (otherAccountReceipts.length > 0) {
        console.error('🚨 SECURITY: FirebaseService found receipts from other accounts', 
          otherAccountReceipts.map((r: any) => ({ id: r.id, accountId: r.restaurantId }))
        );
        throw new Error(`Security violation: FirebaseService found ${otherAccountReceipts.length} receipts from other accounts`);
      }
      
      console.log('✅ FirebaseService.getReceipts - All receipts belong to current account:', currentAccountId);
      console.log('✅ FirebaseService.getReceipts - Fetched receipts count:', Object.keys(receipts).length);
      return receipts;
      
    } catch (error) {
      console.error('❌ FirebaseService.getReceipts error:', error);
      throw error;
    }
  }

  // Restaurant operations
  async createRestaurant(restaurantData: any): Promise<string> {
    const restaurantId = restaurantData.id || this.restaurantId;
    const restaurantRef = ref(database, `restaurants/${restaurantId}`);
    
    await set(restaurantRef, {
      ...restaurantData,
      id: restaurantId,
      createdAt: Date.now(),
      isActive: true
    });
    
    return restaurantId;
  }

  async getRestaurantInfo(): Promise<any> {
    return await this.read('info');
  }

  async updateRestaurantInfo(updates: Partial<any>): Promise<void> {
    await this.update('info', updates);
  }

  // User management
  async createRestaurantUser(userData: any): Promise<void> {
    await set(ref(database, this.getUserPath(userData.id)), {
      ...userData,
      createdAt: Date.now(),
      isActive: true
    });
  }

  async getUserRestaurant(userId: string): Promise<string | null> {
    try {
      const snapshot = await get(ref(database, this.getUserPath(userId)));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        return userData.restaurantId;
      }
      return null;
    } catch (error) {
      console.error('Firebase getUserRestaurant error:', error);
      throw error;
    }
  }

  // Real-time listeners for specific data types
  listenToOrders(callback: (orders: Record<string, Order>) => void): Unsubscribe {
    return this.listenToAll('orders', (data) => {
      // Convert items from object to array
      const orders = Object.keys(data).reduce((acc, orderId) => {
        const raw: any = data[orderId] || {};
        const normalized = {
          ...raw,
          id: orderId,
          items: raw && raw.items ? Object.values(raw.items) as any[] : [],
        } as any;
        // Extra guard: drop cross-account orders
        if (!normalized.restaurantId || normalized.restaurantId === this.restaurantId) {
          acc[orderId] = normalized as Order;
        }
        return acc;
      }, {} as Record<string, Order>);
      
      callback(orders);
    });
  }

  // Listen only to ongoing orders for the current restaurant (scoped path prevents cross-account)
  listenToOngoingOrders(callback: (orders: Record<string, Order>) => void): Unsubscribe {
    const ordersRef = ref(database, this.getRestaurantPath('orders'));
    const ongoingQuery = query(ordersRef, orderByChild('status'), equalTo('ongoing'));
    const unsubscribe = onValue(ongoingQuery, (snapshot) => {
      const data: Record<string, any> = snapshot.exists() ? (snapshot.val() as Record<string, any>) : {};
      // Normalize items objects to arrays
      const normalized: Record<string, Order> = {} as any;
      Object.keys(data).forEach((orderId) => {
        const o: any = data[orderId] || {};
        const n: any = {
          ...o,
          id: orderId,
          items: (o && (o as any).items) ? Object.values((o as any).items as any) : [],
        };
        // Extra guard: drop cross-account orders
        if (!n.restaurantId || n.restaurantId === this.restaurantId) {
          normalized[orderId] = n as Order;
        }
      });
      callback(normalized);
    });
    this.listeners.set('orders:ongoing', unsubscribe);
    return unsubscribe;
  }

  listenToTables(callback: (tables: Record<string, any>) => void): Unsubscribe {
    return this.listenToAll('tables', callback);
  }

  listenToMenuItems(callback: (menuItems: Record<string, any>) => void): Unsubscribe {
    return this.listenToAll('menu', callback);
  }

  listenToInventoryItems(callback: (items: Record<string, InventoryItem>) => void): Unsubscribe {
    return this.listenToAll('inventory', callback);
  }

  listenToCustomers(callback: (customers: Record<string, Customer>) => void): Unsubscribe {
    return this.listenToAll('customers', (data) => {
      // Filter customers by restaurantId to prevent cross-account visibility
      const filteredCustomers = Object.keys(data).reduce((acc, customerId) => {
        const customer: any = data[customerId] || {};
        // Only include customers that belong to this restaurant
        if (!customer.restaurantId || customer.restaurantId === this.restaurantId) {
          acc[customerId] = customer as Customer;
        }
        return acc;
      }, {} as Record<string, Customer>);
      
      callback(filteredCustomers);
    });
  }

  listenToStaffMembers(callback: (staff: Record<string, StaffMember>) => void): Unsubscribe {
    return this.listenToAll('staff', callback);
  }

  listenToAttendanceRecords(callback: (attendance: Record<string, AttendanceRecord>) => void): Unsubscribe {
    return this.listenToAll('attendance', callback);
  }

  listenToReceipts(callback: (receipts: Record<string, Receipt>) => void): Unsubscribe {
    try {
      // Cursor-defined variable for the active account ID
      const currentAccountId = this.restaurantId;
      
      console.log('🔍 FirebaseService.listenToReceipts - Current Account ID:', currentAccountId);
      
      // Create a filtered query to only listen to receipts for this account
      const receiptsRef = ref(database, this.getRestaurantPath('receipts'));
      const filteredQuery = query(
        receiptsRef,
        orderByChild('restaurantId'),
        equalTo(currentAccountId)
      );
      
      console.log('🔍 FirebaseService.listenToReceipts - Using server-side filtered query for account:', currentAccountId);
      
      const unsubscribe = onValue(filteredQuery, (snapshot) => {
        const receipts: Record<string, Receipt> = {};
        
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot: DataSnapshot) => {
            const receiptData = { id: childSnapshot.key, ...childSnapshot.val() } as Receipt;
            receipts[childSnapshot.key!] = receiptData;
          });
        }
        
        // Canary check for real-time updates
        const receiptsArray = Object.values(receipts);
        const otherAccountReceipts = receiptsArray.filter((receipt: any) => 
          receipt.restaurantId && receipt.restaurantId !== currentAccountId
        );
        
        if (otherAccountReceipts.length > 0) {
          console.error('🚨 SECURITY: FirebaseService real-time update contains receipts from other accounts', 
            otherAccountReceipts.map((r: any) => ({ id: r.id, accountId: r.restaurantId }))
          );
        }
        
        console.log('🔍 FirebaseService.listenToReceipts - Real-time update:', {
          currentAccountId: currentAccountId,
          receiptsCount: Object.keys(receipts).length,
          otherAccountReceipts: otherAccountReceipts.length
        });
        
        callback(receipts);
      });
      
      return unsubscribe;
      
    } catch (error) {
      console.error('❌ FirebaseService.listenToReceipts error:', error);
      throw error;
    }
  }
}

// Factory function to create Firebase service instance
export const createFirebaseService = (restaurantId: string): FirebaseService => {
  return new FirebaseService(restaurantId);
};

// Default service instance (will be set when restaurant is determined)
export let firebaseService: FirebaseService | null = null;

export const initializeFirebaseService = (restaurantId: string): FirebaseService => {
  console.log('🔥 Initializing Firebase service for restaurant:', restaurantId);
  firebaseService = new FirebaseService(restaurantId);
  console.log('✅ Firebase service initialized successfully');
  return firebaseService;
};

export const getFirebaseService = (): FirebaseService => {
  if (!firebaseService) {
    throw new Error('Firebase service not initialized. Call initializeFirebaseService first.');
  }
  return firebaseService;
};
