import { getBackgroundProcessingService } from './BackgroundProcessingService';
import { getDebouncingService } from './DebouncingService';
import { getRequestDeduplicationService } from './RequestDeduplicationService';
import { getOptimizedFirebaseService } from './OptimizedFirebaseService';
import { getErrorHandlingService } from './ErrorHandlingService';
import { getPeriodicCleanupService } from './PeriodicCleanupService';
import { getPerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface OptimizationConfig {
  backgroundProcessing: {
    enabled: boolean;
    maxConcurrentTasks: number;
    processingInterval: number;
  };
  debouncing: {
    enabled: boolean;
    defaultDelay: number;
    maxDelay: number;
  };
  deduplication: {
    enabled: boolean;
    defaultTtl: number;
    maxAge: number;
  };
  firebaseOptimization: {
    enabled: boolean;
    batchSize: number;
    batchDelay: number;
    maxRetries: number;
  };
  errorHandling: {
    enabled: boolean;
    logToExternal: boolean;
    maxErrorLogSize: number;
  };
  periodicCleanup: {
    enabled: boolean;
    intervals: {
      quick: number;
      normal: number;
      deep: number;
    };
  };
  performanceMonitoring: {
    enabled: boolean;
    alertThresholds: {
      renderTime: number;
      listenerCount: number;
      memoryUsage: number;
    };
  };
}

class OptimizationInitializer {
  private config: OptimizationConfig;
  private initialized = false;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      backgroundProcessing: {
        enabled: true,
        maxConcurrentTasks: 3,
        processingInterval: 1000,
      },
      debouncing: {
        enabled: true,
        defaultDelay: 300,
        maxDelay: 2000,
      },
      deduplication: {
        enabled: true,
        defaultTtl: 30000,
        maxAge: 60000,
      },
      firebaseOptimization: {
        enabled: true,
        batchSize: 10,
        batchDelay: 500,
        maxRetries: 3,
      },
      errorHandling: {
        enabled: true,
        logToExternal: false,
        maxErrorLogSize: 500,
      },
      periodicCleanup: {
        enabled: true,
        intervals: {
          quick: 30000, // 30 seconds
          normal: 300000, // 5 minutes
          deep: 1800000, // 30 minutes
        },
      },
      performanceMonitoring: {
        enabled: true,
        alertThresholds: {
          renderTime: 100,
          listenerCount: 50,
          memoryUsage: 100,
        },
      },
      ...config,
    };
  }

  /**
   * Initialize all optimization services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔄 OptimizationInitializer: Already initialized');
      return;
    }

    console.log('🚀 OptimizationInitializer: Starting initialization...');

    try {
      // Initialize services in order of dependency
      await this.initializeErrorHandling();
      await this.initializePerformanceMonitoring();
      await this.initializeDeduplication();
      await this.initializeDebouncing();
      await this.initializeBackgroundProcessing();
      await this.initializeFirebaseOptimization();
      await this.initializePeriodicCleanup();

      this.initialized = true;
      console.log('✅ OptimizationInitializer: All services initialized successfully');

      // Log service status
      this.logServiceStatus();

    } catch (error) {
      console.error('❌ OptimizationInitializer: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize error handling service
   */
  private async initializeErrorHandling(): Promise<void> {
    if (!this.config.errorHandling.enabled) {
      console.log('⏭️ OptimizationInitializer: Error handling disabled');
      return;
    }

    try {
      const errorHandlingService = getErrorHandlingService();
      console.log('✅ OptimizationInitializer: Error handling service initialized');
    } catch (error) {
      console.error('❌ OptimizationInitializer: Error handling initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    if (!this.config.performanceMonitoring.enabled) {
      console.log('⏭️ OptimizationInitializer: Performance monitoring disabled');
      return;
    }

    try {
      const performanceMonitor = getPerformanceMonitor();
      performanceMonitor.updateConfig({
        renderTimeThreshold: this.config.performanceMonitoring.alertThresholds.renderTime,
        listenerCountThreshold: this.config.performanceMonitoring.alertThresholds.listenerCount,
        memoryThreshold: this.config.performanceMonitoring.alertThresholds.memoryUsage,
      });
      console.log('✅ OptimizationInitializer: Performance monitoring initialized');
    } catch (error) {
      console.error('❌ OptimizationInitializer: Performance monitoring initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize request deduplication service
   */
  private async initializeDeduplication(): Promise<void> {
    if (!this.config.deduplication.enabled) {
      console.log('⏭️ OptimizationInitializer: Request deduplication disabled');
      return;
    }

    try {
      const deduplicationService = getRequestDeduplicationService();
      console.log('✅ OptimizationInitializer: Request deduplication service initialized');
    } catch (error) {
      console.error('❌ OptimizationInitializer: Request deduplication initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize debouncing service
   */
  private async initializeDebouncing(): Promise<void> {
    if (!this.config.debouncing.enabled) {
      console.log('⏭️ OptimizationInitializer: Debouncing disabled');
      return;
    }

    try {
      const debouncingService = getDebouncingService();
      console.log('✅ OptimizationInitializer: Debouncing service initialized');
    } catch (error) {
      console.error('❌ OptimizationInitializer: Debouncing initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize background processing service
   */
  private async initializeBackgroundProcessing(): Promise<void> {
    if (!this.config.backgroundProcessing.enabled) {
      console.log('⏭️ OptimizationInitializer: Background processing disabled');
      return;
    }

    try {
      const backgroundService = getBackgroundProcessingService();
      console.log('✅ OptimizationInitializer: Background processing service initialized');
    } catch (error) {
      console.error('❌ OptimizationInitializer: Background processing initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Firebase optimization service
   */
  private async initializeFirebaseOptimization(): Promise<void> {
    if (!this.config.firebaseOptimization.enabled) {
      console.log('⏭️ OptimizationInitializer: Firebase optimization disabled');
      return;
    }

    try {
      const optimizedFirebaseService = getOptimizedFirebaseService();
      console.log('✅ OptimizationInitializer: Firebase optimization service initialized');
    } catch (error) {
      console.error('❌ OptimizationInitializer: Firebase optimization initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize periodic cleanup service
   */
  private async initializePeriodicCleanup(): Promise<void> {
    if (!this.config.periodicCleanup.enabled) {
      console.log('⏭️ OptimizationInitializer: Periodic cleanup disabled');
      return;
    }

    try {
      const cleanupService = getPeriodicCleanupService();
      cleanupService.updateConfig({
        intervals: this.config.periodicCleanup.intervals,
      });
      cleanupService.start();
      console.log('✅ OptimizationInitializer: Periodic cleanup service initialized and started');
    } catch (error) {
      console.error('❌ OptimizationInitializer: Periodic cleanup initialization failed:', error);
      throw error;
    }
  }

  /**
   * Log service status
   */
  private logServiceStatus(): void {
    console.log('📊 OptimizationInitializer: Service Status:');
    
    try {
      const backgroundService = getBackgroundProcessingService();
      const backgroundStatus = backgroundService.getQueueStatus();
      console.log('  - Background Processing:', backgroundStatus);
    } catch {}

    try {
      const debouncingService = getDebouncingService();
      const debouncingStats = debouncingService.getStats();
      console.log('  - Debouncing:', debouncingStats);
    } catch {}

    try {
      const deduplicationService = getRequestDeduplicationService();
      const deduplicationStats = deduplicationService.getStats();
      console.log('  - Deduplication:', deduplicationStats);
    } catch {}

    try {
      const optimizedFirebaseService = getOptimizedFirebaseService();
      const firebaseStatus = optimizedFirebaseService.getQueueStatus();
      console.log('  - Firebase Optimization:', firebaseStatus);
    } catch {}

    try {
      const errorHandlingService = getErrorHandlingService();
      const errorStats = errorHandlingService.getErrorStats();
      console.log('  - Error Handling:', errorStats);
    } catch {}

    try {
      const cleanupService = getPeriodicCleanupService();
      const cleanupStats = cleanupService.getStats();
      console.log('  - Periodic Cleanup:', cleanupStats);
    } catch {}

    try {
      const performanceMonitor = getPerformanceMonitor();
      const performanceStats = performanceMonitor.getStats();
      console.log('  - Performance Monitoring:', performanceStats);
    } catch {}
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      console.log('🔄 OptimizationInitializer: Not initialized');
      return;
    }

    console.log('🔄 OptimizationInitializer: Shutting down services...');

    try {
      // Stop periodic cleanup first
      const cleanupService = getPeriodicCleanupService();
      cleanupService.stop();

      // Clear all services
      const backgroundService = getBackgroundProcessingService();
      backgroundService.clearQueues();

      const debouncingService = getDebouncingService();
      debouncingService.clearAll();

      const deduplicationService = getRequestDeduplicationService();
      deduplicationService.clearAll();

      const optimizedFirebaseService = getOptimizedFirebaseService();
      optimizedFirebaseService.clearQueue();

      const errorHandlingService = getErrorHandlingService();
      errorHandlingService.clearErrorLog();

      const performanceMonitor = getPerformanceMonitor();
      performanceMonitor.clear();

      this.initialized = false;
      console.log('✅ OptimizationInitializer: All services shut down successfully');

    } catch (error) {
      console.error('❌ OptimizationInitializer: Shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 OptimizationInitializer: Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get comprehensive service status
   */
  getServiceStatus() {
    return {
      initialized: this.initialized,
      config: this.config,
      services: {
        backgroundProcessing: this.getServiceStatusSafe(() => getBackgroundProcessingService().getQueueStatus()),
        debouncing: this.getServiceStatusSafe(() => getDebouncingService().getStats()),
        deduplication: this.getServiceStatusSafe(() => getRequestDeduplicationService().getStats()),
        firebaseOptimization: this.getServiceStatusSafe(() => getOptimizedFirebaseService().getQueueStatus()),
        errorHandling: this.getServiceStatusSafe(() => getErrorHandlingService().getErrorStats()),
        periodicCleanup: this.getServiceStatusSafe(() => getPeriodicCleanupService().getStats()),
        performanceMonitoring: this.getServiceStatusSafe(() => getPerformanceMonitor().getStats()),
      }
    };
  }

  /**
   * Safely get service status
   */
  private getServiceStatusSafe(getStatus: () => any) {
    try {
      return getStatus();
    } catch (error) {
      return { error: 'Service not available' };
    }
  }
}

// Singleton instance
let optimizationInitializer: OptimizationInitializer | null = null;

export function getOptimizationInitializer(): OptimizationInitializer {
  if (!optimizationInitializer) {
    optimizationInitializer = new OptimizationInitializer();
  }
  return optimizationInitializer;
}

export function initializeOptimizationServices(config?: Partial<OptimizationConfig>): Promise<OptimizationInitializer> {
  if (optimizationInitializer) {
    return optimizationInitializer.shutdown().then(() => {
      optimizationInitializer = new OptimizationInitializer(config);
      return optimizationInitializer.initialize().then(() => optimizationInitializer!);
    });
  } else {
    optimizationInitializer = new OptimizationInitializer(config);
    return optimizationInitializer.initialize().then(() => optimizationInitializer!);
  }
}

export default OptimizationInitializer;
