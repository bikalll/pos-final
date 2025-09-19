import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../redux/storeFirebase';
import { optimizedListenerManager } from '../services/OptimizedListenerManager';
import { performanceMonitor } from '../services/PerformanceMonitor';
import { dataCleanupService } from '../services/DataCleanupService';
import { optimizedFirebaseService } from '../services/OptimizedFirebaseService';
import { periodicCleanupService } from '../services/PeriodicCleanupService';
import { navigationStateManager } from '../services/NavigationStateManager';
import { initializeBatchUpdateService, cleanupBatchUpdateService } from '../services/BatchUpdateService';
import { cacheInvalidationService } from '../services/CacheInvalidationService';

const OptimizedAppInitializer: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const restaurantId = useSelector((state: RootState) => state.auth.restaurantId);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn || !restaurantId) {
      // Cleanup when user logs out
      optimizedListenerManager.setRestaurant(null);
      dataCleanupService.stop();
      optimizedFirebaseService.cleanup();
      performanceMonitor.reset();
      return;
    }

    // Initialize optimized services
    console.log('🚀 OptimizedAppInitializer: Initializing optimized services...');
    
    // Initialize batch update service
    initializeBatchUpdateService(dispatch);
    
    // Initialize cache invalidation service
    console.log('🔄 CacheInvalidationService: Initialized');
    
    // Reset navigation state on login
    navigationStateManager.reset();
    
    // Set restaurant for listener manager (initialize with dispatch if needed)
    if (!optimizedListenerManager.dispatch) {
      optimizedListenerManager.initialize(dispatch);
    }
    optimizedListenerManager.setRestaurant(restaurantId);
    
    // Start data cleanup service
    dataCleanupService.start();
    
    // Start periodic cleanup service
    periodicCleanupService.start();
    
    // Set up performance monitoring
    performanceMonitor.onPerformanceAlert((metrics) => {
      console.warn('⚠️ Performance Alert:', metrics);
      const recommendations = performanceMonitor.getRecommendations();
      if (recommendations.length > 0) {
        console.log('💡 Recommendations:', recommendations);
      }
    });

    // Start performance monitoring
    const performanceInterval = setInterval(() => {
      const metrics = performanceMonitor.getMetrics();
      console.log('📊 Performance Metrics:', metrics);
      
      // Auto-cleanup if needed
      if (performanceMonitor.needsCleanup()) {
        console.log('🧹 Auto-cleanup triggered');
        dataCleanupService.forceCleanup();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(performanceInterval);
      dataCleanupService.stop();
      periodicCleanupService.stop();
      optimizedFirebaseService.cleanup();
      cleanupBatchUpdateService();
      cacheInvalidationService.cleanup();
    };
  }, [restaurantId, isLoggedIn]);

  return null;
};

export default OptimizedAppInitializer;
