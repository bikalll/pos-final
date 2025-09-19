/**
 * Performance Monitoring Service
 * Tracks app performance metrics and provides optimization recommendations
 */

interface PerformanceMetrics {
  listenerCount: number;
  reduxUpdateCount: number;
  memoryUsage: number;
  renderTime: number;
  firebaseCallCount: number;
  lastCleanup: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    listenerCount: 0,
    reduxUpdateCount: 0,
    memoryUsage: 0,
    renderTime: 0,
    firebaseCallCount: 0,
    lastCleanup: 0,
  };

  private thresholds = {
    maxListeners: 20,
    maxReduxUpdates: 1000,
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxRenderTime: 16, // 16ms for 60fps
    maxFirebaseCalls: 100,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
  };

  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];

  /**
   * Update listener count
   */
  updateListenerCount(count: number) {
    this.metrics.listenerCount = count;
    this.checkThresholds();
  }

  /**
   * Increment Redux update count
   */
  incrementReduxUpdates() {
    this.metrics.reduxUpdateCount++;
    this.checkThresholds();
  }

  /**
   * Update memory usage (if available)
   */
  updateMemoryUsage(usage: number) {
    this.metrics.memoryUsage = usage;
    this.checkThresholds();
  }

  /**
   * Record render time
   */
  recordRenderTime(time: number) {
    this.metrics.renderTime = time;
    this.checkThresholds();
  }

  /**
   * Increment Firebase call count
   */
  incrementFirebaseCalls() {
    this.metrics.firebaseCallCount++;
    this.checkThresholds();
  }

  /**
   * Check if cleanup is needed
   */
  needsCleanup(): boolean {
    const now = Date.now();
    return now - this.metrics.lastCleanup > this.thresholds.cleanupInterval;
  }

  /**
   * Mark cleanup as completed
   */
  markCleanupCompleted() {
    this.metrics.lastCleanup = Date.now();
    this.metrics.listenerCount = 0;
    this.metrics.reduxUpdateCount = 0;
    this.metrics.firebaseCallCount = 0;
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds() {
    const issues: string[] = [];

    if (this.metrics.listenerCount > this.thresholds.maxListeners) {
      issues.push(`Too many listeners: ${this.metrics.listenerCount}/${this.thresholds.maxListeners}`);
    }

    if (this.metrics.reduxUpdateCount > this.thresholds.maxReduxUpdates) {
      issues.push(`Too many Redux updates: ${this.metrics.reduxUpdateCount}/${this.thresholds.maxReduxUpdates}`);
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push(`High memory usage: ${Math.round(this.metrics.memoryUsage / 1024 / 1024)}MB`);
    }

    if (this.metrics.renderTime > this.thresholds.maxRenderTime) {
      issues.push(`Slow render time: ${this.metrics.renderTime}ms`);
    }

    if (this.metrics.firebaseCallCount > this.thresholds.maxFirebaseCalls) {
      issues.push(`Too many Firebase calls: ${this.metrics.firebaseCallCount}/${this.thresholds.maxFirebaseCalls}`);
    }

    if (issues.length > 0) {
      console.warn('⚠️ Performance Issues Detected:', issues);
      this.notifyCallbacks();
    }
  }

  /**
   * Register callback for performance alerts
   */
  onPerformanceAlert(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.push(callback);
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error in performance callback:', error);
      }
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.listenerCount > this.thresholds.maxListeners) {
      recommendations.push('Consider implementing listener pooling or reducing the number of active listeners');
    }

    if (this.metrics.reduxUpdateCount > this.thresholds.maxReduxUpdates) {
      recommendations.push('Implement batch updates to reduce Redux dispatches');
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push('Implement data cleanup and memory management strategies');
    }

    if (this.metrics.renderTime > this.thresholds.maxRenderTime) {
      recommendations.push('Optimize component rendering and consider using React.memo');
    }

    if (this.metrics.firebaseCallCount > this.thresholds.maxFirebaseCalls) {
      recommendations.push('Implement request batching and caching strategies');
    }

    return recommendations;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      listenerCount: 0,
      reduxUpdateCount: 0,
      memoryUsage: 0,
      renderTime: 0,
      firebaseCallCount: 0,
      lastCleanup: Date.now(),
    };
  }

  /**
   * Stop method for compatibility with AppInitializer
   */
  stop() {
    this.reset();
    console.log('🧹 PerformanceMonitor: Stopped and reset');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper hook for React components
export const usePerformanceMonitor = () => {
  return {
    updateListenerCount: (count: number) => performanceMonitor.updateListenerCount(count),
    incrementReduxUpdates: () => performanceMonitor.incrementReduxUpdates(),
    updateMemoryUsage: (usage: number) => performanceMonitor.updateMemoryUsage(usage),
    recordRenderTime: (time: number) => performanceMonitor.recordRenderTime(time),
    incrementFirebaseCalls: () => performanceMonitor.incrementFirebaseCalls(),
    needsCleanup: () => performanceMonitor.needsCleanup(),
    markCleanupCompleted: () => performanceMonitor.markCleanupCompleted(),
    getMetrics: () => performanceMonitor.getMetrics(),
    getRecommendations: () => performanceMonitor.getRecommendations(),
    reset: () => performanceMonitor.reset(),
  };
};

export default performanceMonitor;
