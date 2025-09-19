# Gross Sales Debug Fix - Handling Missing baseSubtotal

## Issue
The user reported that gross sales was showing as 0, discount as 90, and net sales as -90, when gross sales should be 1035. This indicates that the `baseSubtotal` field was not being populated correctly in the receipts.

## Root Cause Analysis
1. **Missing baseSubtotal in ReceiptData Interface**: The `ReceiptData` interface didn't include the `baseSubtotal` field
2. **Missing baseSubtotal in Receipt Conversion**: The conversion from Firebase receipts to `ReceiptData` format wasn't including the `baseSubtotal` field
3. **Existing Receipts**: Older receipts in Firebase don't have the `baseSubtotal` field since it was recently added
4. **Fallback Calculation**: No fallback mechanism to calculate `baseSubtotal` from receipt items

## Solution
Added comprehensive support for `baseSubtotal` with fallback calculation from receipt items.

## Changes Applied

### 1. Updated ReceiptData Interface

**Before:**
```typescript
interface ReceiptData {
  // ... other fields
  subtotal: number;
  // ... other fields
}
```

**After:**
```typescript
interface ReceiptData {
  // ... other fields
  baseSubtotal?: number; // Base subtotal before any discounts (for gross sales)
  subtotal: number;
  // ... other fields
}
```

### 2. Updated Receipt Conversion with Fallback Calculation

**Before:**
```typescript
return {
  // ... other fields
  subtotal: receipt.subtotal || 0,
  // ... other fields
};
```

**After:**
```typescript
// Calculate baseSubtotal from items if not present in receipt
let baseSubtotal = receipt.baseSubtotal || 0;
if (!baseSubtotal && receipt.items && receipt.items.length > 0) {
  baseSubtotal = receipt.items.reduce((sum: number, item: any) => {
    return sum + ((item.price || 0) * (item.quantity || 0));
  }, 0);
  console.log('🔍 Calculated baseSubtotal from items:', {
    receiptId: receipt.id,
    calculatedBaseSubtotal: baseSubtotal,
    items: receipt.items
  });
}

return {
  // ... other fields
  baseSubtotal: baseSubtotal, // Base subtotal before any discounts
  subtotal: receipt.subtotal || 0,
  // ... other fields
};
```

### 3. Enhanced Debug Logging

**Added comprehensive logging to track:**
- Firebase receipt data including `baseSubtotal`
- Calculated `baseSubtotal` from items
- Gross sales calculation for each receipt
- Running sum during gross sales calculation

### 4. Updated Multiple ReceiptData Interfaces

**Updated interfaces in:**
- `src/screens/Receipts/DailySummaryScreen.tsx`
- `src/utils/receiptFilters.ts`

## How the Fix Works

### For New Receipts
- New receipts will have `baseSubtotal` field saved by `autoReceiptService`
- This field contains the base subtotal before any discounts

### For Existing Receipts
- If `baseSubtotal` is missing, the system calculates it from receipt items
- Calculation: `sum of (item.price × item.quantity)` for all items
- This ensures backward compatibility with existing receipts

### Gross Sales Calculation
```typescript
const grossSales = dateFilteredReceipts.reduce((sum, r) => {
  const baseSubtotal = r.baseSubtotal || r.subtotal || 0;
  return sum + baseSubtotal;
}, 0);
```

## Debug Information

The system now logs:
1. **Firebase Receipt Data**: Shows all fields including `baseSubtotal`
2. **Calculated baseSubtotal**: When calculated from items
3. **Gross Sales Calculation**: Per-receipt breakdown
4. **Running Sum**: Shows cumulative gross sales

## Expected Results

### Before Fix:
- **Gross Sales**: 0 (missing baseSubtotal)
- **Discounts**: 90
- **Net Sales**: -90 (0 - 90)

### After Fix:
- **Gross Sales**: 1035 (calculated from items or stored baseSubtotal)
- **Discounts**: 90
- **Net Sales**: 945 (1035 - 90)

## Files Modified

### `src/screens/Receipts/DailySummaryScreen.tsx`
- Added `baseSubtotal` to `ReceiptData` interface
- Added fallback calculation from receipt items
- Enhanced debug logging
- Updated receipt conversion logic

### `src/utils/receiptFilters.ts`
- Added `baseSubtotal` to `ReceiptData` interface

## Result

✅ **Backward Compatible** - Works with existing receipts without baseSubtotal
✅ **Forward Compatible** - Uses baseSubtotal when available
✅ **Fallback Calculation** - Calculates baseSubtotal from items when missing
✅ **Enhanced Debugging** - Comprehensive logging for troubleshooting
✅ **Correct Gross Sales** - Now shows proper gross sales amount

The gross sales calculation now properly handles both new receipts (with baseSubtotal) and existing receipts (calculated from items), ensuring the correct gross sales amount is displayed.
