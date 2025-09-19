import { AppDispatch } from '../redux/storeFirebase';
import { updateOrderFromFirebase } from '../redux/slices/ordersSliceFirebase';
import { updateTableFromFirebase } from '../redux/slices/tablesSliceFirebase';
import { updateMenuItemFromFirebase } from '../redux/slices/menuSliceFirebase';
import { updateInventoryItemFromFirebase } from '../redux/slices/inventorySliceFirebase';
import { updateCustomerFromFirebase } from '../redux/slices/customersSliceFirebase';

/**
 * Batch Update Service
 * Provides efficient batch updates for Redux state to reduce individual dispatches
 */

interface BatchQueue {
  orders: any[];
  tables: any[];
  menuItems: any[];
  inventoryItems: any[];
  customers: any[];
}

interface DebounceConfig {
  delay: number;
  maxBatchSize: number;
}

class BatchUpdateService {
  private dispatch: AppDispatch;
  private batchQueue: BatchQueue = {
    orders: [],
    tables: [],
    menuItems: [],
    inventoryItems: [],
    customers: [],
  };
  
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private config: DebounceConfig = {
    delay: 100, // 100ms debounce delay
    maxBatchSize: 50, // Maximum items per batch
  };

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  /**
   * Add order to batch queue
   */
  batchUpdateOrder(order: any) {
    this.addToBatch('orders', order, () => {
      this.dispatch(updateOrderFromFirebase(order));
    });
  }

  /**
   * Add table to batch queue
   */
  batchUpdateTable(table: any) {
    this.addToBatch('tables', table, () => {
      this.dispatch(updateTableFromFirebase(table));
    });
  }

  /**
   * Add menu item to batch queue
   */
  batchUpdateMenuItem(menuItem: any) {
    this.addToBatch('menuItems', menuItem, () => {
      this.dispatch(updateMenuItemFromFirebase(menuItem));
    });
  }

  /**
   * Add inventory item to batch queue
   */
  batchUpdateInventoryItem(inventoryItem: any) {
    this.addToBatch('inventoryItems', inventoryItem, () => {
      this.dispatch(updateInventoryItemFromFirebase(inventoryItem));
    });
  }

  /**
   * Add customer to batch queue
   */
  batchUpdateCustomer(customer: any) {
    this.addToBatch('customers', customer, () => {
      this.dispatch(updateCustomerFromFirebase(customer));
    });
  }

  /**
   * Batch update multiple orders at once
   */
  batchUpdateOrders(orders: any[]) {
    this.batchQueue.orders.push(...orders);
    this.processBatch('orders');
  }

  /**
   * Batch update multiple tables at once
   */
  batchUpdateTables(tables: any[]) {
    this.batchQueue.tables.push(...tables);
    this.processBatch('tables');
  }

  /**
   * Batch update multiple menu items at once
   */
  batchUpdateMenuItems(menuItems: any[]) {
    this.batchQueue.menuItems.push(...menuItems);
    this.processBatch('menuItems');
  }

  /**
   * Generic method to add item to batch queue with debouncing
   */
  private addToBatch(
    type: keyof BatchQueue,
    item: any,
    individualDispatch: () => void
  ) {
    // Clear existing timer for this type
    const existingTimer = this.timers.get(type);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Add item to batch queue
    this.batchQueue[type].push(item);

    // If batch is full, process immediately
    if (this.batchQueue[type].length >= this.config.maxBatchSize) {
      this.processBatch(type);
      return;
    }

    // Set debounced timer
    const timer = setTimeout(() => {
      this.processBatch(type);
    }, this.config.delay);

    this.timers.set(type, timer);
  }

  /**
   * Process batch updates for a specific type
   */
  private processBatch(type: keyof BatchQueue) {
    const items = this.batchQueue[type];
    if (items.length === 0) return;

    // Clear timer
    const timer = this.timers.get(type);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(type);
    }

    // Process batch based on type
    switch (type) {
      case 'orders':
        this.processOrderBatch(items);
        break;
      case 'tables':
        this.processTableBatch(items);
        break;
      case 'menuItems':
        this.processMenuItemBatch(items);
        break;
      case 'inventoryItems':
        this.processInventoryItemBatch(items);
        break;
      case 'customers':
        this.processCustomerBatch(items);
        break;
    }

    // Clear the batch queue
    this.batchQueue[type] = [];
  }

  /**
   * Process batch of orders
   */
  private processOrderBatch(orders: any[]) {
    console.log(`🔄 BatchUpdateService: Processing ${orders.length} orders`);
    
    // Use batch update for orders
    this.dispatch({
      type: 'orders/batchUpdateOrders',
      payload: orders,
    });
  }

  /**
   * Process batch of tables
   */
  private processTableBatch(tables: any[]) {
    console.log(`🔄 BatchUpdateService: Processing ${tables.length} tables`);
    
    // Use batch update for tables
    this.dispatch({
      type: 'tables/batchUpdateTables',
      payload: tables,
    });
  }

  /**
   * Process batch of menu items
   */
  private processMenuItemBatch(menuItems: any[]) {
    console.log(`🔄 BatchUpdateService: Processing ${menuItems.length} menu items`);
    
    // Use batch update for menu items
    this.dispatch({
      type: 'menu/batchUpdateMenuItems',
      payload: menuItems,
    });
  }

  /**
   * Process batch of inventory items
   */
  private processInventoryItemBatch(inventoryItems: any[]) {
    console.log(`🔄 BatchUpdateService: Processing ${inventoryItems.length} inventory items`);
    
    // Use batch update for inventory items
    this.dispatch({
      type: 'inventory/batchUpdateInventoryItems',
      payload: inventoryItems,
    });
  }

  /**
   * Process batch of customers
   */
  private processCustomerBatch(customers: any[]) {
    console.log(`🔄 BatchUpdateService: Processing ${customers.length} customers`);
    
    // Use batch update for customers
    this.dispatch({
      type: 'customers/batchUpdateCustomers',
      payload: customers,
    });
  }

  /**
   * Force process all pending batches
   */
  flushAllBatches() {
    console.log('🔄 BatchUpdateService: Flushing all pending batches');
    
    Object.keys(this.batchQueue).forEach((type) => {
      this.processBatch(type as keyof BatchQueue);
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DebounceConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 BatchUpdateService: Configuration updated', this.config);
  }

  /**
   * Get current batch queue status
   */
  getBatchStatus() {
    return {
      orders: this.batchQueue.orders.length,
      tables: this.batchQueue.tables.length,
      menuItems: this.batchQueue.menuItems.length,
      inventoryItems: this.batchQueue.inventoryItems.length,
      customers: this.batchQueue.customers.length,
      activeTimers: this.timers.size,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Flush all pending batches
    this.flushAllBatches();

    // Clear batch queue
    this.batchQueue = {
      orders: [],
      tables: [],
      menuItems: [],
      inventoryItems: [],
      customers: [],
    };

    console.log('🧹 BatchUpdateService: Cleanup completed');
  }
}

// Export singleton instance
let batchUpdateService: BatchUpdateService | null = null;

export const getBatchUpdateService = (dispatch?: AppDispatch): BatchUpdateService => {
  if (!batchUpdateService && dispatch) {
    batchUpdateService = new BatchUpdateService(dispatch);
  }
  if (!batchUpdateService) {
    throw new Error('BatchUpdateService not initialized. Call with dispatch first.');
  }
  return batchUpdateService;
};

export const initializeBatchUpdateService = (dispatch: AppDispatch): BatchUpdateService => {
  batchUpdateService = new BatchUpdateService(dispatch);
  return batchUpdateService;
};

export const cleanupBatchUpdateService = () => {
  if (batchUpdateService) {
    batchUpdateService.cleanup();
    batchUpdateService = null;
  }
};

export default BatchUpdateService;
