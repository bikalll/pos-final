import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/storeFirebase';

interface PerformanceMetrics {
  renderTime: number;
  listenerCount: number;
  reduxUpdates: number;
  memoryUsage: number;
  timestamp: number;
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
}

interface PerformanceConfig {
  renderTimeThreshold: number; // ms
  listenerCountThreshold: number;
  reduxUpdatesThreshold: number;
  memoryThreshold: number; // MB
  alertCooldown: number; // ms
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private config: PerformanceConfig;
  private alertCooldowns = new Map<string, number>();
  private readonly MAX_METRICS = 1000;
  private readonly MAX_ALERTS = 100;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      renderTimeThreshold: 100, // 100ms
      listenerCountThreshold: 50,
      reduxUpdatesThreshold: 100,
      memoryThreshold: 100, // 100MB
      alertCooldown: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: Partial<PerformanceMetrics>) {
    const fullMetrics: PerformanceMetrics = {
      renderTime: 0,
      listenerCount: 0,
      reduxUpdates: 0,
      memoryUsage: 0,
      timestamp: Date.now(),
      ...metrics
    };

    this.metrics.push(fullMetrics);

    // Trim metrics if too many
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Check for alerts
    this.checkAlerts(fullMetrics);
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metrics: PerformanceMetrics) {
    const alerts: PerformanceAlert[] = [];

    // Render time alert
    if (metrics.renderTime > this.config.renderTimeThreshold) {
      alerts.push({
        type: 'warning',
        message: `Slow render detected: ${metrics.renderTime}ms`,
        threshold: this.config.renderTimeThreshold,
        currentValue: metrics.renderTime,
        timestamp: Date.now()
      });
    }

    // Listener count alert
    if (metrics.listenerCount > this.config.listenerCountThreshold) {
      alerts.push({
        type: 'warning',
        message: `High listener count: ${metrics.listenerCount}`,
        threshold: this.config.listenerCountThreshold,
        currentValue: metrics.listenerCount,
        timestamp: Date.now()
      });
    }

    // Redux updates alert
    if (metrics.reduxUpdates > this.config.reduxUpdatesThreshold) {
      alerts.push({
        type: 'warning',
        message: `High Redux update count: ${metrics.reduxUpdates}`,
        threshold: this.config.reduxUpdatesThreshold,
        currentValue: metrics.reduxUpdates,
        timestamp: Date.now()
      });
    }

    // Memory usage alert
    if (metrics.memoryUsage > this.config.memoryThreshold) {
      alerts.push({
        type: 'error',
        message: `High memory usage: ${metrics.memoryUsage}MB`,
        threshold: this.config.memoryThreshold,
        currentValue: metrics.memoryUsage,
        timestamp: Date.now()
      });
    }

    // Add alerts with cooldown
    alerts.forEach(alert => {
      const alertKey = `${alert.type}-${alert.message}`;
      const lastAlert = this.alertCooldowns.get(alertKey);
      
      if (!lastAlert || Date.now() - lastAlert > this.config.alertCooldown) {
        this.alerts.push(alert);
        this.alertCooldowns.set(alertKey, Date.now());
        
        // Log alert
        console.warn(`🚨 Performance Alert [${alert.type.toUpperCase()}]: ${alert.message}`);
      }
    });

    // Trim alerts if too many
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const now = Date.now();
    const last24Hours = this.metrics.filter(m => now - m.timestamp < 24 * 60 * 60 * 1000);
    const lastHour = this.metrics.filter(m => now - m.timestamp < 60 * 60 * 1000);

    const avgRenderTime = lastHour.length > 0 
      ? lastHour.reduce((sum, m) => sum + m.renderTime, 0) / lastHour.length 
      : 0;

    const maxRenderTime = lastHour.length > 0 
      ? Math.max(...lastHour.map(m => m.renderTime)) 
      : 0;

    const avgListenerCount = lastHour.length > 0 
      ? lastHour.reduce((sum, m) => sum + m.listenerCount, 0) / lastHour.length 
      : 0;

    const avgMemoryUsage = lastHour.length > 0 
      ? lastHour.reduce((sum, m) => sum + m.memoryUsage, 0) / lastHour.length 
      : 0;

    return {
      totalMetrics: this.metrics.length,
      last24Hours: last24Hours.length,
      lastHour: lastHour.length,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      maxRenderTime,
      avgListenerCount: Math.round(avgListenerCount * 100) / 100,
      avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
      recentAlerts: this.alerts.slice(-10),
      alertCount: this.alerts.length
    };
  }

  /**
   * Clear all metrics and alerts
   */
  clear() {
    this.metrics = [];
    this.alerts = [];
    this.alertCooldowns.clear();
    console.log('🔄 PerformanceMonitor: Cleared all metrics and alerts');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 PerformanceMonitor: Updated configuration');
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

/**
 * Hook for monitoring performance in React components
 */
export function usePerformanceMonitor(componentName: string, config?: Partial<PerformanceConfig>) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const renderStartTime = useRef<number>(0);
  const updateCount = useRef<number>(0);
  const monitor = getPerformanceMonitor();

  // Update configuration if provided
  useEffect(() => {
    if (config) {
      monitor.updateConfig(config);
    }
  }, [config, monitor]);

  // Measure render time
  useEffect(() => {
    renderStartTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Get current Redux state for metrics
      const state = useSelector((state: RootState) => state);
      
      // Count listeners (approximate)
      const listenerCount = Object.keys(state).length;
      
      // Count Redux updates
      updateCount.current++;
      
      // Get memory usage (if available)
      const memoryUsage = (performance as any).memory 
        ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 
        : 0;

      const currentMetrics: PerformanceMetrics = {
        renderTime,
        listenerCount,
        reduxUpdates: updateCount.current,
        memoryUsage,
        timestamp: Date.now()
      };

      setMetrics(currentMetrics);
      monitor.recordMetrics(currentMetrics);
      
      console.log(`📊 Performance [${componentName}]:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        listenerCount,
        reduxUpdates: updateCount.current,
        memoryUsage: `${memoryUsage.toFixed(2)}MB`
      });
    };
  });

  // Get alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = monitor.getStats();
      setAlerts(stats.recentAlerts);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [monitor]);

  // Manual performance measurement
  const measurePerformance = useCallback(async (operation: () => Promise<any> | any, operationName: string) => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      monitor.recordMetrics({
        renderTime: duration,
        timestamp: Date.now()
      });
      
      console.log(`⏱️ Performance [${componentName}]: ${operationName} took ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`❌ Performance [${componentName}]: ${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }, [componentName, monitor]);

  // Get performance statistics
  const getStats = useCallback(() => {
    return monitor.getStats();
  }, [monitor]);

  // Clear metrics
  const clearMetrics = useCallback(() => {
    monitor.clear();
    setMetrics(null);
    setAlerts([]);
    updateCount.current = 0;
  }, [monitor]);

  return {
    metrics,
    alerts,
    measurePerformance,
    getStats,
    clearMetrics
  };
}

/**
 * Hook for monitoring Redux performance
 */
export function useReduxPerformanceMonitor() {
  const [reduxMetrics, setReduxMetrics] = useState({
    actionCount: 0,
    lastAction: '',
    lastActionTime: 0,
    averageActionTime: 0
  });

  const actionTimes = useRef<number[]>([]);

  useEffect(() => {
    // Monitor Redux actions
    const originalDispatch = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.dispatch;
    
    if (originalDispatch) {
      (window as any).__REDUX_DEVTOOLS_EXTENSION__.dispatch = (action: any) => {
        const startTime = performance.now();
        
        const result = originalDispatch(action);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        actionTimes.current.push(duration);
        
        // Keep only last 100 action times
        if (actionTimes.current.length > 100) {
          actionTimes.current = actionTimes.current.slice(-100);
        }
        
        const averageTime = actionTimes.current.reduce((sum, time) => sum + time, 0) / actionTimes.current.length;
        
        setReduxMetrics({
          actionCount: actionTimes.current.length,
          lastAction: action.type || 'unknown',
          lastActionTime: duration,
          averageActionTime: averageTime
        });
        
        // Record in performance monitor
        const monitor = getPerformanceMonitor();
        monitor.recordMetrics({
          reduxUpdates: actionTimes.current.length,
          renderTime: duration,
          timestamp: Date.now()
        });
        
        return result;
      };
    }
  }, []);

  return reduxMetrics;
}

export default PerformanceMonitor;
