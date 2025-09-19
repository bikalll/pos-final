// FirebaseConnectionManager.ts
// Manages Firebase connections and prevents connection leaks

import { FirebaseService } from './firebaseService';

class FirebaseConnectionManager {
  private static instance: FirebaseConnectionManager;
  private activeServices: Map<string, FirebaseService> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_IDLE_TIME = 5 * 60 * 1000; // 5 minutes
  private lastActivity: Map<string, number> = new Map();

  private constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): FirebaseConnectionManager {
    if (!FirebaseConnectionManager.instance) {
      FirebaseConnectionManager.instance = new FirebaseConnectionManager();
    }
    return FirebaseConnectionManager.instance;
  }

  public getService(restaurantId: string): FirebaseService {
    const now = Date.now();
    
    // Check if we already have an active service for this restaurant
    if (this.activeServices.has(restaurantId)) {
      this.lastActivity.set(restaurantId, now);
      return this.activeServices.get(restaurantId)!;
    }

    // Create new service
    const service = new FirebaseService(restaurantId);
    this.activeServices.set(restaurantId, service);
    this.lastActivity.set(restaurantId, now);
    
    console.log(`🔄 Created new Firebase service for restaurant: ${restaurantId}`);
    return service;
  }

  public cleanupService(restaurantId: string): void {
    const service = this.activeServices.get(restaurantId);
    if (service) {
      console.log(`🧹 Cleaning up Firebase service for restaurant: ${restaurantId}`);
      service.cleanup();
      this.activeServices.delete(restaurantId);
      this.lastActivity.delete(restaurantId);
    }
  }

  public cleanupAll(): void {
    console.log(`🧹 Cleaning up all Firebase services (${this.activeServices.size} active)`);
    
    this.activeServices.forEach((service, restaurantId) => {
      try {
        service.cleanup();
        console.log(`✅ Cleaned up service for restaurant: ${restaurantId}`);
      } catch (error) {
        console.warn(`Failed to cleanup service for restaurant ${restaurantId}:`, error);
      }
    });
    
    this.activeServices.clear();
    this.lastActivity.clear();
  }

  private startCleanupInterval(): void {
    // Clean up idle services every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleServices();
    }, 2 * 60 * 1000);
  }

  private cleanupIdleServices(): void {
    const now = Date.now();
    const toCleanup: string[] = [];

    this.lastActivity.forEach((lastActivity, restaurantId) => {
      if (now - lastActivity > this.MAX_IDLE_TIME) {
        toCleanup.push(restaurantId);
      }
    });

    toCleanup.forEach(restaurantId => {
      console.log(`🧹 Cleaning up idle service for restaurant: ${restaurantId}`);
      this.cleanupService(restaurantId);
    });
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cleanupAll();
  }

  public getStats(): { activeServices: number; restaurantIds: string[] } {
    return {
      activeServices: this.activeServices.size,
      restaurantIds: Array.from(this.activeServices.keys())
    };
  }
}

export const firebaseConnectionManager = FirebaseConnectionManager.getInstance();
export default FirebaseConnectionManager;
