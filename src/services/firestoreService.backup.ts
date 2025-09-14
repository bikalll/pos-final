import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Order, OrderItem, InventoryItem, Customer, StaffMember, AttendanceRecord, Receipt } from '../utils/types';

export class FirestoreService {
  private restaurantId: string;
  private listeners: Map<string, Unsubscribe> = new Map();

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  // Helper method to get restaurant-specific collection
  private getCollection(collectionName: string) {
    const collectionPath = `restaurants/${this.restaurantId}/${collectionName}`;
    console.log('🔍 FirestoreService.getCollection - Path:', collectionPath, 'Restaurant ID:', this.restaurantId);
    console.log('🔍 FirestoreService.getCollection - Full path breakdown:', {
      restaurantId: this.restaurantId,
      collectionName: collectionName,
      fullPath: collectionPath
    });
    return collection(firestore, collectionPath);
  }

  // Helper method to get restaurant document
  private getRestaurantDoc() {
    return doc(firestore, `restaurants/${this.restaurantId}`);
  }

  // Generic CRUD operations
  async create<T>(collectionName: string, data: T): Promise<string> {
    try {
      const docRef = await addDoc(this.getCollection(collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Firestore create error:', error);
      throw error;
    }
  }

  async setDocument<T>(collectionName: string, docId: string, data: T): Promise<void> {
    try {
      console.log('🔥 Setting document with ID:', docId, 'Data:', data);
      await setDoc(doc(this.getCollection(collectionName), docId), {
        ...data,
        id: docId, // Ensure the ID is included in the document data
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Document set successfully with ID:', docId);
    } catch (error) {
      console.error('Firestore setDocument error:', error);
      throw error;
    }
  }

  async read<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
      const docRef = doc(this.getCollection(collectionName), docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error('Firestore read error:', error);
      throw error;
    }
  }

  async readAll<T>(collectionName: string): Promise<Record<string, T>> {
    try {
      const collectionRef = this.getCollection(collectionName);
      console.log('🔍 FirestoreService.readAll - Collection path:', collectionRef.path);
      console.log('🔍 FirestoreService.readAll - Restaurant ID:', this.restaurantId);
      
      const querySnapshot = await getDocs(collectionRef);
      const data: Record<string, T> = {};
      
      console.log('🔍 FirestoreService.readAll - Query snapshot size:', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const docData = { id: doc.id, ...doc.data() } as T;
        data[doc.id] = docData;
        console.log('🔍 FirestoreService.readAll - Document:', doc.id, 'Data:', docData);
      });
      
      console.log('🔍 FirestoreService.readAll - Final data count:', Object.keys(data).length);
      return data;
    } catch (error) {
      console.error('Firestore readAll error:', error);
      throw error;
    }
  }

  async update<T>(collectionName: string, docId: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(this.getCollection(collectionName), docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Firestore update error:', error);
      throw error;
    }
  }

  async delete(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(this.getCollection(collectionName), docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore delete error:', error);
      throw error;
    }
  }

  // Real-time listeners
  listenToCollection<T>(
    collectionName: string, 
    callback: (data: Record<string, T>) => void,
    orderByField?: string,
    limitCount?: number
  ): Unsubscribe {
    let q = this.getCollection(collectionName);
    
    if (orderByField) {
      q = query(q, orderBy(orderByField));
    }
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Record<string, T> = {};
      querySnapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() } as T;
      });
      callback(data);
    });

    this.listeners.set(collectionName, unsubscribe);
    return unsubscribe;
  }

  // Stop all listeners
  stopAllListeners(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  // Order operations
  async createOrder(order: Omit<Order, 'id'>): Promise<string> {
    return this.create('orders', order);
  }

  async getOrders(): Promise<Record<string, Order>> {
    return this.readAll<Order>('orders');
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    return this.update('orders', orderId, updates);
  }

  async deleteOrder(orderId: string): Promise<void> {
    return this.delete('orders', orderId);
  }

  listenToOrders(callback: (orders: Record<string, Order>) => void): Unsubscribe {
    return this.listenToCollection('orders', callback, 'createdAt');
  }

  // Table operations
  async createTable(table: Omit<any, 'id'>): Promise<string> {
    return this.create('tables', table);
  }

  async getTables(): Promise<Record<string, any>> {
    return this.readAll('tables');
  }

  async updateTable(tableId: string, updates: Partial<any>): Promise<void> {
    return this.update('tables', tableId, updates);
  }

  async deleteTable(tableId: string): Promise<void> {
    return this.delete('tables', tableId);
  }

  listenToTables(callback: (tables: Record<string, any>) => void): Unsubscribe {
    return this.listenToCollection('tables', callback);
  }

  // Create default tables for a new restaurant with specific IDs
  async createDefaultTables(): Promise<void> {
    const defaultTables = [
      { id: 'table-1', name: 'Table 1', seats: 4, description: 'Standard 4-seater table', isActive: true, isMerged: false },
      { id: 'table-2', name: 'Table 2', seats: 4, description: 'Standard 4-seater table', isActive: true, isMerged: false },
      { id: 'table-3', name: 'Table 3', seats: 6, description: 'Large 6-seater table', isActive: true, isMerged: false },
      { id: 'table-4', name: 'Table 4', seats: 6, description: 'Large 6-seater table', isActive: true, isMerged: false },
    ];

    try {
      for (const table of defaultTables) {
        // Use setDoc with specific ID instead of addDoc
        await this.setDocument('tables', table.id, {
          ...table,
          restaurantId: this.restaurantId,
          createdAt: new Date().toISOString(),
        });
      }
      console.log('Default tables created successfully with specific IDs');
    } catch (error) {
      console.error('Error creating default tables:', error);
      throw error;
    }
  }

  // Clean up and recreate tables with proper IDs
  async cleanupAndRecreateTables(): Promise<void> {
    try {
      console.log('🧹 Starting table cleanup and recreation...');
      
      // Get all existing tables
      const existingTables = await this.getTables();
      console.log('📊 Existing tables:', existingTables);
      
      // Delete all existing tables
      for (const tableId of Object.keys(existingTables)) {
        await this.deleteTable(tableId);
        console.log('🗑️ Deleted table:', tableId);
      }
      
      // Create default tables with proper IDs
      await this.createDefaultTables();
      
      console.log('✅ Table cleanup and recreation completed');
    } catch (error) {
      console.error('Error during table cleanup:', error);
      throw error;
    }
  }

  // Menu operations
  async createMenuItem(item: Omit<any, 'id'>): Promise<string> {
    return this.create('menu', item);
  }

  async getMenuItems(): Promise<Record<string, any>> {
    return this.readAll('menu');
  }

  async updateMenuItem(itemId: string, updates: Partial<any>): Promise<void> {
    return this.update('menu', itemId, updates);
  }

  async deleteMenuItem(itemId: string): Promise<void> {
    return this.delete('menu', itemId);
  }

  listenToMenuItems(callback: (items: Record<string, any>) => void): Unsubscribe {
    return this.listenToCollection('menu', callback);
  }

  // Category operations
  async createCategory(name: string): Promise<string> {
    return this.create('categories', { 
      name,
      restaurantId: this.restaurantId // Ensure restaurant ID is included
    });
  }

  async getCategories(): Promise<{id: string, name: string}[]> {
    const categories = await this.readAll('categories');
    return Object.entries(categories).map(([id, data]) => ({
      id,
      name: data.name || '',
    }));
  }

  async updateCategory(categoryId: string, name: string): Promise<void> {
    return this.update('categories', categoryId, { name });
  }

  async deleteCategory(categoryId: string): Promise<void> {
    return this.delete('categories', categoryId);
  }

  listenToCategories(callback: (categories: Record<string, any>) => void): Unsubscribe {
    return this.listenToCollection('categories', callback);
  }

  // Initialize default menu items
  async initializeDefaultMenuItems(): Promise<void> {
    try {
      // Check if menu items already exist
      const existingItems = await this.getMenuItems();
      if (Object.keys(existingItems).length > 0) {
        console.log('Menu items already exist, skipping initialization');
        return;
      }

      console.log('Initializing default categories and menu items...');

      // Default categories
      const defaultCategories = [
        { id: 'pizza', name: 'Pizza', description: 'Fresh pizzas made to order' },
        { id: 'salad', name: 'Salad', description: 'Fresh and healthy salads' },
        { id: 'beverages', name: 'Beverages', description: 'Refreshing drinks and beverages' },
      ];

      // Create categories first
      for (const category of defaultCategories) {
        await this.createCategory(category);
        console.log(`Created default category: ${category.name}`);
      }

      // Default menu items
      const defaultMenuItems = [
        {
          id: 'margherita',
          name: 'Margherita Pizza',
          description: 'Fresh mozzarella, tomato sauce, basil',
          price: 299,
          category: 'pizza',
          isAvailable: true,
          modifiers: ['Extra Cheese', 'Extra Sauce', 'Gluten Free'],
          image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd2?w=150&h=150&fit=crop&crop=center',
          orderType: 'KOT',
          ingredients: [
            { name: 'Pizza Dough', quantity: 1, unit: 'piece' },
            { name: 'Tomato Sauce', quantity: 100, unit: 'ml' },
            { name: 'Mozzarella Cheese', quantity: 150, unit: 'g' },
            { name: 'Fresh Basil', quantity: 5, unit: 'leaves' },
          ],
        },
        {
          id: 'pepperoni',
          name: 'Pepperoni Pizza',
          description: 'Spicy pepperoni, mozzarella, tomato sauce',
          price: 349,
          category: 'pizza',
          isAvailable: true,
          modifiers: ['Extra Cheese', 'Extra Pepperoni', 'Thin Crust'],
          image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&h=150&fit=crop&crop=center',
          orderType: 'KOT',
          ingredients: [
            { name: 'Pizza Dough', quantity: 1, unit: 'piece' },
            { name: 'Tomato Sauce', quantity: 100, unit: 'ml' },
            { name: 'Mozzarella Cheese', quantity: 150, unit: 'g' },
            { name: 'Pepperoni', quantity: 80, unit: 'g' },
          ],
        },
        {
          id: 'caesar',
          name: 'Chicken Caesar Salad',
          description: 'Romaine lettuce, grilled chicken, parmesan',
          price: 249,
          category: 'salad',
          isAvailable: true,
          modifiers: ['No Croutons', 'Extra Chicken', 'Dressing on Side'],
          image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=150&h=150&fit=crop&crop=center',
          orderType: 'KOT',
          ingredients: [
            { name: 'Romaine Lettuce', quantity: 200, unit: 'g' },
            { name: 'Grilled Chicken', quantity: 150, unit: 'g' },
            { name: 'Parmesan Cheese', quantity: 30, unit: 'g' },
            { name: 'Caesar Dressing', quantity: 50, unit: 'ml' },
            { name: 'Croutons', quantity: 20, unit: 'g' },
          ],
        },
      ];

      // Create each menu item
      for (const item of defaultMenuItems) {
        await this.createMenuItem(item);
        console.log(`Created default menu item: ${item.name}`);
      }

      console.log('Default categories and menu items initialized successfully');
    } catch (error) {
      console.error('Error initializing default menu items:', error);
      throw error;
    }
  }

  // Inventory operations
  async createInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<string> {
    return this.create('inventory', item);
  }

  async getInventoryItems(): Promise<Record<string, InventoryItem>> {
    return this.readAll<InventoryItem>('inventory');
  }

  async updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): Promise<void> {
    return this.update('inventory', itemId, updates);
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    return this.delete('inventory', itemId);
  }

  listenToInventoryItems(callback: (items: Record<string, InventoryItem>) => void): Unsubscribe {
    return this.listenToCollection('inventory', callback);
  }

  // Customer operations
  async createCustomer(customer: Omit<Customer, 'id'>): Promise<string> {
    return this.create('customers', customer);
  }

  async getCustomers(): Promise<Record<string, Customer>> {
    return this.readAll<Customer>('customers');
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
    return this.update('customers', customerId, updates);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    return this.delete('customers', customerId);
  }

  listenToCustomers(callback: (customers: Record<string, Customer>) => void): Unsubscribe {
    return this.listenToCollection('customers', callback);
  }

  // Staff operations
  async createStaffMember(staff: Omit<StaffMember, 'id'>): Promise<string> {
    return this.create('staff', staff);
  }

  async getStaffMembers(): Promise<Record<string, StaffMember>> {
    return this.readAll<StaffMember>('staff');
  }

  async updateStaffMember(staffId: string, updates: Partial<StaffMember>): Promise<void> {
    return this.update('staff', staffId, updates);
  }

  async deleteStaffMember(staffId: string): Promise<void> {
    return this.delete('staff', staffId);
  }

  listenToStaffMembers(callback: (staff: Record<string, StaffMember>) => void): Unsubscribe {
    return this.listenToCollection('staff', callback);
  }

  // Receipt operations
  async createReceipt(receipt: Omit<Receipt, 'id'>): Promise<string> {
    return this.create('receipts', receipt);
  }

  async getReceipts(): Promise<Record<string, Receipt>> {
    try {
      // Cursor-defined variable for the active account ID
      const currentAccountId = this.restaurantId;
      
      console.log('🔍 FirestoreService.getReceipts - Current Account ID:', currentAccountId);
      
      // Use nested path: /restaurants/{accountId}/receipts (preferred approach)
      const collectionRef = this.getCollection('receipts');
      console.log('🔍 FirestoreService.getReceipts - Collection path:', collectionRef.path);
      
      // Server-side filtered query using accountId
      const filteredQuery = query(
        collectionRef,
        where('restaurantId', '==', currentAccountId)
      );
      
      console.log('🔍 FirestoreService.getReceipts - Using server-side filtered query for account:', currentAccountId);
      
      const querySnapshot = await getDocs(filteredQuery);
      const receipts: Record<string, Receipt> = {};
      
      console.log('🔍 FirestoreService.getReceipts - Query snapshot size:', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const receiptData = { id: doc.id, ...doc.data() } as Receipt;
        receipts[doc.id] = receiptData;
        console.log('🔍 FirestoreService.getReceipts - Document:', doc.id, 'Account ID:', receiptData.restaurantId);
      });
      
      // Step 3: Canary check + logs to validate
      const receiptsArray = Object.values(receipts);
      const otherAccountReceipts = receiptsArray.filter((receipt: any) => 
        receipt.restaurantId && receipt.restaurantId !== currentAccountId
      );
      
      if (otherAccountReceipts.length > 0) {
        console.error('🚨 SECURITY: Receipts from other accounts found', 
          otherAccountReceipts.map((r: any) => ({ id: r.id, accountId: r.restaurantId }))
        );
        throw new Error(`Security violation: Found ${otherAccountReceipts.length} receipts from other accounts`);
      }
      
      // Client-side sorting by createdAt (desc) since we removed orderBy to avoid index requirement
      const sortedReceipts: Record<string, Receipt> = {};
      Object.values(receipts)
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return bTime.getTime() - aTime.getTime();
        })
        .forEach((receipt) => {
          sortedReceipts[receipt.id] = receipt;
        });
      
      console.log('✅ FirestoreService.getReceipts - All receipts belong to current account:', currentAccountId);
      console.log('✅ FirestoreService.getReceipts - Fetched receipts count:', Object.keys(sortedReceipts).length);
      return sortedReceipts;
      
    } catch (error) {
      console.error('❌ FirestoreService.getReceipts error:', error);
      throw error;
    }
  }

  async updateReceipt(receiptId: string, updates: Partial<Receipt>): Promise<void> {
    return this.update('receipts', receiptId, updates);
  }

  async deleteReceipt(receiptId: string): Promise<void> {
    return this.delete('receipts', receiptId);
  }

  listenToReceipts(callback: (receipts: Record<string, Receipt>) => void): Unsubscribe {
    try {
      // Cursor-defined variable for the active account ID
      const currentAccountId = this.restaurantId;
      
      console.log('🔍 FirestoreService.listenToReceipts - Current Account ID:', currentAccountId);
      
      // Use nested path: /restaurants/{accountId}/receipts
      const collectionRef = this.getCollection('receipts');
      console.log('🔍 FirestoreService.listenToReceipts - Collection path:', collectionRef.path);
      
      // Server-side filtered query using accountId
      const filteredQuery = query(
        collectionRef,
        where('restaurantId', '==', currentAccountId)
      );
      
      console.log('🔍 FirestoreService.listenToReceipts - Using server-side filtered query for account:', currentAccountId);
      
      const unsubscribe = onSnapshot(filteredQuery, (querySnapshot) => {
        const receipts: Record<string, Receipt> = {};
        
        querySnapshot.forEach((doc) => {
          const receiptData = { id: doc.id, ...doc.data() } as Receipt;
          receipts[doc.id] = receiptData;
        });
        
        // Canary check for real-time updates
        const receiptsArray = Object.values(receipts);
        const otherAccountReceipts = receiptsArray.filter((receipt: any) => 
          receipt.restaurantId && receipt.restaurantId !== currentAccountId
        );
        
        if (otherAccountReceipts.length > 0) {
          console.error('🚨 SECURITY: Real-time update contains receipts from other accounts', 
            otherAccountReceipts.map((r: any) => ({ id: r.id, accountId: r.restaurantId }))
          );
        }
        
        // Client-side sorting by createdAt (desc) since we removed orderBy to avoid index requirement
        const sortedReceipts: Record<string, Receipt> = {};
        Object.values(receipts)
          .sort((a: any, b: any) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return bTime.getTime() - aTime.getTime();
          })
          .forEach((receipt) => {
            sortedReceipts[receipt.id] = receipt;
          });
        
        console.log('🔍 FirestoreService.listenToReceipts - Real-time update:', {
          currentAccountId: currentAccountId,
          receiptsCount: Object.keys(sortedReceipts).length,
          otherAccountReceipts: otherAccountReceipts.length
        });
        
        callback(sortedReceipts);
      });
      
      this.listeners.set('receipts', unsubscribe);
      return unsubscribe;
      
    } catch (error) {
      console.error('❌ FirestoreService.listenToReceipts error:', error);
      throw error;
    }
  }

  // Restaurant operations
  async createRestaurant(restaurantData: any): Promise<string> {
    try {
      const restaurantRef = this.getRestaurantDoc();
      await setDoc(restaurantRef, {
        ...restaurantData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return this.restaurantId;
    } catch (error) {
      console.error('Firestore createRestaurant error:', error);
      throw error;
    }
  }

  async getRestaurantInfo(): Promise<any> {
    try {
      const restaurantRef = this.getRestaurantDoc();
      const docSnap = await getDoc(restaurantRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Firestore getRestaurantInfo error:', error);
      throw error;
    }
  }

  async updateRestaurantInfo(updates: Partial<any>): Promise<void> {
    try {
      const restaurantRef = this.getRestaurantDoc();
      await updateDoc(restaurantRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Firestore updateRestaurantInfo error:', error);
      throw error;
    }
  }

  // User management
  async createRestaurantUser(userData: any): Promise<void> {
    try {
      const userRef = doc(firestore, `users/${userData.id}`);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Firestore createRestaurantUser error:', error);
      throw error;
    }
  }

  async getUserRestaurant(userId: string): Promise<string | null> {
    try {
      const userRef = doc(firestore, `users/${userId}`);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.restaurantId || null;
      }
      return null;
    } catch (error) {
      console.error('Firestore getUserRestaurant error:', error);
      throw error;
    }
  }
}

// Factory function to create Firestore service instance
export const createFirestoreService = (restaurantId: string): FirestoreService => {
  return new FirestoreService(restaurantId);
};

// Default service instance (will be set when restaurant is determined)
export let firestoreService: FirestoreService | null = null;

export const initializeFirestoreService = (restaurantId: string): FirestoreService => {
  firestoreService = new FirestoreService(restaurantId);
  return firestoreService;
};

export const getFirestoreService = (): FirestoreService => {
  if (!firestoreService) {
    throw new Error('Firestore service not initialized. Call initializeFirestoreService first.');
  }
  return firestoreService;
};
















