import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../redux/storeFirebase';
import { initializeFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';
import { testFirestoreConnection } from '../services/firebase';
import { createFirestoreService } from '../services/firestoreService';
import { initializeRealtimeSync } from '../services/realtimeSyncService';
import { initializeReceiptSync } from '../services/receiptSyncService';
import { initializeAutoReceiptService, clearAutoReceiptService } from '../services/autoReceiptService';
import { initializeFirebaseService } from '../services/firebaseService';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';

// Core Optimization Services
import { listenerManager } from '../services/ListenerManager';
import { optimizedListenerManager } from '../services/OptimizedListenerManager';
import { performanceMonitor } from '../services/PerformanceMonitor';
import { periodicCleanupService } from '../services/PeriodicCleanupService';
import { dataCleanupService } from '../services/DataCleanupService';
import { optimizedFirebaseService } from '../services/OptimizedFirebaseService';
import { navigationStateManager } from '../services/NavigationStateManager';

const AppInitializer: React.FC = () => {
  const dispatch = useDispatch();
  const tableIds = useSelector((state: RootState) => state.tables.tableIds);
  const restaurantId = useSelector((state: RootState) => state.auth.restaurantId);
  const role = useSelector((state: RootState) => state.auth.role);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  // Initialize Firebase Auth Enhanced service (always needed for login)
  useEffect(() => {
    try {
      console.log('AppInitializer: Initializing Firebase Auth Enhanced service');
      initializeFirebaseAuthEnhanced(dispatch);
    } catch (error) {
      console.error('Error initializing Firebase Auth Enhanced:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    const initializeApp = async () => {
      // Only initialize other services if user is logged in
      if (!isLoggedIn) {
        console.log('AppInitializer: User not logged in, skipping other services initialization');
        
        // Cleanup optimization services when user logs out
        console.log('🧹 AppInitializer: Cleaning up optimization services on logout');
        optimizedListenerManager?.setRestaurant(null);
        listenerManager?.setRestaurant(null);
        dataCleanupService?.stop();
        periodicCleanupService?.stop();
        optimizedFirebaseService?.cleanup();
        performanceMonitor?.reset();
        navigationStateManager?.reset();
        
        return;
      }

      // Initialize Core Optimization Services
      console.log('🚀 AppInitializer: Initializing core optimization services...');
      
      try {
        // Reset navigation state on login
        navigationStateManager?.reset();
        
        // Set up performance monitoring with alerts
        performanceMonitor?.onPerformanceAlert((metrics) => {
          console.warn('⚠️ Performance Alert:', metrics);
          const recommendations = performanceMonitor?.getRecommendations();
          if (recommendations && recommendations.length > 0) {
            console.log('💡 Performance Recommendations:', recommendations);
          }
        });

        // Start performance monitoring interval
        const performanceInterval = setInterval(() => {
          const metrics = performanceMonitor?.getMetrics();
          if (metrics) {
            console.log('📊 Performance Metrics:', {
              listeners: metrics.listenerCount,
              reduxUpdates: metrics.reduxUpdateCount,
              memoryUsage: Math.round(metrics.memoryUsage / 1024 / 1024) + 'MB',
              renderTime: metrics.renderTime + 'ms',
              firebaseCalls: metrics.firebaseCallCount
            });
            
            // Auto-cleanup if needed
            if (performanceMonitor?.needsCleanup()) {
              console.log('🧹 Auto-cleanup triggered by performance monitor');
              dataCleanupService?.forceCleanup();
            }
          }
        }, 30000); // Check every 30 seconds

        // Store interval for cleanup
        (global as any).performanceInterval = performanceInterval;

        console.log('✅ Core optimization services initialized');
      } catch (error) {
        console.error('❌ Error initializing optimization services:', error);
      }

      // Test Firebase Firestore connection
      try {
        const isConnected = await testFirestoreConnection();
        if (!isConnected) {
          console.warn('Firebase Firestore connection failed');
        }
      } catch (error) {
        console.error('Firebase Firestore connection error:', error);
      }

      // Do not auto-create default tables; new accounts should start with none

      // Do not auto-create default menu items

      // Initialize real-time sync for customers and receipts
      try {
        if (restaurantId) {
          // Initialize Firebase service
          initializeFirebaseService(restaurantId);
          
          initializeRealtimeSync(restaurantId);
          initializeReceiptSync(restaurantId);
          initializeAutoReceiptService(restaurantId);
          // If owner, check office info and navigate to OfficeManagement if missing
          if (role === 'Owner') {
            try {
              const fs = createFirestoreService(restaurantId);
              const info = await fs.getRestaurantInfo();
              if (!info || !info.name || !info.ownerName) {
                // Set a flag in AsyncStorage to indicate new owner needs setup
                await AsyncStorage.setItem('newOwnerNeedsSetup', 'true');
                console.log('New owner detected - needs restaurant setup');
              } else {
                // Clear the flag if restaurant info is complete
                await AsyncStorage.removeItem('newOwnerNeedsSetup');
              }
            } catch (e) {
              console.error('Error checking restaurant info:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing sync services:', error);
      }
    };

    initializeApp();
  }, [dispatch, tableIds.length, isLoggedIn]);

  // Re-initialize services when restaurantId changes
  useEffect(() => {
    if (restaurantId && isLoggedIn) {
      try {
        console.log('🔄 AppInitializer: Restaurant changed, re-initializing services...');
        
        // Clear old services first
        clearAutoReceiptService();
        
        // Set restaurant for optimization services (triggers cleanup of old listeners)
        if (!optimizedListenerManager?.dispatch) {
          optimizedListenerManager?.initialize(dispatch);
        }
        optimizedListenerManager?.setRestaurant(restaurantId);
        listenerManager?.setRestaurant(restaurantId);
        
        // Start optimization services for new restaurant
        dataCleanupService?.start();
        periodicCleanupService?.start();
        
        // Re-initialize Firebase service with new restaurantId
        initializeFirebaseService(restaurantId);
        
        // Re-initialize with new restaurantId
        initializeRealtimeSync(restaurantId);
        initializeReceiptSync(restaurantId);
        initializeAutoReceiptService(restaurantId);
        
        console.log('✅ AppInitializer: Services re-initialized for new restaurant');
      } catch (error) {
        console.error('Error re-initializing services:', error);
      }
    } else if (!restaurantId && isLoggedIn) {
      // Cleanup when restaurant is cleared but user is still logged in
      console.log('🧹 AppInitializer: Restaurant cleared, cleaning up services');
      optimizedListenerManager?.setRestaurant(null);
      listenerManager?.setRestaurant(null);
      dataCleanupService?.stop();
      periodicCleanupService?.stop();
    }
  }, [restaurantId, isLoggedIn]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 AppInitializer: Component unmounting, cleaning up...');
      
      // Clear performance monitoring interval
      if ((global as any).performanceInterval) {
        clearInterval((global as any).performanceInterval);
        (global as any).performanceInterval = null;
      }
      
      // Stop optimization services
      dataCleanupService?.stop();
      periodicCleanupService?.stop();
      optimizedFirebaseService?.cleanup();
      
      // Reset performance monitor
      performanceMonitor?.reset();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default AppInitializer;

