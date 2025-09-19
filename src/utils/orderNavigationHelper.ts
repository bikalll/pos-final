/**
 * Order Navigation Helper
 * Provides consistent navigation patterns for order-related screens
 * to prevent navigation issues and ensure proper flow
 */

import { NavigationProp } from '@react-navigation/native';
import { safeNavigateWithTracking } from '../services/NavigationStateManager';

interface OrderNavigationParams {
  orderId: string;
  tableId: string;
  fromMenu?: boolean;
}

/**
 * Navigate to Order Confirmation screen with proper parameters
 */
export const navigateToOrderConfirmation = (
  navigation: any, // Use any to avoid complex typing issues
  params: OrderNavigationParams
) => {
  const { orderId, tableId, fromMenu = false } = params;
  
  console.log('🔍 navigateToOrderConfirmation called with:', {
    orderId,
    tableId,
    fromMenu,
    fromMenuType: typeof fromMenu
  });
  
  // Use safe navigation with tracking
  safeNavigateWithTracking(navigation, 'OrderConfirmation', {
    orderId,
    tableId,
    fromMenu: Boolean(fromMenu) // Ensure it's always a boolean
  });
};

/**
 * Navigate to Order Taking screen with proper parameters
 */
export const navigateToOrderTaking = (
  navigation: any, // Use any to avoid complex typing issues
  tableId: string,
  orderId: string = 'new'
) => {
  console.log('🔍 navigateToOrderTaking called with:', { tableId, orderId });
  
  try {
    navigation.navigate('OrderTaking', {
      tableId,
      orderId
    });
  } catch (error) {
    console.error('❌ Navigation to OrderTaking failed:', error);
    throw new Error('Failed to navigate to order taking');
  }
};

/**
 * Navigate to Ongoing Orders screen
 */
export const navigateToOngoingOrders = (navigation: any) => {
  console.log('🔍 navigateToOngoingOrders called');
  
  try {
    navigation.navigate('OngoingOrders');
  } catch (error) {
    console.error('❌ Navigation to OngoingOrders failed:', error);
    throw new Error('Failed to navigate to ongoing orders');
  }
};

/**
 * Navigate to Menu screen
 */
export const navigateToMenu = (navigation: any) => {
  console.log('🔍 navigateToMenu called');
  
  try {
    navigation.navigate('Menu');
  } catch (error) {
    console.error('❌ Navigation to Menu failed:', error);
    throw new Error('Failed to navigate to menu');
  }
};

/**
 * Navigate to Tables Dashboard
 */
export const navigateToTablesDashboard = (navigation: any) => {
  console.log('🔍 navigateToTablesDashboard called');
  
  try {
    navigation.navigate('Dashboard', { screen: 'TablesDashboard' });
  } catch (error) {
    console.error('❌ Navigation to TablesDashboard failed:', error);
    throw new Error('Failed to navigate to tables dashboard');
  }
};

/**
 * Safe navigation wrapper that handles errors gracefully
 */
export const safeNavigate = (
  navigation: any,
  screenName: string,
  params?: any
) => {
  try {
    console.log(`🔍 Safe navigation to ${screenName}:`, params);
    navigation.navigate(screenName, params);
  } catch (error) {
    console.error(`❌ Safe navigation to ${screenName} failed:`, error);
    // Fallback navigation
    try {
      navigation.navigate('OngoingOrders');
    } catch (fallbackError) {
      console.error('❌ Fallback navigation also failed:', fallbackError);
    }
  }
};
