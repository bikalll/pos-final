import { Unsubscribe } from 'firebase/firestore';

/**
 * Centralized listener manager to prevent memory leaks and duplicate listeners
 * This ensures proper cleanup of Firebase listeners across all screens
 */
class ListenerManager {
  private activeListeners = new Map<string, Unsubscribe>();
  private screenListeners = new Map<string, Set<string>>(); // screenId -> listenerIds
  private currentRestaurantId: string | null = null;

  /**
   * Set the current restaurant ID and cleanup old listeners if changed
   */
  setRestaurant(restaurantId: string | null) {
    if (this.currentRestaurantId === restaurantId) return;
    
    console.log('🔄 ListenerManager: Restaurant changed, cleaning up old listeners');
    this.cleanup();
    this.currentRestaurantId = restaurantId;
  }

  /**
   * Add a listener for a specific screen
   */
  addListener(screenId: string, listenerId: string, unsubscribe: Unsubscribe) {
    // Remove existing listener with same ID
    this.removeListener(screenId, listenerId);
    
    // Add new listener
    this.activeListeners.set(listenerId, unsubscribe);
    
    // Track which screen owns this listener
    if (!this.screenListeners.has(screenId)) {
      this.screenListeners.set(screenId, new Set());
    }
    this.screenListeners.get(screenId)!.add(listenerId);
    
    console.log(`✅ ListenerManager: Added listener ${listenerId} for screen ${screenId}`);
  }

  /**
   * Remove a specific listener
   */
  removeListener(screenId: string, listenerId: string) {
    const unsubscribe = this.activeListeners.get(listenerId);
    if (unsubscribe) {
      try {
        unsubscribe();
        console.log(`🗑️ ListenerManager: Removed listener ${listenerId}`);
      } catch (error) {
        console.warn(`⚠️ ListenerManager: Error removing listener ${listenerId}:`, error);
      }
      this.activeListeners.delete(listenerId);
    }
    
    // Remove from screen tracking
    const screenListeners = this.screenListeners.get(screenId);
    if (screenListeners) {
      screenListeners.delete(listenerId);
      if (screenListeners.size === 0) {
        this.screenListeners.delete(screenId);
      }
    }
  }

  /**
   * Remove all listeners for a specific screen
   */
  removeScreenListeners(screenId: string) {
    const screenListeners = this.screenListeners.get(screenId);
    if (screenListeners) {
      console.log(`🗑️ ListenerManager: Removing ${screenListeners.size} listeners for screen ${screenId}`);
      
      screenListeners.forEach(listenerId => {
        const unsubscribe = this.activeListeners.get(listenerId);
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch (error) {
            console.warn(`⚠️ ListenerManager: Error removing listener ${listenerId}:`, error);
          }
          this.activeListeners.delete(listenerId);
        }
      });
      
      this.screenListeners.delete(screenId);
    }
  }

  /**
   * Remove all active listeners
   */
  cleanup() {
    console.log(`🗑️ ListenerManager: Cleaning up ${this.activeListeners.size} active listeners`);
    
    this.activeListeners.forEach((unsubscribe, listenerId) => {
      try {
        unsubscribe();
        console.log(`🗑️ ListenerManager: Removed listener ${listenerId}`);
      } catch (error) {
        console.warn(`⚠️ ListenerManager: Error removing listener ${listenerId}:`, error);
      }
    });
    
    this.activeListeners.clear();
    this.screenListeners.clear();
  }

  /**
   * Get list of active listeners for debugging
   */
  getActiveListeners(): { screenId: string; listenerIds: string[] }[] {
    const result: { screenId: string; listenerIds: string[] }[] = [];
    this.screenListeners.forEach((listenerIds, screenId) => {
      result.push({
        screenId,
        listenerIds: Array.from(listenerIds)
      });
    });
    return result;
  }

  /**
   * Get total number of active listeners
   */
  getListenerCount(): number {
    return this.activeListeners.size;
  }
}

// Export singleton instance
export const listenerManager = new ListenerManager();

// Helper hook for easy cleanup in components
export const useListenerCleanup = (screenId: string) => {
  return {
    addListener: (listenerId: string, unsubscribe: Unsubscribe) => {
      listenerManager.addListener(screenId, listenerId, unsubscribe);
    },
    removeListener: (listenerId: string) => {
      listenerManager.removeListener(screenId, listenerId);
    },
    cleanup: () => {
      listenerManager.removeScreenListeners(screenId);
    }
  };
};

export default listenerManager;
