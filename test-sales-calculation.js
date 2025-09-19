// Test script for sales calculation logic
console.log('Testing Sales Calculation Logic');
console.log('================================');

// Mock receipt data (no tax or service charge provision in app)
const mockReceipts = [
  {
    id: 'R001',
    baseSubtotal: 100, // Base subtotal before any discounts (for gross sales)
    subtotal: 95,      // Discounted subtotal (after discounts)
    tax: 0,            // No tax provision in app
    serviceCharge: 0,  // No service charge provision in app
    discount: 5,       // 5 discount
    itemDiscount: 3,   // 3 item discount
    orderDiscount: 2,  // 2 order discount
    amount: 'Rs 95.00' // Final amount paid
  },
  {
    id: 'R002',
    baseSubtotal: 200, // Base subtotal before any discounts (for gross sales)
    subtotal: 190,     // Discounted subtotal (after discounts)
    tax: 0,            // No tax provision in app
    serviceCharge: 0,  // No service charge provision in app
    discount: 10,      // 10 discount
    itemDiscount: 6,   // 6 item discount
    orderDiscount: 4,  // 4 order discount
    amount: 'Rs 190.00' // Final amount paid
  }
];

// Calculate using the new logic
const grossSales = mockReceipts.reduce((sum, r) => sum + (r.baseSubtotal || r.subtotal || 0), 0);
const discounts = mockReceipts.reduce((sum, r) => {
  const totalDiscount = r.discount || 0; // This already includes itemDiscount + orderDiscount
  return sum + totalDiscount;
}, 0);
const tax = 0; // No tax provision in app
const serviceCharge = 0; // No service charge provision in app
const netSales = grossSales - discounts; // Simplified formula

console.log('Mock Receipt Data:');
mockReceipts.forEach((receipt, index) => {
  console.log(`Receipt ${index + 1}:`);
  console.log(`  Subtotal: ${receipt.subtotal}`);
  console.log(`  Tax: ${receipt.tax}`);
  console.log(`  Service Charge: ${receipt.serviceCharge}`);
  console.log(`  Discount: ${receipt.discount}`);
  console.log(`  Item Discount: ${receipt.itemDiscount}`);
  console.log(`  Order Discount: ${receipt.orderDiscount}`);
  console.log(`  Total Discount: ${receipt.discount + receipt.itemDiscount + receipt.orderDiscount}`);
  console.log(`  Final Amount: ${receipt.amount}`);
  console.log('');
});

console.log('Calculations:');
console.log(`Gross Sales (sum of subtotals): ${grossSales}`);
console.log(`Total Discounts: ${discounts}`);
console.log(`Total Tax: ${tax}`);
console.log(`Total Service Charge: ${serviceCharge}`);
console.log(`Net Sales (Gross - Discounts + Tax + Service): ${netSales}`);
console.log('');

console.log('Verification:');
console.log(`Gross Sales: ${grossSales}`);
console.log(`Net Sales: ${netSales}`);
console.log(`Net Sales should be less than or equal to Gross Sales: ${netSales <= grossSales ? '✅ CORRECT' : '❌ INCORRECT'}`);

// Expected calculation:
// Gross Sales = 100 + 200 = 300 (base subtotals before discounts)
// Total Discounts = 5 + 10 = 15 (discount field already contains total of all discount types)
// Total Tax = 0 (no tax provision in app)
// Total Service Charge = 0 (no service charge provision in app)
// Net Sales = 300 - 15 = 285

console.log('');
console.log('Expected Results:');
console.log('Gross Sales: 300 (base subtotals before discounts)');
console.log('Total Discounts: 15 (discount field already contains total)');
console.log('Total Tax: 0 (no tax provision in app)');
console.log('Total Service Charge: 0 (no service charge provision in app)');
console.log('Net Sales: 285');
console.log('');
console.log('Note: Simplified formula - Net Sales = Gross Sales - Discounts');
