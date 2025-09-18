// services/firestoreService.ts
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  onSnapshot,
  serverTimestamp,
  where,
  writeBatch
} from "firebase/firestore";
import { Unsubscribe } from "firebase/firestore";
import { cleanOrderData, removeUndefinedValues } from '../utils/orderUtils';

// Legacy class-based service for backward compatibility
export class FirestoreService {
  private restaurantId: string;
  private db: any;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
    this.db = getFirestore();
  }

  private getCollection(collectionName: string) {
    return collection(this.db, "restaurants", this.restaurantId, collectionName);
  }

  async getReceipts(): Promise<Record<string, any>> {
    return createFirestoreService(this.restaurantId).getReceipts();
  }

  async getTables(): Promise<Record<string, any>> {
    return createFirestoreService(this.restaurantId).getTables();
  }

  async saveReceipt(receipt: Record<string, any>) {
    return createFirestoreService(this.restaurantId).saveReceipt(receipt);
  }

  async createDefaultTables() {
    return createFirestoreService(this.restaurantId).createDefaultTables();
  }

  // Core CRUD operations
  async create<T>(collectionName: string, data: T): Promise<string> {
    try {
      const docRef = await addDoc(this.getCollection(collectionName), {
        ...data,
        restaurantId: this.restaurantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Firestore create error:', error);
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
      const q = query(this.getCollection(collectionName));
      const snap = await getDocs(q);
      const out: Record<string, T> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as T;
      });
      return out;
    } catch (error) {
      console.error('Firestore readAll error:', error);
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

  // Restaurant info
  async getRestaurantInfo(): Promise<any> {
    try {
      const restaurantDoc = await this.read('restaurant', 'info');
      return restaurantDoc;
    } catch (error) {
      console.error('Error getting restaurant info:', error);
      return null;
    }
  }

  // Listen to collection changes
  listenToCollection<T>(
    collectionName: string, 
    callback: (data: Record<string, T>) => void,
    orderByField?: string
  ): Unsubscribe {
    let q = query(this.getCollection(collectionName));
    
    if (orderByField) {
      try {
        q = query(this.getCollection(collectionName), orderBy(orderByField, "desc"));
      } catch (error) {
        console.log('OrderBy failed, using basic query:', error);
      }
    }

    return onSnapshot(q, (snap) => {
      const out: Record<string, T> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as T;
      });
      callback(out);
    });
  }

  // Menu operations
  async getMenuItems(): Promise<Record<string, any>> {
    return this.readAll('menu');
  }

  async createMenuItem(item: any): Promise<string> {
    return this.create('menu', item);
  }

  async updateMenuItem(itemId: string, updates: any): Promise<void> {
    return this.update('menu', itemId, updates);
  }

  async deleteMenuItem(itemId: string): Promise<void> {
    return this.delete('menu', itemId);
  }

  // Categories operations
  async getCategories(): Promise<Record<string, any>> {
    return this.readAll('categories');
  }

  async createCategory(category: any): Promise<string> {
    return this.create('categories', category);
  }

  async updateCategory(categoryId: string, updates: any): Promise<void> {
    return this.update('categories', categoryId, updates);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    return this.delete('categories', categoryId);
  }

  // Orders operations
  async getOrders(): Promise<Record<string, any>> {
    return this.readAll('orders');
  }

  async createOrder(order: any): Promise<string> {
    return this.create('orders', order);
  }

  async updateOrder(orderId: string, updates: any): Promise<void> {
    return this.update('orders', orderId, updates);
  }

  async deleteOrder(orderId: string): Promise<void> {
    return this.delete('orders', orderId);
  }

  // Customers operations
  async getCustomers(): Promise<Record<string, any>> {
    return this.readAll('customers');
  }

  async createCustomer(customer: any): Promise<string> {
    return this.create('customers', customer);
  }

  async updateCustomer(customerId: string, updates: any): Promise<void> {
    return this.update('customers', customerId, updates);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    return this.delete('customers', customerId);
  }

  // Staff operations
  async getStaffMembers(): Promise<Record<string, any>> {
    return this.readAll('staff');
  }

  async createStaffMember(staff: any): Promise<string> {
    return this.create('staff', staff);
  }

  async updateStaffMember(staffId: string, updates: any): Promise<void> {
    return this.update('staff', staffId, updates);
  }

  async deleteStaffMember(staffId: string): Promise<void> {
    return this.delete('staff', staffId);
  }

  // Inventory operations
  async getInventoryItems(): Promise<Record<string, any>> {
    return this.readAll('inventory');
  }

  async createInventoryItem(item: any): Promise<string> {
    return this.create('inventory', item);
  }

  async updateInventoryItem(itemId: string, updates: any): Promise<void> {
    return this.update('inventory', itemId, updates);
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    return this.delete('inventory', itemId);
  }
}

export function createFirestoreService(restaurantId: string) {
  const db = getFirestore();
  const currentRestaurantId = restaurantId; // Cursor must set this dynamically

  const receiptsCol = () => {
    const path = `restaurants/${currentRestaurantId}/receipts`;
    console.log('🔍 FirestoreService - Creating receipts collection reference:', path);
    return collection(db, "restaurants", currentRestaurantId, "receipts");
  };
  const tablesCol = () => collection(db, "restaurants", currentRestaurantId, "tables");
  const tableDoc = (tableId: string) => doc(db, "restaurants", currentRestaurantId, "tables", tableId);
  const customersCol = () => collection(db, "restaurants", currentRestaurantId, "customers");
  const customerHistoryCol = (customerId: string) => collection(db, "restaurants", currentRestaurantId, "customers", customerId, "history");
  const receiptsCollection = () => collection(db, "restaurants", currentRestaurantId, "receipts");
  // Order subcollections per requested structure (use a fixed doc level between collections)
  const ongoingOrdersCol = () => collection(db, "restaurants", currentRestaurantId, "orders", "root", "ongoingOrders");
  const processedOrdersCol = () => collection(db, "restaurants", currentRestaurantId, "orders", "root", "processedOrders");

  async function getReceipts(): Promise<Record<string, any>> {
    console.log('🔍 FirestoreService.getReceipts - Starting...');
    console.log('🔍 FirestoreService.getReceipts - Current Restaurant ID:', currentRestaurantId);
    console.log('🔍 FirestoreService.getReceipts - Collection path: restaurants/' + currentRestaurantId + '/receipts');

    // First, let's check if there are any receipts in the old flat collection
    try {
      const oldReceiptsCol = collection(db, "receipts");
      const oldSnap = await getDocs(oldReceiptsCol);
      console.log('🔍 FirestoreService.getReceipts - Old flat collection "receipts" has', oldSnap.size, 'documents');
      if (oldSnap.size > 0) {
        console.log('⚠️ Found receipts in old flat collection - these need to be migrated to nested structure');
        oldSnap.forEach(doc => {
          const data = doc.data();
          console.log('  - Old receipt:', doc.id, 'restaurantId:', data.restaurantId, 'customerName:', data.customerName);
        });
        console.log('⚠️ WARNING: App might be loading from old collection instead of nested structure!');
      }
    } catch (error) {
      console.log('🔍 FirestoreService.getReceipts - Could not check old collection:', (error as Error).message);
    }
    
    try {
      // Use nested path for security - no need for where clause since path already filters by restaurantId
      const q = query(receiptsCol());
      console.log('🔍 FirestoreService.getReceipts - Using nested path query (restaurants/' + currentRestaurantId + '/receipts)');
      
      const snap = await getDocs(q);
      console.log('🔍 FirestoreService.getReceipts - Query executed, snapshot size:', snap.size);
      
      const out: Record<string, any> = {};
      const latestByOrderId: Record<string, any> = {};
      let processedCount = 0;
      let skippedCount = 0;
      
      snap.forEach(docSnap => {
        const data = docSnap.data() as any;
        console.log('🔍 FirestoreService.getReceipts - Processing document:', docSnap.id, {
          hasRestaurantId: !!data.restaurantId,
          restaurantId: data.restaurantId,
          expectedRestaurantId: currentRestaurantId,
          customerName: data.customerName,
          amount: data.amount
        });
        
        // Security check: Ensure restaurantId matches (should not happen with nested paths, but safety first)
        if (data.restaurantId && data.restaurantId !== currentRestaurantId) {
          console.error("🚨 SECURITY: receipt.restaurantId mismatch (skipping)", {
            docId: docSnap.id,
            receiptRestaurantId: data.restaurantId,
            expected: currentRestaurantId
          });
          skippedCount++;
          return; // skip mismatched
        }
        
        // Ensure restaurantId is set for any receipts that might be missing it
        if (!data.restaurantId) {
          console.log('🔧 FirestoreService.getReceipts - Receipt missing restaurantId, setting to:', currentRestaurantId);
          data.restaurantId = currentRestaurantId;
        }
        
        const receipt = { id: docSnap.id, ...data } as any;
        out[docSnap.id] = receipt;
        // Track latest by orderId to collapse duplicates
        const oid = (receipt.orderId || docSnap.id);
        const current = latestByOrderId[oid];
        if (!current || ((receipt.timestamp || receipt.createdAt || 0) > (current.timestamp || current.createdAt || 0))) {
          latestByOrderId[oid] = receipt;
        }
        processedCount++;
      });
      
      // Deduplicate by orderId, keep latest, then sort by timestamp desc
      const sortedReceipts: Record<string, any> = {};
      Object.values(latestByOrderId)
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
        .forEach((receipt: any) => {
          sortedReceipts[receipt.id] = receipt;
        });

      console.log('✅ FirestoreService.getReceipts - Results:', {
        totalDocuments: snap.size,
        processedCount: processedCount,
        skippedCount: skippedCount,
        finalOutputCount: Object.keys(sortedReceipts).length,
        dedupedCount: Object.keys(latestByOrderId).length
      });
      
      return sortedReceipts;
    } catch (error) {
      console.error('❌ FirestoreService.getReceipts - Error:', error);
      throw error;
    }
  }

  async function getTables(): Promise<Record<string, any>> {
    const snap = await getDocs(tablesCol());
    const out: Record<string, any> = {};
    snap.forEach(d => out[d.id] = { id: d.id, ...d.data() });
    return out;
  }

  // Create or overwrite a document with a specific ID
  async function setDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const target = doc(db, "restaurants", currentRestaurantId, collectionName, docId);
    await setDoc(target, {
      ...data,
      restaurantId: data?.restaurantId || currentRestaurantId,
      updatedAt: serverTimestamp(),
    });
  }

  // Restaurant operations
  async function createRestaurant(info: any): Promise<void> {
    await setDocument('restaurant', 'info', info);
  }

  // Table helpers for convenience (used by TableManagementScreen)
  async function updateTable(tableId: string, updates: Partial<any>): Promise<void> {
    try {
      console.log('🔄 FirestoreService: updateTable called:', {
        tableId,
        updates
      });
      
      // Check if the table document exists before updating
      const tableRef = tableDoc(tableId);
      const tableSnap = await getDoc(tableRef);
      
      if (!tableSnap.exists()) {
        console.log(`Table ${tableId} does not exist in Firestore, skipping update`);
        return;
      }
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      console.log('🔄 FirestoreService: Updating table with data:', {
        tableId,
        updateData
      });
      
      await updateDoc(tableRef, updateData);
      
      console.log('✅ FirestoreService: Table updated successfully:', tableId);
    } catch (error) {
      console.warn(`Failed to update table ${tableId}:`, error);
      throw error;
    }
  }

  async function deleteTable(tableId: string): Promise<void> {
    await deleteDoc(tableDoc(tableId));
  }

  // Atomic helpers for merge/unmerge using writeBatch
  async function atomicMergeTables(params: { mergedTable: any; originalTableIds: string[] }): Promise<void> {
    const { mergedTable, originalTableIds } = params;
    const batch = writeBatch(db);
    const now = serverTimestamp();

    // Upsert merged table document
    const mergedRef = tableDoc(mergedTable.id);
    batch.set(mergedRef, { 
      ...removeUndefinedValues({ ...mergedTable, restaurantId: currentRestaurantId }), 
      updatedAt: now 
    }, { merge: true });

    // Update each original table with merge metadata
    for (const id of originalTableIds) {
      const ref = tableDoc(id);
      batch.set(ref, removeUndefinedValues({
        isMerged: true,
        mergerId: mergedTable.mergerId,
        isActive: true,
        isOccupied: false,
        updatedAt: now
      }), { merge: true });
    }

    await batch.commit();
  }

  async function atomicUnmergeTables(params: { mergedTableId: string; originalTableIds: string[] }): Promise<void> {
    const { mergedTableId, originalTableIds } = params;
    const batch = writeBatch(db);
    const now = serverTimestamp();

    // Reset original tables to a fresh state
    for (const id of originalTableIds) {
      const ref = tableDoc(id);
      batch.set(ref, removeUndefinedValues({
        isMerged: false,
        mergerId: null,
        mergedTables: null,
        mergedTableNames: null,
        totalSeats: null,
        isActive: true,
        isOccupied: false,
        isReserved: false,
        reservedAt: null,
        reservedUntil: null,
        reservedBy: null,
        reservedNote: null,
        updatedAt: now
      }), { merge: true });
    }

    // Delete the merged table document
    batch.delete(tableDoc(mergedTableId));

    await batch.commit();
  }

  async function cleanupAndRecreateTables(): Promise<void> {
    // Delete all existing tables, then recreate defaults
    const snap = await getDocs(tablesCol());
    const deletions: Promise<void>[] = [];
    snap.forEach(d => {
      deletions.push(deleteDoc(d.ref));
    });
    await Promise.all(deletions);
    await createDefaultTables();
  }

  async function saveReceipt(receipt: Record<string, any>) {
    console.log('🔍 FirestoreService.saveReceipt - Starting...');
    console.log('🔍 FirestoreService.saveReceipt - Current Restaurant ID:', currentRestaurantId);
    console.log('🔍 FirestoreService.saveReceipt - Input receipt:', {
      id: receipt.id,
      orderId: receipt.orderId,
      hasRestaurantId: !!receipt.restaurantId,
      restaurantId: receipt.restaurantId,
      customerName: receipt.customerName,
      amount: receipt.amount
    });
    
    // Ensure restaurantId is set
    const originalRestaurantId = receipt.restaurantId;
    receipt.restaurantId = receipt.restaurantId || currentRestaurantId;
    
    if (originalRestaurantId !== receipt.restaurantId) {
      console.log('🔧 FirestoreService.saveReceipt - Set restaurantId from', originalRestaurantId, 'to', receipt.restaurantId);
    }
    
    if (!receipt.timestamp) {
      receipt.timestamp = Date.now();
      console.log('🔧 FirestoreService.saveReceipt - Set timestamp to:', receipt.timestamp);
    }
    
    console.log('🔍 FirestoreService.saveReceipt - Final receipt data:', {
      id: receipt.id,
      orderId: receipt.orderId,
      restaurantId: receipt.restaurantId,
      timestamp: receipt.timestamp,
      customerName: receipt.customerName,
      amount: receipt.amount
    });
    
    console.log('🔍 FirestoreService.saveReceipt - Collection path: restaurants/' + currentRestaurantId + '/receipts');
    
    try {
      // Enrich with table info if missing
      const enriched = { ...receipt } as any;
      if ((!enriched.tableId || !enriched.tableName) && enriched.orderId) {
        try {
          // Attempt to derive table name from tables collection
          const tables = await getTables();
          const tableFromId = enriched.tableId ? tables[enriched.tableId] : undefined;
          if (tableFromId?.name && !enriched.tableName) {
            enriched.tableName = tableFromId.name;
          }
        } catch (e) {
          console.warn('saveReceipt enrichment failed (Firestore):', (e as Error).message);
        }
      }

      // Remove undefined fields (Firestore disallows undefined)
      const cleaned = Object.fromEntries(
        Object.entries(enriched).filter(([_, v]) => v !== undefined)
      );

      // Idempotent write: use orderId as the receipt document ID
      const targetId = (enriched.orderId || enriched.id);
      if (!targetId) {
        throw new Error('saveReceipt requires orderId or id');
      }
      const targetRef = doc(receiptsCol(), String(targetId));
      await setDoc(targetRef, cleaned, { merge: true });
      console.log('✅ FirestoreService.saveReceipt - Receipt saved successfully (idempotent):', targetRef.id);
      return { id: targetRef.id, data: { id: targetRef.id, ...cleaned } };
    } catch (error) {
      console.error('❌ FirestoreService.saveReceipt - Error:', error);
      throw error;
    }
  }

  async function createDefaultTables() {
    const defaults = [
      { 
        id: "table-1",
        name: "Table 1", 
        seats: 4,
        description: "Standard 4-seater table",
        isActive: true,
        isMerged: false,
        isOccupied: false,
        createdAt: Date.now() 
      }, 
      { 
        id: "table-2",
        name: "Table 2", 
        seats: 4,
        description: "Standard 4-seater table",
        isActive: true,
        isMerged: false,
        isOccupied: false,
        createdAt: Date.now() 
      },
      { 
        id: "table-3",
        name: "Table 3", 
        seats: 6,
        description: "Large 6-seater table",
        isActive: true,
        isMerged: false,
        isOccupied: false,
        createdAt: Date.now() 
      },
      { 
        id: "table-4",
        name: "Table 4", 
        seats: 6,
        description: "Large 6-seater table",
        isActive: true,
        isMerged: false,
        isOccupied: false,
        createdAt: Date.now() 
      }
    ];
    
    for (const t of defaults) {
      await setDoc(doc(tablesCol(), t.id), {
        ...t,
        restaurantId: currentRestaurantId,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Additional methods for backward compatibility
  async function getRestaurantInfo(): Promise<any> {
    try {
      const restaurantDoc = await read('restaurant', 'info');
      return restaurantDoc;
    } catch (error) {
      console.error('Error getting restaurant info:', error);
      return null;
    }
  }

  async function create(collectionName: string, data: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, "restaurants", currentRestaurantId, collectionName), {
        ...data,
        restaurantId: currentRestaurantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Firestore create error:', error);
      throw error;
    }
  }

  async function update(collectionName: string, docId: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, "restaurants", currentRestaurantId, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Firestore update error:', error);
      throw error;
    }
  }

  async function read(collectionName: string, docId: string): Promise<any> {
    try {
      const docRef = doc(db, "restaurants", currentRestaurantId, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Firestore read error:', error);
      throw error;
    }
  }

  // Menu operations
  async function getMenuItems(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "menu"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { ...docSnap.data(), id: docSnap.id } as any;
      });
      return out;
    } catch (error) {
      console.error('Firestore getMenuItems error:', error);
      return {};
    }
  }

  async function createMenuItem(item: any): Promise<string> {
    return create('menu', item);
  }

  async function updateMenuItem(itemId: string, updates: any): Promise<void> {
    return update('menu', itemId, updates);
  }

  async function deleteMenuItem(itemId: string): Promise<void> {
    try {
      const docRef = doc(db, "restaurants", currentRestaurantId, "menu", itemId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore deleteMenuItem error:', error);
      throw error;
    }
  }

  // Categories operations
  async function getCategories(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "categories"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      return out;
    } catch (error) {
      console.error('Firestore getCategories error:', error);
      return {};
    }
  }

  async function createCategory(category: any): Promise<string> {
    return create('categories', category);
  }

  async function updateCategory(categoryId: string, updates: any): Promise<void> {
    return update('categories', categoryId, updates);
  }

  async function deleteCategory(categoryId: string): Promise<void> {
    try {
      const docRef = doc(db, "restaurants", currentRestaurantId, "categories", categoryId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore deleteCategory error:', error);
      throw error;
    }
  }

  // Orders operations
  async function getOrders(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "orders"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      return out;
    } catch (error) {
      console.error('Firestore getOrders error:', error);
      return {};
    }
  }

  async function createOrder(order: any): Promise<string> {
    return create('orders', order);
  }

  async function updateOrder(orderId: string, updates: any): Promise<void> {
    try {
      // Try updating ongoingOrders first
      const ongoingRef = doc(db, 'restaurants', currentRestaurantId, 'orders', 'root', 'ongoingOrders', orderId);
      const ongoingSnap = await getDoc(ongoingRef);
      if (ongoingSnap.exists()) {
        await setDoc(ongoingRef, { ...removeUndefinedValues(updates), updatedAt: serverTimestamp() }, { merge: true });
        return;
      }

      // Then try processedOrders
      const processedRef = doc(db, 'restaurants', currentRestaurantId, 'orders', 'root', 'processedOrders', orderId);
      const processedSnap = await getDoc(processedRef);
      if (processedSnap.exists()) {
        await setDoc(processedRef, { ...removeUndefinedValues(updates), updatedAt: serverTimestamp() }, { merge: true });
        return;
      }

      // Neither exists: upsert into ongoingOrders by default (safe fallback)
      await setDoc(ongoingRef, { id: orderId, ...removeUndefinedValues(updates), updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('Firestore updateOrder error:', error);
      throw error;
    }
  }

  async function deleteOrder(orderId: string): Promise<void> {
    try {
      // Delete from nested subcollections first (source of truth)
      const ongoingRef = doc(db, 'restaurants', currentRestaurantId, 'orders', 'root', 'ongoingOrders', orderId);
      const processedRef = doc(db, 'restaurants', currentRestaurantId, 'orders', 'root', 'processedOrders', orderId);
      try { await deleteDoc(ongoingRef); } catch {}
      try { await deleteDoc(processedRef); } catch {}

      // Also delete from legacy flat path if it exists (backward compatibility)
      const legacyRef = doc(db, "restaurants", currentRestaurantId, "orders", orderId);
      try { await deleteDoc(legacyRef); } catch {}
    } catch (error) {
      console.error('Firestore deleteOrder error:', error);
      throw error;
    }
  }

  // Upsert an order with a specific ID under restaurants/{restaurantId}/orders/{ongoingOrders|processedOrders}
  async function saveOrder(order: any): Promise<{ id: string; data: any }> {
    try {
      const providedId = typeof order?.id === 'string' && order.id.trim().length > 0 ? order.id.trim() : null;
      
      // Clean the order data to remove undefined values and ensure proper types
      const cleanOrder = cleanOrderData({
        ...order,
        restaurantId: currentRestaurantId,
        createdAt: order?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Remove any remaining undefined values from the payload
      const payload = removeUndefinedValues(cleanOrder);

      const isOngoing = payload.status === 'ongoing' || payload.ongoing === true;
      const targetPath = isOngoing ? ["orders", "root", "ongoingOrders"] : ["orders", "root", "processedOrders"];
      if (providedId) {
        const target = doc(db, "restaurants", currentRestaurantId, ...targetPath, providedId);
        await setDoc(target, { ...payload, ongoing: isOngoing }, { merge: true });
        // Ensure it doesn't exist in the opposite subcollection
        const otherPath = isOngoing ? ["orders", "root", "processedOrders"] : ["orders", "root", "ongoingOrders"];
        try { await deleteDoc(doc(db, "restaurants", currentRestaurantId, ...otherPath, providedId)); } catch {}
        return { id: providedId, data: { id: providedId, ...payload, ongoing: isOngoing } };
      } else {
        const colRef = collection(db, "restaurants", currentRestaurantId, ...targetPath);
        const refCreated = await addDoc(colRef, { ...payload, ongoing: isOngoing });
        return { id: refCreated.id, data: { id: refCreated.id, ...payload, ongoing: isOngoing } };
      }
    } catch (error) {
      console.error('Firestore saveOrder error:', error);
      throw error;
    }
  }

  // Move order to processedOrders and remove from ongoingOrders
  async function completeOrderMove(order: any): Promise<void> {
    try {
      const cleaned = removeUndefinedValues({ ...order, status: 'completed', ongoing: false, restaurantId: currentRestaurantId });
      const completedRef = doc(db, 'restaurants', currentRestaurantId, 'orders', 'root', 'processedOrders', cleaned.id);
      await setDoc(completedRef, cleaned, { merge: true });
      // Remove from active ongoing subcollection
      const activeRef = doc(db, 'restaurants', currentRestaurantId, 'orders', 'root', 'ongoingOrders', cleaned.id);
      try { await deleteDoc(activeRef); } catch {}
    } catch (error) {
      console.error('Firestore completeOrderMove error:', error);
      throw error;
    }
  }

  // Fetch only ongoing orders for this restaurant (from subcollection)
  async function getOngoingOrders(): Promise<Record<string, any>> {
    try {
      const snap = await getDocs(ongoingOrdersCol());
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        // Extra safety: ensure scoping remains correct
        if (!data.restaurantId || data.restaurantId === currentRestaurantId) {
          (data as any).ongoing = true;
          out[docSnap.id] = data;
        }
      });
      return out;
    } catch (error) {
      console.error('Firestore getOngoingOrders error:', error);
      return {};
    }
  }

  // Fetch only processed/completed orders for this restaurant (from subcollection)
  async function getCompletedOrders(): Promise<Record<string, any>> {
    try {
      const snap = await getDocs(processedOrdersCol());
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        if (!data.restaurantId || data.restaurantId === currentRestaurantId) {
          (data as any).ongoing = false;
          out[docSnap.id] = data;
        }
      });
      return out;
    } catch (error) {
      console.error('Firestore getCompletedOrders error:', error);
      return {};
    }
  }

  // Real-time listener for ongoing orders (from subcollection)
  function listenToOngoingOrders(callback: (orders: Record<string, any>) => void): Unsubscribe {
    const qy = query(ongoingOrdersCol());
    return onSnapshot(qy, (snap) => {
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        if (!data.restaurantId || data.restaurantId === currentRestaurantId) {
          (data as any).ongoing = true;
          out[docSnap.id] = data;
        }
      });
      callback(out);
    });
  }

  // Customers operations
  async function getCustomers(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "customers"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        // Extra safety: filter by restaurantId in case of legacy/migrated docs
        if (!data.restaurantId || data.restaurantId === currentRestaurantId) {
          out[docSnap.id] = data;
        }
      });
      return out;
    } catch (error) {
      console.error('Firestore getCustomers error:', error);
      return {};
    }
  }

  async function createCustomer(customer: any): Promise<string> {
    // If an ID is provided, use it to create/upsert the document; else auto-generate
    const providedId = typeof customer?.id === 'string' && customer.id.trim().length > 0 ? customer.id.trim() : null;
    const normalizePhone = (p: any) => (typeof p === 'string' ? p.replace(/\D+/g, '') : undefined);
    const payloadBase = {
      ...customer,
      id: providedId || customer?.id,
      restaurantId: currentRestaurantId,
      normalizedPhone: normalizePhone(customer?.phone),
      createdAt: customer?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any;

    // Derive visit stats from existing receipts for this account
    try {
      const receipts = await getReceipts();
      const phoneDigits = payloadBase.normalizedPhone;
      const nameLower = (payloadBase.name || '').toString().trim().toLowerCase();
      const relevant = Object.values(receipts).filter((r: any) => {
        const rPhone = (r.customerPhone || '').toString().replace(/\D+/g, '');
        const rName = (r.customerName || '').toString().trim().toLowerCase();
        return (phoneDigits && rPhone && rPhone === phoneDigits) || (!phoneDigits && nameLower && rName === nameLower);
      });
      if (relevant.length > 0) {
        const visitCount = relevant.length;
        const lastVisit = Math.max(...relevant.map((r: any) => Number(r.timestamp) || 0));
        payloadBase.visitCount = Math.max(Number(payloadBase.visitCount) || 0, visitCount);
        payloadBase.lastVisit = Math.max(Number(payloadBase.lastVisit) || 0, lastVisit);
      }
    } catch (e) {
      console.warn('createCustomer: failed to derive visit stats from receipts:', (e as Error).message);
    }

    const payload = payloadBase;
    if (providedId) {
      const docRef = doc(db, "restaurants", currentRestaurantId, "customers", providedId);
      await setDoc(docRef, payload, { merge: true });
      return providedId;
    } else {
      const docRef = await addDoc(collection(db, "restaurants", currentRestaurantId, "customers"), payload);
      return docRef.id;
    }
  }

  async function updateCustomer(customerId: string, updates: any): Promise<void> {
    // Upsert via setDoc(merge: true) to avoid 'No document to update' errors
    const normalizePhone = (p: any) => (typeof p === 'string' ? p.replace(/\D+/g, '') : undefined);
    const docRef = doc(db, "restaurants", currentRestaurantId, "customers", customerId);
    const enriched: any = { 
      ...updates, 
      id: customerId,
      restaurantId: currentRestaurantId,
      ...(updates?.phone !== undefined ? { normalizedPhone: normalizePhone(updates.phone) } : {}),
      updatedAt: serverTimestamp() 
    };

    // If phone or name changes (or stats missing), recompute visit stats from receipts
    try {
      if (updates?.phone !== undefined || updates?.name !== undefined || updates?.visitCount === undefined) {
        // Need existing name/phone to derive
        const snap = await getDoc(docRef);
        const current = snap.exists() ? snap.data() : {};
        const effectivePhone = updates?.phone !== undefined ? updates.phone : current?.phone;
        const effectiveName = updates?.name !== undefined ? updates.name : current?.name;
        const receipts = await getReceipts();
        const phoneDigits = typeof effectivePhone === 'string' ? effectivePhone.replace(/\D+/g, '') : undefined;
        const nameLower = (effectiveName || '').toString().trim().toLowerCase();
        const relevant = Object.values(receipts).filter((r: any) => {
          const rPhone = (r.customerPhone || '').toString().replace(/\D+/g, '');
          const rName = (r.customerName || '').toString().trim().toLowerCase();
          return (phoneDigits && rPhone && rPhone === phoneDigits) || (!phoneDigits && nameLower && rName === nameLower);
        });
        if (relevant.length > 0) {
          const visitCount = relevant.length;
          const lastVisit = Math.max(...relevant.map((r: any) => Number(r.timestamp) || 0));
          enriched.visitCount = Math.max(Number(current?.visitCount) || 0, visitCount);
          enriched.lastVisit = Math.max(Number(current?.lastVisit) || 0, lastVisit);
        }
      }
    } catch (e) {
      console.warn('updateCustomer: failed to derive visit stats from receipts:', (e as Error).message);
    }

    await setDoc(docRef, enriched, { merge: true });
  }

  async function deleteCustomer(customerId: string): Promise<void> {
    try {
      const docRef = doc(db, "restaurants", currentRestaurantId, "customers", customerId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore deleteCustomer error:', error);
      throw error;
    }
  }

  // Danger: destructive helpers for resetting data
  async function clearReceipts(): Promise<void> {
    const snap = await getDocs(receiptsCollection());
    const deletions: Promise<void>[] = [];
    snap.forEach(d => deletions.push(deleteDoc(d.ref)));
    await Promise.all(deletions);
  }

  async function clearCustomers(): Promise<void> {
    const snap = await getDocs(customersCol());
    const deletions: Promise<void>[] = [];
    snap.forEach(d => deletions.push(deleteDoc(d.ref)));
    await Promise.all(deletions);
  }

  async function clearReceiptsAndCustomers(): Promise<void> {
    await clearReceipts();
    await clearCustomers();
  }

  // Real-time customer listener
  function listenToCustomers(callback: (customers: Record<string, any>) => void): Unsubscribe {
    const q = query(customersCol());
    return onSnapshot(q, (snap) => {
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        if (data.restaurantId === currentRestaurantId) {
          out[docSnap.id] = data;
        }
      });
      callback(out);
    });
  }

  // Real-time tables listener
  function listenToTables(callback: (tables: Record<string, any>) => void): Unsubscribe {
    const q = query(tablesCol());
    return onSnapshot(q, (snap) => {
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        // Extra safety: filter by restaurantId in case of legacy/migrated docs
        if (!data.restaurantId || data.restaurantId === currentRestaurantId) {
          out[docSnap.id] = data;
        }
      });
      callback(out);
    });
  }

  // Customer history write (append-only)
  async function addCustomerHistory(customerId: string, entry: any): Promise<string> {
    const payload = {
      ...entry,
      restaurantId: currentRestaurantId,
      createdAt: entry?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(customerHistoryCol(customerId), payload);
    return ref.id;
  }

  // Real-time receipts listener
  function listenToReceipts(callback: (receipts: Record<string, any>) => void): Unsubscribe {
    const q = query(receiptsCol());
    return onSnapshot(q, (snap) => {
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        if (data.restaurantId === currentRestaurantId) {
          out[docSnap.id] = data;
        }
      });
      callback(out);
    });
  }

  // Staff operations
  async function getStaffMembers(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "staff"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      return out;
    } catch (error) {
      console.error('Firestore getStaffMembers error:', error);
      return {};
    }
  }

  // Users operations (for restaurant users mapping)
  async function getUsers(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "users"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      return out;
    } catch (error) {
      console.error('Firestore getUsers error:', error);
      return {};
    }
  }

  async function createStaffMember(staff: any): Promise<string> {
    return create('staff', staff);
  }

  async function updateStaffMember(staffId: string, updates: any): Promise<void> {
    return update('staff', staffId, updates);
  }

  async function deleteStaffMember(staffId: string): Promise<void> {
    try {
      const docRef = doc(db, "restaurants", currentRestaurantId, "staff", staffId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore deleteStaffMember error:', error);
      throw error;
    }
  }

  // Inventory operations
  async function getInventoryItems(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "inventory"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      return out;
    } catch (error) {
      console.error('Firestore getInventoryItems error:', error);
      return {};
    }
  }

  // Real-time inventory listener
  function listenToInventory(callback: (items: Record<string, any>) => void): Unsubscribe {
    const q = query(collection(db, "restaurants", currentRestaurantId, "inventory"));
    return onSnapshot(q, (snap) => {
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { ...docSnap.data(), id: docSnap.id } as any;
      });
      callback(out);
    });
  }

  // Inventory categories operations (separate from menu categories)
  async function getInventoryCategories(): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, "restaurants", currentRestaurantId, "inventoryCategories"));
      const snap = await getDocs(q);
      const out: Record<string, any> = {};
      snap.forEach(docSnap => {
        out[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      return out;
    } catch (error) {
      console.error('Firestore getInventoryCategories error:', error);
      return {};
    }
  }

  async function createInventoryCategory(category: any): Promise<string> {
    return create('inventoryCategories', category);
  }

  async function createInventoryItem(item: any): Promise<string> {
    return create('inventory', item);
  }

  async function updateInventoryItem(itemId: string, updates: any): Promise<void> {
    return update('inventory', itemId, updates);
  }

  async function deleteInventoryItem(itemId: string): Promise<void> {
    try {
      const docRef = doc(db, "restaurants", currentRestaurantId, "inventory", itemId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore deleteInventoryItem error:', error);
      throw error;
    }
  }

  return { 
    getReceipts, getTables, saveReceipt, createDefaultTables, getRestaurantInfo, create, update, read,
    createRestaurant,
    getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem,
    getCategories, createCategory, updateCategory, deleteCategory,
    getOrders, createOrder, updateOrder, deleteOrder, saveOrder, getOngoingOrders, getCompletedOrders, completeOrderMove,
    getCustomers, createCustomer, updateCustomer, deleteCustomer,
    getStaffMembers, createStaffMember, updateStaffMember, deleteStaffMember,
    getUsers,
    getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
    listenToInventory,
    getInventoryCategories, createInventoryCategory,
    // extras used by UI
    setDocument, updateTable, deleteTable, cleanupAndRecreateTables,
    atomicMergeTables, atomicUnmergeTables,
    listenToCustomers, listenToTables
    , listenToReceipts,
    listenToOngoingOrders,
    addCustomerHistory,
    clearReceipts,
    clearCustomers,
    clearReceiptsAndCustomers
  };
}

// Legacy exports for backward compatibility
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