import { createFirestoreService } from '../services/firestoreService';
import { cleanOrderData } from '../utils/orderUtils';

// Performance tracking
const performanceMetrics = {
  middlewareCalls: 0,
  averageProcessingTime: 0,
  totalProcessingTime: 0,
  errors: 0
};

// Batch processing queue
const batchQueue = new Map<string, {
  orderId: string;
  restaurantId: string;
  timestamp: number;
  retryCount: number;
}>();

// Process batch every 2 seconds
setInterval(() => {
  if (batchQueue.size > 0) {
    processBatchQueue();
  }
}, 2000);

const processBatchQueue = async () => {
  const batch = Array.from(batchQueue.values());
  batchQueue.clear();
  
  // Group by restaurant for efficient processing
  const groupedByRestaurant = batch.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = [];
    }
    acc[item.restaurantId].push(item);
    return acc;
  }, {} as Record<string, typeof batch>);
  
  // Process each restaurant's orders
  for (const [restaurantId, orders] of Object.entries(groupedByRestaurant)) {
    try {
      await processRestaurantOrders(restaurantId, orders);
    } catch (error) {
      console.error('❌ Batch processing error:', error);
      performanceMetrics.errors++;
    }
  }
};

const processRestaurantOrders = async (restaurantId: string, orders: any[]) => {
  const startTime = performance.now();
  
  try {
    const service = createFirestoreService(restaurantId);
    
    // Batch save orders
    const orderPromises = orders.map(order => 
      service.saveOrder({ 
        ...cleanOrderData(order), 
        restaurantId 
      })
    );
    
    await Promise.all(orderPromises);
    
    // Process inventory deduction in background
    setTimeout(() => {
      processInventoryDeduction(restaurantId, orders);
    }, 100);
    
    const endTime = performance.now();
    updatePerformanceMetrics(endTime - startTime);
    
  } catch (error) {
    console.error('❌ Restaurant order processing error:', error);
    performanceMetrics.errors++;
  }
};

const processInventoryDeduction = async (restaurantId: string, orders: any[]) => {
  try {
    // Use Cloud Function for heavy inventory processing
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const processInventory = httpsCallable(functions, 'processInventoryDeduction');
    
    await processInventory({ 
      restaurantId, 
      orderIds: orders.map(o => o.orderId) 
    });
    
  } catch (error) {
    console.warn('⚠️ Inventory deduction failed, using fallback:', error);
    // Fallback to local processing if Cloud Function fails
    await processInventoryLocally(restaurantId, orders);
  }
};

const processInventoryLocally = async (restaurantId: string, orders: any[]) => {
  // Simplified local inventory processing
  const service = createFirestoreService(restaurantId);
  
  for (const order of orders) {
    try {
      // Basic inventory update without complex calculations
      await service.updateInventoryForOrder(order.orderId);
    } catch (error) {
      console.warn('⚠️ Local inventory processing failed:', error);
    }
  }
};

const updatePerformanceMetrics = (processingTime: number) => {
  performanceMetrics.middlewareCalls++;
  performanceMetrics.totalProcessingTime += processingTime;
  performanceMetrics.averageProcessingTime = 
    performanceMetrics.totalProcessingTime / performanceMetrics.middlewareCalls;
  
  // Log performance every 10 calls
  if (performanceMetrics.middlewareCalls % 10 === 0) {
    console.log('📊 Performance Metrics:', {
      calls: performanceMetrics.middlewareCalls,
      avgTime: performanceMetrics.averageProcessingTime.toFixed(2) + 'ms',
      errors: performanceMetrics.errors
    });
  }
};

export const optimizedFirebaseMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Only process critical actions
  if (action.type === 'orders/markOrderSaved') {
    const orderId = action.payload?.orderId || action.payload?.id;
    const state = store.getState();
    const restaurantId = state?.auth?.restaurantId;
    
    if (orderId && restaurantId) {
      // Add to batch queue instead of processing immediately
      batchQueue.set(orderId, {
        orderId,
        restaurantId,
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  }
  
  return result;
};

export { performanceMetrics };