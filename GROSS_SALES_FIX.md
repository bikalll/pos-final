# Gross Sales Fix - Using Base Subtotal Before Discounts

## Issue
The user reported that "gross sales is total sales without discount, the receipt is showing 0". The problem was that the gross sales calculation was using the `subtotal` field, which represents the amount **after** discounts, not the base amount before discounts.

## Root Cause
- **Gross Sales** should be the total sales **before** any discounts are applied
- The app was using `order.subtotal` which is the **discounted subtotal** (after item and order discounts)
- For proper gross sales calculation, we need the **base subtotal** (before any discounts)

## Solution
Added `baseSubtotal` field to receipt data and updated calculations to use it for gross sales.

## Changes Applied

### 1. AutoReceiptService - Added Base Subtotal to Receipt Data

**Before:**
```typescript
const payload: any = {
  // ... other fields
  subtotal: order.subtotal || 0, // This was the discounted subtotal
  // ... other fields
};
```

**After:**
```typescript
const payload: any = {
  // ... other fields
  baseSubtotal: baseSubtotal, // Base subtotal before any discounts (for gross sales)
  subtotal: order.subtotal || 0, // Discounted subtotal
  // ... other fields
};
```

### 2. Print Summary Calculation - Updated Gross Sales

**Before:**
```typescript
const grossSales = dateFilteredReceipts.reduce((sum, r) => sum + (r.subtotal || 0), 0);
```

**After:**
```typescript
const grossSales = dateFilteredReceipts.reduce((sum, r) => sum + (r.baseSubtotal || r.subtotal || 0), 0);
```

### 3. Excel Export Calculation - Updated Gross Sales

**Before:**
```typescript
const grossSales = data.transactions.reduce((sum, t) => sum + (t.subtotal || 0), 0);
```

**After:**
```typescript
const grossSales = data.transactions.reduce((sum, t) => sum + (t.baseSubtotal || t.subtotal || 0), 0);
```

### 4. Excel Export Transaction Mapping - Added Base Subtotal

**Before:**
```typescript
const transactions = receipts.map(receipt => ({
  // ... other fields
  subtotal: receipt.subtotal || 0,
  // ... other fields
}));
```

**After:**
```typescript
const transactions = receipts.map(receipt => ({
  // ... other fields
  baseSubtotal: receipt.baseSubtotal || receipt.subtotal || 0, // Base subtotal before discounts
  subtotal: receipt.subtotal || 0, // Discounted subtotal
  // ... other fields
}));
```

### 5. Test Data - Updated to Reflect Correct Structure

**Before:**
```javascript
const mockReceipts = [
  {
    id: 'R001',
    subtotal: 100, // This was ambiguous
    // ... other fields
  }
];
```

**After:**
```javascript
const mockReceipts = [
  {
    id: 'R001',
    baseSubtotal: 100, // Base subtotal before any discounts (for gross sales)
    subtotal: 95,      // Discounted subtotal (after discounts)
    // ... other fields
  }
];
```

## Data Structure Explanation

### Base Subtotal Calculation
```typescript
const baseSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
```
- **Base Subtotal** = Sum of (Item Price × Quantity) for all items
- This is the **gross sales** amount before any discounts

### Discounted Subtotal Calculation
```typescript
const discountedSubtotal = order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
const orderDiscountAmount = discountedSubtotal * (orderDiscountPercent / 100);
const subtotal = Math.max(0, discountedSubtotal - orderDiscountAmount);
```
- **Discounted Subtotal** = Base Subtotal - Item Discounts - Order Discounts
- This is the amount after all discounts are applied

## Updated Calculation Formula

### Gross Sales
**Gross Sales = Sum of Base Subtotals (before any discounts)**

### Net Sales
**Net Sales = Gross Sales - Total Discounts**

## Example Calculation

### Sample Receipt Data:
- **Item 1**: Price 50, Quantity 2 = 100
- **Item 2**: Price 30, Quantity 1 = 30
- **Base Subtotal**: 100 + 30 = 130
- **Item Discounts**: 10
- **Order Discounts**: 5
- **Total Discounts**: 15
- **Discounted Subtotal**: 130 - 15 = 115

### Summary Calculation:
- **Gross Sales**: 130 (base subtotal before discounts)
- **Total Discounts**: 15
- **Net Sales**: 130 - 15 = 115

## Files Modified

### `src/services/autoReceiptService.ts`
- Added `baseSubtotal` field to receipt payload
- Calculates base subtotal before any discounts

### `src/screens/Receipts/DailySummaryScreen.tsx`
- Updated gross sales calculation to use `baseSubtotal`
- Added fallback to `subtotal` for backward compatibility

### `src/utils/excelExporter.ts`
- Updated gross sales calculation to use `baseSubtotal`
- Added `baseSubtotal` to transaction mapping
- Added fallback to `subtotal` for backward compatibility

### `test-sales-calculation.js`
- Updated test data to include both `baseSubtotal` and `subtotal`
- Updated expected results to reflect correct gross sales calculation

## Result

✅ **Gross Sales Fixed** - Now uses base subtotal before discounts
✅ **Receipt Data Enhanced** - Includes both base and discounted subtotals
✅ **Backward Compatible** - Falls back to subtotal if baseSubtotal not available
✅ **Consistent Calculation** - Both print and Excel use same logic
✅ **Test Updated** - Test data reflects correct structure

The gross sales calculation now correctly represents the total sales before any discounts are applied, fixing the issue where receipts were showing 0 for gross sales.
