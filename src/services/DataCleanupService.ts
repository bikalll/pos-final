import { store } from '../redux/storeFirebase';
import { performanceMonitor } from './PerformanceMonitor';

/**
 * Data Cleanup Service
 * Automatically cleans up old and unused data to prevent memory bloat
 */

interface CleanupConfig {
  maxOrderAge: number; // in milliseconds
  maxCompletedOrders: number;
  maxInactiveDataAge: number;
  cleanupInterval: number;
}

class DataCleanupService {
  private config: CleanupConfig = {
    maxOrderAge: 24 * 60 * 60 * 1000, // 24 hours
    maxCompletedOrders: 100,
    maxInactiveDataAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
  };

  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start automatic cleanup
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleCleanup();
    console.log('🧹 DataCleanupService: Started automatic cleanup');
  }

  /**
   * Stop automatic cleanup
   */
  stop() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.isRunning = false;
    console.log('🧹 DataCleanupService: Stopped automatic cleanup');
  }

  /**
   * Schedule next cleanup
   */
  private scheduleCleanup() {
    if (!this.isRunning) return;
    
    this.cleanupTimer = setTimeout(() => {
      this.performCleanup();
      this.scheduleCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform cleanup operations
   */
  async performCleanup() {
    try {
      console.log('🧹 DataCleanupService: Starting cleanup...');
      
      const state = store.getState();
      const now = Date.now();
      
      // Cleanup old orders
      await this.cleanupOldOrders(state, now);
      
      // Cleanup inactive data
      await this.cleanupInactiveData(state, now);
      
      // Cleanup duplicate data
      await this.cleanupDuplicateData(state);
      
      // Mark cleanup as completed
      performanceMonitor.markCleanupCompleted();
      
      console.log('✅ DataCleanupService: Cleanup completed');
    } catch (error) {
      console.error('❌ DataCleanupService: Cleanup failed:', error);
    }
  }

  /**
   * Cleanup old orders
   */
  private async cleanupOldOrders(state: any, now: number) {
    const orders = state.orders?.ordersById || {};
    const ordersToRemove: string[] = [];
    
    // Remove orders older than maxOrderAge
    Object.values(orders).forEach((order: any) => {
      if (order.createdAt && (now - order.createdAt) > this.config.maxOrderAge) {
        if (order.status === 'completed') {
          ordersToRemove.push(order.id);
        }
      }
    });
    
    // Keep only the most recent completed orders
    const completedOrders = Object.values(orders)
      .filter((order: any) => order.status === 'completed')
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
    
    if (completedOrders.length > this.config.maxCompletedOrders) {
      const excessOrders = completedOrders.slice(this.config.maxCompletedOrders);
      excessOrders.forEach((order: any) => {
        ordersToRemove.push(order.id);
      });
    }
    
    if (ordersToRemove.length > 0) {
      console.log(`🧹 DataCleanupService: Removing ${ordersToRemove.length} old orders`);
      
      // Dispatch batch remove action
      const { batchRemoveOrdersFromFirebase } = await import('../redux/slices/batchActions');
      store.dispatch(batchRemoveOrdersFromFirebase(ordersToRemove));
    }
  }

  /**
   * Cleanup inactive data
   */
  private async cleanupInactiveData(state: any, now: number) {
    const inactiveDataTypes = ['tables', 'menu', 'inventory', 'customers'];
    
    for (const dataType of inactiveDataTypes) {
      const data = state[dataType]?.itemsById || state[dataType]?.tablesById || {};
      const itemsToRemove: string[] = [];
      
      Object.values(data).forEach((item: any) => {
        if (item.lastUpdated && (now - item.lastUpdated) > this.config.maxInactiveDataAge) {
          if (item.isActive === false || item.isDeleted === true) {
            itemsToRemove.push(item.id);
          }
        }
      });
      
      if (itemsToRemove.length > 0) {
        console.log(`🧹 DataCleanupService: Removing ${itemsToRemove.length} inactive ${dataType}`);
        
        // Dispatch appropriate batch remove action
        const { batchRemoveTablesFromFirebase, batchRemoveMenuItemsFromFirebase, batchRemoveInventoryItemsFromFirebase, batchRemoveCustomersFromFirebase } = await import('../redux/slices/batchActions');
        
        switch (dataType) {
          case 'tables':
            store.dispatch(batchRemoveTablesFromFirebase(itemsToRemove));
            break;
          case 'menu':
            store.dispatch(batchRemoveMenuItemsFromFirebase(itemsToRemove));
            break;
          case 'inventory':
            store.dispatch(batchRemoveInventoryItemsFromFirebase(itemsToRemove));
            break;
          case 'customers':
            store.dispatch(batchRemoveCustomersFromFirebase(itemsToRemove));
            break;
        }
      }
    }
  }

  /**
   * Cleanup duplicate data
   */
  private async cleanupDuplicateData(state: any) {
    // This would implement logic to detect and remove duplicate data
    // For now, we'll just log that this is a placeholder
    console.log('🧹 DataCleanupService: Duplicate data cleanup (placeholder)');
  }

  /**
   * Force immediate cleanup
   */
  async forceCleanup() {
    console.log('🧹 DataCleanupService: Force cleanup requested');
    await this.performCleanup();
  }

  /**
   * Update cleanup configuration
   */
  updateConfig(newConfig: Partial<CleanupConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('🧹 DataCleanupService: Configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): CleanupConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const dataCleanupService = new DataCleanupService();

// Helper hook for React components
export const useDataCleanup = () => {
  return {
    start: () => dataCleanupService.start(),
    stop: () => dataCleanupService.stop(),
    forceCleanup: () => dataCleanupService.forceCleanup(),
    updateConfig: (config: Partial<CleanupConfig>) => dataCleanupService.updateConfig(config),
    getConfig: () => dataCleanupService.getConfig(),
  };
};

export default dataCleanupService;
