/**
 * Performance Monitoring Utility
 * Provides real-time performance monitoring for the POS system
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { ListenerManager } from '../services/ListenerManager';

export interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: number;
  listenerCount: number;
  renderCount: number;
  navigationTime: number;
  dataLoadTime: number;
  appState: AppStateStatus;
  screenName: string;
  userId?: string;
  restaurantId?: string;
}

export interface PerformanceAlert {
  type: 'memory' | 'listener' | 'performance' | 'error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  metrics: PerformanceMetrics;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private listenerManager: ListenerManager;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private renderCount: number = 0;
  private navigationStartTime: number = 0;

  // Performance thresholds
  private readonly THRESHOLDS = {
    MEMORY_WARNING: 80, // MB
    MEMORY_CRITICAL: 120, // MB
    LISTENER_WARNING: 15,
    LISTENER_CRITICAL: 25,
    NAVIGATION_WARNING: 1000, // ms
    NAVIGATION_CRITICAL: 2000, // ms
    DATA_LOAD_WARNING: 3000, // ms
    DATA_LOAD_CRITICAL: 5000, // ms
  };

  private constructor() {
    this.listenerManager = new ListenerManager();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('📊 Starting performance monitoring...');

    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // Monitor app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('📊 Stopping performance monitoring...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  /**
   * Record navigation start
   */
  public recordNavigationStart(): void {
    this.navigationStartTime = Date.now();
  }

  /**
   * Record navigation end
   */
  public recordNavigationEnd(screenName: string): void {
    if (this.navigationStartTime === 0) return;

    const navigationTime = Date.now() - this.navigationStartTime;
    this.navigationStartTime = 0;

    // Check for navigation performance issues
    if (navigationTime > this.THRESHOLDS.NAVIGATION_CRITICAL) {
      this.createAlert('performance', 'critical', 
        `Navigation to ${screenName} took ${navigationTime}ms (critical threshold exceeded)`);
    } else if (navigationTime > this.THRESHOLDS.NAVIGATION_WARNING) {
      this.createAlert('performance', 'high', 
        `Navigation to ${screenName} took ${navigationTime}ms (warning threshold exceeded)`);
    }

    console.log(`🧭 Navigation to ${screenName}: ${navigationTime}ms`);
  }

  /**
   * Record data loading start
   */
  public recordDataLoadStart(): number {
    return Date.now();
  }

  /**
   * Record data loading end
   */
  public recordDataLoadEnd(startTime: number, dataType: string): void {
    const loadTime = Date.now() - startTime;

    // Check for data loading performance issues
    if (loadTime > this.THRESHOLDS.DATA_LOAD_CRITICAL) {
      this.createAlert('performance', 'critical', 
        `${dataType} loading took ${loadTime}ms (critical threshold exceeded)`);
    } else if (loadTime > this.THRESHOLDS.DATA_LOAD_WARNING) {
      this.createAlert('performance', 'high', 
        `${dataType} loading took ${loadTime}ms (warning threshold exceeded)`);
    }

    console.log(`📊 ${dataType} loaded in ${loadTime}ms`);
  }

  /**
   * Increment render count
   */
  public incrementRenderCount(): void {
    this.renderCount++;
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): PerformanceMetrics | null {
    if (this.metrics.length === 0) return null;
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Get alerts
   */
  public getAlerts(limit?: number): PerformanceAlert[] {
    if (limit) {
      return this.alerts.slice(-limit);
    }
    return [...this.alerts];
  }

  /**
   * Clear old metrics and alerts
   */
  public clearOldData(maxAge: number = 3600000): void { // 1 hour default
    const cutoffTime = Date.now() - maxAge;
    
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);
    
    console.log(`🧹 Cleared old performance data older than ${maxAge}ms`);
  }

  /**
   * Generate performance report
   */
  public generateReport(): string {
    const currentMetrics = this.getCurrentMetrics();
    const recentAlerts = this.getAlerts(10);
    
    let report = '# Performance Report\n\n';
    report += `Generated at: ${new Date().toISOString()}\n\n`;
    
    if (currentMetrics) {
      report += `## Current Metrics\n`;
      report += `- Memory Usage: ${currentMetrics.memoryUsage.toFixed(2)}MB\n`;
      report += `- Listener Count: ${currentMetrics.listenerCount}\n`;
      report += `- Render Count: ${currentMetrics.renderCount}\n`;
      report += `- App State: ${currentMetrics.appState}\n`;
      report += `- Screen: ${currentMetrics.screenName}\n\n`;
    }
    
    if (recentAlerts.length > 0) {
      report += `## Recent Alerts (${recentAlerts.length})\n`;
      recentAlerts.forEach(alert => {
        const severity = alert.severity.toUpperCase();
        report += `- [${severity}] ${alert.message}\n`;
      });
      report += '\n';
    }
    
    // Performance summary
    const totalMetrics = this.metrics.length;
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = this.alerts.filter(a => a.severity === 'high').length;
    
    report += `## Summary\n`;
    report += `- Total Metrics Collected: ${totalMetrics}\n`;
    report += `- Critical Alerts: ${criticalAlerts}\n`;
    report += `- High Priority Alerts: ${highAlerts}\n`;
    
    if (criticalAlerts > 0) {
      report += `- ⚠️ Critical performance issues detected!\n`;
    } else if (highAlerts > 0) {
      report += `- ⚠️ High priority performance issues detected\n`;
    } else {
      report += `- ✅ Performance within acceptable limits\n`;
    }
    
    return report;
  }

  /**
   * Private methods
   */
  private collectMetrics(): void {
    const state = this.getReduxState();
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage(),
      listenerCount: this.listenerManager.getListenerCount(),
      renderCount: this.renderCount,
      navigationTime: 0, // Will be set during navigation
      dataLoadTime: 0, // Will be set during data loading
      appState: AppState.currentState,
      screenName: 'Unknown', // Will be set by screen components
      userId: state?.auth?.userId,
      restaurantId: state?.auth?.restaurantId,
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);
    
    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    // Check memory usage
    if (metrics.memoryUsage > this.THRESHOLDS.MEMORY_CRITICAL) {
      this.createAlert('memory', 'critical', 
        `Memory usage critical: ${metrics.memoryUsage.toFixed(2)}MB`);
    } else if (metrics.memoryUsage > this.THRESHOLDS.MEMORY_WARNING) {
      this.createAlert('memory', 'medium', 
        `Memory usage high: ${metrics.memoryUsage.toFixed(2)}MB`);
    }

    // Check listener count
    if (metrics.listenerCount > this.THRESHOLDS.LISTENER_CRITICAL) {
      this.createAlert('listener', 'critical', 
        `Listener count critical: ${metrics.listenerCount}`);
    } else if (metrics.listenerCount > this.THRESHOLDS.LISTENER_WARNING) {
      this.createAlert('listener', 'medium', 
        `Listener count high: ${metrics.listenerCount}`);
    }
  }

  private createAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], message: string): void {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return;

    const alert: PerformanceAlert = {
      type,
      message,
      severity,
      timestamp: Date.now(),
      metrics: currentMetrics,
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    console.warn(`🚨 Performance Alert [${severity.toUpperCase()}]: ${message}`);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log(`📱 App state changed to: ${nextAppState}`);
    
    if (nextAppState === 'background') {
      // App went to background - check for cleanup opportunities
      this.checkBackgroundCleanup();
    } else if (nextAppState === 'active') {
      // App came to foreground - check for state consistency
      this.checkForegroundConsistency();
    }
  };

  private checkBackgroundCleanup(): void {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return;

    // If too many listeners, suggest cleanup
    if (currentMetrics.listenerCount > this.THRESHOLDS.LISTENER_WARNING) {
      this.createAlert('listener', 'low', 
        'Consider cleaning up listeners before backgrounding');
    }
  }

  private checkForegroundConsistency(): void {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return;

    // Check if state is consistent after foregrounding
    const state = this.getReduxState();
    if (!state?.auth?.isLoggedIn) {
      this.createAlert('error', 'high', 'User logged out during backgrounding');
    }
  }

  private getMemoryUsage(): number {
    // In a real implementation, this would use actual memory monitoring
    // For now, return a simulated value based on listener count
    const baseMemory = 50; // Base memory usage
    const listenerMemory = this.listenerManager.getListenerCount() * 0.5;
    return baseMemory + listenerMemory + Math.random() * 10;
  }

  private getReduxState(): RootState | null {
    try {
      // This would access the actual Redux store
      // For now, return null
      return null;
    } catch (error) {
      return null;
    }
  }
}

// React Hook for using performance monitoring
export const usePerformanceMonitoring = (screenName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    // Start monitoring when component mounts
    monitor.startMonitoring();

    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      const metrics = monitor.getCurrentMetrics();
      if (metrics) {
        metrics.screenName = screenName;
        setCurrentMetrics(metrics);
      }
      
      const recentAlerts = monitor.getAlerts(5);
      setAlerts(recentAlerts);
    }, 5000);

    // Increment render count
    monitor.incrementRenderCount();

    return () => {
      clearInterval(interval);
    };
  }, [screenName, monitor]);

  const recordNavigationStart = () => monitor.recordNavigationStart();
  const recordNavigationEnd = () => monitor.recordNavigationEnd(screenName);
  const recordDataLoadStart = () => monitor.recordDataLoadStart();
  const recordDataLoadEnd = (startTime: number, dataType: string) => 
    monitor.recordDataLoadEnd(startTime, dataType);

  return {
    currentMetrics,
    alerts,
    recordNavigationStart,
    recordNavigationEnd,
    recordDataLoadStart,
    recordDataLoadEnd,
    generateReport: () => monitor.generateReport(),
  };
};

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
