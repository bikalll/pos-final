/**
 * Direct Firebase service functions with guaranteed availability
 * This bypasses any module loading issues by providing direct implementations
 */

import { createFirestoreService } from '../services/firestoreService';

/**
 * Direct implementation of getOptimizedTables that always works
 */
export async function getOptimizedTables(restaurantId: string): Promise<Record<string, any>> {
  try {
    console.log('🔄 Loading tables for restaurant:', restaurantId);
    const firestoreService = createFirestoreService(restaurantId);
    const result = await firestoreService.getTables();
    console.log('✅ Tables loaded successfully:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('❌ Error loading tables:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      restaurantId: restaurantId
    });
    throw error;
  }
}

/**
 * Direct implementation of getOptimizedMenuItems that always works
 */
export async function getOptimizedMenuItems(restaurantId: string): Promise<Record<string, any>> {
  try {
    console.log('🔄 Loading menu items for restaurant:', restaurantId);
    const firestoreService = createFirestoreService(restaurantId);
    const result = await firestoreService.getMenuItems();
    console.log('✅ Menu items loaded successfully:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('❌ Error loading menu items:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      restaurantId: restaurantId
    });
    throw error;
  }
}
