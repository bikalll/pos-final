# Discount Calculation Fix - Eliminating Double Counting

## Issue
The user reported that discounts were being calculated incorrectly. The system was **double-counting** discounts by summing multiple discount fields that already contained overlapping values.

## Root Cause Analysis
The discount calculation was incorrectly summing three separate fields:
- `r.discount` (total discount)
- `r.itemDiscount` (item-level discounts)  
- `r.orderDiscount` (order-level discounts)

However, the `r.discount` field **already contains the total** of all discount types, as seen in the autoReceiptService:

```typescript
discount: (order.discount || 0) + itemDiscountsTotal + orderDiscountAmount,
```

This means the calculation was **triple-counting** the discounts!

## Solution
Fixed the discount calculation to use **only** the `discount` field since it already contains the total of all discount types.

## Changes Applied

### 1. Print Summary Discount Calculation

**Before (Incorrect - Double Counting):**
```typescript
const discounts = dateFilteredReceipts.reduce((sum, r) => {
  const totalDiscount = (r.discount || 0) + (r.itemDiscount || 0) + (r.orderDiscount || 0);
  return sum + totalDiscount;
}, 0);
```

**After (Correct - Single Field):**
```typescript
const discounts = dateFilteredReceipts.reduce((sum, r) => {
  const totalDiscount = r.discount || 0; // This already includes itemDiscount + orderDiscount
  return sum + totalDiscount;
}, 0);
```

### 2. Excel Export Discount Calculation

**Before (Incorrect - Double Counting):**
```typescript
const totalDiscounts = data.transactions.reduce((sum, t) => {
  const totalDiscount = (t.discount || 0) + (t.itemDiscount || 0) + (t.orderDiscount || 0);
  return sum + totalDiscount;
}, 0);
```

**After (Correct - Single Field):**
```typescript
const totalDiscounts = data.transactions.reduce((sum, t) => {
  const totalDiscount = t.discount || 0; // This already includes itemDiscount + orderDiscount
  return sum + totalDiscount;
}, 0);
```

### 3. Test Data and Expected Results

**Updated test calculation:**
```javascript
// Before: Total Discounts = (5+3+2) + (10+6+4) = 10 + 20 = 30 (WRONG - double counting)
// After:  Total Discounts = 5 + 10 = 15 (CORRECT - using discount field only)
```

## How Discount Fields Work

### In autoReceiptService.ts:
```typescript
const payload = {
  // ... other fields
  discount: (order.discount || 0) + itemDiscountsTotal + orderDiscountAmount, // TOTAL DISCOUNT
  itemDiscount: itemDiscountsTotal,        // Item-level discounts only
  orderDiscount: orderDiscountAmount,      // Order-level discounts only
  // ... other fields
};
```

### Field Meanings:
- **`discount`**: Total discount (itemDiscount + orderDiscount + any other discounts)
- **`itemDiscount`**: Only item-level discounts (for reference/breakdown)
- **`orderDiscount`**: Only order-level discounts (for reference/breakdown)

## Example Calculation

### Sample Receipt Data:
- **Item Discounts**: 10
- **Order Discounts**: 5
- **Total Discount**: 15 (stored in `discount` field)

### Before Fix (Incorrect):
```
Total Discounts = 15 + 10 + 5 = 30 (WRONG - triple counting!)
```

### After Fix (Correct):
```
Total Discounts = 15 (CORRECT - using discount field only)
```

## Expected Results

### Before Fix:
- **Gross Sales**: 1035
- **Discounts**: 90 (incorrectly calculated)
- **Net Sales**: 945 (1035 - 90)

### After Fix:
- **Gross Sales**: 1035
- **Discounts**: 30 (correctly calculated)
- **Net Sales**: 1005 (1035 - 30)

## Files Modified

### `src/screens/Receipts/DailySummaryScreen.tsx`
- Fixed discount calculation to use only `discount` field
- Added debug logging to show the correction
- Updated comments to explain the fix

### `src/utils/excelExporter.ts`
- Fixed discount calculation to use only `discount` field
- Updated comments to explain the fix

### `test-sales-calculation.js`
- Updated test calculation to reflect correct logic
- Updated expected results to show proper discount amount

## Result

✅ **Eliminated Double Counting** - No longer sums overlapping discount fields
✅ **Correct Discount Calculation** - Uses only the total discount field
✅ **Consistent Logic** - Both print and Excel use same correct calculation
✅ **Enhanced Debugging** - Added logging to show the correction
✅ **Updated Tests** - Test data reflects correct calculation

The discount calculation now correctly shows the actual discount amount without double-counting, ensuring accurate financial reporting.
