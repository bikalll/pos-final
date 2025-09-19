// services/autoReceiptService.ts
import { createFirestoreService } from "./firestoreService";
import type { Order } from "../utils/types";

let instance: ReturnType<typeof createAutoReceiptService> | null = null;

export function initializeAutoReceiptService(restaurantId: string) {
  console.log('🔄 AutoReceiptService - Initializing with restaurantId:', restaurantId);
  instance = createAutoReceiptService(restaurantId);
  return instance;
}

export function clearAutoReceiptService() {
  console.log('🔄 AutoReceiptService - Clearing instance');
  instance = null;
}
export function getAutoReceiptService() { return instance; }

function createAutoReceiptService(restaurantId: string) {
  const firestoreService = createFirestoreService(restaurantId);

  async function getReceipts() { return firestoreService.getReceipts(); }

  async function saveReceiptForOrder(order: Order) {
    console.log('🔍 AutoReceiptService.saveReceiptForOrder - Starting...');
    console.log('🔍 AutoReceiptService.saveReceiptForOrder - Service Restaurant ID:', restaurantId);
    console.log('🔍 AutoReceiptService.saveReceiptForOrder - Order data:', {
      id: order.id,
      hasRestaurantId: !!order.restaurantId,
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      status: order.status,
      hasPayment: !!order.payment,
      paymentMethod: order.payment?.method,
      amount: order.payment?.amount,
      customerName: order.payment?.customerName
    });
    
    // Get table name from Firebase tables
    let tableName = order.tableName;
    if (!tableName && order.tableId) {
      try {
        const tables = await firestoreService.getTables();
        const table = tables[order.tableId];
        tableName = table?.name;
        
        // Handle synthetic table IDs (like credit settlements)
        if (!tableName && order.tableId.startsWith('credit-')) {
          if (order.tableId.includes('-installment-')) {
            // Extract installment number from table ID
            const installmentMatch = order.tableId.match(/-installment-(\d+)$/);
            const installmentNumber = installmentMatch ? installmentMatch[1] : '1';
            tableName = `Credit Settlement - Installment ${installmentNumber}`;
          } else {
            tableName = `Credit Settlement`;
          }
        }
        
        console.log('🔍 AutoReceiptService - Looked up table name:', {
          tableId: order.tableId,
          tableName: tableName,
          table: table,
          isSynthetic: order.tableId.startsWith('credit-')
        });
      } catch (error) {
        console.error('❌ AutoReceiptService - Error looking up table name:', error);
        // Fallback for synthetic table IDs
        if (order.tableId.startsWith('credit-')) {
          if (order.tableId.includes('-installment-')) {
            // Extract installment number from table ID
            const installmentMatch = order.tableId.match(/-installment-(\d+)$/);
            const installmentNumber = installmentMatch ? installmentMatch[1] : '1';
            tableName = `Credit Settlement - Installment ${installmentNumber}`;
          } else {
            tableName = `Credit Settlement`;
          }
        }
      }
    }
    
    console.log('🔍 AutoReceiptService.saveReceiptForOrder - FINAL RESTAURANT ID TO USE:', order.restaurantId || restaurantId);
    
    // Guard: avoid duplicate receipts for the same order
    try {
      const existing = await getReceipts();
      const existingForOrder = Object.values(existing || {}).find((r: any) => r.orderId === order.id);
      if (existingForOrder) {
        console.log('ℹ️ AutoReceiptService: Receipt already exists for order, skipping save', {
          orderId: order.id,
          existingReceiptId: (existingForOrder as any).id,
        });
        return { id: (existingForOrder as any).id, data: existingForOrder };
      }
    } catch (e) {
      console.warn('AutoReceiptService: duplicate check failed, proceeding to save:', (e as Error).message);
    }

    // Compute amount for split/non-split payments
    const p: any = order.payment || {};
    const splitAmount = Array.isArray(p.splitPayments) ? p.splitPayments.reduce((s: number, sp: any) => s + (Number(sp.amount) || 0), 0) : undefined;

    // Get restaurant name from order or auth state
    const restaurantName = (order as any).restaurantName || (order as any).authRestaurantName || 'Restaurant';
    
    // Calculate separate discount amounts
    const calculateItemTotal = (item: any) => {
      const baseTotal = item.price * item.quantity;
      let discount = 0;
      if (item.discountPercentage !== undefined) discount = (baseTotal * item.discountPercentage) / 100;
      else if (item.discountAmount !== undefined) discount = item.discountAmount;
      return Math.max(0, baseTotal - discount);
    };
    
    const baseSubtotal = (order.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const discountedSubtotal = (order.items || []).reduce((sum: number, item: any) => sum + calculateItemTotal(item), 0);
    const itemDiscountsTotal = Math.max(0, baseSubtotal - discountedSubtotal);
    const orderDiscountPercent = (order as any)?.discountPercentage || 0;
    const orderDiscountAmount = discountedSubtotal * (orderDiscountPercent / 100);

    const payload: any = {
      restaurantId: order.restaurantId || restaurantId,
      restaurantName: restaurantName, // Add restaurant name to receipt data
      orderId: order.id,
      tableId: order.tableId,
      tableName: tableName, // Use looked up table name
      items: order.items || [],
      baseSubtotal: baseSubtotal, // Base subtotal before any discounts (for gross sales)
      subtotal: order.subtotal || 0, // Discounted subtotal
      tax: order.tax || 0,
      serviceCharge: order.serviceCharge || 0,
      discount: (order.discount || 0) + itemDiscountsTotal + orderDiscountAmount,
      itemDiscount: itemDiscountsTotal,
      orderDiscount: orderDiscountAmount,
      paymentMethod: p.method || (Array.isArray(p.splitPayments) ? 'Split' : 'Cash'),
      amount: (splitAmount !== undefined ? splitAmount : (p.amountPaid ?? p.amount ?? 0)) || 0,
      splitPayments: Array.isArray(p.splitPayments) ? p.splitPayments.map((sp: any) => ({ method: sp.method, amount: Number(sp.amount) || 0 })) : undefined,
      customerName: order.payment?.customerName || "",
      customerPhone: order.payment?.customerPhone || "",
      customerId: (order as any).customerId || undefined,
      receiptType: (order as any).receiptType || undefined,
      processedBy: (order as any).processedBy || undefined,
      timestamp: Date.now(),
      createdAt: Date.now()
    };
    
    console.log('🔍 AutoReceiptService.saveReceiptForOrder - Payload created:', {
      restaurantId: payload.restaurantId,
      orderId: payload.orderId,
      tableId: payload.tableId,
      tableName: payload.tableName,
      amount: payload.amount,
      customerName: payload.customerName,
      paymentMethod: payload.paymentMethod,
      processedBy: payload.processedBy,
      isSettlement: payload.tableId?.startsWith('credit-'),
      timestamp: payload.timestamp
    });
    
    try {
      const result = await firestoreService.saveReceipt(payload);
      console.log('✅ AutoReceiptService.saveReceiptForOrder - Receipt saved successfully:', result.id);

      // Upsert customer stats (visitCount, totalSpent, firstVisit, lastVisit, creditAmount)
      try {
        const customerNameRaw = order.payment?.customerName || '';
        const customerPhoneRaw = order.payment?.customerPhone || '';
        const customerName = customerNameRaw.trim();
        const customerPhone = customerPhoneRaw.trim();
        const normalizePhone = (p: string) => p.replace(/\D+/g, '');
        const phoneDigits = normalizePhone(customerPhone);
        if (customerName || customerPhone) {
          const customers = await firestoreService.getCustomers();
          // Attempt to find existing by phone first, else by name (case-insensitive)
          const existing = Object.values(customers).find((c: any) => {
            const cPhoneDigits = (c.normalizedPhone || normalizePhone((c.phone || '').toString().trim()));
            const cName = (c.name || '').toString().trim().toLowerCase();
            return (phoneDigits && cPhoneDigits && cPhoneDigits === phoneDigits) ||
                   (!phoneDigits && customerName && cName === customerName.toLowerCase());
          });
          const now = Date.now();
          const visitIncrement = 1;
          // Compute credit portion (owed) and paid portion (received)
          let creditDelta = 0;
          if (p.method === 'Credit') {
            creditDelta = Number(p.amountPaid ?? p.amount ?? 0) || 0;
          } else if (Array.isArray(p.splitPayments) && p.splitPayments.length > 0) {
            creditDelta = p.splitPayments.filter((sp: any) => sp.method === 'Credit').reduce((s: number, sp: any) => s + (Number(sp.amount) || 0), 0);
          }
          // Total spent increment can reflect the full receipt amount
          const spentIncrement = Number(payload.amount) || 0;
          if (existing) {
            await firestoreService.updateCustomer(existing.id, {
              name: existing.name || customerName,
              phone: existing.phone || customerPhone,
              firstVisit: existing.firstVisit || existing.createdAt || now,
              lastVisit: now,
              visitCount: (existing.visitCount || existing.visits || 0) + visitIncrement,
              totalSpent: (existing.totalSpent || 0) + spentIncrement,
              creditAmount: (existing.creditAmount || 0) + creditDelta,
              restaurantId: payload.restaurantId,
            });
            // Append history entry
            await firestoreService.addCustomerHistory(existing.id, {
              type: 'Receipt',
              orderId: payload.orderId,
              receiptId: result.id,
              amount: Number(payload.amount) || 0,
              paymentMethod: payload.paymentMethod,
              splitPayments: payload.splitPayments,
              createdAt: payload.timestamp,
            });
          } else {
            await firestoreService.createCustomer({
              name: customerName || customerPhone || 'Guest',
              phone: customerPhone || null,
              createdAt: now,
              firstVisit: now,
              lastVisit: now,
              visitCount: visitIncrement,
              totalSpent: spentIncrement,
              creditAmount: creditDelta,
              isActive: true,
              restaurantId: payload.restaurantId,
            });
            // Find the created/updated customer again to get id by phone/name
            const updated = await firestoreService.getCustomers();
            const created = Object.values(updated).find((c: any) => {
              const cPhone = (c.phone || '').toString().trim();
              const cName = (c.name || '').toString().trim().toLowerCase();
              return (customerPhone && cPhone === customerPhone) || (!customerPhone && customerName && cName === customerName.toLowerCase());
            }) as any;
            if (created?.id) {
              await firestoreService.addCustomerHistory(created.id, {
                type: 'Receipt',
                orderId: payload.orderId,
                receiptId: result.id,
                amount: Number(payload.amount) || 0,
                paymentMethod: payload.paymentMethod,
                splitPayments: payload.splitPayments,
                createdAt: payload.timestamp,
              });
            }
          }
        }
      } catch (e) {
        console.warn('AutoReceiptService: customer upsert skipped/fail:', (e as Error).message);
      }

      return result;
    } catch (error) {
      console.error('❌ AutoReceiptService.saveReceiptForOrder - Error:', error);
      throw error;
    }
  }

  return { getReceipts, saveReceiptForOrder };
}