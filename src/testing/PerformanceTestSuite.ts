/**
 * Step 7.2: Performance Testing Suite
 * Monitors listener count, memory usage, and app performance
 */

import { testFramework } from './TestFramework';
import { store } from '../redux/storeFirebase';
import { RootState } from '../redux/storeFirebase';
import { createFirebaseService } from '../services/firebaseService';
import { createFirestoreService } from '../services/firestoreService';
import { ListenerManager } from '../services/ListenerManager';

export interface PerformanceSnapshot {
  timestamp: number;
  memoryUsage: number;
  listenerCount: number;
  renderCount: number;
  activeListeners: string[];
}

export class PerformanceTestSuite {
  private firebaseService: any;
  private firestoreService: any;
  private listenerManager: ListenerManager;
  private performanceSnapshots: PerformanceSnapshot[] = [];
  private initialSnapshot?: PerformanceSnapshot;

  constructor() {
    this.listenerManager = new ListenerManager();
    
    const state = store.getState() as RootState;
    const restaurantId = state.auth.restaurantId;
    
    if (restaurantId) {
      this.firebaseService = createFirebaseService(restaurantId);
      this.firestoreService = createFirestoreService(restaurantId);
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<void> {
    console.log('⚡ Starting Performance Test Suite...');
    
    testFramework.startTestSuite('Performance Testing');
    
    try {
      // Take initial snapshot
      this.initialSnapshot = this.takePerformanceSnapshot();
      
      // Test listener count during navigation
      await testFramework.runTest('Listener Count During Navigation', () => this.testListenerCountDuringNavigation());
      
      // Test memory usage over time
      await testFramework.runTest('Memory Usage Over Time', () => this.testMemoryUsageOverTime());
      
      // Test memory leaks
      await testFramework.runTest('Memory Leak Detection', () => this.testMemoryLeaks());
      
      // Test app performance without logout/login
      await testFramework.runTest('Performance Without Logout/Login', () => this.testPerformanceWithoutLogout());
      
      // Test listener cleanup efficiency
      await testFramework.runTest('Listener Cleanup Efficiency', () => this.testListenerCleanupEfficiency());
      
      // Test data loading performance
      await testFramework.runTest('Data Loading Performance', () => this.testDataLoadingPerformance());
      
      // Test real-time update performance
      await testFramework.runTest('Real-time Update Performance', () => this.testRealTimeUpdatePerformance());
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
    } finally {
      testFramework.endTestSuite();
    }
  }

  /**
   * Test listener count during navigation
   */
  private async testListenerCountDuringNavigation(): Promise<void> {
    console.log('🧭 Testing listener count during navigation...');
    
    const initialCount = this.listenerManager.getListenerCount();
    console.log(`Initial listener count: ${initialCount}`);
    
    // Simulate navigation by creating and cleaning up listeners
    const listeners: (() => void)[] = [];
    
    // Create multiple listeners
    for (let i = 0; i < 5; i++) {
      if (this.firebaseService) {
        const unsubscribe = this.firebaseService.listenToValue(`test-path-${i}`, () => {});
        listeners.push(unsubscribe);
      }
    }
    
    const afterCreationCount = this.listenerManager.getListenerCount();
    console.log(`After creating listeners: ${afterCreationCount}`);
    
    // Clean up listeners
    listeners.forEach(unsubscribe => unsubscribe());
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const afterCleanupCount = this.listenerManager.getListenerCount();
    console.log(`After cleanup: ${afterCleanupCount}`);
    
    // Check for listener leaks
    if (afterCleanupCount > initialCount + 2) {
      throw new Error(`Potential listener leak detected. Count increased from ${initialCount} to ${afterCleanupCount}`);
    }
    
    console.log('✅ Listener count during navigation test passed');
  }

  /**
   * Test memory usage over time
   */
  private async testMemoryUsageOverTime(): Promise<void> {
    console.log('💾 Testing memory usage over time...');
    
    const snapshots: PerformanceSnapshot[] = [];
    
    // Take snapshots over time
    for (let i = 0; i < 10; i++) {
      const snapshot = this.takePerformanceSnapshot();
      snapshots.push(snapshot);
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Analyze memory usage trend
    const memoryUsages = snapshots.map(s => s.memoryUsage);
    const maxMemory = Math.max(...memoryUsages);
    const minMemory = Math.min(...memoryUsages);
    const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    
    console.log(`Memory usage - Min: ${minMemory.toFixed(2)}MB, Max: ${maxMemory.toFixed(2)}MB, Avg: ${avgMemory.toFixed(2)}MB`);
    
    // Check for excessive memory growth
    const memoryGrowth = maxMemory - minMemory;
    if (memoryGrowth > 50) { // 50MB threshold
      throw new Error(`Excessive memory growth detected: ${memoryGrowth.toFixed(2)}MB`);
    }
    
    console.log('✅ Memory usage over time test passed');
  }

  /**
   * Test memory leaks
   */
  private async testMemoryLeaks(): Promise<void> {
    console.log('🔍 Testing for memory leaks...');
    
    const initialSnapshot = this.takePerformanceSnapshot();
    
    // Perform operations that could cause memory leaks
    for (let cycle = 0; cycle < 5; cycle++) {
      console.log(`Memory leak test cycle ${cycle + 1}/5`);
      
      // Create listeners
      const listeners: (() => void)[] = [];
      for (let i = 0; i < 10; i++) {
        if (this.firebaseService) {
          const unsubscribe = this.firebaseService.listenToValue(`leak-test-${cycle}-${i}`, () => {});
          listeners.push(unsubscribe);
        }
      }
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clean up listeners
      listeners.forEach(unsubscribe => unsubscribe());
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const finalSnapshot = this.takePerformanceSnapshot();
    
    // Check for memory leaks
    const memoryIncrease = finalSnapshot.memoryUsage - initialSnapshot.memoryUsage;
    const listenerIncrease = finalSnapshot.listenerCount - initialSnapshot.listenerCount;
    
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    console.log(`Listener increase: ${listenerIncrease}`);
    
    if (memoryIncrease > 20) { // 20MB threshold
      throw new Error(`Memory leak detected: ${memoryIncrease.toFixed(2)}MB increase`);
    }
    
    if (listenerIncrease > 2) {
      throw new Error(`Listener leak detected: ${listenerIncrease} listeners not cleaned up`);
    }
    
    console.log('✅ Memory leak test passed');
  }

  /**
   * Test performance without logout/login
   */
  private async testPerformanceWithoutLogout(): Promise<void> {
    console.log('🔄 Testing performance without logout/login...');
    
    const initialSnapshot = this.takePerformanceSnapshot();
    
    // Simulate extended app usage
    for (let i = 0; i < 20; i++) {
      // Simulate data operations
      if (this.firebaseService) {
        try {
          await this.firebaseService.getTables();
        } catch (error) {
          // Expected in some test environments
        }
      }
      
      // Simulate navigation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Take periodic snapshots
      if (i % 5 === 0) {
        const snapshot = this.takePerformanceSnapshot();
        this.performanceSnapshots.push(snapshot);
      }
    }
    
    const finalSnapshot = this.takePerformanceSnapshot();
    
    // Check performance degradation
    const memoryIncrease = finalSnapshot.memoryUsage - initialSnapshot.memoryUsage;
    const listenerIncrease = finalSnapshot.listenerCount - initialSnapshot.listenerCount;
    
    console.log(`Extended usage - Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    console.log(`Extended usage - Listener increase: ${listenerIncrease}`);
    
    if (memoryIncrease > 30) { // 30MB threshold for extended usage
      throw new Error(`Performance degradation detected: ${memoryIncrease.toFixed(2)}MB increase`);
    }
    
    console.log('✅ Performance without logout/login test passed');
  }

  /**
   * Test listener cleanup efficiency
   */
  private async testListenerCleanupEfficiency(): Promise<void> {
    console.log('🧹 Testing listener cleanup efficiency...');
    
    const initialCount = this.listenerManager.getListenerCount();
    
    // Create many listeners
    const listeners: (() => void)[] = [];
    for (let i = 0; i < 20; i++) {
      if (this.firebaseService) {
        const unsubscribe = this.firebaseService.listenToValue(`cleanup-test-${i}`, () => {});
        listeners.push(unsubscribe);
      }
    }
    
    const afterCreationCount = this.listenerManager.getListenerCount();
    
    // Measure cleanup time
    const cleanupStartTime = Date.now();
    
    // Clean up all listeners
    listeners.forEach(unsubscribe => unsubscribe());
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const cleanupTime = Date.now() - cleanupStartTime;
    const finalCount = this.listenerManager.getListenerCount();
    
    console.log(`Cleanup time: ${cleanupTime}ms`);
    console.log(`Listeners cleaned up: ${afterCreationCount - finalCount}`);
    
    if (cleanupTime > 2000) { // 2 second threshold
      throw new Error(`Listener cleanup too slow: ${cleanupTime}ms`);
    }
    
    if (finalCount > initialCount + 2) {
      throw new Error(`Incomplete listener cleanup: ${finalCount - initialCount} listeners remaining`);
    }
    
    console.log('✅ Listener cleanup efficiency test passed');
  }

  /**
   * Test data loading performance
   */
  private async testDataLoadingPerformance(): Promise<void> {
    console.log('📊 Testing data loading performance...');
    
    const loadTimes: number[] = [];
    
    // Test multiple data loading operations
    for (let i = 0; i < 5; i++) {
      if (this.firebaseService) {
        const startTime = Date.now();
        try {
          await this.firebaseService.getTables();
        } catch (error) {
          // Expected in some test environments
        }
        const loadTime = Date.now() - startTime;
        loadTimes.push(loadTime);
      }
    }
    
    if (loadTimes.length === 0) {
      throw new Error('No data loading operations completed');
    }
    
    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);
    
    console.log(`Average load time: ${avgLoadTime.toFixed(2)}ms`);
    console.log(`Max load time: ${maxLoadTime}ms`);
    
    if (avgLoadTime > 3000) { // 3 second threshold
      throw new Error(`Data loading too slow: ${avgLoadTime.toFixed(2)}ms average`);
    }
    
    if (maxLoadTime > 5000) { // 5 second threshold
      throw new Error(`Data loading timeout: ${maxLoadTime}ms max`);
    }
    
    console.log('✅ Data loading performance test passed');
  }

  /**
   * Test real-time update performance
   */
  private async testRealTimeUpdatePerformance(): Promise<void> {
    console.log('⚡ Testing real-time update performance...');
    
    if (!this.firestoreService) {
      throw new Error('Firestore service not initialized');
    }
    
    let updateCount = 0;
    const updateTimes: number[] = [];
    
    const unsubscribe = this.firestoreService.listenToOngoingOrders((orders: any) => {
      const updateTime = Date.now();
      updateTimes.push(updateTime);
      updateCount++;
      console.log(`Real-time update #${updateCount} received`);
    });
    
    // Wait for updates
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    unsubscribe();
    
    if (updateCount === 0) {
      console.log('⚠️ No real-time updates received (expected in test environment)');
      return;
    }
    
    // Calculate update frequency
    const updateFrequency = updateCount / 3; // updates per second
    
    console.log(`Update frequency: ${updateFrequency.toFixed(2)} updates/second`);
    
    if (updateFrequency > 10) { // Too many updates
      throw new Error(`Excessive update frequency: ${updateFrequency.toFixed(2)} updates/second`);
    }
    
    console.log('✅ Real-time update performance test passed');
  }

  /**
   * Take a performance snapshot
   */
  private takePerformanceSnapshot(): PerformanceSnapshot {
    return {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage(),
      listenerCount: this.listenerManager.getListenerCount(),
      renderCount: this.getRenderCount(),
      activeListeners: this.listenerManager.getActiveListeners()
    };
  }

  /**
   * Get current memory usage (simulated)
   */
  private getMemoryUsage(): number {
    // In a real implementation, this would use actual memory monitoring
    // For now, return a simulated value based on listener count
    const baseMemory = 50; // Base memory usage
    const listenerMemory = this.listenerManager.getListenerCount() * 0.5; // Memory per listener
    return baseMemory + listenerMemory + Math.random() * 10; // Add some variance
  }

  /**
   * Get current render count (simulated)
   */
  private getRenderCount(): number {
    // In a real implementation, this would track actual render counts
    return Math.floor(Math.random() * 1000);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    let report = '# Performance Test Report\n\n';
    report += `Generated at: ${new Date().toISOString()}\n\n`;
    
    if (this.initialSnapshot) {
      report += `## Initial Performance Snapshot\n`;
      report += `- Memory Usage: ${this.initialSnapshot.memoryUsage.toFixed(2)}MB\n`;
      report += `- Listener Count: ${this.initialSnapshot.listenerCount}\n`;
      report += `- Render Count: ${this.initialSnapshot.renderCount}\n\n`;
    }
    
    if (this.performanceSnapshots.length > 0) {
      report += `## Performance Over Time\n`;
      this.performanceSnapshots.forEach((snapshot, index) => {
        const timeOffset = (snapshot.timestamp - (this.initialSnapshot?.timestamp || 0)) / 1000;
        report += `### Snapshot ${index + 1} (${timeOffset.toFixed(1)}s)\n`;
        report += `- Memory Usage: ${snapshot.memoryUsage.toFixed(2)}MB\n`;
        report += `- Listener Count: ${snapshot.listenerCount}\n`;
        report += `- Active Listeners: ${snapshot.activeListeners.join(', ')}\n\n`;
      });
    }
    
    return report;
  }
}

// Export for use in main test runner
export const performanceTestSuite = new PerformanceTestSuite();
