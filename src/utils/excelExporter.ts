import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface TransactionSummaryData {
  restaurantName?: string;
  address?: string;
  panVat?: string;
  dateRange: string;
  totalTransactions: number;
  totalAmount: number;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  transactions: Array<{
    id: string;
    orderId: string;
    customer: string;
    table: string;
    amount: number;
    paymentMethod: string;
    time: string;
    date: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    discount: number;
    itemDiscount?: number;
    orderDiscount?: number;
  }>;
  voidReceiptCount?: number;
}

export class ExcelExporter {
  static async exportTransactionSummary(data: TransactionSummaryData): Promise<{ success: boolean; message: string; fileUri?: string }> {
    try {
      // Generate CSV content (Excel-compatible format)
      const csvContent = this.generateCSVContent(data);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Transaction_Summary_${timestamp}.csv`;
      
      // Get the document directory
      const fileUri = FileSystem.documentDirectory + filename;
      
      // Write the CSV file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Transaction Summary as Excel',
        });
      }
      
      return {
        success: true,
        message: 'Transaction summary exported successfully',
        fileUri,
      };
    } catch (error: any) {
      console.error('Excel export error:', error);
      return {
        success: false,
        message: `Failed to export Excel file: ${error.message}`,
      };
    }
  }
  
  private static generateCSVContent(data: TransactionSummaryData): string {
    const lines: string[] = [];
    
    // Company header information
    if (data.restaurantName) {
      lines.push(data.restaurantName);
    }
    if (data.address) {
      lines.push(data.address);
    }
    if (data.panVat) {
      lines.push(`PAN: ${data.panVat}`);
    }
    lines.push('');
    
    // Summary header information
    lines.push('Day Summary');
    lines.push(`Print time: ${new Date().toLocaleString()}`);
    lines.push(`Date: ${data.dateRange}`);
    lines.push('');
    
    // Discount Summary at the top
    const totalDiscounts = data.transactions.reduce((sum, t) => {
      const totalDiscount = t.discount || 0; // This already includes itemDiscount + orderDiscount
      return sum + totalDiscount;
    }, 0);
    lines.push('--- DISCOUNT SUMMARY ---');
    lines.push(`Total Discounts: Rs ${totalDiscounts.toFixed(2)}`);
    lines.push('');
    
    lines.push('Day Summary');
    lines.push('');
    
    // Sales Summary section (matching print format)
    lines.push('--- Sales Summary ---');
    const grossSales = data.transactions.reduce((sum, t) => sum + (t.baseSubtotal || t.subtotal || 0), 0);
    const totalServiceCharge = 0; // No service charge provision in the app
    const totalTax = 0; // No tax provision in the app
    
    // Calculate net sales: Gross Sales - Discounts (simplified formula)
    const netSales = grossSales - totalDiscounts;
    
    lines.push(`Gross Sales,${grossSales.toFixed(1)}`);
    lines.push(`Tax,${totalTax.toFixed(1)}`);
    lines.push(`Discounts,${totalDiscounts.toFixed(1)}`);
    lines.push(`Complementary,0.0`);
    lines.push(`Net Sales,${netSales.toFixed(1)}`);
    lines.push('');
    
    // Sales by Type section (matching print format)
    lines.push('--- Sales ---');
    lines.push('Type,Count,Amount');
    data.paymentMethods.forEach(pm => {
      // Format split payments to show breakdown
      if (pm.method === 'Split') {
        lines.push(`Split,${pm.count},${pm.amount.toFixed(1)}`);
        
        // Add split breakdown if available
        if (pm.splitBreakdown && Array.isArray(pm.splitBreakdown)) {
          pm.splitBreakdown.forEach((split: any) => {
            lines.push(`  ${split.method}:,${split.count || 0},${split.amount.toFixed(1)}`);
          });
        } else {
          // Fallback: get breakdown from other payment methods
          data.paymentMethods.forEach(p => {
            if (p.method !== 'Split' && p.amount > 0) {
              lines.push(`  ${p.method.toUpperCase()}:,0,${p.amount.toFixed(1)}`);
            }
          });
        }
      } else {
        lines.push(`${pm.method.toUpperCase()},${pm.count},${pm.amount.toFixed(1)}`);
      }
    });
    // Add total row
    const totalCount = data.paymentMethods.reduce((sum, pm) => sum + pm.count, 0);
    const totalAmount = data.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
    lines.push(`TOTAL,${totalCount},${totalAmount.toFixed(1)}`);
    lines.push('');
    
    // Total Payments Received (Net) section - exclude split, only show individual methods
    lines.push('Total Payments Received (Net)');
    lines.push('Type,Amount');
    data.paymentMethods.forEach(pm => {
      // Skip split payments in total payments received section
      if (pm.method !== 'Split') {
        lines.push(`${pm.method.toUpperCase()},${pm.amount.toFixed(1)}`);
      }
    });
    lines.push('');
    
    // Audit section
    lines.push('--- Audit ---');
    lines.push('Pre Receipt Print Count,0');
    lines.push('Receipt Re-print Count,0');
    lines.push(`Void Receipt Count,${data.voidReceiptCount || 0}`);
    lines.push('Total Void Item Count,0');
    lines.push('');
    
    // First Receipt section
    if (data.transactions.length > 0) {
      const firstReceipt = data.transactions[data.transactions.length - 1]; // Last in array is first chronologically
      lines.push('--- First Receipt ---');
      lines.push(`Reference,${firstReceipt.id}`);
      lines.push(`Sequence,${firstReceipt.orderId.slice(-5)}`);
      lines.push(`Time,${firstReceipt.time}`);
      lines.push(`Net Amount,${firstReceipt.amount.toFixed(1)}`);
      lines.push('');
    }
    
    // Last Receipt section
    if (data.transactions.length > 0) {
      const lastReceipt = data.transactions[0]; // First in array is last chronologically
      lines.push('--- Last Receipt ---');
      lines.push(`Reference,${lastReceipt.id}`);
      lines.push(`Sequence,${lastReceipt.orderId.slice(-5)}`);
      lines.push(`Time,${lastReceipt.time}`);
      lines.push(`Net Amount,${lastReceipt.amount.toFixed(1)}`);
      lines.push('');
    }
    
    lines.push('-- End --');
    lines.push('');
    
    // Detailed transactions (optional - for reference)
    lines.push('DETAILED TRANSACTIONS');
    lines.push('Receipt ID,Order ID,Customer,Table,Amount,Payment Method,Date,Time,Subtotal,Tax,Service Charge,Total Discount,Item Discount,Order Discount,Items');
    
    data.transactions.forEach(transaction => {
      const itemsString = transaction.items
        .map(item => `${item.name} (${item.quantity}x Rs${item.price.toFixed(2)})`)
        .join('; ');
      
      lines.push([
        transaction.id,
        transaction.orderId,
        `"${transaction.customer}"`,
        transaction.table,
        transaction.amount.toFixed(2),
        transaction.paymentMethod,
        transaction.date,
        transaction.time,
        transaction.subtotal.toFixed(2),
        transaction.tax.toFixed(2),
        transaction.serviceCharge.toFixed(2),
        transaction.discount.toFixed(2),
        (transaction.itemDiscount || 0).toFixed(2),
        (transaction.orderDiscount || 0).toFixed(2),
        `"${itemsString}"`
      ].join(','));
    });
    
    return lines.join('\n');
  }
  
  static async exportReceiptsAsExcel(receipts: any[], dateRange: string, restaurantInfo?: { name?: string; address?: string; panVat?: string }, voidReceiptCount?: number): Promise<{ success: boolean; message: string; fileUri?: string }> {
    try {
      // Convert receipts to transaction summary format
      const totalAmount = receipts.reduce((sum, receipt) => {
        const amount = parseFloat(receipt.amount.replace('Rs ', '')) || 0;
        return sum + amount;
      }, 0);
      
      // Group by payment method, handling split payments
      const paymentMethodsMap = new Map<string, { count: number; amount: number }>();
      receipts.forEach(receipt => {
        const amount = parseFloat(receipt.amount.replace('Rs ', '')) || 0;
        const method = receipt.paymentMethod || 'Unknown';
        
        // Handle split payments by breaking them down into individual methods
        if (method === 'Split' && receipt.splitBreakdown && Array.isArray(receipt.splitBreakdown)) {
          // Add to split total
          if (paymentMethodsMap.has('Split')) {
            const existing = paymentMethodsMap.get('Split')!;
            existing.count += 1;
            existing.amount += amount;
          } else {
            paymentMethodsMap.set('Split', { count: 1, amount });
          }
          
          // Add to individual payment methods
          receipt.splitBreakdown.forEach((split: any) => {
            const splitMethod = split.method || 'Unknown';
            const splitAmount = Number(split.amount) || 0;
            
            if (paymentMethodsMap.has(splitMethod)) {
              const existing = paymentMethodsMap.get(splitMethod)!;
              existing.count += 1;
              existing.amount += splitAmount;
            } else {
              paymentMethodsMap.set(splitMethod, { count: 1, amount: splitAmount });
            }
          });
        } else {
          // Regular payment method
          if (paymentMethodsMap.has(method)) {
            const existing = paymentMethodsMap.get(method)!;
            existing.count += 1;
            existing.amount += amount;
          } else {
            paymentMethodsMap.set(method, { count: 1, amount });
          }
        }
      });
      
      const paymentMethods = Array.from(paymentMethodsMap.entries()).map(([method, data]) => {
        const result: any = {
          method,
          count: data.count,
          amount: data.amount,
        };
        
        // Add split breakdown for split payments
        if (method === 'Split') {
          result.isSplit = true;
          result.splitBreakdown = [
            ...(paymentMethodsMap.get('Cash')?.amount > 0 ? [{ method: 'Cash', amount: paymentMethodsMap.get('Cash')?.amount || 0, count: 0 }] : []),
            ...(paymentMethodsMap.get('Card')?.amount > 0 ? [{ method: 'Card', amount: paymentMethodsMap.get('Card')?.amount || 0, count: 0 }] : []),
            ...(paymentMethodsMap.get('Bank')?.amount > 0 ? [{ method: 'Bank', amount: paymentMethodsMap.get('Bank')?.amount || 0, count: 0 }] : []),
            ...(paymentMethodsMap.get('Fonepay')?.amount > 0 ? [{ method: 'Fonepay', amount: paymentMethodsMap.get('Fonepay')?.amount || 0, count: 0 }] : []),
            ...(paymentMethodsMap.get('Credit')?.amount > 0 ? [{ method: 'Credit', amount: paymentMethodsMap.get('Credit')?.amount || 0, count: 0 }] : []),
          ];
        }
        
        return result;
      });
      
      // Convert receipts to transaction format
      const transactions = receipts.map(receipt => ({
        id: receipt.id,
        orderId: receipt.orderId,
        customer: receipt.customer,
        table: receipt.table,
        amount: parseFloat(receipt.amount.replace('Rs ', '')) || 0,
        paymentMethod: receipt.paymentMethod || 'Unknown',
        time: receipt.time,
        date: receipt.date,
        items: receipt.orderItems || [],
        baseSubtotal: receipt.baseSubtotal || receipt.subtotal || 0, // Base subtotal before discounts
        subtotal: receipt.subtotal || 0, // Discounted subtotal
        tax: receipt.tax || 0,
        serviceCharge: receipt.serviceCharge || 0,
        discount: receipt.discount || 0,
        itemDiscount: receipt.itemDiscount || 0,
        orderDiscount: receipt.orderDiscount || 0,
      }));
      
      const summaryData: TransactionSummaryData = {
        restaurantName: restaurantInfo?.name,
        address: restaurantInfo?.address,
        panVat: restaurantInfo?.panVat,
        dateRange,
        totalTransactions: receipts.length,
        totalAmount,
        paymentMethods,
        transactions,
        voidReceiptCount: voidReceiptCount || 0,
      };
      
      return await this.exportTransactionSummary(summaryData);
    } catch (error: any) {
      console.error('Excel export error:', error);
      return {
        success: false,
        message: `Failed to export receipts as Excel: ${error.message}`,
      };
    }
  }
}
