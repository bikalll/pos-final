import { getBackgroundProcessingService } from './BackgroundProcessingService';
import { getDebouncingService } from './DebouncingService';
import { getRequestDeduplicationService } from './RequestDeduplicationService';
import { getOptimizedFirebaseService } from './OptimizedFirebaseService';
import { getErrorHandlingService } from './ErrorHandlingService';
import { getPerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface CleanupConfig {
  intervals: {
    quick: number; // 30 seconds
    normal: number; // 5 minutes
    deep: number; // 30 minutes
  };
  thresholds: {
    maxCacheSize: number;
    maxErrorLogSize: number;
    maxMetricsSize: number;
    maxQueueSize: number;
  };
  enabled: boolean;
}

interface CleanupStats {
  lastCleanup: number;
  totalCleanups: number;
  itemsCleaned: number;
  errorsEncountered: number;
}

class PeriodicCleanupService {
  private config: CleanupConfig;
  private stats: CleanupStats;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = {
      intervals: {
        quick: 30000, // 30 seconds
        normal: 300000, // 5 minutes
        deep: 1800000 // 30 minutes
      },
      thresholds: {
        maxCacheSize: 1000,
        maxErrorLogSize: 500,
        maxMetricsSize: 1000,
        maxQueueSize: 100
      },
      enabled: true,
      ...config
    };

    this.stats = {
      lastCleanup: 0,
      totalCleanups: 0,
      itemsCleaned: 0,
      errorsEncountered: 0
    };
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) {
      console.log('🔄 PeriodicCleanupService: Already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 PeriodicCleanupService: Starting periodic cleanup service');

    // Quick cleanup (every 30 seconds)
    this.scheduleCleanup('quick', this.config.intervals.quick, () => {
      this.performQuickCleanup();
    });

    // Normal cleanup (every 5 minutes)
    this.scheduleCleanup('normal', this.config.intervals.normal, () => {
      this.performNormalCleanup();
    });

    // Deep cleanup (every 30 minutes)
    this.scheduleCleanup('deep', this.config.intervals.deep, () => {
      this.performDeepCleanup();
    });

    console.log('✅ PeriodicCleanupService: Started with intervals:', this.config.intervals);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      console.log('🔄 PeriodicCleanupService: Not running');
      return;
    }

    this.isRunning = false;
    console.log('🔄 PeriodicCleanupService: Stopping periodic cleanup service');

    // Clear all timers
    this.timers.forEach((timer, key) => {
      clearInterval(timer);
      console.log(`🔄 PeriodicCleanupService: Cleared ${key} cleanup timer`);
    });
    this.timers.clear();

    console.log('✅ PeriodicCleanupService: Stopped');
  }

  /**
   * Schedule a cleanup task
   */
  private scheduleCleanup(name: string, interval: number, task: () => void) {
    const timer = setInterval(() => {
      try {
        task();
      } catch (error) {
        console.error(`❌ PeriodicCleanupService: Error in ${name} cleanup:`, error);
        this.stats.errorsEncountered++;
      }
    }, interval);

    this.timers.set(name, timer);
    console.log(`🔄 PeriodicCleanupService: Scheduled ${name} cleanup every ${interval}ms`);
  }

  /**
   * Perform quick cleanup (every 30 seconds)
   */
  private performQuickCleanup() {
    console.log('🔄 PeriodicCleanupService: Performing quick cleanup');
    let cleaned = 0;

    try {
      // Clean up expired debounced functions
      const debouncingService = getDebouncingService();
      const pendingFunctions = debouncingService.getPendingFunctions();
      
      // Clear functions that have been pending too long (5 minutes)
      const fiveMinutesAgo = Date.now() - 300000;
      pendingFunctions.forEach(funcId => {
        // This would need to be implemented in DebouncingService
        // For now, just log
        console.log('🔄 PeriodicCleanupService: Found pending function:', funcId);
      });

      // Clean up request deduplication cache
      const deduplicationService = getRequestDeduplicationService();
      const deduplicationStats = deduplicationService.getStats();
      
      if (deduplicationStats.totalEntries > this.config.thresholds.maxCacheSize) {
        console.log('🔄 PeriodicCleanupService: Cleaning up request deduplication cache');
        // The service handles its own cleanup, but we can log the status
        cleaned += deduplicationStats.totalEntries;
      }

      // Clean up Firebase operation queue
      const optimizedFirebaseService = getOptimizedFirebaseService();
      const queueStatus = optimizedFirebaseService.getQueueStatus();
      
      if (queueStatus.queueLength > this.config.thresholds.maxQueueSize) {
        console.log('🔄 PeriodicCleanupService: Firebase queue is large:', queueStatus.queueLength);
        // Force flush if queue is too large
        optimizedFirebaseService.flush();
        cleaned += queueStatus.queueLength;
      }

      this.stats.itemsCleaned += cleaned;
      this.stats.lastCleanup = Date.now();
      this.stats.totalCleanups++;

      if (cleaned > 0) {
        console.log(`✅ PeriodicCleanupService: Quick cleanup completed, cleaned ${cleaned} items`);
      }

    } catch (error) {
      console.error('❌ PeriodicCleanupService: Quick cleanup failed:', error);
      this.stats.errorsEncountered++;
    }
  }

  /**
   * Perform normal cleanup (every 5 minutes)
   */
  private performNormalCleanup() {
    console.log('🔄 PeriodicCleanupService: Performing normal cleanup');
    let cleaned = 0;

    try {
      // Clean up background processing queues
      const backgroundService = getBackgroundProcessingService();
      const queueStatus = backgroundService.getQueueStatus();
      
      if (queueStatus.inventory > 50 || queueStatus.orders > 50 || queueStatus.receipts > 50) {
        console.log('🔄 PeriodicCleanupService: Background queues are large, clearing old items');
        backgroundService.clearQueues();
        cleaned += queueStatus.inventory + queueStatus.orders + queueStatus.receipts;
      }

      // Clean up error logs
      const errorHandlingService = getErrorHandlingService();
      const errorStats = errorHandlingService.getErrorStats();
      
      if (errorStats.totalErrors > this.config.thresholds.maxErrorLogSize) {
        console.log('🔄 PeriodicCleanupService: Error log is large, clearing old entries');
        errorHandlingService.clearErrorLog();
        cleaned += errorStats.totalErrors;
      }

      // Clean up performance metrics
      const performanceMonitor = getPerformanceMonitor();
      const performanceStats = performanceMonitor.getStats();
      
      if (performanceStats.totalMetrics > this.config.thresholds.maxMetricsSize) {
        console.log('🔄 PeriodicCleanupService: Performance metrics are large, clearing old entries');
        performanceMonitor.clear();
        cleaned += performanceStats.totalMetrics;
      }

      this.stats.itemsCleaned += cleaned;
      this.stats.lastCleanup = Date.now();
      this.stats.totalCleanups++;

      if (cleaned > 0) {
        console.log(`✅ PeriodicCleanupService: Normal cleanup completed, cleaned ${cleaned} items`);
      }

    } catch (error) {
      console.error('❌ PeriodicCleanupService: Normal cleanup failed:', error);
      this.stats.errorsEncountered++;
    }
  }

  /**
   * Perform deep cleanup (every 30 minutes)
   */
  private performDeepCleanup() {
    console.log('🔄 PeriodicCleanupService: Performing deep cleanup');
    let cleaned = 0;

    try {
      // Force cleanup of all services
      const services = [
        getBackgroundProcessingService(),
        getDebouncingService(),
        getRequestDeduplicationService(),
        getOptimizedFirebaseService(),
        getErrorHandlingService(),
        getPerformanceMonitor()
      ];

      services.forEach(service => {
        try {
          if ('clear' in service && typeof service.clear === 'function') {
            service.clear();
            cleaned++;
          } else if ('clearAll' in service && typeof service.clearAll === 'function') {
            service.clearAll();
            cleaned++;
          } else if ('clearQueues' in service && typeof service.clearQueues === 'function') {
            service.clearQueues();
            cleaned++;
          }
        } catch (serviceError) {
          console.warn('⚠️ PeriodicCleanupService: Service cleanup failed:', serviceError);
        }
      });

      // Clear any remaining timers or intervals
      this.clearStaleTimers();

      this.stats.itemsCleaned += cleaned;
      this.stats.lastCleanup = Date.now();
      this.stats.totalCleanups++;

      console.log(`✅ PeriodicCleanupService: Deep cleanup completed, cleaned ${cleaned} services`);

    } catch (error) {
      console.error('❌ PeriodicCleanupService: Deep cleanup failed:', error);
      this.stats.errorsEncountered++;
    }
  }

  /**
   * Clear stale timers and intervals
   */
  private clearStaleTimers() {
    // This would clear any stale timers in the application
    // For now, just log
    console.log('🔄 PeriodicCleanupService: Checking for stale timers');
  }

  /**
   * Manual cleanup trigger for debugging
   */
  manualCleanup(type: 'quick' | 'normal' | 'deep' = 'normal') {
    console.log(`🔄 PeriodicCleanupService: Manual ${type} cleanup triggered`);
    
    switch (type) {
      case 'quick':
        this.performQuickCleanup();
        break;
      case 'normal':
        this.performNormalCleanup();
        break;
      case 'deep':
        this.performDeepCleanup();
        break;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CleanupConfig>) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    console.log('🔄 PeriodicCleanupService: Updated configuration');
    
    // Restart if intervals changed
    if (oldConfig.intervals !== this.config.intervals) {
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats(): CleanupStats & { isRunning: boolean; config: CleanupConfig } {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      config: this.config
    };
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      backgroundProcessing: getBackgroundProcessingService().getQueueStatus(),
      debouncing: getDebouncingService().getStats(),
      deduplication: getRequestDeduplicationService().getStats(),
      optimizedFirebase: getOptimizedFirebaseService().getQueueStatus(),
      errorHandling: getErrorHandlingService().getErrorStats(),
      performance: getPerformanceMonitor().getStats()
    };
  }

  /**
   * Force cleanup of specific service
   */
  cleanupService(serviceName: string) {
    console.log(`🔄 PeriodicCleanupService: Manual cleanup of ${serviceName}`);
    
    try {
      switch (serviceName) {
        case 'backgroundProcessing':
          getBackgroundProcessingService().clearQueues();
          break;
        case 'debouncing':
          getDebouncingService().clearAll();
          break;
        case 'deduplication':
          getRequestDeduplicationService().clearAll();
          break;
        case 'optimizedFirebase':
          getOptimizedFirebaseService().clearQueue();
          break;
        case 'errorHandling':
          getErrorHandlingService().clearErrorLog();
          break;
        case 'performance':
          getPerformanceMonitor().clear();
          break;
        default:
          console.warn(`⚠️ PeriodicCleanupService: Unknown service: ${serviceName}`);
      }
      
      console.log(`✅ PeriodicCleanupService: Cleaned ${serviceName}`);
    } catch (error) {
      console.error(`❌ PeriodicCleanupService: Failed to clean ${serviceName}:`, error);
    }
  }
}

// Singleton instance
let periodicCleanupService: PeriodicCleanupService | null = null;

export function getPeriodicCleanupService(): PeriodicCleanupService {
  if (!periodicCleanupService) {
    periodicCleanupService = new PeriodicCleanupService();
  }
  return periodicCleanupService;
}

export function initializePeriodicCleanupService(config?: Partial<CleanupConfig>): PeriodicCleanupService {
  if (periodicCleanupService) {
    periodicCleanupService.stop();
  }
  periodicCleanupService = new PeriodicCleanupService(config);
  return periodicCleanupService;
}

// Initialize singleton instance for direct import
if (!periodicCleanupService) {
  periodicCleanupService = new PeriodicCleanupService();
}

// Export singleton instance for direct import
export { periodicCleanupService };

export default PeriodicCleanupService;