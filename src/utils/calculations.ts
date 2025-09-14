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
  // Calculate subtotal with individual item discounts
  const subtotal = order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  
  // Apply order-level discount
  const discount = (subtotal * (order.discountPercentage || 0)) / 100;
  const afterDiscount = subtotal - discount;
  const serviceCharge = (afterDiscount * (order.serviceChargePercentage || 0)) / 100;
  const taxable = afterDiscount + serviceCharge;
  const tax = (taxable * (order.taxPercentage || 0)) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  
  return { subtotal, discount, serviceCharge, tax, total };
}
