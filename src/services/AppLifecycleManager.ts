// AppLifecycleManager.ts
// Manages app lifecycle events and cleanup

import { AppState, AppStateStatus } from 'react-native';
import { firebaseConnectionManager } from './FirebaseConnectionManager';

class AppLifecycleManager {
  private static instance: AppLifecycleManager;
  private appState: AppStateStatus = 'active';
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupAppStateListener();
  }

  public static getInstance(): AppLifecycleManager {
    if (!AppLifecycleManager.instance) {
      AppLifecycleManager.instance = new AppLifecycleManager();
    }
    return AppLifecycleManager.instance;
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    console.log(`📱 App state changed from ${this.appState} to ${nextAppState}`);
    
    if (this.appState === 'active' && nextAppState === 'background') {
      this.handleAppBackgrounded();
    } else if (this.appState === 'background' && nextAppState === 'active') {
      this.handleAppForegrounded();
    }
    
    this.appState = nextAppState;
  }

  private handleAppBackgrounded(): void {
    console.log('📱 App backgrounded - scheduling cleanup');
    
    // Schedule cleanup after 2 minutes of being in background
    this.cleanupTimer = setTimeout(() => {
      console.log('🧹 Performing background cleanup...');
      this.performCleanup();
    }, 2 * 60 * 1000); // 2 minutes
  }

  private handleAppForegrounded(): void {
    console.log('📱 App foregrounded - canceling cleanup');
    
    // Cancel scheduled cleanup if app comes back to foreground
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private performCleanup(): void {
    try {
      console.log('🧹 Performing comprehensive app cleanup...');
      
      // Cleanup Firebase connections
      const stats = firebaseConnectionManager.getStats();
      console.log(`🧹 Cleaning up ${stats.activeServices} Firebase services`);
      firebaseConnectionManager.cleanupAll();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('🧹 Forced garbage collection');
      }
      
      console.log('✅ App cleanup completed');
    } catch (error) {
      console.warn('Failed to perform app cleanup:', error);
    }
  }

  public forceCleanup(): void {
    console.log('🧹 Force cleanup requested');
    this.performCleanup();
  }

  public onUserLogout(): void {
    console.log('👤 User logout - performing cleanup');
    this.performCleanup();
  }

  public onRestaurantSwitch(): void {
    console.log('🏪 Restaurant switch - performing cleanup');
    this.performCleanup();
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    AppState.removeEventListener('change', this.handleAppStateChange.bind(this));
  }
}

export const appLifecycleManager = AppLifecycleManager.getInstance();
export default AppLifecycleManager;
