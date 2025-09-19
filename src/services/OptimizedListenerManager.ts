import { Unsubscribe } from 'firebase/firestore';
import { AppDispatch } from '../redux/storeFirebase';

/**
 * Optimized Listener Manager for Production
 * Prevents memory leaks, reduces duplicate listeners, and manages data efficiently
 */
class OptimizedListenerManager {
  private activeListeners = new Map<string, Unsubscribe>();
  private screenListeners = new Map<string, Set<string>>();
  private currentRestaurantId: string | null = null;
  private dispatch: AppDispatch | null = null;
  private batchUpdateQueue: Map<string, any[]> = new Map();
  private batchUpdateTimer: NodeJS.Timeout | null = null;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  /**
   * Initialize with dispatch (for singleton usage)
   */
  initialize(dispatch: AppDispatch) {
    this.dispatch = dispatch;
    console.log('✅ OptimizedListenerManager: Initialized with dispatch');
  }

  /**
   * Set restaurant and cleanup old listeners
   */
  setRestaurant(restaurantId: string | null) {
    if (this.currentRestaurantId === restaurantId) return;
    
    console.log('🔄 OptimizedListenerManager: Restaurant changed, cleaning up old listeners');
    this.cleanup();
    this.currentRestaurantId = restaurantId;
  }

  /**
   * Add listener with automatic deduplication
   */
  addListener(screenId: string, listenerId: string, unsubscribe: Unsubscribe) {
    // Remove existing listener with same ID
    this.removeListener(screenId, listenerId);
    
    this.activeListeners.set(listenerId, unsubscribe);
    
    if (!this.screenListeners.has(screenId)) {
      this.screenListeners.set(screenId, new Set());
    }
    this.screenListeners.get(screenId)!.add(listenerId);
    
    console.log(`✅ OptimizedListenerManager: Added listener ${listenerId} for screen ${screenId}`);
  }

  /**
   * Remove specific listener
   */
  removeListener(screenId: string, listenerId: string) {
    const unsubscribe = this.activeListeners.get(listenerId);
    if (unsubscribe) {
      try {
        unsubscribe();
        this.activeListeners.delete(listenerId);
        console.log(`🗑️ OptimizedListenerManager: Removed listener ${listenerId}`);
      } catch (error) {
        console.warn(`⚠️ OptimizedListenerManager: Error removing listener ${listenerId}:`, error);
      }
    }
    
    const screenSet = this.screenListeners.get(screenId);
    if (screenSet) {
      screenSet.delete(listenerId);
      if (screenSet.size === 0) {
        this.screenListeners.delete(screenId);
      }
    }
  }

  /**
   * Remove all listeners for a screen
   */
  removeScreenListeners(screenId: string) {
    const screenSet = this.screenListeners.get(screenId);
    if (screenSet) {
      screenSet.forEach(listenerId => {
        this.removeListener(screenId, listenerId);
      });
    }
  }

  /**
   * Batch updates to reduce Redux dispatches
   */
  batchUpdate(type: string, data: any) {
    if (!this.batchUpdateQueue.has(type)) {
      this.batchUpdateQueue.set(type, []);
    }
    
    this.batchUpdateQueue.get(type)!.push(data);
    
    // Clear existing timer
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
    }
    
    // Set new timer for batch processing
    this.batchUpdateTimer = setTimeout(() => {
      this.processBatchUpdates();
    }, 100); // 100ms batch window
  }

  /**
   * Process batched updates
   */
  private processBatchUpdates() {
    if (!this.dispatch) return;
    
    this.batchUpdateQueue.forEach((items, type) => {
      if (items.length === 0) return;
      
      // Import actions dynamically to avoid circular dependencies
      import('../redux/slices/ordersSliceFirebase').then(ordersModule => {
        if (type === 'orders' && ordersModule.batchUpdateOrdersFromFirebase) {
          this.dispatch!(ordersModule.batchUpdateOrdersFromFirebase(items));
        }
      });
      
      import('../redux/slices/tablesSliceFirebase').then(tablesModule => {
        if (type === 'tables' && tablesModule.batchUpdateTablesFromFirebase) {
          this.dispatch!(tablesModule.batchUpdateTablesFromFirebase(items));
        }
      });
    });
    
    this.batchUpdateQueue.clear();
    this.batchUpdateTimer = null;
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    console.log(`🗑️ OptimizedListenerManager: Cleaning up ${this.activeListeners.size} active listeners`);
    
    this.activeListeners.forEach((unsubscribe, listenerId) => {
      try {
        unsubscribe();
        console.log(`🗑️ OptimizedListenerManager: Removed listener ${listenerId}`);
      } catch (error) {
        console.warn(`⚠️ OptimizedListenerManager: Error removing listener ${listenerId}:`, error);
      }
    });
    
    this.activeListeners.clear();
    this.screenListeners.clear();
    
    // Clear batch update timer
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }
    this.batchUpdateQueue.clear();
  }

  /**
   * Get active listeners for debugging
   */
  getActiveListeners(): { screenId: string; listenerIds: string[] }[] {
    const result: { screenId: string; listenerIds: string[] }[] = [];
    this.screenListeners.forEach((listenerIds, screenId) => {
      result.push({ screenId, listenerIds: Array.from(listenerIds) });
    });
    return result;
  }
}

// Export singleton instance
export const optimizedListenerManager = new OptimizedListenerManager(null as any);

// Helper hook for components
export const useOptimizedListenerCleanup = (screenId: string) => {
  return {
    addListener: (listenerId: string, unsubscribe: Unsubscribe) => {
      optimizedListenerManager.addListener(screenId, listenerId, unsubscribe);
    },
    removeListener: (listenerId: string) => {
      optimizedListenerManager.removeListener(screenId, listenerId);
    },
    cleanup: () => {
      optimizedListenerManager.removeScreenListeners(screenId);
    },
    batchUpdate: (type: string, data: any) => {
      optimizedListenerManager.batchUpdate(type, data);
    }
  };
};

export default optimizedListenerManager;
