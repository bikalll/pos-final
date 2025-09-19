import { Order, OrderItem } from "./types";

export function calculateItemTotal(item: OrderItem): number {
  const baseTotal = item.price * item.quantity;
  let discount = 0;
  
  if (item.discountPercentage !== undefined) {
    discount = (baseTotal * item.discountPercentage) / 100;
  } else if (item.discountAmount !== undefined) {
    discount = item.discountAmount;
  }
  
  return Math.max(0, baseTotal - discount);
}

export function calculateOrderTotals(order: Order) {
  // Calculate base subtotal (before any discounts)
  const baseSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate subtotal with individual item discounts
  const discountedSubtotal = order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  
  // Calculate individual item discounts
  const itemDiscountsTotal = Math.max(0, baseSubtotal - discountedSubtotal);
  
  // Apply order-level discount
  const orderDiscountAmount = (discountedSubtotal * (order.discountPercentage || 0)) / 100;
  
  // Total discount includes both item-level and order-level discounts
  const totalDiscount = itemDiscountsTotal + orderDiscountAmount;
  
  const afterDiscount = discountedSubtotal - orderDiscountAmount;
  const serviceCharge = (afterDiscount * (order.serviceChargePercentage || 0)) / 100;
  const taxable = afterDiscount + serviceCharge;
  const tax = (taxable * (order.taxPercentage || 0)) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  
  return { subtotal: afterDiscount, discount: totalDiscount, serviceCharge, tax, total };
}
