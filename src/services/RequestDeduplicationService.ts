interface RequestCache {
  [key: string]: {
    promise: Promise<any>;
    timestamp: number;
    ttl: number;
  };
}

interface RequestConfig {
  ttl?: number; // Time to live in milliseconds
  maxAge?: number; // Maximum age before refresh
  keyGenerator?: (...args: any[]) => string;
}

class RequestDeduplicationService {
  private cache: RequestCache = {};
  private readonly DEFAULT_TTL = 30000; // 30 seconds
  private readonly DEFAULT_MAX_AGE = 60000; // 1 minute
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Start cleanup interval
   */
  private startCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Deduplicate a request
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const ttl = config.ttl || this.DEFAULT_TTL;
    const maxAge = config.maxAge || this.DEFAULT_MAX_AGE;
    
    // Check if request is already in progress
    const cached = this.cache[key];
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      // If request is still fresh, return cached promise
      if (age < maxAge) {
        console.log('🔄 RequestDeduplicationService: Returning cached request:', key);
        return cached.promise;
      }
      
      // If request is stale, remove it and create new one
      console.log('🔄 RequestDeduplicationService: Request expired, creating new one:', key);
      delete this.cache[key];
    }
    
    // Create new request
    const promise = requestFn().catch(error => {
      // Remove from cache on error
      delete this.cache[key];
      throw error;
    });
    
    // Cache the promise
    this.cache[key] = {
      promise,
      timestamp: Date.now(),
      ttl
    };
    
    console.log('🔄 RequestDeduplicationService: Cached new request:', key);
    return promise;
  }

  /**
   * Deduplicate Firebase operations
   */
  async deduplicateFirebaseOperation<T>(
    operation: string,
    params: any,
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const key = this.generateFirebaseKey(operation, params);
    return this.deduplicate(key, requestFn, config);
  }

  /**
   * Deduplicate inventory operations
   */
  async deduplicateInventoryOperation<T>(
    operation: string,
    itemId: string,
    params: any,
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const key = `inventory:${operation}:${itemId}:${JSON.stringify(params)}`;
    return this.deduplicate(key, requestFn, config);
  }

  /**
   * Deduplicate order operations
   */
  async deduplicateOrderOperation<T>(
    operation: string,
    orderId: string,
    params: any,
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const key = `order:${operation}:${orderId}:${JSON.stringify(params)}`;
    return this.deduplicate(key, requestFn, config);
  }

  /**
   * Generate Firebase operation key
   */
  private generateFirebaseKey(operation: string, params: any): string {
    const sortedParams = this.sortObjectKeys(params);
    return `firebase:${operation}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Sort object keys for consistent hashing
   */
  private sortObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObjectKeys(obj[key]);
    });
    
    return sorted;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    Object.keys(this.cache).forEach(key => {
      const cached = this.cache[key];
      if (now - cached.timestamp > cached.ttl) {
        delete this.cache[key];
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log('🔄 RequestDeduplicationService: Cleaned up', cleanedCount, 'expired entries');
    }
  }

  /**
   * Clear all cached requests
   */
  clearAll() {
    this.cache = {};
    console.log('🔄 RequestDeduplicationService: Cleared all cached requests');
  }

  /**
   * Clear specific request
   */
  clear(key: string) {
    if (this.cache[key]) {
      delete this.cache[key];
      console.log('🔄 RequestDeduplicationService: Cleared request:', key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Object.keys(this.cache).map(key => {
      const cached = this.cache[key];
      return {
        key,
        age: now - cached.timestamp,
        ttl: cached.ttl
      };
    });
    
    return {
      totalEntries: entries.length,
      entries: entries.sort((a, b) => b.age - a.age)
    };
  }

  /**
   * Preload common requests
   */
  async preloadRequests(requests: Array<{
    key: string;
    requestFn: () => Promise<any>;
    config?: RequestConfig;
  }>) {
    const promises = requests.map(req => 
      this.deduplicate(req.key, req.requestFn, req.config)
    );
    
    try {
      await Promise.all(promises);
      console.log('🔄 RequestDeduplicationService: Preloaded', requests.length, 'requests');
    } catch (error) {
      console.warn('⚠️ RequestDeduplicationService: Some preload requests failed:', error);
    }
  }
}

// Singleton instance
let requestDeduplicationService: RequestDeduplicationService | null = null;

export function getRequestDeduplicationService(): RequestDeduplicationService {
  if (!requestDeduplicationService) {
    requestDeduplicationService = new RequestDeduplicationService();
  }
  return requestDeduplicationService;
}

export function initializeRequestDeduplicationService(): RequestDeduplicationService {
  if (requestDeduplicationService) {
    requestDeduplicationService.stopCleanup();
  }
  requestDeduplicationService = new RequestDeduplicationService();
  return requestDeduplicationService;
}

export default RequestDeduplicationService;
