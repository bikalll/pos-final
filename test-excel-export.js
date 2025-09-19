// Test script for Excel export functionality
const { ExcelExporter } = require('./src/utils/excelExporter');

// Mock data for testing with discount information
const mockReceipts = [
  {
    id: 'R001',
    orderId: 'ORD001',
    customer: 'John Doe',
    table: 'Table 1',
    amount: 'Rs 135.00',
    paymentMethod: 'Cash',
    time: '2:30 PM',
    date: 'Dec 15, 2024',
    orderItems: [
      { name: 'Pizza Margherita', quantity: 1, price: 120, total: 120 },
      { name: 'Coca Cola', quantity: 1, price: 30, total: 30 }
    ],
    subtotal: 150,
    tax: 0,
    serviceCharge: 0,
    discount: 15,
    itemDiscount: 10,
    orderDiscount: 5
  },
  {
    id: 'R002',
    orderId: 'ORD002',
    customer: 'Jane Smith',
    table: 'Table 2',
    amount: 'Rs 225.00',
    paymentMethod: 'Card',
    time: '3:15 PM',
    date: 'Dec 15, 2024',
    orderItems: [
      { name: 'Burger Deluxe', quantity: 1, price: 180, total: 180 },
      { name: 'Fries', quantity: 1, price: 70, total: 70 }
    ],
    subtotal: 250,
    tax: 0,
    serviceCharge: 0,
    discount: 25,
    itemDiscount: 20,
    orderDiscount: 5
  }
];

async function testExcelExport() {
  try {
    console.log('Testing Excel export functionality with new format...');
    
    const result = await ExcelExporter.exportReceiptsAsExcel(mockReceipts, 'Today');
    
    if (result.success) {
      console.log('✅ Excel export test passed!');
      console.log('File saved to:', result.fileUri);
      console.log('');
      console.log('Expected format with discount at the top:');
      console.log('- ARBI POS - Day Summary');
      console.log('- Print time and date');
      console.log('- --- DISCOUNT SUMMARY --- (AT THE TOP!)');
      console.log('- Total Discounts: Rs [Amount]');
      console.log('- Day Summary');
      console.log('- --- Sales Summary ---');
      console.log('- Gross Sales, Service Charge, Discounts, Complementary, Net Sales');
      console.log('- --- Sales --- (by payment type)');
      console.log('- Total Payments Received (Net)');
      console.log('- --- Audit ---');
      console.log('- First Receipt and Last Receipt sections');
      console.log('- -- End --');
    } else {
      console.log('❌ Excel export test failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Excel export test error:', error.message);
  }
}

// Run the test
testExcelExport();
