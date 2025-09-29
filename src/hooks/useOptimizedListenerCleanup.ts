import { useRef, useEffect, useCallback } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import { useOptimizedListeners } from './useOptimizedListeners';
import { useBatchReduxUpdates } from '../utils/batchReduxUpdates';
import performanceMonitor from '../services/performanceMonitor';

interface OptimizedListenerCleanup {
  addListener: (key: string, unsubscribe: Unsubscribe) => void;
  removeListener: (key: string) => void;
  cleanup: () => void;
  batchUpdate: (type: string, data: any[]) => void;
  getListenerCount: () => number;
  getActiveListeners: () => string[];
}

export const useOptimizedListenerCleanup = (screenName: string): OptimizedListenerCleanup => {
  const { addListener, removeListener, cleanup, getListenerCount, getActiveListeners } = useOptimizedListeners();
  const { addBatchUpdate } = useBatchReduxUpdates();
  const screenRef = useRef(screenName);
  
  // Update screen reference
  useEffect(() => {
    screenRef.current = screenName;
  }, [screenName]);
  
  // Enhanced batch update with performance monitoring
  const batchUpdate = useCallback((type: string, data: any[]) => {
    const startTime = performance.now();
    
    // Use batch update for better performance
    addBatchUpdate({
      type: `batch/${type}`,
      payload: data
    });
    
    const endTime = performance.now();
    performanceMonitor.recordRenderTime(endTime - startTime);
    
    console.log(`🔄 Batch update for ${screenName}: ${type} (${data.length} items)`);
  }, [addBatchUpdate, screenName]);
  
  // Enhanced cleanup with performance monitoring
  const enhancedCleanup = useCallback(() => {
    const startTime = performance.now();
    
    console.log(`🧹 Cleaning up listeners for ${screenName}`);
    cleanup();
    
    const endTime = performance.now();
    performanceMonitor.recordRenderTime(endTime - startTime);
  }, [cleanup, screenName]);
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return enhancedCleanup;
  }, [enhancedCleanup]);
  
  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = performanceMonitor.getMetrics();
      
      // Log performance every 30 seconds
      if (metrics.updateCount % 30 === 0) {
        console.log(`📊 Performance for ${screenName}:`, {
          renderTime: metrics.renderTime.toFixed(2) + 'ms',
          listenerCount: metrics.listenerCount,
          memoryUsage: metrics.memoryUsage
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [screenName]);
  
  return {
    addListener,
    removeListener,
    cleanup: enhancedCleanup,
    batchUpdate,
    getListenerCount,
    getActiveListeners
  };
};
