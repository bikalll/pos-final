import { Order } from '../types/Order';

// Remove undefined values from an object recursively
export const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};

// Clean order data for Firebase storage
export const cleanOrderData = (order: Order): Order => {
  return {
    id: order.id,
    tableId: order.tableId,
    items: order.items,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    specialInstructions: order.specialInstructions,
    paymentMethod: order.paymentMethod,
    discount: order.discount,
    tax: order.tax,
    subtotal: order.subtotal,
    // Remove any undefined or null values
    ...Object.fromEntries(
      Object.entries(order).filter(([_, value]) => value !== undefined && value !== null)
    )
  };
};

// Validate order data
export const validateOrderData = (order: Order): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!order.id) {
    errors.push('Order ID is required');
  }
  
  if (!order.tableId) {
    errors.push('Table ID is required');
  }
  
  if (!order.items || order.items.length === 0) {
    errors.push('Order must have at least one item');
  }
  
  if (order.total <= 0) {
    errors.push('Order total must be greater than 0');
  }
  
  if (!order.status) {
    errors.push('Order status is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculate order totals
export const calculateOrderTotals = (order: Order): Order => {
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = order.discount || 0;
  const taxAmount = order.tax || 0;
  const total = subtotal - discountAmount + taxAmount;
  
  return {
    ...order,
    subtotal,
    total: Math.max(0, total)
  };
};

// Format order for display
export const formatOrderForDisplay = (order: Order): string => {
  const items = order.items.map(item => 
    `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');
  
  return `Order #${order.id}
Table: ${order.tableId}
Items:
${items}
Subtotal: $${order.subtotal.toFixed(2)}
Discount: $${(order.discount || 0).toFixed(2)}
Tax: $${(order.tax || 0).toFixed(2)}
Total: $${order.total.toFixed(2)}`;
};

// Get order status color
export const getOrderStatusColor = (status: string): string => {
  switch (status) {
    case 'ongoing':
      return '#ff9800';
    case 'completed':
      return '#4caf50';
    case 'cancelled':
      return '#f44336';
    default:
      return '#666';
  }
};

// Get order status text
export const getOrderStatusText = (status: string): string => {
  switch (status) {
    case 'ongoing':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};