// Demo script to test printing functionality
// Run this in your React Native app or use it as a reference

console.log('🚀 Arbi POS Printing Demo');
console.log('========================');

// Sample receipt data
const sampleReceipt = {
  receiptId: 'RCPT-1698383823001',
  date: '2024-01-15',
  time: '14:30:25',
  tableNumber: '3',
  customerName: 'John Doe',
  items: [
    { name: 'Chicken Biryani', quantity: 2, price: 12.50, total: 25.00 },
    { name: 'Naan Bread', quantity: 3, price: 2.25, total: 6.75 },
    { name: 'Coca Cola', quantity: 2, price: 1.25, total: 2.50 },
  ],
  subtotal: 34.25,
  tax: 3.43,
  serviceCharge: 2.57,
  discount: 0.00,
  total: 40.25,
  paymentMethod: 'Cash',
  cashier: 'Owner',
};

// Sample kitchen ticket data
const sampleTicket = {
  ticketId: 'TKT-1698383823001',
  date: '2024-01-15',
  time: '14:30:25',
  tableNumber: '3',
  items: [
    { name: 'Chicken Biryani', quantity: 2, specialInstructions: 'Extra spicy' },
    { name: 'Naan Bread', quantity: 3, specialInstructions: 'Garlic naan' },
    { name: 'Coca Cola', quantity: 2 },
  ],
  estimatedTime: '25 minutes',
  orderType: 'dine-in',
};

// Sample report data
const sampleReport = {
  title: 'Daily Sales Report',
  date: '2024-01-15',
  data: {
    'Chicken Biryani': { quantity: 15, revenue: 187.50 },
    'Naan Bread': { quantity: 25, revenue: 56.25 },
    'Coca Cola': { quantity: 20, revenue: 25.00 },
    'Butter Chicken': { quantity: 12, revenue: 144.00 },
  },
  summary: {
    totalOrders: 25,
    totalRevenue: 412.75,
    totalItems: 72,
  },
};

console.log('📄 Sample Receipt Data:');
console.log(JSON.stringify(sampleReceipt, null, 2));

console.log('\n🍽️ Sample Kitchen Ticket Data:');
console.log(JSON.stringify(sampleTicket, null, 2));

console.log('\n📊 Sample Report Data:');
console.log(JSON.stringify(sampleReport, null, 2));

console.log('\n🖨️ To test printing:');
console.log('1. Navigate to Settings → Print Demo');
console.log('2. Use the sample data above');
console.log('3. Test each print function');
console.log('4. Check the generated PDF files');

console.log('\n✅ Printing Features Available:');
console.log('- Receipt printing with professional formatting');
console.log('- Kitchen ticket generation for food preparation');
console.log('- Business report generation');
console.log('- PDF export and sharing');
console.log('- Bluetooth and USB printer support');

console.log('\n🎯 Next Steps:');
console.log('- Configure your printer in Printer Setup');
console.log('- Test with real order data');
console.log('- Customize receipt templates as needed');
console.log('- Integrate with your restaurant workflow');

console.log('\n🚀 Happy printing with Arbi POS!');



