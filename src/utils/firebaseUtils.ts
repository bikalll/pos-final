/**
 * Utility functions for Firebase operations with fallback mechanisms
 * This ensures that functions are always available even if there are module loading issues
 */

import { createFirestoreService } from '../services/firestoreService';

/**
 * Get tables with fallback mechanism
 */
export async function getTablesWithFallback(restaurantId: string): Promise<Record<string, any>> {
  try {
    // Try to use optimized service first
    const optimizedService = await import('../services/OptimizedFirebaseService');
    console.log('🔄 Optimized service imported:', Object.keys(optimizedService));
    
    if (optimizedService.getOptimizedTables && typeof optimizedService.getOptimizedTables === 'function') {
      console.log('🔄 Using optimized service for tables');
      return await optimizedService.getOptimizedTables(restaurantId);
    } else {
      console.log('🔄 getOptimizedTables not available in optimized service, trying direct service');
    }
  } catch (error) {
    console.log('🔄 Optimized service failed, falling back to direct service:', error);
  }
  
  // Fallback to direct firestore service
  try {
    console.log('🔄 Using direct firestore service for tables');
    const firestoreService = createFirestoreService(restaurantId);
    const result = await firestoreService.getTables();
    console.log('✅ Direct service successful, loaded tables:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('❌ Both optimized and direct services failed:', error);
    throw error;
  }
}

/**
 * Get menu items with fallback mechanism
 */
export async function getMenuItemsWithFallback(restaurantId: string): Promise<Record<string, any>> {
  try {
    // Try to use optimized service first
    const optimizedService = await import('../services/OptimizedFirebaseService');
    console.log('🔄 Optimized service imported:', Object.keys(optimizedService));
    
    if (optimizedService.getOptimizedMenuItems && typeof optimizedService.getOptimizedMenuItems === 'function') {
      console.log('🔄 Using optimized service for menu items');
      return await optimizedService.getOptimizedMenuItems(restaurantId);
    } else {
      console.log('🔄 getOptimizedMenuItems not available in optimized service, trying direct service');
    }
  } catch (error) {
    console.log('🔄 Optimized service failed, falling back to direct service:', error);
  }
  
  // Fallback to direct firestore service
  try {
    console.log('🔄 Using direct firestore service for menu items');
    const firestoreService = createFirestoreService(restaurantId);
    const result = await firestoreService.getMenuItems();
    console.log('✅ Direct service successful, loaded menu items:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('❌ Both optimized and direct services failed:', error);
    throw error;
  }
}
