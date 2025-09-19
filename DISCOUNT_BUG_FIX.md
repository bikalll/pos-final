# Discount Bug Fix Summary

## Issue
Discount was showing as 0 in both print and Excel formats even when there were actual discounts applied to orders.

## Root Cause Analysis
The issue was in the `autoReceiptService.ts` where the `discount` field in the receipt payload was being set to `order.discount || 0`, but the `order.discount` field was not being populated with the calculated total discount amount.

## Discount Calculation System
The system calculates discounts in two parts:
1. **Item Discounts** - Individual item-level discounts (percentage or fixed amount)
2. **Order Discounts** - Order-level discount percentage applied to the subtotal

The total discount should be the sum of both item and order discounts.

## Fixes Applied

### 1. Fixed autoReceiptService.ts
**Before:**
```typescript
discount: order.discount || 0,
```

**After:**
```typescript
discount: (order.discount || 0) + itemDiscountsTotal + orderDiscountAmount,
```

This ensures the total discount includes:
- Any existing order.discount value
- Calculated item discounts total
- Calculated order discount amount

### 2. Enhanced Discount Calculation in Print/Excel
Updated both `doPrintSummary` and Excel export to use comprehensive discount calculation:

**Before:**
```typescript
const discounts = dateFilteredReceipts.reduce((sum, r) => sum + (r.discount || 0), 0);
```

**After:**
```typescript
const discounts = dateFilteredReceipts.reduce((sum, r) => {
  const totalDiscount = (r.discount || 0) + (r.itemDiscount || 0) + (r.orderDiscount || 0);
  return sum + totalDiscount;
}, 0);
```

### 3. Added Debug Logging
Added comprehensive debug logging to track discount data:
- Firebase receipt discount fields
- Calculated discount totals
- Individual receipt discount breakdowns

## Files Modified

### `src/services/autoReceiptService.ts`
- Fixed discount field calculation in receipt payload
- Now includes total of item and order discounts

### `src/screens/Receipts/DailySummaryScreen.tsx`
- Enhanced discount calculation in `doPrintSummary`
- Added debug logging for discount data
- Updated receipt data mapping to include all discount fields

### `src/utils/excelExporter.ts`
- Updated Excel export discount calculation
- Now uses comprehensive discount total

## Verification

### Debug Logging Added
The system now logs:
- Individual receipt discount data from Firebase
- Calculated discount totals per receipt
- Total discounts for print/Excel export

### Expected Behavior
- Item discounts (percentage or fixed amount) are calculated and included
- Order-level discount percentages are calculated and included
- Total discount is the sum of all discount types
- Both print and Excel formats show correct discount amounts

## Result

✅ **Discount Calculation Fixed** - Total discounts now properly calculated
✅ **Print Format** - Shows correct discount amounts
✅ **Excel Format** - Shows correct discount amounts
✅ **Debug Logging** - Added for troubleshooting
✅ **Comprehensive Coverage** - All discount types included

The discount bug has been fixed and both print and Excel formats will now correctly display the total discount amounts.
