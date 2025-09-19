import { optimizedFirebaseService } from './OptimizedFirebaseService';

/**
 * Cache Invalidation Service
 * Provides intelligent cache invalidation strategies for different data types
 */

interface InvalidationRule {
  pattern: string;
  ttl: number;
  triggers: string[];
}

interface CacheInvalidationConfig {
  rules: InvalidationRule[];
  autoInvalidate: boolean;
  invalidationDelay: number;
}

class CacheInvalidationService {
  private config: CacheInvalidationConfig = {
    rules: [
      {
        pattern: 'tables-.*',
        ttl: 5 * 60 * 1000, // 5 minutes
        triggers: ['table-update', 'table-create', 'table-delete']
      },
      {
        pattern: 'orders-.*',
        ttl: 1 * 60 * 1000, // 1 minute
        triggers: ['order-update', 'order-create', 'order-complete', 'order-cancel']
      },
      {
        pattern: 'menu-.*',
        ttl: 10 * 60 * 1000, // 10 minutes
        triggers: ['menu-update', 'menu-create', 'menu-delete', 'menu-toggle']
      },
      {
        pattern: 'inventory-.*',
        ttl: 2 * 60 * 1000, // 2 minutes
        triggers: ['inventory-update', 'inventory-create', 'inventory-delete', 'inventory-deduct']
      },
      {
        pattern: 'customers-.*',
        ttl: 5 * 60 * 1000, // 5 minutes
        triggers: ['customer-update', 'customer-create', 'customer-delete']
      }
    ],
    autoInvalidate: true,
    invalidationDelay: 100, // 100ms delay for batching invalidations
  };

  private invalidationQueue: Set<string> = new Set();
  private invalidationTimer: NodeJS.Timeout | null = null;

  /**
   * Invalidate cache based on trigger event
   */
  invalidateByTrigger(trigger: string, restaurantId?: string) {
    if (!this.config.autoInvalidate) return;

    const matchingRules = this.config.rules.filter(rule => 
      rule.triggers.includes(trigger)
    );

    matchingRules.forEach(rule => {
      if (restaurantId) {
        this.queueInvalidation(`${rule.pattern.replace('.*', restaurantId)}`);
      } else {
        this.queueInvalidation(rule.pattern);
      }
    });

    console.log(`🔄 CacheInvalidationService: Invalidated cache for trigger '${trigger}'`);
  }

  /**
   * Invalidate specific cache entries
   */
  invalidateCache(patterns: string | string[]) {
    const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
    
    patternsArray.forEach(pattern => {
      this.queueInvalidation(pattern);
    });
  }

  /**
   * Invalidate all caches for a restaurant
   */
  invalidateRestaurantCache(restaurantId: string) {
    const patterns = [
      `tables-${restaurantId}`,
      `orders-${restaurantId}`,
      `menu-${restaurantId}`,
      `inventory-${restaurantId}`,
      `customers-${restaurantId}`
    ];
    
    this.invalidateCache(patterns);
    console.log(`🔄 CacheInvalidationService: Invalidated all caches for restaurant ${restaurantId}`);
  }

  /**
   * Queue invalidation for batching
   */
  private queueInvalidation(pattern: string) {
    this.invalidationQueue.add(pattern);

    // Clear existing timer
    if (this.invalidationTimer) {
      clearTimeout(this.invalidationTimer);
    }

    // Set new timer for batched invalidation
    this.invalidationTimer = setTimeout(() => {
      this.processInvalidationQueue();
    }, this.config.invalidationDelay);
  }

  /**
   * Process queued invalidations
   */
  private processInvalidationQueue() {
    if (this.invalidationQueue.size === 0) return;

    const patterns = Array.from(this.invalidationQueue);
    this.invalidationQueue.clear();

    patterns.forEach(pattern => {
      try {
        if (optimizedFirebaseService && typeof optimizedFirebaseService.clearCache === 'function') {
          optimizedFirebaseService.clearCache(pattern);
        } else {
          console.warn('⚠️ CacheInvalidationService: clearCache method not available on optimizedFirebaseService');
        }
      } catch (error) {
        console.error('❌ CacheInvalidationService: Error clearing cache for pattern:', pattern, error);
      }
    });

    console.log(`🔄 CacheInvalidationService: Processed ${patterns.length} cache invalidations`);
    this.invalidationTimer = null;
  }

  /**
   * Force immediate invalidation
   */
  forceInvalidate(patterns: string | string[]) {
    const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
    
    patternsArray.forEach(pattern => {
      try {
        if (optimizedFirebaseService && typeof optimizedFirebaseService.clearCache === 'function') {
          optimizedFirebaseService.clearCache(pattern);
        } else {
          console.warn('⚠️ CacheInvalidationService: clearCache method not available on optimizedFirebaseService');
        }
      } catch (error) {
        console.error('❌ CacheInvalidationService: Error force clearing cache for pattern:', pattern, error);
      }
    });

    console.log(`🔄 CacheInvalidationService: Force invalidated ${patternsArray.length} cache patterns`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    try {
      if (optimizedFirebaseService && typeof optimizedFirebaseService.getCacheStats === 'function') {
        return optimizedFirebaseService.getCacheStats();
      } else {
        console.warn('⚠️ CacheInvalidationService: getCacheStats method not available on optimizedFirebaseService');
        return {
          queueLength: 0,
          hasTimer: false,
          requestDeduplicationStats: {}
        };
      }
    } catch (error) {
      console.error('❌ CacheInvalidationService: Error getting cache stats:', error);
      return {
        queueLength: 0,
        hasTimer: false,
        requestDeduplicationStats: {}
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheInvalidationConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 CacheInvalidationService: Configuration updated', this.config);
  }

  /**
   * Add custom invalidation rule
   */
  addRule(rule: InvalidationRule) {
    this.config.rules.push(rule);
    console.log('🔄 CacheInvalidationService: Added custom rule', rule);
  }

  /**
   * Remove invalidation rule
   */
  removeRule(pattern: string) {
    this.config.rules = this.config.rules.filter(rule => rule.pattern !== pattern);
    console.log('🔄 CacheInvalidationService: Removed rule for pattern', pattern);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.invalidationTimer) {
      clearTimeout(this.invalidationTimer);
      this.invalidationTimer = null;
    }

    this.invalidationQueue.clear();
    console.log('🧹 CacheInvalidationService: Cleanup completed');
  }
}

// Export singleton instance
export const cacheInvalidationService = new CacheInvalidationService();

// Helper functions for common invalidation scenarios
export const invalidateTableCache = (restaurantId: string) => {
  cacheInvalidationService.invalidateByTrigger('table-update', restaurantId);
};

export const invalidateOrderCache = (restaurantId: string) => {
  cacheInvalidationService.invalidateByTrigger('order-update', restaurantId);
};

export const invalidateMenuCache = (restaurantId: string) => {
  cacheInvalidationService.invalidateByTrigger('menu-update', restaurantId);
};

export const invalidateInventoryCache = (restaurantId: string) => {
  cacheInvalidationService.invalidateByTrigger('inventory-update', restaurantId);
};

export const invalidateCustomerCache = (restaurantId: string) => {
  cacheInvalidationService.invalidateByTrigger('customer-update', restaurantId);
};

export default cacheInvalidationService;
