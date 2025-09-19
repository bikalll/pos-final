import { Order } from './types';

/**
 * Cleans order data by removing undefined values and ensuring proper types
 * This prevents Firebase errors when saving orders with undefined properties
 */
export function cleanOrderData(order: Order): Order {
  const cleanedOrder = {
    ...order,
    // Ensure other optional fields are properly handled
    customerName: order.customerName || null,
    customerPhone: order.customerPhone || null,
    payment: order.payment || null,
    savedQuantities: order.savedQuantities || {},
    // Ensure boolean fields are properly set
    isSaved: order.isSaved || false,
    isReviewed: order.isReviewed || false,
    // Ensure items array is preserved with all discount fields
    items: (order.items || []).map(item => {
      const cleanedItem = {
        ...item,
        // Ensure other item fields are properly set
        modifiers: item.modifiers || [],
        orderType: item.orderType || 'KOT',
      };
      
      // Always include discount fields, even if they are undefined/null
      // This ensures that discount data is preserved during the save process
      cleanedItem.discountPercentage = item.discountPercentage;
      cleanedItem.discountAmount = item.discountAmount;
      
      return cleanedItem;
    }),
  };
  
  // Debug logging for discount data
  const itemsWithDiscounts = cleanedOrder.items.filter(item => 
    item.discountPercentage !== undefined || item.discountAmount !== undefined
  );
  if (itemsWithDiscounts.length > 0) {
    console.log('🧹 cleanOrderData: Found items with discounts:', {
      orderId: cleanedOrder.id,
      itemsWithDiscounts: itemsWithDiscounts.map(item => ({
        name: item.name,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount
      }))
    });
  }
  
  return cleanedOrder;
}

/**
 * Removes undefined values from an object recursively
 * This is useful for cleaning data before sending to Firebase
 */
export function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = removeUndefinedValues(value);
        // Only add the property if the cleaned value is not undefined
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
}
