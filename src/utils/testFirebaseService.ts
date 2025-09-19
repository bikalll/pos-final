/**
 * Test file to verify FirebaseDataService is working correctly
 * This can be imported and called to test the service
 */

import { getOptimizedTables, getOptimizedMenuItems } from '../services/FirebaseDataService';

export async function testFirebaseDataService(restaurantId: string) {
  try {
    console.log('🧪 [TEST] Testing FirebaseDataService...');
    
    // Test getOptimizedTables
    console.log('🧪 [TEST] Testing getOptimizedTables...');
    console.log('🧪 [TEST] Function type:', typeof getOptimizedTables);
    console.log('🧪 [TEST] Function:', getOptimizedTables);
    
    if (typeof getOptimizedTables !== 'function') {
      throw new Error('getOptimizedTables is not a function!');
    }
    
    const tables = await getOptimizedTables(restaurantId);
    console.log('✅ [TEST] getOptimizedTables works! Loaded:', Object.keys(tables).length, 'tables');
    
    // Test getOptimizedMenuItems
    console.log('🧪 [TEST] Testing getOptimizedMenuItems...');
    console.log('🧪 [TEST] Function type:', typeof getOptimizedMenuItems);
    
    if (typeof getOptimizedMenuItems !== 'function') {
      throw new Error('getOptimizedMenuItems is not a function!');
    }
    
    const menuItems = await getOptimizedMenuItems(restaurantId);
    console.log('✅ [TEST] getOptimizedMenuItems works! Loaded:', Object.keys(menuItems).length, 'menu items');
    
    console.log('🎉 [TEST] All tests passed! FirebaseDataService is working correctly.');
    return { success: true, tables: Object.keys(tables).length, menuItems: Object.keys(menuItems).length };
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error);
    return { success: false, error: error.message };
  }
}
