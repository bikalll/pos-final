interface DebounceConfig {
  delay: number;
  maxDelay: number;
  leading: boolean;
  trailing: boolean;
}

interface DebouncedFunction {
  id: string;
  func: Function;
  args: any[];
  config: DebounceConfig;
  timer: NodeJS.Timeout | null;
  lastCall: number;
  callCount: number;
}

class DebouncingService {
  private debouncedFunctions = new Map<string, DebouncedFunction>();
  private readonly DEFAULT_CONFIG: DebounceConfig = {
    delay: 300,
    maxDelay: 2000,
    leading: false,
    trailing: true
  };

  /**
   * Create a debounced function
   */
  debounce<T extends Function>(
    id: string,
    func: T,
    config: Partial<DebounceConfig> = {}
  ): T {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const debouncedFunc = (...args: any[]) => {
      const existing = this.debouncedFunctions.get(id);
      
      if (existing) {
        // Clear existing timer
        if (existing.timer) {
          clearTimeout(existing.timer);
        }
        
        // Update function and args
        existing.func = func;
        existing.args = args;
        existing.lastCall = Date.now();
        existing.callCount++;
        
        // Check if we should execute immediately (leading edge)
        if (finalConfig.leading && existing.callCount === 1) {
          return func(...args);
        }
        
        // Check if we've exceeded max delay
        const timeSinceFirstCall = Date.now() - (existing.lastCall - (existing.callCount - 1) * finalConfig.delay);
        if (timeSinceFirstCall >= finalConfig.maxDelay) {
          existing.timer = null;
          return func(...args);
        }
        
        // Set new timer
        existing.timer = setTimeout(() => {
          if (finalConfig.trailing) {
            func(...args);
          }
          this.debouncedFunctions.delete(id);
        }, finalConfig.delay);
        
      } else {
        // Create new debounced function
        const debounced: DebouncedFunction = {
          id,
          func,
          args,
          config: finalConfig,
          timer: null,
          lastCall: Date.now(),
          callCount: 1
        };
        
        // Execute immediately if leading edge
        if (finalConfig.leading) {
          func(...args);
        }
        
        // Set timer for trailing edge
        if (finalConfig.trailing) {
          debounced.timer = setTimeout(() => {
            func(...args);
            this.debouncedFunctions.delete(id);
          }, finalConfig.delay);
        }
        
        this.debouncedFunctions.set(id, debounced);
      }
    };
    
    return debouncedFunc as T;
  }

  /**
   * Cancel a debounced function
   */
  cancel(id: string) {
    const debounced = this.debouncedFunctions.get(id);
    if (debounced && debounced.timer) {
      clearTimeout(debounced.timer);
      this.debouncedFunctions.delete(id);
      console.log('🔄 DebouncingService: Cancelled debounced function:', id);
    }
  }

  /**
   * Flush a debounced function (execute immediately)
   */
  flush(id: string) {
    const debounced = this.debouncedFunctions.get(id);
    if (debounced) {
      if (debounced.timer) {
        clearTimeout(debounced.timer);
      }
      const result = debounced.func(...debounced.args);
      this.debouncedFunctions.delete(id);
      console.log('🔄 DebouncingService: Flushed debounced function:', id);
      return result;
    }
  }

  /**
   * Check if a function is pending
   */
  isPending(id: string): boolean {
    return this.debouncedFunctions.has(id);
  }

  /**
   * Get all pending functions
   */
  getPendingFunctions(): string[] {
    return Array.from(this.debouncedFunctions.keys());
  }

  /**
   * Clear all debounced functions
   */
  clearAll() {
    this.debouncedFunctions.forEach(debounced => {
      if (debounced.timer) {
        clearTimeout(debounced.timer);
      }
    });
    this.debouncedFunctions.clear();
    console.log('🔄 DebouncingService: Cleared all debounced functions');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      pendingCount: this.debouncedFunctions.size,
      pendingFunctions: Array.from(this.debouncedFunctions.keys())
    };
  }
}

// Singleton instance
let debouncingService: DebouncingService | null = null;

export function getDebouncingService(): DebouncingService {
  if (!debouncingService) {
    debouncingService = new DebouncingService();
  }
  return debouncingService;
}

export default DebouncingService;
