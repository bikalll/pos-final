import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  renderTime: number;
  listenerCount: number;
  memoryUsage: number;
  updateCount: number;
  averageRenderTime: number;
  peakMemoryUsage: number;
  errorCount: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    listenerCount: 0,
    memoryUsage: 0,
    updateCount: 0,
    averageRenderTime: 0,
    peakMemoryUsage: 0,
    errorCount: 0
  };
  
  private renderTimes: number[] = [];
  private readonly maxRenderTimes = 100;
  
  recordRenderTime(time: number) {
    this.metrics.renderTime = time;
    this.metrics.updateCount++;
    
    // Track render times for average calculation
    this.renderTimes.push(time);
    if (this.renderTimes.length > this.maxRenderTimes) {
      this.renderTimes.shift();
    }
    
    // Calculate average render time
    this.metrics.averageRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    
    // Log performance every 20 updates
    if (this.metrics.updateCount % 20 === 0) {
      this.logPerformance();
    }
  }
  
  updateListenerCount(count: number) {
    this.metrics.listenerCount = count;
  }
  
  updateMemoryUsage() {
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
      this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, memory.usedJSHeapSize);
    }
  }
  
  recordError() {
    this.metrics.errorCount++;
  }
  
  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }
  
  logPerformance() {
    console.log('📊 Performance Metrics:', {
      renderTime: this.metrics.renderTime.toFixed(2) + 'ms',
      averageRenderTime: this.metrics.averageRenderTime.toFixed(2) + 'ms',
      listenerCount: this.metrics.listenerCount,
      memoryUsage: this.formatBytes(this.metrics.memoryUsage),
      peakMemoryUsage: this.formatBytes(this.metrics.peakMemoryUsage),
      updateCount: this.metrics.updateCount,
      errorCount: this.metrics.errorCount
    });
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  reset() {
    this.metrics = {
      renderTime: 0,
      listenerCount: 0,
      memoryUsage: 0,
      updateCount: 0,
      averageRenderTime: 0,
      peakMemoryUsage: 0,
      errorCount: 0
    };
    this.renderTimes = [];
  }
  
  // Performance thresholds
  private readonly RENDER_TIME_WARNING = 16; // 60fps
  private readonly RENDER_TIME_ERROR = 33; // 30fps
  private readonly MEMORY_WARNING = 50 * 1024 * 1024; // 50MB
  private readonly MEMORY_ERROR = 100 * 1024 * 1024; // 100MB
  
  checkPerformanceThresholds() {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (this.metrics.renderTime > this.RENDER_TIME_ERROR) {
      errors.push(`Render time too high: ${this.metrics.renderTime.toFixed(2)}ms`);
    } else if (this.metrics.renderTime > this.RENDER_TIME_WARNING) {
      warnings.push(`Render time high: ${this.metrics.renderTime.toFixed(2)}ms`);
    }
    
    if (this.metrics.memoryUsage > this.MEMORY_ERROR) {
      errors.push(`Memory usage too high: ${this.formatBytes(this.metrics.memoryUsage)}`);
    } else if (this.metrics.memoryUsage > this.MEMORY_WARNING) {
      warnings.push(`Memory usage high: ${this.formatBytes(this.metrics.memoryUsage)}`);
    }
    
    if (this.metrics.listenerCount > 20) {
      warnings.push(`Too many listeners: ${this.metrics.listenerCount}`);
    }
    
    if (errors.length > 0) {
      console.error('🚨 Performance Errors:', errors);
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️ Performance Warnings:', warnings);
    }
    
    return { warnings, errors };
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;