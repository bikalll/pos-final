import { createFirestoreService } from './firestoreService';
import { Table } from '../types/Table';
import { MenuItem } from '../types/MenuItem';
import { Order } from '../types/Order';

// Enhanced Firestore service with optimizations
export class OptimizedFirestoreService {
  private service: any;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 30000; // 30 seconds
  private readonly maxCacheSize = 100;
  
  constructor(restaurantId: string) {
    this.service = createFirestoreService(restaurantId);
  }
  
  // Optimized table operations
  async getTablesByStatus(filters: { isOccupied?: boolean; isReserved?: boolean }): Promise<Record<string, any>> {
    const cacheKey = `tables_${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      // Use optimized query with filters
      const tables = await this.service.getTables();
      const filtered = Object.values(tables).filter((table: any) => {
        if (filters.isOccupied !== undefined && table.isOccupied !== filters.isOccupied) {
          return false;
        }
        if (filters.isReserved !== undefined && table.isReserved !== filters.isReserved) {
          return false;
        }
        return true;
      });
      
      const result = filtered.reduce((acc: any, table: any) => {
        acc[table.id] = table;
        return acc;
      }, {});
      
      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      this.cleanupCache();
      
      return result;
    } catch (error) {
      console.error('❌ Error getting tables by status:', error);
      throw error;
    }
  }
  
  // Batch table updates
  async batchUpdateTables(updates: Array<{ tableId: string; status: Partial<Table> }>): Promise<void> {
    try {
      // Process updates in batches of 10
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const promises = batch.map(update => 
          this.service.updateTable(update.tableId, update.status)
        );
        await Promise.all(promises);
      }
      
      // Invalidate cache
      this.invalidateCache('tables');
    } catch (error) {
      console.error('❌ Error batch updating tables:', error);
      throw error;
    }
  }
  
  // Optimized menu operations
  async getMenuItemsByCategory(category: string): Promise<Record<string, any>> {
    const cacheKey = `menu_${category}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      const menuItems = await this.service.getMenuItems();
      const filtered = Object.values(menuItems).filter((item: any) => 
        item.category === category
      );
      
      const result = filtered.reduce((acc: any, item: any) => {
        acc[item.id] = item;
        return acc;
      }, {});
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      this.cleanupCache();
      
      return result;
    } catch (error) {
      console.error('❌ Error getting menu items by category:', error);
      throw error;
    }
  }
  
  // Optimized order operations
  async getOrdersByStatus(status: string): Promise<Record<string, any>> {
    const cacheKey = `orders_${status}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      const orders = await this.service.getOrders();
      const filtered = Object.values(orders).filter((order: any) => 
        order.status === status
      );
      
      const result = filtered.reduce((acc: any, order: any) => {
        acc[order.id] = order;
        return acc;
      }, {});
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      this.cleanupCache();
      
      return result;
    } catch (error) {
      console.error('❌ Error getting orders by status:', error);
      throw error;
    }
  }
  
  // Batch order updates
  async batchUpdateOrders(updates: Array<{ orderId: string; data: Partial<Order> }>): Promise<void> {
    try {
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const promises = batch.map(update => 
          this.service.updateOrder(update.orderId, update.data)
        );
        await Promise.all(promises);
      }
      
      this.invalidateCache('orders');
    } catch (error) {
      console.error('❌ Error batch updating orders:', error);
      throw error;
    }
  }
  
  // Cache management
  private cleanupCache() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    });
    
    // Limit cache size
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.cache.size - this.maxCacheSize);
      
      sortedEntries.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }
  
  private invalidateCache(prefix: string) {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(prefix)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  getCacheMetrics() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Factory function
export const createOptimizedFirestoreService = (restaurantId: string) => {
  return new OptimizedFirestoreService(restaurantId);
};
