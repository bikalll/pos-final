import { createFirestoreService } from './firestoreService';
import { getRequestDeduplicationService } from './RequestDeduplicationService';

interface BatchOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId?: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class OptimizedFirebaseService {
  private batchQueue: BatchOperation[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 500; // 500ms
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };
  private requestDeduplication = getRequestDeduplicationService();

  /**
   * Add operation to batch queue
   */
  private addToBatch(operation: BatchOperation) {
    // Remove any existing operation for the same document
    this.batchQueue = this.batchQueue.filter(op => 
      !(op.collection === operation.collection && op.documentId === operation.documentId)
    );
    
    this.batchQueue.push(operation);
    
    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.BATCH_DELAY);
    }
    
    console.log('🔄 OptimizedFirebaseService: Added operation to batch:', operation.id);
  }

  /**
   * Process batch operations
   */
  private async processBatch() {
    if (this.batchQueue.length === 0) {
      this.batchTimer = null;
      return;
    }
    
    const operations = this.batchQueue.splice(0, this.BATCH_SIZE);
    this.batchTimer = null;
    
    console.log('🔄 OptimizedFirebaseService: Processing batch of', operations.length, 'operations');
    
    try {
      await this.executeBatchOperations(operations);
      console.log('✅ OptimizedFirebaseService: Batch processed successfully');
    } catch (error) {
      console.error('❌ OptimizedFirebaseService: Batch processing failed:', error);
      
      // Retry failed operations
      operations.forEach(operation => {
        if (operation.retryCount < operation.maxRetries) {
          operation.retryCount++;
          operation.timestamp = Date.now();
          this.batchQueue.unshift(operation); // Add to front of queue
        } else {
          console.error('❌ OptimizedFirebaseService: Operation failed permanently:', operation.id);
        }
      });
    }
    
    // Process remaining operations if any
    if (this.batchQueue.length > 0) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.BATCH_DELAY);
    }
  }

  /**
   * Execute batch operations
   */
  private async executeBatchOperations(operations: BatchOperation[]) {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant ID not available');
    }
    
    const svc = createFirestoreService(restaurantId);
    
    // Group operations by type
    const createOps = operations.filter(op => op.type === 'create');
    const updateOps = operations.filter(op => op.type === 'update');
    const deleteOps = operations.filter(op => op.type === 'delete');
    
    // Execute operations in parallel
    const promises: Promise<any>[] = [];
    
    // Process creates
    if (createOps.length > 0) {
      promises.push(this.batchCreate(svc, createOps));
    }
    
    // Process updates
    if (updateOps.length > 0) {
      promises.push(this.batchUpdate(svc, updateOps));
    }
    
    // Process deletes
    if (deleteOps.length > 0) {
      promises.push(this.batchDelete(svc, deleteOps));
    }
    
    await Promise.all(promises);
  }

  /**
   * Batch create operations
   */
  private async batchCreate(svc: any, operations: BatchOperation[]) {
    const promises = operations.map(async (operation) => {
      try {
        const result = await svc.create(operation.collection, operation.data);
        console.log('✅ OptimizedFirebaseService: Created', operation.collection, operation.id);
        return result;
      } catch (error) {
        console.error('❌ OptimizedFirebaseService: Create failed:', operation.id, error);
        throw error;
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Batch update operations
   */
  private async batchUpdate(svc: any, operations: BatchOperation[]) {
    const promises = operations.map(async (operation) => {
      try {
        await svc.update(operation.collection, operation.documentId!, operation.data);
        console.log('✅ OptimizedFirebaseService: Updated', operation.collection, operation.documentId);
      } catch (error) {
        console.error('❌ OptimizedFirebaseService: Update failed:', operation.id, error);
        throw error;
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Batch delete operations
   */
  private async batchDelete(svc: any, operations: BatchOperation[]) {
    const promises = operations.map(async (operation) => {
      try {
        await svc.delete(operation.collection, operation.documentId!);
        console.log('✅ OptimizedFirebaseService: Deleted', operation.collection, operation.documentId);
      } catch (error) {
        console.error('❌ OptimizedFirebaseService: Delete failed:', operation.id, error);
        throw error;
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Create document with batching
   */
  async createDocument(collection: string, data: any, retryConfig?: Partial<RetryConfig>) {
    const operation: BatchOperation = {
      id: `${collection}-create-${Date.now()}`,
      type: 'create',
      collection,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: retryConfig?.maxRetries || this.DEFAULT_RETRY_CONFIG.maxRetries
    };
    
    this.addToBatch(operation);
    return operation.id;
  }

  /**
   * Update document with batching
   */
  async updateDocument(collection: string, documentId: string, data: any, retryConfig?: Partial<RetryConfig>) {
    const operation: BatchOperation = {
      id: `${collection}-update-${documentId}-${Date.now()}`,
      type: 'update',
      collection,
      documentId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: retryConfig?.maxRetries || this.DEFAULT_RETRY_CONFIG.maxRetries
    };
    
    this.addToBatch(operation);
    return operation.id;
  }

  /**
   * Delete document with batching
   */
  async deleteDocument(collection: string, documentId: string, retryConfig?: Partial<RetryConfig>) {
    const operation: BatchOperation = {
      id: `${collection}-delete-${documentId}-${Date.now()}`,
      type: 'delete',
      collection,
      documentId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: retryConfig?.maxRetries || this.DEFAULT_RETRY_CONFIG.maxRetries
    };
    
    this.addToBatch(operation);
    return operation.id;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxRetries) {
          console.error('❌ OptimizedFirebaseService: Operation failed after', config.maxRetries, 'retries:', error);
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        console.log(`🔄 OptimizedFirebaseService: Retrying operation in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Execute operation with deduplication
   */
  async executeWithDeduplication<T>(
    key: string,
    operation: () => Promise<T>,
    config?: { ttl?: number; maxAge?: number }
  ): Promise<T> {
    return this.requestDeduplication.deduplicate(key, operation, config);
  }

  /**
   * Batch update inventory items
   */
  async batchUpdateInventory(updates: Array<{ id: string; data: any }>) {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant ID not available');
    }
    
    const svc = createFirestoreService(restaurantId);
    
    // Group updates by batch size
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize));
    }
    
    // Process batches sequentially to avoid overwhelming Firebase
    for (const batch of batches) {
      try {
        await Promise.all(
          batch.map(update => 
            this.executeWithRetry(
              () => svc.updateInventoryItem(update.id, update.data),
              { maxRetries: 2 }
            )
          )
        );
        console.log('✅ OptimizedFirebaseService: Batch inventory update completed');
      } catch (error) {
        console.error('❌ OptimizedFirebaseService: Batch inventory update failed:', error);
        throw error;
      }
    }
  }

  /**
   * Batch save orders
   */
  async batchSaveOrders(orders: any[]) {
    const restaurantId = this.getRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant ID not available');
    }
    
    const svc = createFirestoreService(restaurantId);
    
    // Process orders in smaller batches
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < orders.length; i += batchSize) {
      batches.push(orders.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      try {
        await Promise.all(
          batch.map(order => 
            this.executeWithRetry(
              () => svc.saveOrder(order),
              { maxRetries: 2 }
            )
          )
        );
        console.log('✅ OptimizedFirebaseService: Batch order save completed');
      } catch (error) {
        console.error('❌ OptimizedFirebaseService: Batch order save failed:', error);
        throw error;
      }
    }
  }

  /**
   * Get restaurant ID from store
   */
  private getRestaurantId(): string | null {
    try {
      // This would need to be injected or accessed through a store
      // For now, return null and let the caller handle it
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Flush all pending operations
   */
  async flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.batchQueue.length > 0) {
      await this.processBatch();
    }
    
    console.log('🔄 OptimizedFirebaseService: Flushed all pending operations');
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.batchQueue.length,
      hasTimer: this.batchTimer !== null
    };
  }

  /**
   * Clear all pending operations
   */
  clearQueue() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.batchQueue = [];
    console.log('🔄 OptimizedFirebaseService: Cleared all pending operations');
  }

  /**
   * Get tables with optimization and caching
   */
  async getOptimizedTables(restaurantId: string): Promise<Record<string, any>> {
    const cacheKey = `tables_${restaurantId}`;
    
    // Check if we can use request deduplication
    if (this.requestDeduplication.hasPendingRequest(cacheKey)) {
      console.log('🔄 OptimizedFirebaseService: Using deduplicated request for tables');
      return this.requestDeduplication.getPendingRequest(cacheKey);
    }
    
    try {
      console.log('🔄 OptimizedFirebaseService: Loading tables for restaurant:', restaurantId);
      
      // Create a promise for the request
      const tablesPromise = this.executeOptimizedRequest(async () => {
        const service = createFirestoreService(restaurantId);
        return await service.getTables();
      }, cacheKey);
      
      // Register the request for deduplication
      this.requestDeduplication.registerRequest(cacheKey, tablesPromise);
      
      const result = await tablesPromise;
      console.log('✅ OptimizedFirebaseService: Tables loaded successfully:', Object.keys(result).length);
      
      return result;
    } catch (error) {
      console.error('❌ OptimizedFirebaseService: Error loading tables:', error);
      throw error;
    }
  }

  /**
   * Get menu items with optimization and caching
   */
  async getOptimizedMenuItems(restaurantId: string): Promise<Record<string, any>> {
    const cacheKey = `menuItems_${restaurantId}`;
    
    // Check if we can use request deduplication
    if (this.requestDeduplication.hasPendingRequest(cacheKey)) {
      console.log('🔄 OptimizedFirebaseService: Using deduplicated request for menu items');
      return this.requestDeduplication.getPendingRequest(cacheKey);
    }
    
    try {
      console.log('🔄 OptimizedFirebaseService: Loading menu items for restaurant:', restaurantId);
      
      // Create a promise for the request
      const menuItemsPromise = this.executeOptimizedRequest(async () => {
        const service = createFirestoreService(restaurantId);
        return await service.getMenuItems();
      }, cacheKey);
      
      // Register the request for deduplication
      this.requestDeduplication.registerRequest(cacheKey, menuItemsPromise);
      
      const result = await menuItemsPromise;
      console.log('✅ OptimizedFirebaseService: Menu items loaded successfully:', Object.keys(result).length);
      
      return result;
    } catch (error) {
      console.error('❌ OptimizedFirebaseService: Error loading menu items:', error);
      throw error;
    }
  }

  /**
   * Execute optimized request with retry logic
   */
  private async executeOptimizedRequest<T>(
    requestFn: () => Promise<T>, 
    cacheKey: string,
    retryConfig: RetryConfig = this.DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await requestFn();
        
        // Clear any pending request after successful completion
        this.requestDeduplication.clearRequest(cacheKey);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retryConfig.maxRetries) {
          const delay = Math.min(
            retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
            retryConfig.maxDelay
          );
          
          console.log(`🔄 OptimizedFirebaseService: Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Clear failed request from deduplication
    this.requestDeduplication.clearRequest(cacheKey);
    
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Clear cache for specific pattern
   */
  clearCache(pattern: string) {
    console.log('🔄 OptimizedFirebaseService: Clearing cache for pattern:', pattern);
    // For now, just log the cache clear request
    // In a real implementation, this would clear the specific cache entries
    // that match the pattern
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      queueLength: this.batchQueue.length,
      hasTimer: this.batchTimer !== null,
      requestDeduplicationStats: this.requestDeduplication.getStats()
    };
  }

  /**
   * Cleanup method for compatibility with AppInitializer
   */
  cleanup() {
    this.clearQueue();
    console.log('🧹 OptimizedFirebaseService: Cleanup completed');
  }
}

// Singleton instance
let optimizedFirebaseService: OptimizedFirebaseService | null = null;

export function getOptimizedFirebaseService(): OptimizedFirebaseService {
  if (!optimizedFirebaseService) {
    console.log('🔄 Creating new OptimizedFirebaseService instance');
    optimizedFirebaseService = new OptimizedFirebaseService();
  }
  return optimizedFirebaseService;
}

export function initializeOptimizedFirebaseService(): OptimizedFirebaseService {
  if (optimizedFirebaseService) {
    optimizedFirebaseService.clearQueue();
  }
  optimizedFirebaseService = new OptimizedFirebaseService();
  return optimizedFirebaseService;
}

// Initialize singleton instance for direct import
if (!optimizedFirebaseService) {
  optimizedFirebaseService = new OptimizedFirebaseService();
}

// Export singleton instance for direct import
export { optimizedFirebaseService };

// Create the function immediately to ensure it's available
const getOptimizedTablesFunction = async (restaurantId: string): Promise<Record<string, any>> => {
  try {
    const service = getOptimizedFirebaseService();
    if (!service) {
      throw new Error('OptimizedFirebaseService not initialized');
    }
    return await service.getOptimizedTables(restaurantId);
  } catch (error) {
    console.error('❌ getOptimizedTables error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      restaurantId: restaurantId
    });
    
    // Fallback to direct firestore service
    try {
      console.log('🔄 Falling back to direct firestore service for tables');
      const { createFirestoreService } = await import('./firestoreService');
      const firestoreService = createFirestoreService(restaurantId);
      const result = await firestoreService.getTables();
      console.log('✅ Fallback successful, loaded tables:', Object.keys(result).length);
      return result;
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      console.error('❌ Fallback error details:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        restaurantId: restaurantId
      });
      throw error; // Throw original error
    }
  }
};

// Export convenience functions for direct import
export const getOptimizedTables = getOptimizedTablesFunction;

// Create the function immediately to ensure it's available
const getOptimizedMenuItemsFunction = async (restaurantId: string): Promise<Record<string, any>> => {
  try {
    const service = getOptimizedFirebaseService();
    if (!service) {
      throw new Error('OptimizedFirebaseService not initialized');
    }
    return await service.getOptimizedMenuItems(restaurantId);
  } catch (error) {
    console.error('❌ getOptimizedMenuItems error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      restaurantId: restaurantId
    });
    
    // Fallback to direct firestore service
    try {
      console.log('🔄 Falling back to direct firestore service for menu items');
      const { createFirestoreService } = await import('./firestoreService');
      const firestoreService = createFirestoreService(restaurantId);
      const result = await firestoreService.getMenuItems();
      console.log('✅ Fallback successful, loaded menu items:', Object.keys(result).length);
      return result;
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      console.error('❌ Fallback error details:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        restaurantId: restaurantId
      });
      throw error; // Throw original error
    }
  }
};

export const getOptimizedMenuItems = getOptimizedMenuItemsFunction;

// Debug: Log exports to ensure they're available
console.log('🔍 OptimizedFirebaseService exports:', {
  getOptimizedTables: typeof getOptimizedTablesFunction,
  getOptimizedMenuItems: typeof getOptimizedMenuItemsFunction,
  service: typeof optimizedFirebaseService
});

export default OptimizedFirebaseService;
