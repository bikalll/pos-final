import { useRef, useEffect, useCallback } from 'react';
import { Unsubscribe } from 'firebase/firestore';

interface ListenerManager {
  addListener: (key: string, unsubscribe: Unsubscribe) => void;
  removeListener: (key: string) => void;
  cleanup: () => void;
  getListenerCount: () => number;
  getActiveListeners: () => string[];
}

export const useOptimizedListeners = (): ListenerManager => {
  const listeners = useRef<Map<string, Unsubscribe>>(new Map());
  const listenerCount = useRef(0);
  const maxListeners = 10; // Limit to prevent memory issues
  
  const addListener = useCallback((key: string, unsubscribe: Unsubscribe) => {
    // Clean up existing listener
    const existing = listeners.current.get(key);
    if (existing) {
      existing();
      listenerCount.current--;
    }
    
    // Check listener limit
    if (listenerCount.current >= maxListeners) {
      console.warn(`⚠️ Listener limit reached (${maxListeners}), cleaning up oldest listener`);
      const firstKey = listeners.current.keys().next().value;
      if (firstKey) {
        removeListener(firstKey);
      }
    }
    
    listeners.current.set(key, unsubscribe);
    listenerCount.current++;
    
    console.log(`📡 Listener added: ${key} (Total: ${listenerCount.current})`);
  }, []);
  
  const removeListener = useCallback((key: string) => {
    const unsubscribe = listeners.current.get(key);
    if (unsubscribe) {
      unsubscribe();
      listeners.current.delete(key);
      listenerCount.current--;
      console.log(`📡 Listener removed: ${key} (Total: ${listenerCount.current})`);
    }
  }, []);
  
  const cleanup = useCallback(() => {
    console.log(`🧹 Cleaning up ${listenerCount.current} listeners`);
    listeners.current.forEach((unsubscribe, key) => {
      try {
        unsubscribe();
        console.log(`📡 Cleaned up listener: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Error cleaning up listener ${key}:`, error);
      }
    });
    listeners.current.clear();
    listenerCount.current = 0;
  }, []);
  
  const getListenerCount = useCallback(() => listenerCount.current, []);
  
  const getActiveListeners = useCallback(() => Array.from(listeners.current.keys()), []);
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return {
    addListener,
    removeListener,
    cleanup,
    getListenerCount,
    getActiveListeners
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const metrics = useRef({
    renderTime: 0,
    listenerCount: 0,
    memoryUsage: 0,
    updateCount: 0
  });
  
  const recordRenderTime = useCallback((time: number) => {
    metrics.current.renderTime = time;
    metrics.current.updateCount++;
    
    // Log performance every 20 updates
    if (metrics.current.updateCount % 20 === 0) {
      console.log('📊 Performance Update:', {
        renderTime: time.toFixed(2) + 'ms',
        listenerCount: metrics.current.listenerCount,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 'N/A'
      });
    }
  }, []);
  
  const updateListenerCount = useCallback((count: number) => {
    metrics.current.listenerCount = count;
  }, []);
  
  const incrementReduxUpdates = useCallback(() => {
    metrics.current.updateCount++;
  }, []);
  
  return {
    metrics: metrics.current,
    recordRenderTime,
    updateListenerCount,
    incrementReduxUpdates
  };
};
