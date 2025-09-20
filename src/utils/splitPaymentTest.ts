// Test utility for split payment receipt functionality
import { generateReceiptHTML } from '../services/printing';

export interface TestSplitPayment {
  method: string;
  amount: number;
}

export interface TestReceiptData {
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
    discountPercentage?: number;
    discountAmount?: number;
  }>;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  itemDiscount?: number;
  orderDiscount?: number;
  total: number;
  paymentMethod: string;
  cashier: string;
  splitPayments?: TestSplitPayment[];
}

export function createTestSplitPaymentReceipt(): TestReceiptData {
  return {
    receiptId: 'R123456',
    date: '12/25/2024',
    time: '2:30:45 PM',
    tableNumber: 'Table 5',
    customerName: 'John Doe',
    items: [
      {
        name: 'Chicken Biryani',
        quantity: 2,
        price: 250.00,
        total: 500.00
      },
      {
        name: 'Mutton Curry',
        quantity: 1,
        price: 300.00,
        total: 300.00
      }
    ],
    subtotal: 800.00,
    tax: 80.00,
    serviceCharge: 40.00,
    discount: 0,
    total: 920.00,
    paymentMethod: 'Split',
    cashier: 'POS System',
    splitPayments: [
      {
        method: 'Cash',
        amount: 500.00
      },
      {
        method: 'Card',
        amount: 300.00
      },
      {
        method: 'UPI',
        amount: 120.00
      }
    ]
  };
}

export function testSplitPaymentReceiptGeneration(): boolean {
  try {
    const testReceipt = createTestSplitPaymentReceipt();
    const html = generateReceiptHTML(testReceipt);
    
    // Check if HTML contains split payment breakdown
    const hasPaymentBreakdown = html.includes('Payment Breakdown:');
    const hasCashPayment = html.includes('Cash:');
    const hasCardPayment = html.includes('Card:');
    const hasUPIPayment = html.includes('UPI:');
    const hasTotalPaid = html.includes('Total Paid:');
    
    // Verify amounts are correct
    const cashAmount = html.includes('Rs 500.00');
    const cardAmount = html.includes('Rs 300.00');
    const upiAmount = html.includes('Rs 120.00');
    const totalPaidAmount = html.includes('Rs 920.00');
    
    const allChecksPass = hasPaymentBreakdown && hasCashPayment && hasCardPayment && 
                         hasUPIPayment && hasTotalPaid && cashAmount && cardAmount && 
                         upiAmount && totalPaidAmount;
    
    console.log('🧪 Split Payment Receipt Test Results:', {
      hasPaymentBreakdown,
      hasCashPayment,
      hasCardPayment,
      hasUPIPayment,
      hasTotalPaid,
      cashAmount,
      cardAmount,
      upiAmount,
      totalPaidAmount,
      allChecksPass
    });
    
    return allChecksPass;
  } catch (error) {
    console.error('❌ Split Payment Receipt Test Failed:', error);
    return false;
  }
}

export function testSinglePaymentReceiptGeneration(): boolean {
  try {
    const testReceipt: TestReceiptData = {
      receiptId: 'R123457',
      date: '12/25/2024',
      time: '3:15:30 PM',
      tableNumber: 'Table 3',
      customerName: 'Jane Smith',
      items: [
        {
          name: 'Fish Curry',
          quantity: 1,
          price: 200.00,
          total: 200.00
        }
      ],
      subtotal: 200.00,
      tax: 20.00,
      serviceCharge: 10.00,
      discount: 0,
      total: 230.00,
      paymentMethod: 'Cash',
      cashier: 'POS System'
      // No splitPayments - should show single payment method
    };
    
    const html = generateReceiptHTML(testReceipt);
    
    // Check if HTML shows single payment method (not split breakdown)
    const hasSinglePaymentMethod = html.includes('Payment Method:');
    const hasCashMethod = html.includes('Cash');
    const noPaymentBreakdown = !html.includes('Payment Breakdown:');
    
    const allChecksPass = hasSinglePaymentMethod && hasCashMethod && noPaymentBreakdown;
    
    console.log('🧪 Single Payment Receipt Test Results:', {
      hasSinglePaymentMethod,
      hasCashMethod,
      noPaymentBreakdown,
      allChecksPass
    });
    
    return allChecksPass;
  } catch (error) {
    console.error('❌ Single Payment Receipt Test Failed:', error);
    return false;
  }
}

export function runAllSplitPaymentTests(): { splitPaymentTest: boolean; singlePaymentTest: boolean; overall: boolean } {
  console.log('🧪 Running Split Payment Receipt Tests...');
  
  const splitPaymentTest = testSplitPaymentReceiptGeneration();
  const singlePaymentTest = testSinglePaymentReceiptGeneration();
  const overall = splitPaymentTest && singlePaymentTest;
  
  console.log('🧪 Test Results Summary:', {
    splitPaymentTest,
    singlePaymentTest,
    overall,
    message: overall ? '✅ All tests passed!' : '❌ Some tests failed!'
  });
  
  return { splitPaymentTest, singlePaymentTest, overall };
}
