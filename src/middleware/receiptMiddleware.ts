import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../redux/store';
import { getAutoReceiptService } from '../services/autoReceiptService';

export const receiptMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  console.log('🔧 MIDDLEWARE: Action dispatched:', action.type);
  
  const result = next(action);
  
  // Check if this is a completeOrder action
  if (action.type === 'orders/completeOrder') {
    console.log('🔧 MIDDLEWARE: completeOrder action detected!');
    const state = store.getState();
    const orderId = action.payload.orderId;
    const order = state.orders.ordersById[orderId];
    const restaurantId = state.auth.restaurantId;
    
    console.log('🔧 MIDDLEWARE: Order ID:', orderId);
    console.log('🔧 MIDDLEWARE: Order found:', !!order);
    console.log('🔧 MIDDLEWARE: Restaurant ID:', restaurantId);
    console.log('🔧 MIDDLEWARE: Order details:', order ? {
      id: order.id,
      status: order.status,
      hasPayment: !!order.payment,
      restaurantId: order.restaurantId
    } : 'No order found');
    
    if (order && restaurantId) {
      console.log('🔄 Receipt middleware: Order completed, auto-saving receipt...', orderId);
      
      // Auto-save receipt asynchronously
      setTimeout(async () => {
        try {
          console.log('🔄 Receipt middleware: Starting async receipt save...');
          let autoReceiptService = getAutoReceiptService();
          if (!autoReceiptService && restaurantId) {
            console.log('🔄 Receipt middleware: Initializing auto receipt service...');
            const { initializeAutoReceiptService } = await import('../services/autoReceiptService');
            autoReceiptService = initializeAutoReceiptService(restaurantId);
            console.log('✅ Receipt middleware: Service initialized');
          }
          
          if (autoReceiptService) {
            console.log('🔄 Receipt middleware: Saving receipt for order:', orderId);
            // Enrich with processor info from auth state
            const enrichedOrder = {
              ...order,
              processedBy: {
                role: state?.auth?.role || 'Staff',
                username: state?.auth?.userName || 'Unknown'
              }
            } as any;
            await autoReceiptService.saveReceiptForOrder(enrichedOrder);
            console.log('✅ Receipt middleware: Receipt saved successfully for order:', orderId);
          } else {
            console.error('❌ Receipt middleware: Cannot save receipt - no service available');
          }
        } catch (error) {
          console.error('❌ Receipt middleware: Error saving receipt:', error);
        }
      }, 100); // Small delay to ensure state is updated
    } else {
      console.log('❌ Receipt middleware: Cannot save receipt - missing order or restaurantId');
    }
  }
  
  return result;
};
