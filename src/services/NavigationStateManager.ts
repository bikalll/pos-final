/**
 * Navigation State Manager
 * Prevents navigation parameter corruption and state accumulation issues
 * that cause the app to redirect incorrectly after multiple operations
 */

// Removed NavigationProp import to avoid typing issues
import { store } from '../redux/storeFirebase';

interface NavigationState {
  lastNavigation: {
    screen: string;
    params: any;
    timestamp: number;
  } | null;
  navigationHistory: Array<{
    screen: string;
    params: any;
    timestamp: number;
  }>;
  corruptedParams: Set<string>;
}

class NavigationStateManager {
  private state: NavigationState = {
    lastNavigation: null,
    navigationHistory: [],
    corruptedParams: new Set(),
  };

  private maxHistorySize = 50;
  private corruptionThreshold = 10; // Max corrupted params before cleanup

  /**
   * Track navigation to detect parameter corruption
   */
  trackNavigation(screen: string, params: any) {
    const navigation = {
      screen,
      params: { ...params },
      timestamp: Date.now(),
    };

    this.state.lastNavigation = navigation;
    this.state.navigationHistory.push(navigation);

    // Keep history size manageable
    if (this.state.navigationHistory.length > this.maxHistorySize) {
      this.state.navigationHistory = this.state.navigationHistory.slice(-this.maxHistorySize);
    }

    // Check for parameter corruption
    this.detectParameterCorruption(screen, params);

    console.log('🔍 Navigation tracked:', {
      screen,
      params,
      historySize: this.state.navigationHistory.length,
      corruptedCount: this.state.corruptedParams.size
    });
  }

  /**
   * Detect if navigation parameters are corrupted
   */
  private detectParameterCorruption(screen: string, params: any) {
    if (screen === 'OrderConfirmation') {
      // Check for common corruption patterns
      const issues: string[] = [];

      if (params.fromMenu === undefined) {
        issues.push('fromMenu is undefined');
      } else if (typeof params.fromMenu !== 'boolean') {
        issues.push('fromMenu is not boolean');
      }

      if (params.orderId && typeof params.orderId !== 'string') {
        issues.push('orderId is not string');
      }

      if (params.tableId && typeof params.tableId !== 'string') {
        issues.push('tableId is not string');
      }

      if (issues.length > 0) {
        console.warn('⚠️ Navigation parameter corruption detected:', {
          screen,
          params,
          issues
        });
        
        this.state.corruptedParams.add(`${screen}-${Date.now()}`);
      }
    }
  }

  /**
   * Get clean navigation parameters
   */
  getCleanParams(screen: string, params: any): any {
    const cleanParams = { ...params };

    if (screen === 'OrderConfirmation') {
      // Ensure fromMenu is always a boolean
      cleanParams.fromMenu = Boolean(cleanParams.fromMenu);
      
      // Ensure required parameters exist
      if (!cleanParams.orderId) {
        console.warn('⚠️ Missing orderId in OrderConfirmation params');
      }
      if (!cleanParams.tableId) {
        console.warn('⚠️ Missing tableId in OrderConfirmation params');
      }
    }

    return cleanParams;
  }

  /**
   * Check if cleanup is needed
   */
  needsCleanup(): boolean {
    return this.state.corruptedParams.size > this.corruptionThreshold;
  }

  /**
   * Perform cleanup to reset navigation state
   */
  cleanup() {
    console.log('🧹 NavigationStateManager: Performing cleanup');
    
    this.state.lastNavigation = null;
    this.state.navigationHistory = [];
    this.state.corruptedParams.clear();
    
    // Also trigger Redux state cleanup
    this.triggerReduxCleanup();
  }

  /**
   * Trigger Redux state cleanup similar to logout
   */
  private triggerReduxCleanup() {
    try {
      // Import actions dynamically to avoid circular dependencies
      import('../redux/slices/ordersSliceFirebase').then(ordersModule => {
        if (ordersModule.resetOrders) {
          store.dispatch(ordersModule.resetOrders());
          console.log('✅ Orders state reset');
        }
      });

      // Clean up listeners
      import('../services/ListenerManager').then(listenerModule => {
        if (listenerModule.listenerManager) {
          listenerModule.listenerManager.cleanup();
          console.log('✅ Listeners cleaned up');
        }
      });

      // Clean up Firebase listeners
      import('../services/firebaseListeners').then(firebaseModule => {
        if (firebaseModule.firebaseListenersService) {
          firebaseModule.firebaseListenersService.removeAllListeners();
          console.log('✅ Firebase listeners cleaned up');
        }
      });

    } catch (error) {
      console.error('❌ Redux cleanup failed:', error);
    }
  }

  /**
   * Get navigation statistics
   */
  getStats() {
    return {
      historySize: this.state.navigationHistory.length,
      corruptedCount: this.state.corruptedParams.size,
      lastNavigation: this.state.lastNavigation,
      needsCleanup: this.needsCleanup()
    };
  }

  /**
   * Reset navigation state (called on app start)
   */
  reset() {
    this.state = {
      lastNavigation: null,
      navigationHistory: [],
      corruptedParams: new Set(),
    };
    console.log('🔄 NavigationStateManager: State reset');
  }

  /**
   * Stop method for compatibility with AppInitializer
   */
  stop() {
    this.reset();
    console.log('🧹 NavigationStateManager: Stopped and reset');
  }
}

// Export singleton instance
export const navigationStateManager = new NavigationStateManager();

// Helper function for safe navigation
export const safeNavigateWithTracking = (
  navigation: any,
  screen: string,
  params: any
) => {
  // Get clean parameters
  const cleanParams = navigationStateManager.getCleanParams(screen, params);
  
  // Track navigation
  navigationStateManager.trackNavigation(screen, cleanParams);
  
  // Perform navigation
  try {
    navigation.navigate(screen, cleanParams);
  } catch (error) {
    console.error(`❌ Navigation to ${screen} failed:`, error);
    
    // If navigation fails, try cleanup and retry
    if (navigationStateManager.needsCleanup()) {
      console.log('🧹 Navigation failed, performing cleanup and retry');
      navigationStateManager.cleanup();
      
      // Retry with clean parameters
      setTimeout(() => {
        try {
          navigation.navigate(screen, cleanParams);
        } catch (retryError) {
          console.error(`❌ Retry navigation to ${screen} also failed:`, retryError);
        }
      }, 100);
    }
  }
};

export default navigationStateManager;
