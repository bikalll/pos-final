import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface PrintOptions {
  type: 'receipt' | 'ticket' | 'report' | 'invoice';
  title: string;
  content: any;
  printerName?: string;
  copies?: number;
}

export interface ReceiptData {
  receiptId: string;
  date: string;
  time: string;
  tableNumber: string;
  customerName: string;
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
  total: number;
  paymentMethod: string;
  cashier: string;
}

export interface TicketData {
  ticketId: string;
  date: string;
  time: string;
  tableNumber: string;
  orderType: 'KOT' | 'BOT' | 'COMBINED';
  estimatedTime: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    orderType: 'KOT' | 'BOT';
    specialInstructions?: string;
  }>;
  specialInstructions?: string;
}

export interface KOTData {
  ticketId: string;
  date: string;
  time: string;
  table: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    orderType: 'KOT';
    specialInstructions?: string;
  }>;
  estimatedTime: string;
  specialInstructions?: string;
}

export interface BOTData {
  ticketId: string;
  date: string;
  time: string;
  table: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    orderType: 'BOT';
    specialInstructions?: string;
  }>;
  estimatedTime: string;
  specialInstructions?: string;
}

export interface ReportData {
  title: string;
  date: string;
  data: any;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
  };
}

// Generate HTML for receipts
export function generateReceiptHTML(receipt: ReceiptData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${receipt.receiptId}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
          margin: 0;
          padding: 10px;
          background: white;
        }
        .header {
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .logo {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .receipt-info {
          margin-bottom: 15px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .items-table th,
        .items-table td {
          text-align: left;
          padding: 3px 0;
          border-bottom: 1px dotted #ccc;
        }
        .items-table th {
          border-bottom: 1px solid #000;
        }
        .totals {
          border-top: 1px solid #000;
          padding-top: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">ARBI POS</div>
        <div>Restaurant Management System</div>
        <div>${receipt.date} - ${receipt.time}</div>
      </div>
      
      <div class="receipt-info">
        <div><strong>Receipt:</strong> ${receipt.receiptId}</div>
        <div><strong>Table:</strong> ${receipt.tableNumber}</div>
        <div><strong>Customer:</strong> ${receipt.customerName}</div>
        <div><strong>Cashier:</strong> ${receipt.cashier}</div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>Rs ${item.price.toFixed(2)}</td>
              <td>Rs ${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span>Sub Total:</span>
          <span>Rs ${receipt.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Discount:</span>
          <span>Rs ${receipt.discount.toFixed(2)}</span>
        </div>
        <div class="total-row" style="font-weight: bold; font-size: 14px;">
          <span>Grand Total:</span>
          <span>Rs ${receipt.total.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Payment Method:</span>
          <span>${receipt.paymentMethod}</span>
        </div>
      </div>
      
      <div class="footer">
        Thank you for dining with us!<br>
        Please visit again
      </div>
    </body>
    </html>
  `;
}

// Generate HTML for kitchen tickets
export function generateTicketHTML(ticket: TicketData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Kitchen Ticket - ${ticket.ticketId}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.3;
          margin: 0;
          padding: 15px;
          background: white;
        }
        .header {
          text-align: center;
          border: 2px solid #000;
          padding: 10px;
          margin-bottom: 20px;
          background: #f0f0f0;
        }
        .ticket-id {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .order-info {
          margin-bottom: 20px;
        }
        .items-list {
          margin-bottom: 20px;
        }
        .item {
          padding: 8px 0;
          border-bottom: 1px solid #ccc;
        }
        .item-name {
          font-weight: bold;
          margin-bottom: 3px;
        }
        .item-quantity {
          color: #666;
        }
        .special-instructions {
          font-style: italic;
          color: #e74c3c;
          margin-top: 3px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          padding: 10px;
          border: 1px solid #000;
          background: #f0f0f0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="ticket-id">KITCHEN TICKET</div>
        <div>${ticket.date} - ${ticket.time}</div>
        <div>Table ${ticket.tableNumber} | ${ticket.orderType.toUpperCase()}</div>
      </div>
      
      <div class="order-info">
        <div><strong>Ticket ID:</strong> ${ticket.ticketId}</div>
        <div><strong>Estimated Time:</strong> ${ticket.estimatedTime}</div>
      </div>
      
      <div class="items-list">
        <h3>ORDER ITEMS:</h3>
        ${ticket.items.map(item => `
          <div class="item">
            <div class="item-name">${item.quantity}x ${item.name}</div>
            ${item.specialInstructions ? `<div class="special-instructions">${item.specialInstructions}</div>` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="footer">
        <strong>PLEASE PREPARE WITH CARE</strong><br>
        ${new Date().toLocaleTimeString()}
      </div>
    </body>
    </html>
  `;
}

// Generate HTML for reports
export function generateReportHTML(report: ReportData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${report.title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .date {
          font-size: 16px;
          color: #666;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        .summary-label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        .data-section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .data-table th,
        .data-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .data-table th {
          background: #f8f9fa;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${report.title}</div>
        <div class="date">${report.date}</div>
        <div>Generated by Arbi POS System</div>
      </div>
      
      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${report.summary.totalOrders}</div>
          <div class="summary-label">Total Orders</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">Rs ${report.summary.totalRevenue.toFixed(2)}</div>
          <div class="summary-label">Total Revenue</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${report.summary.totalItems}</div>
          <div class="summary-label">Items Sold</div>
        </div>
      </div>
      
      <div class="data-section">
        <div class="section-title">Detailed Data</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(report.data).map(([key, value]: [string, any]) => `
              <tr>
                <td>${key}</td>
                <td>${value.quantity || 0}</td>
                <td>Rs ${(value.revenue || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        Report generated on ${new Date().toLocaleString()}<br>
        Arbi POS - Restaurant Management System
      </div>
    </body>
    </html>
  `;
}

// Main print function
export async function printDocument(options: PrintOptions): Promise<string> {
  let html = '';
  
  switch (options.type) {
    case 'receipt':
      html = generateReceiptHTML(options.content);
      break;
    case 'ticket':
      html = generateTicketHTML(options.content);
      break;
    case 'report':
      html = generateReportHTML(options.content);
      break;
    case 'invoice':
      html = generateReceiptHTML(options.content); // Use receipt format for invoices
      break;
    default:
      throw new Error(`Unsupported print type: ${options.type}`);
  }

  try {
    // Print to file
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false
    });

    // If sharing is available, share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Print ${options.title}`,
      });
    }

    return uri;
  } catch (error) {
    console.error('Print error:', error);
    throw new Error(`Failed to print ${options.type}: ${error}`);
  }
}

// Quick print functions for common use cases
export async function printReceipt(receiptData: ReceiptData): Promise<string> {
  return printDocument({
    type: 'receipt',
    title: 'Receipt',
    content: receiptData,
  });
}

export async function printKitchenTicket(ticketData: KOTData): Promise<string> {
  return printDocument({
    type: 'ticket',
    title: 'Kitchen Ticket (KOT)',
    content: {
      ...ticketData,
      orderType: 'KOT',
      tableNumber: ticketData.table,
    },
  });
}

export async function printBarTicket(ticketData: BOTData): Promise<string> {
  return printDocument({
    type: 'ticket',
    title: 'Bar Ticket (BOT)',
    content: {
      ...ticketData,
      orderType: 'BOT',
      tableNumber: ticketData.table,
    },
  });
}

export async function printCombinedTickets(kotData: KOTData, botData: BOTData): Promise<string[]> {
  const results: string[] = [];
  
  if (kotData.items.length > 0) {
    results.push(await printKitchenTicket(kotData));
  }
  
  if (botData.items.length > 0) {
    results.push(await printBarTicket(botData));
  }
  
  return results;
}

export async function printReport(reportData: ReportData): Promise<string> {
  return printDocument({
    type: 'report',
    title: 'Report',
    content: reportData,
  });
}

// Legacy function for backward compatibility
export async function printHtmlAsync(html: string) {
  // On real devices, integrate with Bluetooth/USB printers via native modules.
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
  return uri;
}

// Comprehensive printing utility for the entire app
export class PrintService {
  static async checkPrinterConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
    try {
      // Check if Bluetooth printing is supported
      const { blePrinter } = await import('./blePrinter');
      const { bluetoothManager } = await import('./bluetoothManager');
      
      if (!blePrinter.isSupported()) {
        return {
          connected: false,
          message: 'Bluetooth printing not supported on this device',
          details: blePrinter.getModuleStatus()
        };
      }

      // Check if Bluetooth is enabled
      const isEnabled = await blePrinter.isEnabled();
      if (!isEnabled) {
        return {
          connected: false,
          message: 'Bluetooth is not enabled. Please enable Bluetooth to print.',
          details: { bluetoothEnabled: false }
        };
      }

      // Check connection status
      const connectionHealth = bluetoothManager.getConnectionHealth();
      if (!connectionHealth.healthy) {
        return {
          connected: false,
          message: `Printer connection issues: ${connectionHealth.issues.join(', ')}`,
          details: connectionHealth
        };
      }

      return {
        connected: true,
        message: 'Printer connection available',
        details: { 
          bluetoothEnabled: true,
          deviceConnected: bluetoothManager.getStatus().connected,
          currentDevice: bluetoothManager.getStatus().currentDevice
        }
      };
    } catch (error) {
      console.error('Printer connection check failed:', error);
      return {
        connected: false,
        message: `Unable to check printer connection: ${error}`,
        details: { error: String(error) }
      };
    }
  }

  static async printKOTFromOrder(order: any, table: any): Promise<{ success: boolean; message: string; fallback?: string }> {
    try {
      const { blePrinter } = await import('./blePrinter');
      const { bluetoothManager } = await import('./bluetoothManager');
      
      // Check printer connection
      const connectionStatus = await this.checkPrinterConnection();
      if (!connectionStatus.connected) {
        // Provide fallback option
        const fallbackMessage = 'Would you like to save the ticket as a file instead?';
        return {
          success: false,
          message: connectionStatus.message,
          fallback: fallbackMessage
        };
      }

      // Test connection before printing
      const connectionTest = await bluetoothManager.testConnection();
      if (!connectionTest) {
        return {
          success: false,
          message: 'Printer connection test failed. Please check your printer connection.',
          fallback: 'Would you like to save the ticket as a file instead?'
        };
      }

      // Print via Bluetooth
      await blePrinter.printKOT({
        restaurantName: 'ARBI POS',
        ticketId: `KOT-${Date.now()}`,
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString(),
        table: table?.name || order.tableId,
        items: order.items
          .filter((item: any) => item.orderType === 'KOT')
          .map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            orderType: item.orderType
          })),
        estimatedTime: '20-30 minutes',
        specialInstructions: order.specialInstructions
      });

      return {
        success: true,
        message: 'Kitchen ticket (KOT) sent to printer successfully'
      };
    } catch (error: any) {
      console.error('KOT print failed:', error);
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message.includes('connection')) {
        errorMessage = 'Printer connection lost. Please reconnect your printer.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Bluetooth permissions required. Please grant permissions in settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Printer connection timeout. Check if printer is turned on and in range.';
      }

      return {
        success: false,
        message: `Failed to print KOT: ${errorMessage}`,
        fallback: 'Would you like to save the ticket as a file instead?'
      };
    }
  }

  static async printBOTFromOrder(order: any, table: any): Promise<{ success: boolean; message: string; fallback?: string }> {
    try {
      const { blePrinter } = await import('./blePrinter');
      const { bluetoothManager } = await import('./bluetoothManager');
      
      // Check printer connection
      const connectionStatus = await this.checkPrinterConnection();
      if (!connectionStatus.connected) {
        // Provide fallback option
        const fallbackMessage = 'Would you like to save the ticket as a file instead?';
        return {
          success: false,
          message: connectionStatus.message,
          fallback: fallbackMessage
        };
      }

      // Test connection before printing
      const connectionTest = await bluetoothManager.testConnection();
      if (!connectionTest) {
        return {
          success: false,
          message: 'Printer connection test failed. Please check your printer connection.',
          fallback: 'Would you like to save the ticket as a file instead?'
        };
      }

      // Print via Bluetooth
      await blePrinter.printBOT({
        restaurantName: 'ARBI POS',
        ticketId: `BOT-${Date.now()}`,
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString(),
        table: table?.name || order.tableId,
        items: order.items
          .filter((item: any) => item.orderType === 'BOT')
          .map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            orderType: item.orderType
          })),
        estimatedTime: '5-10 minutes',
        specialInstructions: order.specialInstructions
      });

      return {
        success: true,
        message: 'Bar ticket (BOT) sent to printer successfully'
      };
    } catch (error: any) {
      console.error('BOT print failed:', error);
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message.includes('connection')) {
        errorMessage = 'Printer connection lost. Please reconnect your printer.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Bluetooth permissions required. Please grant permissions in settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Printer connection timeout. Check if printer is turned on and in range.';
      }

      return {
        success: false,
        message: `Failed to print BOT: ${errorMessage}`,
        fallback: 'Would you like to save the ticket as a file instead?'
      };
    }
  }

  static async printReceiptFromOrder(order: any, table: any): Promise<{ success: boolean; message: string; fallback?: string }> {
    try {
      const { blePrinter } = await import('./blePrinter');
      const { bluetoothManager } = await import('./bluetoothManager');
      const { createFirestoreService } = await import('./firestoreService');
      const { store } = await import('../redux/storeFirebase');
      
      // Check printer connection
      const connectionStatus = await this.checkPrinterConnection();
      if (!connectionStatus.connected) {
        // Provide fallback option
        const fallbackMessage = 'Would you like to save the receipt as a file instead?';
        return {
          success: false,
          message: connectionStatus.message,
          fallback: fallbackMessage
        };
      }

      // Test connection before printing
      const connectionTest = await bluetoothManager.testConnection();
      if (!connectionTest) {
        return {
          success: false,
          message: 'Printer connection test failed. Please check your printer connection.',
          fallback: 'Would you like to save the receipt as a file instead?'
        };
      }

      // Load restaurant info for header
      let restaurantName = 'ARBI POS';
      let address: string | undefined;
      let panVat: string | undefined;
      let stewardName: string | undefined;
      try {
        const state: any = store.getState?.() || {};
        const restaurantId = state?.auth?.restaurantId || order.restaurantId;
        stewardName = state?.auth?.userName || undefined;
        if (restaurantId) {
          const fs = createFirestoreService(restaurantId);
          const info = await fs.getRestaurantInfo();
          if (info) {
            restaurantName = info.name || restaurantName;
            address = info.address || undefined;
            panVat = info.panVat || info.pan || info.vat || undefined;
          }
        }
      } catch {}

      // Calculate totals
      const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * (order.taxPercentage / 100);
      const serviceCharge = subtotal * (order.serviceChargePercentage / 100);
      const discount = subtotal * (order.discountPercentage / 100);
      const total = subtotal + tax + serviceCharge - discount;

      // Print via Bluetooth
      const splitPayments = Array.isArray(order.payment?.splitPayments) ? order.payment.splitPayments.map((sp: any) => ({ method: sp.method, amount: Number(sp.amount) || 0 })) : undefined;
      await blePrinter.printReceipt({
        restaurantName,
        receiptId: `R${Date.now()}`,
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString(),
        table: table?.name || order.tableId,
        steward: stewardName,
        processedBy: order.processedBy,
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        taxLabel: `Tax (${order.taxPercentage}%)`,
        serviceLabel: `Service (${order.serviceChargePercentage}%)`,
        subtotal,
        tax,
        service: serviceCharge,
        discount: order.discountPercentage > 0 ? discount : 0,
        total,
        payment: order.payment ? {
          method: order.payment.method,
          amountPaid: order.payment.amountPaid,
          change: order.payment.amountPaid - total,
        } : null,
        splitPayments,
        address,
        panVat,
      });

      return {
        success: true,
        message: 'Receipt sent to printer successfully'
      };
    } catch (error: any) {
      console.error('Receipt print failed:', error);
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message.includes('connection')) {
        errorMessage = 'Printer connection lost. Please reconnect your printer.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Bluetooth permissions required. Please grant permissions in settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Printer connection timeout. Check if printer is turned on and in range.';
      }

      return {
        success: false,
        message: `Failed to print receipt: ${errorMessage}`,
        fallback: 'Would you like to save the receipt as a file instead?'
      };
    }
  }

  static async printPreReceiptFromOrder(order: any, table: any): Promise<{ success: boolean; message: string; fallback?: string }> {
    try {
      const { blePrinter } = await import('./blePrinter');
      const { bluetoothManager } = await import('./bluetoothManager');
      
      const connectionStatus = await this.checkPrinterConnection();
      if (!connectionStatus.connected) {
        return {
          success: false,
          message: connectionStatus.message,
          fallback: 'Would you like to save or share a pre-receipt file instead?'
        };
      }

      const connectionTest = await bluetoothManager.testConnection();
      if (!connectionTest) {
        return {
          success: false,
          message: 'Printer connection test failed. Please check your printer connection.',
          fallback: 'Would you like to save or share a pre-receipt file instead?'
        };
      }

      // Calculate totals
      const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * (order.taxPercentage / 100);
      const serviceCharge = subtotal * (order.serviceChargePercentage / 100);
      const discount = subtotal * (order.discountPercentage / 100);
      const total = subtotal + tax + serviceCharge - discount;

      await blePrinter.printReceipt({
        restaurantName: 'ARBI POS',
        receiptId: `PR${Date.now()}`,
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString(),
        table: table?.name || order.tableId,
        steward: (store as any)?.getState?.()?.auth?.userName,
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        taxLabel: `Tax (0%)`,
        serviceLabel: `Service (0%)`,
        subtotal,
        tax: 0,
        service: 0,
        discount,
        total,
        payment: null,
        isPreReceipt: true,
      });

      return {
        success: true,
        message: 'Pre-receipt sent to printer successfully'
      };
    } catch (error: any) {
      console.error('Pre-receipt print failed:', error);
      let errorMessage = error.message;
      if (error.message.includes('connection')) {
        errorMessage = 'Printer connection lost. Please reconnect your printer.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Bluetooth permissions required. Please grant permissions in settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Printer connection timeout. Check if printer is turned on and in range.';
      }

      return {
        success: false,
        message: `Failed to print pre-receipt: ${errorMessage}`,
        fallback: 'Would you like to save or share a pre-receipt file instead?'
      };
    }
  }

  static async printCombinedTicketsFromOrder(order: any, table: any): Promise<{ success: boolean; message: string; fallback?: string }> {
    try {
      console.log('🖨️ PrintService: Processing order for combined tickets:', {
        orderId: order.id,
        totalItems: order.items.length,
        items: order.items.map((item: any) => ({ 
          name: item.name, 
          orderType: item.orderType, 
          quantity: item.quantity 
        }))
      });

      const { blePrinter } = await import('./blePrinter');
      const { bluetoothManager } = await import('./bluetoothManager');
      
      // Check printer connection
      const connectionStatus = await this.checkPrinterConnection();
      if (!connectionStatus.connected) {
        // Provide fallback option
        const fallbackMessage = 'Would you like to save the tickets as files instead?';
        return {
          success: false,
          message: connectionStatus.message,
          fallback: fallbackMessage
        };
      }

      // Test connection before printing
      const connectionTest = await bluetoothManager.testConnection();
      if (!connectionTest) {
        return {
          success: false,
          message: 'Printer connection test failed. Please check your printer connection.',
          fallback: 'Would you like to save the tickets as files instead?'
        };
      }

      // Print via Bluetooth
      await blePrinter.printCombinedTickets({
        restaurantName: 'ARBI POS',
        ticketId: `TKT-${Date.now()}`,
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString(),
        table: table?.name || order.tableId,
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          orderType: item.orderType
        })),
        estimatedTime: '20-30 minutes',
        specialInstructions: order.specialInstructions
      });

      // After successful print: if KOT items were printed, mark table occupied in Firestore
      try {
        const hasKitchenItems = (order.items || []).some((i: any) => (i.orderType || 'KOT') === 'KOT');
        const tableId = order.tableId;
        const restaurantId = order.restaurantId || table?.restaurantId;
        if (hasKitchenItems && tableId && restaurantId) {
          const { createFirestoreService } = await import('./firestoreService');
          const svc = createFirestoreService(restaurantId);
          await svc.updateTable(tableId, { isOccupied: true });
        }
      } catch (e) {
        console.warn('printCombinedTicketsFromOrder: failed to set isOccupied after KOT print:', (e as Error).message);
      }

      return {
        success: true,
        message: 'Combined tickets sent to printer successfully'
      };
    } catch (error: any) {
      console.error('Combined tickets print failed:', error);
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message.includes('connection')) {
        errorMessage = 'Printer connection lost. Please reconnect your printer.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Bluetooth permissions required. Please grant permissions in settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Printer connection timeout. Check if printer is turned on and in range.';
      }

      return {
        success: false,
        message: `Failed to print tickets: ${errorMessage}`,
        fallback: 'Would you like to save the tickets as files instead?'
      };
    }
  }

  // Fallback method to save tickets as files
  static async saveTicketAsFile(ticketData: any, type: 'KOT' | 'BOT' | 'COMBINED'): Promise<{ success: boolean; message: string; fileUri?: string }> {
    try {
      // Build plain-text content matching thermal print format
      const content = this.buildTicketPlainText(ticketData, type);
      const html = this.wrapPlainTextHtml(content, type === 'COMBINED' ? 'Combined Tickets' : `${type} Ticket`);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      return { success: true, message: `${type} ticket saved as file successfully`, fileUri: uri };
    } catch (error: any) {
      console.error('Save ticket as file failed:', error);
      return { success: false, message: `Failed to save ticket as file: ${error.message}` };
    }
  }

  static async saveReceiptAsFile(receipt: ReceiptData): Promise<{ success: boolean; message: string; fileUri?: string }> {
    try {
      // Build plain-text receipt resembling thermal print
      const content = this.buildReceiptPlainText(receipt);
      const html = this.wrapPlainTextHtml(content, 'Receipt');
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      return { success: true, message: 'Receipt saved as file successfully', fileUri: uri };
    } catch (error: any) {
      console.error('Save receipt as file failed:', error);
      return { success: false, message: `Failed to save receipt as file: ${error.message}` };
    }
  }

  // Generate HTML for KOT ticket
  private static generateKOTHTML(data: any): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
            .divider { border-top: 1px solid #000; margin: 10px 0; }
            .item { margin: 5px 0; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">KITCHEN ORDER TICKET</div>
          <div class="header">ARBI POS</div>
          <div class="divider"></div>
          <div>Ticket #${data.ticketId}</div>
          <div>Date: ${data.date} Time: ${data.time}</div>
          <div>Table: ${data.table}</div>
          <div>Est. Time: ${data.estimatedTime}</div>
          ${data.specialInstructions ? `<div>Special: ${data.specialInstructions}</div>` : ''}
          <div class="divider"></div>
          <div class="header">KITCHEN ITEMS:</div>
          ${data.items.filter((item: any) => item.orderType === 'KOT').map((item: any) => `
            <div class="item">${item.name} - ${item.quantity} x Rs. ${item.price.toFixed(2)}</div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">PLEASE PREPARE WITH CARE</div>
          <div>${new Date().toLocaleTimeString()}</div>
        </body>
      </html>
    `;
  }

  // Generate HTML for BOT ticket
  private static generateBOTHTML(data: any): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
            .divider { border-top: 1px solid #000; margin: 10px 0; }
            .item { margin: 5px 0; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">BAR ORDER TICKET</div>
          <div class="header">ARBI POS</div>
          <div class="divider"></div>
          <div>Ticket #${data.ticketId}</div>
          <div>Date: ${data.date} Time: ${data.time}</div>
          <div>Table: ${data.table}</div>
          <div>Est. Time: ${data.estimatedTime}</div>
          ${data.specialInstructions ? `<div>Special: ${data.specialInstructions}</div>` : ''}
          <div class="divider"></div>
          <div class="header">BAR ITEMS:</div>
          ${data.items.filter((item: any) => item.orderType === 'BOT').map((item: any) => `
            <div class="item">${item.name} - ${item.quantity} x Rs. ${item.price.toFixed(2)}</div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">PLEASE PREPARE WITH CARE</div>
          <div>${new Date().toLocaleTimeString()}</div>
        </body>
      </html>
    `;
  }

  // Generate HTML for combined tickets
  private static generateCombinedTicketsHTML(data: any): string {
    const hasKitchenItems = data.items.some((item: any) => item.orderType === 'KOT');
    const hasBarItems = data.items.some((item: any) => item.orderType === 'BOT');
    
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
            .divider { border-top: 1px solid #000; margin: 10px 0; }
            .item { margin: 5px 0; }
            .total { font-weight: bold; margin-top: 20px; }
            .section { margin-bottom: 30px; }
          </style>
        </head>
        <body>
    `;

    if (hasKitchenItems) {
      html += `
        <div class="section">
          <div class="header">KITCHEN ORDER TICKET</div>
          <div class="header">ARBI POS</div>
          <div class="divider"></div>
          <div>Ticket #${data.ticketId}</div>
          <div>Date: ${data.date} Time: ${data.time}</div>
          <div>Table: ${data.table}</div>
          <div>Est. Time: ${data.estimatedTime}</div>
          ${data.specialInstructions ? `<div>Special: ${data.specialInstructions}</div>` : ''}
          <div class="divider"></div>
          <div class="header">KITCHEN ITEMS:</div>
          ${data.items.filter((item: any) => item.orderType === 'KOT').map((item: any) => `
            <div class="item">${item.name} - ${item.quantity} x Rs. ${item.price.toFixed(2)}</div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">PLEASE PREPARE WITH CARE</div>
          <div>${new Date().toLocaleTimeString()}</div>
        </div>
      `;
    }

    if (hasBarItems) {
      html += `
        <div class="section">
          <div class="header">BAR ORDER TICKET</div>
          <div class="header">ARBI POS</div>
          <div class="divider"></div>
          <div>Ticket #${data.ticketId}</div>
          <div>Date: ${data.date} Time: ${data.time}</div>
          <div>Table: ${data.table}</div>
          <div>Est. Time: ${data.estimatedTime}</div>
          ${data.specialInstructions ? `<div>Special: ${data.specialInstructions}</div>` : ''}
          <div class="divider"></div>
          <div class="header">BAR ITEMS:</div>
          ${data.items.filter((item: any) => item.orderType === 'BOT').map((item: any) => `
            <div class="item">${item.name} - ${item.quantity} x Rs. ${item.price.toFixed(2)}</div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">PLEASE PREPARE WITH CARE</div>
          <div>${new Date().toLocaleTimeString()}</div>
        </div>
      `;
    }

    html += `
        </body>
      </html>
    `;

    return html;
  }

  // Helpers to unify formatting between physical print and saved PDF (use plain-text layout)
  private static wrapPlainTextHtml(content: string, title: string): string {
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: monospace; font-size: 12px; line-height: 1.4; white-space: pre-wrap; margin: 16px; }
            .title { text-align: center; font-weight: bold; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="title">${title}</div>
          ${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </body>
      </html>
    `;
  }

  private static padEnd(value: any, length: number): string { return String(value ?? '').padEnd(length); }
  private static padStart(value: any, length: number): string { return String(value ?? '').padStart(length); }

  private static buildTicketPlainText(data: any, type: 'KOT' | 'BOT' | 'COMBINED'): string {
    const buildSection = (label: 'KOT' | 'BOT') => {
      const items = (data.items || []).filter((i: any) => i.orderType === label);
      if (items.length === 0) return '';
      let text = '';
      text += `${label}\n`;
      text += `${data.ticketId}\n`;
      text += `${data.date} ${data.time}\n`;
      text += `Table ${data.table}\n`;
      if (data.processedBy?.role && data.processedBy?.username) {
        text += `${data.processedBy.role}:${data.processedBy.username}\n`;
      } else {
        text += 'Processed By: Staff\n';
      }
      text += '------------------------------\n';
      text += 'Item                    Qty\n';
      text += '------------------------------\n';
      for (const item of items) {
        const name = this.padEnd(item.name, 20);
        const qty = this.padStart(item.quantity, 3);
        text += `${name}${qty}\n`;
      }
      text += '------------------------------\n';
      return text;
    };

    if (type === 'KOT') return buildSection('KOT');
    if (type === 'BOT') return buildSection('BOT');
    // COMBINED
    return [buildSection('KOT'), buildSection('BOT')].filter(Boolean).join('\n');
  }

  private static buildReceiptPlainText(receipt: ReceiptData): string {
    const lines: string[] = [];
    lines.push('HOUSE OF HOSPITALITY');
    lines.push('House of hospitality Pvt. Ltd');
    lines.push('Budhanilkantha, Kathmandu');
    lines.push('PAN: 609661879');
    lines.push(`${receipt.date} ${receipt.time}`);
    lines.push(`Table ${receipt.tableNumber}`);
    lines.push('Cashier: ' + (receipt.cashier || 'POS'));
    if ((receipt as any).processedBy?.role && (receipt as any).processedBy?.username) {
      lines.push(`${(receipt as any).processedBy.role}:${(receipt as any).processedBy.username}`);
    } else if ((receipt as any).steward) {
      lines.push('Steward: ' + (receipt as any).steward);
    }
    lines.push('------------------------------');
    lines.push('Item                         Total');
    lines.push('------------------------------');
    for (const it of receipt.items || []) {
      const nameQty = this.padEnd(`${it.name} x${it.quantity}`, 22);
      const total = (it.total).toFixed(1).padStart(8);
      lines.push(`${nameQty}${total}`);
    }
    lines.push('------------------------------');
    lines.push(`Sub Total: ${receipt.subtotal.toFixed(1)}`);
    lines.push(`Discount: ${receipt.discount.toFixed(1)}`);
    lines.push(`Grand Total: ${receipt.total.toFixed(1)}`);
    lines.push(`Payment Method: ${receipt.paymentMethod}`);
    return lines.join('\n');
  }
}
