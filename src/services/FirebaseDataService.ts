/**
 * Firebase Data Service - Direct implementation
 * This service provides direct access to Firebase data without any optimization layers
 * to ensure reliable functionality and avoid module loading issues.
 */

import { createFirestoreService } from './firestoreService';

/**
 * Get tables data directly from Firebase
 * @param restaurantId - The restaurant ID to get tables for
 * @returns Promise<Record<string, any>> - Tables data
 */
export async function getTablesData(restaurantId: string): Promise<Record<string, any>> {
  try {
    console.log('🔄 [FirebaseDataService] Loading tables for restaurant:', restaurantId);
    const firestoreService = createFirestoreService(restaurantId);
    const result = await firestoreService.getTables();
    console.log('✅ [FirebaseDataService] Tables loaded successfully:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('❌ [FirebaseDataService] Error loading tables:', error);
    console.error('❌ [FirebaseDataService] Error details:', {
      message: error.message,
      stack: error.stack,
      restaurantId: restaurantId
    });
    throw error;
  }
}

/**
 * Get menu items data directly from Firebase
 * @param restaurantId - The restaurant ID to get menu items for
 * @returns Promise<Record<string, any>> - Menu items data
 */
export async function getMenuItemsData(restaurantId: string): Promise<Record<string, any>> {
  try {
    console.log('🔄 [FirebaseDataService] Loading menu items for restaurant:', restaurantId);
    const firestoreService = createFirestoreService(restaurantId);
    const result = await firestoreService.getMenuItems();
    console.log('✅ [FirebaseDataService] Menu items loaded successfully:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('❌ [FirebaseDataService] Error loading menu items:', error);
    console.error('❌ [FirebaseDataService] Error details:', {
      message: error.message,
      stack: error.stack,
      restaurantId: restaurantId
    });
    throw error;
  }
}

// Export aliases for compatibility
export const getOptimizedTables = getTablesData;
export const getOptimizedMenuItems = getMenuItemsData;
